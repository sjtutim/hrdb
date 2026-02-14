import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 预定义的技能标签
const skillTags = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js',
  'Python', 'Java', 'Go', 'Rust',
  'SQL', 'MongoDB', 'PostgreSQL',
  'Docker', 'Kubernetes', 'AWS'
];

// 预定义的性格标签
const personalityTags = ['团队合作', '沟通能力', '领导力', '创新', '自驱力', '抗压能力'];

// 预定义的经验标签
const experienceTags = ['1-3年', '3-5年', '5-10年', '高级', '中级'];

// 随机选择数组中的几个元素
function randomPick<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 生成模拟AI评价
function generateAIEvaluation(name: string): string {
  const skills = randomPick(skillTags, 3, 6);
  const personality = randomPick(personalityTags, 2, 3);
  const experience = randomPick(experienceTags, 1, 1)[0] || '3-5年';
  const score = 65 + Math.floor(Math.random() * 25);

  return `【简历综合分析】

📊 综合评分: ${score}分

🎯 技能匹配度分析:
候选人掌握 ${skills.join('、')} 等技能，具有较好的技术背景和${experience}的工作经验。

💼 工作经验评估:
该候选人具有${experience}的相关工作经验，在过往工作中积累了丰富的项目经验。

📚 教育背景:
候选人具备扎实的专业基础。

✅ 总体评价:
该候选人${score >= 80 ? '整体素质优秀' : score >= 70 ? '具备较好的专业能力' : '基本符合岗位要求'}，${skills.length > 4 ? '多项技能匹配岗位需求' : '具备岗位所需的基础技能'}。建议${score >= 75 ? '优先安排面试' : '根据具体岗位需求进一步筛选'}。

⚠️ 建议关注:
- 详细核实工作经历真实性
- 重点考察实际项目经验
- 评估候选人职业稳定性`;
}

async function main() {
  console.log('开始为所有候选人添加模拟标签和AI评价...\n');

  // 获取所有没有AI评价的候选人
  const candidates = await prisma.candidate.findMany({
    where: {
      OR: [
        { aiEvaluation: null },
        { tags: { none: {} } }
      ]
    },
    include: { tags: true }
  });

  console.log(`找到 ${candidates.length} 个需要更新的候选人`);

  for (const candidate of candidates) {
    // 随机选择3-6个技能标签
    const selectedSkillTags = randomPick(skillTags, 3, 6);
    const selectedPersonalityTags = randomPick(personalityTags, 1, 2);
    const selectedExperienceTags = randomPick(experienceTags, 1, 1);
    const allTags = [...selectedSkillTags, ...selectedPersonalityTags, ...selectedExperienceTags];

    // 为每个标签创建或获取
    const tagConnectors = [];
    for (const tagName of allTags) {
      const category = skillTags.includes(tagName) ? 'SKILL' :
                      personalityTags.includes(tagName) ? 'PERSONALITY' :
                      experienceTags.includes(tagName) ? 'EXPERIENCE' : 'OTHER';

      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName, category: category as any }
      });
      tagConnectors.push({ id: tag.id });
    }

    // 生成AI评价
    const aiEvaluation = generateAIEvaluation(candidate.name);

    // 更新候选人
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        aiEvaluation,
        tags: {
          connect: tagConnectors
        }
      }
    });

    console.log(`✓ 已更新候选人: ${candidate.name} (${candidate.email})`);
    console.log(`  - 添加标签: ${allTags.join(', ')}`);
    console.log(`  - AI评分: ${aiEvaluation.match(/综合评分: (\d+)分/)?.[1]}分\n`);
  }

  console.log('✅ 所有候选人更新完成！');
}

main()
  .catch((e) => {
    console.error('更新失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
