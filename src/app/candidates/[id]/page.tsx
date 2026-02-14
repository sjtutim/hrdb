'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Phone,
  Briefcase,
  Building,
  GraduationCap,
  Clock,
  Star,
  FileText,
  Tag,
  Calendar,
  User,
  Edit,
  Trash2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

// 候选人类型定义
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  education: string | null;
  workExperience: string | null;
  currentPosition: string | null;
  currentCompany: string | null;
  resumeUrl: string | null;
  resumeContent: string | null;
  initialScore: number | null;
  totalScore: number | null;
  aiEvaluation: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string; category: string }[];
  certificates: { id: string; name: string; description: string | null }[];
  recruiter: { id: string; name: string; email: string } | null;
  interviews: {
    id: string;
    type: string;
    scheduledAt: string;
    status: string;
    decision: string | null;
    interviewer: { id: string; name: string };
    scores: { id: string; category: string; score: number }[];
  }[];
  evaluations: {
    id: string;
    type: string;
    score: number;
    comments: string | null;
    createdAt: string;
    evaluator: { id: string; name: string };
  }[];
  jobMatches: {
    id: string;
    matchScore: number;
    aiEvaluation: string | null;
    jobPosting: { id: string; title: string; department: string; status: string };
  }[];
}

// 状态映射
const statusMap: Record<string, { label: string; className: string }> = {
  NEW: { label: '新建档案', className: 'bg-blue-100 text-blue-800' },
  SCREENING: { label: '筛选中', className: 'bg-yellow-100 text-yellow-800' },
  INTERVIEWING: { label: '面试中', className: 'bg-purple-100 text-purple-800' },
  OFFERED: { label: '已发offer', className: 'bg-indigo-100 text-indigo-800' },
  ONBOARDING: { label: '入职中', className: 'bg-teal-100 text-teal-800' },
  PROBATION: { label: '试用期', className: 'bg-orange-100 text-orange-800' },
  EMPLOYED: { label: '已正式入职', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: '已拒绝', className: 'bg-red-100 text-red-800' },
  ARCHIVED: { label: '已归档', className: 'bg-gray-100 text-gray-800' },
};

// 面试类型映射
const interviewTypeMap: Record<string, string> = {
  PHONE: '电话面试',
  TECHNICAL: '技术面试',
  HR: 'HR面试',
  MANAGER: '主管面试',
  PERSONALITY: '性格测试',
};

// 面试状态映射
const interviewStatusMap: Record<string, string> = {
  SCHEDULED: '已安排',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  RESCHEDULED: '已重新安排',
};

// 决定映射
const decisionMap: Record<string, string> = {
  PASS: '通过',
  FAIL: '不通过',
  HOLD: '待定',
};

// 标签类别颜色
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    SKILL: 'bg-blue-100 text-blue-800',
    INDUSTRY: 'bg-green-100 text-green-800',
    EDUCATION: 'bg-purple-100 text-purple-800',
    EXPERIENCE: 'bg-orange-100 text-orange-800',
    PERSONALITY: 'bg-pink-100 text-pink-800',
    OTHER: 'bg-gray-100 text-gray-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('候选人不存在');
          }
          throw new Error('获取候选人详情失败');
        }
        const data = await response.json();
        setCandidate(data);
      } catch (err) {
        console.error('获取候选人详情错误:', err);
        setError(err instanceof Error ? err.message : '获取候选人详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [params.id]);

  // 删除候选人
  const handleDelete = async () => {
    if (!confirm('确定要删除此候选人吗？此操作不可恢复。')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/candidates/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除候选人失败');
      }

      router.push('/candidates');
    } catch (err) {
      console.error('删除候选人错误:', err);
      alert(err instanceof Error ? err.message : '删除候选人失败');
      setIsDeleting(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/candidates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">候选人详情</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/candidates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">候选人详情</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">{error || '候选人不存在'}</p>
            <Button className="mt-4" asChild>
              <Link href="/candidates">返回候选人列表</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusMap[candidate.status] || { label: candidate.status, className: 'bg-gray-100 text-gray-800' };

  return (
    <div className="container py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/candidates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{candidate.name}</h1>
              <span className={`px-2 py-1 text-xs rounded-full ${status.className}`}>
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              创建于 {formatDate(candidate.createdAt)} · 更新于 {formatDate(candidate.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/candidates/${candidate.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/interviews/create?candidateId=${candidate.id}`}>
              <Calendar className="h-4 w-4 mr-2" />
              安排面试
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧列 - 基本信息和简历 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">邮箱</p>
                    <p className="font-medium">{candidate.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">电话</p>
                    <p className="font-medium">{candidate.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">当前职位</p>
                    <p className="font-medium">{candidate.currentPosition || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">当前公司</p>
                    <p className="font-medium">{candidate.currentCompany || '-'}</p>
                  </div>
                </div>
              </div>

              {candidate.education && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">教育背景</p>
                    <p className="font-medium whitespace-pre-wrap">{candidate.education}</p>
                  </div>
                </div>
              )}

              {candidate.workExperience && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">工作经验</p>
                    <p className="font-medium whitespace-pre-wrap">{candidate.workExperience}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 简历内容 */}
          {candidate.resumeContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  简历内容
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {candidate.resumeContent}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 面试记录 */}
          {candidate.interviews && candidate.interviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  面试记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidate.interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {interviewTypeMap[interview.type] || interview.type}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            {interviewStatusMap[interview.status] || interview.status}
                          </span>
                          {interview.decision && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                interview.decision === 'PASS'
                                  ? 'bg-green-100 text-green-800'
                                  : interview.decision === 'FAIL'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {decisionMap[interview.decision] || interview.decision}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          面试官: {interview.interviewer.name} · {formatDate(interview.scheduledAt)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/interviews/${interview.id}`}>查看详情</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 岗位匹配 */}
          {candidate.jobMatches && candidate.jobMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>岗位匹配</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidate.jobMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{match.jobPosting.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {match.jobPosting.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{match.matchScore.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧列 - 评分、标签等 */}
        <div className="space-y-6">
          {/* 评分 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                评分
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">初始评分</p>
                  <p className="text-2xl font-bold">
                    {candidate.initialScore !== null ? candidate.initialScore.toFixed(1) : '-'}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">总评分</p>
                  <p className="text-2xl font-bold">
                    {candidate.totalScore !== null ? candidate.totalScore.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI 评价 */}
          {candidate.aiEvaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  AI 简历评价
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {candidate.aiEvaluation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 标签 */}
          {candidate.tags && candidate.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidate.tags.map((tag) => (
                    <Badge key={tag.id} className={getCategoryColor(tag.category)}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 招聘人员 */}
          {candidate.recruiter && (
            <Card>
              <CardHeader>
                <CardTitle>招聘人员</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {candidate.recruiter.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{candidate.recruiter.name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.recruiter.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 证书 */}
          {candidate.certificates && candidate.certificates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>证书</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {candidate.certificates.map((cert) => (
                    <div key={cert.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{cert.name}</p>
                      {cert.description && (
                        <p className="text-sm text-muted-foreground">{cert.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 评估记录 */}
          {candidate.evaluations && candidate.evaluations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>评估记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidate.evaluations.map((eval_) => (
                    <div key={eval_.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{eval_.type}</span>
                        <span className="text-sm font-medium">{eval_.score.toFixed(1)}</span>
                      </div>
                      {eval_.comments && (
                        <p className="text-sm text-muted-foreground">{eval_.comments}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        评估人: {eval_.evaluator.name} · {formatDate(eval_.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
