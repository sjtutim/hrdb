import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { convertRawTextToMarkdown } from '@/lib/resume-parser';
import { extractResumeData, ResumeValidationError } from '@/lib/llm';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const { resumeText } = await request.json();

  if (!resumeText || resumeText.trim() === '') {
    return new Response(
      JSON.stringify({ error: '简历文本不能为空' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 1. 文本预处理
        send('progress', { progress: 10, text: '正在预处理文本内容...' });
        const markdown = convertRawTextToMarkdown(resumeText);

        // 2. AI 分析（最耗时）
        send('progress', { progress: 20, text: 'AI 正在分析简历，提取结构化信息...' });
        const resumeData = await extractResumeData(markdown);

        // 3. 保存候选人记录
        send('progress', { progress: 80, text: '正在创建候选人档案...' });
        const candidate = await prisma.candidate.upsert({
          where: { email: resumeData.email },
          update: {
            name: resumeData.name,
            phone: resumeData.phone,
            education: resumeData.education,
            workExperience: resumeData.workExperience,
            currentPosition: resumeData.currentPosition,
            currentCompany: resumeData.currentCompany,
            resumeContent: markdown,
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
            resumeContent: markdown,
            initialScore: resumeData.initialScore,
            totalScore: resumeData.initialScore,
            aiEvaluation: resumeData.aiEvaluation,
            status: 'NEW',
          },
        });

        // 4. 创建标签
        if (resumeData.tags && resumeData.tags.length > 0) {
          send('progress', { progress: 90, text: `正在生成 ${resumeData.tags.length} 个人才标签...` });
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

        // 5. 完成
        send('progress', { progress: 100, text: '解析完成！' });
        send('done', { candidateId: candidate.id });
      } catch (error) {
        console.error('简历解析错误:', error);
        if (error instanceof ResumeValidationError) {
          send('error', { error: error.message });
        } else {
          send('error', { error: '简历解析失败，请稍后重试' });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
