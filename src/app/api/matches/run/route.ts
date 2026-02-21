import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTask, createTask, updateTask, completeTask, failTask } from '@/lib/match-task-store';
import {
  generateAIEvaluation,
  generateFallbackEvaluation,
  updateCandidateTotalScore,
  runWithConcurrency,
  calculateTagMatchScore,
} from '@/lib/match-engine';

const prisma = new PrismaClient();

// 查询匹配任务状态
export async function GET(request: NextRequest) {
  const jobPostingId = request.nextUrl.searchParams.get('jobPostingId');
  if (!jobPostingId) {
    return NextResponse.json({ status: 'idle' });
  }

  const task = getTask(jobPostingId);
  if (!task) {
    return NextResponse.json({ status: 'idle' });
  }

  return NextResponse.json({
    status: task.status,
    total: task.total,
    processed: task.processed,
    currentCandidate: task.currentCandidate,
    error: task.error,
    matches: task.status === 'completed' ? task.matches : undefined,
  });
}

// 运行新的匹配
export async function POST(request: NextRequest) {
  try {
    const { jobPostingId, candidateIds } = await request.json();

    if (!jobPostingId) {
      return NextResponse.json(
        { error: '请指定目标职位' },
        { status: 400 }
      );
    }

    // 检查是否已有运行中的任务
    const existingTask = getTask(jobPostingId);
    if (existingTask && existingTask.status === 'running') {
      return NextResponse.json({
        taskId: jobPostingId,
        status: 'running',
        total: existingTask.total,
        processed: existingTask.processed,
        currentCandidate: existingTask.currentCandidate,
        message: '该职位已有匹配任务在运行中',
      });
    }

    // 检查职位是否存在且为激活状态
    const targetJob = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
      include: { tags: true },
    });

    if (!targetJob) {
      return NextResponse.json(
        { error: '职位不存在' },
        { status: 404 }
      );
    }

    if (targetJob.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '只能对激活状态的职位进行匹配' },
        { status: 400 }
      );
    }

    // 获取已匹配过该职位的候选人ID列表
    const existingMatches = await prisma.jobMatch.findMany({
      where: { jobPostingId },
      select: { candidateId: true },
    });
    const matchedCandidateIds = new Set(existingMatches.map(m => m.candidateId));

    // 获取候选人：如果指定了 candidateIds，则只匹配这些候选人；否则按状态过滤全库
    // 排除已匹配过该职位的候选人，避免重复匹配
    const allCandidates = await prisma.candidate.findMany({
      include: { tags: true, certificates: true },
      where: Array.isArray(candidateIds) && candidateIds.length > 0
        ? { id: { in: candidateIds } }
        : { status: { in: ['NEW', 'SCREENING', 'TALENT_POOL'] } },
    });
    const candidates = allCandidates.filter(c => !matchedCandidateIds.has(c.id));

    // 创建任务记录（内存 + 数据库，确保队列管理可见）
    createTask(jobPostingId, candidates.length);

    const scheduledRecord = await prisma.scheduledMatch.create({
      data: {
        jobPostingId,
        candidateIds: candidates.map(c => c.id),
        scheduledFor: new Date(),
        status: 'RUNNING',
        totalCandidates: candidates.length,
        processedCount: 0,
      },
    });

    // 后台执行匹配（不 await）
    runMatchingInBackground(jobPostingId, targetJob, candidates, scheduledRecord.id);

    return NextResponse.json({
      taskId: jobPostingId,
      status: 'running',
      total: candidates.length,
      processed: 0,
    });
  } catch (error) {
    console.error('运行匹配错误:', error);
    return NextResponse.json(
      { error: '运行匹配失败' },
      { status: 500 }
    );
  }
}

// 后台执行匹配逻辑（并发控制）
async function runMatchingInBackground(
  jobPostingId: string,
  targetJob: any,
  candidates: any[],
  scheduledMatchId: string
) {
  let processedCount = 0;

  try {
    await runWithConcurrency(candidates, async (candidate) => {
      updateTask(jobPostingId, {
        currentCandidate: candidate.name,
      });

      let aiResult;

      try {
        aiResult = await generateAIEvaluation(candidate, targetJob);
      } catch (err) {
        console.error(`为候选人 ${candidate.name} 生成LLM评估失败:`, err);
        // 使用 tag 匹配分数作为 fallback
        const tagMatch = calculateTagMatchScore(candidate, targetJob);
        aiResult = generateFallbackEvaluation(candidate, targetJob, tagMatch.score);
      }

      const matchScore = aiResult.llmScore;

      // 即使匹配分数低也创建记录，避免重复匹配
      await prisma.jobMatch.upsert({
        where: {
          candidateId_jobPostingId: {
            candidateId: candidate.id,
            jobPostingId: targetJob.id,
          },
        },
        update: {
          matchScore,
          aiEvaluation: aiResult.evaluation,
        },
        create: {
          candidateId: candidate.id,
          jobPostingId: targetJob.id,
          matchScore,
          aiEvaluation: aiResult.evaluation,
        },
      });

      // 更新候选人总分（使用最高匹配分）
      await updateCandidateTotalScore(candidate.id);

      processedCount++;
      updateTask(jobPostingId, {
        processed: processedCount,
      });

      // 同步更新数据库中的队列进度
      await prisma.scheduledMatch.update({
        where: { id: scheduledMatchId },
        data: { processedCount },
      });
    }, 3); // 并发数 3

    // 获取最终匹配结果
    const finalMatches = await prisma.jobMatch.findMany({
      where: { jobPostingId },
      include: {
        candidate: { include: { tags: true } },
        jobPosting: { include: { tags: true } },
      },
      orderBy: { matchScore: 'desc' },
    });

    completeTask(jobPostingId, finalMatches);

    // 标记队列任务完成
    await prisma.scheduledMatch.update({
      where: { id: scheduledMatchId },
      data: { status: 'COMPLETED', processedCount },
    });
  } catch (error: any) {
    console.error('后台匹配任务失败:', error);
    failTask(jobPostingId, error.message || '匹配过程中发生错误');

    // 标记队列任务失败
    await prisma.scheduledMatch.update({
      where: { id: scheduledMatchId },
      data: { status: 'FAILED', error: error.message || '匹配过程中发生错误' },
    });
  }
}
