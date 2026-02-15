import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { deleteFile } from '@/lib/minio';

const prisma = new PrismaClient();

// 删除候选人简历文件
export async function POST(request: NextRequest) {
  try {
    const { candidateId } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ error: '缺少候选人ID' }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { resumeUrl: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }

    if (!candidate.resumeUrl) {
      return NextResponse.json({ error: '该候选人没有简历文件' }, { status: 400 });
    }

    // 从 MinIO 删除文件
    try {
      await deleteFile(candidate.resumeUrl);
    } catch (err) {
      console.error('MinIO删除文件错误:', err);
      // 即使 MinIO 删除失败，仍然清除数据库记录
    }

    // 清除数据库中的 resumeUrl
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { resumeUrl: null, resumeFileName: null },
    });

    return NextResponse.json({ message: '简历文件已删除' });
  } catch (error) {
    console.error('删除简历错误:', error);
    return NextResponse.json({ error: '删除简历失败' }, { status: 500 });
  }
}
