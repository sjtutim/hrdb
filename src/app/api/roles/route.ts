import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有角色
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error('获取角色列表错误:', error);
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
  }
}

// 创建新角色
export async function POST(request: NextRequest) {
  try {
    const { value, label } = await request.json();

    if (!value || !label) {
      return NextResponse.json({ error: '角色标识和名称不能为空' }, { status: 400 });
    }

    // 角色标识只允许大写字母、数字和下划线
    if (!/^[A-Z0-9_]+$/.test(value)) {
      return NextResponse.json(
        { error: '角色标识只能包含大写字母、数字和下划线' },
        { status: 400 }
      );
    }

    const existing = await prisma.role.findUnique({ where: { value } });
    if (existing) {
      return NextResponse.json({ error: '该角色标识已存在' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: { value, label, isSystem: false },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('创建角色错误:', error);
    return NextResponse.json({ error: '创建角色失败' }, { status: 500 });
  }
}
