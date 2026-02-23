'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Building,
  Calendar,
  Award,
  AlertCircle,
  UserPlus,
  Download,
  BarChart3,
  Eye,
  Pencil,
  UserMinus,
  LogOut
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import TagCloudStats from '@/app/components/tag-cloud-stats';

interface Employee {
  id: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  probationEndDate: string;
  status: string;
  currentScore: number;
  resignDate?: string;
  resignReason?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    education?: string;
    currentPosition?: string;
    currentCompany?: string;
    department?: string;
  };
}

const statusMap: Record<string, { label: string; className: string }> = {
  PROBATION: { label: '试用期', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  REGULAR: { label: '正式录用', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  RESIGNED: { label: '已离职', className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' },
  TERMINATED: { label: '已解雇', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [showTagCloud, setShowTagCloud] = useState(false);
  const [tagStats, setTagStats] = useState<any[]>([]);
  const [tagStatsPeople, setTagStatsPeople] = useState(0);
  const [tagStatsLoading, setTagStatsLoading] = useState(false);
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [resignTarget, setResignTarget] = useState<Employee | null>(null);
  const [resignType, setResignType] = useState<'RESIGNED' | 'TERMINATED'>('RESIGNED');
  const [resignDate, setResignDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignReason, setResignReason] = useState('');
  const [resignSubmitting, setResignSubmitting] = useState(false);

  // 获取标签统计数据
  const fetchTagStats = async (department?: string, status?: string) => {
    // 离职员工无需统计标签
    if (status === 'RESIGNED') {
      setTagStats([]);
      setTagStatsPeople(0);
      return;
    }
    try {
      setTagStatsLoading(true);
      const params = new URLSearchParams();
      params.append('scope', 'employees');
      if (department) params.append('department', department);
      if (status) params.append('status', status);
      const response = await fetch(`/api/tags/stats?${params}`);
      if (!response.ok) {
        throw new Error('获取标签统计失败');
      }
      const data = await response.json();
      setTagStats(data.categories || []);
      setTagStatsPeople(data.totalPeople || 0);
    } catch (err) {
      console.error('获取标签统计错误:', err);
    } finally {
      setTagStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [departmentFilter]);

  // 筛选条件变化时自动刷新标签统计
  useEffect(() => {
    if (showTagCloud) {
      fetchTagStats(departmentFilter, statusFilter);
    }
  }, [departmentFilter, statusFilter, showTagCloud]);

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (departmentFilter) params.append('department', departmentFilter);

      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees || []);
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('获取员工列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter) params.append('department', departmentFilter);

      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const openResignDialog = (employee: Employee) => {
    setResignTarget(employee);
    setResignType('RESIGNED');
    setResignDate(new Date().toISOString().split('T')[0]);
    setResignReason('');
    setResignDialogOpen(true);
  };

  const handleResign = async () => {
    if (!resignTarget) return;
    setResignSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${resignTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resignType,
          resignDate: resignDate,
          resignReason: resignReason,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '离职处理失败');
        return;
      }
      setResignDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('离职处理失败:', error);
      alert('离职处理失败');
    } finally {
      setResignSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const filteredEmployees = employees.filter(emp => {
    const isResigned = ['RESIGNED', 'TERMINATED'].includes(emp.status);

    // 默认隐藏离职员工；手动切到“已离职”时显示离职/解雇
    if (!statusFilter && isResigned) return false;

    // 如果指定了具体状态，只显示该状态，但 RESIGNED 对应所有离职或解雇状态
    if (statusFilter) {
      if (statusFilter === 'RESIGNED') {
        if (!isResigned) return false;
      } else {
        if (emp.status !== statusFilter) return false;
      }
    }

    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      emp.candidate.name.toLowerCase().includes(searchLower) ||
      emp.employeeId.toLowerCase().includes(searchLower) ||
      emp.position.toLowerCase().includes(searchLower)
    );
  });

  // 排除离职人员后计算
  const activeEmployees = employees.filter(e => !['RESIGNED', 'TERMINATED'].includes(e.status));
  const stats = {
    total: activeEmployees.length,
    probation: activeEmployees.filter(e => e.status === 'PROBATION').length,
    regular: activeEmployees.filter(e => e.status === 'REGULAR').length,
    resigned: employees.filter(e => ['RESIGNED', 'TERMINATED'].includes(e.status)).length,
  };

  return (
    <div className="container py-8 mx-auto">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">人才储备库</h1>
          <p className="text-muted-foreground mt-1">管理已入职员工的人才档案</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowTagCloud(!showTagCloud)}
          >
            <BarChart3 className="h-4 w-4" />
            员工群像
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            导出
          </Button>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            添加员工
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === '' ? 'border-primary shadow-sm ring-1 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => setStatusFilter('')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">员工总数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'PROBATION' ? 'border-amber-400 shadow-sm ring-1 ring-amber-400' : 'hover:border-amber-400/50'}`}
          onClick={() => setStatusFilter(statusFilter === 'PROBATION' ? '' : 'PROBATION')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">试用期</p>
                <p className="text-2xl font-bold">{stats.probation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'REGULAR' ? 'border-emerald-400 shadow-sm ring-1 ring-emerald-400' : 'hover:border-emerald-400/50'}`}
          onClick={() => setStatusFilter(statusFilter === 'REGULAR' ? '' : 'REGULAR')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">正式员工</p>
                <p className="text-2xl font-bold">{stats.regular}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'RESIGNED' ? 'border-slate-400 shadow-sm ring-1 ring-slate-400' : 'hover:border-slate-400/50'}`}
          onClick={() => setStatusFilter(statusFilter === 'RESIGNED' ? '' : 'RESIGNED')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/30">
                <LogOut className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已离职</p>
                <p className="text-2xl font-bold">{stats.resigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 候选人群像区域 */}
      {showTagCloud && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {tagStatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">加载中...</p>
              </div>
            ) : statusFilter === 'RESIGNED' ? (
              <p className="text-center text-muted-foreground py-8">离职员工暂不统计标签群像</p>
            ) : tagStats.length > 0 ? (
              <TagCloudStats
                data={tagStats}
                totalPeople={tagStatsPeople}
                title={[
                  departmentFilter ? `${departmentFilter}` : '',
                  statusFilter === 'PROBATION' ? '试用期' : statusFilter === 'REGULAR' ? '正式员工' : '',
                  '员工群像',
                ].filter(Boolean).join(' · ')}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无标签数据</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索员工姓名、工号、职位..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="PROBATION">试用期</option>
              <option value="REGULAR">正式录用</option>
              <option value="RESIGNED">已离职</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">全部部门</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <Button onClick={handleSearch}>
              <Filter className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 员工列表 */}
      <Card>
        <CardHeader>
          <CardTitle>员工列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无员工数据</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-muted/50 px-4 -mx-4 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {employee.candidate.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/candidates/${employee.candidate.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {employee.candidate.name}
                        </Link>
                        <Badge className={statusMap[employee.status]?.className}>
                          {statusMap[employee.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {(() => {
                          const dept = (employee.department && employee.department !== '-')
                            ? employee.department
                            : employee.candidate.department;
                          return (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {dept || '-'}
                            </span>
                          );
                        })()}
                        <span>{employee.position}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(employee.hireDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      {['RESIGNED', 'TERMINATED'].includes(employee.status) && employee.resignDate && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <LogOut className="h-3 w-3" />
                            离职日期: {new Date(employee.resignDate).toLocaleDateString('zh-CN')}
                          </span>
                          {employee.resignReason && (
                            <span className="truncate max-w-[200px]" title={employee.resignReason}>
                              原因: {employee.resignReason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block mr-4">
                      <div className="text-sm text-muted-foreground">评分</div>
                      <div className={`font-bold text-lg ${getScoreColor(employee.currentScore)}`}>
                        {Math.round(employee.currentScore)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/candidates/${employee.candidate.id}`} title="查看详情">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/candidates/${employee.candidate.id}/edit`} title="编辑信息">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/employees/${employee.id}/performance`} title="查看绩效">
                          <BarChart3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!['RESIGNED', 'TERMINATED'].includes(employee.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="离职处理"
                          onClick={() => openResignDialog(employee)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 离职处理对话框 */}
      <Dialog open={resignDialogOpen} onOpenChange={setResignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>离职处理</DialogTitle>
            <DialogDescription>
              确认对员工 <span className="font-medium text-foreground">{resignTarget?.candidate.name}</span> 进行离职处理，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>离职类型</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={resignType}
                onChange={(e) => setResignType(e.target.value as 'RESIGNED' | 'TERMINATED')}
              >
                <option value="RESIGNED">主动离职</option>
                <option value="TERMINATED">辞退</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>离职日期</Label>
              <Input
                type="date"
                value={resignDate}
                onChange={(e) => setResignDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>离职原因</Label>
              <Textarea
                placeholder="请输入离职原因..."
                value={resignReason}
                onChange={(e) => setResignReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignDialogOpen(false)} disabled={resignSubmitting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleResign} disabled={resignSubmitting}>
              {resignSubmitting ? '处理中...' : '确认离职'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
