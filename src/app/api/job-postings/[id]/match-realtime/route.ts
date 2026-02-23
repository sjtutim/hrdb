import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  calculateTagMatchScore,
  generateAIEvaluation,
  generateFallbackEvaluation,
  runWithConcurrency,
} from '@/lib/match-engine';

// Tag匹配仅用于前端展示（匹配/缺失/相似标签），不参与评分

const prisma = new PrismaClient();

// 实时匹配 - 根据职位实时计算候选人或员工的匹配度（使用 LLM，带并发控制）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    const body = await request.json();
    const source: 'candidate' | 'employee' = body.source || 'candidate';

    // 获取职位信息（含标签）
    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { tags: true },
    });

    if (!jobPosting) {
      return NextResponse.json({ error: '职位不存在' }, { status: 404 });
    }

    if (source === 'employee') {
      // 从顿慧人才库（员工）匹配
      const employees = await prisma.employee.findMany({
        include: {
          candidate: {
            include: { tags: true, certificates: true },
          },
        },
      });

      const results: any[] = [];

      await runWithConcurrency(employees, async (emp) => {
        const tagMatchResult = calculateTagMatchScore(emp.candidate, jobPosting);
        let aiResult;

        try {
          aiResult = await generateAIEvaluation(emp.candidate, jobPosting);
        } catch (err) {
          console.error(`员工 ${emp.candidate.name} LLM评估失败:`, err);
          aiResult = generateFallbackEvaluation(emp.candidate, jobPosting, tagMatchResult.score);
        }

        const matchScore = aiResult.llmScore;

        results.push({
          id: emp.id,
          type: 'employee' as const,
          name: emp.candidate.name,
          email: emp.candidate.email,
          currentPosition: emp.position,
          currentCompany: emp.department,
          employeeId: emp.employeeId,
          tags: emp.candidate.tags,
          matchScore: Math.round(matchScore * 10) / 10,
          matchedTags: tagMatchResult.matchedSkills,
          missingTags: tagMatchResult.missingSkills,
          similarTags: tagMatchResult.similarSkills,
          extraTags: tagMatchResult.extraSkills,
          evaluation: aiResult.evaluation,
        });
      }, 3);

      results.sort((a, b) => b.matchScore - a.matchScore);
      return NextResponse.json({ source: 'employee', jobPosting, results });
    } else {
      // 获取已匹配过该职位的候选人ID列表
      const existingMatches = await prisma.jobMatch.findMany({
        where: { jobPostingId: jobId },
        select: { candidateId: true },
      });
      const matchedCandidateIds = existingMatches.map(m => m.candidateId);

      // 从候选人库匹配，排除已匹配过该职位的候选人
      const candidates = await prisma.candidate.findMany({
        where: {
          status: { in: ['NEW', 'SCREENING', 'TALENT_POOL'] },
          ...(matchedCandidateIds.length > 0 ? { id: { notIn: matchedCandidateIds } } : {}),
        },
        include: { tags: true, certificates: true },
      });

      const results: any[] = [];

      await runWithConcurrency(candidates, async (c) => {
        const tagMatchResult = calculateTagMatchScore(c, jobPosting);
        let aiResult;

        try {
          aiResult = await generateAIEvaluation(c, jobPosting);
        } catch (err) {
          console.error(`候选人 ${c.name} LLM评估失败:`, err);
          aiResult = generateFallbackEvaluation(c, jobPosting, tagMatchResult.score);
        }

        const matchScore = aiResult.llmScore;

        results.push({
          id: c.id,
          type: 'candidate' as const,
          name: c.name,
          email: c.email,
          currentPosition: c.currentPosition,
          currentCompany: c.currentCompany,
          tags: c.tags,
          matchScore: Math.round(matchScore * 10) / 10,
          matchedTags: tagMatchResult.matchedSkills,
          missingTags: tagMatchResult.missingSkills,
          similarTags: tagMatchResult.similarSkills,
          extraTags: tagMatchResult.extraSkills,
          evaluation: aiResult.evaluation,
        });
      }, 3);

      results.sort((a, b) => b.matchScore - a.matchScore);
      return NextResponse.json({ source: 'candidate', jobPosting, results });
    }
  } catch (error) {
    console.error('实时匹配错误:', error);
    return NextResponse.json({ error: '实时匹配失败' }, { status: 500 });
  }
}
