import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { formatBeijingDateTime, getNextBeijingTime } from '@/lib/beijing-time';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { files, immediate } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '缺少文件列表' }, { status: 400 });
    }

    // immediate=true 时立即入队（scheduledFor=now），否则凌晨3点
    const scheduledFor = immediate ? new Date() : getNextBeijingTime(3, 0);

    const records = await prisma.$transaction(
      files.map((f: { fileId: string; objectName: string; contentType: string; originalName: string }) =>
        prisma.scheduledParse.create({
          data: {
            fileId: f.fileId,
            objectName: f.objectName,
            contentType: f.contentType,
            originalName: f.originalName,
            scheduledFor,
          },
        })
      )
    );

    return NextResponse.json({
      message: `已加入队列，将在 ${formatBeijingDateTime(scheduledFor)} 自动解析`,
      scheduledFor: scheduledFor.toISOString(),
      count: records.length,
      records,
    });
  } catch (error) {
    console.error('创建延时解析任务失败:', error);
    return NextResponse.json({ error: '创建延时解析任务失败' }, { status: 500 });
  }
}
