'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  department: z.string().optional(),
  aiEvaluation: z.string().optional(),
  status: z.enum(['NEW', 'SCREENING', 'TALENT_POOL', 'INTERVIEWING', 'OFFERED', 'ONBOARDING', 'PROBATION', 'EMPLOYED', 'REJECTED', 'ARCHIVED']),
});

interface Tag {
  id: string;
  name: string;
  category: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  education: string | null;
  workExperience: string | null;
  currentPosition: string | null;
  currentCompany: string | null;
  department: string | null;
  aiEvaluation: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
  status: string;
  tags: { id: string }[];
}

interface Attachment {
  id: string;
  name: string;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export default function EditCandidatePage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [deletingAttachId, setDeletingAttachId] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

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
      department: '',
      aiEvaluation: '',
      status: 'NEW',
    },
  });

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/certificates`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error('获取附件列表错误:', err);
    }
  }, [candidateId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行获取标签列表、候选人数据、附件列表
        const [tagsResponse, candidateResponse] = await Promise.all([
          fetch('/api/tags'),
          fetch(`/api/candidates/${candidateId}`),
        ]);
        if (!tagsResponse.ok) throw new Error('获取标签失败');
        const tagsData = await tagsResponse.json();
        setAvailableTags(tagsData);

        if (!candidateResponse.ok) {
          if (candidateResponse.status === 404) throw new Error('候选人不存在');
          throw new Error('获取候选人失败');
        }
        const candidateData: Candidate = await candidateResponse.json();

        form.reset({
          name: candidateData.name || '',
          email: candidateData.email || '',
          phone: candidateData.phone || '',
          education: candidateData.education || '',
          workExperience: candidateData.workExperience || '',
          currentPosition: candidateData.currentPosition || '',
          currentCompany: candidateData.currentCompany || '',
          department: candidateData.department || '',
          aiEvaluation: candidateData.aiEvaluation || '',
          status: candidateData.status as any,
        });

        setSelectedTags(candidateData.tags?.map((t) => t.id) || []);
        setResumeUrl(candidateData.resumeUrl || null);
        setResumeFileName(candidateData.resumeFileName || null);

        await fetchAttachments();
      } catch (err) {
        console.error('获取数据错误:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [candidateId, form, fetchAttachments]);

  const handleAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExts = ['pdf', 'docx'];

    setAttachUploading(true);
    setAttachError(null);

    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isAllowed = allowedMimes.includes(file.type) || allowedExts.includes(ext);
      if (!isAllowed) {
        errors.push(`${file.name}: 只支持 PDF 和 DOCX 格式`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/candidates/${candidateId}/certificates`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json();
          errors.push(`${file.name}: ${data.error || '上传失败'}`);
        }
      } catch {
        errors.push(`${file.name}: 上传失败`);
      }
    }

    if (errors.length > 0) setAttachError(errors.join('；'));
    await fetchAttachments();
    setAttachUploading(false);
    if (attachInputRef.current) attachInputRef.current.value = '';
  };

  const handleAttachDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除附件「${name}」吗？`)) return;
    setDeletingAttachId(id);
    try {
      await fetch(`/api/candidates/${candidateId}/certificates?certificateId=${id}`, {
        method: 'DELETE',
      });
      await fetchAttachments();
    } catch (err) {
      console.error('删除附件错误:', err);
    } finally {
      setDeletingAttachId(null);
    }
  };

  const getAttachFileType = (att: Attachment): 'pdf' | 'docx' | null => {
    const name = att.fileName || att.name || '';
    if (name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (name.toLowerCase().endsWith('.docx')) return 'docx';
    return null;
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('只支持PDF和DOCX格式的文件');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateId', candidateId);

      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '上传失败');
      }

      const data = await response.json();
      setResumeUrl(data.objectName);
      setResumeFileName(data.originalName);
    } catch (err) {
      console.error('上传简历错误:', err);
      setUploadError(err instanceof Error ? err.message : '上传简历失败');
    } finally {
      setUploading(false);
      // 清空 input 以便再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getResumeFileType = (url: string | null): 'pdf' | 'docx' | null => {
    if (!url) return null;
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.endsWith('.docx')) return 'docx';
    return null;
  };

  const handleResumeDelete = async () => {
    if (!confirm('确定要删除简历文件吗？')) return;

    setDeleting(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/resume/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }

      setResumeUrl(null);
      setResumeFileName(null);
    } catch (err) {
      console.error('删除简历错误:', err);
      setUploadError(err instanceof Error ? err.message : '删除简历失败');
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          tagIds: selectedTags,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新候选人失败');
      }

      router.push(`/candidates/${candidateId}`);
    } catch (err) {
      console.error('更新候选人错误:', err);
      setError(err instanceof Error ? err.message : '更新候选人失败');
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">编辑候选人</h1>

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

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => {
                  const status = form.watch('status');
                  const isOnboarded = status === 'PROBATION' || status === 'EMPLOYED';
                  return (
                    <FormItem>
                      <FormLabel>{isOnboarded ? '入职部门' : '意向部门'}</FormLabel>
                      <FormControl>
                        <input
                          placeholder={isOnboarded ? '请输入入职部门' : '请输入意向部门'}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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

            {/* 简历上传 */}
            <div>
              <h3 className="text-lg font-medium mb-2">简历文件</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                支持上传 PDF 和 DOCX 格式的简历文件
              </p>

              {resumeUrl && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium truncate">
                      {resumeFileName || resumeUrl.split('/').pop()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {getResumeFileType(resumeUrl)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getResumeFileType(resumeUrl) === 'pdf' ? (
                      <a
                        href={`/api/resume/file/${encodeURIComponent(resumeUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        预览
                      </a>
                    ) : (
                      <a
                        href={`/api/resume/file/${encodeURIComponent(resumeUrl)}`}
                        download
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        下载
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleResumeDelete}
                      disabled={deleting}
                      className="text-sm text-red-500 hover:text-red-700 hover:underline"
                    >
                      {deleting ? '删除中...' : '删除'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || deleting}
                  className={`px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-sm ${uploading || deleting
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer'
                    }`}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      上传中...
                    </span>
                  ) : resumeUrl ? '重新上传简历' : '点击上传简历'}
                </button>
              </div>

              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>

            {/* 附件上传 */}
            <div>
              <h3 className="text-lg font-medium mb-2">附件文件</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                支持上传多个 PDF（可预览）或 DOCX（可下载）格式的附件
              </p>

              {attachments.length > 0 && (
                <div className="mb-4 space-y-2">
                  {attachments.map((att) => {
                    const fileType = getAttachFileType(att);
                    const displayName = att.fileName || att.name;
                    const fileUrl = att.fileUrl
                      ? `/api/resume/file/${encodeURIComponent(att.fileUrl)}`
                      : null;
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="h-5 w-5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium truncate">{displayName}</span>
                          {fileType && (
                            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${fileType === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {fileType.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          {fileUrl && fileType === 'pdf' && (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                              预览
                            </a>
                          )}
                          {fileUrl && fileType === 'docx' && (
                            <a href={fileUrl} download={att.fileName || att.name} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                              下载
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAttachDelete(att.id, displayName)}
                            disabled={deletingAttachId === att.id}
                            className="text-sm text-red-500 hover:text-red-700 hover:underline"
                          >
                            {deletingAttachId === att.id ? '删除中...' : '删除'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-4">
                <input
                  ref={attachInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={handleAttachUpload}
                  className="hidden"
                  id="attach-upload"
                />
                <button
                  type="button"
                  onClick={() => attachInputRef.current?.click()}
                  disabled={attachUploading}
                  className={`px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-sm ${
                    attachUploading
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer'
                  }`}
                >
                  {attachUploading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      上传中...
                    </span>
                  ) : '上传附件（可多选）'}
                </button>
              </div>

              {attachError && (
                <p className="mt-2 text-sm text-red-600">{attachError}</p>
              )}
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
                {loading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
