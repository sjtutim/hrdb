'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ArrowLeft,
  Clock,
  User,
  Briefcase,
  Save,
  Loader2,
  AlertCircle,
  MapPin,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';

interface Interview {
  id: string;
  candidateId: string;
  type: string;
  scheduledAt: string;
  location: string | null;
  notes: string | null;
  status: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    currentPosition?: string | null;
  };
  interviews: {
    id: string;
    name: string;
  }[];
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const interviewTypes = [
  { value: 'PHONE', label: '线上面试', duration: '30分钟' },
  { value: 'TECHNICAL', label: '技术面试', duration: '60-90分钟' },
  { value: 'HR', label: 'HR面试', duration: '30-45分钟' },
  { value: 'MANAGER', label: '主管面试', duration: '45-60分钟' },
  { value: 'PERSONALITY', label: '性格测试', duration: '20-30分钟' },
];

export default function RescheduleInterviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [interviewers, setInterviewers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 表单状态
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  const [interviewType, setInterviewType] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [interviewRes, usersRes] = await Promise.all([
          fetch(`/api/interviews/${params.id}`),
          fetch('/api/users'),
        ]);

        if (!interviewRes.ok) throw new Error('获取面试详情失败');
        if (!usersRes.ok) throw new Error('获取用户列表失败');

        const [interviewData, usersData] = await Promise.all([
          interviewRes.json(),
          usersRes.json(),
        ]);

        if (interviewData.status !== 'SCHEDULED') {
          throw new Error('只能重新安排未完成的面试');
        }

        setInterview(interviewData);
        setInterviewers(usersData);

        // 初始化表单
        setSelectedInterviewerIds(
          interviewData.interviews?.map((i: { id: string }) => i.id) || []
        );
        setInterviewType(interviewData.type);
        setScheduledAt(new Date(interviewData.scheduledAt).toISOString().slice(0, 16));
        setLocation(interviewData.location || '');
        setNotes(interviewData.notes || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedInterviewerIds.length === 0 || !interviewType || !scheduledAt) {
      setError('请填写所有必填字段');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewerIds: selectedInterviewerIds,
          type: interviewType,
          scheduledAt,
          location,
          notes,
          status: 'SCHEDULED',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '重新安排面试失败');
      }

      router.push(`/interviews/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新安排面试失败');
      setSubmitting(false);
    }
  };

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

  if (error && !interview) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/interviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">重新安排面试</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/interviews">返回面试列表</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/interviews/${params.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">重新安排面试</h1>
          <p className="text-sm text-muted-foreground">
            为 {interview?.candidate.name} 重新安排面试时间
          </p>
        </div>
      </div>

      {/* 原面试信息提示 */}
      {interview && (
        <div className="flex items-center gap-3 p-3 mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span>
            原面试时间：{new Date(interview.scheduledAt).toLocaleString('zh-CN')}
            {interview.location && `，地点：${interview.location}`}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 主要信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 面试官选择 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  面试信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 候选人（只读） */}
                <div className="space-y-2">
                  <Label>候选人</Label>
                  <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {interview?.candidate.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{interview?.candidate.name}</p>
                      <p className="text-xs text-muted-foreground">{interview?.candidate.email}</p>
                    </div>
                  </div>
                </div>

                {/* 面试官选择 */}
                <div className="space-y-2">
                  <Label>
                    面试官 <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {interviewers.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`interviewer-${user.id}`}
                          checked={selectedInterviewerIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedInterviewerIds([...selectedInterviewerIds, user.id]);
                            } else {
                              setSelectedInterviewerIds(selectedInterviewerIds.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`interviewer-${user.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {user.name}
                          <span className="text-muted-foreground text-xs ml-1">({user.role})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedInterviewerIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">请至少选择一位面试官</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 面试安排 */}
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
                  <Label>
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

                {/* 面试地点 */}
                <div className="space-y-2">
                  <Label htmlFor="location">面试地点</Label>
                  <Input
                    id="location"
                    placeholder="如：会议室A、线上（腾讯会议）、电话等"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
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
                <Link href={`/interviews/${params.id}`}>
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
                    确认重新安排
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
                {interview?.candidate && (
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {interview.candidate.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{interview.candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{interview.candidate.email}</p>
                      </div>
                    </div>
                    {interview.candidate.currentPosition && (
                      <Badge variant="secondary" className="text-xs">
                        {interview.candidate.currentPosition}
                      </Badge>
                    )}
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

                {location && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{location}</span>
                  </div>
                )}

                {selectedInterviewerIds.length > 0 && (
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">面试官</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedInterviewerIds.map(id => {
                        const interviewer = interviewers.find(u => u.id === id);
                        return interviewer ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {interviewer.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
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
                    { step: 1, text: '重新安排面试并通知相关人员' },
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
