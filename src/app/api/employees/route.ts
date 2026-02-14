import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // 获取部门列表
    const departments = await prisma.employee.findMany({
      select: {
        department: true,
      },
      distinct: ['department'],
    });

    return NextResponse.json({
      employees,
      departments: departments.map(d => d.department).filter(Boolean),
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    return NextResponse.json({ error: '获取员工列表失败' }, { status: 500 });
  }
}
