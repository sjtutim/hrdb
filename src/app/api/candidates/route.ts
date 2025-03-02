import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有候选人
export async function GET(request: NextRequest) {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        tags: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    return NextResponse.json(candidates);
  } catch (error) {
    console.error('获取候选人列表错误:', error);
    return NextResponse.json(
      { error: '获取候选人列表失败' },
      { status: 500 }
    );
  }
}
