import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tasks = await prisma.scheduledParse.findMany({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        originalName: true,
        status: true,
        scheduledFor: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('查询解析队列失败:', error);
    return NextResponse.json({ error: '查询队列失败' }, { status: 500 });
  }
}
