import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有用户（面试官）
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建新用户
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证必要字段
    if (!data.name || !data.email || !data.role) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }
    
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }
    
    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        image: data.image || null,
      },
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('创建用户错误:', error);
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}
