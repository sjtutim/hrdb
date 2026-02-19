// 计划匹配调度器 - 定时检查并执行到期的计划匹配任务

import { PrismaClient } from '@prisma/client';
import {
  generateAIEvaluation,
  generateFallbackEvaluation,
  updateCandidateTotalScore,
  runWithConcurrency,
  calculateTagMatchScore,
} from './match-engine';

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60 * 1000; // 每60秒检查一次

// 用 globalThis 防止 HMR 重复初始化
const globalForScheduler = globalThis as unknown as {
  _matchSchedulerTimer?: ReturnType<typeof setInterval>;
  _matchSchedulerInitialized?: boolean;
};

/** 计算下一个凌晨2点的时间 */
export function getNext2AM(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(2, 0, 0, 0);

  // 如果当前时间已经过了今天凌晨2点，则设为明天凌晨2点
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/** 检查并执行到期的计划匹配任务 */
async function checkAndRunScheduledMatches(): Promise<void> {
  try {
    const now = new Date();

    // 查询所有到期且状态为 PENDING 的任务
    const pendingTasks = await prisma.scheduledMatch.findMany({
      where: {
        scheduledFor: { lte: now },
        status: 'PENDING',
      },
    });

    for (const task of pendingTasks) {
      // 异步执行，不阻塞后续任务检查
      executeScheduledMatch(task.id).catch((err) => {
        console.error(`[计划匹配] 执行任务 ${task.id} 出错:`, err);
      });
    }
  } catch (err) {
    console.error('[计划匹配] 检查任务出错:', err);
  }
}

/** 执行单个计划匹配任务（可从外部调用以立即执行） */
export async function executeScheduledMatch(taskId: string): Promise<void> {
  console.log(`[计划匹配] 开始执行任务: ${taskId}`);

  // 标记为 RUNNING
  const task = await prisma.scheduledMatch.update({
    where: { id: taskId },
    data: { status: 'RUNNING' },
  });

  try {
    // 获取岗位信息
    const targetJob = await prisma.jobPosting.findUnique({
      where: { id: task.jobPostingId },
      include: { tags: true },
    });

    if (!targetJob) {
      throw new Error(`职位 ${task.jobPostingId} 不存在`);
    }

    // 获取候选人
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: task.candidateIds } },
      include: { tags: true, certificates: true },
    });

    // 获取已匹配过该职位的候选人，避免重复
    const existingMatches = await prisma.jobMatch.findMany({
      where: { jobPostingId: task.jobPostingId },
      select: { candidateId: true },
    });
    const matchedSet = new Set(existingMatches.map((m) => m.candidateId));
    const candidatesToMatch = candidates.filter((c) => !matchedSet.has(c.id));

    let processedCount = 0;

    await runWithConcurrency(
      candidatesToMatch,
      async (candidate) => {
        let aiResult;

        try {
          aiResult = await generateAIEvaluation(candidate, targetJob);
        } catch (err) {
          console.error(`[计划匹配] 候选人 ${candidate.name} LLM失败:`, err);
          const tagMatch = calculateTagMatchScore(candidate, targetJob);
          aiResult = generateFallbackEvaluation(candidate, targetJob, tagMatch.score);
        }

        await prisma.jobMatch.upsert({
          where: {
            candidateId_jobPostingId: {
              candidateId: candidate.id,
              jobPostingId: targetJob.id,
            },
          },
          update: {
            matchScore: aiResult.llmScore,
            aiEvaluation: aiResult.evaluation,
          },
          create: {
            candidateId: candidate.id,
            jobPostingId: targetJob.id,
            matchScore: aiResult.llmScore,
            aiEvaluation: aiResult.evaluation,
          },
        });

        await updateCandidateTotalScore(candidate.id);

        processedCount++;
        await prisma.scheduledMatch.update({
          where: { id: taskId },
          data: { processedCount },
        });
      },
      3
    );

    // 完成
    await prisma.scheduledMatch.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', processedCount },
    });

    console.log(`[计划匹配] 任务 ${taskId} 完成，处理 ${processedCount} 人`);
  } catch (error: any) {
    console.error(`[计划匹配] 任务 ${taskId} 失败:`, error);
    await prisma.scheduledMatch.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        error: error.message || '执行过程中发生错误',
      },
    });
  }
}

/** 初始化调度器（每60秒检查一次到期任务） */
export function initScheduler(): void {
  if (globalForScheduler._matchSchedulerInitialized) {
    console.log('[计划匹配] 调度器已初始化，跳过');
    return;
  }

  // 清理旧定时器（如果有）
  if (globalForScheduler._matchSchedulerTimer) {
    clearInterval(globalForScheduler._matchSchedulerTimer);
  }

  console.log('[计划匹配] 初始化调度器，每60秒检查到期任务');
  globalForScheduler._matchSchedulerTimer = setInterval(
    checkAndRunScheduledMatches,
    POLL_INTERVAL_MS
  );
  globalForScheduler._matchSchedulerInitialized = true;

  // 启动时立即检查一次
  checkAndRunScheduledMatches();
}
