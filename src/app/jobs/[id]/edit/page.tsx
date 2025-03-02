'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import Link from 'next/link';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';

// 定义表单验证模式
const formSchema = z.object({
  title: z.string().min(2, {
    message: '职位名称至少需要2个字符',
  }).max(100, {
    message: '职位名称不能超过100个字符',
  }),
  department: z.string().min(2, {
    message: '部门名称至少需要2个字符',
  }).max(50, {
    message: '部门名称不能超过50个字符',
  }),
  description: z.string().min(10, {
    message: '岗位描述至少需要10个字符',
  }),
  requirements: z.string().min(10, {
    message: '岗位要求至少需要10个字符',
  }),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']),
  expiresAt: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

// 标签类型
interface Tag {
  id: string;
  name: string;
  category: string;
}

// 职位类型
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

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    description?: string;
    requirements?: string;
  }>({});

  // 初始化表单
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      department: '',
      description: '',
      requirements: '',
      status: 'DRAFT',
      expiresAt: '',
      tagIds: [],
    },
  });

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
        
        // 设置表单初始值
        form.reset({
          title: data.title,
          department: data.department,
          description: data.description,
          requirements: data.requirements,
          status: data.status,
          expiresAt: data.expiresAt 
            ? format(new Date(data.expiresAt), 'yyyy-MM-dd')
            : undefined,
        });
        
        // 设置已选标签
        setSelectedTags(data.tags.map((tag: Tag) => tag.id));
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
  }, [params.id, form]);

  // 获取所有可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
          throw new Error('获取标签失败');
        }
        const data = await response.json();
        setAvailableTags(data);
      } catch (err) {
        console.error('获取标签错误:', err);
        setError('获取标签失败，请刷新页面重试');
      }
    };

    fetchTags();
  }, []);

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  // 处理AI生成建议
  const handleGenerateAiSuggestions = async () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    
    if (!title || !department) {
      setError('请先填写职位名称和部门');
      return;
    }
    
    setAiGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/job-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          department,
          selectedTags: selectedTags.map(id => 
            availableTags.find(tag => tag.id === id)?.name
          ).filter(Boolean),
        }),
      });
      
      if (!response.ok) {
        throw new Error('生成AI建议失败');
      }
      
      const data = await response.json();
      setAiSuggestions(data);
      setShowAiSuggestions(true);
    } catch (err) {
      console.error('生成AI建议错误:', err);
      setError(err instanceof Error ? err.message : '生成AI建议失败');
    } finally {
      setAiGenerating(false);
    }
  };

  // 应用AI建议
  const applyAiSuggestion = (field: 'description' | 'requirements') => {
    if (aiSuggestions[field]) {
      form.setValue(field, aiSuggestions[field] || '');
      form.trigger(field);
    }
  };

  // 表单提交处理
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!job) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // 添加标签IDs
      values.tagIds = selectedTags;
      
      const response = await fetch(`/api/job-postings/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error('更新职位失败');
      }
      
      // 跳转到职位详情页
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      console.error('更新职位错误:', err);
      setError(err instanceof Error ? err.message : '更新职位失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 按类别分组标签
  const groupedTags = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

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

  if (error && !job) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 p-4 rounded-md text-red-700 mb-4">
          {error}
        </div>
        <Link href="/jobs" className="text-blue-600 hover:underline">
          返回职位列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href={`/jobs/${params.id}`} className="text-blue-600 hover:underline mr-2">
          &larr; 返回职位详情
        </Link>
        <h1 className="text-2xl font-bold">编辑职位</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>职位名称</FormLabel>
                    <FormControl>
                      <input
                        placeholder="例如：前端开发工程师"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      请输入准确的职位名称，便于候选人搜索
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属部门</FormLabel>
                    <FormControl>
                      <input
                        placeholder="例如：技术部"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      请输入该职位所属的部门
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">职位标签</h3>
              <p className="text-sm text-gray-500 mb-4">
                选择与该职位相关的标签，这将有助于系统更准确地匹配候选人
              </p>

              {Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-md font-medium mb-2">
                    {getCategoryDisplayName(category)}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          selectedTags.includes(tag.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateAiSuggestions}
                disabled={aiGenerating || !form.getValues('title') || !form.getValues('department')}
                className={`px-4 py-2 rounded-md text-white ${
                  aiGenerating || !form.getValues('title') || !form.getValues('department')
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {aiGenerating ? '生成中...' : '使用AI生成职位描述'}
              </button>
            </div>

            {showAiSuggestions && (
              <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                <h3 className="text-lg font-medium text-purple-800 mb-2">
                  AI生成的建议
                </h3>
                {aiSuggestions.description && (
                  <div className="mb-4">
                    <h4 className="font-medium text-purple-700 mb-1">岗位描述建议</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      {aiSuggestions.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => applyAiSuggestion('description')}
                      className="text-sm text-purple-700 hover:text-purple-900"
                    >
                      应用此建议
                    </button>
                  </div>
                )}
                {aiSuggestions.requirements && (
                  <div>
                    <h4 className="font-medium text-purple-700 mb-1">岗位要求建议</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      {aiSuggestions.requirements}
                    </p>
                    <button
                      type="button"
                      onClick={() => applyAiSuggestion('requirements')}
                      className="text-sm text-purple-700 hover:text-purple-900"
                    >
                      应用此建议
                    </button>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>岗位描述</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="请详细描述该职位的工作内容、职责范围等信息..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    详细描述该职位的工作内容、职责范围等信息
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>岗位要求</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="请详细描述该职位的技能要求、经验要求、学历要求等..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    详细描述该职位的技能要求、经验要求、学历要求等
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <FormControl>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        {...field}
                      >
                        <option value="DRAFT">草稿</option>
                        <option value="ACTIVE">激活</option>
                        <option value="PAUSED">暂停</option>
                      </select>
                    </FormControl>
                    <FormDescription>
                      设置岗位状态，只有激活状态的岗位才会参与匹配
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>截止日期</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      设置岗位的有效期，超过此日期岗位将自动过期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                href={`/jobs/${params.id}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-md text-white ${
                  submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
