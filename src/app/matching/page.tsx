'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface JobMatch {
  id: string;
  candidateId: string;
  jobPostingId: string;
  matchScore: number;
  aiEvaluation: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    currentPosition: string | null;
    currentCompany: string | null;
    tags: { id: string; name: string }[];
  };
  jobPosting: {
    id: string;
    title: string;
    department: string;
  };
}

export default function MatchingPage() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('ALL');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/matches');
        if (!response.ok) {
          throw new Error('获取匹配结果失败');
        }
        const data = await response.json();
        setMatches(data);
      } catch (err) {
        console.error('获取匹配结果错误:', err);
        setError(err instanceof Error ? err.message : '获取匹配结果失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  // 过滤匹配结果
  const filteredMatches = matches.filter((match) => {
    // 分数过滤
    if (scoreFilter !== 'ALL') {
      const score = match.matchScore;
      if (scoreFilter === 'HIGH' && score < 80) return false;
      if (scoreFilter === 'MEDIUM' && (score < 60 || score >= 80)) return false;
      if (scoreFilter === 'LOW' && score >= 60) return false;
    }
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        match.candidate.name.toLowerCase().includes(searchLower) ||
        match.jobPosting.title.toLowerCase().includes(searchLower) ||
        match.jobPosting.department.toLowerCase().includes(searchLower) ||
        (match.candidate.currentPosition && match.candidate.currentPosition.toLowerCase().includes(searchLower)) ||
        match.candidate.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // 获取匹配分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 运行新的匹配
  const runNewMatching = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/matches/run', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('运行匹配失败');
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      console.error('运行匹配错误:', err);
      setError(err instanceof Error ? err.message : '运行匹配失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">人才动态匹配</h1>
        <button 
          onClick={runNewMatching}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? '处理中...' : '运行新匹配'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="搜索候选人、岗位、部门或标签..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <select
              className="form-input"
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
            >
              <option value="ALL">所有匹配分数</option>
              <option value="HIGH">高匹配度 (80-100)</option>
              <option value="MEDIUM">中匹配度 (60-79)</option>
              <option value="LOW">低匹配度 (0-59)</option>
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
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无匹配结果</p>
            <button 
              onClick={runNewMatching}
              className="btn-primary inline-block mt-4"
            >
              运行新匹配
            </button>
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
                    岗位
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    匹配分数
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMatches.map((match) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {match.candidate.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {match.candidate.currentPosition || '职位未知'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {match.candidate.currentCompany || '公司未知'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {match.jobPosting.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {match.jobPosting.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-bold ${getScoreColor(match.matchScore)}`}>
                        {match.matchScore.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/matching/${match.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        查看详情
                      </Link>
                      <Link
                        href={`/interviews/create?candidateId=${match.candidateId}&jobId=${match.jobPostingId}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        安排面试
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">匹配说明</h2>
        <p className="text-gray-700 mb-4">
          系统使用大语言模型自动匹配简历和岗位需求，基于多维度（技能、经验、学历等）进行评分。
          匹配分数会动态调整人才总分，帮助您找到最适合的候选人。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-lg font-bold text-green-600 mb-2">高匹配度 (80-100)</div>
            <p className="text-gray-600">候选人与岗位高度匹配，建议优先安排面试</p>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-lg font-bold text-yellow-600 mb-2">中匹配度 (60-79)</div>
            <p className="text-gray-600">候选人与岗位部分匹配，可以考虑进一步评估</p>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-lg font-bold text-red-600 mb-2">低匹配度 (0-59)</div>
            <p className="text-gray-600">候选人与岗位匹配度低，建议考虑其他岗位</p>
          </div>
        </div>
      </div>
    </div>
  );
}
