'use client';

import { useState, useEffect } from 'react';
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
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  tags: Tag[];
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED'>('ALL');

  // 获取所有职位
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/job-postings');
        if (!response.ok) {
          throw new Error('获取职位列表失败');
        }
        const data = await response.json();
        setJobs(data);
      } catch (err) {
        console.error('获取职位错误:', err);
        setError(err instanceof Error ? err.message : '获取职位列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // 根据状态筛选职位
  const filteredJobs = filter === 'ALL' 
    ? jobs 
    : jobs.filter(job => job.status === filter);

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">职位管理</h1>
        <Link 
          href="/jobs/create" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          发布新职位
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-md ${
                filter === 'ALL' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md ${
                filter === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              激活
            </button>
            <button
              onClick={() => setFilter('DRAFT')}
              className={`px-3 py-1 rounded-md ${
                filter === 'DRAFT' 
                  ? 'bg-gray-100 text-gray-800 border border-gray-300' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              草稿
            </button>
            <button
              onClick={() => setFilter('PAUSED')}
              className={`px-3 py-1 rounded-md ${
                filter === 'PAUSED' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              暂停
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {error}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            没有找到符合条件的职位
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    职位名称
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部门
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    截止日期
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{job.title}</div>
                      <div className="text-xs text-gray-500">
                        创建于 {format(new Date(job.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{job.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusDisplay(job.status).className}`}>
                        {getStatusDisplay(job.status).text}
                      </span>
                      {isExpired(job.expiresAt) && (
                        <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          已过期
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {job.tags.slice(0, 3).map((tag) => (
                          <span key={tag.id} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {tag.name}
                          </span>
                        ))}
                        {job.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            +{job.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isExpired(job.expiresAt) ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatDate(job.expiresAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                        查看
                      </Link>
                      <Link href={`/jobs/${job.id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        编辑
                      </Link>
                      <Link href={`/jobs/${job.id}/matches`} className="text-green-600 hover:text-green-900">
                        匹配
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
