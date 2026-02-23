import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { uploadFile, deleteFile } from '@/lib/minio';
import { BUCKET_NAME } from '@/lib/minio';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// 从 fileUrl（可能是完整URL或objectName）中提取 objectName
function extractObjectName(fileUrl: string): string {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    try {
      const url = new URL(fileUrl);
      // pathname: /bucketName/objectName -> objectName
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(1).join('/');
      }
    } catch {
      // ignore
    }
  }
  return fileUrl;
}

// 获取候选人的所有附件
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { candidateId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(certificates);
  } catch (error) {
    console.error('获取附件列表错误:', error);
    return NextResponse.json({ error: '获取附件列表失败' }, { status: 500 });
  }
}

// 上传附件文件并创建记录
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const nameParam = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    // 验证文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const resolvedMime = ALLOWED_TYPES[file.type]
      ? file.type
      : EXT_TO_MIME[fileExt] || file.type;
    if (!ALLOWED_TYPES[resolvedMime]) {
      return NextResponse.json(
        { error: '只支持 PDF 和 DOCX 格式的文件' },
        { status: 400 }
      );
    }

    // 验证候选人存在
    const candidate = await prisma.candidate.findUnique({ where: { id: params.id } });
    if (!candidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }

    const fileId = uuidv4();
    const ext = ALLOWED_TYPES[resolvedMime];
    const objectName = `certificates/${params.id}/${fileId}${ext}`;
    const originalName = file.name;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await uploadFile(buffer, objectName, resolvedMime);

    const certificate = await prisma.certificate.create({
      data: {
        candidateId: params.id,
        name: nameParam || originalName,
        description: description || null,
        fileUrl: objectName,
        fileName: originalName,
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error('创建附件错误:', error);
    return NextResponse.json({ error: '创建附件失败' }, { status: 500 });
  }
}

// 删除附件（同时删除 MinIO 文件）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');

    if (!certificateId) {
      return NextResponse.json({ error: '缺少附件ID' }, { status: 400 });
    }

    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!cert) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 });
    }

    // 删除 MinIO 文件
    if (cert.fileUrl) {
      try {
        const objectName = extractObjectName(cert.fileUrl);
        await deleteFile(objectName);
      } catch (e) {
        console.warn('删除 MinIO 文件失败（忽略）:', e);
      }
    }

    await prisma.certificate.delete({ where: { id: certificateId } });

    return NextResponse.json({ message: '附件已删除' });
  } catch (error) {
    console.error('删除附件错误:', error);
    return NextResponse.json({ error: '删除附件失败' }, { status: 500 });
  }
}
