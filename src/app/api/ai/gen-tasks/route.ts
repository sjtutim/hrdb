import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** GET /api/ai/gen-tasks — 查询 PENDING / RUNNING / FAILED 任务 */
export async function GET() {
  try {
    const tasks = await prisma.aiGenTask.findMany({
      where: { status: { in: ['PENDING', 'RUNNING', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        department: true,
        tags: true,
        status: true,
        error: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('查询 AI 生成任务失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
