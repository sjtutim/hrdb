'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Interview {
  id: string;
  candidateId: string;
  interviewerId: string;
  type: string;
  scheduledAt: string;
  completedAt: string | null;
  notes: string | null;
  score: number | null;
  status: string;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  interviewer: {
    id: string;
    name: string;
  };
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await fetch('/api/interviews');
        if (!response.ok) {
          throw new Error('获取面试列表失败');
        }
        const data = await response.json();
        setInterviews(data);
      } catch (err) {
        console.error('获取面试列表错误:', err);
        setError(err instanceof Error ? err.message : '获取面试列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  // 过滤面试
  const filteredInterviews = interviews.filter((interview) => {
    // 状态过滤
    if (statusFilter !== 'ALL' && interview.status !== statusFilter) {
      return false;
    }
    
    // 类型过滤
    if (typeFilter !== 'ALL' && interview.type !== typeFilter) {
      return false;
    }
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        interview.candidate.name.toLowerCase().includes(searchLower) ||
        interview.candidate.email.toLowerCase().includes(searchLower) ||
        interview.interviewer.name.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

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

  // 格式化日期时间
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">面试管理</h1>
        <Link href="/interviews/create" className="btn-primary">
          安排面试
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="搜索候选人或面试官..."
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
              <option value="SCHEDULED">已安排</option>
              <option value="COMPLETED">已完成</option>
              <option value="CANCELLED">已取消</option>
              <option value="RESCHEDULED">已重新安排</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <select
              className="form-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">所有类型</option>
              <option value="PHONE">电话面试</option>
              <option value="TECHNICAL">技术面试</option>
              <option value="HR">HR面试</option>
              <option value="MANAGER">主管面试</option>
              <option value="PERSONALITY">性格测试</option>
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
        ) : filteredInterviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无面试数据</p>
            <Link href="/interviews/create" className="btn-primary inline-block mt-4">
              安排面试
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
                    面试官
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    评分
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {interview.candidate.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {interview.candidate.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {interview.interviewer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getTypeDisplayName(interview.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(interview.scheduledAt)}
                      </div>
                      {interview.completedAt && (
                        <div className="text-xs text-gray-500">
                          完成于: {formatDateTime(interview.completedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          interview.status
                        )}`}
                      >
                        {getStatusDisplayName(interview.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.score !== null ? (
                        <div className="text-sm font-medium text-gray-900">
                          {interview.score.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">未评分</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/interviews/${interview.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        查看
                      </Link>
                      {interview.status === 'SCHEDULED' && (
                        <>
                          <Link
                            href={`/interviews/${interview.id}/complete`}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            完成
                          </Link>
                          <Link
                            href={`/interviews/${interview.id}/reschedule`}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            重新安排
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">面试流程说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">1. 安排面试</h3>
            <p className="text-gray-600">
              选择候选人、面试官、面试类型和时间，创建面试安排。系统会自动通知相关人员。
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">2. 记录面试结果</h3>
            <p className="text-gray-600">
              面试完成后，面试官需要填写面试记录，包括评分和详细反馈。这些信息将用于候选人评估。
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">3. 综合评估</h3>
            <p className="text-gray-600">
              多轮面试完成后，系统会综合各轮面试结果，生成候选人的综合评估报告，辅助招聘决策。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
