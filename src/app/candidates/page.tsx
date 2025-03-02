'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  currentPosition: string | null;
  currentCompany: string | null;
  totalScore: number | null;
  status: string;
  tags: { id: string; name: string; category: string }[];
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/candidates');
        if (!response.ok) {
          throw new Error('获取候选人列表失败');
        }
        const data = await response.json();
        setCandidates(data);
      } catch (err) {
        console.error('获取候选人列表错误:', err);
        setError(err instanceof Error ? err.message : '获取候选人列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // 过滤候选人
  const filteredCandidates = candidates.filter((candidate) => {
    // 状态过滤
    if (statusFilter !== 'ALL' && candidate.status !== statusFilter) {
      return false;
    }
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        candidate.name.toLowerCase().includes(searchLower) ||
        candidate.email.toLowerCase().includes(searchLower) ||
        (candidate.currentPosition && candidate.currentPosition.toLowerCase().includes(searchLower)) ||
        (candidate.currentCompany && candidate.currentCompany.toLowerCase().includes(searchLower)) ||
        candidate.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // 获取状态显示名称
  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      NEW: '新建档案',
      SCREENING: '筛选中',
      INTERVIEWING: '面试中',
      OFFERED: '已发offer',
      ONBOARDING: '入职中',
      PROBATION: '试用期',
      EMPLOYED: '已正式入职',
      REJECTED: '已拒绝',
      ARCHIVED: '已归档',
    };
    return statusMap[status] || status;
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-800',
      SCREENING: 'bg-purple-100 text-purple-800',
      INTERVIEWING: 'bg-yellow-100 text-yellow-800',
      OFFERED: 'bg-green-100 text-green-800',
      ONBOARDING: 'bg-teal-100 text-teal-800',
      PROBATION: 'bg-cyan-100 text-cyan-800',
      EMPLOYED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">候选人档案</h1>
        <Link href="/resume-upload" className="btn-primary">
          添加候选人
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="搜索候选人姓名、邮箱、职位、公司或标签..."
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
              <option value="NEW">新建档案</option>
              <option value="SCREENING">筛选中</option>
              <option value="INTERVIEWING">面试中</option>
              <option value="OFFERED">已发offer</option>
              <option value="ONBOARDING">入职中</option>
              <option value="PROBATION">试用期</option>
              <option value="EMPLOYED">已正式入职</option>
              <option value="REJECTED">已拒绝</option>
              <option value="ARCHIVED">已归档</option>
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
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无候选人数据</p>
            <Link href="/resume-upload" className="btn-primary inline-block mt-4">
              添加候选人
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    候选人
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    当前职位
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    评分
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {candidate.email}
                          </div>
                          {candidate.phone && (
                            <div className="text-sm text-gray-500">
                              {candidate.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.currentPosition && (
                        <div className="text-sm text-gray-900">
                          {candidate.currentPosition}
                        </div>
                      )}
                      {candidate.currentCompany && (
                        <div className="text-sm text-gray-500">
                          {candidate.currentCompany}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {candidate.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            +{candidate.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.totalScore !== null ? (
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.totalScore.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">暂无评分</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          candidate.status
                        )}`}
                      >
                        {getStatusDisplayName(candidate.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/candidates/${candidate.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        查看
                      </Link>
                      <Link
                        href={`/candidates/${candidate.id}/edit`}
                        className="text-green-600 hover:text-green-900"
                      >
                        编辑
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
