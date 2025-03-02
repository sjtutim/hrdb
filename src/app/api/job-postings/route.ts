import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有岗位
export async function GET(request: NextRequest) {
  try {
    const jobPostings = await prisma.jobPosting.findMany({
      include: {
        tags: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    return NextResponse.json(jobPostings);
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
        // 假设当前用户ID，实际应从会话中获取
        creatorId: 'user-id-placeholder', // TODO: 从会话中获取真实用户ID
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
