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
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
        setUploadSuccess(false);
      } else {
        setError('请上传PDF格式的简历');
        setFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const simulateProgress = (steps: { progress: number; text: string }[]) => {
    steps.forEach((step, index) => {
      setTimeout(() => {
        setProgress(step.progress);
        setProgressText(step.text);
      }, index * 800);
    });
  };

  const handleUploadPdf = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    simulateProgress([
      { progress: 20, text: '正在上传文件...' },
      { progress: 50, text: '正在解析PDF内容...' },
      { progress: 80, text: 'AI正在提取关键信息...' },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败');
      }

      const { fileId } = await uploadResponse.json();

      const parseResponse = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!parseResponse.ok) {
        throw new Error('简历解析失败');
      }

      const { candidateId } = await parseResponse.json();
      setProgress(100);
      setProgressText('解析完成！');
      setUploadSuccess(true);

      setTimeout(() => {
        router.push(`/candidates/${candidateId}`);
      }, 500);
    } catch (err) {
      console.error('上传或解析过程中出错:', err);
      setError(err instanceof Error ? err.message : '上传或解析过程中出错');
      setProgress(0);
      setProgressText('');
    } finally {
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
    setProgress(0);

    simulateProgress([
      { progress: 30, text: '正在处理文本内容...' },
      { progress: 70, text: 'AI正在提取关键信息...' },
    ]);

    try {
      const parseResponse = await fetch('/api/resume/parse-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText }),
      });

      if (!parseResponse.ok) {
        throw new Error('简历解析失败');
      }

      const { candidateId } = await parseResponse.json();
      setProgress(100);
      setProgressText('解析完成！');
      setUploadSuccess(true);

      setTimeout(() => {
        router.push(`/candidates/${candidateId}`);
      }, 500);
    } catch (err) {
      console.error('解析过程中出错:', err);
      setError(err instanceof Error ? err.message : '解析过程中出错');
      setProgress(0);
      setProgressText('');
    } finally {
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
              PDF上传
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
                          {isDragActive ? '释放以上传文件' : '点击或拖放PDF文件到这里'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          支持 PDF 格式，最大 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 进度条 */}
                {loading && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{progressText}</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* 成功提示 */}
                {uploadSuccess && (
                  <div className="mt-6 flex items-center gap-2 p-4 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
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
                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{progressText}</span>
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
