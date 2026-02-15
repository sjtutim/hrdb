import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有匹配结果
export async function GET(request: NextRequest) {
  try {
    const matches = await prisma.jobMatch.findMany({
      include: {
        candidate: {
          include: {
            tags: true,
          },
        },
        jobPosting: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        matchScore: 'desc',
      },
    });
    
    return NextResponse.json(matches);
  } catch (error) {
    console.error('获取匹配结果错误:', error);
    return NextResponse.json(
      { error: '获取匹配结果失败' },
      { status: 500 }
    );
  }
}
