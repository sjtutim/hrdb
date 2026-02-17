'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Briefcase,
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Calendar,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
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

// 职位类型定义
interface Tag {
  id: string;
  name: string;
  category: string;
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  tags: Tag[];
  matchesCount: number;
}

// 分页类型
interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 状态配置
const statusConfig = {
  DRAFT: {
    label: '草稿',
    className: 'status-draft',
    description: '未发布'
  },
  ACTIVE: {
    label: '招聘中',
    className: 'status-active',
    description: '正在接受申请'
  },
  PAUSED: {
    label: '已暂停',
    className: 'status-paused',
    description: '暂停接收申请'
  },
};

// 截取文本简介
function truncateText(text: string, maxLength: number = 80): string {
  if (!text) return '暂无描述';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 职位卡片组件
function JobCard({ job, onDelete }: { job: JobPosting; onDelete: (id: string) => void }) {
  const status = statusConfig[job.status];
  const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();

  return (
    <Card className="card-hover group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
              <span className={`status-badge ${status.className}`}>
                {status.label}
              </span>
              {isExpired && (
                <Badge variant="destructive" className="text-xs">已过期</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{job.department}</p>

            {/* 岗位描述简介 */}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {truncateText(job.description, 100)}
            </p>

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                截止: {job.expiresAt
                  ? format(new Date(job.expiresAt), 'MM/dd', { locale: zhCN })
                  : '未设置'
                }
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {job.matchesCount || 0} 位匹配候选人
              </span>
            </div>

            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {job.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {job.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{job.tags.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/jobs/${job.id}`}>查看详情</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/jobs/${job.id}/edit`}>编辑职位</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/matching?jobPostingId=${job.id}`}>人才匹配</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm(`确定要删除职位"${job.title}"吗？`)) {
                    onDelete(job.id);
                  }
                }}
              >
                删除职位
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            创建于 {format(new Date(job.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
          </span>
          <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
            <Link href={`/jobs/${job.id}`}>
              查看
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
  });

  // 获取职位列表
  const fetchJobs = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (filter !== 'ALL') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/job-postings?${params}`);
      if (!response.ok) {
        throw new Error('获取职位列表失败');
      }
      const data = await response.json();
      setJobs(data.jobs || []);
      setPagination(data.pagination || { total: 0, page: 1, pageSize: 12, totalPages: 0 });
    } catch (err) {
      console.error('获取职位错误:', err);
      setError(err instanceof Error ? err.message : '获取职位列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
  }, [filter]);

  // 处理分页变化
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchJobs(newPage);
    }
  };

  // 删除职位
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/job-postings/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('删除失败');
      }
      // 刷新列表
      fetchJobs(pagination.page);
    } catch (err) {
      console.error('删除职位错误:', err);
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 根据搜索词过滤（前端过滤）
  const filteredJobs = jobs.filter(job => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      job.department.toLowerCase().includes(searchLower) ||
      job.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
    );
  });

  // 统计
  const stats = {
    total: pagination.total,
    active: jobs.filter(j => j.status === 'ACTIVE').length,
    draft: jobs.filter(j => j.status === 'DRAFT').length,
    paused: jobs.filter(j => j.status === 'PAUSED').length,
    expired: jobs.filter(j => j.expiresAt && new Date(j.expiresAt) < new Date()).length,
  };

  return (
    <div className="container py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">职位管理</h1>
          <p className="text-muted-foreground mt-1">
            共 {pagination.total} 个职位，{stats.active} 个正在招聘中
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/create">
            <Plus className="h-4 w-4 mr-2" />
            发布新职位
          </Link>
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '全部职位', value: stats.total, color: 'bg-blue-500' },
          { label: '招聘中', value: stats.active, color: 'bg-emerald-500' },
          { label: '草稿', value: stats.draft, color: 'bg-slate-500' },
          { label: '已暂停', value: stats.paused, color: 'bg-amber-500' },
        ].map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center text-white`}>
                  <Briefcase className="h-5 w-5" />
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

      {/* 过期提醒 */}
      {stats.expired > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              有 {stats.expired} 个职位已过期
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              请及时更新职位状态或延长期限
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            查看过期职位
          </Button>
        </div>
      )}

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索职位名称、部门或标签..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(['ALL', 'ACTIVE', 'DRAFT', 'PAUSED'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === 'ALL' ? '全部' : statusConfig[f].label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 职位列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="skeleton h-4 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2 mb-4" />
                <div className="skeleton h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="empty-state py-16">
            <Briefcase className="empty-state-icon" />
            <p className="empty-state-title">
              {searchTerm || filter !== 'ALL' ? '未找到匹配的职位' : '暂无职位'}
            </p>
            <p className="empty-state-description">
              {searchTerm || filter !== 'ALL'
                ? '请尝试调整搜索条件或筛选器'
                : '点击上方按钮发布您的第一个职位'}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/jobs/create">发布职位</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onDelete={handleDelete} />
            ))}
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                显示 {filteredJobs.length} 条结果，共 {pagination.total} 条
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
