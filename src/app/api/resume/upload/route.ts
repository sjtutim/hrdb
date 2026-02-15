import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/minio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// 处理简历上传（上传至 MinIO）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const candidateId = formData.get('candidateId') as string;

    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: '只支持PDF和DOCX格式的文件' },
        { status: 400 }
      );
    }

    // 生成唯一文件名，保存到 hrdb/ 目录下
    const fileId = uuidv4();
    const originalName = file.name || `resume${ext}`;
    const objectName = `hrdb/${fileId}${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // 上传至 MinIO
      const fileUrl = await uploadFile(buffer, objectName, file.type);

      // 如果提供了 candidateId，更新候选人的 resumeUrl
      if (candidateId) {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { resumeUrl: objectName, resumeFileName: originalName },
        });
      }

      return NextResponse.json({
        fileId,
        fileUrl,
        objectName,
        originalName,
        contentType: file.type,
        message: '文件上传成功',
      });
    } catch (error) {
      console.error('MinIO上传错误:', error);
      return NextResponse.json(
        { error: '文件上传至存储服务失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('上传处理错误:', error);
    return NextResponse.json(
      { error: '文件上传处理失败' },
      { status: 500 }
    );
  }
}
