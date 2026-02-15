import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 更新标签
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, category } = await request.json();

    if (!name || !category) {
      return NextResponse.json(
        { error: '标签名称和类别不能为空' },
        { status: 400 }
      );
    }

    // 检查标签是否存在
    const existingTag = await prisma.tag.findUnique({ where: { id } });
    if (!existingTag) {
      return NextResponse.json(
        { error: '标签不存在' },
        { status: 404 }
      );
    }

    // 检查名称是否被其他标签使用（同一类别下）
    const nameTag = await prisma.tag.findUnique({
      where: { name_category: { name, category } },
    });
    if (nameTag && nameTag.id !== id) {
      return NextResponse.json(
        { error: '该标签名称已存在' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name, category },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('更新标签错误:', error);
    return NextResponse.json(
      { error: '更新标签失败' },
      { status: 500 }
    );
  }
}

// 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 检查标签是否存在及关联数据
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        candidates: { take: 1 },
        jobPostings: { take: 1 },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: '标签不存在' },
        { status: 404 }
      );
    }

    if (tag.candidates.length > 0 || tag.jobPostings.length > 0) {
      return NextResponse.json(
        { error: '该标签已被候选人或职位使用，无法删除。' },
        { status: 400 }
      );
    }

    await prisma.tag.delete({ where: { id } });

    return NextResponse.json({ message: '标签已删除' });
  } catch (error) {
    console.error('删除标签错误:', error);
    return NextResponse.json(
      { error: '删除标签失败' },
      { status: 500 }
    );
  }
}
