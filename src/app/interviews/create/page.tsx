'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

export default function CreateInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // 表单状态
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [interviewType, setInterviewType] = useState<string>('PHONE');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取候选人列表
        const candidatesResponse = await fetch('/api/candidates');
        if (!candidatesResponse.ok) {
          throw new Error('获取候选人列表失败');
        }
        const candidatesData = await candidatesResponse.json();
        setCandidates(candidatesData);
        
        // 获取面试官列表
        const usersResponse = await fetch('/api/users');
        if (!usersResponse.ok) {
          throw new Error('获取用户列表失败');
        }
        const usersData = await usersResponse.json();
        setInterviewers(usersData);
        
        // 获取岗位列表
        const jobsResponse = await fetch('/api/job-postings');
        if (!jobsResponse.ok) {
          throw new Error('获取岗位列表失败');
        }
        const jobsData = await jobsResponse.json();
        setJobPostings(jobsData);
        
        // 检查URL参数
        const candidateId = searchParams.get('candidateId');
        const jobId = searchParams.get('jobId');
        
        if (candidateId) {
          setSelectedCandidateId(candidateId);
        }
        
        if (jobId) {
          setSelectedJobId(jobId);
        }
        
        // 设置默认面试时间（当前时间后24小时）
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 1);
        defaultDate.setMinutes(0);
        defaultDate.setSeconds(0);
        setScheduledAt(defaultDate.toISOString().slice(0, 16));
      } catch (err) {
        console.error('获取数据错误:', err);
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      const interview = await response.json();
      
      // 创建成功，跳转到面试列表页
      router.push('/interviews');
    } catch (err) {
      console.error('创建面试错误:', err);
      setError(err instanceof Error ? err.message : '创建面试失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">安排面试</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">安排面试</h1>
        <Link href="/interviews" className="btn-secondary">
          返回面试列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="candidateId" className="block text-gray-700 font-medium mb-2">
              候选人 <span className="text-red-500">*</span>
            </label>
            <select
              id="candidateId"
              className="form-input"
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              required
            >
              <option value="">选择候选人</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} - {candidate.email} {candidate.currentPosition && `(${candidate.currentPosition})`}
                </option>
              ))}
            </select>
          </div>
          
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
            <label htmlFor="jobId" className="block text-gray-700 font-medium mb-2">
              关联岗位
            </label>
            <select
              id="jobId"
              className="form-input"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="">选择岗位（可选）</option>
              {jobPostings.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.department}
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
              <option value="PHONE">电话面试</option>
              <option value="TECHNICAL">技术面试</option>
              <option value="HR">HR面试</option>
              <option value="MANAGER">主管面试</option>
              <option value="PERSONALITY">性格测试</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="scheduledAt" className="block text-gray-700 font-medium mb-2">
              面试时间 <span className="text-red-500">*</span>
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
            <Link href="/interviews" className="btn-secondary mr-4">
              取消
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '安排面试'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
