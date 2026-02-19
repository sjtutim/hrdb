import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FETCH_TIMEOUT_MS = 60000;

/** DELETE /api/ai/gen-tasks/[id] — 删除任务 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await prisma.aiGenTask.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  if (task.status === 'RUNNING') {
    return NextResponse.json({ error: '任务正在执行中，无法删除' }, { status: 409 });
  }
  await prisma.aiGenTask.delete({ where: { id: params.id } });
  return NextResponse.json({ message: '已删除' });
}

/** POST /api/ai/gen-tasks/[id] — 重试失败任务（SSE 流式返回） */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await prisma.aiGenTask.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  if (task.status === 'RUNNING') {
    return NextResponse.json({ error: '任务正在执行中' }, { status: 409 });
  }
  if (task.status === 'COMPLETED') {
    return NextResponse.json({ error: '任务已完成，无需重试' }, { status: 409 });
  }

  await prisma.aiGenTask.update({
    where: { id: task.id },
    data: { status: 'RUNNING', error: null },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };

      try {
        send('progress', { text: '正在重新生成...' });

        const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const apiKey = process.env.OPENAI_API_KEY;
        const model = process.env.MODEL || 'gpt-4o-mini';

        const tagsText = task.tags.length > 0 ? `\n相关标签：${task.tags.join('、')}` : '';
        const prompt = `请为以下职位生成专业的岗位描述和岗位要求：

职位名称：${task.title}
所属部门：${task.department}${tagsText}

只返回如下 JSON 格式，不要有任何额外文字：
{
  "description": "岗位描述内容（200-400字，工作职责、团队介绍、发展方向）",
  "requirements": "岗位要求内容（200-400字，学历/经验/技能要求及加分项）"
}`;

        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: '你是一个专业的HR招聘顾问。只返回JSON格式的结果。' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeout);
        if (!response.ok) throw new Error(`AI 服务返回错误: ${response.status}`);

        const data = await response.json();
        const content: string = data.choices?.[0]?.message?.content || '';
        if (!content) throw new Error('AI 返回内容为空');

        const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
        const codeBlockMatch = stripped.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : stripped.trim();
        const parsed = JSON.parse(jsonStr);

        if (!parsed.description || !parsed.requirements) {
          throw new Error('AI 返回格式异常');
        }

        await prisma.aiGenTask.update({
          where: { id: task.id },
          data: { status: 'COMPLETED', description: parsed.description, requirements: parsed.requirements },
        });

        send('done', { taskId: task.id, description: parsed.description, requirements: parsed.requirements });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : '生成失败';
        await prisma.aiGenTask.update({
          where: { id: task.id },
          data: { status: 'FAILED', error: errMsg },
        }).catch(() => {});
        send('error', { error: errMsg, taskId: task.id });
      } finally {
        if (!closed) { closed = true; controller.close(); }
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
