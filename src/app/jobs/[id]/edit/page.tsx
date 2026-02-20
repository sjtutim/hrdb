'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import Link from 'next/link';
import { Check, Plus, X, Loader2 } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';

// 标签选择器组件 - 支持展开/收起和新增标签
function TagSelector({
  category,
  categoryName,
  tags,
  selectedTags,
  onToggle,
  onAddTag,
}: {
  category: string;
  categoryName: string;
  tags: { id: string; name: string }[];
  selectedTags: string[];
  onToggle: (id: string) => void;
  onAddTag: (category: string, name: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [adding, setAdding] = useState(false);
  const maxVisible = 100;
  const hasMore = tags.length > maxVisible;
  const visibleTags = expanded ? tags : tags.slice(0, maxVisible);

  const handleAdd = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    if (tags.some(t => t.name === trimmed)) {
      setNewTagName('');
      setShowInput(false);
      return;
    }
    setAdding(true);
    try {
      await onAddTag(category, trimmed);
      setNewTagName('');
      setShowInput(false);
    } catch {
      // error handled by parent
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-medium">{categoryName}</h4>
        {!showInput && (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="添加新标签"
          >
            <Plus className="h-3 w-3" />
            新增
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
              selectedTags.includes(tag.id)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {selectedTags.includes(tag.id) && (
              <Check className="h-2.5 w-2.5 inline mr-0.5" />
            )}
            {tag.name}
          </button>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {expanded ? '收起' : `+${tags.length - maxVisible} 更多`}
          </button>
        )}
        {showInput && (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') { setShowInput(false); setNewTagName(''); }
              }}
              placeholder="输入标签名"
              autoFocus
              disabled={adding}
              className="h-6 w-24 px-2 text-xs border rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newTagName.trim()}
              className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setNewTagName(''); }}
              className="h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

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

  // 新增标签并同步到标签库
  const handleAddTag = async (category: string, name: string) => {
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '创建标签失败');
    }
    const newTag = await response.json();
    setAvailableTags((prev) => [...prev, newTag]);
    setSelectedTags((prev) => [...prev, newTag.id]);
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

  // 标签类别显示名称
  const categoryMap: Record<string, string> = {
    SKILL: '技能',
    INDUSTRY: '行业',
    EDUCATION: '教育',
    EXPERIENCE: '经验',
    PERSONALITY: '性格特质',
  };

  // 按类别分组标签（确保所有类别都显示）
  const groupedTags = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, Object.keys(categoryMap).reduce((acc, key) => ({ ...acc, [key]: [] }), {} as Record<string, Tag[]>));

  const getCategoryDisplayName = (category: string) => categoryMap[category] || category;

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
                <TagSelector
                  key={category}
                  category={category}
                  categoryName={getCategoryDisplayName(category)}
                  tags={tags}
                  selectedTags={selectedTags}
                  onToggle={handleTagToggle}
                  onAddTag={handleAddTag}
                />
              ))}
            </div>

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
