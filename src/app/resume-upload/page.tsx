'use client';

import { useState, useCallback } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';

// SSE 流式消费：读取 text/event-stream，回调 progress / done / error
// 当收到 error 事件时，抛出异常让调用方 catch
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

    // 按双换行分割完整的 SSE 事件
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || ''; // 最后一段可能不完整，留作下次

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
        continue; // ignore malformed JSON
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

export default function ResumeUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState<string>('');
  const [resumeText, setResumeText] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const validExts = ['pdf', 'doc', 'docx'];
      if (validTypes.includes(selectedFile.type) || (ext && validExts.includes(ext))) {
        setFile(selectedFile);
        setError(null);
        setUploadSuccess(false);
      } else {
        setError('请上传 PDF 或 Word（DOC/DOCX）格式的简历');
        setFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
  });

  const handleUploadPdf = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(5);
    setProgressText('正在上传文件...');

    try {
      // 1. 上传文件
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败');
      }

      const uploadData = await uploadResponse.json();

      // 2. SSE 流式解析
      const parseResponse = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          fileUrl: uploadData.fileUrl,
          objectName: uploadData.objectName,
          contentType: uploadData.contentType || file.type,
          originalName: uploadData.originalName,
        }),
      });

      if (!parseResponse.ok) {
        throw new Error('简历解析失败');
      }

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
      console.error('上传或解析过程中出错:', err);
      setError(err instanceof Error ? err.message : '上传或解析过程中出错');
      setProgress(0);
      setProgressText('');
      setUploadSuccess(false);
      setLoading(false);
    }
  };

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

      if (!parseResponse.ok) {
        throw new Error('简历解析失败');
      }

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

  const clearFile = () => {
    setFile(null);
    setError(null);
    setProgress(0);
    setProgressText('');
  };

  const features = [
    { icon: Sparkles, title: 'AI智能解析', desc: '使用DeepSeek和Kimi大模型' },
    { icon: FileText, title: '信息提取', desc: '自动识别教育背景、工作经历' },
    { icon: CheckCircle2, title: '标签匹配', desc: '智能匹配公司技能标签' },
  ];

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
                    ${file ? 'bg-muted' : ''}
                  `}
                >
                  <input {...getInputProps()} />

                  {file ? (
                    <div className="space-y-4">
                      <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-primary/10">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="mt-2"
                      >
                        <X className="h-4 w-4 mr-1" />
                        移除文件
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-muted mx-auto">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {isDragActive ? '释放以上传文件' : '点击或拖放文件到这里'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          支持 PDF、DOC、DOCX 格式，最大 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 进度条 */}
                {(loading || uploadSuccess) && (
                  <div className="mt-6 space-y-3">
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
                  <div className="mt-4 flex items-center gap-2 p-4 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>解析成功！正在跳转到候选人详情页...</span>
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="mt-6 flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 上传按钮 */}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleUploadPdf}
                    disabled={!file || loading || uploadSuccess}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        上传并解析
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
