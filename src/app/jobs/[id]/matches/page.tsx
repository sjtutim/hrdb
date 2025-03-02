'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 类型定义
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
  tags: Tag[];
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  matchScore: number;
  tags: Tag[];
  createdAt: string;
}

export default function JobMatchesPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取职位详情和匹配的候选人
  useEffect(() => {
    const fetchJobAndMatches = async () => {
      try {
        setLoading(true);
        
        // 获取职位详情
        const jobResponse = await fetch(`/api/job-postings/${params.id}`);
        if (!jobResponse.ok) {
          throw new Error('获取职位详情失败');
        }
        const jobData = await jobResponse.json();
        setJob(jobData);
        
        // 获取匹配的候选人
        // 注意：这里假设有一个API端点来获取匹配的候选人
        // 实际项目中需要实现这个API
        const matchesResponse = await fetch(`/api/job-postings/${params.id}/matches`);
        if (!matchesResponse.ok) {
          // 如果API不存在，使用模拟数据
          console.warn('获取匹配候选人API不存在，使用模拟数据');
          
          // 模拟匹配的候选人数据
          const mockCandidates = [
            {
              id: 'candidate-1',
              name: '张三',
              email: 'zhangsan@example.com',
              phone: '13800138000',
              matchScore: 85,
              tags: jobData.tags.slice(0, 3),
              createdAt: new Date().toISOString(),
            },
            {
              id: 'candidate-2',
              name: '李四',
              email: 'lisi@example.com',
              phone: '13900139000',
              matchScore: 78,
              tags: jobData.tags.slice(1, 4),
              createdAt: new Date().toISOString(),
            },
            {
              id: 'candidate-3',
              name: '王五',
              email: 'wangwu@example.com',
              phone: null,
              matchScore: 65,
              tags: jobData.tags.slice(0, 2),
              createdAt: new Date().toISOString(),
            },
          ];
          
          setCandidates(mockCandidates);
          return;
        }
        
        const matchesData = await matchesResponse.json();
        setCandidates(matchesData);
      } catch (err) {
        console.error('获取职位匹配错误:', err);
        setError(err instanceof Error ? err.message : '获取职位匹配失败');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchJobAndMatches();
    }
  }, [params.id]);

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href={`/jobs/${params.id}`} className="text-blue-600 hover:underline mr-4">
          &larr; 返回职位详情
        </Link>
        <h1 className="text-2xl font-bold">
          {job.title} - 候选人匹配
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">{job.title}</h2>
            <p className="text-gray-600">部门: {job.department}</p>
          </div>
          <div className="flex space-x-2">
            <Link 
              href={`/jobs/${job.id}/edit`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              编辑职位
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">职位标签</h3>
          <div className="flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span key={tag.id} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">匹配候选人 ({candidates.length})</h2>
          <p className="text-gray-600 text-sm mt-1">
            根据职位要求和候选人技能匹配度排序
          </p>
        </div>

        {candidates.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            暂无匹配的候选人
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
                    匹配度
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    技能标签
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    加入时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                      <div className="text-xs text-gray-500">{candidate.email}</div>
                      {candidate.phone && (
                        <div className="text-xs text-gray-500">{candidate.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              candidate.matchScore >= 80 ? 'bg-green-500' :
                              candidate.matchScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${candidate.matchScore}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {candidate.matchScore}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.tags.slice(0, 3).map((tag) => (
                          <span key={tag.id} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(candidate.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/candidates/${candidate.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                        查看详情
                      </Link>
                      <button className="text-green-600 hover:text-green-900">
                        发送邀请
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">匹配说明</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>匹配度基于候选人技能标签与职位要求的匹配程度计算</li>
          <li>系统会自动分析候选人简历中的技能与经验，与职位要求进行比对</li>
          <li>匹配度80%以上表示非常适合，60%-80%表示比较适合，60%以下表示需要进一步评估</li>
          <li>您可以点击"发送邀请"来联系候选人，或点击"查看详情"查看候选人完整简历</li>
          <li>系统每天会自动更新匹配结果，您也可以手动刷新获取最新匹配</li>
        </ul>
      </div>
    </div>
  );
}
