import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LLM 匹配评估系统提示词
const MATCH_SYSTEM_PROMPT = `你是一个专业的HR人才匹配顾问。你的任务是对候选人和职位进行深度分析，评估匹配度并给出专业的评估意见。

请返回严格的JSON格式（不要包含任何markdown代码块标记）。

JSON结构如下：
{
  "matchScore": 85,
  "summary": "一句话总结匹配结论",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "skillsMatch": {"matched": ["匹配技能1"], "missing": ["缺失技能1"]},
  "experienceMatch": "经验匹配分析",
  "educationMatch": "教育背景匹配分析",
  "overallAnalysis": "综合分析",
  "interviewSuggestion": "面试建议"
}

评估维度：
1. 技能匹配度（30%）：候选人技能与岗位要求的匹配程度
2. 经验相关性（25%）：工作经验与岗位职责的契合度
3. 教育背景（15%）：学历是否符合岗位要求
4. 发展潜力（20%）：候选人的成长空间和潜力
5. 文化契合（10%）：候选人与公司/团队的潜在契合度

请基于提供的简历内容和岗位要求，给出客观、全面的评估。`;

// 运行新的匹配
export async function POST(request: NextRequest) {
  try {
    const { jobPostingId } = await request.json();

    if (!jobPostingId) {
      return NextResponse.json(
        { error: '请指定目标职位' },
        { status: 400 }
      );
    }

    // 检查职位是否存在且为激活状态
    const targetJob = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
      include: { tags: true },
    });

    if (!targetJob) {
      return NextResponse.json(
        { error: '职位不存在' },
        { status: 404 }
      );
    }

    if (targetJob.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '只能对激活状态的职位进行匹配' },
        { status: 400 }
      );
    }

    // 1. 获取候选人（筛选中或新建状态）
    const candidates = await prisma.candidate.findMany({
      include: {
        tags: true,
      },
      where: {
        status: {
          in: ['NEW', 'SCREENING'],
        },
      },
    });

    // 2. 只针对目标职位进行匹配
    const jobPostings = [targetJob];

    // 3. 为每个候选人计算与目标职位的匹配分数
    const matchResults = [];

    for (const candidate of candidates) {
      let hasValidMatch = false; // 标记是否有有效的匹配

      for (const job of jobPostings) {
        // 先计算Tag匹配数量
        const tagMatchResult = calculateTagMatchScore(candidate, job);
        const matchedSkillCount = tagMatchResult.matchedSkills.length;

        // 技能Tag匹配>=4个才创建匹配记录，否则跳过
        if (matchedSkillCount < 4) {
          continue; // 跳过匹配不足4个的组合
        }

        hasValidMatch = true;

        // 技能Tag匹配4个以上，进行LLM匹配
        let initialScore = tagMatchResult.score;
        let aiResult;

        try {
          aiResult = await generateAIEvaluation(candidate, job, initialScore);
        } catch (err) {
          console.error(`为候选人 ${candidate.name} 生成LLM评估失败:`, err);
          aiResult = generateFallbackEvaluation(candidate, job, initialScore);
        }

        // 从AI结果中提取分数，如果没有则使用初步分数
        const matchScore = aiResult.llmScore || initialScore;

        // 创建或更新匹配记录
        const match = await prisma.jobMatch.upsert({
          where: {
            candidateId_jobPostingId: {
              candidateId: candidate.id,
              jobPostingId: job.id,
            },
          },
          update: {
            matchScore,
            aiEvaluation: aiResult.evaluation,
          },
          create: {
            candidateId: candidate.id,
            jobPostingId: job.id,
            matchScore,
            aiEvaluation: aiResult.evaluation,
          },
        });
        
        // 更新候选人的总分
        await updateCandidateTotalScore(candidate.id);
        
        // 添加到结果中
        matchResults.push(match);
      }
    }

    // 4. 获取目标职位的匹配结果
    const updatedMatches = await prisma.jobMatch.findMany({
      where: {
        jobPostingId,
      },
      include: {
        candidate: {
          include: {
            tags: true,
          },
        },
        jobPosting: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        matchScore: 'desc',
      },
    });

    return NextResponse.json(updatedMatches);
  } catch (error) {
    console.error('运行匹配错误:', error);
    return NextResponse.json(
      { error: '运行匹配失败' },
      { status: 500 }
    );
  }
}

// 计算Tag匹配分数和匹配数量
function calculateTagMatchScore(candidate: any, job: any): {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
} {
  const candidateTags = candidate.tags?.map((tag: any) => tag.name) || [];
  const jobTags = job.tags?.map((tag: any) => tag.name) || [];

  // 只计算技能相关的Tag（这里简化处理，所有Tag都视为技能Tag）
  const matchedSkills = candidateTags.filter((tag: string) => jobTags.includes(tag));
  const missingSkills = jobTags.filter((tag: string) => !candidateTags.includes(tag));

  // 计算匹配分数
  let score = 0;
  if (jobTags.length > 0) {
    // 匹配数量越多分数越高
    const matchRatio = matchedSkills.length / jobTags.length;
    score = Math.min(100, Math.round(matchRatio * 100));
  }

  return {
    score,
    matchedSkills,
    missingSkills,
  };
}

// 计算候选人和岗位的匹配分数
async function calculateMatchScore(candidate: any, job: any): Promise<number> {
  try {
    // 在实际实现中，这里应该调用AI API进行复杂的匹配计算
    // 以下是一个简化的匹配算法
    
    // 1. 标签匹配（最高50分）
    const candidateTags = candidate.tags.map((tag: any) => tag.name);
    const jobTags = job.tags.map((tag: any) => tag.name);
    
    let tagMatchCount = 0;
    for (const tag of candidateTags) {
      if (jobTags.includes(tag)) {
        tagMatchCount++;
      }
    }
    
    const tagMatchScore = jobTags.length > 0 
      ? Math.min(50, (tagMatchCount / jobTags.length) * 50)
      : 25; // 如果岗位没有标签，给予中等分数
    
    // 2. 工作经验匹配（最高30分）
    // 从文本中提取工作年限数字
    const jobRequiredExp = 4; // 这应该从岗位描述中提取
    const candidateExp = extractYearsFromText(candidate.workExperience);

    let expMatchScore = 0;
    if (candidateExp === null) {
      // 无法提取年限时，给予中等分数
      expMatchScore = candidate.workExperience ? 15 : 5;
    } else if (candidateExp >= jobRequiredExp - 1 && candidateExp <= jobRequiredExp + 2) {
      // 经验在要求范围内或略高
      expMatchScore = 30;
    } else if (candidateExp >= jobRequiredExp - 2 && candidateExp < jobRequiredExp - 1) {
      // 经验略低于要求
      expMatchScore = 20;
    } else if (candidateExp > jobRequiredExp + 2) {
      // 经验远高于要求
      expMatchScore = 15;
    } else {
      // 经验远低于要求
      expMatchScore = 5;
    }
    
    // 3. 教育背景匹配（最高20分）
    // 简化处理，实际应该分析教育程度
    const educationScore = candidate.education ? 15 : 5;
    
    // 总分（满分100分）
    const totalScore = tagMatchScore + expMatchScore + educationScore;
    
    // 添加一些随机性，使分数更自然
    const randomFactor = Math.random() * 10 - 5; // -5到5之间的随机数
    
    return Math.min(100, Math.max(0, totalScore + randomFactor));
  } catch (error) {
    console.error('计算匹配分数错误:', error);
    return 50; // 出错时返回中等分数
  }
}

// 生成AI评估内容 - 使用LLM
async function generateAIEvaluation(candidate: any, job: any, matchScore: number): Promise<{ evaluation: string; llmScore: number }> {
  try {
    // 准备简历内容
    const resumeContent = `
姓名: ${candidate.name}
邮箱: ${candidate.email}
手机: ${candidate.phone || '未提供'}
当前职位: ${candidate.currentPosition || '未提供'}
当前公司: ${candidate.currentCompany || '未提供'}
教育背景: ${candidate.education || '未提供'}
工作经验: ${candidate.workExperience || '未提供'}
技能标签: ${candidate.tags?.map((t: any) => t.name).join(', ') || '未提供'}
    `.trim();

    // 准备岗位内容
    const jobContent = `
职位名称: ${job.title}
部门: ${job.department}
岗位描述: ${job.description}
岗位要求: ${job.requirements}
岗位标签: ${job.tags?.map((t: any) => t.name).join(', ') || '未提供'}
    `.trim();

    // 调用LLM API
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.MODEL || 'gpt-4o-mini';

    console.log('LLM API配置:', { baseUrl, model, hasKey: !!apiKey });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: MATCH_SYSTEM_PROMPT },
        { role: 'user', content: `请分析以下候选人简历与岗位要求的匹配情况：\n\n【候选人简历】\n${resumeContent}\n\n【岗位要求】\n${jobContent}` },
      ],
      temperature: 0.3,
    };

    console.log('LLM请求:', { model, messagesLength: requestBody.messages.length });

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LLM API 错误响应:', errorText);
        throw new Error(`LLM API 调用失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content: string = data.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('LLM 返回内容为空');
      }

      // 解析LLM返回的JSON
      const jsonStr = content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

      const llmResult = JSON.parse(jsonStr);

      // 构建评估内容
      let evaluation = llmResult.summary || '';

    // 添加优势
    if (llmResult.strengths && llmResult.strengths.length > 0) {
      evaluation += `\n\n【优势】\n${llmResult.strengths.map((s: string) => `• ${s}`).join('\n')}`;
    }

    // 添加不足
    if (llmResult.weaknesses && llmResult.weaknesses.length > 0) {
      evaluation += `\n\n【不足】\n${llmResult.weaknesses.map((w: string) => `• ${w}`).join('\n')}`;
    }

    // 添加技能匹配分析
    if (llmResult.skillsMatch) {
      const { matched, missing } = llmResult.skillsMatch;
      if (matched && matched.length > 0) {
        evaluation += `\n\n【匹配的技能】\n${matched.map((s: string) => `✓ ${s}`).join('\n')}`;
      }
      if (missing && missing.length > 0) {
        evaluation += `\n\n【缺少的技能】\n${missing.map((s: string) => `✗ ${s}`).join('\n')}`;
      }
    }

    // 添加经验、教育匹配分析
    if (llmResult.experienceMatch) {
      evaluation += `\n\n【经验匹配】\n${llmResult.experienceMatch}`;
    }
    if (llmResult.educationMatch) {
      evaluation += `\n\n【教育背景】\n${llmResult.educationMatch}`;
    }

    // 添加综合分析
    if (llmResult.overallAnalysis) {
      evaluation += `\n\n【综合分析】\n${llmResult.overallAnalysis}`;
    }

    // 添加面试建议
    if (llmResult.interviewSuggestion) {
      evaluation += `\n\n【面试建议】\n${llmResult.interviewSuggestion}`;
    }

    return {
      evaluation,
      llmScore: llmResult.matchScore || matchScore,
    };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('LLM API 请求错误:', error);
      throw error;
    }
  } catch (error) {
    console.error('生成AI评估错误:', error);
    // 如果LLM调用失败，返回fallback内容
    const fallbackResult = generateFallbackEvaluation(candidate, job, matchScore);
    return {
      evaluation: fallbackResult.evaluation,
      llmScore: matchScore,
    };
  }
}

// Fallback评估（当LLM调用失败时）
function generateFallbackEvaluation(candidate: any, job: any, matchScore: number): { evaluation: string; llmScore: number } {
  const candidateTags = candidate.tags?.map((tag: any) => tag.name) || [];
  const jobTags = job.tags?.map((tag: any) => tag.name) || [];

  const matchedTags = candidateTags.filter((tag: string) => jobTags.includes(tag));
  const missingTags = jobTags.filter((tag: string) => !candidateTags.includes(tag));

  let evaluation = '';

  if (matchScore >= 80) {
    evaluation = `候选人${candidate.name}与${job.title}岗位高度匹配。`;
  } else if (matchScore >= 60) {
    evaluation = `候选人${candidate.name}与${job.title}岗位部分匹配。`;
  } else {
    evaluation = `候选人${candidate.name}与${job.title}岗位匹配度较低。`;
  }

  if (matchedTags.length > 0) {
    evaluation += `\n\n匹配的技能/标签: ${matchedTags.join(', ')}`;
  }

  if (missingTags.length > 0) {
    evaluation += `\n\n缺少的技能/标签: ${missingTags.join(', ')}`;
  }

  const expText = candidate.workExperience || '未提供';
  evaluation += `\n\n工作经验: ${expText}`;

  if (matchScore >= 80) {
    evaluation += `\n\n建议: 该候选人非常适合此岗位，建议尽快安排面试。`;
  } else if (matchScore >= 60) {
    evaluation += `\n\n建议: 该候选人基本符合岗位要求，可以考虑安排面试。`;
  } else {
    evaluation += `\n\n建议: 该候选人与此岗位匹配度较低。`;
  }

  return {
    evaluation,
    llmScore: matchScore,
  };
}

// 更新候选人的总分
async function updateCandidateTotalScore(candidateId: string): Promise<void> {
  try {
    // 获取候选人的所有匹配分数
    const matches = await prisma.jobMatch.findMany({
      where: {
        candidateId,
      },
      select: {
        matchScore: true,
      },
    });
    
    // 获取候选人的初始分数
    const candidate = await prisma.candidate.findUnique({
      where: {
        id: candidateId,
      },
      select: {
        initialScore: true,
      },
    });
    
    const initialScore = candidate?.initialScore || 70; // 默认初始分为70
    
    // 计算匹配分数的平均值
    const matchScores = matches.map(match => match.matchScore);
    const avgMatchScore = matchScores.length > 0
      ? matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length
      : 0;
    
    // 计算总分：初始分占60%，匹配分占40%
    const totalScore = initialScore * 0.6 + avgMatchScore * 0.4;
    
    // 更新候选人总分
    await prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        totalScore,
      },
    });
  } catch (error) {
    console.error('更新候选人总分错误:', error);
  }
}

// 从工作经验文本中提取年限数字
function extractYearsFromText(text: string | null): number | null {
  if (!text) return null;
  // 尝试匹配 "X年" 格式
  const yearMatch = text.match(/(\d+)\s*年/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  return null;
}
