'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  tags: { id: string; name: string; category: string }[];
}

export default function JobPostingsPage() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchJobPostings = async () => {
      try {
        const response = await fetch('/api/job-postings');
        if (!response.ok) {
          throw new Error('获取岗位列表失败');
        }
        const data = await response.json();
        setJobPostings(data);
      } catch (err) {
        console.error('获取岗位列表错误:', err);
        setError(err instanceof Error ? err.message : '获取岗位列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchJobPostings();
  }, []);

  // 过滤岗位
  const filteredJobPostings = jobPostings.filter((job) => {
    // 状态过滤
    if (statusFilter !== 'ALL' && job.status !== statusFilter) {
      return false;
    }
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        job.title.toLowerCase().includes(searchLower) ||
        job.department.toLowerCase().includes(searchLower) ||
        job.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // 获取状态显示名称
  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: '草稿',
      ACTIVE: '激活',
      PAUSED: '暂停',
      FILLED: '已招满',
      EXPIRED: '已过期',
    };
    return statusMap[status] || status;
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      FILLED: 'bg-blue-100 text-blue-800',
      EXPIRED: 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '无';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">岗位管理</h1>
        <Link href="/job-postings/create" className="btn-primary">
          创建岗位
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="搜索岗位名称、部门或标签..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">所有状态</option>
              <option value="DRAFT">草稿</option>
              <option value="ACTIVE">激活</option>
              <option value="PAUSED">暂停</option>
              <option value="FILLED">已招满</option>
              <option value="EXPIRED">已过期</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : filteredJobPostings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无岗位数据</p>
            <Link href="/job-postings/create" className="btn-primary inline-block mt-4">
              创建岗位
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    岗位名称
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部门
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    截止日期
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobPostings.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {job.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        创建于: {formatDate(job.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {job.department}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {job.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                          >
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
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          job.status
                        )}`}
                      >
                        {getStatusDisplayName(job.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(job.expiresAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/job-postings/${job.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        查看
                      </Link>
                      <Link
                        href={`/job-postings/${job.id}/edit`}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        编辑
                      </Link>
                      <Link
                        href={`/job-postings/${job.id}/matches`}
                        className="text-purple-600 hover:text-purple-900"
                      >
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
