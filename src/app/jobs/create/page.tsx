'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Briefcase, 
  Sparkles, 
  ArrowLeft, 
  Save,
  Loader2,
  Check,
  AlertCircle,
  Building2,
  Calendar,
  Tag,
  FileText
} from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Separator } from '@/app/components/ui/separator';
import Link from 'next/link';

// 定义表单验证模式
const formSchema = z.object({
  title: z.string().min(2, '职位名称至少需要2个字符').max(100, '职位名称不能超过100个字符'),
  department: z.string().min(2, '部门名称至少需要2个字符').max(50, '部门名称不能超过50个字符'),
  description: z.string().min(10, '岗位描述至少需要10个字符'),
  requirements: z.string().min(10, '岗位要求至少需要10个字符'),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']),
  expiresAt: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

interface Tag {
  id: string;
  name: string;
  category: string;
}

export default function CreateJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    description?: string;
    requirements?: string;
  }>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      department: '',
      description: '',
      requirements: '',
      status: 'DRAFT',
      expiresAt: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      tagIds: [],
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          department,
          selectedTags: selectedTags.map(id => availableTags.find(tag => tag.id === id)?.name).filter(Boolean),
        }),
      });
      
      if (!response.ok) throw new Error('生成AI建议失败');
      
      const data = await response.json();
      setAiSuggestions(data);
      setShowAiSuggestions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成AI建议失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiSuggestion = (field: 'description' | 'requirements') => {
    if (aiSuggestions[field]) {
      form.setValue(field, aiSuggestions[field] || '');
      form.trigger(field);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);
    
    try {
      values.tagIds = selectedTags;
      
      const response = await fetch('/api/job-postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) throw new Error('创建岗位失败');
      
      router.push('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建岗位失败');
    } finally {
      setLoading(false);
    }
  };

  const groupedTags = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const categoryMap: Record<string, string> = {
    SKILL: '技能要求',
    INDUSTRY: '行业经验',
    EDUCATION: '教育背景',
    EXPERIENCE: '工作经验',
    PERSONALITY: '性格特质',
    OTHER: '其他',
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/jobs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">发布新职位</h1>
          <p className="text-sm text-muted-foreground">创建新的职位发布，吸引优秀人才</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                基本信息
              </CardTitle>
              <CardDescription>填写职位的基本信息，便于候选人了解岗位</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>职位名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：前端开发工程师" {...field} />
                      </FormControl>
                      <FormDescription>请输入准确的职位名称</FormDescription>
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
                        <Input placeholder="例如：技术部" {...field} />
                      </FormControl>
                      <FormDescription>选择或输入该职位所属的部门</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 标签选择 */}
              <div>
                <FormLabel className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  职位标签
                </FormLabel>
                <p className="text-sm text-muted-foreground mb-4">
                  选择与该职位相关的标签，有助于系统更准确地匹配候选人
                </p>

                <div className="space-y-4">
                  {Object.entries(groupedTags).map(([category, tags]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium mb-2">{categoryMap[category] || category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagToggle(tag.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              selectedTags.includes(tag.id)
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {selectedTags.includes(tag.id) && (
                              <Check className="h-3 w-3 inline mr-1" />
                            )}
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI 建议卡片 */}
          <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI 智能建议
              </CardTitle>
              <CardDescription>使用 AI 生成职位描述和要求，节省您的时间</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAiSuggestions}
                disabled={aiGenerating || !form.getValues('title') || !form.getValues('department')}
                className="w-full sm:w-auto"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成职位描述建议
                  </>
                )}
              </Button>

              {showAiSuggestions && (
                <div className="mt-4 space-y-4">
                  {aiSuggestions.description && (
                    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">岗位描述建议</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => applyAiSuggestion('description')}
                        >
                          应用
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {aiSuggestions.description}
                      </p>
                    </div>
                  )}
                  {aiSuggestions.requirements && (
                    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">岗位要求建议</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => applyAiSuggestion('requirements')}
                        >
                          应用
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {aiSuggestions.requirements}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 职位详情卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                职位详情
              </CardTitle>
              <CardDescription>详细描述职位的工作内容和要求</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>岗位描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请详细描述该职位的工作内容、职责范围、团队介绍等信息..."
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>详细的岗位描述有助于吸引合适的候选人</FormDescription>
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
                      <Textarea
                        placeholder="请详细描述该职位的技能要求、经验要求、学历要求、加分项等..."
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>明确的要求有助于筛选合适的候选人</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 发布设置卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                发布设置
              </CardTitle>
              <CardDescription>设置职位的状态和有效期</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>职位状态</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">草稿（不对外发布）</SelectItem>
                          <SelectItem value="ACTIVE">激活（开始招聘）</SelectItem>
                          <SelectItem value="PAUSED">暂停（暂停招聘）</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>只有激活状态的职位才会参与人才匹配</FormDescription>
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>超过截止日期后职位将自动过期</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <Button variant="outline" type="button" asChild>
              <Link href="/jobs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                取消
              </Link>
            </Button>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  form.setValue('status', 'DRAFT');
                  form.handleSubmit(onSubmit)();
                }}
                disabled={loading}
              >
                保存草稿
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    发布职位
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* 提示信息 */}
      <Card className="mt-8 bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">发布提示</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 详细的职位描述和准确的要求有助于吸引合适的候选人</li>
            <li>• 选择合适的标签可以显著提高人才匹配的准确度</li>
            <li>• 草稿状态的职位不会对外发布，也不会参与人才匹配</li>
            <li>• 激活状态的职位会自动纳入人才匹配系统，为您推荐合适的候选人</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
