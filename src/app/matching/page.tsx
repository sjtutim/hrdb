'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, 
  Search, 
  RefreshCw, 
  Star, 
  ChevronRight,
  Sparkles,
  Briefcase,
  User,
  ArrowRight,
  Filter,
  Zap
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';

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

// 匹配卡片组件
function MatchCard({ match }: { match: JobMatch }) {
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
            
            {match.candidate.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {match.candidate.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {match.candidate.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{match.candidate.tags.length - 4}
                  </Badge>
                )}
              </div>
            )}
            
            {match.aiEvaluation && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground line-clamp-2">
                <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary" />
                {match.aiEvaluation}
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
          <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
            <Link href={`/interviews/create?candidateId=${match.candidateId}&jobId=${match.jobPostingId}`}>
              安排面试
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
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
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/matches');
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
    };

    fetchMatches();
  }, []);

  // 运行新的匹配
  const runNewMatching = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/matches/run', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('运行匹配失败');
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('运行匹配错误:', err);
      setError(err instanceof Error ? err.message : '运行匹配失败');
    } finally {
      setLoading(false);
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
        <Button onClick={runNewMatching} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '匹配中...' : '运行新匹配'}
        </Button>
      </div>

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
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : filteredMatches.length === 0 ? (
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
            <Button className="mt-4" onClick={runNewMatching}>
              运行匹配
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
