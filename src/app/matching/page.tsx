'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Target,
  Search,
  RefreshCw,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Briefcase,
  User,
  ArrowRight,
  Filter,
  Zap,
  Check,
  X,
  AlertCircle,
  Trash2,
  Loader2,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  status: string;
}

interface JobMatch {
  id: string;
  candidateId: string;
  jobPostingId: string;
  matchScore: number;
  aiEvaluation: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    currentPosition: string | null;
    currentCompany: string | null;
    tags: { id: string; name: string }[];
  };
  jobPosting: {
    id: string;
    title: string;
    department: string;
    tags: { id: string; name: string }[];
  };
}

interface CandidateOption {
  id: string;
  name: string;
  status: string;
  currentPosition: string | null;
  tags: { id: string; name: string }[];
  matchedScore: number | null; // 已匹配该职位的分数，null 表示未匹配过
}

const CANDIDATE_STATUS_MAP: Record<string, string> = {
  NEW: '新建档案',
  SCREENING: '筛选中',
  TALENT_POOL: '人才池',
  INTERVIEWING: '面试中',
  OFFERED: '已发offer',
  ONBOARDING: '入职中',
  PROBATION: '试用期',
  EMPLOYED: '已入职',
  REJECTED: '已拒绝',
  ARCHIVED: '已归档',
};

interface TaskStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  total?: number;
  processed?: number;
  currentCandidate?: string | null;
  matches?: JobMatch[];
  error?: string | null;
}

interface ScheduledTask {
  id: string;
  jobPostingId: string;
  candidateIds: string[];
  scheduledFor: string;
  status: string;
  totalCandidates: number;
  processedCount: number;
  error: string | null;
  createdAt: string;
  jobPosting: {
    id: string;
    title: string;
    department: string;
  };
}

// 评分圆环组件
function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = 'text-red-500';
  if (score >= 80) colorClass = 'text-emerald-500';
  else if (score >= 60) colorClass = 'text-amber-500';

  return (
    <div className="relative h-12 w-12 flex items-center justify-center">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className={colorClass}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>
      <span className={`absolute text-sm font-bold ${colorClass}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}

// 关键字对比组件
function TagComparison({ match }: { match: JobMatch }) {
  const candidateTagNames = match.candidate.tags.map(t => t.name);
  const jobTagNames = (match.jobPosting.tags || []).map(t => t.name);

  const matchedTags = candidateTagNames.filter(t => jobTagNames.includes(t));
  const missingTags = jobTagNames.filter(t => !candidateTagNames.includes(t));
  const extraTags = candidateTagNames.filter(t => !jobTagNames.includes(t));

  return (
    <div className="space-y-3">
      {matchedTags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">匹配的技能 ({matchedTags.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {matchedTags.map(tag => (
              <Badge key={tag} className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {missingTags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <X className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-medium text-red-700">缺少的技能 ({missingTags.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {missingTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {extraTags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-blue-700">额外技能 ({extraTags.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {extraTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 匹配卡片组件
function MatchCard({ match, onDelete }: { match: JobMatch; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  // 解析 AI 评估内容的各部分
  const parseEvaluation = (text: string | null) => {
    if (!text) return { summary: '', sections: [] as { label: string; content: string }[] };
    const parts = text.split('\n\n').filter(Boolean);
    const summary = parts[0] || '';
    const sections = parts.slice(1).map(part => {
      const colonIdx = part.indexOf(':');
      if (colonIdx > 0 && colonIdx < 10) {
        return { label: part.substring(0, colonIdx).trim(), content: part.substring(colonIdx + 1).trim() };
      }
      return { label: '', content: part.trim() };
    });
    return { summary, sections };
  };

  const evaluation = parseEvaluation(match.aiEvaluation);

  return (
    <Card className="card-hover group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={match.matchScore} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{match.candidate.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {match.candidate.currentPosition || '职位未知'}
                  {match.candidate.currentCompany && ` · ${match.candidate.currentCompany}`}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                <Briefcase className="h-3 w-3 mr-1" />
                {match.jobPosting.department}
              </Badge>
            </div>

            <div className="mt-3">
              <p className="text-sm font-medium">{match.jobPosting.title}</p>
            </div>

            {/* 简要评估 + 展开按钮 */}
            {evaluation.summary && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary" />
                    {evaluation.summary}
                  </div>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 展开的详细内容 */}
            {expanded && (
              <div className="mt-3 space-y-4">
                {/* 关键字对比 */}
                <div className="p-3 rounded-lg border bg-card">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">技能关键字对比</h4>
                  <TagComparison match={match} />
                </div>

                {/* AI 评估详情 */}
                {evaluation.sections.length > 0 && (
                  <div className="p-3 rounded-lg border bg-card space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI 评估详情</h4>
                    {evaluation.sections.map((section, idx) => (
                      <div key={idx} className="text-sm">
                        {section.label ? (
                          <>
                            <span className="font-medium text-foreground">{section.label}:</span>{' '}
                            <span className="text-muted-foreground">{section.content}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{section.content}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {match.candidate.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : '查看详情'}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-destructive hover:text-destructive"
              onClick={() => onDelete(match.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
              <Link href={`/interviews/create?candidateId=${match.candidateId}&jobId=${match.jobPostingId}`}>
                安排面试
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 分数段统计卡片
function ScoreRangeCard({
  range,
  count,
  total,
  color
}: {
  range: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${color}`}>{range}</span>
          <span className="text-lg font-bold">{count}</span>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">占比 {percentage}%</p>
      </CardContent>
    </Card>
  );
}

export default function MatchingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobIdState] = useState<string>(searchParams.get('jobPostingId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  // 候选人选择相关状态
  const [candidateOptions, setCandidateOptions] = useState<CandidateOption[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('NEW');
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // 后台任务状态
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({ status: 'idle' });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计划匹配状态
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [creatingScheduled, setCreatingScheduled] = useState(false);

  const isRunning = taskStatus.status === 'running';

  // 选择职位时同步到 URL 参数，以便页面切换后恢复
  const setSelectedJobId = useCallback((jobId: string) => {
    setSelectedJobIdState(jobId);
    const params = new URLSearchParams(searchParams.toString());
    if (jobId) {
      params.set('jobId', jobId);
    } else {
      params.delete('jobId');
    }
    router.replace(`/matching?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/matches/run?jobPostingId=${jobId}`);
      if (!res.ok) return;
      const data: TaskStatus = await res.json();

      setTaskStatus(data);

      if (data.status === 'completed') {
        stopPolling();
        if (data.matches) {
          setMatches(data.matches);
        } else {
          // 没有 matches 时回退拉取
          const matchRes = await fetch(`/api/matches?jobPostingId=${jobId}`);
          if (matchRes.ok) {
            setMatches(await matchRes.json());
          }
        }
      } else if (data.status === 'failed') {
        stopPolling();
        setError(data.error || '匹配过程中发生错误');
      }
    } catch (err) {
      console.error('轮询任务状态失败:', err);
    }
  }, [stopPolling]);

  // 开始轮询
  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    // 立即查一次
    pollTaskStatus(jobId);
    pollingRef.current = setInterval(() => pollTaskStatus(jobId), 2000);
  }, [stopPolling, pollTaskStatus]);

  // 加载计划匹配任务
  const loadScheduledTasks = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/scheduled-matches?jobPostingId=${jobId}&status=PENDING`);
      if (res.ok) {
        setScheduledTasks(await res.json());
      }
    } catch (err) {
      console.error('加载计划匹配任务失败:', err);
    }
  }, []);

  // 创建计划匹配
  const createScheduledMatch = async () => {
    if (!selectedJobId || selectedCandidateIds.size === 0) return;
    setCreatingScheduled(true);
    try {
      const res = await fetch('/api/scheduled-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPostingId: selectedJobId,
          candidateIds: Array.from(selectedCandidateIds),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '创建失败');
      }
      await loadScheduledTasks(selectedJobId);
      window.dispatchEvent(new Event('queue:updated'));
    } catch (err) {
      console.error('创建计划匹配失败:', err);
      alert(err instanceof Error ? err.message : '创建计划匹配失败');
    } finally {
      setCreatingScheduled(false);
    }
  };

  // 取消计划匹配
  const cancelScheduledMatch = async (taskId: string) => {
    if (!confirm('确定要取消这个计划匹配任务吗？')) return;
    try {
      const res = await fetch(`/api/scheduled-matches/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '取消失败');
      }
      setScheduledTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('取消计划匹配失败:', err);
      alert(err instanceof Error ? err.message : '取消计划匹配失败');
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // 获取激活的职位列表
  useEffect(() => {
    const fetchJobPostings = async () => {
      try {
        const response = await fetch('/api/job-postings?status=ACTIVE');
        if (response.ok) {
          const data = await response.json();
          const jobs = Array.isArray(data) ? data : data.jobs || [];
          setJobPostings(jobs);
        }
      } catch (err) {
        console.error('获取职位列表错误:', err);
      }
    };

    fetchJobPostings();
  }, []);

  // 选择职位后，获取候选人列表
  useEffect(() => {
    if (!selectedJobId) {
      setCandidateOptions([]);
      setSelectedCandidateIds(new Set());
      return;
    }

    const fetchCandidates = async () => {
      setLoadingCandidates(true);
      try {
        // 并行获取候选人列表和该职位已有的匹配记录
        const [candidateRes, matchRes] = await Promise.all([
          fetch('/api/candidates?pageSize=1000'),
          fetch(`/api/matches?jobPostingId=${selectedJobId}`),
        ]);

        // 构建已匹配候选人的分数映射
        const matchedScoreMap = new Map<string, number>();
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          const matchList = Array.isArray(matchData) ? matchData : [];
          matchList.forEach((m: any) => {
            matchedScoreMap.set(m.candidateId, m.matchScore);
          });
        }

        if (candidateRes.ok) {
          const data = await candidateRes.json();
          const candidates = Array.isArray(data) ? data : data.candidates || [];
          setCandidateOptions(candidates.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status || 'NEW',
            currentPosition: c.currentPosition,
            tags: c.tags || [],
            matchedScore: matchedScoreMap.get(c.id) ?? null,
          })));
        }
      } catch (err) {
        console.error('获取候选人列表错误:', err);
      } finally {
        setLoadingCandidates(false);
      }
    };

    fetchCandidates();
  }, [selectedJobId]);

  // 根据状态筛选后的候选人列表
  const filteredCandidatesByStatus = candidateOptions.filter(
    c => candidateStatusFilter === 'ALL' || c.status === candidateStatusFilter
  );

  // 未匹配过的候选人（用于全选逻辑）
  const unmatchedCandidates = filteredCandidatesByStatus.filter(c => c.matchedScore === null);

  // 状态筛选变化时，默认全选当前筛选后的未匹配候选人
  useEffect(() => {
    if (candidateOptions.length === 0) return;
    const filtered = candidateOptions.filter(
      c => (candidateStatusFilter === 'ALL' || c.status === candidateStatusFilter) && c.matchedScore === null
    );
    setSelectedCandidateIds(new Set(filtered.map(c => c.id)));
  }, [candidateStatusFilter, candidateOptions]);

  // 统计各状态的候选人数量
  const candidateStatusCounts = candidateOptions.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  // 选择职位时，获取匹配结果 + 检查运行中的任务
  useEffect(() => {
    const fetchMatchesAndCheckTask = async () => {
      setLoading(true);
      setError(null);
      setTaskStatus({ status: 'idle' });
      stopPolling();

      try {
        const url = selectedJobId
          ? `/api/matches?jobPostingId=${selectedJobId}`
          : '/api/matches';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('获取匹配结果失败');
        }
        const data = await response.json();
        setMatches(data);
      } catch (err) {
        console.error('获取匹配结果错误:', err);
        setError(err instanceof Error ? err.message : '获取匹配结果失败');
      } finally {
        setLoading(false);
      }

      // 检查是否有运行中的任务 + 加载计划匹配
      if (selectedJobId) {
        try {
          const res = await fetch(`/api/matches/run?jobPostingId=${selectedJobId}`);
          if (res.ok) {
            const data: TaskStatus = await res.json();
            if (data.status === 'running') {
              setTaskStatus(data);
              startPolling(selectedJobId);
            }
          }
        } catch (err) {
          console.error('检查任务状态失败:', err);
        }
        loadScheduledTasks(selectedJobId);
      }
    };

    fetchMatchesAndCheckTask();
  }, [selectedJobId, stopPolling, startPolling, loadScheduledTasks]);

  // 运行新的匹配
  const runNewMatching = async () => {
    if (!selectedJobId) {
      alert('请先选择一个职位');
      return;
    }

    if (selectedCandidateIds.size === 0) {
      alert('请至少选择一个候选人');
      return;
    }

    if (isRunning) {
      return;
    }

    setError(null);
    try {
      const response = await fetch('/api/matches/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPostingId: selectedJobId,
          candidateIds: Array.from(selectedCandidateIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '运行匹配失败');
      }

      const data = await response.json();
      setTaskStatus({
        status: 'running',
        total: data.total,
        processed: data.processed || 0,
        currentCandidate: data.currentCandidate || null,
      });

      // 开始轮询
      startPolling(selectedJobId);
    } catch (err) {
      console.error('运行匹配错误:', err);
      setError(err instanceof Error ? err.message : '运行匹配失败');
    }
  };

  // 删除匹配记录
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('确定要删除这条匹配记录吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除匹配记录失败');
      }

      // 从列表中移除
      setMatches(matches.filter(m => m.id !== matchId));
    } catch (err) {
      console.error('删除匹配记录错误:', err);
      alert(err instanceof Error ? err.message : '删除匹配记录失败');
    }
  };

  // 过滤匹配结果
  const filteredMatches = matches.filter((match) => {
    if (scoreFilter !== 'ALL') {
      const score = match.matchScore;
      if (scoreFilter === 'HIGH' && score < 80) return false;
      if (scoreFilter === 'MEDIUM' && (score < 60 || score >= 80)) return false;
      if (scoreFilter === 'LOW' && score >= 60) return false;
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        match.candidate.name.toLowerCase().includes(searchLower) ||
        match.jobPosting.title.toLowerCase().includes(searchLower) ||
        match.jobPosting.department.toLowerCase().includes(searchLower) ||
        match.candidate.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
      );
    }

    return true;
  }).sort((a, b) => b.matchScore - a.matchScore);

  // 统计
  const stats = {
    total: matches.length,
    high: matches.filter(m => m.matchScore >= 80).length,
    medium: matches.filter(m => m.matchScore >= 60 && m.matchScore < 80).length,
    low: matches.filter(m => m.matchScore < 60).length,
  };

  // 进度百分比
  const progressPercent = taskStatus.total && taskStatus.total > 0
    ? Math.round(((taskStatus.processed || 0) / taskStatus.total) * 100)
    : 0;

  return (
    <div className="container py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">人才动态匹配</h1>
            <Badge variant="outline" className="bg-primary/5">
              <Zap className="h-3 w-3 mr-1 text-primary" />
              AI 驱动
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            基于多维度智能匹配，为您推荐最适合的候选人
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="选择目标职位" />
            </SelectTrigger>
            <SelectContent>
              {jobPostings.length === 0 ? (
                <SelectItem value="empty" disabled>
                  暂无激活的职位
                </SelectItem>
              ) : (
                jobPostings.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} - {job.department}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="flex items-center">
            <Button
              onClick={runNewMatching}
              disabled={isRunning || creatingScheduled || !selectedJobId || selectedCandidateIds.size === 0}
              className="rounded-r-none"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : creatingScheduled ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isRunning ? '匹配中...' : creatingScheduled ? '创建中...' : selectedCandidateIds.size > 0 ? `开始匹配 (${selectedCandidateIds.size}人)` : '开始匹配'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isRunning || creatingScheduled || !selectedJobId || selectedCandidateIds.size === 0}
                  className="rounded-l-none border-l border-primary-foreground/20 px-2"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={runNewMatching}>
                  <Zap className="h-4 w-4 mr-2" />
                  立即匹配
                </DropdownMenuItem>
                <DropdownMenuItem onClick={createScheduledMatch}>
                  <Clock className="h-4 w-4 mr-2" />
                  计划匹配 (凌晨2点)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 候选人选择区域 */}
      {selectedJobId && candidateOptions.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* 标题栏 + 搜索 + 全选 + 已选数量 */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                候选人选择
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="搜索候选人..."
                    className="pl-8 h-8 text-sm"
                    value={candidateSearchTerm}
                    onChange={(e) => setCandidateSearchTerm(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={unmatchedCandidates.length > 0 && unmatchedCandidates.every(c => selectedCandidateIds.has(c.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCandidateIds(new Set(unmatchedCandidates.map(c => c.id)));
                      } else {
                        setSelectedCandidateIds(new Set());
                      }
                    }}
                  />
                  全选
                </label>
                <Badge variant="secondary" className="text-xs">
                  已选 {selectedCandidateIds.size} 人
                </Badge>
              </div>
            </div>

            {/* 状态快速筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={candidateStatusFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCandidateStatusFilter('ALL')}
              >
                全部 ({candidateOptions.length})
              </Button>
              {Object.entries(CANDIDATE_STATUS_MAP).map(([key, label]) => {
                const count = candidateStatusCounts[key] || 0;
                if (count === 0) return null;
                return (
                  <Button
                    key={key}
                    variant={candidateStatusFilter === key ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCandidateStatusFilter(key)}
                  >
                    {label} ({count})
                  </Button>
                );
              })}
            </div>

            {/* 候选人网格 */}
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {filteredCandidatesByStatus
                .filter(c => {
                  if (!candidateSearchTerm) return true;
                  const term = candidateSearchTerm.toLowerCase();
                  return c.name.toLowerCase().includes(term)
                    || (c.currentPosition || '').toLowerCase().includes(term)
                    || c.tags.some(t => t.name.toLowerCase().includes(term));
                })
                .map(candidate => (
                  <label
                    key={candidate.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-sm ${candidate.matchedScore !== null ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'}`}
                  >
                    <Checkbox
                      checked={selectedCandidateIds.has(candidate.id)}
                      disabled={candidate.matchedScore !== null}
                      onCheckedChange={(checked) => {
                        setSelectedCandidateIds(prev => {
                          const next = new Set(prev);
                          if (checked) {
                            next.add(candidate.id);
                          } else {
                            next.delete(candidate.id);
                          }
                          return next;
                        });
                      }}
                    />
                    <span className="font-medium truncate">{candidate.name}</span>
                    {candidate.matchedScore !== null && (
                      <Badge className="text-xs shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                        已匹配 {candidate.matchedScore}分
                      </Badge>
                    )}
                    {candidate.currentPosition && (
                      <span className="text-muted-foreground truncate">· {candidate.currentPosition}</span>
                    )}
                    {candidate.matchedScore === null && candidate.tags.slice(0, 3).map(tag => (
                      <Badge key={tag.id} variant="outline" className="text-xs shrink-0">
                        {tag.name}
                      </Badge>
                    ))}
                  </label>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 加载候选人中 */}
      {selectedJobId && loadingCandidates && (
        <Card>
          <CardContent className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载候选人列表...
          </CardContent>
        </Card>
      )}

      {/* 计划匹配任务 */}
      {scheduledTasks.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              计划匹配任务
            </h3>
            <div className="space-y-2">
              {scheduledTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-white border">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {task.totalCandidates} 位候选人
                      </p>
                      <p className="text-xs text-muted-foreground">
                        执行时间: {new Date(task.scheduledFor).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-destructive hover:text-destructive"
                    onClick={() => cancelScheduledMatch(task.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    取消
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 匹配进度条 */}
      {isRunning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    正在匹配候选人...
                    {taskStatus.currentCandidate && (
                      <span className="text-muted-foreground ml-2">
                        当前: {taskStatus.currentCandidate}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {taskStatus.processed || 0} / {taskStatus.total || 0}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              匹配任务在后台运行，您可以离开此页面，稍后回来查看结果
            </p>
          </CardContent>
        </Card>
      )}

      {/* 任务失败提示 */}
      {taskStatus.status === 'failed' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">匹配任务失败</p>
                <p className="text-xs text-muted-foreground mt-1">{taskStatus.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分数段统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreRangeCard
          range="高匹配度 (80-100)"
          count={stats.high}
          total={stats.total}
          color="text-emerald-600"
        />
        <ScoreRangeCard
          range="中匹配度 (60-79)"
          count={stats.medium}
          total={stats.total}
          color="text-amber-600"
        />
        <ScoreRangeCard
          range="低匹配度 (0-59)"
          count={stats.low}
          total={stats.total}
          color="text-red-600"
        />
      </div>

      {/* 说明卡片 */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">AI 智能匹配说明</h3>
              <p className="text-sm text-muted-foreground mt-1">
                系统使用大语言模型自动匹配简历和岗位需求，基于多维度（技能匹配度、经验相关性、
                教育背景、性格特质等）进行综合评分。匹配分数会动态调整人才总分，帮助您快速找到最适合的候选人。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 筛选工具栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索候选人、岗位、部门或标签..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((filter) => {
                const labels = {
                  ALL: '全部匹配',
                  HIGH: '高匹配度',
                  MEDIUM: '中匹配度',
                  LOW: '低匹配度',
                };
                return (
                  <Button
                    key={filter}
                    variant={scoreFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScoreFilter(filter)}
                  >
                    {labels[filter]}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 匹配结果列表 */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="skeleton h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error && !isRunning ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : filteredMatches.length === 0 && !isRunning ? (
        <Card>
          <CardContent className="empty-state py-16">
            <Target className="empty-state-icon" />
            <p className="empty-state-title">
              {searchTerm || scoreFilter !== 'ALL' ? '未找到匹配的候选人' : '暂无匹配结果'}
            </p>
            <p className="empty-state-description">
              {searchTerm || scoreFilter !== 'ALL'
                ? '请尝试调整搜索条件或筛选器'
                : '点击上方按钮运行匹配算法'}
            </p>
            <Button className="mt-4" onClick={runNewMatching} disabled={!selectedJobId}>
              运行匹配
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} onDelete={handleDeleteMatch} />
          ))}
        </div>
      )}
    </div>
  );
}
