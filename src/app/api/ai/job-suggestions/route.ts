import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 60000;

export async function POST(request: NextRequest) {
  try {
    const { title, department, selectedTags = [] } = await request.json();

    if (!title || !department) {
      return NextResponse.json(
        { error: '职位名称和部门不能为空' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.MODEL || 'gpt-4o-mini';

    const tagsText = selectedTags.length > 0
      ? `\n相关标签：${(selectedTags as string[]).join('、')}`
      : '';

    const prompt = `请为以下职位生成专业的岗位描述和岗位要求：

职位名称：${title}
所属部门：${department}${tagsText}

要求：
1. 岗位描述（description）：200-400字，包含工作职责、团队介绍、发展方向，条目清晰
2. 岗位要求（requirements）：200-400字，包含学历、经验、技能要求及加分项，条目清晰
3. 内容要专业、具体，贴合岗位实际
4. 如果提供了标签，需要在内容中体现相关技能或经验要求

只返回如下 JSON 格式，不要有任何额外文字：
{
  "description": "岗位描述内容",
  "requirements": "岗位要求内容"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的HR招聘顾问，擅长撰写专业、吸引人的岗位描述和要求。只返回JSON格式的结果。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('LLM API 错误:', response.status, await response.text());
      return NextResponse.json({ error: 'AI 服务暂时不可用，请稍后重试' }, { status: 502 });
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return NextResponse.json({ error: 'AI 返回内容为空' }, { status: 502 });
    }

    // 去除 <think> 标签，然后提取 JSON（优先从 ```json...``` 代码块中提取）
    const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = stripped.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : stripped.trim();

    const parsed = JSON.parse(jsonStr);

    if (!parsed.description || !parsed.requirements) {
      return NextResponse.json({ error: 'AI 返回格式异常' }, { status: 502 });
    }

    return NextResponse.json({
      description: parsed.description,
      requirements: parsed.requirements,
    });
  } catch (error) {
    console.error('生成职位描述错误:', error);
    return NextResponse.json(
      { error: '生成职位描述失败，请稍后重试' },
      { status: 500 }
    );
  }
}
