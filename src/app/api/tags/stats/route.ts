import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TagCategory } from '@prisma/client';

const prisma = new PrismaClient();

// 获取标签统计数据
// scope=employees: 只统计试用期和正式员工（PROBATION, EMPLOYED）
// scope=candidates: 排除试用期和正式员工
// 不传: 统计所有
export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope');

    // 根据 scope 构建候选人状态过滤条件
    // scope=employees: 人才库（试用期+已正式入职）
    //   - PROBATION: 试用期
    //   - EMPLOYED: 已正式入职
    // scope=candidates: 候选人库（排除人才库和已拒绝）
    let candidateFilter: Record<string, unknown> | undefined;
    if (scope === 'employees') {
      // 查找 PROBATION（试用期）或 EMPLOYED（已正式入职）的候选人
      candidateFilter = { status: { in: ['PROBATION', 'EMPLOYED'] } };
    } else if (scope === 'candidates') {
      // 排除 PROBATION、EMPLOYED 和 REJECTED（已拒绝）状态
      candidateFilter = { status: { notIn: ['PROBATION', 'EMPLOYED', 'REJECTED'] } };
    }

    // 定义需要统计的类别
    const categories: TagCategory[] = ['SKILL', 'INDUSTRY', 'EDUCATION', 'EXPERIENCE', 'PERSONALITY'];

    // 获取每个类别的标签统计
    const tagStats = await Promise.all(
      categories.map(async (category) => {
        const tags = await prisma.tag.findMany({
          where: {
            category,
            ...(candidateFilter ? { candidates: { some: candidateFilter } } : {}),
          },
          include: {
            _count: {
              select: {
                candidates: candidateFilter ? { where: candidateFilter } : true,
              },
            },
          },
          orderBy: {
            candidates: {
              _count: 'desc',
            },
          },
          take: 50,
        });

        // 统计该类别下有标签的去重人数
        const categoryPeople = await prisma.candidate.count({
          where: {
            ...(candidateFilter || {}),
            tags: { some: { category } },
          },
        });

        return {
          category,
          peopleCount: categoryPeople,
          tags: tags
            .map(tag => ({
              id: tag.id,
              name: tag.name,
              count: tag._count.candidates,
            }))
            .filter(tag => tag.count > 0),
        };
      })
    );

    // 统计参与统计的人数（去重）
    const totalPeople = await prisma.candidate.count({
      where: {
        ...(candidateFilter || {}),
        tags: { some: {} },
      },
    });

    return NextResponse.json({ categories: tagStats, totalPeople });
  } catch (error) {
    console.error('获取标签统计错误:', error);
    return NextResponse.json(
      { error: '获取标签统计失败' },
      { status: 500 }
    );
  }
}
