'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  Trash2,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

// ---------- types ----------

type ParseMode = 'immediate' | 'deferred';

interface FileTask {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'parsing' | 'done' | 'error' | 'queued';
  progress: number;
  progressText: string;
  candidateId?: string;
  error?: string;
}

// ---------- helpers ----------

let _taskIdCounter = 0;
function nextTaskId() {
  return `task-${++_taskIdCounter}-${Date.now()}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const VALID_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const VALID_EXTS = ['pdf', 'doc', 'docx'];

function isValidFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return VALID_TYPES.includes(file.type) || (ext != null && VALID_EXTS.includes(ext));
}

// SSE 流式消费：读取 text/event-stream，回调 progress / done / error
async function consumeSSE(
  response: Response,
  onProgress: (progress: number, text: string) => void,
  onDone: (candidateId: string) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (!part.trim()) continue;
      let eventType = 'message';
      let data = '';
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        else if (line.startsWith('data: ')) data = line.slice(6);
      }
      if (!data) continue;

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (eventType === 'progress') {
        onProgress(parsed.progress, parsed.text);
      } else if (eventType === 'done') {
        onDone(parsed.candidateId);
        return;
      } else if (eventType === 'error') {
        throw new Error(parsed.error);
      }
    }
  }
}

// ---------- component ----------

export default function ResumeUpload() {
  const router = useRouter();

  // -- parse mode --
  const [parseMode, setParseMode] = useState<ParseMode>('immediate');
  const [scheduleInfo, setScheduleInfo] = useState<string | null>(null);

  // -- batch file upload state --
  const [tasks, setTasks] = useState<FileTask[]>([]);
  const [processing, setProcessing] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const abortRef = useRef(false);

  // -- text tab state (unchanged) --
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState<string>('');
  const [resumeText, setResumeText] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // -- dropzone --
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (processing) return;
      const valid = acceptedFiles.filter(isValidFile);
      if (valid.length === 0) return;
      const newTasks: FileTask[] = valid.map((f) => ({
        id: nextTaskId(),
        file: f,
        status: 'pending' as const,
        progress: 0,
        progressText: '',
      }));
      setTasks((prev) => [...prev, ...newTasks]);
      setBatchDone(false);
    },
    [processing],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    disabled: processing,
  });

  // helper: update a single task by id
  const updateTask = useCallback((id: string, patch: Partial<FileTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTask = useCallback(
    (id: string) => {
      if (processing) return;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [processing],
  );

  const clearAllTasks = useCallback(() => {
    if (processing) return;
    setTasks([]);
    setBatchDone(false);
  }, [processing]);

  // -- batch process --
  const handleBatchUpload = async () => {
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'error');
    if (pending.length === 0) return;

    setProcessing(true);
    setBatchDone(false);
    abortRef.current = false;

    // reset error tasks back to pending
    setTasks((prev) =>
      prev.map((t) =>
        t.status === 'error' ? { ...t, status: 'pending' as const, error: undefined, progress: 0, progressText: '' } : t,
      ),
    );

    for (const task of pending) {
      if (abortRef.current) break;

      try {
        // 1. upload
        updateTask(task.id, { status: 'uploading', progress: 5, progressText: '正在上传文件...' });

        const formData = new FormData();
        formData.append('file', task.file);

        const uploadResponse = await fetch('/api/resume/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error('文件上传失败');
        const uploadData = await uploadResponse.json();

        // 2. parse via SSE
        updateTask(task.id, { status: 'parsing', progress: 15, progressText: '正在解析简历...' });

        const parseResponse = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: uploadData.fileId,
            fileUrl: uploadData.fileUrl,
            objectName: uploadData.objectName,
            contentType: uploadData.contentType || task.file.type,
            originalName: uploadData.originalName,
          }),
        });

        if (!parseResponse.ok) throw new Error('简历解析失败');

        await consumeSSE(
          parseResponse,
          (p, text) => updateTask(task.id, { progress: p, progressText: text }),
          (candidateId) =>
            updateTask(task.id, {
              status: 'done',
              progress: 100,
              progressText: '解析完成',
              candidateId,
            }),
        );
      } catch (err) {
        updateTask(task.id, {
          status: 'error',
          progress: 0,
          progressText: '',
          error: err instanceof Error ? err.message : '上传或解析过程中出错',
        });
      }
    }

    setProcessing(false);
    setBatchDone(true);

    // auto-redirect if single file succeeded
    // read latest tasks via callback to avoid stale closure
    setTasks((latest) => {
      if (latest.length === 1 && latest[0].status === 'done' && latest[0].candidateId) {
        setTimeout(() => router.push(`/candidates/${latest[0].candidateId}`), 500);
      }
      return latest;
    });
  };

  // -- deferred batch upload (upload only, then schedule) --
  const handleDeferredUpload = async () => {
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'error');
    if (pending.length === 0) return;

    setProcessing(true);
    setBatchDone(false);
    setScheduleInfo(null);
    abortRef.current = false;

    setTasks((prev) =>
      prev.map((t) =>
        t.status === 'error' ? { ...t, status: 'pending' as const, error: undefined, progress: 0, progressText: '' } : t,
      ),
    );

    const uploadedFiles: Array<{ fileId: string; objectName: string; contentType: string; originalName: string }> = [];

    for (const task of pending) {
      if (abortRef.current) break;

      try {
        updateTask(task.id, { status: 'uploading', progress: 30, progressText: '正在上传文件...' });

        const formData = new FormData();
        formData.append('file', task.file);

        const uploadResponse = await fetch('/api/resume/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error('文件上传失败');
        const uploadData = await uploadResponse.json();

        uploadedFiles.push({
          fileId: uploadData.fileId,
          objectName: uploadData.objectName,
          contentType: uploadData.contentType || task.file.type,
          originalName: uploadData.originalName,
        });

        updateTask(task.id, { status: 'queued', progress: 100, progressText: '已加入队列' });
      } catch (err) {
        updateTask(task.id, {
          status: 'error',
          progress: 0,
          progressText: '',
          error: err instanceof Error ? err.message : '上传过程中出错',
        });
      }
    }

    // 调用 schedule-parse API 批量创建延时任务
    if (uploadedFiles.length > 0) {
      try {
        const scheduleResponse = await fetch('/api/resume/schedule-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: uploadedFiles }),
        });

        if (!scheduleResponse.ok) throw new Error('创建延时解析任务失败');
        const scheduleData = await scheduleResponse.json();
        setScheduleInfo(scheduleData.message);
        window.dispatchEvent(new Event('queue:updated'));
      } catch (err) {
        console.error('创建延时解析任务失败:', err);
        setScheduleInfo('文件已上传，但创建延时任务失败，请联系管理员');
      }
    }

    setProcessing(false);
    setBatchDone(true);
  };

  // -- text upload (unchanged) --
  const handleUploadText = async () => {
    if (!resumeText.trim()) {
      setError('请输入简历文本');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(5);
    setProgressText('正在准备文本...');

    try {
      const parseResponse = await fetch('/api/resume/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });

      if (!parseResponse.ok) throw new Error('简历解析失败');

      await consumeSSE(
        parseResponse,
        (p, text) => {
          setProgress(p);
          setProgressText(text);
        },
        (candidateId) => {
          setUploadSuccess(true);
          setLoading(false);
          setTimeout(() => router.push(`/candidates/${candidateId}`), 500);
        },
      );
    } catch (err) {
      console.error('解析过程中出错:', err);
      setError(err instanceof Error ? err.message : '解析过程中出错');
      setProgress(0);
      setProgressText('');
      setUploadSuccess(false);
      setLoading(false);
    }
  };

  // -- derived stats --
  const doneCount = tasks.filter((t) => t.status === 'done' || t.status === 'queued').length;
  const errorCount = tasks.filter((t) => t.status === 'error').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const hasPendingOrError = pendingCount > 0 || errorCount > 0;

  const features = [
    { icon: Sparkles, title: 'AI智能解析', desc: '使用DeepSeek和Kimi大模型' },
    { icon: FileText, title: '信息提取', desc: '自动识别教育背景、工作经历' },
    { icon: CheckCircle2, title: '标签匹配', desc: '智能匹配公司技能标签' },
  ];

  // -- status helpers --
  function statusIcon(task: FileTask) {
    switch (task.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
      case 'parsing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  }

  function statusLabel(task: FileTask) {
    switch (task.status) {
      case 'pending':
        return '等待中';
      case 'uploading':
        return '上传中...';
      case 'parsing':
        return task.progressText || '解析中...';
      case 'done':
        return '解析完成';
      case 'queued':
        return '已加入队列';
      case 'error':
        return task.error || '出错';
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl mx-auto">
        {/* 页面头部 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-primary/5 text-primary px-4 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              AI 驱动
            </Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">AI辅助人才建档</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            上传简历或输入简历文本，系统将自动解析简历内容，提取关键信息，并生成候选人档案
          </p>
        </div>

        <Tabs defaultValue="pdf" className="space-y-8">
          <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 h-12 p-1 bg-muted">
            <TabsTrigger value="pdf" className="gap-2 text-sm font-medium">
              <Upload className="h-4 w-4" />
              文件上传
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              文本输入
            </TabsTrigger>
          </TabsList>

          {/* ====== 文件上传 Tab ====== */}
          <TabsContent value="pdf" className="space-y-4">
            <Card className="border-2 border-transparent hover:border-primary/10 transition-colors shadow-sm">
              <CardContent className="p-6">
                {/* 拖放区域 */}
                <div
                  {...getRootProps()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragActive
                      ? 'border-primary bg-primary/5'
                      : isDragReject
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                    ${processing ? 'pointer-events-none opacity-60' : ''}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-muted mx-auto">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {isDragActive ? '释放以添加文件' : '点击或拖放文件到这里'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        支持 PDF、DOC、DOCX 格式，可一次选择多个文件
                      </p>
                    </div>
                  </div>
                </div>

                {/* 文件列表 */}
                {tasks.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {/* 总体进度 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        共 {tasks.length} 份文件
                        {(batchDone || processing) && (
                          <>
                            {' · '}已完成 {doneCount} 份
                            {errorCount > 0 && <span className="text-destructive"> · 失败 {errorCount} 份</span>}
                          </>
                        )}
                      </span>
                      {!processing && !batchDone && (
                        <Button variant="ghost" size="sm" onClick={clearAllTasks} className="text-muted-foreground">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          清空
                        </Button>
                      )}
                    </div>

                    {/* 每个文件 */}
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                            task.status === 'done'
                              ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900'
                              : task.status === 'queued'
                                ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900'
                                : task.status === 'error'
                                  ? 'bg-destructive/5 border-destructive/20'
                                  : 'bg-muted/30 border-border'
                          }`}
                        >
                          {/* icon */}
                          <div className="shrink-0">{statusIcon(task)}</div>

                          {/* file info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{task.file.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatSize(task.file.size)}
                              </span>
                            </div>
                            {/* progress bar for active tasks */}
                            {(task.status === 'uploading' || task.status === 'parsing') && (
                              <div className="mt-1.5 space-y-1">
                                <Progress value={task.progress} className="h-1.5" />
                                <p className="text-xs text-muted-foreground">{statusLabel(task)}</p>
                              </div>
                            )}
                            {task.status === 'error' && (
                              <p className="text-xs text-destructive mt-1">{task.error}</p>
                            )}
                          </div>

                          {/* actions */}
                          <div className="shrink-0">
                            {task.status === 'pending' && !processing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeTask(task.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {task.status === 'done' && task.candidateId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1"
                                onClick={() => router.push(`/candidates/${task.candidateId}`)}
                              >
                                查看 <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 汇总 */}
                    {batchDone && !processing && (
                      <div
                        className={`flex items-center gap-2 p-4 rounded-lg ${
                          errorCount === 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}
                      >
                        {errorCount === 0 ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                        <span>
                          全部处理完成：成功 {doneCount} 份
                          {errorCount > 0 && `，失败 ${errorCount} 份`}
                          {parseMode === 'immediate' && tasks.length === 1 && doneCount === 1 && '，正在跳转...'}
                        </span>
                      </div>
                    )}

                    {/* 延时解析队列提示 */}
                    {scheduleInfo && batchDone && (
                      <div className="flex items-center gap-2 p-4 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                        <Clock className="h-5 w-5" />
                        <span>{scheduleInfo}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按钮 - 分裂按钮 */}
                <div className="mt-6 flex justify-end gap-2">
                  {batchDone && errorCount > 0 && (
                    <Button variant="outline" onClick={handleBatchUpload} disabled={processing}>
                      <Loader2 className={`h-4 w-4 mr-1 ${processing ? 'animate-spin' : 'hidden'}`} />
                      重试失败项
                    </Button>
                  )}
                  <div className="inline-flex rounded-md shadow-sm">
                    <Button
                      onClick={parseMode === 'immediate' ? handleBatchUpload : handleDeferredUpload}
                      disabled={tasks.length === 0 || processing || (batchDone && !hasPendingOrError)}
                      className="gap-2 rounded-r-none"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {parseMode === 'immediate' ? '处理中...' : '上传中...'}
                        </>
                      ) : parseMode === 'deferred' ? (
                        <>
                          <Clock className="h-4 w-4" />
                          上传并加入队列 ({batchDone ? errorCount : tasks.filter((t) => t.status !== 'done' && t.status !== 'queued').length})
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          上传并解析 ({batchDone ? errorCount : tasks.filter((t) => t.status !== 'done').length})
                        </>
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          disabled={tasks.length === 0 || processing || (batchDone && !hasPendingOrError)}
                          className="rounded-l-none border-l border-primary-foreground/20 px-2"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setParseMode('immediate')} className="gap-2 cursor-pointer">
                          <Zap className="h-4 w-4" />
                          立即解析
                          {parseMode === 'immediate' && <span className="ml-auto text-primary">&#10003;</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setParseMode('deferred')} className="gap-2 cursor-pointer">
                          <Clock className="h-4 w-4" />
                          凌晨3点统一解析
                          {parseMode === 'deferred' && <span className="ml-auto text-primary">&#10003;</span>}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== 文本输入 Tab (unchanged) ====== */}
          <TabsContent value="text" className="space-y-4">
            <Card className="border-2 border-transparent hover:border-primary/10 transition-colors shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    输入简历文本
                  </label>
                  <textarea
                    rows={10}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[200px]"
                    placeholder="请粘贴或输入简历文本内容，系统将自动提取关键信息..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    支持复制粘贴文本格式的简历内容
                  </p>
                </div>

                {/* 进度条 */}
                {(loading || uploadSuccess) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {progressText}
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* 成功提示 */}
                {uploadSuccess && (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>解析成功！正在跳转到候选人详情页...</span>
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 解析按钮 */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleUploadText}
                    disabled={!resumeText.trim() || loading || uploadSuccess}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      <>
                        解析文本
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 功能说明 */}
        <div className="mt-12">
          <h2 className="text-center text-lg font-semibold mb-6 text-muted-foreground">
            智能功能
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="card-hover border-2 border-transparent hover:border-primary/20 bg-gradient-to-b from-card to-card/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
