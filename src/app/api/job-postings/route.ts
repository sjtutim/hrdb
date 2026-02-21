import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

// 获取所有岗位
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');

    const where = status ? { status: status as any } : {};

    // 获取总数
    const total = await prisma.jobPosting.count({ where });

    // 获取分页数据
    const jobPostings = await prisma.jobPosting.findMany({
      where,
      include: {
        tags: true,
        _count: {
          select: {
            jobMatches: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 格式化返回数据
    const jobs = jobPostings.map(job => ({
      ...job,
      description: job.description,
      requirements: job.requirements,
      matchesCount: job._count.jobMatches,
    }));

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取岗位列表错误:', error);
    return NextResponse.json(
      { error: '获取岗位列表失败' },
      { status: 500 }
    );
  }
}

// 创建新岗位
export async function POST(request: NextRequest) {
  try {
    // 直接从 JWT cookie 读取 token，token.id 即为数据库用户 ID
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // 验证必填字段
    if (!data.title || !data.department || !data.description || !data.requirements) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 提取标签IDs
    const tagIds = data.tagIds || [];
    delete data.tagIds;

    // 创建岗位
    const jobPosting = await prisma.jobPosting.create({
      data: {
        title: data.title,
        department: data.department,
        description: data.description,
        requirements: data.requirements,
        status: data.status || 'DRAFT',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        creatorId: userId,
        // 关联标签
        tags: {
          connect: tagIds.map((id: string) => ({ id })),
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('创建岗位错误:', error);
    return NextResponse.json(
      { error: '创建岗位失败' },
      { status: 500 }
    );
  }
}
