import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 实时匹配 - 根据职位实时计算候选人或员工的匹配度
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

    const jobTags = jobPosting.tags.map(t => t.name);

    if (source === 'employee') {
      // 从公司人才库（员工）匹配
      const employees = await prisma.employee.findMany({
        include: {
          candidate: {
            include: { tags: true },
          },
        },
      });

      const results = employees.map(emp => {
        const candidateTags = emp.candidate.tags.map(t => t.name);
        const { score, matched, missing, extra } = calculateTagMatch(candidateTags, jobTags);

        return {
          id: emp.id,
          type: 'employee' as const,
          name: emp.candidate.name,
          email: emp.candidate.email,
          currentPosition: emp.position,
          currentCompany: emp.department,
          employeeId: emp.employeeId,
          tags: emp.candidate.tags,
          matchScore: score,
          matchedTags: matched,
          missingTags: missing,
          extraTags: extra,
          evaluation: generateEvaluation(emp.candidate.name, jobPosting.title, score, matched, missing),
        };
      });

      results.sort((a, b) => b.matchScore - a.matchScore);
      return NextResponse.json({ source: 'employee', jobPosting, results });
    } else {
      // 从候选人库匹配
      const candidates = await prisma.candidate.findMany({
        where: {
          status: { in: ['NEW', 'SCREENING'] },
        },
        include: { tags: true },
      });

      const results = candidates.map(c => {
        const candidateTags = c.tags.map(t => t.name);
        const { score, matched, missing, extra } = calculateTagMatch(candidateTags, jobTags);

        // 工作经验加分
        const expBonus = calculateExpBonus(c.workExperience);
        // 教育背景加分
        const eduBonus = c.education ? 10 : 0;

        const finalScore = Math.min(100, Math.max(0, score * 0.6 + expBonus + eduBonus));

        return {
          id: c.id,
          type: 'candidate' as const,
          name: c.name,
          email: c.email,
          currentPosition: c.currentPosition,
          currentCompany: c.currentCompany,
          tags: c.tags,
          matchScore: Math.round(finalScore * 10) / 10,
          matchedTags: matched,
          missingTags: missing,
          extraTags: extra,
          evaluation: generateEvaluation(c.name, jobPosting.title, finalScore, matched, missing),
        };
      });

      results.sort((a, b) => b.matchScore - a.matchScore);
      return NextResponse.json({ source: 'candidate', jobPosting, results });
    }
  } catch (error) {
    console.error('实时匹配错误:', error);
    return NextResponse.json({ error: '实时匹配失败' }, { status: 500 });
  }
}

function calculateTagMatch(candidateTags: string[], jobTags: string[]) {
  const matched = candidateTags.filter(t => jobTags.includes(t));
  const missing = jobTags.filter(t => !candidateTags.includes(t));
  const extra = candidateTags.filter(t => !jobTags.includes(t));

  const score = jobTags.length > 0
    ? (matched.length / jobTags.length) * 100
    : 50;

  return { score, matched, missing, extra };
}

function calculateExpBonus(workExperience: string | null): number {
  if (!workExperience) return 5;
  const yearMatch = workExperience.match(/(\d+)\s*年/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10);
    if (years >= 3 && years <= 10) return 20;
    if (years > 10) return 15;
    return 10;
  }
  return workExperience.length > 50 ? 15 : 10;
}

function generateEvaluation(
  name: string,
  jobTitle: string,
  score: number,
  matched: string[],
  missing: string[]
): string {
  let text = '';
  if (score >= 80) {
    text = `${name}与${jobTitle}岗位高度匹配。`;
  } else if (score >= 60) {
    text = `${name}与${jobTitle}岗位匹配度中等。`;
  } else {
    text = `${name}与${jobTitle}岗位匹配度较低。`;
  }

  if (matched.length > 0) {
    text += `具备关键技能：${matched.join('、')}。`;
  }
  if (missing.length > 0) {
    text += `缺少：${missing.join('、')}。`;
  }

  if (score >= 80) {
    text += '建议优先安排面试。';
  } else if (score >= 60) {
    text += '可以考虑安排面试评估。';
  } else {
    text += '建议考虑其他更合适的候选人。';
  }

  return text;
}
