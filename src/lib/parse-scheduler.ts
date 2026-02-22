// 延时解析调度器 - 定时检查并执行到期的简历解析任务

import { PrismaClient } from '@prisma/client';
import { parseResumeFromStorage } from './resume-parse-core';
import { cleanupStuckScheduledParses } from './scheduled-parse-cleanup';

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60 * 1000; // 每60秒检查一次

const globalForScheduler = globalThis as unknown as {
  _parseSchedulerTimer?: ReturnType<typeof setInterval>;
  _parseSchedulerInitialized?: boolean;
  _parseSchedulerLastDbNotReadyWarnAt?: number;
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
  const last = globalForScheduler._parseSchedulerLastDbNotReadyWarnAt ?? 0;
  if (now - last > 30_000) {
    console.warn(`${prefix} 数据库尚未就绪，跳过本轮，稍后重试`);
    globalForScheduler._parseSchedulerLastDbNotReadyWarnAt = now;
  }
}

/** 检查并执行到期的延时解析任务 */
async function checkAndRunScheduledParses(): Promise<void> {
  try {
    const resetCount = await cleanupStuckScheduledParses(prisma);
    if (resetCount > 0) {
      console.log(`[延时解析] 自动清理了 ${resetCount} 个超时 RUNNING 任务`);
    }

    const now = new Date();

    const pendingTasks = await prisma.scheduledParse.findMany({
      where: {
        scheduledFor: { lte: now },
        status: 'PENDING',
      },
    });

    for (const task of pendingTasks) {
      executeScheduledParse(task.id).catch((err) => {
        if (isDbNotReadyError(err)) {
          logDbNotReady(`[延时解析] 执行任务 ${task.id} 出错:`);
          return;
        }
        console.error(`[延时解析] 执行任务 ${task.id} 出错:`, err);
      });
    }
  } catch (err) {
    if (isDbNotReadyError(err)) {
      logDbNotReady('[延时解析] 检查任务出错:');
      return;
    }
    console.error('[延时解析] 检查任务出错:', err);
  }
}

/** 执行单个延时解析任务 */
async function executeScheduledParse(taskId: string): Promise<void> {
  console.log(`[延时解析] 开始执行任务: ${taskId}`);

  const task = await prisma.scheduledParse.update({
    where: { id: taskId },
    data: { status: 'RUNNING' },
  });

  try {
    const result = await parseResumeFromStorage({
      fileId: task.fileId,
      objectName: task.objectName,
      contentType: task.contentType,
      originalName: task.originalName,
    });

    await prisma.scheduledParse.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', candidateId: result.candidateId },
    });

    console.log(`[延时解析] 任务 ${taskId} 完成，候选人: ${result.candidateId}`);
  } catch (error: any) {
    if (isDbNotReadyError(error)) {
      logDbNotReady(`[延时解析] 任务 ${taskId} 遇到瞬时数据库错误:`);
      await prisma.scheduledParse
        .update({
          where: { id: taskId },
          data: { status: 'PENDING' },
        })
        .catch(() => {});
      return;
    }

    console.error(`[延时解析] 任务 ${taskId} 失败:`, error);
    await prisma.scheduledParse.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        error: error.message || '解析过程中发生错误',
      },
    });
  }
}

/** 初始化延时解析调度器 */
export function initParseScheduler(): void {
  if (globalForScheduler._parseSchedulerInitialized) {
    console.log('[延时解析] 调度器已初始化，跳过');
    return;
  }

  if (globalForScheduler._parseSchedulerTimer) {
    clearInterval(globalForScheduler._parseSchedulerTimer);
  }

  console.log('[延时解析] 初始化调度器，每60秒检查到期任务');
  globalForScheduler._parseSchedulerTimer = setInterval(
    checkAndRunScheduledParses,
    POLL_INTERVAL_MS
  );
  globalForScheduler._parseSchedulerInitialized = true;

  // 启动时立即检查一次
  checkAndRunScheduledParses();
}
