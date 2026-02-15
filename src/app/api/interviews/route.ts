import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有面试
export async function GET(request: NextRequest) {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        interviews: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scores: true,
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });
    
    return NextResponse.json(interviews);
  } catch (error) {
    console.error('获取面试列表错误:', error);
    return NextResponse.json(
      { error: '获取面试列表失败' },
      { status: 500 }
    );
  }
}

// 创建新面试
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 验证必要字段
    if (!data.candidateId || !data.interviewerIds || !data.type || !data.scheduledAt) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 创建面试记录
    const interview = await prisma.interview.create({
      data: {
        candidateId: data.candidateId,
        interviews: {
          connect: data.interviewerIds.map((id: string) => ({ id })),
        },
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        location: data.location || null,
        notes: data.notes || null,
        status: 'SCHEDULED',
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        interviews: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    // 更新候选人状态为面试中
    await prisma.candidate.update({
      where: {
        id: data.candidateId,
      },
      data: {
        status: 'INTERVIEWING',
      },
    });
    
    return NextResponse.json(interview);
  } catch (error) {
    console.error('创建面试错误:', error);
    return NextResponse.json(
      { error: '创建面试失败' },
      { status: 500 }
    );
  }
}
