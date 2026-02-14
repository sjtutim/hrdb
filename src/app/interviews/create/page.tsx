'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  ArrowLeft, 
  Clock, 
  User, 
  Briefcase,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';

interface Candidate {
  id: string;
  name: string;
  email: string;
  currentPosition: string | null;
  currentCompany: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
}

const interviewTypes = [
  { value: 'PHONE', label: '电话面试', duration: '30分钟' },
  { value: 'TECHNICAL', label: '技术面试', duration: '60-90分钟' },
  { value: 'HR', label: 'HR面试', duration: '30-45分钟' },
  { value: 'MANAGER', label: '主管面试', duration: '45-60分钟' },
  { value: 'PERSONALITY', label: '性格测试', duration: '20-30分钟' },
];
const NO_JOB_VALUE = 'NO_JOB';

export default function CreateInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>(NO_JOB_VALUE);
  const [interviewType, setInterviewType] = useState<string>('TECHNICAL');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candidatesRes, usersRes, jobsRes] = await Promise.all([
          fetch('/api/candidates'),
          fetch('/api/users'),
          fetch('/api/job-postings'),
        ]);

        if (!candidatesRes.ok || !usersRes.ok || !jobsRes.ok) {
          throw new Error('获取数据失败');
        }

        const [candidatesData, usersData, jobsData] = await Promise.all([
          candidatesRes.json(),
          usersRes.json(),
          jobsRes.json(),
        ]);

        setCandidates(candidatesData);
        setInterviewers(usersData);
        setJobPostings(jobsData);
        
        // 检查URL参数
        const candidateId = searchParams.get('candidateId');
        const jobId = searchParams.get('jobId');
        
        if (candidateId) setSelectedCandidateId(candidateId);
        if (jobId) setSelectedJobId(jobId);
        
        // 设置默认面试时间（明天同一时间）
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 1);
        defaultDate.setMinutes(0);
        defaultDate.setSeconds(0);
        setScheduledAt(defaultDate.toISOString().slice(0, 16));
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCandidateId || !selectedInterviewerId || !interviewType || !scheduledAt) {
      setError('请填写所有必填字段');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidateId,
          interviewerId: selectedInterviewerId,
          type: interviewType,
          scheduledAt,
          notes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建面试失败');
      }
      
      router.push('/interviews');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建面试失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取选中的候选人信息
  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
  const selectedType = interviewTypes.find(t => t.value === interviewType);

  if (loading) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/interviews">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">安排面试</h1>
          <p className="text-sm text-muted-foreground">为候选人安排新的面试</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 主要信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  面试信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 候选人选择 */}
                <div className="space-y-2">
                  <Label htmlFor="candidateId">
                    候选人 <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                    <SelectTrigger id="candidateId">
                      <SelectValue placeholder="选择候选人" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          <div className="flex items-center gap-2">
                            <span>{candidate.name}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-muted-foreground">{candidate.email}</span>
                            {candidate.currentPosition && (
                              <>
                                <span className="text-muted-foreground">|</span>
                                <Badge variant="secondary" className="text-xs">
                                  {candidate.currentPosition}
                                </Badge>
                              </>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 面试官选择 */}
                <div className="space-y-2">
                  <Label htmlFor="interviewerId">
                    面试官 <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedInterviewerId} onValueChange={setSelectedInterviewerId}>
                    <SelectTrigger id="interviewerId">
                      <SelectValue placeholder="选择面试官" />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-muted-foreground">{user.email}</span>
                            <Badge variant="outline" className="text-xs">{user.role}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 关联岗位 */}
                <div className="space-y-2">
                  <Label htmlFor="jobId">关联岗位（可选）</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger id="jobId">
                      <SelectValue placeholder="选择关联的岗位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_JOB_VALUE}>不关联岗位</SelectItem>
                      {jobPostings.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex items-center gap-2">
                            <span>{job.title}</span>
                            <span className="text-muted-foreground">-</span>
                            <Badge variant="secondary" className="text-xs">{job.department}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 面试安排卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  面试安排
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 面试类型 */}
                <div className="space-y-2">
                  <Label htmlFor="interviewType">
                    面试类型 <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {interviewTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setInterviewType(type.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          interviewType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{type.duration}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 面试时间 */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">
                    面试时间 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                  />
                </div>

                {/* 备注 */}
                <div className="space-y-2">
                  <Label htmlFor="notes">面试备注</Label>
                  <Textarea
                    id="notes"
                    placeholder="面试准备事项、需要关注的问题、特殊说明等..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-between">
              <Button variant="outline" type="button" asChild>
                <Link href="/interviews">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  取消
                </Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    安排面试
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 右侧 - 预览 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">面试预览</CardTitle>
                <CardDescription>确认面试安排信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCandidate ? (
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {selectedCandidate.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{selectedCandidate.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCandidate.email}</p>
                      </div>
                    </div>
                    {selectedCandidate.currentPosition && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCandidate.currentPosition}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted text-center text-muted-foreground">
                    请选择候选人
                  </div>
                )}

                {selectedType && (
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedType.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedType.duration}
                    </Badge>
                  </div>
                )}

                {scheduledAt && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(scheduledAt).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 面试流程说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">面试流程</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { step: 1, text: '安排面试并通知相关人员' },
                    { step: 2, text: '面试完成后记录反馈' },
                    { step: 3, text: '综合评估候选人' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {item.step}
                      </div>
                      <span className="text-sm text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
