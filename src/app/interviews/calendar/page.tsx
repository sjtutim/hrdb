'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/app/lib/utils';

// 面试类型定义
interface Interview {
  id: string;
  candidateName: string;
  position: string;
  interviewerName: string;
  scheduledAt: string; // ISO 日期字符串
  location: string;
  type: 'PHONE' | 'TECHNICAL' | 'HR' | 'MANAGER' | 'PERSONALITY';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
}

// 面试类型映射
const interviewTypeMap = {
  PHONE: { label: '电话面试', color: 'bg-blue-100 text-blue-800' },
  TECHNICAL: { label: '技术面试', color: 'bg-green-100 text-green-800' },
  HR: { label: 'HR面试', color: 'bg-purple-100 text-purple-800' },
  MANAGER: { label: '主管面试', color: 'bg-amber-100 text-amber-800' },
  PERSONALITY: { label: '性格测试', color: 'bg-pink-100 text-pink-800' },
};

// 面试状态映射
const interviewStatusMap = {
  SCHEDULED: { label: '已安排', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: '已取消', color: 'bg-red-100 text-red-800' },
  RESCHEDULED: { label: '已重排', color: 'bg-amber-100 text-amber-800' },
};

export default function InterviewCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [interviewDetailsOpen, setInterviewDetailsOpen] = useState(false);

  // 获取当前月份的所有日期
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // 获取当前月份的名称
  const currentMonthName = format(currentMonth, 'yyyy年MM月', { locale: zhCN });

  // 切换到上个月
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 切换到下个月
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 选择日期
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // 查看面试详情
  const handleInterviewClick = (interview: Interview) => {
    setSelectedInterview(interview);
    setInterviewDetailsOpen(true);
  };

  // 关闭面试详情对话框
  const handleCloseInterviewDetails = () => {
    setInterviewDetailsOpen(false);
    setSelectedInterview(null);
  };

  // 模拟获取面试数据
  useEffect(() => {
    // 这里应该是从API获取数据，现在使用模拟数据
    const mockInterviews: Interview[] = [
      {
        id: '1',
        candidateName: '张三',
        position: '前端开发工程师',
        interviewerName: '李经理',
        scheduledAt: new Date(2025, 2, 5, 10, 0).toISOString(), // 3月5日 10:00
        location: '线上会议',
        type: 'TECHNICAL',
        status: 'SCHEDULED',
      },
      {
        id: '2',
        candidateName: '李四',
        position: '后端开发工程师',
        interviewerName: '王主管',
        scheduledAt: new Date(2025, 2, 5, 14, 30).toISOString(), // 3月5日 14:30
        location: '会议室A',
        type: 'TECHNICAL',
        status: 'SCHEDULED',
      },
      {
        id: '3',
        candidateName: '王五',
        position: '产品经理',
        interviewerName: '赵总监',
        scheduledAt: new Date(2025, 2, 8, 11, 0).toISOString(), // 3月8日 11:00
        location: '会议室B',
        type: 'MANAGER',
        status: 'SCHEDULED',
      },
      {
        id: '4',
        candidateName: '赵六',
        position: 'UI设计师',
        interviewerName: '孙经理',
        scheduledAt: new Date(2025, 2, 12, 15, 0).toISOString(), // 3月12日 15:00
        location: '线上会议',
        type: 'HR',
        status: 'SCHEDULED',
      },
      {
        id: '5',
        candidateName: '钱七',
        position: '数据分析师',
        interviewerName: '周主管',
        scheduledAt: new Date(2025, 2, 15, 10, 30).toISOString(), // 3月15日 10:30
        location: '会议室C',
        type: 'PHONE',
        status: 'SCHEDULED',
      },
    ];

    setInterviews(mockInterviews);
  }, []);

  // 获取指定日期的面试
  const getInterviewsForDate = (date: Date) => {
    return interviews.filter((interview) => 
      isSameDay(parseISO(interview.scheduledAt), date)
    );
  };

  // 检查日期是否有面试
  const hasInterviewsOnDate = (date: Date) => {
    return getInterviewsForDate(date).length > 0;
  };

  // 获取当前选中日期的面试
  const selectedDateInterviews = selectedDate 
    ? getInterviewsForDate(selectedDate)
    : [];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">面试日历</h1>
      
      {/* 日历导航 */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          上个月
        </Button>
        <h2 className="text-xl font-semibold">{currentMonthName}</h2>
        <Button variant="outline" onClick={goToNextMonth}>
          下个月
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {/* 星期标题 */}
        {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day) => (
          <div key={day} className="text-center font-medium py-2">
            {day}
          </div>
        ))}
        
        {/* 日期填充 - 获取当月第一天是星期几，并填充前面的空白 */}
        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
          <div key={`empty-start-${index}`} className="h-28 border rounded-lg bg-gray-50"></div>
        ))}
        
        {/* 日期单元格 */}
        {daysInMonth.map((date) => {
          const dateInterviews = getInterviewsForDate(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isCurrentDay = isToday(date);
          
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "h-28 border rounded-lg p-2 cursor-pointer transition-colors",
                isSelected ? "border-blue-500 border-2" : "hover:bg-gray-50",
                isCurrentDay ? "bg-blue-50" : ""
              )}
              onClick={() => handleDateClick(date)}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "inline-block rounded-full w-7 h-7 text-center leading-7",
                  isCurrentDay ? "bg-blue-500 text-white" : ""
                )}>
                  {format(date, 'd')}
                </span>
                {hasInterviewsOnDate(date) && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {dateInterviews.length}
                  </Badge>
                )}
              </div>
              
              {/* 显示当天的前2个面试 */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {dateInterviews.slice(0, 2).map((interview) => (
                  <div 
                    key={interview.id}
                    className={cn(
                      "text-xs p-1 rounded truncate",
                      interviewTypeMap[interview.type].color
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterviewClick(interview);
                    }}
                  >
                    {format(parseISO(interview.scheduledAt), 'HH:mm')} {interview.candidateName}
                  </div>
                ))}
                {dateInterviews.length > 2 && (
                  <div className="text-xs text-gray-500">
                    还有 {dateInterviews.length - 2} 个面试...
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* 日期填充 - 填充月末的空白 */}
        {Array.from({ length: 6 - endOfMonth(currentMonth).getDay() }).map((_, index) => (
          <div key={`empty-end-${index}`} className="h-28 border rounded-lg bg-gray-50"></div>
        ))}
      </div>
      
      {/* 选中日期的面试列表 */}
      {selectedDate && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })} 的面试安排
            </h3>
            
            {selectedDateInterviews.length === 0 ? (
              <p className="text-gray-500">当天没有安排面试。</p>
            ) : (
              <div className="space-y-4">
                {selectedDateInterviews.map((interview) => (
                  <div 
                    key={interview.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleInterviewClick(interview)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{interview.candidateName}</h4>
                        <p className="text-sm text-gray-600">{interview.position}</p>
                      </div>
                      <Badge className={interviewTypeMap[interview.type].color}>
                        {interviewTypeMap[interview.type].label}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-500" />
                        {format(parseISO(interview.scheduledAt), 'HH:mm')}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        {interview.interviewerName}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                        {interview.location}
                      </div>
                      <div className="flex items-center">
                        <Badge className={interviewStatusMap[interview.status].color}>
                          {interviewStatusMap[interview.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 面试详情对话框 */}
      <Dialog open={interviewDetailsOpen} onOpenChange={setInterviewDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>面试详情</DialogTitle>
            <DialogDescription>
              查看面试详细信息
            </DialogDescription>
          </DialogHeader>
          
          {selectedInterview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">候选人</p>
                  <p className="font-medium">{selectedInterview.candidateName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">应聘职位</p>
                  <p className="font-medium">{selectedInterview.position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">面试官</p>
                  <p className="font-medium">{selectedInterview.interviewerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">面试类型</p>
                  <Badge className={interviewTypeMap[selectedInterview.type].color}>
                    {interviewTypeMap[selectedInterview.type].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">面试时间</p>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {format(parseISO(selectedInterview.scheduledAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">面试地点</p>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                    {selectedInterview.location}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">状态</p>
                  <Badge className={interviewStatusMap[selectedInterview.status].color}>
                    {interviewStatusMap[selectedInterview.status].label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseInterviewDetails}
            >
              关闭
            </Button>
            <Button
              type="button"
              onClick={handleCloseInterviewDetails}
            >
              编辑面试
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
