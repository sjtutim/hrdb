import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash, compare } from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// 修改密码
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();

    // 验证必要字段
    if (!data.currentPassword || !data.password) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 验证当前密码
    const isPasswordValid = await compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '当前密码错误' },
        { status: 400 }
      );
    }

    // 哈希新密码并更新
    const hashedPassword = await hash(data.password, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    return NextResponse.json(
      { error: '修改密码失败' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();

    // 验证必要字段
    if (!data.name || !data.email || !data.role) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查邮箱是否被其他用户使用
    const emailUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailUser && emailUser.id !== id) {
      return NextResponse.json(
        { error: '该邮箱已被其他用户使用' },
        { status: 400 }
      );
    }

    // 如果提供了密码，则哈希后更新
    const hashedPassword = data.password ? await hash(data.password, 10) : undefined;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('更新用户错误:', error);
    return NextResponse.json(
      { error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        candidates: { take: 1 },
        interviews: { take: 1 },
        jobPostings: { take: 1 },
        evaluations: { take: 1 },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否有关联数据
    if (
      user.candidates.length > 0 ||
      user.interviews.length > 0 ||
      user.jobPostings.length > 0 ||
      user.evaluations.length > 0
    ) {
      return NextResponse.json(
        { error: '该用户有关联数据，无法删除。请先转移相关数据。' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: '用户已删除' });
  } catch (error) {
    console.error('删除用户错误:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
}
