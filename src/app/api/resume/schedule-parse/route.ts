import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** 计算下一个凌晨3点 */
function getNext3AM(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function POST(request: NextRequest) {
  try {
    const { files, immediate } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '缺少文件列表' }, { status: 400 });
    }

    // immediate=true 时立即入队（scheduledFor=now），否则凌晨3点
    const scheduledFor = immediate ? new Date() : getNext3AM();

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
      message: `已加入队列，将在 ${scheduledFor.toLocaleString('zh-CN')} 自动解析`,
      scheduledFor: scheduledFor.toISOString(),
      count: records.length,
      records,
    });
  } catch (error) {
    console.error('创建延时解析任务失败:', error);
    return NextResponse.json({ error: '创建延时解析任务失败' }, { status: 500 });
  }
}
