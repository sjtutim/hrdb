'use client';

import { useEffect, useState } from 'react';
import { 
  X, Mail, Phone, MapPin, Calendar, Building2, Briefcase, 
  GraduationCap, Star, FileText, MessageSquare, Download, 
  Edit3, UserPlus, ChevronRight, Award, TrendingUp 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, Tooltip
} from 'recharts';

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
  education?: string | null;
  workExperience?: number | null;
  hireDate?: string | null;
  department?: string;
  skills?: { name: string; level: number }[];
  projects?: { name: string; role: string; period: string }[];
  evaluations?: { type: string; score: number; date: string }[];
}

interface EmployeeDrawerProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onInterview?: () => void;
}

const skillData = [
  { subject: '专业技能', A: 85, fullMark: 100 },
  { subject: '沟通能力', A: 90, fullMark: 100 },
  { subject: '团队协作', A: 88, fullMark: 100 },
  { subject: '学习能力', A: 92, fullMark: 100 },
  { subject: '解决问题', A: 86, fullMark: 100 },
  { subject: '领导力', A: 75, fullMark: 100 },
];

export function EmployeeDrawer({ employee, isOpen, onClose, onEdit, onExport, onInterview }: EmployeeDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !employee) return null;

  const statusConfig: Record<string, { label: string; className: string }> = {
    NEW: { label: '新建档案', className: 'status-badge-screening' },
    SCREENING: { label: '筛选中', className: 'status-badge-screening' },
    INTERVIEWING: { label: '面试中', className: 'status-badge-interviewing' },
    OFFERED: { label: '已发offer', className: 'status-badge-offered' },
    ONBOARDING: { label: '入职中', className: 'status-badge-onboarding' },
    PROBATION: { label: '试用期', className: 'status-badge-probation' },
    EMPLOYED: { label: '正式员工', className: 'status-badge-active' },
    REJECTED: { label: '已拒绝', className: 'status-badge-rejected' },
    ARCHIVED: { label: '已归档', className: 'status-badge-archived' },
  };

  const status = statusConfig[employee.status] || { label: employee.status, className: 'status-badge-archived' };

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* 抽屉 */}
      <div className={`side-drawer ${isOpen ? 'animate-slide-in-right' : 'translate-x-full'} transition-transform duration-300`}>
        <div className="h-full flex flex-col">
          {/* Header - 大留白设计 */}
          <div className="flex-shrink-0 px-8 pt-8 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 ring-4 ring-slate-800/50">
                  <AvatarImage src={employee.avatar} alt={employee.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-semibold">
                    {employee.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">{employee.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    {employee.currentPosition && (
                      <span className="text-slate-400">{employee.currentPosition}</span>
                    )}
                    <span className={`status-badge ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {employee.department && (
                    <p className="text-sm text-slate-500 mt-1">{employee.department}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 评分展示 */}
            {employee.totalScore && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Star className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">综合人才评分</p>
                      <p className="text-2xl font-bold text-blue-400">{employee.totalScore.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">行业平均</p>
                    <p className="text-sm text-slate-400">72.5</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 可滚动内容区 */}
          <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 scrollbar-hide">
            {/* 基本信息卡片 */}
            <section className="bento-card">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">邮箱</p>
                    <p className="text-sm text-slate-200">{employee.email}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">电话</p>
                      <p className="text-sm text-slate-200">{employee.phone}</p>
                    </div>
                  </div>
                )}
                {employee.education && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">学历</p>
                      <p className="text-sm text-slate-200">{employee.education}</p>
                    </div>
                  </div>
                )}
                {employee.workExperience !== null && employee.workExperience !== undefined && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/50">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">工作年限</p>
                      <p className="text-sm text-slate-200">{employee.workExperience} 年</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 技能矩阵 - 雷达图 */}
            <section className="bento-card">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">技能矩阵</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={skillData}>
                    <PolarGrid stroke="rgba(51, 65, 85, 0.5)" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]} 
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="技能水平"
                      dataKey="A"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="#3b82f6"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 工作经历 */}
            <section className="bento-card">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">工作经历</h3>
              <div className="space-y-4">
                {employee.currentCompany && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Building2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-200">{employee.currentCompany}</p>
                        <span className="text-xs text-slate-500">至今</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{employee.currentPosition}</p>
                    </div>
                  </div>
                )}
                {/* 模拟更多经历 */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200">某科技有限公司</p>
                      <span className="text-xs text-slate-500">2020 - 2023</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">高级工程师</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 评估记录 */}
            <section className="bento-card">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">评估记录</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-300">简历评估</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">85分</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">技术面试</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">88分</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-300">综合评分</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">86.5分</span>
                </div>
              </div>
            </section>
          </div>

          {/* 底部悬浮操作按钮 */}
          <div className="flex-shrink-0 p-6 border-t border-slate-700/50 bg-gradient-to-t from-slate-900/50 to-transparent">
            <div className="flex items-center gap-3">
              <button 
                onClick={onEdit}
                className="fab flex-1"
              >
                <Edit3 className="w-4 h-4" />
                <span>编辑档案</span>
              </button>
              <button 
                onClick={onExport}
                className="fab flex-1 bg-slate-800/80 border-slate-700 hover:bg-slate-800"
              >
                <Download className="w-4 h-4" />
                <span>导出</span>
              </button>
              <button 
                onClick={onInterview}
                className="fab flex-1 bg-emerald-500/90 border-emerald-400/30 hover:bg-emerald-500"
              >
                <UserPlus className="w-4 h-4" />
                <span>约谈</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
