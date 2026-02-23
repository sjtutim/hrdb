import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { deleteFile, BUCKET_NAME } from '@/lib/minio';

const prisma = new PrismaClient();

// 获取单个候选人详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;

    const candidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
      include: {
        tags: true,
        certificates: true,
        employeeRecord: {
          select: {
            id: true,
            employeeId: true,
            department: true,
            position: true,
            status: true,
            performanceReviews: {
              orderBy: { date: 'desc' },
            },
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        interviews: {
          include: {
            interviews: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            scores: true,
          },
          orderBy: {
            scheduledAt: 'desc',
          },
        },
        evaluations: {
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        jobMatches: {
          include: {
            jobPosting: {
              select: {
                id: true,
                title: true,
                department: true,
                status: true,
              },
            },
          },
          orderBy: {
            matchScore: 'desc',
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('获取候选人详情错误:', error);
    return NextResponse.json(
      { error: '获取候选人详情失败' },
      { status: 500 }
    );
  }
}

// 更新候选人信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const data = await request.json();

    // 检查候选人是否存在
    const existingCandidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
      include: { employeeRecord: true },
    });

    if (!existingCandidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    const updatedCandidate = await prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        name: data.name || existingCandidate.name,
        email: data.email || existingCandidate.email,
        phone: data.phone !== undefined ? data.phone : existingCandidate.phone,
        education: data.education !== undefined ? data.education : existingCandidate.education,
        workExperience: data.workExperience !== undefined ? data.workExperience : existingCandidate.workExperience,
        currentPosition: data.currentPosition !== undefined ? data.currentPosition : existingCandidate.currentPosition,
        currentCompany: data.currentCompany !== undefined ? data.currentCompany : existingCandidate.currentCompany,
        department: data.department !== undefined ? data.department : existingCandidate.department,
        resumeUrl: data.resumeUrl !== undefined ? data.resumeUrl : existingCandidate.resumeUrl,
        resumeFileName: data.resumeFileName !== undefined ? data.resumeFileName : (existingCandidate as any).resumeFileName,
        resumeContent: data.resumeContent !== undefined ? data.resumeContent : existingCandidate.resumeContent,
        initialScore: data.initialScore !== undefined ? data.initialScore : existingCandidate.initialScore,
        totalScore: data.totalScore !== undefined ? data.totalScore : existingCandidate.totalScore,
        aiEvaluation: data.aiEvaluation !== undefined ? data.aiEvaluation : existingCandidate.aiEvaluation,
        status: data.status || existingCandidate.status,
        recruiterId: data.recruiterId !== undefined ? data.recruiterId : existingCandidate.recruiterId,
      },
      include: {
        tags: true,
        certificates: true,
      },
    });

    // 如果候选人已有员工记录且部门有变更，同步更新 Employee.department
    if (data.department !== undefined && existingCandidate.employeeRecord) {
      await prisma.employee.update({
        where: { id: existingCandidate.employeeRecord.id },
        data: { department: data.department || existingCandidate.employeeRecord.department },
      });
    }

    // 更新标签
    if (data.tagIds && Array.isArray(data.tagIds)) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          tags: {
            set: data.tagIds.map((id: string) => ({ id })),
          },
        },
      });
    }

    return NextResponse.json(updatedCandidate);
  } catch (error) {
    console.error('更新候选人错误:', error);
    return NextResponse.json(
      { error: '更新候选人失败' },
      { status: 500 }
    );
  }
}

// 删除候选人
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;

    // 检查候选人是否存在
    const candidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
      include: {
        certificates: true,
        employeeRecord: {
          include: {
            performanceReviews: true,
          }
        }
      }
    });

    if (!candidate) {
      return NextResponse.json(
        { error: '候选人不存在' },
        { status: 404 }
      );
    }

    // 收集所有关联的 MinIO 文件信息以便删除
    const filesToDelete: string[] = [];

    // 1. 收集简历文件
    if (candidate.resumeUrl) {
      filesToDelete.push(candidate.resumeUrl);
    }

    // 2. 收集证书文件
    if (candidate.certificates) {
      for (const cert of candidate.certificates) {
        if (cert.fileUrl) filesToDelete.push(cert.fileUrl);
      }
    }

    // 3. 收集业绩考核附件（如果存在）
    if (candidate.employeeRecord?.performanceReviews) {
      for (const review of candidate.employeeRecord.performanceReviews) {
        if (review.attachmentUrl) filesToDelete.push(review.attachmentUrl);
      }
    }

    // 执行 MinIO 文件删除
    for (const fileUrl of filesToDelete) {
      try {
        let objectName = fileUrl;
        const bucketMarker = `/${BUCKET_NAME}/`;
        if (fileUrl.includes(bucketMarker)) {
          const splitParts = fileUrl.split(bucketMarker);
          if (splitParts.length > 1) {
            objectName = splitParts.slice(1).join(bucketMarker);
          }
        }
        await deleteFile(objectName);
      } catch (err) {
        console.error('删除 MinIO 文件失败:', fileUrl, err);
      }
    }

    // 在事务中按依赖顺序删除关联数据，再删除候选人
    await prisma.$transaction([
      // InterviewScore 通过 Interview 的 onDelete:Cascade 自动级联，无需单独处理
      prisma.interview.deleteMany({ where: { candidateId } }),
      prisma.jobMatch.deleteMany({ where: { candidateId } }),
      prisma.evaluation.deleteMany({ where: { candidateId } }),
      prisma.employee.deleteMany({ where: { candidateId } }),
      prisma.candidate.delete({ where: { id: candidateId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除候选人错误:', error);
    return NextResponse.json(
      { error: '删除候选人失败' },
      { status: 500 }
    );
  }
}

// 部分更新候选人（如HR评估分、入职状态）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = params.id;
    const data = await request.json();

    // 检查候选人是否存在（含 employee 记录，入职状态变更时需要）
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { employeeRecord: true },
    });

    if (!existingCandidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }

    // 入职状态变更（试用期/正式入职）：同步 Employee 记录
    if (data.status === 'PROBATION' || data.status === 'EMPLOYED') {
      const department = data.department?.trim();
      if (!department) {
        return NextResponse.json({ error: '试用期或正式入职需要指定部门' }, { status: 400 });
      }

      const employeeStatus = data.status === 'EMPLOYED' ? 'REGULAR' : 'PROBATION';
      const position = data.position?.trim() || existingCandidate.currentPosition || '待定';

      const updatedCandidate = await prisma.$transaction(async (tx) => {
        if (existingCandidate.employeeRecord) {
          // 已有员工记录，更新部门和状态
          await tx.employee.update({
            where: { id: existingCandidate.employeeRecord.id },
            data: {
              department,
              status: employeeStatus,
              ...(data.position?.trim() ? { position: data.position.trim() } : {}),
            },
          });
        } else {
          // 新建员工记录
          const hireDate = new Date();
          const probationEndDate = new Date();
          probationEndDate.setDate(probationEndDate.getDate() + 180);
          await tx.employee.create({
            data: {
              candidateId,
              employeeId: `EMP-${Date.now()}`,
              department,
              position,
              hireDate,
              probationEndDate,
              status: employeeStatus,
              currentScore: existingCandidate.totalScore ?? 0,
            },
          });
        }

        // 进入试用期时记录时间（用于仪表盘招聘周期统计）
        const candidateUpdateData: Record<string, any> = { status: data.status };
        if (data.status === 'PROBATION' && !existingCandidate.probationAt) {
          candidateUpdateData.probationAt = new Date();
        }

        return tx.candidate.update({
          where: { id: candidateId },
          data: candidateUpdateData,
          include: { tags: true, certificates: true },
        });
      });

      return NextResponse.json(updatedCandidate);
    }

    // 常规字段更新
    const allowedFields = ['totalScore', 'aiEvaluation', 'status', 'recruiterId'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
      include: {
        tags: true,
        certificates: true,
      },
    });

    return NextResponse.json(updatedCandidate);
  } catch (error) {
    console.error('更新候选人错误:', error);
    return NextResponse.json({ error: '更新候选人失败' }, { status: 500 });
  }
}
