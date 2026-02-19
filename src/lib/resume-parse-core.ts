// 简历解析核心逻辑 - 从 MinIO 下载文件 → 解析 → AI提取 → 创建候选人

import { PrismaClient, Prisma } from '@prisma/client';
import { minioClient, BUCKET_NAME } from '@/lib/minio';
import { parseResumeFile } from '@/lib/resume-parser';
import { extractResumeData, cleanResumeText, ResumeValidationError } from '@/lib/llm';

const prisma = new PrismaClient();

async function downloadFromMinio(objectName: string): Promise<Buffer> {
  const stream = await minioClient.getObject(BUCKET_NAME, objectName);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function parseResumeFromStorage(params: {
  fileId: string;
  objectName: string;
  contentType: string;
  originalName: string;
  fileUrl?: string;
  onProgress?: (progress: number, text: string) => void;
}): Promise<{ candidateId: string }> {
  const { fileId, objectName, contentType, originalName, fileUrl, onProgress } = params;
  const report = onProgress ?? (() => {});

  // 1. 下载文件
  report(10, '正在从存储下载文件...');
  const minioObjectName = objectName || `resumes/${fileId}.pdf`;
  const fileBuffer = await downloadFromMinio(minioObjectName);

  // 2. 解析文件内容
  report(25, '正在解析文件内容...');
  const fileType = contentType || 'application/pdf';
  const rawText = await parseResumeFile(fileBuffer, fileType);
  const cleanedContent = cleanResumeText(rawText);

  // 3. AI 提取结构化信息
  report(40, 'AI 正在分析简历，清理并提取结构化信息...');
  const resumeData = await extractResumeData(cleanedContent);

  // 4. 重复入库检查：姓名 + 文件名均匹配视为同一份简历
  if (resumeData.name && originalName) {
    const duplicate = await prisma.candidate.findFirst({
      where: { name: resumeData.name, resumeFileName: originalName },
      select: { id: true },
    });
    if (duplicate) {
      throw new ResumeValidationError(
        `候选人「${resumeData.name}」的简历（${originalName}）已入库，请勿重复上传`
      );
    }
  }

  // 5. 保存候选人记录
  report(80, '正在创建候选人档案...');
  const resumeFileUrl = fileUrl || minioObjectName;
  const candidateFields = {
    name: resumeData.name || '未知姓名',
    phone: resumeData.phone,
    education: resumeData.education,
    workExperience: resumeData.workExperience,
    currentPosition: resumeData.currentPosition,
    currentCompany: resumeData.currentCompany,
    resumeUrl: resumeFileUrl,
    resumeFileName: originalName || undefined,
    resumeContent: cleanedContent,
    initialScore: resumeData.initialScore,
    totalScore: resumeData.initialScore,
    aiEvaluation: resumeData.aiEvaluation,
  };

  // 有真实邮箱：upsert 以支持同一人重复上传时更新已有档案
  // 无邮箱：始终新建，用 fileId 生成唯一占位邮箱，避免不同候选人互相覆盖
  const hasRealEmail = !!resumeData.email;
  const candidate = hasRealEmail
    ? await prisma.candidate.upsert({
        where: { email: resumeData.email },
        update: candidateFields,
        create: { ...candidateFields, email: resumeData.email, status: 'NEW' },
      })
    : await prisma.candidate.create({
        data: { ...candidateFields, email: `noemail-${fileId}@noemail.local`, status: 'NEW' },
      });

  // 6. 创建标签
  if (resumeData.tags && resumeData.tags.length > 0) {
    report(90, `正在生成 ${resumeData.tags.length} 个人才标签...`);
    const tagIds: string[] = [];
    for (const t of resumeData.tags) {
      try {
        const tag = await prisma.tag.upsert({
          where: { name_category: { name: t.name, category: t.category } },
          update: {},
          create: { name: t.name, category: t.category },
        });
        tagIds.push(tag.id);
      } catch (err) {
        // 并发 upsert 竞态条件：另一个任务已先创建了同名标签，查询已有记录
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const existing = await prisma.tag.findUnique({
            where: { name_category: { name: t.name, category: t.category } },
          });
          if (existing) tagIds.push(existing.id);
        } else {
          throw err;
        }
      }
    }
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        tags: { set: tagIds.map((id) => ({ id })) },
      },
    });
  }

  // 7. 完成
  report(100, '解析完成！');
  return { candidateId: candidate.id };
}
