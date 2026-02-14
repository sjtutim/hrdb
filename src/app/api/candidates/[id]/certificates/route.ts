import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '@/lib/minio';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// 获取候选人的所有证书
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
    console.error('获取证书列表错误:', error);
    return NextResponse.json(
      { error: '获取证书列表失败' },
      { status: 500 }
    );
  }
}

// 上传证书文件并创建记录
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const file = formData.get('file') as File | null;

    if (!name) {
      return NextResponse.json(
        { error: '证书名称为必填项' },
        { status: 400 }
      );
    }

    // 验证候选人存在
    const candidate = await prisma.candidate.findUnique({
      where: { id: params.id },
    });
    if (!candidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    let fileUrl: string | null = null;

    // 如果有文件，上传至 MinIO
    if (file) {
      const fileId = uuidv4();
      const ext = file.name.split('.').pop() || 'bin';
      const objectName = `certificates/${params.id}/${fileId}.${ext}`;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileUrl = await uploadFile(buffer, objectName, file.type);
    }

    const certificate = await prisma.certificate.create({
      data: {
        candidateId: params.id,
        name,
        description: description || null,
        fileUrl,
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error('创建证书错误:', error);
    return NextResponse.json(
      { error: '创建证书失败' },
      { status: 500 }
    );
  }
}

// 删除证书
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');

    if (!certificateId) {
      return NextResponse.json(
        { error: '缺少证书ID' },
        { status: 400 }
      );
    }

    await prisma.certificate.delete({
      where: { id: certificateId },
    });

    return NextResponse.json({ message: '证书已删除' });
  } catch (error) {
    console.error('删除证书错误:', error);
    return NextResponse.json(
      { error: '删除证书失败' },
      { status: 500 }
    );
  }
}
