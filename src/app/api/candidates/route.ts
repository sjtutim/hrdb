import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有候选人
export async function GET(request: NextRequest) {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        tags: true,
        certificates: true,
        interviews: {
          include: {
            scores: true,
          },
        },
        employeeRecord: {
          select: {
            id: true,
            status: true,
            department: true,
          }
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 计算每个候选人的面试评分
    const candidatesWithScores = candidates.map(candidate => {
      const allScores: number[] = [];
      candidate.interviews.forEach(interview => {
        if (interview.scores && interview.scores.length > 0) {
          const interviewScore = interview.scores.reduce((sum, s) => sum + s.score, 0) / interview.scores.length;
          allScores.push(interviewScore);
        }
      });
      const interviewScore = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : null;

      return {
        ...candidate,
        interviewScore,
        interviews: undefined, // 移除原始面试数据以减少传输量
      };
    });

    return NextResponse.json(candidatesWithScores);
  } catch (error) {
    console.error('获取候选人列表错误:', error);
    return NextResponse.json(
      { error: '获取候选人列表失败' },
      { status: 500 }
    );
  }
}

// 创建候选人
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, education, workExperience, currentPosition, currentCompany, status, tagIds, aiEvaluation } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { error: '姓名为必填项' },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        education: education || null,
        workExperience: workExperience || null,
        currentPosition: currentPosition || null,
        currentCompany: currentCompany || null,
        aiEvaluation: aiEvaluation || null,
        status: status || 'NEW',
        ...(tagIds && tagIds.length > 0 ? {
          tags: {
            connect: tagIds.map((id: string) => ({ id })),
          },
        } : {}),
      },
      include: {
        tags: true,
        certificates: true,
      },
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error('创建候选人错误:', error);
    return NextResponse.json(
      { error: '创建候选人失败' },
      { status: 500 }
    );
  }
}
