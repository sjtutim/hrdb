import { z } from 'zod';

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

const SYSTEM_PROMPT = `你是一个专业的HR简历解析助手。你需要先判断提供的文本是否为简历，然后提取结构化信息。

请返回严格的JSON格式（不要包含任何markdown代码块标记）。

JSON结构如下：
{
  "isResume": true,
  "rejectReason": null,
  "name": "候选人姓名",
  "email": "邮箱地址，未找到则填 unknown@example.com",
  "phone": "手机号码，未找到则填 null",
  "education": "教育背景完整描述，未找到则填 null",
  "workExperience": "工作经验完整描述，未找到则填 null",
  "currentPosition": "当前职位，未找到则填 null",
  "currentCompany": "当前公司，未找到则填 null",
  "initialScore": 85,
  "aiEvaluation": "AI综合评价，包括候选人优势、不足和建议，200字以上",
  "tags": [
    {"name": "标签名", "category": "类别"}
  ]
}

关于 isResume 判断规则：
- 如果文本明显不是简历（如合同、论文、产品说明书、新闻、随机文字等），设置 isResume = false
- 如果文本是简历但缺少姓名，设置 isResume = false
- 如果文本是简历但同时缺少教育背景、工作经验、当前职位（三项全部缺失），设置 isResume = false
- 当 isResume = false 时，rejectReason 填写具体原因（如"该文档不是简历，而是一份产品说明书"或"简历缺少姓名、教育背景和工作经验等关键信息，无法建档"），其他字段可以填 null，tags 填空数组

当 isResume = true 时的要求：
1. 准确提取姓名、邮箱、手机号、教育背景、工作经验、当前职位和公司
2. initialScore 为简历评分（0-100），根据以下维度评估：
   - 完整性（30%）：是否包含完整的个人信息、教育经历、工作经历、技能列表等
   - 表达力（30%）：描述是否清晰、有条理，专业术语使用恰当，工作成果量化程度
   - 质量（40%）：学历背景、工作平台、职位层级、技能匹配度、职业发展轨迹等
3. aiEvaluation 要详细，包括优势、不足、建议
4. tags 至少提取10个精准标签，用于人力资源部门快速定位和筛选人才：
   - SKILL（技能）：具体技术栈、工具、编程语言、框架等，如"React"、"项目管理"、"数据分析"
   - INDUSTRY（行业）：候选人所在或熟悉的行业，如"互联网"、"金融"、"教育"
   - EDUCATION（教育）：学历层次、学校层次、专业方向，如"硕士"、"985院校"、"计算机科学"
   - EXPERIENCE（经验）：工作年限、职级层次，如"5-10年"、"高级"、"团队负责人"
   - PERSONALITY（性格特质）：从简历中推断的软技能和特质，如"团队合作"、"跨部门协作"
   - OTHER（其他）：其他有价值的标签，如"海外经历"、"创业经验"
   标签要具体、有区分度，避免过于宽泛。如果简历内容丰富，可以提取更多标签。
5. 只返回JSON，不要有任何额外文字或代码块标记`;

export async function extractResumeData(
  resumeText: string
): Promise<ResumeExtraction> {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.MODEL || 'gpt-4o-mini';

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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('LLM API 错误:', response.status, errorBody);
    throw new Error(`LLM API 调用失败: ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content || '';

  if (!content) {
    throw new Error('LLM 返回内容为空');
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
}
