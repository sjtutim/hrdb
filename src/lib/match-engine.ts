// 匹配引擎模块 - 简化版直接匹配
// 核心思路：将候选人和岗位的所有信息整合后，直接让 LLM 做匹配评分

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tag 类别权重
const TAG_CATEGORY_WEIGHTS: Record<string, number> = {
  SKILL: 10,
  EXPERIENCE: 8,
  INDUSTRY: 6,
  EDUCATION: 5,
  PERSONALITY: 3,
  OTHER: 2,
};

// ==================== Tag 匹配（作为基础分数） ====================

function normalizeTagName(name: string): string {
  return name.toLowerCase().trim();
}

// 相似技术组
const SIMILAR_TECH_GROUPS: string[][] = [
  ['react', 'vue', 'angular'],
  ['javascript', 'typescript'],
  ['java', 'kotlin'],
  ['python', 'ruby'],
  ['go', 'rust'],
  ['c#', '.net'],
  ['mysql', 'postgresql', 'sql server', 'oracle'],
  ['mongodb', 'redis'],
  ['aws', 'azure', 'gcp', '阿里云'],
  ['docker', 'kubernetes'],
  ['spring', 'spring boot', 'spring cloud'],
  ['django', 'flask', 'fastapi'],
  ['pytorch', 'tensorflow'],
  ['hadoop', 'spark', 'flink'],
  ['ios', 'android', 'flutter', 'react native'],
];

function findSimilarGroup(normalizedName: string): string[] | null {
  for (const group of SIMILAR_TECH_GROUPS) {
    if (group.includes(normalizedName)) return group;
  }
  return null;
}

export function calculateTagMatchScore(candidate: any, job: any): {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  extraSkills: string[];
  similarSkills: string[];
} {
  const candidateTags = candidate.tags || [];
  const jobTags = job.tags || [];

  const candidateMap = new Map(
    candidateTags.map((t: any) => [normalizeTagName(t.name), t])
  );

  const matchedSkills: string[] = [];
  const similarSkills: string[] = [];
  const missingSkills: string[] = [];
  const extraSkills: string[] = [];

  let weightedScore = 0;
  let totalWeight = 0;

  for (const tag of jobTags) {
    const normalized = normalizeTagName(tag.name);
    const weight = TAG_CATEGORY_WEIGHTS[tag.category] || 2;
    totalWeight += weight;

    if (candidateMap.has(normalized)) {
      matchedSkills.push(tag.name);
      weightedScore += weight;
    } else {
      // 检查相似技能
      const group = findSimilarGroup(normalized);
      const hasSimilar = group?.some(g => g !== normalized && candidateMap.has(g));
      if (hasSimilar) {
        similarSkills.push(tag.name);
        weightedScore += weight * 0.6;
      } else {
        missingSkills.push(tag.name);
      }
    }
  }

  // 候选人的额外标签
  for (const tag of candidateTags) {
    const normalized = normalizeTagName(tag.name);
    if (!jobTags.some((t: any) => normalizeTagName(t.name) === normalized)) {
      extraSkills.push(tag.name);
    }
  }

  const score = totalWeight > 0 ? Math.min(100, Math.round((weightedScore / totalWeight) * 100)) : 0;

  return { score, matchedSkills, missingSkills, extraSkills, similarSkills };
}

// ==================== LLM 调用 ====================

async function callLLM(systemPrompt: string, userPrompt: string, timeoutMs: number = 90000): Promise<any> {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.MODEL || 'gpt-4o-mini';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API 错误:', response.status, errorText);
      throw new Error(`LLM API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('LLM 返回内容为空');
    }

    // 清理返回内容
    const jsonStr = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    return JSON.parse(jsonStr);
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ==================== 构建候选人信息 ====================

function buildCandidateInfo(candidate: any): string {
  let info = `【候选人信息】

## 基本信息
- 姓名: ${candidate.name}
- 当前职位: ${candidate.currentPosition || '未填写'}
- 上一供职单位: ${candidate.currentCompany || '未填写'}
- 教育背景: ${candidate.education || '未填写'}
- 工作经验: ${candidate.workExperience || '未填写'}

`;

  // 技能标签（最重要）
  if (candidate.tags && candidate.tags.length > 0) {
    const skills = candidate.tags.filter((t: any) => t.category === 'SKILL').map((t: any) => t.name);
    const experiences = candidate.tags.filter((t: any) => t.category === 'EXPERIENCE').map((t: any) => t.name);
    const industries = candidate.tags.filter((t: any) => t.category === 'INDUSTRY').map((t: any) => t.name);
    const others = candidate.tags.filter((t: any) => !['SKILL', 'EXPERIENCE', 'INDUSTRY'].includes(t.category)).map((t: any) => t.name);

    if (skills.length > 0) info += `## 技能标签\n${skills.join(', ')}\n\n`;
    if (experiences.length > 0) info += `## 经验领域\n${experiences.join(', ')}\n\n`;
    if (industries.length > 0) info += `## 行业背景\n${industries.join(', ')}\n\n`;
    if (others.length > 0) info += `## 其他标签\n${others.join(', ')}\n\n`;
  }

  // 简历内容
  if (candidate.resumeContent) {
    info += `## 简历内容\n${candidate.resumeContent.slice(0, 3000)}\n\n`;
  }

  // AI 评价
  if (candidate.aiEvaluation) {
    info += `## AI简历评价\n${candidate.aiEvaluation.slice(0, 1000)}\n`;
  }

  return info;
}

// ==================== 构建岗位信息 ====================

function buildJobInfo(job: any): string {
  let info = `【岗位信息】

## 职位信息
- 职位名称: ${job.title}
- 部门: ${job.department || '未填写'}
- 职位描述: ${job.description || '未填写'}
- 职位要求: ${job.requirements || '未填写'}

`;

  // 岗位标签
  if (job.tags && job.tags.length > 0) {
    const skills = job.tags.filter((t: any) => t.category === 'SKILL').map((t: any) => t.name);
    const experiences = job.tags.filter((t: any) => t.category === 'EXPERIENCE').map((t: any) => t.name);
    const industries = job.tags.filter((t: any) => t.category === 'INDUSTRY').map((t: any) => t.name);
    const others = job.tags.filter((t: any) => !['SKILL', 'EXPERIENCE', 'INDUSTRY'].includes(t.category)).map((t: any) => t.name);

    if (skills.length > 0) info += `## 必备技能\n${skills.join(', ')}\n\n`;
    if (experiences.length > 0) info += `## 经验要求\n${experiences.join(', ')}\n\n`;
    if (industries.length > 0) info += `## 行业要求\n${industries.join(', ')}\n\n`;
    if (others.length > 0) info += `## 其他要求\n${others.join(', ')}\n`;
  }

  return info;
}

// ==================== 核心匹配 Prompt ====================

const MATCH_PROMPT = `你是一位专业的HR招聘顾问。你的任务是根据候选人的实际信息和岗位要求，评估候选人能否胜任该岗位。

## 重要原则

1. **关注核心能力**：候选人只需要具备岗位的核心技能和相关经验，就应该被认为能胜任
2. **评分要有区分度**：
   - 70-100分：候选人技能和经验与岗位高度匹配，能直接胜任
   - 50-69分：候选人具备大部分核心技能，经验基本匹配
   - 30-49分：候选人只有部分相关技能，经验不太匹配
   - 0-29分：候选人技能方向完全不同，完全无法胜任
3. **利用标签信息**：技能标签是候选人能力的重要体现，有标签说明候选人声称具备该技能
4. **不要轻易给低分**：即使简历描述简单，有技能标签说明候选人具备该能力

## 评分维度

请从以下5个维度评分（每个维度0-100分）：

1. **技能匹配度 (35%)**：候选人是否掌握岗位要求的核心技术
2. **经验相关性 (25%)**：候选人的工作内容与岗位需求是否相关
3. **项目复杂度 (20%)**：候选人过往项目的规模和复杂度
4. **教育背景 (10%)**：学历和专业是否满足要求
5. **职业发展 (10%)**：职业方向是否与岗位一致

## 输出格式

请返回严格的JSON格式（不要包含markdown代码块）：

{
  "skillsScore": 75,
  "experienceScore": 70,
  "projectScore": 65,
  "educationScore": 60,
  "careerScore": 70,
  "canDoJob": true,
  "summary": "一句话总结",
  "strengths": ["优势1", "优势优势2"],
  "weaknesses": ["不足1"],
  "reasoning": "你的评分理由"
}`;

// ==================== 主匹配函数 ====================

export async function generateAIEvaluation(
  candidate: any,
  job: any
): Promise<{ evaluation: string; llmScore: number }> {
  console.log(`[匹配] 开始匹配候选人: ${candidate.name}`);

  // 1. 计算 Tag 匹配分数（作为基准）
  const tagMatch = calculateTagMatchScore(candidate, job);
  console.log(`[匹配] Tag匹配分数: ${tagMatch.score}`);

  // 2. 构建完整的候选人和岗位信息
  const candidateInfo = buildCandidateInfo(candidate);
  const jobInfo = buildJobInfo(job);

  // 3. 调用 LLM 进行匹配
  let llmResult: any = null;
  let llmScore = tagMatch.score; // 默认使用 tag 分数

  try {
    const userPrompt = `请评估以下候选人与岗位的匹配程度：

${candidateInfo}

${jobInfo}

请根据以上信息，从5个维度分别评分。评分要有区分度，技能和经验匹配的候选人应该得70+的分数。`;

    llmResult = await callLLM(MATCH_PROMPT, userPrompt);

    // 计算 LLM 返回的加权分数
    if (llmResult) {
      const weightedScore =
        (llmResult.skillsScore || 0) * 0.35 +
        (llmResult.experienceScore || 0) * 0.25 +
        (llmResult.projectScore || 0) * 0.2 +
        (llmResult.educationScore || 0) * 0.1 +
        (llmResult.careerScore || 0) * 0.1;

      llmScore = Math.round(weightedScore);
      console.log(`[匹配] LLM加权分数: ${llmScore}`);
    }
  } catch (error) {
    console.error(`[匹配] LLM调用失败:`, error);
    // LLM 失败时使用 tag 分数
  }

  // 4. 如果 LLM 分数过低，使用 tag 分数作为兜底
  if (llmScore < 20 && tagMatch.score > 0) {
    console.log(`[匹配] LLM分数过低，使用Tag分数兜底`);
    llmScore = Math.max(llmScore, tagMatch.score);
  }

  // 5. 构建评估文本
  const evaluation = buildEvaluationText(llmResult, llmScore, tagMatch, candidate, job);

  return { evaluation, llmScore };
}

// ==================== 构建评估文本 ====================

function buildEvaluationText(
  llmResult: any,
  score: number,
  tagMatch: any,
  candidate: any,
  job: any
): string {
  const canDoJob = llmResult?.canDoJob ?? (score >= 50);

  let text = `【胜任力判断】${canDoJob ? '✓ 可以胜任' : '✗ 难以胜任'}\n\n`;

  // Tag 匹配情况
  text += `【技能标签匹配】(Tag匹配分: ${tagMatch.score})\n`;
  if (tagMatch.matchedSkills.length > 0) {
    text += `✓ 匹配技能: ${tagMatch.matchedSkills.join(', ')}\n`;
  }
  if (tagMatch.missingSkills.length > 0) {
    text += `✗ 缺失技能: ${tagMatch.missingSkills.join(', ')}\n`;
  }
  if (tagMatch.extraSkills.length > 0) {
    text += `★ 额外技能: ${tagMatch.extraSkills.join(', ')}\n`;
  }
  text += '\n';

  // LLM 评分
  text += `【AI综合评估】(总分: ${score})\n`;
  if (llmResult) {
    text += `• 技能匹配: ${llmResult.skillsScore ?? '-'}分\n`;
    text += `• 经验相关: ${llmResult.experienceScore ?? '-'}分\n`;
    text += `• 项目复杂度: ${llmResult.projectScore ?? '-'}分\n`;
    text += `• 教育背景: ${llmResult.educationScore ?? '-'}分\n`;
    text += `• 职业发展: ${llmResult.careerScore ?? '-'}分\n`;
  }
  text += '\n';

  // 总结
  if (llmResult?.summary) {
    text += `【综合判断】${llmResult.summary}\n`;
  }

  // 优势
  if (llmResult?.strengths?.length > 0) {
    text += `\n【优势】\n${llmResult.strengths.map((s: string) => `• ${s}`).join('\n')}\n`;
  }

  // 不足
  if (llmResult?.weaknesses?.length > 0) {
    text += `\n【不足】\n${llmResult.weaknesses.map((w: string) => `• ${w}`).join('\n')}\n`;
  }

  // 评分理由
  if (llmResult?.reasoning) {
    text += `\n【评分理由】\n${llmResult.reasoning}\n`;
  }

  return text;
}

// ==================== Fallback 评估 ====================

export function generateFallbackEvaluation(
  candidate: any,
  job: any,
  baseScore: number
): { evaluation: string; llmScore: number } {
  const tagMatch = calculateTagMatchScore(candidate, job);
  const score = Math.max(baseScore, tagMatch.score);

  let evaluation = `【匹配评估】候选人 ${candidate.name} 与岗位 ${job.title} 的匹配分析\n\n`;

  evaluation += `【Tag匹配分析】(匹配分: ${tagMatch.score})\n`;
  if (tagMatch.matchedSkills.length > 0) {
    evaluation += `✓ 匹配技能: ${tagMatch.matchedSkills.join(', ')}\n`;
  }
  if (tagMatch.missingSkills.length > 0) {
    evaluation += `✗ 缺失技能: ${tagMatch.missingSkills.join(', ')}\n`;
  }
  if (tagMatch.extraSkills.length > 0) {
    evaluation += `★ 额外技能: ${tagMatch.extraSkills.join(', ')}\n`;
  }

  if (score >= 70) {
    evaluation += `\n该候选人技能与岗位高度匹配，建议优先面试。`;
  } else if (score >= 50) {
    evaluation += `\n该候选人基本符合岗位要求，可以考虑面试。`;
  } else {
    evaluation += `\n该候选人技能与岗位匹配度较低。`;
  }

  return { evaluation, llmScore: score };
}

// ==================== 并发控制 ====================

export async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  concurrency: number = 3
): Promise<void> {
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      await fn(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
}

// ==================== 更新候选人总分 ====================

export async function updateCandidateTotalScore(candidateId: string): Promise<void> {
  try {
    const matches = await prisma.jobMatch.findMany({
      where: { candidateId },
      select: { matchScore: true },
    });

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { initialScore: true },
    });

    const initialScore = candidate?.initialScore || 70;
    const matchScores = matches.map(m => m.matchScore);
    const maxMatchScore = matchScores.length > 0 ? Math.max(...matchScores) : 0;

    // 总分 = 初始分 × 0.6 + 最高匹配分 × 0.4
    const totalScore = initialScore * 0.6 + maxMatchScore * 0.4;

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { totalScore },
    });
  } catch (error) {
    console.error('更新候选人总分错误:', error);
  }
}
