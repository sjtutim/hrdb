'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Building,
  Calendar,
  User,
  Star,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Pencil,
  Upload,
  File,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';


interface Employee {
  id: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  probationEndDate: string;
  status: string;
  currentScore: number;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface PerformanceReview {
  id: string;
  date: string;
  type: string;
  score: number;
  level?: string;
  summary: string;
  strengths?: string;
  improvements?: string;
  reviewer: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  PROBATION: { label: '试用期', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  REGULAR: { label: '正式员工', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  RESIGNED: { label: '已离职', className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' },
  TERMINATED: { label: '已解雇', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const reviewTypes = ['月度考核', '季度考核', '年度考核', '试用期考核'];
const reviewLevels = ['A', 'B', 'C', 'D', 'E'];

const levelColorMap: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  D: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  E: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// 年份：从2026年开始，到当前年份为止
const startYear = 2026;
const currentYear = Math.max(new Date().getFullYear(), startYear);
const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i);
const quarters = [
  { value: '1', label: '第一季度 (1-3月)' },
  { value: '2', label: '第二季度 (4-6月)' },
  { value: '3', label: '第三季度 (7-9月)' },
  { value: '4', label: '第四季度 (10-12月)' },
];
const months = [
  { value: '1', label: '1月' },
  { value: '2', label: '2月' },
  { value: '3', label: '3月' },
  { value: '4', label: '4月' },
  { value: '5', label: '5月' },
  { value: '6', label: '6月' },
  { value: '7', label: '7月' },
  { value: '8', label: '8月' },
  { value: '9', label: '9月' },
  { value: '10', label: '10月' },
  { value: '11', label: '11月' },
  { value: '12', label: '12月' },
];

export default function PerformancePage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // 筛选状态
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 文件上传状态
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
      ];
      const allowedExts = ['.xlsx', '.docx', '.pdf'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        alert('只支持 PDF、DOCX、XLSX 格式的文件');
        return;
      }
      setUploadFile(file);
    }
  };

  const removeFile = () => {
    setUploadFile(null);
  };

  const [form, setForm] = useState({
    date: '',
    type: '',
    score: '',
    level: '',
    summary: '',
    strengths: '',
    improvements: '',
    reviewer: '',
  });

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      const [empRes, reviewRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`),
        fetch(`/api/employees/${employeeId}/performance-reviews`),
      ]);

      if (empRes.ok) {
        setEmployee(await empRes.json());
      }
      if (reviewRes.ok) {
        setReviews(await reviewRes.json());
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ date: '', type: '', score: '', level: '', summary: '', strengths: '', improvements: '', reviewer: '' });
    setEditingReviewId(null);
    setUploadFile(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (review: PerformanceReview) => {
    setEditingReviewId(review.id);
    setForm({
      date: review.date.split('T')[0],
      type: review.type,
      score: review.score.toString(),
      level: review.level || '',
      summary: review.summary,
      strengths: review.strengths || '',
      improvements: review.improvements || '',
      reviewer: review.reviewer,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.date || !form.type || !form.score || !form.summary || !form.reviewer) {
      alert('请填写所有必填字段');
      return;
    }

    const score = parseFloat(form.score);
    if (isNaN(score) || score < 0 || score > 100) {
      alert('评分必须在 0-100 之间');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!editingReviewId;

      // 使用 FormData 支持文件上传
      const formData = new FormData();
      formData.append('date', form.date);
      formData.append('type', form.type);
      formData.append('score', form.score);
      formData.append('summary', form.summary);
      formData.append('reviewer', form.reviewer);
      if (form.level) formData.append('level', form.level);
      if (form.strengths) formData.append('strengths', form.strengths);
      if (form.improvements) formData.append('improvements', form.improvements);
      if (isEdit) {
        formData.append('reviewId', editingReviewId);
      }
      if (uploadFile) {
        formData.append('file', uploadFile);
      }

      const res = await fetch(`/api/employees/${employeeId}/performance-reviews`, {
        method: isEdit ? 'PATCH' : 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        if (isEdit) {
          setReviews((prev) => prev.map((r) => r.id === editingReviewId ? result : r));
        } else {
          setReviews((prev) => [result, ...prev]);
        }
        setDialogOpen(false);
        resetForm();
        setUploadFile(null);
        // 刷新员工数据以更新评分
        const empRes = await fetch(`/api/employees/${employeeId}`);
        if (empRes.ok) setEmployee(await empRes.json());
      } else {
        const err = await res.json();
        alert(err.error || (isEdit ? '修改失败' : '创建失败'));
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  // 筛选考核记录
  const getFilteredReviews = () => {
    let filtered = reviews.filter((r) => {
      const reviewYear = new Date(r.date).getFullYear().toString();
      if (reviewYear !== selectedYear) return false;
      if (selectedQuarter) {
        const reviewMonth = new Date(r.date).getMonth() + 1;
        const quarterMonthsMap: Record<string, number[]> = {
          '1': [1, 2, 3],
          '2': [4, 5, 6],
          '3': [7, 8, 9],
          '4': [10, 11, 12],
        };
        const quarterMonths = quarterMonthsMap[selectedQuarter] || [];
        if (!quarterMonths.includes(reviewMonth)) return false;
      }
      if (selectedMonth) {
        const reviewMonth = (new Date(r.date).getMonth() + 1).toString();
        if (reviewMonth !== selectedMonth) return false;
      }
      return true;
    });
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filtered;
  };

  const filteredReviews = getFilteredReviews();

  if (loading) {
    return (
      <div className="container py-8 mx-auto">
        <div className="text-center py-16 text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container py-8 mx-auto">
        <div className="text-center py-16 text-muted-foreground">员工不存在</div>
      </div>
    );
  }

  return (
    <div className="container py-8 mx-auto">
      {/* 返回按钮 */}
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        返回员工列表
      </Link>

      {/* 员工信息卡片 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                {employee.candidate.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{employee.candidate.name}</h1>
                  <Badge className={statusMap[employee.status]?.className}>
                    {statusMap[employee.status]?.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    工号: {employee.employeeId}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {employee.department}
                  </span>
                  <span>{employee.position}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    入职: {new Date(employee.hireDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm text-muted-foreground">当前评分</div>
              <div className={`font-bold text-2xl ${getScoreColor(employee.currentScore)}`}>
                {employee.currentScore}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 考核记录区域 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            业绩考核记录
          </h2>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            添加考核记录
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReviewId ? '编辑考核记录' : '添加考核记录'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>考核日期 *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>考核类型 *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="选择考核类型" /></SelectTrigger>
                  <SelectContent>
                    {reviewTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>评分 (0-100) *</Label>
                  <Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>等级</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                    <SelectTrigger><SelectValue placeholder="选择等级" /></SelectTrigger>
                    <SelectContent>
                      {reviewLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>考核总结 *</Label>
                <Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>优势/亮点</Label>
                <Textarea rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>待改进项</Label>
                <Textarea rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>考核人 *</Label>
                <Input value={form.reviewer} onChange={(e) => setForm({ ...form, reviewer: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>附件上传</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.docx,.xlsx"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {uploadFile && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      <FileText className="h-4 w-4" />
                      <span className="max-w-[100px] truncate">{uploadFile.name}</span>
                      <button type="button" onClick={removeFile} className="ml-1 hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">支持 PDF、DOCX、XLSX 格式</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} disabled={submitting}>取消</Button>
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? '提交中...' : (editingReviewId ? '保存修改' : '提交')}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* 树形筛选：年份 -> 季度 -> 月份 */}
        <Card>
          <CardContent className="p-4">
            {/* 第一层：年份 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-muted-foreground shrink-0">年份：</span>
              <div className="flex flex-wrap gap-1">
                {years.map((year) => (
                  <Button
                    key={year}
                    variant={selectedYear === year.toString() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setSelectedYear(year.toString()); setSelectedQuarter(''); setSelectedMonth(''); }}
                    className="min-w-[60px]"
                  >
                    {year}年
                  </Button>
                ))}
              </div>
            </div>

            {/* 第二层：季度 */}
            {selectedYear && (
              <div className="flex items-center gap-2 mb-3 ml-8">
                <span className="text-sm font-medium text-muted-foreground shrink-0">季度：</span>
                <div className="flex flex-wrap gap-1">
                  {quarters.map((q) => {
                    const quarterReviews = reviews.filter((r) => {
                      const reviewYear = new Date(r.date).getFullYear().toString();
                      const reviewMonth = new Date(r.date).getMonth() + 1;
                      if (reviewYear !== selectedYear) return false;
                      const monthRanges: Record<string, [number, number]> = {
                        '1': [1, 3], '2': [4, 6], '3': [7, 9], '4': [10, 12],
                      };
                      const [start, end] = monthRanges[q.value] || [1, 12];
                      return reviewMonth >= start && reviewMonth <= end;
                    }).length;
                    return (
                      <Button
                        key={q.value}
                        variant={selectedQuarter === q.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setSelectedQuarter(selectedQuarter === q.value ? '' : q.value); setSelectedMonth(''); }}
                        className="min-w-[100px]"
                      >
                        {q.label.split(' ')[0]}
                        {quarterReviews > 0 && <span className="ml-1 text-xs opacity-70">({quarterReviews})</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 第三层：月份 */}
            {selectedYear && selectedQuarter && (
              <div className="flex items-center gap-2 ml-16">
                <span className="text-sm font-medium text-muted-foreground shrink-0">月份：</span>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const quarterMonthRanges: Record<string, [number, number]> = {
                      '1': [1, 3],
                      '2': [4, 6],
                      '3': [7, 9],
                      '4': [10, 12],
                    };
                    const [startMonth, endMonth] = quarterMonthRanges[selectedQuarter] || [1, 12];
                    const quarterMonths = Array.from({ length: endMonth - startMonth + 1 }, (_, i) => startMonth + i);

                    return quarterMonths.map((m) => {
                      const monthReviews = reviews.filter((r) => {
                        const reviewYear = new Date(r.date).getFullYear().toString();
                        const reviewMonth = new Date(r.date).getMonth() + 1;
                        return reviewYear === selectedYear && reviewMonth === m;
                      }).length;

                      return (
                        <Button
                          key={m}
                          variant={selectedMonth === m.toString() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedMonth(selectedMonth === m.toString() ? '' : m.toString())}
                          className="min-w-[50px]"
                        >
                          {m}月
                          {monthReviews > 0 && <span className="ml-1 text-xs opacity-70">({monthReviews})</span>}
                        </Button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 筛选后的考核记录 */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无考核记录</p>
            <p className="text-sm mt-1">点击"添加考核记录"按钮开始录入</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {selectedQuarter || selectedMonth
              ? `共 ${filteredReviews.length} 条记录`
              : `共 ${filteredReviews.length} 条记录（${selectedYear}年）`}
          </div>

          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>该时期暂无考核记录</p>
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{review.type}</Badge>
                      {review.level && (
                        <Badge className={levelColorMap[review.level] || ''}>
                          {review.level}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(review.date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className={`font-bold text-lg ${getScoreColor(review.score)}`}>
                          {review.score}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="编辑"
                        onClick={() => openEditDialog(review)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">考核总结：</span>
                      <span className="text-muted-foreground">{review.summary}</span>
                    </div>
                    {review.strengths && (
                      <div className="flex items-start gap-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">优势/亮点：</span>
                          <span className="text-muted-foreground">{review.strengths}</span>
                        </div>
                      </div>
                    )}
                    {review.improvements && (
                      <div className="flex items-start gap-1">
                        <TrendingDown className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">待改进项：</span>
                          <span className="text-muted-foreground">{review.improvements}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      考核人: {review.reviewer}
                    </div>
                    {(review as any).attachmentUrl && (
                      <a
                        href={(review as any).attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        {(review as any).attachmentName || '下载附件'}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

    </div>
  );
}
