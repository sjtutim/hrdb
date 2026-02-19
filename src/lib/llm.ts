import { z } from 'zod';

/**
 * 清理简历文本，去除水印、页眉页脚、重复信息等噪音内容（规则清洗，非LLM）
 */
export function cleanResumeText(text: string): string {
  let cleaned = text;

  // 1. 去除跨行的 ID 碎片块（PDF 解析常见问题）
  cleaned = cleaned.replace(/ID\s*[：:]\s*\d+(?:\s+\d{4}[-/]\d{2}[-/]\d{2})?/gi, '');
  // 独立 "ID" 行（不带冒号，招聘平台水印常见格式）
  cleaned = cleaned.replace(/^\s*ID\s*$/gim, '');
  // "数字 YYYY-MM-DD" 格式（如 "2619 2023-06-16"，候选人ID+日期水印）
  cleaned = cleaned.replace(/^\s*\d{3,8}\s+\d{4}[-/]\d{2}[-/]\d{2}\s*$/gm, '');
  // "MM DD" 日期碎片（如 "06 16"，日期水印被拆散后的残留）
  cleaned = cleaned.replace(/^\s*\d{1,2}\s+\d{1,2}\s*$/gm, '');

  // 2. 去除常见的水印和页眉页脚
  const watermarkPatterns = [
    /简历编号[：:]\s*\S+/gi,
    /^[页]\d+[页]?/gm,
    /^\d+\s*[/\/]\s*\d+\s*$/gm,
  ];
  for (const pattern of watermarkPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 3. 去除招聘平台水印
  const platformKeywords = [
    '前程无忧', '智联招聘', 'BOSS直聘', '拉勾网', '猎聘',
    '51job', 'zhaopin', 'lagou',
  ];
  for (const keyword of platformKeywords) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  // 4. 按行处理：去除碎片行和短无意义行
  const lines = cleaned.split('\n');
  const filteredLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') { filteredLines.push(''); continue; }
    if (trimmed.length <= 3 && !/[\u4e00-\u9fa5a-zA-Z]/.test(trimmed)) continue;
    if (trimmed.length <= 2 && /^[\u4e00-\u9fa5]+$/.test(trimmed)) {
      const meaningfulShortWords = ['硕士', '博士', '本科', '专科', '男', '女', '至今'];
      if (!meaningfulShortWords.includes(trimmed)) continue;
    }
    // 孤立的4位年份行（如单独一行的 "2023"），极可能是水印碎片
    if (/^\d{4}$/.test(trimmed)) continue;
    filteredLines.push(line);
  }
  cleaned = filteredLines.join('\n');

  // 5. 自动检测高频重复内容并去重
  const lineCounts = new Map<string, number>();
  const contentLines = cleaned.split('\n');
  for (const line of contentLines) {
    const trimmed = line.trim();
    if (trimmed.length >= 4) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }
  const seenCounts = new Map<string, number>();
  const dedupedLines: string[] = [];
  for (const line of contentLines) {
    const trimmed = line.trim();
    const totalCount = lineCounts.get(trimmed) || 0;
    if (totalCount > 2 && trimmed.length >= 4) {
      const seen = (seenCounts.get(trimmed) || 0) + 1;
      seenCounts.set(trimmed, seen);
      if (seen <= 1) dedupedLines.push(line);
    } else {
      dedupedLines.push(line);
    }
  }
  cleaned = dedupedLines.join('\n');

  // 6. 清理空白
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

const TagSchema = z.object({
  name: z.string(),
  category: z.enum(['SKILL', 'INDUSTRY', 'EDUCATION', 'EXPERIENCE', 'PERSONALITY', 'OTHER']),
});

const ResumeExtractionSchema = z.object({
  isResume: z.boolean(),
  rejectReason: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  education: z.string().nullable(),
  workExperience: z.string().nullable(),
  currentPosition: z.string().nullable(),
  currentCompany: z.string().nullable(),
  initialScore: z.number().nullable(),
  aiEvaluation: z.string().nullable(),
  tags: z.array(TagSchema),
});

type RawExtraction = z.infer<typeof ResumeExtractionSchema>;

export interface ResumeExtraction {
  name: string;
  email: string;
  phone: string | null;
  education: string | null;
  workExperience: string | null;
  currentPosition: string | null;
  currentCompany: string | null;
  initialScore: number;
  aiEvaluation: string;
  tags: { name: string; category: 'SKILL' | 'INDUSTRY' | 'EDUCATION' | 'EXPERIENCE' | 'PERSONALITY' | 'OTHER' }[];
}

export class ResumeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeValidationError';
  }
}

const SYSTEM_PROMPT = `你是一个专业的HR简历解析助手。

提供给你的文本可能来自PDF/Word解析，包含重复内容和噪音碎片。需要清除的文字包括并不限于明显是水印提取的残留，文中无意义重复出现的“上海闵盛医疗科技有限公司”，”上海顿慧医疗科技发展有限公司“及其相关残片（如“上海闵”、“疗科技有限公司”、“上海闵盛医疗科技”等）。
孤立出现的日期（如“2023-06-16”）。你需要忽略这些噪音，准确提取信息。

**重要：输入文本中的重复内容处理规则**
- 同一公司名、学校名、职位描述等可能因PDF解析问题重复出现多次，你只需提取1次
- 忽略所有噪音：ID编号、孤立日期、招聘平台水印、页码、碎片文字
- education 和 workExperience 字段必须输出整洁、无重复、格式清晰的内容

**判断是否为有效简历：**
- 文本不是简历（合同、论文等）→ isResume = false
- 缺少姓名 → isResume = false
- 同时缺少教育背景、工作经验、当前职位 → isResume = false
- isResume = false 时，rejectReason 填原因，其他字段填 null，tags 填空数组

**提取要求（isResume = true 时）：**
1. 准确提取姓名、邮箱、手机号、教育背景、工作经验、当前职位和公司
2. initialScore（0-100）：完整性30% + 表达力30% + 质量40%
3. aiEvaluation：优势、不足、建议，200字以上
4. tags 至少10个标签：SKILL/INDUSTRY/EDUCATION/EXPERIENCE/PERSONALITY/OTHER，主要是SKILL为主，至少5个。

返回严格JSON格式（无markdown代码块标记）：
{
  "isResume": true,
  "rejectReason": null,
  "name": "姓名",
  "email": "邮箱，未找到填 unknown@email.com",
  "phone": "手机号，未找到填 null",
  "education": "整洁的教育背景，无重复",
  "workExperience": "整洁的工作经历，无重复",
  "currentPosition": "当前职位",
  "currentCompany": "当前公司",
  "initialScore": 85,
  "aiEvaluation": "AI综合评价",
  "tags": [{"name": "标签名", "category": "类别"}]
}

只返回JSON，不要有任何额外文字`;

const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 120000; // 2分钟

export async function extractResumeData(
  resumeText: string
): Promise<ResumeExtraction> {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.MODEL || 'gpt-4o-mini';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`LLM 重试第 ${attempt} 次...`);
        // 重试前等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }

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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `请分析以下文本内容：\n\n${resumeText}` },
          ],
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('LLM API 错误:', response.status, errorBody);
        lastError = new Error(`LLM API 调用失败: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content: string = data.choices?.[0]?.message?.content || '';

      if (!content) {
        lastError = new Error('LLM 返回内容为空');
        continue;
      }

      // 去除 <think> 标签和 markdown 代码块包裹
      const jsonStr = content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(jsonStr);
      const raw: RawExtraction = ResumeExtractionSchema.parse(parsed);

      // 校验：不是简历或关键信息缺失
      if (!raw.isResume) {
        throw new ResumeValidationError(
          raw.rejectReason || '该文档不是有效的简历，无法建档'
        );
      }

      if (!raw.name) {
        throw new ResumeValidationError('简历缺少候选人姓名，无法建档');
      }

      if (!raw.education && !raw.workExperience && !raw.currentPosition) {
        throw new ResumeValidationError(
          '简历缺少教育背景、工作经验和当前职位等关键信息，无法建档'
        );
      }

      return {
        name: raw.name,
        email: raw.email || 'unknown@example.com',
        phone: raw.phone,
        education: raw.education,
        workExperience: raw.workExperience,
        currentPosition: raw.currentPosition,
        currentCompany: raw.currentCompany,
        initialScore: raw.initialScore ?? 0,
        aiEvaluation: raw.aiEvaluation || '',
        tags: raw.tags.map((t) => ({ name: t.name!, category: t.category! })),
      };
    } catch (error) {
      // ResumeValidationError 不需要重试，直接抛出
      if (error instanceof ResumeValidationError) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`LLM 调用失败 (第${attempt + 1}次):`, lastError.message);
    }
  }

  throw lastError || new Error('LLM API 调用失败');
}
