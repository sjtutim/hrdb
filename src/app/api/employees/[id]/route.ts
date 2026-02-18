import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const candidateStatusToEmployeeStatus: Record<string, string> = {
  ONBOARDING: 'PROBATION',
  PROBATION: 'PROBATION',
  EMPLOYED: 'REGULAR',
  ARCHIVED: 'RESIGNED',
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 处理虚拟员工 ID（没有 Employee 记录的候选人）
    if (id.startsWith('virtual-')) {
      const candidateId = id.replace('virtual-', '');
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          tags: true,
          interviews: {
            orderBy: { scheduledAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!candidate) {
        return NextResponse.json({ error: '员工不存在' }, { status: 404 });
      }

      return NextResponse.json({
        id: `virtual-${candidate.id}`,
        candidateId: candidate.id,
        employeeId: '-',
        department: '-',
        position: candidate.currentPosition || '-',
        hireDate: candidate.createdAt,
        probationEndDate: candidate.createdAt,
        status: candidateStatusToEmployeeStatus[candidate.status] || 'PROBATION',
        currentScore: candidate.totalScore ?? candidate.initialScore ?? 0,
        createdAt: candidate.createdAt,
        updatedAt: candidate.createdAt,
        candidate,
        rewards: [],
        penalties: [],
        projects: [],
        performanceReviews: [],
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            tags: true,
            interviews: {
              orderBy: { scheduledAt: 'desc' },
              take: 5,
            },
          },
        },
        rewards: {
          orderBy: { date: 'desc' },
        },
        penalties: {
          orderBy: { date: 'desc' },
        },
        projects: true,
        performanceReviews: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    // 动态计算当前评分：取最近一次考核分数，如果没有考核记录则使用存储的值
    const candidateScore = employee.candidate.totalScore ?? employee.candidate.initialScore ?? 0;
    let calculatedCurrentScore = employee.currentScore;
    if (employee.performanceReviews.length > 0) {
      const latestReview = employee.performanceReviews[0]; // 已按日期降序排列
      calculatedCurrentScore = latestReview.score;
    } else if (calculatedCurrentScore === 0 && candidateScore > 0) {
      calculatedCurrentScore = candidateScore;
    }

    return NextResponse.json({
      ...employee,
      currentScore: calculatedCurrentScore,
    });
  } catch (error) {
    console.error('获取员工详情失败:', error);
    return NextResponse.json({ error: '获取员工详情失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const body = await request.json();
    const { status, resignDate, resignReason } = body;

    // 验证目标状态
    if (!['RESIGNED', 'TERMINATED'].includes(status)) {
      return NextResponse.json({ error: '无效的离职状态' }, { status: 400 });
    }

    // 虚拟员工（无 Employee 记录的候选人）离职处理
    if (id.startsWith('virtual-')) {
      const candidateId = id.replace('virtual-', '');
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        return NextResponse.json({ error: '员工不存在' }, { status: 404 });
      }

      if (candidate.status === 'ARCHIVED' || candidate.status === 'REJECTED') {
        return NextResponse.json({ error: '该员工已离职' }, { status: 400 });
      }

      await prisma.candidate.update({
        where: { id: candidateId },
        data: { status: 'ARCHIVED' },
      });

      return NextResponse.json({ success: true, candidateId, status });
    }

    // 正式 Employee 记录的离职处理
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    // 已离职/已解雇的员工不能再次处理
    if (['RESIGNED', 'TERMINATED'].includes(employee.status)) {
      return NextResponse.json({ error: '该员工已离职或已解雇' }, { status: 400 });
    }

    // 更新员工状态和关联候选人状态
    const [updatedEmployee] = await prisma.$transaction([
      prisma.employee.update({
        where: { id },
        data: {
          status,
          resignDate: resignDate ? new Date(resignDate) : new Date(),
          resignReason: resignReason || null,
        },
        include: {
          candidate: true,
        },
      }),
      prisma.candidate.update({
        where: { id: employee.candidateId },
        data: {
          status: 'ARCHIVED',
        },
      }),
    ]);

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('离职处理失败:', error);
    return NextResponse.json({ error: '离职处理失败' }, { status: 500 });
  }
}
