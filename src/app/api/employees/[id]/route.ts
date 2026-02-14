import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
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
      },
    });

    if (!employee) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('获取员工详情失败:', error);
    return NextResponse.json({ error: '获取员工详情失败' }, { status: 500 });
  }
}
