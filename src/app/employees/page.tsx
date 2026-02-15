'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Building,
  Calendar,
  Award,
  AlertCircle,
  UserPlus,
  Download,
  BarChart3
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
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
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    education?: string;
    currentPosition?: string;
    currentCompany?: string;
  };
}

const statusMap: Record<string, { label: string; className: string }> = {
  PROBATION: { label: '试用期', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  REGULAR: { label: '正式员工', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
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

  // 获取标签统计数据
  const fetchTagStats = async () => {
    try {
      setTagStatsLoading(true);
      const response = await fetch('/api/tags/stats?scope=employees');
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
  }, [statusFilter, departmentFilter]);

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
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
      if (statusFilter) params.append('status', statusFilter);
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const filteredEmployees = employees.filter(emp => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      emp.candidate.name.toLowerCase().includes(searchLower) ||
      emp.employeeId.toLowerCase().includes(searchLower) ||
      emp.position.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: employees.length,
    probation: employees.filter(e => e.status === 'PROBATION').length,
    regular: employees.filter(e => e.status === 'REGULAR').length,
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
            onClick={() => {
              setShowTagCloud(!showTagCloud);
              if (!showTagCloud && tagStats.length === 0) {
                fetchTagStats();
              }
            }}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
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
        <Card>
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
        <Card>
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
            ) : tagStats.length > 0 ? (
              <TagCloudStats data={tagStats} totalPeople={tagStatsPeople} title="人才库标签统计" />
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
              <option value="REGULAR">正式员工</option>
              <option value="RESIGNED">已离职</option>
              <option value="TERMINATED">已解雇</option>
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
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {employee.department}
                        </span>
                        <span>{employee.position}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(employee.hireDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm text-muted-foreground">评分</div>
                      <div className={`font-bold text-lg ${getScoreColor(employee.currentScore)}`}>
                        {employee.currentScore}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/candidates/${employee.candidate.id}`}>查看详情</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/candidates/${employee.candidate.id}/edit`}>编辑信息</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>查看绩效</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">离职处理</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
