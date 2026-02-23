'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';

const formSchema = z.object({
  name: z.string().min(1, { message: '请输入姓名' }).max(50, { message: '姓名不能超过50个字符' }),
  email: z.string().email({ message: '请输入有效的邮箱地址' }),
  phone: z.string().optional(),
  education: z.string().optional(),
  workExperience: z.string().optional(),
  currentPosition: z.string().optional(),
  currentCompany: z.string().optional(),
  aiEvaluation: z.string().optional(),
  status: z.enum(['NEW', 'SCREENING', 'TALENT_POOL', 'INTERVIEWING', 'OFFERED', 'ONBOARDING', 'PROBATION', 'EMPLOYED', 'REJECTED', 'ARCHIVED']),
});

interface Tag {
  id: string;
  name: string;
  category: string;
}

export default function CreateCandidatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      education: '',
      workExperience: '',
      currentPosition: '',
      currentCompany: '',
      aiEvaluation: '',
      status: 'NEW',
    },
  });

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('获取标签失败');
        const data = await response.json();
        setAvailableTags(data);
      } catch (err) {
        console.error('获取标签错误:', err);
      }
    };
    fetchTags();
  }, []);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          tagIds: selectedTags,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建候选人失败');
      }

      router.push('/candidates');
    } catch (err) {
      console.error('创建候选人错误:', err);
      setError(err instanceof Error ? err.message : '创建候选人失败');
    } finally {
      setLoading(false);
    }
  };

  const groupedTags = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">添加候选人</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名 *</FormLabel>
                    <FormControl>
                      <input
                        placeholder="请输入候选人姓名"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱 *</FormLabel>
                    <FormControl>
                      <input
                        type="email"
                        placeholder="请输入邮箱地址"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>电话</FormLabel>
                    <FormControl>
                      <input
                        placeholder="请输入联系电话"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>当前职位</FormLabel>
                    <FormControl>
                      <input
                        placeholder="请输入当前职位"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>教育背景</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="请描述教育背景，例如：2015-2019 北京大学 计算机科学与技术 本科"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>工作经验</FormLabel>
                  <FormControl>
                    <textarea
                      rows={4}
                      placeholder={"请描述工作经验，例如：\n2019-2021 某科技有限公司 前端开发工程师\n2021-至今 某互联网公司 高级前端工程师"}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="currentCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>上一供职单位</FormLabel>
                    <FormControl>
                      <input
                        placeholder="请输入上一供职单位"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aiEvaluation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI 简历评价</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="请输入AI简历评价（可选）"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
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
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        {...field}
                      >
                        <option value="NEW">新建档案</option>
                        <option value="SCREENING">筛选中</option>
                        <option value="TALENT_POOL">人才池</option>
                        <option value="INTERVIEWING">面试中</option>
                        <option value="OFFERED">已发offer</option>
                        <option value="ONBOARDING">入职中</option>
                        <option value="PROBATION">试用期</option>
                        <option value="EMPLOYED">已正式入职</option>
                        <option value="REJECTED">已拒绝</option>
                        <option value="ARCHIVED">已归档</option>
                      </select>
                    </FormControl>
                    <FormDescription>
                      设置候选人的当前状态
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {Object.keys(groupedTags).length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">标签</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  选择与该候选人相关的标签
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
                          className={`px-2 py-0.5 rounded-full text-xs ${selectedTags.includes(tag.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {loading ? '提交中...' : '添加候选人'}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
