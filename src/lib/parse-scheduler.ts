// 延时解析调度器 - 定时检查并执行到期的简历解析任务

import { PrismaClient } from '@prisma/client';
import { parseResumeFromStorage } from './resume-parse-core';

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60 * 1000; // 每60秒检查一次

const globalForScheduler = globalThis as unknown as {
  _parseSchedulerTimer?: ReturnType<typeof setInterval>;
  _parseSchedulerInitialized?: boolean;
};

/** 检查并执行到期的延时解析任务 */
async function checkAndRunScheduledParses(): Promise<void> {
  try {
    const now = new Date();

    const pendingTasks = await prisma.scheduledParse.findMany({
      where: {
        scheduledFor: { lte: now },
        status: 'PENDING',
      },
    });

    for (const task of pendingTasks) {
      executeScheduledParse(task.id).catch((err) => {
        console.error(`[延时解析] 执行任务 ${task.id} 出错:`, err);
      });
    }
  } catch (err) {
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

  // 启动时：重置因进程崩溃卡在 RUNNING 状态超过1小时的任务
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  prisma.scheduledParse
    .updateMany({
      where: { status: 'RUNNING', updatedAt: { lte: oneHourAgo } },
      data: { status: 'PENDING' },
    })
    .then((r) => {
      if (r.count > 0) {
        console.log(`[延时解析] 重置了 ${r.count} 个因崩溃卡住的 RUNNING 任务`);
      }
    })
    .catch((err) => console.error('[延时解析] 重置卡住任务出错:', err));

  // 启动时立即检查一次
  checkAndRunScheduledParses();
}
