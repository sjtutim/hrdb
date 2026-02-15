import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取单个面试详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    
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
        scores: true,
      },
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: '面试不存在' },
        { status: 404 }
      );
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
      // 删除现有评分
      await prisma.interviewScore.deleteMany({
        where: {
          interviewId,
        },
      });
      
      // 创建新评分
      for (const score of data.scores) {
        await prisma.interviewScore.create({
          data: {
            interviewId,
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
