import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 修改角色名称
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { label } = await request.json();

    if (!label || !label.trim()) {
      return NextResponse.json({ error: '角色名称不能为空' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: { label: label.trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('修改角色错误:', error);
    return NextResponse.json({ error: '修改角色失败' }, { status: 500 });
  }
}

// 删除角色
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    if (role.value === 'ADMIN') {
      return NextResponse.json({ error: '管理员角色不可删除' }, { status: 400 });
    }

    // 检查是否有用户正在使用该角色
    const usersWithRole = await prisma.user.count({ where: { role: role.value } });
    if (usersWithRole > 0) {
      return NextResponse.json(
        { error: `该角色下还有 ${usersWithRole} 个用户，请先修改这些用户的角色后再删除` },
        { status: 400 }
      );
    }

    // 删除角色权限配置
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { role: role.value } });
      await tx.role.delete({ where: { id } });
    });

    return NextResponse.json({ message: '角色已删除' });
  } catch (error) {
    console.error('删除角色错误:', error);
    return NextResponse.json({ error: '删除角色失败' }, { status: 500 });
  }
}
