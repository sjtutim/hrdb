// AI 生成任务调度器 - 自动执行 PENDING 任务，并恢复因崩溃卡住的 RUNNING 任务

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60 * 1000; // 每60秒检查一次
const STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 超过10分钟视为卡住

const globalForScheduler = globalThis as unknown as {
  _aiGenSchedulerTimer?: ReturnType<typeof setInterval>;
  _aiGenSchedulerInitialized?: boolean;
  _aiGenSchedulerLastDbNotReadyWarnAt?: number;
};

function isDbNotReadyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('database system is starting up') ||
    msg.includes('the database system is starting up') ||
    msg.includes('ECONNREFUSED')
  );
}

function logDbNotReady(prefix: string): void {
  const now = Date.now();
  const last = globalForScheduler._aiGenSchedulerLastDbNotReadyWarnAt ?? 0;
  if (now - last > 30_000) {
    console.warn(`${prefix} 数据库尚未就绪，跳过本轮，稍后重试`);
    globalForScheduler._aiGenSchedulerLastDbNotReadyWarnAt = now;
  }
}

/** 执行单个 AI 生成任务（不依赖 SSE，直接调用 AI 接口） */
async function executeAiGenTask(taskId: string): Promise<void> {
  console.log(`[AI生成] 开始执行任务: ${taskId}`);

  const task = await prisma.aiGenTask.findUnique({ where: { id: taskId } });
  if (!task) return;

  await prisma.aiGenTask.update({
    where: { id: taskId },
    data: { status: 'RUNNING', error: null },
  });

  try {
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.MODEL || 'gpt-4o-mini';

    const tagsText = task.tags.length > 0 ? `\n相关标签：${task.tags.join('、')}` : '';
    const prompt = `请为以下职位生成专业的岗位描述和岗位要求：

职位名称：${task.title}
所属部门：${task.department}${tagsText}

只返回如下 JSON 格式，不要有任何额外文字：
{
  "description": "岗位描述内容（200-400字，工作职责、团队介绍、发展方向）",
  "requirements": "岗位要求内容（200-400字，学历/经验/技能要求及加分项）"
}`;

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 60000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的HR招聘顾问。只返回JSON格式的结果。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
      signal: abortController.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`AI 服务返回错误: ${response.status}`);

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('AI 返回内容为空');

    const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = stripped.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : stripped.trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.description || !parsed.requirements) {
      throw new Error('AI 返回格式异常');
    }

    await prisma.aiGenTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        description: parsed.description,
        requirements: parsed.requirements,
      },
    });

    console.log(`[AI生成] 任务 ${taskId} 完成`);
  } catch (error: any) {
    if (isDbNotReadyError(error)) {
      logDbNotReady(`[AI生成] 任务 ${taskId} 遇到瞬时数据库错误:`);
      await prisma.aiGenTask
        .update({
          where: { id: taskId },
          data: { status: 'PENDING' },
        })
        .catch(() => {});
      return;
    }

    console.error(`[AI生成] 任务 ${taskId} 失败:`, error);
    await prisma.aiGenTask
      .update({
        where: { id: taskId },
        data: { status: 'FAILED', error: error.message || '生成失败' },
      })
      .catch(() => {});
  }
}

/** 检查并执行 PENDING 任务，重置卡住的 RUNNING 任务 */
async function checkAndRunAiGenTasks(): Promise<void> {
  try {
    // 重置超时的 RUNNING 任务（SSE 中途断开导致的）
    const stuckBefore = new Date(Date.now() - STUCK_TIMEOUT_MS);
    const reset = await prisma.aiGenTask.updateMany({
      where: { status: 'RUNNING', updatedAt: { lte: stuckBefore } },
      data: { status: 'PENDING' },
    });
    if (reset.count > 0) {
      console.log(`[AI生成] 重置了 ${reset.count} 个超时 RUNNING 任务`);
    }

    // 执行 PENDING 任务
    const pendingTasks = await prisma.aiGenTask.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    for (const task of pendingTasks) {
      executeAiGenTask(task.id).catch((err) => {
        if (isDbNotReadyError(err)) {
          logDbNotReady(`[AI生成] 执行任务 ${task.id} 出错:`);
          return;
        }
        console.error(`[AI生成] 执行任务 ${task.id} 出错:`, err);
      });
    }
  } catch (err) {
    if (isDbNotReadyError(err)) {
      logDbNotReady('[AI生成] 检查任务出错:');
      return;
    }
    console.error('[AI生成] 检查任务出错:', err);
  }
}

/** 初始化 AI 生成任务调度器 */
export function initAiGenScheduler(): void {
  if (globalForScheduler._aiGenSchedulerInitialized) {
    console.log('[AI生成] 调度器已初始化，跳过');
    return;
  }

  console.log('[AI生成] 初始化调度器，每60秒检查待处理任务');
  globalForScheduler._aiGenSchedulerTimer = setInterval(
    checkAndRunAiGenTasks,
    POLL_INTERVAL_MS
  );
  globalForScheduler._aiGenSchedulerInitialized = true;

  // 启动时立即检查一次
  checkAndRunAiGenTasks();
}
