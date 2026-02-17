import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE: 取消计划匹配任务（仅 PENDING 状态可取消）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const task = await prisma.scheduledMatch.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    if (task.status !== 'PENDING') {
      return NextResponse.json(
        { error: '只能取消待执行的任务' },
        { status: 400 }
      );
    }

    const updated = await prisma.scheduledMatch.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('取消计划匹配任务错误:', error);
    return NextResponse.json({ error: '取消失败' }, { status: 500 });
  }
}
