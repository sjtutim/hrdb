'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Calendar, 
  Plus, 
  Search, 
  MoreHorizontal,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  CalendarDays,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface InterviewScore {
  id: string;
  category: string;
  score: number;
  notes: string | null;
}

interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  type: string;
  scheduledAt: string;
  completedAt: string | null;
  notes: string | null;
  status: string;
  scores: InterviewScore[];
  candidate: {
    id: string;
    name: string;
    email: string;
    currentPosition?: string;
  };
  interviewer: {
    id: string;
    name: string;
  };
}

// 计算面试总分
function calculateTotalScore(scores: InterviewScore[]): number | null {
  if (!scores || scores.length === 0) return null;
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  return Math.round(total / scores.length * 10) / 10;
}

// 状态配置
const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  SCHEDULED: { 
    label: '已安排', 
    className: 'status-scheduled',
    icon: Clock
  },
  COMPLETED: { 
    label: '已完成', 
    className: 'status-completed',
    icon: CheckCircle2
  },
  CANCELLED: { 
    label: '已取消', 
    className: 'status-cancelled',
    icon: XCircle
  },
  RESCHEDULED: { 
    label: '已改期', 
    className: 'status-rescheduled',
    icon: RefreshCw
  },
};

// 面试类型配置
const typeConfig: Record<string, { label: string; color: string }> = {
  PHONE: { label: '线上面试', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  TECHNICAL: { label: '技术面试', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  HR: { label: 'HR面试', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  MANAGER: { label: '主管面试', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  PERSONALITY: { label: '性格测试', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
};

// 面试行组件
function InterviewRow({ interview }: { interview: Interview }) {
  const status = statusConfig[interview.status];
  const type = typeConfig[interview.type] || { label: interview.type, color: 'bg-gray-100 text-gray-700' };
  const scheduledDate = new Date(interview.scheduledAt);
  const isPast = scheduledDate < new Date();
  const isToday = format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  
  return (
    <tr className="group transition-colors hover:bg-muted/50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {interview.candidate.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{interview.candidate.name}</p>
            <p className="text-xs text-muted-foreground">{interview.candidate.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{(interview as any).interviews?.map((i: any) => i.name).join(', ') || '-'}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
          {type.label}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
            {isToday ? '今天' : format(scheduledDate, 'MM月dd日', { locale: zhCN })}
            {' '}
            {format(scheduledDate, 'HH:mm')}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(scheduledDate, 'EEEE', { locale: zhCN })}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className={`status-badge ${status.className}`}>
          <status.icon className="h-3 w-3" />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-4">
        {(() => {
          const score = calculateTotalScore(interview.scores);
          return score !== null ? (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-bold ${
                score >= 80 ? 'text-emerald-600' :
                score >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {score.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">未评分</span>
          );
        })()}
      </td>
      <td className="px-4 py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/interviews/${interview.id}`}>查看详情</Link>
            </DropdownMenuItem>
            {interview.status === 'SCHEDULED' && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/interviews/${interview.id}/complete`}>完成面试</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/interviews/${interview.id}/reschedule`}>重新安排</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              取消面试
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await fetch('/api/interviews');
        if (!response.ok) {
          throw new Error('获取面试列表失败');
        }
        const data = await response.json();
        setInterviews(data);
      } catch (err) {
        console.error('获取面试列表错误:', err);
        setError(err instanceof Error ? err.message : '获取面试列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  // 过滤面试
  const filteredInterviews = interviews.filter((interview) => {
    if (statusFilter !== 'ALL' && interview.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && interview.type !== typeFilter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        interview.candidate.name.toLowerCase().includes(searchLower) ||
        interview.candidate.email.toLowerCase().includes(searchLower) ||
        (interview as any).interviews?.some((i: any) => i.name.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // 统计
  const stats = {
    total: interviews.length,
    scheduled: interviews.filter(i => i.status === 'SCHEDULED').length,
    completed: interviews.filter(i => i.status === 'COMPLETED').length,
    today: interviews.filter(i => 
      i.status === 'SCHEDULED' && 
      format(new Date(i.scheduledAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length,
  };

  // 即将到来的面试（今天及以后）
  const upcomingInterviews = filteredInterviews
    .filter(i => i.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  return (
    <div className="container py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">面试管理</h1>
          <p className="text-muted-foreground mt-1">
            管理面试安排，今日有 {stats.today} 场面试
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/interviews/calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              日历视图
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/interviews/create">
              <Plus className="h-4 w-4 mr-2" />
              安排面试
            </Link>
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '全部面试', value: stats.total, color: 'bg-blue-500', icon: Calendar },
          { label: '已安排', value: stats.scheduled, color: 'bg-amber-500', icon: Clock },
          { label: '已完成', value: stats.completed, color: 'bg-emerald-500', icon: CheckCircle2 },
          { label: '今日面试', value: stats.today, color: 'bg-purple-500', icon: CalendarDays },
        ].map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center text-white`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 面试列表 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 筛选工具栏 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索候选人或面试官..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="状态筛选" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全部状态</SelectItem>
                      <SelectItem value="SCHEDULED">已安排</SelectItem>
                      <SelectItem value="COMPLETED">已完成</SelectItem>
                      <SelectItem value="CANCELLED">已取消</SelectItem>
                      <SelectItem value="RESCHEDULED">已改期</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="类型筛选" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全部类型</SelectItem>
                      <SelectItem value="PHONE">线上面试</SelectItem>
                      <SelectItem value="TECHNICAL">技术面试</SelectItem>
                      <SelectItem value="HR">HR面试</SelectItem>
                      <SelectItem value="MANAGER">主管面试</SelectItem>
                      <SelectItem value="PERSONALITY">性格测试</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 面试表格 */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">加载中...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">
                  <p>{error}</p>
                </div>
              ) : filteredInterviews.length === 0 ? (
                <div className="empty-state py-16">
                  <Calendar className="empty-state-icon" />
                  <p className="empty-state-title">
                    {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' 
                      ? '未找到匹配的面试' 
                      : '暂无面试安排'}
                  </p>
                  <p className="empty-state-description">
                    {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                      ? '请尝试调整搜索条件或筛选器'
                      : '点击上方按钮安排您的第一场面试'}
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/interviews/create">安排面试</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>候选人</th>
                        <th>面试官</th>
                        <th>类型</th>
                        <th>时间</th>
                        <th>状态</th>
                        <th>评分</th>
                        <th className="text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInterviews.map((interview) => (
                        <InterviewRow key={interview.id} interview={interview} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 - 即将到来的面试 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                即将到来的面试
              </CardTitle>
              <CardDescription>未来7天内的面试安排</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingInterviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">暂无即将开始的面试</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingInterviews.map((interview) => {
                    const scheduledDate = new Date(interview.scheduledAt);
                    const type = typeConfig[interview.type] || { label: interview.type, color: '' };
                    
                    return (
                      <Link
                        key={interview.id}
                        href={`/interviews/${interview.id}`}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                          {interview.candidate.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{interview.candidate.name}</p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-xs text-muted-foreground">{type.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(scheduledDate, 'MM月dd日 HH:mm', { locale: zhCN })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              <Button variant="ghost" className="w-full mt-4" size="sm" asChild>
                <Link href="/interviews/calendar">
                  查看完整日历
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 面试流程说明 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">面试流程</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {[
                  { step: 1, title: '安排面试', desc: '选择候选人、面试官和时间' },
                  { step: 2, title: '进行面试', desc: '按时间进行面试并记录' },
                  { step: 3, title: '填写反馈', desc: '记录面试结果和评分' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
