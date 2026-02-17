'use client';

import { useEffect, useMemo, useState } from 'react';
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
  id: string;
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

interface CandidateSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  currentPosition: string | null;
  currentCompany: string | null;
  resumeUrl: string | null;
  resumeContent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InterviewSummary {
  id: string;
  candidateId: string;
  type: string;
  status: string;
  scheduledAt: string;
  completedAt: string | null;
  createdAt: string;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  interviews: {
    id: string;
    name: string;
    email: string;
  }[];
}

interface JobPostingSummary {
  id: string;
  status: string;
}

interface EmployeeSummary {
  id: string;
  hireDate: string;
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function formatRelativeDateTime(dateString: string): string {
  const target = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = target.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay(target, now)) return `今天 ${time}`;
  if (isSameDay(target, tomorrow)) return `明天 ${time}`;

  return target.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatRelativeElapsed(dateString: string): string {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}分钟前`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}小时前`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}天前`;

  return target.toLocaleDateString('zh-CN');
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
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
    '新候选人': { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Users },
    '筛选中': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: FileText },
    '面试中': { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Calendar },
    '已发Offer': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: UserCheck },
    '已入职': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: UserCheck },
    '已拒绝': { bg: 'bg-rose-100 dark:bg-rose-900/30', icon: Clock },
  };
  const config = statusConfig[activity.status] || { bg: 'bg-gray-100', icon: UserCheck };
  const StatusIcon = config.icon;

  const statusColors: Record<string, string> = {
    '新候选人': 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400',
    '筛选中': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400',
    '面试中': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400',
    '已发Offer': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400',
    '已入职': 'bg-green-50 text-green-700 ring-1 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400',
    '已拒绝': 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-400',
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
function FunnelStageItem({ stage, index, prevCount }: { stage: FunnelStage; index: number; prevCount?: number }) {
  const percentage = stage.total > 0 ? (stage.count / stage.total) * 100 : 0;
  const baseCount = prevCount ?? stage.count;
  const conversionRate = index > 0 ? Math.round((stage.count / Math.max(1, baseCount)) * 100) : 100;

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
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPostingSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [candidatesRes, interviewsRes, jobsRes, employeesRes] = await Promise.all([
          fetch('/api/candidates'),
          fetch('/api/interviews'),
          fetch('/api/job-postings'),
          fetch('/api/employees'),
        ]);

        if (!candidatesRes.ok || !interviewsRes.ok || !jobsRes.ok || !employeesRes.ok) {
          throw new Error('仪表盘数据加载失败');
        }

        const [candidateData, interviewData, jobsData, employeeData] = await Promise.all([
          candidatesRes.json(),
          interviewsRes.json(),
          jobsRes.json(),
          employeesRes.json(),
        ]);

        setCandidates(candidateData);
        setInterviews(interviewData);
        setJobPostings(jobsData.jobs || jobsData);
        setEmployees(employeeData.employees || []);
      } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        setDataError('部分统计数据加载失败');
      }
    };

    loadDashboardData();
  }, []);

  const {
    stats,
    upcomingInterviews,
    recentActivities,
    funnelStages,
    totalFunnelCount,
    weekOverview,
  } = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const monthStart = getMonthStart(now);
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setMonth(monthStart.getMonth() + 1);
    const next7Days = new Date(now);
    next7Days.setDate(now.getDate() + 7);

    const candidateMap = new Map(candidates.map((item) => [item.id, item]));

    const monthlyInterviews = interviews.filter((item) => {
      const scheduledDate = new Date(item.scheduledAt);
      return scheduledDate >= monthStart && scheduledDate < nextMonthStart;
    });

    const activeJobs = jobPostings.filter((item) => item.status === 'ACTIVE').length;

    const completedInterviewByCandidate = new Map<string, Date>();
    interviews.forEach((item) => {
      if (item.status !== 'COMPLETED' || !item.completedAt) return;
      const completedAt = new Date(item.completedAt);
      const prev = completedInterviewByCandidate.get(item.candidateId);
      if (!prev || completedAt < prev) {
        completedInterviewByCandidate.set(item.candidateId, completedAt);
      }
    });

    const cycleDays = Array.from(completedInterviewByCandidate.entries())
      .map(([candidateId, completedAt]) => {
        const candidate = candidateMap.get(candidateId);
        if (!candidate) return null;
        const createdAt = new Date(candidate.createdAt);
        const diff = Math.round((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : null;
      })
      .filter((val): val is number => val !== null);

    const avgCycleDays = cycleDays.length > 0
      ? Math.round(cycleDays.reduce((sum, day) => sum + day, 0) / cycleDays.length)
      : null;

    const computedStats: StatItem[] = [
      {
        title: '候选人总数',
        value: String(candidates.length),
        icon: Users,
        color: 'blue',
        href: '/candidates',
      },
      {
        title: '本月面试',
        value: String(monthlyInterviews.length),
        icon: Calendar,
        color: 'green',
        href: '/interviews',
      },
      {
        title: '开放职位',
        value: String(activeJobs),
        icon: Briefcase,
        color: 'amber',
        href: '/jobs',
      },
      {
        title: '平均招聘周期',
        value: avgCycleDays === null ? '--' : `${avgCycleDays}天`,
        icon: Clock,
        color: 'purple',
        href: '/matching',
      },
    ];

    const interviewTypeLabelMap: Record<string, string> = {
      PHONE: '线上面试',
      TECHNICAL: '技术面试',
      HR: 'HR面试',
      MANAGER: '主管面试',
      PERSONALITY: '性格测试',
    };

    const computedUpcomingInterviews: InterviewItem[] = interviews
      .filter((item) => {
        const scheduledAt = new Date(item.scheduledAt);
        return (
          scheduledAt >= now
          && scheduledAt <= next7Days
          && (item.status === 'SCHEDULED' || item.status === 'RESCHEDULED')
        );
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        candidate: item.candidate.name,
        position: candidateMap.get(item.candidateId)?.currentPosition || '待定岗位',
        time: formatRelativeDateTime(item.scheduledAt),
        interviewer: item.interviews?.map((i: any) => i.name).join(', ') || '-',
        type: interviewTypeLabelMap[item.type] || item.type,
      }));

    const candidateStatusLabelMap: Record<string, string> = {
      NEW: '新候选人',
      SCREENING: '筛选中',
      TALENT_POOL: '人才池',
      INTERVIEWING: '面试中',
      OFFERED: '已发Offer',
      ONBOARDING: '已入职',
      PROBATION: '已入职',
      EMPLOYED: '已入职',
      REJECTED: '已拒绝',
      ARCHIVED: '已拒绝',
    };

    const computedActivities: ActivityItem[] = candidates
      .slice(0, 5)
      .map((item, index) => ({
        id: index + 1,
        title: item.name,
        description: `${item.currentPosition || '待定岗位'}${item.currentCompany ? ` - ${item.currentCompany}` : ''}`,
        time: formatRelativeElapsed(item.updatedAt),
        status: candidateStatusLabelMap[item.status] || '筛选中',
      }));

    const baseTotal = candidates.length;
    const screenedCount = candidates.filter((item) => (
      ['SCREENING', 'INTERVIEWING', 'OFFERED', 'ONBOARDING', 'PROBATION', 'EMPLOYED'].includes(item.status)
    )).length;
    const interviewingCount = candidates.filter((item) => item.status === 'INTERVIEWING').length;
    const offeredCount = candidates.filter((item) => item.status === 'OFFERED').length;
    const hiredCount = candidates.filter((item) => ['ONBOARDING', 'PROBATION', 'EMPLOYED'].includes(item.status)).length;

    const computedFunnelStages: FunnelStage[] = [
      { stage: '新增简历', count: baseTotal, total: Math.max(1, baseTotal), color: 'bg-blue-500' },
      { stage: '筛选通过', count: screenedCount, total: Math.max(1, baseTotal), color: 'bg-indigo-500' },
      { stage: '面试中', count: interviewingCount, total: Math.max(1, baseTotal), color: 'bg-amber-500' },
      { stage: 'Offer发放', count: offeredCount, total: Math.max(1, baseTotal), color: 'bg-emerald-500' },
      { stage: '已入职', count: hiredCount, total: Math.max(1, baseTotal), color: 'bg-green-500' },
    ];

    const thisWeekCandidates = candidates.filter((item) => {
      const createdAt = new Date(item.createdAt);
      return createdAt >= weekStart && createdAt <= now;
    }).length;

    const thisWeekCompletedInterviews = interviews.filter((item) => {
      if (item.status !== 'COMPLETED' || !item.completedAt) return false;
      const completedAt = new Date(item.completedAt);
      return completedAt >= weekStart && completedAt <= now;
    }).length;

    const thisWeekHiredEmployees = employees.filter((item) => {
      const hireDate = new Date(item.hireDate);
      return hireDate >= weekStart && hireDate <= now;
    }).length;

    const thisWeekResumes = candidates.filter((item) => {
      const createdAt = new Date(item.createdAt);
      return (
        createdAt >= weekStart
        && createdAt <= now
        && Boolean(item.resumeUrl || item.resumeContent)
      );
    }).length;

    return {
      stats: computedStats,
      upcomingInterviews: computedUpcomingInterviews,
      recentActivities: computedActivities,
      funnelStages: computedFunnelStages,
      totalFunnelCount: baseTotal,
      weekOverview: {
        newCandidates: thisWeekCandidates,
        completedInterviews: thisWeekCompletedInterviews,
        hired: thisWeekHiredEmployees,
        newResumes: thisWeekResumes,
      },
    };
  }, [candidates, interviews, jobPostings, employees]);

  // 快捷操作
  const quickActions = [
    { label: '上传简历', href: '/resume-upload', icon: Upload, color: 'bg-blue-500' },
    { label: '发布职位', href: '/jobs/create', icon: Briefcase, color: 'bg-emerald-500' },
    { label: '安排面试', href: '/interviews/create', icon: Calendar, color: 'bg-purple-500' },
    { label: '人才匹配', href: '/matching', icon: Target, color: 'bg-amber-500' },
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

      {dataError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {dataError}
        </div>
      )}

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
                {upcomingInterviews.length > 0 ? (
                  upcomingInterviews.map((interview) => (
                    <InterviewListItem key={interview.id} interview={interview} />
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    未来7天暂无面试安排
                  </div>
                )}
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
                  共 {totalFunnelCount} 人
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
                    prevCount={index > 0 ? funnelStages[index - 1].count : undefined}
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
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <ActivityListItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    暂无最近动态
                  </div>
                )}
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
                  <span className="text-sm font-bold tabular-nums">{weekOverview.newCandidates}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm">完成面试</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{weekOverview.completedInterviews}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm">成功入职</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{weekOverview.hired}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm">新增简历</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{weekOverview.newResumes}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
