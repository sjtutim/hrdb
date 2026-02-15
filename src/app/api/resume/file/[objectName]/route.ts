import { NextRequest, NextResponse } from 'next/server';
import { minioClient, BUCKET_NAME } from '@/lib/minio';

// 获取 MinIO 中的简历文件（用于预览和下载）
export async function GET(
  request: NextRequest,
  { params }: { params: { objectName: string } }
) {
  try {
    const objectName = decodeURIComponent(params.objectName);

    // 从 MinIO 获取文件流
    const stream = await minioClient.getObject(BUCKET_NAME, objectName);

    // 获取文件元数据
    const stat = await minioClient.statObject(BUCKET_NAME, objectName);
    const contentType = stat.metaData?.['content-type'] || 'application/octet-stream';

    // 读取流为 Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
    };

    // PDF 设为 inline 用于预览，DOCX 设为 attachment 用于下载
    if (contentType === 'application/pdf') {
      headers['Content-Disposition'] = 'inline';
    } else {
      const filename = objectName.split('/').pop() || 'download';
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(buffer, { headers });
  } catch (error: any) {
    console.error('获取文件错误:', error);
    if (error.code === 'NoSuchKey') {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: '获取文件失败' }, { status: 500 });
  }
}
