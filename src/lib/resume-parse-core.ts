// 简历解析核心逻辑 - 从 MinIO 下载文件 → 解析 → AI提取 → 创建候选人

import { PrismaClient } from '@prisma/client';
import { minioClient, BUCKET_NAME } from '@/lib/minio';
import { parseResumeFile } from '@/lib/resume-parser';
import { extractResumeData, cleanResumeText } from '@/lib/llm';

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

  // 4. 保存候选人记录
  report(80, '正在创建候选人档案...');
  const resumeFileUrl = fileUrl || minioObjectName;
  const candidate = await prisma.candidate.upsert({
    where: { email: resumeData.email },
    update: {
      name: resumeData.name,
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
    },
    create: {
      name: resumeData.name || '未知姓名',
      email: resumeData.email || 'unknown@example.com',
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
      status: 'NEW',
    },
  });

  // 5. 创建标签
  if (resumeData.tags && resumeData.tags.length > 0) {
    report(90, `正在生成 ${resumeData.tags.length} 个人才标签...`);
    const tagIds: string[] = [];
    for (const t of resumeData.tags) {
      const tag = await prisma.tag.upsert({
        where: { name_category: { name: t.name, category: t.category } },
        update: {},
        create: { name: t.name, category: t.category },
      });
      tagIds.push(tag.id);
    }
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        tags: { set: tagIds.map((id) => ({ id })) },
      },
    });
  }

  // 6. 完成
  report(100, '解析完成！');
  return { candidateId: candidate.id };
}
