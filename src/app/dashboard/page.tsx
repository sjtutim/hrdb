import Link from 'next/link';
import { Button } from '@/app/components/ui/button';

export default function DashboardPage() {
  // 模拟数据
  const stats = [
    { name: '候选人总数', value: '2,543' },
    { name: '本月面试', value: '78' },
    { name: '开放职位', value: '32' },
    { name: '平均招聘周期', value: '18天' },
  ];

  const recentCandidates = [
    { id: 1, name: '张三', position: '高级前端工程师', status: '已面试', date: '2025-02-25' },
    { id: 2, name: '李四', position: '产品经理', status: '待面试', date: '2025-02-27' },
    { id: 3, name: '王五', position: 'UI设计师', status: '已录用', date: '2025-02-22' },
    { id: 4, name: '赵六', position: '后端工程师', status: '待面试', date: '2025-02-28' },
  ];

  const upcomingInterviews = [
    { id: 1, candidate: '李四', position: '产品经理', time: '2025-02-27 14:00', interviewer: '陈总监' },
    { id: 2, candidate: '赵六', position: '后端工程师', time: '2025-02-28 10:30', interviewer: '王经理' },
    { id: 3, candidate: '钱七', position: '数据分析师', time: '2025-03-01 15:00', interviewer: '刘总监' },
  ];

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Button asChild>
            <Link href="/candidates/create">添加候选人</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jobs/create">发布职位</Link>
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card bg-card">
            <h3 className="text-lg font-medium text-muted-foreground">{stat.name}</h3>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 最近候选人 */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">最近候选人</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/candidates">查看全部</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">姓名</th>
                  <th className="text-left py-3 px-2 font-medium">职位</th>
                  <th className="text-left py-3 px-2 font-medium">状态</th>
                  <th className="text-left py-3 px-2 font-medium">日期</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{candidate.name}</td>
                    <td className="py-3 px-2">{candidate.position}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        candidate.status === '已录用' 
                          ? 'bg-green-100 text-green-800' 
                          : candidate.status === '已面试' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">{candidate.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 即将到来的面试 */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">即将到来的面试</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/interviews">查看全部</Link>
            </Button>
          </div>
          <div className="space-y-4">
            {upcomingInterviews.map((interview) => (
              <div key={interview.id} className="p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex justify-between">
                  <h3 className="font-medium">{interview.candidate} - {interview.position}</h3>
                  <span className="text-sm text-muted-foreground">{interview.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">面试官: {interview.interviewer}</p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" asChild className="mr-2">
                    <Link href={`/interviews/${interview.id}`}>详情</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/interviews/${interview.id}/reschedule`}>重新安排</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI 建议部分 */}
      <div className="mt-8">
        <div className="card bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.84 6.71 2.26" />
                <path d="M21 3v9h-9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI 智能建议</h3>
              <p className="text-muted-foreground mb-4">
                根据最近的招聘数据分析，我们发现前端开发职位的候选人转化率较低。建议调整面试流程或职位描述，提高候选人质量。
              </p>
              <Button variant="outline" size="sm">查看详细分析</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
