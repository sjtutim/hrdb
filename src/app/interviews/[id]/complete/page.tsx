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
  };
  interviewer: {
    id: string;
    name: string;
  };
}

interface ScoreInput {
  category: string;
  score: number;
  notes: string;
}

// 评分类别
const SCORE_CATEGORIES = {
  PHONE: ['沟通能力', '语言表达', '基本素质', '职业匹配度'],
  TECHNICAL: ['专业知识', '解决问题能力', '代码质量', '技术视野', '学习能力'],
  HR: ['沟通能力', '团队协作', '职业规划', '文化匹配度', '薪资期望'],
  MANAGER: ['领导能力', '项目经验', '决策能力', '沟通能力', '团队管理'],
  PERSONALITY: ['性格特质', '压力承受能力', '适应性', '价值观匹配度'],
};

export default function CompleteInterviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // 表单状态
  const [feedback, setFeedback] = useState('');
  const [decision, setDecision] = useState('');
  const [scores, setScores] = useState<ScoreInput[]>([]);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/interviews/${params.id}`);
        if (!response.ok) {
          throw new Error('获取面试详情失败');
        }
        const data = await response.json();
        
        // 检查面试状态
        if (data.status !== 'SCHEDULED') {
          throw new Error('此面试已完成或取消，无法再次记录结果');
        }
        
        setInterview(data);
        
        // 初始化评分项
        const categories = SCORE_CATEGORIES[data.type as keyof typeof SCORE_CATEGORIES] || [];
        setScores(
          categories.map((category) => ({
            category,
            score: 3, // 默认评分
            notes: '',
          }))
        );
      } catch (err) {
        console.error('获取面试详情错误:', err);
        setError(err instanceof Error ? err.message : '获取面试详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [params.id]);

  // 更新评分
  const handleScoreChange = (index: number, field: keyof ScoreInput, value: string | number) => {
    const newScores = [...scores];
    newScores[index] = {
      ...newScores[index],
      [field]: value,
    };
    setScores(newScores);
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

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!decision) {
      setError('请选择面试决定');
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
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          feedback,
          decision,
          scores,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新面试失败');
      }
      
      // 更新成功，跳转到面试详情页
      router.push(`/interviews/${params.id}`);
    } catch (err) {
      console.error('更新面试错误:', err);
      setError(err instanceof Error ? err.message : '更新面试失败');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">记录面试结果</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">记录面试结果</h1>
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
        <h1 className="text-2xl font-bold">记录面试结果</h1>
        <Link href={`/interviews/${interview.id}`} className="btn-secondary">
          返回面试详情
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            {interview.candidate.name} - {getTypeDisplayName(interview.type)}
          </h2>
          <p className="text-gray-600">
            面试时间: {new Date(interview.scheduledAt).toLocaleString('zh-CN')}
          </p>
          <p className="text-gray-600">
            面试官: {interview.interviewer.name}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">评分</h3>
            <div className="space-y-6">
              {scores.map((score, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                    <label className="text-gray-700 font-medium">
                      {score.category}
                    </label>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`w-10 h-10 rounded-full mx-1 flex items-center justify-center ${
                            score.score === value
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          onClick={() => handleScoreChange(index, 'score', value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <textarea
                      className="form-input h-20 w-full"
                      placeholder={`关于${score.category}的具体评价...`}
                      value={score.notes}
                      onChange={(e) => handleScoreChange(index, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="feedback" className="block text-lg font-medium mb-2">
              面试反馈
            </label>
            <textarea
              id="feedback"
              className="form-input h-40"
              placeholder="请详细描述候选人的表现、优势和不足..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-lg font-medium mb-2">
              面试决定 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                className={`p-4 rounded-lg border-2 ${
                  decision === 'PASS'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                }`}
                onClick={() => setDecision('PASS')}
              >
                <div className="text-center">
                  <div className="text-lg font-medium text-green-600 mb-2">通过</div>
                  <p className="text-sm text-gray-600">
                    候选人符合要求，建议进入下一轮或发放offer
                  </p>
                </div>
              </button>
              
              <button
                type="button"
                className={`p-4 rounded-lg border-2 ${
                  decision === 'HOLD'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                }`}
                onClick={() => setDecision('HOLD')}
              >
                <div className="text-center">
                  <div className="text-lg font-medium text-yellow-600 mb-2">待定</div>
                  <p className="text-sm text-gray-600">
                    需要更多信息或考虑，暂不做最终决定
                  </p>
                </div>
              </button>
              
              <button
                type="button"
                className={`p-4 rounded-lg border-2 ${
                  decision === 'FAIL'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                }`}
                onClick={() => setDecision('FAIL')}
              >
                <div className="text-center">
                  <div className="text-lg font-medium text-red-600 mb-2">不通过</div>
                  <p className="text-sm text-gray-600">
                    候选人不符合要求，建议终止流程
                  </p>
                </div>
              </button>
            </div>
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
              {submitting ? '提交中...' : '提交面试结果'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
