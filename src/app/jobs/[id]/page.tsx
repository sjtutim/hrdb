'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 职位类型定义
interface Tag {
  id: string;
  name: string;
  category: string;
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  tags: Tag[];
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  // 人才匹配相关状态（已移除，使用统一的 /matching 页面）

  // 获取职位详情
  useEffect(() => {
    const fetchJobDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/job-postings/${params.id}`);
        if (!response.ok) {
          throw new Error('获取职位详情失败');
        }
        const data = await response.json();
        setJob(data);
      } catch (err) {
        console.error('获取职位详情错误:', err);
        setError(err instanceof Error ? err.message : '获取职位详情失败');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchJobDetail();
    }
  }, [params.id]);

  // 更新职位状态
  const updateJobStatus = async (newStatus: 'DRAFT' | 'ACTIVE' | 'PAUSED') => {
    if (!job) return;
    
    try {
      setUpdateStatus({ loading: true, error: null });
      const response = await fetch(`/api/job-postings/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('更新职位状态失败');
      }
      
      const updatedJob = await response.json();
      setJob(updatedJob);
    } catch (err) {
      console.error('更新职位状态错误:', err);
      setUpdateStatus({ 
        loading: false, 
        error: err instanceof Error ? err.message : '更新职位状态失败' 
      });
    } finally {
      setUpdateStatus({ loading: false, error: null });
    }
  };

  // 获取状态显示文本和样式
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      DRAFT: { text: '草稿', className: 'bg-gray-100 text-gray-800' },
      ACTIVE: { text: '激活', className: 'bg-green-100 text-green-800' },
      PAUSED: { text: '暂停', className: 'bg-yellow-100 text-yellow-800' },
    };
    return statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
  };

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '无截止日期';
    return format(new Date(dateString), 'yyyy年MM月dd日', { locale: zhCN });
  };

  // 检查职位是否过期
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // 按类别分组标签
  const groupedTags = job?.tags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>) || {};

  // 获取标签类别显示名称
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      SKILL: '技能',
      INDUSTRY: '行业',
      EDUCATION: '教育',
      EXPERIENCE: '经验',
      PERSONALITY: '性格特质',
      OTHER: '其他',
    };
    return categoryMap[category] || category;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">加载中...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 p-4 rounded-md text-red-700 mb-4">
          {error || '职位不存在'}
        </div>
        <Link href="/jobs" className="text-blue-600 hover:underline">
          返回职位列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/jobs" className="text-blue-600 hover:underline mb-2 inline-block">
            &larr; 返回职位列表
          </Link>
          <h1 className="text-2xl font-bold">{job.title}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/jobs/${job.id}/edit`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
          >
            编辑
          </Link>
          <Link
            href={`/matching?jobPostingId=${job.id}`}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center gap-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            人才匹配
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between mb-6">
          <div>
            <div className="flex items-center mb-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusDisplay(job.status).className} mr-2`}>
                {getStatusDisplay(job.status).text}
              </span>
              {isExpired(job.expiresAt) && (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                  已过期
                </span>
              )}
            </div>
            <p className="text-gray-600">部门: {job.department}</p>
            <p className="text-gray-600">
              创建于: {format(new Date(job.createdAt), 'yyyy年MM月dd日', { locale: zhCN })}
            </p>
            <p className="text-gray-600">
              截止日期: {formatDate(job.expiresAt)}
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => updateJobStatus('ACTIVE')}
              disabled={job.status === 'ACTIVE' || updateStatus.loading}
              className={`px-3 py-1 rounded-md text-sm ${
                job.status === 'ACTIVE' || updateStatus.loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              激活职位
            </button>
            <button
              onClick={() => updateJobStatus('PAUSED')}
              disabled={job.status === 'PAUSED' || updateStatus.loading}
              className={`px-3 py-1 rounded-md text-sm ${
                job.status === 'PAUSED' || updateStatus.loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              }`}
            >
              暂停职位
            </button>
            <button
              onClick={() => updateJobStatus('DRAFT')}
              disabled={job.status === 'DRAFT' || updateStatus.loading}
              className={`px-3 py-1 rounded-md text-sm ${
                job.status === 'DRAFT' || updateStatus.loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              设为草稿
            </button>
          </div>
        </div>

        {updateStatus.error && (
          <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md">
            {updateStatus.error}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">职位标签</h2>
          {Object.entries(groupedTags).length > 0 ? (
            Object.entries(groupedTags).map(([category, tags]) => (
              <div key={category} className="mb-2">
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  {getCategoryDisplayName(category)}:
                </h3>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag.id} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">暂无标签</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">岗位描述</h2>
          <div className="bg-gray-50 p-4 rounded-md whitespace-pre-line">
            {job.description}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">岗位要求</h2>
          <div className="bg-gray-50 p-4 rounded-md whitespace-pre-line">
            {job.requirements}
          </div>
        </div>
      </div>
    </div>
  );
}
