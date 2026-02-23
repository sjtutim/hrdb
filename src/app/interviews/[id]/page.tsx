'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';

interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  type: string;
  scheduledAt: string;
  completedAt: string | null;
  notes: string | null;
  feedback: string | null;
  status: string;
  decision: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    currentPosition: string | null;
    currentCompany: string | null;
    tags: {
      id: string;
      name: string;
    }[];
  };
  interviews: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  scores: {
    id: string;
    category: string;
    score: number;
    notes: string | null;
    interviewer?: {
      id: string;
      name: string;
    };
  }[];
}

// 评分类别
const SCORE_CATEGORIES: Record<string, string[]> = {
  PHONE: ['沟通能力', '语言表达', '基本素质', '职业匹配度'],
  TECHNICAL: ['专业知识', '解决问题能力', '代码质量', '技术视野', '学习能力'],
  HR: ['沟通能力', '团队协作', '职业规划', '文化匹配度', '薪资期望'],
  MANAGER: ['领导能力', '项目经验', '决策能力', '沟通能力', '团队管理'],
  PERSONALITY: ['性格特质', '压力承受能力', '适应性', '价值观匹配度'],
};

export default function InterviewDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { data: session } = useSession();
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreForm, setScoreForm] = useState<{ category: string; score: number; notes: string }[]>([]);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreSuccess, setScoreSuccess] = useState(false);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/interviews/${params.id}`);
        if (!response.ok) {
          throw new Error('获取面试详情失败');
        }
        const data = await response.json();
        setInterview(data);
      } catch (err) {
        console.error('获取面试详情错误:', err);
        setError(err instanceof Error ? err.message : '获取面试详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [params.id]);

  // 获取状态显示名称
  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      SCHEDULED: '已安排',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
      RESCHEDULED: '已重新安排',
    };
    return statusMap[status] || status;
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      RESCHEDULED: 'bg-yellow-100 text-yellow-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // 获取面试类型显示名称
  const getTypeDisplayName = (type: string) => {
    const typeMap: Record<string, string> = {
      PHONE: '线上面试',
      TECHNICAL: '技术面试',
      HR: 'HR面试',
      MANAGER: '主管面试',
      PERSONALITY: '性格测试',
    };
    return typeMap[type] || type;
  };

  // 获取决定显示名称
  const getDecisionDisplayName = (decision: string | null) => {
    if (!decision) return '未决定';

    const decisionMap: Record<string, string> = {
      PASS: '通过',
      FAIL: '不通过',
      HOLD: '待定',
    };
    return decisionMap[decision] || decision;
  };

  // 获取决定标签颜色
  const getDecisionColor = (decision: string | null) => {
    if (!decision) return 'bg-gray-100 text-gray-800';

    const colorMap: Record<string, string> = {
      PASS: 'bg-green-100 text-green-800',
      FAIL: 'bg-red-100 text-red-800',
      HOLD: 'bg-yellow-100 text-yellow-800',
    };
    return colorMap[decision] || 'bg-gray-100 text-gray-800';
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 计算平均分
  // 计算总评分：每个面试官的平均分的平均值
  const calculateAverageScore = (scores: Interview['scores']) => {
    if (!scores || scores.length === 0) return null;

    // 按面试官分组
    const scoresByInterviewer = new Map<string, number[]>();
    scores.forEach((score) => {
      const interviewerId = score.interviewer?.id || 'unknown';
      if (!scoresByInterviewer.has(interviewerId)) {
        scoresByInterviewer.set(interviewerId, []);
      }
      scoresByInterviewer.get(interviewerId)!.push(score.score);
    });

    // 计算每个面试官的平均分
    const interviewerAverages: number[] = [];
    scoresByInterviewer.forEach((scoreList) => {
      const sum = scoreList.reduce((a, b) => a + b, 0);
      interviewerAverages.push(sum / scoreList.length);
    });

    // 计算所有面试官平均分的平均值
    if (interviewerAverages.length === 0) return null;
    const total = interviewerAverages.reduce((sum, avg) => sum + avg, 0);
    return total / interviewerAverages.length;
  };

  // 获取当前用户是否已评分
  const hasCurrentUserScored = () => {
    if (!session?.user?.id || !interview?.scores) return false;
    return interview.scores.some(
      (score) => score.interviewer?.id === session.user.id
    );
  };

  // 初始化评分表单
  const initScoreForm = () => {
    const categories = SCORE_CATEGORIES[interview?.type || ''] || [];
    setScoreForm(
      categories.map((category) => ({
        category,
        score: 3,
        notes: '',
      }))
    );
    setShowScoreForm(true);
  };

  // 提交评分
  const handleSubmitScore = async () => {
    if (!scoreForm.length) return;
    setIsSubmittingScore(true);
    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: scoreForm }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交评分失败');
      }

      const updatedInterview = await response.json();
      setInterview(updatedInterview);
      setShowScoreForm(false);
      setScoreSuccess(true);
      setTimeout(() => setScoreSuccess(false), 3000);
    } catch (err) {
      console.error('提交评分错误:', err);
      alert(err instanceof Error ? err.message : '提交评分失败');
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // 删除面试
  const handleDelete = async () => {
    if (!confirm('确定要删除此面试吗？此操作不可恢复。')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除面试失败');
      }

      router.push('/interviews');
    } catch (err) {
      console.error('删除面试错误:', err);
      alert(err instanceof Error ? err.message : '删除面试失败');
      setIsDeleting(false);
    }
  };

  // 保存面试记录
  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes }),
      });

      if (!response.ok) {
        throw new Error('保存面试记录失败');
      }

      const updatedInterview = await response.json();
      setInterview(updatedInterview);
      setIsEditingNotes(false);
    } catch (err) {
      console.error('保存面试记录错误:', err);
      alert(err instanceof Error ? err.message : '保存面试记录失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 保存面试反馈
  const handleSaveFeedback = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: editFeedback }),
      });

      if (!response.ok) {
        throw new Error('保存面试反馈失败');
      }

      const updatedInterview = await response.json();
      setInterview(updatedInterview);
      setIsEditingFeedback(false);
    } catch (err) {
      console.error('保存面试反馈错误:', err);
      alert(err instanceof Error ? err.message : '保存面试反馈失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 开始编辑面试记录
  const startEditNotes = () => {
    setEditNotes(interview?.notes || '');
    setIsEditingNotes(true);
  };

  // 开始编辑面试反馈
  const startEditFeedback = () => {
    setEditFeedback(interview?.feedback || '');
    setIsEditingFeedback(true);
  };

  // 开始编辑面试时间
  const startEditTime = () => {
    if (!interview) return;
    setEditScheduledAt(new Date(interview.scheduledAt).toISOString().slice(0, 16));
    setIsEditingTime(true);
  };

  // 保存面试时间
  const handleSaveTime = async () => {
    if (!editScheduledAt) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: editScheduledAt }),
      });
      if (!response.ok) throw new Error('保存面试时间失败');
      const updatedInterview = await response.json();
      setInterview(updatedInterview);
      setIsEditingTime(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存面试时间失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">面试详情</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">面试详情</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-red-500">{error || '面试不存在'}</p>
          <div className="text-center mt-4">
            <Link href="/interviews" className="btn-primary">
              返回面试列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const averageScore = calculateAverageScore(interview.scores);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">面试详情</h1>
        <div className="flex space-x-4">
          <Link href="/interviews" className="btn-secondary">
            返回列表
          </Link>
          {interview.status === 'SCHEDULED' && (
            <Link href={`/interviews/${interview.id}/complete`} className="btn-primary">
              记录结果
            </Link>
          )}
          {session && !hasCurrentUserScored() && (
            <button onClick={initScoreForm} className="btn-primary">
              添加评分
            </button>
          )}
          {session && hasCurrentUserScored() && (
            <button onClick={initScoreForm} className="btn-secondary">
              修改评分
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              {interview.candidate.name} - {getTypeDisplayName(interview.type)}
            </h2>
            <div className="flex items-center space-x-4 mb-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                  interview.status
                )}`}
              >
                {getStatusDisplayName(interview.status)}
              </span>
              {interview.decision && (
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getDecisionColor(
                    interview.decision
                  )}`}
                >
                  {getDecisionDisplayName(interview.decision)}
                </span>
              )}
            </div>
            <div className="text-gray-600 flex items-center gap-2">
              <span>面试时间:</span>
              {isEditingTime ? (
                <span className="inline-flex items-center gap-1.5">
                  <input
                    type="datetime-local"
                    className="px-2 py-0.5 border rounded text-sm"
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                  />
                  <button
                    onClick={handleSaveTime}
                    disabled={isSaving}
                    className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? '...' : '保存'}
                  </button>
                  <button
                    onClick={() => setIsEditingTime(false)}
                    className="px-2 py-0.5 border text-xs rounded hover:bg-gray-50"
                  >
                    取消
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span>{formatDateTime(interview.scheduledAt)}</span>
                  {interview.status === 'SCHEDULED' && (
                    <button
                      onClick={startEditTime}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="修改面试时间"
                    >
                      修改
                    </button>
                  )}
                </span>
              )}
            </div>
            {interview.completedAt && (
              <p className="text-gray-600">
                完成时间: {formatDateTime(interview.completedAt)}
              </p>
            )}
          </div>
          {averageScore !== null && (
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-gray-600 text-sm">平均评分</p>
              <p className="text-3xl font-bold text-blue-600">{averageScore.toFixed(1)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium mb-2">候选人信息</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-2">
                <span className="font-medium">姓名:</span> {interview.candidate.name}
              </p>
              <p className="mb-2">
                <span className="font-medium">邮箱:</span> {interview.candidate.email}
              </p>
              {interview.candidate.phone && (
                <p className="mb-2">
                  <span className="font-medium">电话:</span> {interview.candidate.phone}
                </p>
              )}
              {interview.candidate.currentPosition && (
                <p className="mb-2">
                  <span className="font-medium">当前职位:</span> {interview.candidate.currentPosition}
                </p>
              )}
              {interview.candidate.currentCompany && (
                <p className="mb-2">
                  <span className="font-medium">上一供职单位:</span> {interview.candidate.currentCompany}
                </p>
              )}
              {interview.candidate.tags && interview.candidate.tags.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium">标签:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {interview.candidate.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4">
                <Link
                  href={`/candidates/${interview.candidate.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  查看完整候选人资料 →
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">面试官信息</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              {interview.interviews.map((interviewer) => (
                <div key={interviewer.id} className="flex items-center gap-2">
                  <span className="font-medium">{interviewer.name}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground text-sm">{interviewer.email}</span>
                  <span className="text-muted-foreground text-sm">({interviewer.role})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 面试准备笔记 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">面试准备笔记</h3>
            {!isEditingNotes && interview.status === 'SCHEDULED' && (
              <button onClick={startEditNotes} className="text-sm text-blue-600 hover:text-blue-800">
                {interview.notes ? '编辑' : '添加'}
              </button>
            )}
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                className="w-full p-3 border rounded-lg min-h-[100px]"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="记录面试准备事项、需要关注的问题等..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : interview.notes ? (
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {interview.notes}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">暂无笔记</p>
          )}
        </div>

        {/* 面试反馈 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">面试反馈</h3>
            {!isEditingFeedback && interview.status === 'COMPLETED' && (
              <button onClick={startEditFeedback} className="text-sm text-blue-600 hover:text-blue-800">
                {interview.feedback ? '编辑' : '添加'}
              </button>
            )}
          </div>
          {isEditingFeedback ? (
            <div className="space-y-2">
              <textarea
                className="w-full p-3 border rounded-lg min-h-[100px]"
                value={editFeedback}
                onChange={(e) => setEditFeedback(e.target.value)}
                placeholder="记录面试反馈、候选人表现、优缺点等..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveFeedback}
                  disabled={isSaving}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setIsEditingFeedback(false)}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : interview.feedback ? (
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {interview.feedback}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">暂无反馈</p>
          )}
        </div>

        {interview.scores && interview.scores.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">评分详情</h3>
            {/* 按面试官分组显示评分 */}
            {(() => {
              // 按面试官分组
              const scoresByInterviewer: Record<string, {
                interviewer: { id: string; name: string };
                scores: Interview['scores'];
              }> = {};

              interview.scores.forEach((score) => {
                const interviewerId = score.interviewer?.id || 'unknown';
                if (!scoresByInterviewer[interviewerId]) {
                  scoresByInterviewer[interviewerId] = {
                    interviewer: score.interviewer || { id: interviewerId, name: '未知面试官' },
                    scores: [],
                  };
                }
                scoresByInterviewer[interviewerId].scores.push(score);
              });

              const groups = Object.values(scoresByInterviewer);

              // 计算每个面试官的平均分
              const calculateGroupAverage = (scores: Interview['scores']) => {
                if (!scores || scores.length === 0) return null;
                const total = scores.reduce((sum, s) => sum + s.score, 0);
                return total / scores.length;
              };

              return (
                <div className="space-y-4">
                  {groups.map((group) => {
                    const avgScore = calculateGroupAverage(group.scores);
                    return (
                      <div key={group.interviewer.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{group.interviewer.name}</span>
                            <span className="text-sm text-muted-foreground">的评分</span>
                          </div>
                          {avgScore !== null && (
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${avgScore >= 4 ? 'bg-green-100 text-green-800' :
                              avgScore >= 3 ? 'bg-blue-100 text-blue-800' :
                                avgScore >= 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                              }`}>
                              平均: {avgScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.scores.map((score) => (
                            <div key={score.id} className="border-b border-gray-200 pb-2 last:border-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">{score.category}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${score.score >= 4 ? 'bg-green-100 text-green-800' :
                                  score.score >= 3 ? 'bg-blue-100 text-blue-800' :
                                    score.score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                  }`}>
                                  {score.score.toFixed(1)}
                                </span>
                              </div>
                              {score.notes && (
                                <p className="text-xs text-gray-600">{score.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* 评分表单 Dialog */}
        <Dialog open={showScoreForm} onOpenChange={setShowScoreForm}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {hasCurrentUserScored() ? '修改评分' : '添加评分'}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto py-4">
              {scoreSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  评分提交成功！
                </div>
              )}
              <div className="space-y-4">
                {scoreForm.map((item, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                      <label className="font-medium">
                        {item.category}
                      </label>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`w-8 h-8 rounded-full mx-0.5 flex items-center justify-center text-sm ${item.score === value
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            onClick={() => {
                              const newForm = [...scoreForm];
                              newForm[index].score = value;
                              setScoreForm(newForm);
                            }}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full p-2 border rounded text-sm"
                      placeholder={`关于${item.category}的具体评价...`}
                      value={item.notes}
                      onChange={(e) => {
                        const newForm = [...scoreForm];
                        newForm[index].notes = e.target.value;
                        setScoreForm(newForm);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowScoreForm(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={isSubmittingScore}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isSubmittingScore ? '提交中...' : '提交评分'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-between mt-8">
          <div>
            {interview.status === 'SCHEDULED' && (
              <div className="flex space-x-4">
                <Link
                  href={`/interviews/${interview.id}/reschedule`}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  重新安排面试
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-800"
                >
                  {isDeleting ? '删除中...' : '删除面试'}
                </button>
              </div>
            )}
          </div>
          <div>
            {interview.status === 'SCHEDULED' && (
              <Link href={`/interviews/${interview.id}/complete`} className="btn-primary">
                记录结果
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
