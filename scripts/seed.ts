import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 预设标签数据
const defaultTags = [
  // 技能标签
  { name: 'JavaScript', category: 'SKILL' },
  { name: 'TypeScript', category: 'SKILL' },
  { name: 'React', category: 'SKILL' },
  { name: 'Vue', category: 'SKILL' },
  { name: 'Angular', category: 'SKILL' },
  { name: 'Node.js', category: 'SKILL' },
  { name: 'Python', category: 'SKILL' },
  { name: 'Java', category: 'SKILL' },
  { name: 'Go', category: 'SKILL' },
  { name: 'C++', category: 'SKILL' },
  { name: 'SQL', category: 'SKILL' },
  { name: 'MongoDB', category: 'SKILL' },
  { name: 'PostgreSQL', category: 'SKILL' },
  { name: 'Docker', category: 'SKILL' },
  { name: 'Kubernetes', category: 'SKILL' },
  { name: 'AWS', category: 'SKILL' },
  { name: '前端开发', category: 'SKILL' },
  { name: '后端开发', category: 'SKILL' },
  { name: '全栈开发', category: 'SKILL' },
  { name: '数据分析', category: 'SKILL' },
  { name: '机器学习', category: 'SKILL' },
  // 行业标签
  { name: '互联网', category: 'INDUSTRY' },
  { name: '金融', category: 'INDUSTRY' },
  { name: '教育', category: 'INDUSTRY' },
  { name: '医疗', category: 'INDUSTRY' },
  { name: '制造业', category: 'INDUSTRY' },
  { name: '电商', category: 'INDUSTRY' },
  // 教育标签
  { name: '本科', category: 'EDUCATION' },
  { name: '硕士', category: 'EDUCATION' },
  { name: '博士', category: 'EDUCATION' },
  { name: '计算机相关', category: 'EDUCATION' },
  // 经验标签
  { name: '应届生', category: 'EXPERIENCE' },
  { name: '1-3年', category: 'EXPERIENCE' },
  { name: '3-5年', category: 'EXPERIENCE' },
  { name: '5-10年', category: 'EXPERIENCE' },
  { name: '10年以上', category: 'EXPERIENCE' },
  // 性格特质标签
  { name: '团队协作', category: 'PERSONALITY' },
  { name: '沟通能力强', category: 'PERSONALITY' },
  { name: '抗压能力强', category: 'PERSONALITY' },
  { name: '自驱力强', category: 'PERSONALITY' },
  { name: '学习能力强', category: 'PERSONALITY' },
];

async function main() {
  // 检查是否已存在admin用户
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: 'xuhuayong@dunwill.com',
    },
  });

  if (!existingAdmin) {
    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('123456A', 10);

    const admin = await prisma.user.create({
      data: {
        name: 'Xuhuayong',
        email: 'xuhuayong@dunwill.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('管理员用户创建成功:', admin);
  } else {
    console.log('管理员用户已存在，无需创建');
  }

  // 创建预设标签
  console.log('开始创建预设标签...');
  for (const tag of defaultTags) {
    const existingTag = await prisma.tag.findUnique({
      where: { name: tag.name },
    });

    if (!existingTag) {
      await prisma.tag.create({
        data: {
          name: tag.name,
          category: tag.category as any,
        },
      });
      console.log(`标签 "${tag.name}" 创建成功`);
    }
  }
  console.log('预设标签创建完成');
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
