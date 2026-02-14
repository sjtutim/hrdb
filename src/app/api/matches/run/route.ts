import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// 运行新的匹配
export async function POST(request: NextRequest) {
  try {
    // 1. 获取所有候选人
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

    // 2. 获取所有激活状态的岗位
    const jobPostings = await prisma.jobPosting.findMany({
      include: {
        tags: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });

    // 3. 为每个候选人和岗位组合计算匹配分数
    const matchResults = [];

    for (const candidate of candidates) {
      for (const job of jobPostings) {
        // 计算匹配分数
        const matchScore = await calculateMatchScore(candidate, job);
        
        // 生成AI评估内容
        const aiEvaluation = await generateAIEvaluation(candidate, job, matchScore);
        
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
            aiEvaluation,
          },
          create: {
            candidateId: candidate.id,
            jobPostingId: job.id,
            matchScore,
            aiEvaluation,
          },
        });
        
        // 更新候选人的总分
        await updateCandidateTotalScore(candidate.id);
        
        // 添加到结果中
        matchResults.push(match);
      }
    }

    // 4. 获取所有匹配结果（包括关联数据）
    const updatedMatches = await prisma.jobMatch.findMany({
      include: {
        candidate: {
          include: {
            tags: true,
          },
        },
        jobPosting: true,
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

// 生成AI评估内容
async function generateAIEvaluation(candidate: any, job: any, matchScore: number): Promise<string> {
  try {
    // 在实际实现中，这里应该调用AI API生成评估内容
    // 以下是模拟的评估内容
    
    let evaluation = '';
    
    if (matchScore >= 80) {
      evaluation = `候选人${candidate.name}与${job.title}岗位高度匹配。`;
    } else if (matchScore >= 60) {
      evaluation = `候选人${candidate.name}与${job.title}岗位部分匹配。`;
    } else {
      evaluation = `候选人${candidate.name}与${job.title}岗位匹配度较低。`;
    }
    
    // 添加标签匹配分析
    const candidateTags = candidate.tags.map((tag: any) => tag.name);
    const jobTags = job.tags.map((tag: any) => tag.name);
    
    const matchedTags = candidateTags.filter(tag => jobTags.includes(tag));
    const missingTags = jobTags.filter(tag => !candidateTags.includes(tag));
    
    if (matchedTags.length > 0) {
      evaluation += `\n\n匹配的技能/标签: ${matchedTags.join(', ')}`;
    }
    
    if (missingTags.length > 0) {
      evaluation += `\n\n缺少的技能/标签: ${missingTags.join(', ')}`;
    }
    
    // 添加工作经验分析
    const expText = candidate.workExperience || '未提供';
    evaluation += `\n\n工作经验: ${expText}`;
    
    // 添加总结和建议
    if (matchScore >= 80) {
      evaluation += `\n\n建议: 该候选人非常适合此岗位，建议尽快安排面试。`;
    } else if (matchScore >= 60) {
      evaluation += `\n\n建议: 该候选人基本符合岗位要求，可以考虑安排面试，但需要进一步评估缺少的技能。`;
    } else {
      evaluation += `\n\n建议: 该候选人与此岗位匹配度较低，建议考虑其他更合适的岗位。`;
    }
    
    return evaluation;
  } catch (error) {
    console.error('生成AI评估错误:', error);
    return '无法生成评估内容';
  }
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
