import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取职位匹配的候选人
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    
    // 检查职位是否存在
    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { tags: true },
    });
    
    if (!jobPosting) {
      return NextResponse.json(
        { error: '职位不存在' },
        { status: 404 }
      );
    }
    
    // 获取职位匹配的候选人
    const jobMatches = await prisma.jobMatch.findMany({
      where: { jobPostingId: jobId },
      include: {
        candidate: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        matchScore: 'desc',
      },
    });
    
    // 格式化返回数据
    const candidates = jobMatches.map(match => ({
      id: match.candidate.id,
      name: match.candidate.name,
      email: match.candidate.email,
      phone: match.candidate.phone,
      matchScore: match.matchScore,
      tags: match.candidate.tags,
      createdAt: match.candidate.createdAt,
    }));
    
    return NextResponse.json(candidates);
  } catch (error) {
    console.error('获取职位匹配错误:', error);
    return NextResponse.json(
      { error: '获取职位匹配失败' },
      { status: 500 }
    );
  }
}
