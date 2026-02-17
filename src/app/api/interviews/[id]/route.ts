import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// 获取单个面试详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;

    // 获取当前登录用户
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const interview = await prisma.interview.findUnique({
      where: {
        id: interviewId,
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            currentPosition: true,
            currentCompany: true,
            tags: true,
          },
        },
        interviews: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        scores: {
          include: {
            interviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: '面试不存在' },
        { status: 404 }
      );
    }

    // 如果用户未登录，检查是否是面试参与者
    if (!currentUserId) {
      const isParticipant = interview.interviews.some(i => i.id === currentUserId);
      if (!isParticipant) {
        return NextResponse.json(
          { error: '无权访问此面试' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error('获取面试详情错误:', error);
    return NextResponse.json(
      { error: '获取面试详情失败' },
      { status: 500 }
    );
  }
}

// 更新面试信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    const data = await request.json();
    
    // 获取当前面试信息
    const currentInterview = await prisma.interview.findUnique({
      where: {
        id: interviewId,
      },
    });
    
    if (!currentInterview) {
      return NextResponse.json(
        { error: '面试不存在' },
        { status: 404 }
      );
    }
    
    // 更新面试信息
    const updateData: any = {
      type: data.type || currentInterview.type,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : currentInterview.scheduledAt,
      location: data.location !== undefined ? data.location : currentInterview.location,
      completedAt: data.completedAt ? new Date(data.completedAt) : data.status === 'COMPLETED' ? new Date() : currentInterview.completedAt,
      status: data.status || currentInterview.status,
      notes: data.notes !== undefined ? data.notes : currentInterview.notes,
      feedback: data.feedback !== undefined ? data.feedback : currentInterview.feedback,
      decision: data.decision || currentInterview.decision,
    };

    // 如果提供了新的面试官列表，更新多对多关系
    if (data.interviewerIds) {
      updateData.interviews = {
        set: data.interviewerIds.map((id: string) => ({ id })),
      };
    }

    const updatedInterview = await prisma.interview.update({
      where: {
        id: interviewId,
      },
      data: updateData,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
          },
        },
        interviews: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // 如果面试状态为已完成且有决定，更新候选人状态
    if (data.status === 'COMPLETED' && data.decision) {
      let candidateStatus;
      
      switch (data.decision) {
        case 'PASS':
          candidateStatus = 'OFFERED';
          break;
        case 'FAIL':
          candidateStatus = 'REJECTED';
          break;
        case 'HOLD':
          candidateStatus = 'INTERVIEWING';
          break;
        default:
          candidateStatus = 'INTERVIEWING';
      }
      
      // 更新候选人状态
      await prisma.candidate.update({
        where: {
          id: updatedInterview.candidateId,
        },
        data: {
          status: candidateStatus,
        },
      });
    }
    
    // 如果有评分数据，创建或更新评分
    if (data.scores && Array.isArray(data.scores)) {
      // 获取当前登录用户作为面试官
      const session = await getServerSession(authOptions);
      const currentUserId = session?.user?.id;

      // 获取当前用户信息
      const currentUser = currentUserId ? await prisma.user.findUnique({
        where: { id: currentUserId },
      }) : null;

      // 删除当前用户为该面试官的所有现有评分
      if (currentUserId) {
        await prisma.interviewScore.deleteMany({
          where: {
            interviewId,
            interviewerId: currentUserId,
          },
        });
      }

      // 创建新评分（使用当前登录用户作为面试官）
      for (const score of data.scores) {
        await prisma.interviewScore.create({
          data: {
            interviewId,
            interviewerId: score.interviewerId || currentUserId,
            category: score.category,
            score: score.score,
            notes: score.notes || null,
          },
        });
      }
    }
    
    return NextResponse.json(updatedInterview);
  } catch (error) {
    console.error('更新面试错误:', error);
    return NextResponse.json(
      { error: '更新面试失败' },
      { status: 500 }
    );
  }
}

// 单独添加评分
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    const data = await request.json();

    // 验证必要字段
    if (!data.scores || !Array.isArray(data.scores)) {
      return NextResponse.json(
        { error: '缺少评分数据' },
        { status: 400 }
      );
    }

    // 检查面试是否存在
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return NextResponse.json(
        { error: '面试不存在' },
        { status: 404 }
      );
    }

    // 获取当前登录用户
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: '未登录，无法评分' },
        { status: 401 }
      );
    }

    // 删除当前用户的所有现有评分（允许重新评分）
    await prisma.interviewScore.deleteMany({
      where: {
        interviewId,
        interviewerId: currentUserId,
      },
    });

    // 创建新评分
    const createdScores = [];
    for (const score of data.scores) {
      const created = await prisma.interviewScore.create({
        data: {
          interviewId,
          interviewerId: currentUserId,
          category: score.category,
          score: score.score,
          notes: score.notes || null,
        },
        include: {
          interviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      createdScores.push(created);
    }

    // 获取更新后的完整面试信息
    const updatedInterview = await prisma.interview.findUnique({
      where: { id: interviewId },
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
          },
        },
        scores: {
          include: {
            interviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedInterview);
  } catch (error) {
    console.error('添加评分错误:', error);
    return NextResponse.json(
      { error: '添加评分失败' },
      { status: 500 }
    );
  }
}

// 删除面试
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    
    // 检查面试是否存在
    const interview = await prisma.interview.findUnique({
      where: {
        id: interviewId,
      },
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: '面试不存在' },
        { status: 404 }
      );
    }
    
    // 删除相关评分
    await prisma.interviewScore.deleteMany({
      where: {
        interviewId,
      },
    });
    
    // 删除面试
    await prisma.interview.delete({
      where: {
        id: interviewId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除面试错误:', error);
    return NextResponse.json(
      { error: '删除面试失败' },
      { status: 500 }
    );
  }
}
