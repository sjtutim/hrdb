import { NextRequest, NextResponse } from 'next/server';

// 处理AI生成职位描述和要求
export async function POST(request: NextRequest) {
  try {
    const { title, department, selectedTags = [] } = await request.json();

    if (!title || !department) {
      return NextResponse.json(
        { error: '职位名称和部门不能为空' },
        { status: 400 }
      );
    }

    // 这里应该调用实际的AI API，如DeepSeek或Kimi
    // 以下是模拟的返回结果
    
    // 在实际实现中，这里应该是调用AI API的代码
    // const response = await axios.post('https://api.deepseek.com/analyze', {
    //   text: `为${department}的${title}职位生成岗位描述和要求`,
    //   tags: selectedTags,
    //   apiKey: process.env.DEEPSEEK_API_KEY
    // });
    
    // 模拟AI生成的结果
    const description = generateDescription(title, department, selectedTags);
    const requirements = generateRequirements(title, department, selectedTags);
    
    return NextResponse.json({
      description,
      requirements,
    });
  } catch (error) {
    console.error('生成职位描述错误:', error);
    return NextResponse.json(
      { error: '生成职位描述失败' },
      { status: 500 }
    );
  }
}

// 模拟生成岗位描述
function generateDescription(title: string, department: string, tags: string[]): string {
  const descriptions: Record<string, string> = {
    '前端开发工程师': `作为${department}的前端开发工程师，您将负责设计和实现用户界面，确保良好的用户体验。主要职责包括：
1. 使用HTML、CSS和JavaScript开发高质量的前端代码
2. 与设计师和后端开发人员紧密合作，确保产品的一致性和功能性
3. 优化应用程序以获得最大速度和可扩展性
4. 参与代码审查和技术讨论
5. 跟踪和解决用户界面问题`,

    '后端开发工程师': `作为${department}的后端开发工程师，您将负责设计和实现服务器端逻辑和数据库结构。主要职责包括：
1. 使用Node.js、Java或Python等技术开发高性能的后端服务
2. 设计和实现API接口，确保前后端的顺畅交互
3. 优化查询和数据库结构以提高性能
4. 实现安全和数据保护措施
5. 参与系统架构设计和技术选型`,

    '产品经理': `作为${department}的产品经理，您将负责产品的整个生命周期，从概念到发布。主要职责包括：
1. 收集和分析用户需求，定义产品功能和路线图
2. 撰写详细的产品需求文档和用户故事
3. 与设计和开发团队紧密合作，确保产品按计划交付
4. 监控产品指标，分析用户反馈并提出改进建议
5. 研究市场趋势和竞争对手，确保产品的竞争力`,

    '人力资源专员': `作为${department}的人力资源专员，您将负责公司的招聘和员工管理工作。主要职责包括：
1. 协助招聘流程，包括发布职位、筛选简历和安排面试
2. 管理员工入职和离职流程
3. 维护员工记录和人力资源数据库
4. 协助组织培训和团队建设活动
5. 处理员工咨询和人力资源相关问题`,
  };

  // 如果有匹配的预设描述，则返回
  if (descriptions[title]) {
    return descriptions[title];
  }

  // 否则生成通用描述
  return `作为${department}的${title}，您将成为我们团队的重要一员，负责相关专业领域的工作。主要职责包括：
1. 根据部门需求完成相关专业工作
2. 与团队成员紧密合作，确保项目顺利进行
3. 持续学习和应用行业最新技术和方法
4. 参与团队会议和技术讨论
5. 解决工作中遇到的各种挑战和问题`;
}

// 模拟生成岗位要求
function generateRequirements(title: string, department: string, tags: string[]): string {
  const requirements: Record<string, string> = {
    '前端开发工程师': `我们期望这个职位的候选人具备以下条件：
1. 计算机科学或相关专业本科及以上学历
2. 至少2年前端开发经验，熟悉HTML、CSS和JavaScript
3. 熟练掌握React、Vue或Angular等前端框架
4. 了解响应式设计和跨浏览器兼容性
5. 具有良好的沟通能力和团队协作精神
6. 有移动端开发经验者优先考虑`,

    '后端开发工程师': `我们期望这个职位的候选人具备以下条件：
1. 计算机科学或相关专业本科及以上学历
2. 至少2年后端开发经验，熟悉Node.js、Java或Python等技术
3. 熟悉关系型数据库和NoSQL数据库
4. 了解RESTful API设计和微服务架构
5. 具有良好的问题解决能力和代码质量意识
6. 有云服务经验者优先考虑`,

    '产品经理': `我们期望这个职位的候选人具备以下条件：
1. 商科、计算机科学或相关专业本科及以上学历
2. 至少3年产品管理经验，熟悉产品生命周期
3. 优秀的分析能力和数据驱动决策能力
4. 出色的沟通能力和跨部门协作能力
5. 熟悉敏捷开发方法论
6. 有相关行业经验者优先考虑`,

    '人力资源专员': `我们期望这个职位的候选人具备以下条件：
1. 人力资源管理或相关专业本科及以上学历
2. 至少1年人力资源相关工作经验
3. 熟悉招聘流程和劳动法规
4. 优秀的沟通能力和人际交往能力
5. 良好的组织能力和时间管理能力
6. 有HRMS系统使用经验者优先考虑`,
  };

  // 如果有匹配的预设要求，则返回
  if (requirements[title]) {
    return requirements[title];
  }

  // 否则生成通用要求
  return `我们期望这个职位的候选人具备以下条件：
1. 相关专业本科及以上学历
2. 至少2年相关工作经验
3. 熟悉行业标准和最佳实践
4. 良好的沟通能力和团队协作精神
5. 具备解决问题的能力和积极的工作态度
6. 有相关证书或专业培训经历者优先考虑`;
}
