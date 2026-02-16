'use client';

import { Mail, Phone, Building2, Briefcase, ChevronRight, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  currentPosition?: string | null;
  currentCompany?: string | null;
  avatar?: string;
  totalScore?: number | null;
  status: string;
  tags?: { id: string; name: string; category: string }[];
  isOnline?: boolean;
}

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: '新建档案', className: 'status-badge-screening' },
  SCREENING: { label: '筛选中', className: 'status-badge-screening' },
  TALENT_POOL: { label: '人才池', className: 'status-badge-screening' },
  INTERVIEWING: { label: '面试中', className: 'status-badge-interviewing' },
  OFFERED: { label: '已发offer', className: 'status-badge-offered' },
  ONBOARDING: { label: '入职中', className: 'status-badge-onboarding' },
  PROBATION: { label: '试用期', className: 'status-badge-probation' },
  EMPLOYED: { label: '正式员工', className: 'status-badge-active' },
  REJECTED: { label: '已拒绝', className: 'status-badge-rejected' },
  ARCHIVED: { label: '已归档', className: 'status-badge-archived' },
};

const tagColors: Record<string, string> = {
  SKILL: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  INDUSTRY: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  EDUCATION: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  EXPERIENCE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PERSONALITY: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  OTHER: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const status = statusConfig[employee.status] || { label: employee.status, className: 'status-badge-archived' };

  return (
    <div
      onClick={onClick}
      className="employee-row group cursor-pointer"
    >
      {/* 头像区域 */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-slate-800">
          <AvatarImage src={employee.avatar} alt={employee.name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium">
            {employee.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        {/* 在线状态指示器 */}
        <div className={`avatar-status ${employee.isOnline ? 'avatar-status-online' : 'avatar-status-offline'}`} />
      </div>

      {/* 主要信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-slate-200 truncate">
            {employee.name}
          </h4>
          <span className={`status-badge ${status.className}`}>
            {status.label}
          </span>
        </div>
        
        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
          {employee.currentPosition && (
            <div className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              <span className="truncate">{employee.currentPosition}</span>
            </div>
          )}
          {employee.currentCompany && (
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{employee.currentCompany}</span>
            </div>
          )}
        </div>

        {/* 联系方式 */}
        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            <span className="truncate">{employee.email}</span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{employee.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* 标签区域 */}
      {employee.tags && employee.tags.length > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {employee.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className={`px-2 py-0.5 text-xs rounded-full border ${tagColors[tag.category] || tagColors.OTHER}`}
            >
              {tag.name}
            </span>
          ))}
          {employee.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-400">
              +{employee.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 评分 */}
      {employee.totalScore !== null && employee.totalScore !== undefined && (
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">
              {employee.totalScore.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-slate-500">人才评分</span>
        </div>
      )}

      {/* 箭头指示 */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-slate-500" />
      </div>
    </div>
  );
}

interface EmployeeListProps {
  employees: Employee[];
  onSelectEmployee?: (employee: Employee) => void;
  loading?: boolean;
}

export function EmployeeList({ employees, onSelectEmployee, loading }: EmployeeListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="employee-row animate-pulse">
            <div className="h-12 w-12 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          onClick={() => onSelectEmployee?.(employee)}
        />
      ))}
    </div>
  );
}
