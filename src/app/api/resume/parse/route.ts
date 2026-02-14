import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import { minioClient, BUCKET_NAME } from '@/lib/minio';

const prisma = new PrismaClient();

// 从 MinIO 下载文件为 Buffer
async function downloadFromMinio(objectName: string): Promise<Buffer> {
  const stream = await minioClient.getObject(BUCKET_NAME, objectName);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// 处理简历解析
export async function POST(request: NextRequest) {
  try {
    const { fileId, fileUrl, objectName } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: '缺少文件ID' },
        { status: 400 }
      );
    }

    // 从 MinIO 读取上传的PDF文件
    const minioObjectName = objectName || `resumes/${fileId}.pdf`;
    const fileBuffer = await downloadFromMinio(minioObjectName);
    
    // 解析PDF内容
    const pdfData = await pdfParse(fileBuffer);
    const pdfText = pdfData.text;
    
    // 调用AI模型解析简历内容
    const resumeData = await parseResumeWithAI(pdfText);
    
    // 将解析结果保存到数据库
    const resumeFileUrl = fileUrl || `resumes/${fileId}.pdf`;
    const candidate = await prisma.candidate.create({
      data: {
        name: resumeData.name || '未知姓名',
        email: resumeData.email || 'unknown@example.com',
        phone: resumeData.phone,
        education: resumeData.education,
        workExperience: resumeData.workExperience,
        currentPosition: resumeData.currentPosition,
        currentCompany: resumeData.currentCompany,
        resumeUrl: resumeFileUrl,
        resumeContent: resumeData.markdown,
        initialScore: resumeData.initialScore,
        totalScore: resumeData.initialScore,
        aiEvaluation: resumeData.aiEvaluation,
        status: 'NEW',
      },
    });
    
    // 添加标签
    if (resumeData.tags && resumeData.tags.length > 0) {
      for (const tagName of resumeData.tags) {
        // 查找或创建标签
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: {
            name: tagName,
            category: getCategoryForTag(tagName),
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
      aiEvaluation: generateAIEvaluation(resumeText),
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
  // 尝试提取包含工作经验的段落
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

function generateAIEvaluation(text: string): string {
  // 简单模拟AI评价生成，实际应使用AI模型生成更准确的评价
  const tags = extractTags(text);
  const workExp = calculateWorkExperience(text);
  const edu = extractEducation(text);
  const score = calculateInitialScore(text);

  const evaluation = `【简历综合分析】

📊 综合评分: ${score}分

🎯 技能匹配度分析:
${tags.length > 0 ? `候选人掌握 ${tags.slice(0, 5).join('、')} 等${tags.length}项技能，具有较好的技术背景。` : '技能信息提取有限，建议完善简历。'}

💼 工作经验评估:
${workExp || '简历中未明确标注工作经验年限。'}

📚 教育背景:
${edu || '简历中未明确提取到教育背景信息。'}

✅ 总体评价:
该候选人${score >= 80 ? '整体素质优秀' : score >= 70 ? '具备较好的专业能力' : '需要进一步评估'}，${tags.length > 3 ? '多项技能匹配岗位需求' : '技能匹配度一般'}。建议${score >= 75 ? '优先安排面试' : '根据具体岗位需求进一步筛选'}。

⚠️ 建议关注:
- 详细核实工作经历真实性
- 重点考察实际项目经验
- 评估候选人职业稳定性`;

  return evaluation;
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
