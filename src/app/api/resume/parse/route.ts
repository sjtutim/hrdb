import { NextRequest } from 'next/server';
import { parseResumeFromStorage } from '@/lib/resume-parse-core';
import { ResumeValidationError } from '@/lib/llm';

export async function POST(request: NextRequest) {
  const { fileId, fileUrl, objectName, contentType, originalName } = await request.json();

  if (!fileId) {
    return new Response(
      JSON.stringify({ error: '缺少文件ID' }),
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
        const result = await parseResumeFromStorage({
          fileId,
          objectName,
          contentType,
          originalName,
          fileUrl,
          onProgress: (progress, text) => send('progress', { progress, text }),
        });

        send('done', { candidateId: result.candidateId });
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
