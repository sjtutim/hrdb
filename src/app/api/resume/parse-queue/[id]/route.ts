import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parseResumeFromStorage } from '@/lib/resume-parse-core';

const prisma = new PrismaClient();

/** DELETE /api/resume/parse-queue/[id] — 删除待解析任务 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const task = await prisma.scheduledParse.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.status === 'RUNNING') {
      return NextResponse.json({ error: '任务正在执行中，无法删除' }, { status: 409 });
    }
    await prisma.scheduledParse.delete({ where: { id } });
    return NextResponse.json({ message: '已删除' });
  } catch (error) {
    console.error('删除解析任务失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

/** POST /api/resume/parse-queue/[id]/run — 立即执行解析任务 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    // 只允许对 PENDING 任务立即执行
    const task = await prisma.scheduledParse.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.status !== 'PENDING') {
      return NextResponse.json(
        { error: task.status === 'RUNNING' ? '任务已在执行中' : '任务已完成或失败，无需重复执行' },
        { status: 409 }
      );
    }

    // 标记为执行中
    await prisma.scheduledParse.update({
      where: { id },
      data: { status: 'RUNNING' },
    });

    // 在后台异步执行，立即返回响应
    parseResumeFromStorage({
      fileId: task.fileId,
      objectName: task.objectName,
      contentType: task.contentType,
      originalName: task.originalName,
    })
      .then(async (result) => {
        await prisma.scheduledParse.update({
          where: { id },
          data: { status: 'COMPLETED', candidateId: result.candidateId },
        });
      })
      .catch(async (err: Error) => {
        await prisma.scheduledParse.update({
          where: { id },
          data: { status: 'FAILED', error: err.message },
        });
      });

    return NextResponse.json({ message: '已开始解析，请稍候刷新查看结果' });
  } catch (error) {
    console.error('立即执行解析失败:', error);
    return NextResponse.json({ error: '执行失败' }, { status: 500 });
  }
}
