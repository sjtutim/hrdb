'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import {
  Users,
  Calendar,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  FileText,
  UserCheck,
  Target,
  Plus,
  ChevronRight,
  Building2,
  Upload,
  CalendarDays
} from 'lucide-react';

// ============ 类型定义 ============
interface StatItem {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  trendLabel?: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
  href: string;
}

interface InterviewItem {
  id: number;
  candidate: string;
  position: string;
  time: string;
  interviewer: string;
  type: string;
}

interface ActivityItem {
  id: number;
  title: string;
  description: string;
  time: string;
  status: string;
}

interface FunnelStage {
  stage: string;
  count: number;
  total: number;
  color: string;
}

// ============ 工具函数 ============
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatDate(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

// ============ 组件 ============

// 统计卡片
function StatCard({ title, value, icon: Icon, trend, trendLabel, color, href }: StatItem) {
  const colorMap = {
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-600 dark:text-amber-400',
    },
    purple: {
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconText: 'text-purple-600 dark:text-purple-400',
    },
  };

  const c = colorMap[color];

  return (
    <Link href={href}>
      <Card className="group relative overflow-hidden border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className={`flex items-center text-xs font-medium ${
                    trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trend.positive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {trend.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{trendLabel}</span>
                </div>
              )}
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.iconBg} group-hover:scale-110 transition-transform duration-200`}>
              <Icon className={`h-5 w-5 ${c.iconText}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// 快捷操作按钮
function QuickAction({ icon: Icon, label, href, color }: {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all duration-200">
        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-center leading-tight">{label}</span>
      </div>
    </Link>
  );
}

// 面试列表项
function InterviewListItem({ interview }: { interview: InterviewItem }) {
  const typeColors: Record<string, string> = {
    '技术面试': 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/30',
    'HR面试': 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-400/30',
    '主管面试': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/30',
  };

  const isToday = interview.time.includes('今天');

  return (
    <div className="flex items-center gap-3 py-3 group">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {interview.candidate.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{interview.candidate}</p>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${typeColors[interview.type] || 'bg-gray-100 text-gray-700'}`}>
            {interview.type}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{interview.position}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs flex items-center gap-1 ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            {interview.time}
          </span>
          <span className="text-xs text-muted-foreground">
            {interview.interviewer}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </div>
  );
}

// 最近动态项
function ActivityListItem({ activity }: { activity: ActivityItem }) {
  const statusConfig: Record<string, { bg: string; icon: React.ElementType }> = {
    '已面试': { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Calendar },
    '待面试': { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Clock },
    '已录用': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: UserCheck },
  };
  const config = statusConfig[activity.status] || { bg: 'bg-gray-100', icon: UserCheck };
  const StatusIcon = config.icon;

  const statusColors: Record<string, string> = {
    '已面试': 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400',
    '待面试': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400',
    '已录用': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
        <StatusIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{activity.title}</p>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${statusColors[activity.status] || 'bg-gray-100 text-gray-700'}`}>
            {activity.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.description}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{activity.time}</p>
      </div>
    </div>
  );
}

// 招聘漏斗阶段
function FunnelStageItem({ stage, index }: { stage: FunnelStage; index: number }) {
  const percentage = (stage.count / stage.total) * 100;
  const prevCounts = [156, 98, 45, 18, 12];
  const prevCount = index > 0 ? prevCounts[index - 1] : stage.count;
  const conversionRate = index > 0 ? Math.round((stage.count / prevCount) * 100) : 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{stage.stage}</span>
          {index > 0 && (
            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {conversionRate}%
            </span>
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums">{stage.count}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${stage.color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============ 主页面 ============
export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || '用户';

  // 统计数据
  const stats: StatItem[] = [
    {
      title: '候选人总数',
      value: '2,543',
      icon: Users,
      trend: { value: '+12.5%', positive: true },
      trendLabel: '较上月',
      color: 'blue',
      href: '/candidates',
    },
    {
      title: '本月面试',
      value: '78',
      icon: Calendar,
      trend: { value: '+8.2%', positive: true },
      trendLabel: '较上月',
      color: 'green',
      href: '/interviews',
    },
    {
      title: '开放职位',
      value: '32',
      icon: Briefcase,
      trend: { value: '+3', positive: true },
      trendLabel: '本周新增',
      color: 'amber',
      href: '/jobs',
    },
    {
      title: '平均招聘周期',
      value: '18天',
      icon: Clock,
      trend: { value: '-2天', positive: true },
      trendLabel: '较上月',
      color: 'purple',
      href: '/matching',
    },
  ];

  // 快捷操作
  const quickActions = [
    { label: '上传简历', href: '/resume-upload', icon: Upload, color: 'bg-blue-500' },
    { label: '发布职位', href: '/jobs/create', icon: Briefcase, color: 'bg-emerald-500' },
    { label: '安排面试', href: '/interviews/create', icon: Calendar, color: 'bg-purple-500' },
    { label: '人才匹配', href: '/matching', icon: Target, color: 'bg-amber-500' },
  ];

  // 即将到来的面试
  const upcomingInterviews: InterviewItem[] = [
    { id: 1, candidate: '李四', position: '产品经理', time: '今天 14:00', interviewer: '陈总监', type: '技术面试' },
    { id: 2, candidate: '赵六', position: '后端工程师', time: '明天 10:30', interviewer: '王经理', type: 'HR面试' },
    { id: 3, candidate: '钱七', position: '数据分析师', time: '后天 15:00', interviewer: '刘总监', type: '主管面试' },
    { id: 4, candidate: '孙八', position: 'UI设计师', time: '周五 09:00', interviewer: '李主管', type: '技术面试' },
  ];

  // 最近动态
  const recentActivities: ActivityItem[] = [
    { id: 1, title: '张三', description: '高级前端工程师 - 技术部', time: '2小时前', status: '已面试' },
    { id: 2, title: '王五', description: 'UI设计师 - 设计部', time: '4小时前', status: '已录用' },
    { id: 3, title: '赵六', description: '后端工程师 - 技术部', time: '昨天', status: '待面试' },
  ];

  // 招聘漏斗数据
  const funnelStages: FunnelStage[] = [
    { stage: '新增简历', count: 156, total: 156, color: 'bg-blue-500' },
    { stage: '筛选通过', count: 98, total: 156, color: 'bg-indigo-500' },
    { stage: '面试中', count: 45, total: 156, color: 'bg-amber-500' },
    { stage: 'Offer发放', count: 18, total: 156, color: 'bg-emerald-500' },
    { stage: '已入职', count: 12, total: 156, color: 'bg-green-500' },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* ========== 页面标题 ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}，{userName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{formatDate()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/interviews/calendar">
              <Calendar className="h-4 w-4 mr-1.5" />
              面试日历
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/resume-upload">
              <Plus className="h-4 w-4 mr-1.5" />
              添加候选人
            </Link>
          </Button>
        </div>
      </div>

      {/* ========== 统计卡片 ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* ========== 快捷操作 ========== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action, index) => (
          <QuickAction key={index} {...action} />
        ))}
      </div>

      {/* ========== 主内容区：两列布局 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ===== 左侧：2/3 宽度 ===== */}
        <div className="lg:col-span-2 space-y-6">

          {/* 即将到来的面试 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">即将到来的面试</CardTitle>
                  <CardDescription className="text-xs mt-0.5">未来7天内的面试安排</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" asChild>
                  <Link href="/interviews">
                    查看全部
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/50">
                {upcomingInterviews.map((interview) => (
                  <InterviewListItem key={interview.id} interview={interview} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 招聘漏斗 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">招聘漏斗</CardTitle>
                  <CardDescription className="text-xs mt-0.5">本月候选人转化情况</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-normal">
                  共 156 人
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-4">
                {funnelStages.map((stage, index) => (
                  <FunnelStageItem
                    key={index}
                    stage={stage}
                    index={index}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== 右侧：1/3 宽度 ===== */}
        <div className="space-y-6">

          {/* AI 建议 */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    AI 智能建议
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">新</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    前端开发职位的候选人转化率较低，建议调整面试流程或优化职位描述以提高候选人质量。
                  </p>
                  <Button variant="outline" size="sm" className="h-7 text-xs mt-3">
                    查看分析
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 最近动态 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">最近动态</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                  <Link href="/candidates">
                    更多
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <CardDescription className="text-xs">候选人状态更新</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/50">
                {recentActivities.map((activity) => (
                  <ActivityListItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 本周概览 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">本周概览</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm">新增候选人</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">24</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm">完成面试</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">12</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm">成功入职</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">3</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm">新增简历</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">38</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
