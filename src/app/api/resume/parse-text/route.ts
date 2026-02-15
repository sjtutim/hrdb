import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// 处理文本简历解析
export async function POST(request: NextRequest) {
  try {
    const { resumeText } = await request.json();

    if (!resumeText || resumeText.trim() === '') {
      return NextResponse.json(
        { error: '简历文本不能为空' },
        { status: 400 }
      );
    }

    // 调用AI模型解析简历内容
    const resumeData = await parseResumeWithAI(resumeText);
    
    // 将解析结果保存到数据库
    const candidate = await prisma.candidate.create({
      data: {
        name: resumeData.name || '未知姓名',
        email: resumeData.email || 'unknown@example.com',
        phone: resumeData.phone,
        education: resumeData.education,
        workExperience: resumeData.workExperience,
        currentPosition: resumeData.currentPosition,
        currentCompany: resumeData.currentCompany,
        resumeContent: resumeData.markdown,
        initialScore: resumeData.initialScore,
        totalScore: resumeData.initialScore,
        status: 'NEW',
      },
    });
    
    // 添加标签
    if (resumeData.tags && resumeData.tags.length > 0) {
      for (const tagName of resumeData.tags) {
        // 查找或创建标签
        const category = getCategoryForTag(tagName);
        const tag = await prisma.tag.upsert({
          where: {
            name_category: { name: tagName, category },
          },
          update: {},
          create: {
            name: tagName,
            category,
          },
        });
        
        // 关联标签和候选人
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: {
            tags: {
              connect: { id: tag.id },
            },
          },
        });
      }
    }
    
    return NextResponse.json({ 
      candidateId: candidate.id,
      message: '简历解析成功' 
    });
  } catch (error) {
    console.error('简历解析错误:', error);
    return NextResponse.json(
      { error: '简历解析失败' },
      { status: 500 }
    );
  }
}

// 使用AI模型解析简历
async function parseResumeWithAI(resumeText: string) {
  try {
    // 这里应该调用实际的AI API，如DeepSeek或Kimi
    // 以下是模拟的返回结果
    
    // 在实际实现中，这里应该是调用AI API的代码
    // const response = await axios.post('https://api.deepseek.com/analyze', {
    //   text: resumeText,
    //   apiKey: process.env.DEEPSEEK_API_KEY
    // });
    
    // 模拟AI解析结果
    const mockAIResult = {
      name: extractName(resumeText),
      email: extractEmail(resumeText),
      phone: extractPhone(resumeText),
      education: extractEducation(resumeText),
      workExperience: calculateWorkExperience(resumeText),
      currentPosition: extractCurrentPosition(resumeText),
      currentCompany: extractCurrentCompany(resumeText),
      markdown: convertToMarkdown(resumeText),
      tags: extractTags(resumeText),
      initialScore: calculateInitialScore(resumeText),
    };
    
    return mockAIResult;
  } catch (error) {
    console.error('AI解析错误:', error);
    throw new Error('AI解析简历失败');
  }
}

// 以下是辅助函数，实际项目中应该使用AI模型提取这些信息

function extractName(text: string): string {
  // 简单模拟，实际应使用AI模型提取
  const nameMatch = text.match(/([A-Za-z\u4e00-\u9fa5]{2,20})/);
  return nameMatch ? nameMatch[0] : '未知姓名';
}

function extractEmail(text: string): string {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : 'unknown@example.com';
}

function extractPhone(text: string): string | null {
  const phoneMatch = text.match(/1[3-9]\d{9}/);
  return phoneMatch ? phoneMatch[0] : null;
}

function extractEducation(text: string): string | null {
  // 简单模拟，实际应使用AI模型提取
  const eduKeywords = ['本科', '硕士', '博士', '大学', '学院', 'MBA'];
  for (const keyword of eduKeywords) {
    if (text.includes(keyword)) {
      return `包含${keyword}的教育背景`;
    }
  }
  return null;
}

function calculateWorkExperience(text: string): string | null {
  // 简单模拟，实际应使用AI模型提取工作经验描述
  const expSection = text.match(/工作经[验历][\s\S]{0,500}/);
  if (expSection) {
    return expSection[0].trim().substring(0, 500);
  }
  const yearMatches = text.match(/(\d+)年(工作)?(经验)?/);
  if (yearMatches) {
    return `${yearMatches[1]}年工作经验`;
  }
  return null;
}

function extractCurrentPosition(text: string): string | null {
  // 简单模拟，实际应使用AI模型提取
  return '当前职位';
}

function extractCurrentCompany(text: string): string | null {
  // 简单模拟，实际应使用AI模型提取
  return '当前公司';
}

function convertToMarkdown(text: string): string {
  // 简单转换，实际应使用AI模型生成结构化的Markdown
  return `# 简历\n\n${text}`;
}

function extractTags(text: string): string[] {
  // 简单模拟，实际应使用AI模型提取关键技能和标签
  const tags = [];
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js',
    'Python', 'Java', 'C++', 'Go', 'Rust',
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    '前端', '后端', '全栈', '数据库', '云计算', '人工智能', '机器学习'
  ];
  
  for (const skill of skillKeywords) {
    if (text.includes(skill)) {
      tags.push(skill);
    }
  }
  
  return tags;
}

function calculateInitialScore(text: string): number {
  // 简单模拟，实际应使用AI模型评分
  return 70 + Math.floor(Math.random() * 20); // 70-90之间的随机分数
}

function getCategoryForTag(tagName: string): 'SKILL' | 'INDUSTRY' | 'EDUCATION' | 'EXPERIENCE' | 'PERSONALITY' | 'OTHER' {
  const skillTags = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js',
    'Python', 'Java', 'C++', 'Go', 'Rust',
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    '前端', '后端', '全栈', '数据库'
  ];
  
  const industryTags = [
    '互联网', '金融', '教育', '医疗', '制造', '零售', '物流', '能源', '电信'
  ];
  
  const educationTags = [
    '本科', '硕士', '博士', 'MBA', 'PhD', '计算机科学', '软件工程'
  ];
  
  const experienceTags = [
    '1年以下', '1-3年', '3-5年', '5-10年', '10年以上', '初级', '中级', '高级', '专家'
  ];
  
  const personalityTags = [
    '团队合作', '沟通能力', '领导力', '创新', '自驱力', '抗压能力'
  ];
  
  if (skillTags.includes(tagName)) return 'SKILL';
  if (industryTags.includes(tagName)) return 'INDUSTRY';
  if (educationTags.includes(tagName)) return 'EDUCATION';
  if (experienceTags.includes(tagName)) return 'EXPERIENCE';
  if (personalityTags.includes(tagName)) return 'PERSONALITY';
  
  return 'OTHER';
}
