import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/minio';

const prisma = new PrismaClient();

// 允许的附件类型
const ALLOWED_ATTACHMENT_TYPES: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/pdf': '.pdf',
};

const EXT_TO_MIME: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

// 解析员工ID：支持真实ID和虚拟ID（virtual-candidateId）
async function resolveEmployee(id: string) {
  if (id.startsWith('virtual-')) {
    const candidateId = id.replace('virtual-', '');
    // 虚拟员工：通过 candidateId 查找是否已有 Employee 记录
    const employee = await prisma.employee.findUnique({
      where: { candidateId },
    });
    // 返回真实 employee 或 null（候选人存在但无 Employee 记录）
    if (employee) return employee;
    // 验证候选人存在
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    return candidate ? { virtual: true, candidateId } : null;
  }
  return prisma.employee.findUnique({ where: { id } });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await resolveEmployee(params.id);

    if (!result) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    // 虚拟员工没有考核记录
    if ('virtual' in result) {
      return NextResponse.json([]);
    }

    const reviews = await prisma.performanceReview.findMany({
      where: { employeeId: result.id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('获取考核记录失败:', error);
    return NextResponse.json({ error: '获取考核记录失败' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await resolveEmployee(params.id);

    if (!result) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    const formData = await request.formData();
    const date = formData.get('date') as string;
    const type = formData.get('type') as string;
    const score = formData.get('score') as string;
    const level = formData.get('level') as string;
    const summary = formData.get('summary') as string;
    const strengths = formData.get('strengths') as string;
    const improvements = formData.get('improvements') as string;
    const reviewer = formData.get('reviewer') as string;
    const file = formData.get('file') as File | null;

    if (!date || !type || !score || !summary || !reviewer) {
      return NextResponse.json(
        { error: '缺少必填字段：考核日期、类型、评分、总结、考核人' },
        { status: 400 }
      );
    }

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return NextResponse.json(
        { error: '评分必须在 0-100 之间' },
        { status: 400 }
      );
    }

    let employeeId: string;

    if ('virtual' in result) {
      // 虚拟员工：先自动创建 Employee 记录
      const candidate = await prisma.candidate.findUnique({
        where: { id: result.candidateId },
      });
      const newEmployee = await prisma.employee.create({
        data: {
          candidateId: result.candidateId,
          employeeId: `EMP-${Date.now()}`,
          department: '-',
          position: candidate?.currentPosition || '-',
          hireDate: new Date(),
          probationEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'PROBATION',
          currentScore: candidate?.totalScore ?? 0,
        },
      });
      employeeId = newEmployee.id;
    } else {
      employeeId = result.id;
    }

    // 处理附件上传
    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;

    if (file && file.size > 0) {
      const fileExt = file.name?.split('.').pop()?.toLowerCase();
      const resolvedType = file.type || (fileExt && EXT_TO_MIME[fileExt]) || '';
      const ext = ALLOWED_ATTACHMENT_TYPES[resolvedType] || (fileExt && '.' + fileExt);

      if (!ext || !['.xlsx', '.docx', '.pdf'].includes(ext)) {
        return NextResponse.json(
          { error: '只支持 PDF、DOCX、XLSX 格式的文件' },
          { status: 400 }
        );
      }

      try {
        const fileId = uuidv4();
        const originalName = file.name || `attachment${ext}`;
        const objectName = `hrdb/performance/${fileId}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        attachmentUrl = await uploadFile(buffer, objectName, resolvedType || 'application/octet-stream');
        attachmentName = originalName;
      } catch (uploadError) {
        console.error('附件上传失败:', uploadError);
        return NextResponse.json(
          { error: '附件上传失败' },
          { status: 500 }
        );
      }
    }

    const review = await prisma.performanceReview.create({
      data: {
        employeeId,
        date: new Date(date),
        type,
        score: scoreNum,
        level: level || null,
        summary,
        strengths: strengths || null,
        improvements: improvements || null,
        reviewer,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
      },
    });

    // 自动更新员工的当前评分为最新考核分数
    await prisma.employee.update({
      where: { id: employeeId },
      data: { currentScore: scoreNum },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('创建考核记录失败:', error);
    return NextResponse.json({ error: '创建考核记录失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await resolveEmployee(params.id);

    if (!result) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    if ('virtual' in result) {
      return NextResponse.json({ error: '虚拟员工无考核记录可修改' }, { status: 400 });
    }

    const body = await request.json();
    const { reviewId, date, type, score, level, summary, strengths, improvements, reviewer } = body;

    if (!reviewId) {
      return NextResponse.json({ error: '缺少考核记录ID' }, { status: 400 });
    }

    if (!date || !type || score === undefined || !summary || !reviewer) {
      return NextResponse.json(
        { error: '缺少必填字段：考核日期、类型、评分、总结、考核人' },
        { status: 400 }
      );
    }

    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: '评分必须在 0-100 之间' },
        { status: 400 }
      );
    }

    // 验证考核记录属于该员工
    const existing = await prisma.performanceReview.findUnique({
      where: { id: reviewId },
    });

    if (!existing || existing.employeeId !== result.id) {
      return NextResponse.json({ error: '考核记录不存在' }, { status: 404 });
    }

    const updated = await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        date: new Date(date),
        type,
        score: parseFloat(score),
        level: level || null,
        summary,
        strengths: strengths || null,
        improvements: improvements || null,
        reviewer,
      },
    });

    // 查最新考核记录来更新员工当前评分
    const latestReview = await prisma.performanceReview.findFirst({
      where: { employeeId: result.id },
      orderBy: { date: 'desc' },
    });
    if (latestReview) {
      await prisma.employee.update({
        where: { id: result.id },
        data: { currentScore: latestReview.score },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('更新考核记录失败:', error);
    return NextResponse.json({ error: '更新考核记录失败' }, { status: 500 });
  }
}
