import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/minio';

// 处理简历上传（上传至 MinIO）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: '只支持PDF格式的文件' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const fileId = uuidv4();
    const objectName = `resumes/${fileId}.pdf`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // 上传至 MinIO
      const fileUrl = await uploadFile(buffer, objectName, 'application/pdf');

      // 返回文件ID和URL，用于后续处理
      return NextResponse.json({
        fileId,
        fileUrl,
        objectName,
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
