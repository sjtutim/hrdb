import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 候选人状态到员工状态的映射
const candidateStatusToEmployeeStatus: Record<string, string> = {
  ONBOARDING: 'PROBATION',
  PROBATION: 'PROBATION',
  EMPLOYED: 'REGULAR',
  ARCHIVED: 'RESIGNED',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      // 前端把“已离职”统一传为 RESIGNED，这里包含已解雇
      where.status = status === 'RESIGNED' ? { in: ['RESIGNED', 'TERMINATED'] } : status;
    }

    if (department) {
      where.department = department;
    }

    if (search) {
      where.OR = [
        { candidate: { name: { contains: search, mode: 'insensitive' } } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询已有 Employee 记录的员工
    const employees = await prisma.employee.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            education: true,
            currentPosition: true,
            currentCompany: true,
            department: true,
            totalScore: true,
            initialScore: true,
          },
        },
        performanceReviews: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        hireDate: 'desc',
      },
    });

    // 动态计算当前评分
    const employeesWithCalculatedScore = employees.map(emp => {
      const candidateScore = emp.candidate.totalScore ?? emp.candidate.initialScore ?? 0;
      let calculatedScore = emp.currentScore;
      if (emp.performanceReviews.length > 0) {
        calculatedScore = emp.performanceReviews[0].score;
      } else if (calculatedScore === 0 && candidateScore > 0) {
        calculatedScore = candidateScore;
      }
      return {
        ...emp,
        currentScore: calculatedScore,
      };
    });

    // 查询状态为已入职/试用期但没有 Employee 记录的候选人
    const employeeCandidateIds = employees.map(e => e.candidateId);
    const candidateWhere: any = {
      status: { in: ['ONBOARDING', 'PROBATION', 'EMPLOYED', 'ARCHIVED'] },
      employeeRecord: { is: null },
    };
    if (employeeCandidateIds.length > 0) {
      candidateWhere.id = { notIn: employeeCandidateIds };
    }
    if (search) {
      candidateWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { currentPosition: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      candidateWhere.department = department;
    }

    const orphanCandidates = await prisma.candidate.findMany({
      where: candidateWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        education: true,
        currentPosition: true,
        currentCompany: true,
        status: true,
        totalScore: true,
        initialScore: true,
        createdAt: true,
      },
    });

    // 将没有 Employee 记录的候选人转换为虚拟员工记录
    const virtualEmployees = orphanCandidates
      .filter(c => {
        const mappedStatus = candidateStatusToEmployeeStatus[c.status];
        if (status && mappedStatus !== status) return false;
        return true;
      })
      .map(c => ({
        id: `virtual-${c.id}`,
        candidateId: c.id,
        employeeId: '-',
        department: c.department || '-',
        position: c.currentPosition || '-',
        hireDate: c.createdAt,
        probationEndDate: c.createdAt,
        status: candidateStatusToEmployeeStatus[c.status] || 'PROBATION',
        currentScore: c.totalScore ?? c.initialScore ?? 0,
        createdAt: c.createdAt,
        updatedAt: c.createdAt,
        candidate: {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          education: c.education,
          currentPosition: c.currentPosition,
          currentCompany: c.currentCompany,
          department: c.department,
        },
      }));

    const allEmployees = [...employeesWithCalculatedScore, ...virtualEmployees];

    // 获取部门列表（合并 Employee 和 Candidate 的部门，过滤掉"-"和空值）
    const employeeDepartments = await prisma.employee.findMany({
      where: {
        department: { not: '-' },
      },
      select: {
        department: true,
      },
      distinct: ['department'],
    });

    const candidateDepartments = await prisma.candidate.findMany({
      where: {
        department: { not: null },
        status: { in: ['ONBOARDING', 'PROBATION', 'EMPLOYED', 'ARCHIVED'] },
      },
      select: {
        department: true,
      },
      distinct: ['department'],
    });

    const allDepartments = [
      ...new Set([
        ...employeeDepartments.map(d => d.department),
        ...candidateDepartments.map(d => d.department!),
      ]),
    ].filter(d => d && d !== '-').sort();

    return NextResponse.json({
      employees: allEmployees,
      departments: allDepartments,
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    return NextResponse.json({ error: '获取员工列表失败' }, { status: 500 });
  }
}
