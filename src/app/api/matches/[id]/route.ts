import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 删除匹配记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;

    // 检查匹配记录是否存在
    const existingMatch = await prisma.jobMatch.findUnique({
      where: { id: matchId },
    });

    if (!existingMatch) {
      return NextResponse.json(
        { error: '匹配记录不存在' },
        { status: 404 }
      );
    }

    // 删除匹配记录
    await prisma.jobMatch.delete({
      where: { id: matchId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除匹配记录错误:', error);
    return NextResponse.json(
      { error: '删除匹配记录失败' },
      { status: 500 }
    );
  }
}
