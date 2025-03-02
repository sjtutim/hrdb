'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  interviewer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  scores: {
    id: string;
    category: string;
    score: number;
    notes: string | null;
  }[];
}

export default function InterviewDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      PHONE: '电话面试',
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
  const calculateAverageScore = (scores: Interview['scores']) => {
    if (!scores || scores.length === 0) return null;
    
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
    return totalScore / scores.length;
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
            <p className="text-gray-600">
              面试时间: {formatDateTime(interview.scheduledAt)}
            </p>
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
                  <span className="font-medium">当前公司:</span> {interview.candidate.currentCompany}
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-2">
                <span className="font-medium">姓名:</span> {interview.interviewer.name}
              </p>
              <p className="mb-2">
                <span className="font-medium">邮箱:</span> {interview.interviewer.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">角色:</span> {interview.interviewer.role}
              </p>
            </div>
          </div>
        </div>

        {interview.notes && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">面试准备笔记</h3>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {interview.notes}
            </div>
          </div>
        )}

        {interview.feedback && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">面试反馈</h3>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {interview.feedback}
            </div>
          </div>
        )}

        {interview.scores && interview.scores.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">评分详情</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interview.scores.map((score) => (
                  <div key={score.id} className="border-b pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{score.category}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        score.score >= 4 ? 'bg-green-100 text-green-800' :
                        score.score >= 3 ? 'bg-blue-100 text-blue-800' :
                        score.score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {score.score.toFixed(1)}
                      </span>
                    </div>
                    {score.notes && (
                      <p className="text-sm text-gray-600">{score.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
