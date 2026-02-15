import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 候选人办理入职
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const data = await request.json();

    const { employeeId, department, position, hireDate, probationEndDate } = data;

    // 校验必填字段
    if (!employeeId || !department || !position || !hireDate || !probationEndDate) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 查询候选人
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { employeeRecord: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    // 校验候选人状态
    if (candidate.status !== 'OFFERED' && candidate.status !== 'ONBOARDING') {
      return NextResponse.json(
        { error: '只有状态为「已发offer」或「入职中」的候选人才能办理入职' },
        { status: 400 }
      );
    }

    // 校验候选人未关联 Employee 记录
    if (candidate.employeeRecord) {
      return NextResponse.json(
        { error: '该候选人已有员工记录' },
        { status: 400 }
      );
    }

    // 校验 employeeId 唯一性
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: '该员工编号已被使用' },
        { status: 400 }
      );
    }

    // 事务操作：创建 Employee 记录 + 更新候选人状态
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          candidateId,
          employeeId,
          department,
          position,
          hireDate: new Date(hireDate),
          probationEndDate: new Date(probationEndDate),
          status: 'PROBATION',
          currentScore: candidate.totalScore ?? 0,
        },
      });

      await tx.candidate.update({
        where: { id: candidateId },
        data: { status: 'ONBOARDING' },
      });

      return employee;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('办理入职错误:', error);
    return NextResponse.json(
      { error: '办理入职失败' },
      { status: 500 }
    );
  }
}
