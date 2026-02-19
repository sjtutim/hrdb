import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parseResumeFromStorage } from '@/lib/resume-parse-core';
import { ResumeValidationError } from '@/lib/llm';

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

/** POST /api/resume/parse-queue/[id] — 立即执行解析任务（SSE 流式进度） */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

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

  // 标记为执行中（在返回 SSE 流之前，防止调度器重复领取）
  await prisma.scheduledParse.update({
    where: { id },
    data: { status: 'RUNNING' },
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
        const result = await parseResumeFromStorage({
          fileId: task.fileId,
          objectName: task.objectName,
          contentType: task.contentType,
          originalName: task.originalName,
          onProgress: (progress, text) => send('progress', { progress, text }),
        });

        await prisma.scheduledParse.update({
          where: { id },
          data: { status: 'COMPLETED', candidateId: result.candidateId },
        });

        send('done', { candidateId: result.candidateId });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : '解析过程中发生错误';
        await prisma.scheduledParse.update({
          where: { id },
          data: { status: 'FAILED', error: errMsg },
        });

        if (error instanceof ResumeValidationError) {
          send('error', { error: errMsg });
        } else {
          send('error', { error: '简历解析失败，请稍后重试' });
        }
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
