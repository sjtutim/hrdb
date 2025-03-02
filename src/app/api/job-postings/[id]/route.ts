import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取单个岗位详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    
    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        tags: true,
      },
    });
    
    if (!jobPosting) {
      return NextResponse.json(
        { error: '岗位不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('获取岗位详情错误:', error);
    return NextResponse.json(
      { error: '获取岗位详情失败' },
      { status: 500 }
    );
  }
}

// 更新岗位
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    const data = await request.json();
    
    // 检查岗位是否存在
    const existingJob = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { tags: true },
    });
    
    if (!existingJob) {
      return NextResponse.json(
        { error: '岗位不存在' },
        { status: 404 }
      );
    }
    
    // 提取标签IDs
    const tagIds = data.tagIds || undefined;
    if (tagIds !== undefined) {
      delete data.tagIds;
    }
    
    // 更新岗位
    const jobPosting = await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.department && { department: data.department }),
        ...(data.description && { description: data.description }),
        ...(data.requirements && { requirements: data.requirements }),
        ...(data.status && { status: data.status }),
        ...(data.expiresAt !== undefined && { 
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null 
        }),
        // 如果提供了标签IDs，则更新标签关联
        ...(tagIds && {
          tags: {
            set: [], // 先清空现有关联
            connect: tagIds.map((id: string) => ({ id })),
          },
        }),
      },
      include: {
        tags: true,
      },
    });
    
    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('更新岗位错误:', error);
    return NextResponse.json(
      { error: '更新岗位失败' },
      { status: 500 }
    );
  }
}

// 删除岗位
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    
    // 检查岗位是否存在
    const existingJob = await prisma.jobPosting.findUnique({
      where: { id: jobId },
    });
    
    if (!existingJob) {
      return NextResponse.json(
        { error: '岗位不存在' },
        { status: 404 }
      );
    }
    
    // 删除岗位
    await prisma.jobPosting.delete({
      where: { id: jobId },
    });
    
    return NextResponse.json(
      { message: '岗位已成功删除' },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除岗位错误:', error);
    return NextResponse.json(
      { error: '删除岗位失败' },
      { status: 500 }
    );
  }
}
