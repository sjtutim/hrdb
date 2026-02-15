import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 候选人状态到员工状态的映射
const candidateStatusToEmployeeStatus: Record<string, string> = {
  ONBOARDING: 'PROBATION',
  PROBATION: 'PROBATION',
  EMPLOYED: 'REGULAR',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
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
          },
        },
      },
      orderBy: {
        hireDate: 'desc',
      },
    });

    // 查询状态为已入职/试用期但没有 Employee 记录的候选人
    const employeeCandidateIds = employees.map(e => e.candidateId);
    const candidateWhere: any = {
      status: { in: ['ONBOARDING', 'PROBATION', 'EMPLOYED'] },
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

    const orphanCandidates = await prisma.candidate.findMany({
      where: candidateWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        education: true,
        currentPosition: true,
        currentCompany: true,
        status: true,
        totalScore: true,
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
        department: '-',
        position: c.currentPosition || '-',
        hireDate: c.createdAt,
        probationEndDate: c.createdAt,
        status: candidateStatusToEmployeeStatus[c.status] || 'PROBATION',
        currentScore: c.totalScore ?? 0,
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
        },
      }));

    const allEmployees = [...employees, ...virtualEmployees];

    // 获取部门列表
    const departments = await prisma.employee.findMany({
      select: {
        department: true,
      },
      distinct: ['department'],
    });

    return NextResponse.json({
      employees: allEmployees,
      departments: departments.map(d => d.department).filter(Boolean),
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    return NextResponse.json({ error: '获取员工列表失败' }, { status: 500 });
  }
}
