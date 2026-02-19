import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FETCH_TIMEOUT_MS = 60000;

/** POST /api/ai/job-suggestions — 创建 AI 生成任务并以 SSE 流式返回进度 */
export async function POST(request: NextRequest) {
  const { title, department, selectedTags = [] } = await request.json();

  if (!title || !department) {
    return NextResponse.json({ error: '职位名称和部门不能为空' }, { status: 400 });
  }

  // 创建任务记录（RUNNING，保证失败也有记录）
  const task = await prisma.aiGenTask.create({
    data: {
      title,
      department,
      tags: selectedTags as string[],
      status: 'RUNNING',
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      try {
        send('progress', { text: '正在连接 AI 服务...' });

        const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const apiKey = process.env.OPENAI_API_KEY;
        const model = process.env.MODEL || 'gpt-4o-mini';

        const tagsText = selectedTags.length > 0
          ? `\n相关标签：${(selectedTags as string[]).join('、')}`
          : '';

        const prompt = `请为以下职位生成专业的岗位描述和岗位要求：

职位名称：${title}
所属部门：${department}${tagsText}

要求：
1. 岗位描述（description）：200-400字，包含工作职责、团队介绍、发展方向，条目清晰
2. 岗位要求（requirements）：200-400字，包含学历、经验、技能要求及加分项，条目清晰
3. 内容要专业、具体，贴合岗位实际
4. 如果提供了标签，需要在内容中体现相关技能或经验要求

只返回如下 JSON 格式，不要有任何额外文字：
{
  "description": "岗位描述内容",
  "requirements": "岗位要求内容"
}`;

        send('progress', { text: 'AI 正在生成中，请稍候...' });

        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的HR招聘顾问，擅长撰写专业、吸引人的岗位描述和要求。只返回JSON格式的结果。',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`AI 服务返回错误: ${response.status}`);
        }

        const data = await response.json();
        const content: string = data.choices?.[0]?.message?.content || '';

        if (!content) throw new Error('AI 返回内容为空');

        // 提取 JSON（支持有/无 ```json 代码块两种格式）
        const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
        const codeBlockMatch = stripped.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : stripped.trim();

        const parsed = JSON.parse(jsonStr);
        if (!parsed.description || !parsed.requirements) {
          throw new Error('AI 返回格式异常，缺少 description 或 requirements');
        }

        // 持久化结果
        await prisma.aiGenTask.update({
          where: { id: task.id },
          data: {
            status: 'COMPLETED',
            description: parsed.description,
            requirements: parsed.requirements,
          },
        });

        send('done', {
          taskId: task.id,
          description: parsed.description,
          requirements: parsed.requirements,
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : '生成失败';

        await prisma.aiGenTask.update({
          where: { id: task.id },
          data: { status: 'FAILED', error: errMsg },
        }).catch(() => {/* 忽略二次错误 */});

        send('error', { error: errMsg, taskId: task.id });
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
