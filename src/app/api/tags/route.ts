import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有标签
export async function GET(request: NextRequest) {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
    
    return NextResponse.json(tags);
  } catch (error) {
    console.error('获取标签列表错误:', error);
    return NextResponse.json(
      { error: '获取标签列表失败' },
      { status: 500 }
    );
  }
}

// 创建新标签
export async function POST(request: NextRequest) {
  try {
    const { name, category } = await request.json();
    
    if (!name || !category) {
      return NextResponse.json(
        { error: '标签名称和类别不能为空' },
        { status: 400 }
      );
    }
    
    // 检查标签是否已存在
    const existingTag = await prisma.tag.findUnique({
      where: { name },
    });
    
    if (existingTag) {
      return NextResponse.json(
        { error: '标签已存在' },
        { status: 400 }
      );
    }
    
    // 创建新标签
    const tag = await prisma.tag.create({
      data: {
        name,
        category,
      },
    });
    
    return NextResponse.json(tag);
  } catch (error) {
    console.error('创建标签错误:', error);
    return NextResponse.json(
      { error: '创建标签失败' },
      { status: 500 }
    );
  }
}
