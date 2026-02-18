import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取单个候选人详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;

    const candidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
      include: {
        tags: true,
        certificates: true,
        employeeRecord: {
          select: {
            id: true,
            employeeId: true,
            department: true,
            position: true,
            status: true,
            performanceReviews: {
              orderBy: { date: 'desc' },
            },
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        interviews: {
          include: {
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
        },
        evaluations: {
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        jobMatches: {
          include: {
            jobPosting: {
              select: {
                id: true,
                title: true,
                department: true,
                status: true,
              },
            },
          },
          orderBy: {
            matchScore: 'desc',
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('获取候选人详情错误:', error);
    return NextResponse.json(
      { error: '获取候选人详情失败' },
      { status: 500 }
    );
  }
}

// 更新候选人信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const data = await request.json();

    // 检查候选人是否存在
    const existingCandidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
    });

    if (!existingCandidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    // 如果更新邮箱，检查唯一性
    if (data.email && data.email !== existingCandidate.email) {
      const emailExists = await prisma.candidate.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: '该邮箱已存在' },
          { status: 400 }
        );
      }
    }

    const updatedCandidate = await prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        name: data.name || existingCandidate.name,
        email: data.email || existingCandidate.email,
        phone: data.phone !== undefined ? data.phone : existingCandidate.phone,
        education: data.education !== undefined ? data.education : existingCandidate.education,
        workExperience: data.workExperience !== undefined ? data.workExperience : existingCandidate.workExperience,
        currentPosition: data.currentPosition !== undefined ? data.currentPosition : existingCandidate.currentPosition,
        currentCompany: data.currentCompany !== undefined ? data.currentCompany : existingCandidate.currentCompany,
        resumeUrl: data.resumeUrl !== undefined ? data.resumeUrl : existingCandidate.resumeUrl,
        resumeFileName: data.resumeFileName !== undefined ? data.resumeFileName : (existingCandidate as any).resumeFileName,
        resumeContent: data.resumeContent !== undefined ? data.resumeContent : existingCandidate.resumeContent,
        initialScore: data.initialScore !== undefined ? data.initialScore : existingCandidate.initialScore,
        totalScore: data.totalScore !== undefined ? data.totalScore : existingCandidate.totalScore,
        aiEvaluation: data.aiEvaluation !== undefined ? data.aiEvaluation : existingCandidate.aiEvaluation,
        status: data.status || existingCandidate.status,
        recruiterId: data.recruiterId !== undefined ? data.recruiterId : existingCandidate.recruiterId,
      },
      include: {
        tags: true,
        certificates: true,
      },
    });

    // 更新标签
    if (data.tagIds && Array.isArray(data.tagIds)) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          tags: {
            set: data.tagIds.map((id: string) => ({ id })),
          },
        },
      });
    }

    return NextResponse.json(updatedCandidate);
  } catch (error) {
    console.error('更新候选人错误:', error);
    return NextResponse.json(
      { error: '更新候选人失败' },
      { status: 500 }
    );
  }
}

// 删除候选人
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;

    // 检查候选人是否存在
    const candidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    // 删除候选人（级联删除关联数据）
    await prisma.candidate.delete({
      where: {
        id: candidateId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除候选人错误:', error);
    return NextResponse.json(
      { error: '删除候选人失败' },
      { status: 500 }
    );
  }
}

// 部分更新候选人（如HR评估分）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const data = await request.json();

    // 检查候选人是否存在
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!existingCandidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }

    // 只允许更新部分字段
    const allowedFields = ['totalScore', 'aiEvaluation', 'status', 'recruiterId'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
      include: {
        tags: true,
        certificates: true,
      },
    });

    return NextResponse.json(updatedCandidate);
  } catch (error) {
    console.error('更新候选人错误:', error);
    return NextResponse.json({ error: '更新候选人失败' }, { status: 500 });
  }
}
