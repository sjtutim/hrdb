import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有角色权限配置，返回 { [role]: string[] }
export async function GET() {
  try {
    const permissions = await prisma.rolePermission.findMany();

    const result: Record<string, string[]> = {};
    for (const perm of permissions) {
      if (!result[perm.role]) {
        result[perm.role] = [];
      }
      result[perm.role].push(perm.menuKey);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取角色权限错误:', error);
    return NextResponse.json(
      { error: '获取角色权限失败' },
      { status: 500 }
    );
  }
}

// 更新某角色的菜单权限
export async function PUT(request: NextRequest) {
  try {
    const { role, menuKeys } = await request.json();

    if (!role || !Array.isArray(menuKeys)) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 事务：删除旧记录后批量插入新记录
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { role },
      });

      if (menuKeys.length > 0) {
        await tx.rolePermission.createMany({
          data: menuKeys.map((menuKey: string) => ({
            role,
            menuKey,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新角色权限错误:', error);
    return NextResponse.json(
      { error: '更新角色权限失败' },
      { status: 500 }
    );
  }
}
