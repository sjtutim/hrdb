import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getNext2AM } from '@/lib/match-scheduler';

const prisma = new PrismaClient();

// GET: 查询计划匹配任务列表
export async function GET(request: NextRequest) {
  try {
    const jobPostingId = request.nextUrl.searchParams.get('jobPostingId');
    const status = request.nextUrl.searchParams.get('status');

    const where: any = {};
    if (jobPostingId) where.jobPostingId = jobPostingId;
    if (status) where.status = status;

    const tasks = await prisma.scheduledMatch.findMany({
      where,
      include: {
        jobPosting: { select: { id: true, title: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('查询计划匹配任务错误:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// POST: 创建计划匹配任务
export async function POST(request: NextRequest) {
  try {
    const { jobPostingId, candidateIds } = await request.json();

    if (!jobPostingId) {
      return NextResponse.json({ error: '请指定目标职位' }, { status: 400 });
    }

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: '请至少选择一个候选人' }, { status: 400 });
    }

    // 检查职位是否存在
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (!job) {
      return NextResponse.json({ error: '职位不存在' }, { status: 404 });
    }

    const scheduledFor = getNext2AM();

    const task = await prisma.scheduledMatch.create({
      data: {
        jobPostingId,
        candidateIds,
        scheduledFor,
        totalCandidates: candidateIds.length,
      },
      include: {
        jobPosting: { select: { id: true, title: true, department: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('创建计划匹配任务错误:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
