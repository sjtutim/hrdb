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
  notes: string | null;
  status: string;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  interviewer: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function RescheduleInterviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // 表单状态
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>('');
  const [interviewType, setInterviewType] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取面试详情
        const interviewResponse = await fetch(`/api/interviews/${params.id}`);
        if (!interviewResponse.ok) {
          throw new Error('获取面试详情失败');
        }
        const interviewData = await interviewResponse.json();
        
        // 检查面试状态
        if (interviewData.status !== 'SCHEDULED') {
          throw new Error('只能重新安排未完成的面试');
        }
        
        setInterview(interviewData);
        
        // 初始化表单状态
        setSelectedInterviewerId(interviewData.interviewerId);
        setInterviewType(interviewData.type);
        
        // 格式化日期时间为本地格式
        const scheduledDate = new Date(interviewData.scheduledAt);
        setScheduledAt(scheduledDate.toISOString().slice(0, 16));
        
        setNotes(interviewData.notes || '');
        
        // 获取面试官列表
        const usersResponse = await fetch('/api/users');
        if (!usersResponse.ok) {
          throw new Error('获取用户列表失败');
        }
        const usersData = await usersResponse.json();
        setInterviewers(usersData);
      } catch (err) {
        console.error('获取数据错误:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInterviewerId || !interviewType || !scheduledAt) {
      setError('请填写所有必填字段');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/interviews/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interviewerId: selectedInterviewerId,
          type: interviewType,
          scheduledAt,
          notes,
          status: 'RESCHEDULED',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '重新安排面试失败');
      }
      
      // 更新成功，跳转到面试详情页
      router.push(`/interviews/${params.id}`);
    } catch (err) {
      console.error('重新安排面试错误:', err);
      setError(err instanceof Error ? err.message : '重新安排面试失败');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">重新安排面试</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">重新安排面试</h1>
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">重新安排面试</h1>
        <Link href={`/interviews/${interview.id}`} className="btn-secondary">
          返回面试详情
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            为 {interview.candidate.name} 重新安排面试
          </h2>
          <p className="text-gray-600">
            原面试时间: {new Date(interview.scheduledAt).toLocaleString('zh-CN')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="interviewerId" className="block text-gray-700 font-medium mb-2">
              面试官 <span className="text-red-500">*</span>
            </label>
            <select
              id="interviewerId"
              className="form-input"
              value={selectedInterviewerId}
              onChange={(e) => setSelectedInterviewerId(e.target.value)}
              required
            >
              <option value="">选择面试官</option>
              {interviewers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="interviewType" className="block text-gray-700 font-medium mb-2">
              面试类型 <span className="text-red-500">*</span>
            </label>
            <select
              id="interviewType"
              className="form-input"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              required
            >
              <option value="">选择面试类型</option>
              <option value="PHONE">电话面试</option>
              <option value="TECHNICAL">技术面试</option>
              <option value="HR">HR面试</option>
              <option value="MANAGER">主管面试</option>
              <option value="PERSONALITY">性格测试</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="scheduledAt" className="block text-gray-700 font-medium mb-2">
              新面试时间 <span className="text-red-500">*</span>
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              className="form-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="notes" className="block text-gray-700 font-medium mb-2">
              备注
            </label>
            <textarea
              id="notes"
              className="form-input h-32"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="面试准备事项、需要关注的问题等"
            />
          </div>
          
          <div className="flex justify-end">
            <Link href={`/interviews/${interview.id}`} className="btn-secondary mr-4">
              取消
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认重新安排'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
