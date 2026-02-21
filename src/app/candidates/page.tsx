'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Star,
  ArrowUpDown,
  User,
  BarChart3,
  Eye,
  Pencil,
  Calendar,
  Archive,
  UserCheck
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import TagCloudStats from '@/app/components/tag-cloud-stats';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  currentPosition: string | null;
  currentCompany: string | null;
  totalScore: number | null;
  status: string;
  tags: { id: string; name: string; category: string }[];
  lastUpdated: string;
  employeeRecord?: any;
}

// 状态映射
const statusMap: Record<string, { label: string; className: string }> = {
  NEW: { label: '新建档案', className: 'status-new' },
  SCREENING: { label: '筛选中', className: 'status-screening' },
  INTERVIEWING: { label: '面试中', className: 'status-interviewing' },
  OFFERED: { label: '已发offer', className: 'status-offered' },
  ONBOARDING: { label: '入职中', className: 'status-onboarding' },
  PROBATION: { label: '试用期', className: 'status-probation' },
  EMPLOYED: { label: '已正式入职', className: 'status-employed' },
  REJECTED: { label: '已拒绝', className: 'status-rejected' },
  ARCHIVED: { label: '已归档', className: 'status-archived' },
  TALENT_POOL: { label: '人才池', className: 'status-talent-pool' },
};

// 评分显示组件
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === 0) return <span className="text-muted-foreground text-sm">-</span>;

  let className = 'score-badge ';
  if (score >= 80) className += 'score-high';
  else if (score >= 60) className += 'score-medium';
  else className += 'score-low';

  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-current" />
      <span className={className}>{score.toFixed(1)}</span>
    </div>
  );
}

// 候选人表格行
function CandidateRow({ candidate, onArchive, onOnboard }: {
  candidate: Candidate;
  onArchive: (id: string, name: string) => void;
  onOnboard: (candidate: Candidate) => void;
}) {
  const status = statusMap[candidate.status] || { label: candidate.status, className: 'bg-gray-100 text-gray-800' };

  return (
    <tr className="group transition-colors hover:bg-muted/50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {candidate.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{candidate.name}</p>
              {(candidate.employeeRecord || candidate.status === 'RESIGNED') && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-50 text-orange-600 border border-orange-200 font-medium whitespace-nowrap">
                  曾入职
                </span>
              )}
              {(candidate as any).interviewScore !== null && (candidate as any).interviewScore !== undefined && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
                  {(candidate as any).interviewScore?.toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{candidate.email}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        {candidate.currentPosition ? (
          <div>
            <p className="text-sm font-medium">{candidate.currentPosition}</p>
            {candidate.currentCompany && (
              <p className="text-xs text-muted-foreground">{candidate.currentCompany}</p>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {candidate.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}
          {candidate.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{candidate.tags.length - 3}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <ScoreBadge score={candidate.totalScore} />
      </td>
      <td className="px-4 py-4">
        <span className={`status-badge ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm text-muted-foreground">
          {new Date(candidate.lastUpdated).toLocaleDateString('zh-CN')}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/candidates/${candidate.id}`} title="查看详情">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/candidates/${candidate.id}/edit`} title="编辑">
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          {!['ONBOARDING', 'PROBATION', 'EMPLOYED'].includes(candidate.status) && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/interviews/create?candidateId=${candidate.id}`} title="安排面试">
                <Calendar className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {!['ARCHIVED', 'RESIGNED', 'REJECTED'].includes(candidate.status) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600"
              title="入职手续"
              onClick={() => onOnboard(candidate)}
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            title="归档"
            onClick={() => onArchive(candidate.id, candidate.name)}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// 加载骨架屏
function CandidateSkeleton() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'date'>('date');
  const [showTagCloud, setShowTagCloud] = useState(false);
  const [tagStats, setTagStats] = useState<any[]>([]);
  const [tagStatsPeople, setTagStatsPeople] = useState(0);
  const [tagStatsLoading, setTagStatsLoading] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveNameInput, setArchiveNameInput] = useState('');
  const [archiveNameError, setArchiveNameError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // 入职手续弹窗状态
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardTarget, setOnboardTarget] = useState<Candidate | null>(null);
  const [onboardStatus, setOnboardStatus] = useState<string>('OFFERED');
  const [onboardDept, setOnboardDept] = useState('');
  const [onboardPosition, setOnboardPosition] = useState('');
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // 获取标签统计数据
  const fetchTagStats = async () => {
    try {
      setTagStatsLoading(true);
      const response = await fetch('/api/tags/stats?scope=candidates');
      if (!response.ok) {
        throw new Error('获取标签统计失败');
      }
      const data = await response.json();
      setTagStats(data.categories || []);
      setTagStatsPeople(data.totalPeople || 0);
    } catch (err) {
      console.error('获取标签统计错误:', err);
    } finally {
      setTagStatsLoading(false);
    }
  };

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/candidates');
        if (!response.ok) {
          throw new Error('获取候选人列表失败');
        }
        const data = await response.json();
        const visibleCandidates = (data as Candidate[]).filter(
          (c) => !['PROBATION', 'EMPLOYED', 'RESIGNED'].includes(c.status) && !c.employeeRecord
        );
        // 添加模拟的最后更新时间
        const dataWithDate = visibleCandidates.map((c: Candidate) => ({
          ...c,
          lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        }));
        setCandidates(dataWithDate);
      } catch (err) {
        console.error('获取候选人列表错误:', err);
        setError(err instanceof Error ? err.message : '获取候选人列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // 打开入职手续对话框
  const handleOnboardClick = (candidate: Candidate) => {
    setOnboardTarget(candidate);
    setOnboardStatus('OFFERED');
    setOnboardDept('');
    setOnboardPosition(candidate.currentPosition || '');
    setOnboardError(null);
    setOnboardOpen(true);
  };

  // 确认入职状态更新
  const handleConfirmOnboard = async () => {
    if (!onboardTarget || !onboardStatus) return;

    if ((onboardStatus === 'PROBATION' || onboardStatus === 'EMPLOYED') && !onboardDept.trim()) {
      setOnboardError('请填写入职部门');
      return;
    }

    setIsOnboarding(true);
    setOnboardError(null);

    try {
      const body: Record<string, string> = { status: onboardStatus };
      if (onboardStatus === 'PROBATION' || onboardStatus === 'EMPLOYED') {
        body.department = onboardDept.trim();
        if (onboardPosition.trim()) body.position = onboardPosition.trim();
      }

      const response = await fetch(`/api/candidates/${onboardTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '操作失败');
      }

      // 同步更新本地列表
      setCandidates(prev =>
        prev.map(c => c.id === onboardTarget.id ? { ...c, status: onboardStatus } : c)
      );
      setOnboardOpen(false);
      setOnboardTarget(null);
    } catch (err) {
      setOnboardError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setIsOnboarding(false);
    }
  };

  // 打开归档确认对话框
  const handleArchiveClick = (id: string, name: string) => {
    setArchiveTarget({ id, name });
    setArchiveNameInput('');
    setArchiveNameError(null);
    setArchiveConfirmOpen(true);
  };

  // 确认归档候选人
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;

    // 验证输入的姓名
    if (archiveNameInput.trim() !== archiveTarget.name) {
      setArchiveNameError(`请输入正确的姓名（${archiveTarget.name}）`);
      return;
    }

    setIsArchiving(true);

    try {
      const response = await fetch(`/api/candidates/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });

      if (!response.ok) {
        throw new Error('归档候选人失败');
      }

      // 归档成功，更新列表
      setCandidates(candidates.map(c =>
        c.id === archiveTarget.id ? { ...c, status: 'ARCHIVED' } : c
      ));
      setArchiveConfirmOpen(false);
      setArchiveTarget(null);
    } catch (err) {
      console.error('归档候选人错误:', err);
      alert(err instanceof Error ? err.message : '归档候选人失败');
    } finally {
      setIsArchiving(false);
    }
  };

  // 过滤和排序候选人
  const filteredCandidates = candidates
    .filter((candidate) => {
      if (statusFilter === 'ALL' && candidate.status === 'ARCHIVED') {
        return false;
      }
      if (statusFilter !== 'ALL' && candidate.status !== statusFilter) {
        return false;
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          candidate.name.toLowerCase().includes(searchLower) ||
          candidate.email.toLowerCase().includes(searchLower) ||
          (candidate.currentPosition && candidate.currentPosition.toLowerCase().includes(searchLower)) ||
          (candidate.currentCompany && candidate.currentCompany.toLowerCase().includes(searchLower)) ||
          candidate.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.totalScore || 0) - (a.totalScore || 0);
        case 'date':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // 统计各状态人数
  const statusCounts = candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">候选人档案</h1>
          <p className="text-muted-foreground mt-1">
            共 {candidates.filter(c => c.status !== 'ARCHIVED').length} 位活跃候选人，管理您的人才库
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showTagCloud ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowTagCloud(!showTagCloud);
              if (!showTagCloud && tagStats.length === 0) {
                fetchTagStats();
              }
            }}
          >
            <BarChart3 className={`h-4 w-4 mr-2 ${showTagCloud ? 'text-white' : ''}`} />
            候选人群像
          </Button>
          <Button size="sm" asChild>
            <Link href="/resume-upload">
              <Plus className="h-4 w-4 mr-2" />
              添加候选人
            </Link>
          </Button>
        </div>
      </div>

      {/* 状态快速筛选 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
        >
          全部
          <span className="relative -top-2 ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium leading-none">{candidates.filter(c => c.status !== 'ARCHIVED').length}</span>
        </Button>
        {Object.entries(statusMap).map(([key, { label }]) => {
          const count = statusCounts[key] || 0;
          if (count === 0) return null;
          return (
            <Button
              key={key}
              variant={statusFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(key)}
            >
              {label}
              <span className={`relative -top-2 ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-medium leading-none ${statusFilter === key ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/80 text-white'}`}>{count}</span>
            </Button>
          );
        })}
      </div>

      {/* 筛选和搜索工具栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、邮箱、职位、公司或标签..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">最近更新</SelectItem>
                  <SelectItem value="score">评分高低</SelectItem>
                  <SelectItem value="name">姓名排序</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 候选人群像区域 */}
      {showTagCloud && (
        <Card className="mt-6">
          <CardContent className="p-6">
            {tagStatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">加载中...</p>
              </div>
            ) : tagStats.length > 0 ? (
              <TagCloudStats data={tagStats} totalPeople={tagStatsPeople} title="候选人群像" />
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无标签数据</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 候选人列表 */}
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
          ) : filteredCandidates.length === 0 ? (
            <div className="empty-state py-16">
              <User className="empty-state-icon" />
              <p className="empty-state-title">
                {searchTerm || statusFilter !== 'ALL' ? '未找到匹配的候选人' : '暂无候选人'}
              </p>
              <p className="empty-state-description">
                {searchTerm || statusFilter !== 'ALL'
                  ? '请尝试调整搜索条件或筛选器'
                  : '点击上方按钮添加您的第一位候选人'}
              </p>
              <Button className="mt-4" asChild>
                <Link href="/resume-upload">添加候选人</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>候选人</th>
                    <th>当前职位</th>
                    <th>标签</th>
                    <th>评分</th>
                    <th>状态</th>
                    <th>最后更新</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => (
                    <CandidateRow key={candidate.id} candidate={candidate} onArchive={handleArchiveClick} onOnboard={handleOnboardClick} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {!loading && !error && filteredCandidates.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            显示 {filteredCandidates.length} 条结果
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled>
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 入职手续弹窗 */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入职手续 — {onboardTarget?.name}</DialogTitle>
            <DialogDescription>
              修改候选人入职状态，选择试用期或正式入职时需指定入职部门。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 状态选择 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">入职状态</label>
              <Select value={onboardStatus} onValueChange={(v) => { setOnboardStatus(v); setOnboardError(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFERED">已发 Offer</SelectItem>
                  <SelectItem value="PROBATION">试用期</SelectItem>
                  <SelectItem value="EMPLOYED">正式入职</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 部门（试用期/正式入职时必填） */}
            {(onboardStatus === 'PROBATION' || onboardStatus === 'EMPLOYED') && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    入职部门 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="请输入部门名称，如：技术部、市场部"
                    value={onboardDept}
                    onChange={(e) => { setOnboardDept(e.target.value); setOnboardError(null); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">入职职位</label>
                  <Input
                    placeholder="请输入职位名称（选填）"
                    value={onboardPosition}
                    onChange={(e) => setOnboardPosition(e.target.value)}
                  />
                </div>
              </>
            )}

            {onboardError && (
              <p className="text-sm text-destructive">{onboardError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmOnboard}
              disabled={isOnboarding || !onboardStatus}
            >
              {isOnboarding ? '保存中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 归档确认弹窗 */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认归档候选人</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>归档后，候选人将移至归档状态，您仍然可以随时查看其信息。</p>
              <p className="font-medium">
                请输入候选人姓名 <span className="text-primary">"{archiveTarget?.name}"</span> 确认归档：
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="text"
              value={archiveNameInput}
              onChange={(e) => {
                setArchiveNameInput(e.target.value);
                setArchiveNameError(null);
              }}
              placeholder={`请输入 "${archiveTarget?.name}"`}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            {archiveNameError && (
              <p className="text-sm text-destructive mt-2">{archiveNameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmArchive}
              disabled={isArchiving || !archiveNameInput.trim()}
            >
              {isArchiving ? '归档中...' : '确认归档'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
