import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有候选人
export async function GET(request: NextRequest) {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        tags: true,
        certificates: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('获取候选人列表错误:', error);
    return NextResponse.json(
      { error: '获取候选人列表失败' },
      { status: 500 }
    );
  }
}

// 创建候选人
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, education, workExperience, currentPosition, currentCompany, status, tagIds, aiEvaluation } = body;

    // 验证必填字段
    if (!name || !email) {
      return NextResponse.json(
        { error: '姓名和邮箱为必填项' },
        { status: 400 }
      );
    }

    // 检查邮箱唯一性
    const existing = await prisma.candidate.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已存在' },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone: phone || null,
        education: education || null,
        workExperience: workExperience || null,
        currentPosition: currentPosition || null,
        currentCompany: currentCompany || null,
        aiEvaluation: aiEvaluation || null,
        status: status || 'NEW',
        ...(tagIds && tagIds.length > 0 ? {
          tags: {
            connect: tagIds.map((id: string) => ({ id })),
          },
        } : {}),
      },
      include: {
        tags: true,
        certificates: true,
      },
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error('创建候选人错误:', error);
    return NextResponse.json(
      { error: '创建候选人失败' },
      { status: 500 }
    );
  }
}
