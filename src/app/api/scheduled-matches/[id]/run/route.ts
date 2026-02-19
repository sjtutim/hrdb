import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { executeScheduledMatch } from '@/lib/match-scheduler';

const prisma = new PrismaClient();

/** POST /api/scheduled-matches/[id]/run — 立即执行计划匹配任务 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const task = await prisma.scheduledMatch.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.status !== 'PENDING') {
      return NextResponse.json(
        {
          error:
            task.status === 'RUNNING'
              ? '任务已在执行中'
              : '任务已完成、失败或已取消，无法重复执行',
        },
        { status: 409 }
      );
    }

    // 在后台异步执行，立即返回响应
    executeScheduledMatch(id).catch((err: Error) => {
      console.error(`[立即匹配] 任务 ${id} 执行失败:`, err);
    });

    return NextResponse.json({ message: '已开始匹配，请稍候刷新查看进度' });
  } catch (error) {
    console.error('立即执行匹配任务失败:', error);
    return NextResponse.json({ error: '执行失败' }, { status: 500 });
  }
}
