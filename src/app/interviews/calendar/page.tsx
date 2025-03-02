'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/zh-cn';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Clock, MapPin, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { cn } from '@/app/lib/utils';

// 设置本地化
moment.locale('zh-cn');
const localizer = momentLocalizer(moment);

// 面试类型定义
interface Interview {
  id: string;
  title: string; // 用于日历显示
  candidateName: string;
  position: string;
  interviewerName: string;
  start: Date; // 开始时间
  end: Date; // 结束时间
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

// 自定义样式
const customStyles = `
.rbc-calendar {
  min-height: 600px;
}
.rbc-event {
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.85em;
}
.rbc-day-slot .rbc-event {
  border: none;
}
.rbc-today {
  background-color: rgba(66, 153, 225, 0.1);
}
.year-view {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px;
}
.year-view-month {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: all 0.2s ease;
}
.year-view-month:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
}
.year-view-month-header {
  text-align: center;
  font-weight: 500;
  font-size: 0.9rem;
  color: #4a5568;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid #edf2f7;
}
.year-view-month-count {
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  color: #3182ce;
  margin-top: 4px;
}
.year-view-month-label {
  text-align: center;
  font-size: 0.75rem;
  color: #718096;
  margin-top: 4px;
}
`;

// 年视图组件
const YearView = ({ date, localizer, events }: any) => {
  // 获取当前年份
  const year = date.getFullYear();
  
  // 计算每个月的面试数量
  const monthCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    
    events.forEach((event: any) => {
      const eventDate = new Date(event.start);
      if (eventDate.getFullYear() === year) {
        counts[eventDate.getMonth()]++;
      }
    });
    
    return counts;
  }, [events, year]);
  
  // 渲染月份卡片
  const renderMonths = () => {
    const months = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(year, i, 1);
      const hasInterviews = monthCounts[i] > 0;
      
      months.push(
        <div key={i} className="year-view-month">
          <div className="year-view-month-header">
            {localizer.format(monthDate, 'MMMM')}
          </div>
          <div className="year-view-month-count" style={{ color: hasInterviews ? '#3182ce' : '#a0aec0' }}>
            {monthCounts[i]}
          </div>
          <div className="year-view-month-label">面试</div>
        </div>
      );
    }
    
    return months;
  };
  
  return (
    <div className="year-view">
      {renderMonths()}
    </div>
  );
};

// 添加必要的静态方法
YearView.navigate = (date: Date, action: string) => {
  switch (action) {
    case 'PREV':
      return new Date(date.getFullYear() - 1, 0, 1);
    case 'NEXT':
      return new Date(date.getFullYear() + 1, 0, 1);
    default:
      return date;
  }
};

YearView.title = (date: Date) => {
  return `${date.getFullYear()}年`;
};

export default function InterviewCalendarPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [interviewDetailsOpen, setInterviewDetailsOpen] = useState(false);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());

  // 处理选择面试事件
  const handleSelectEvent = (interview: Interview) => {
    setSelectedInterview(interview);
    setInterviewDetailsOpen(true);
  };

  // 关闭面试详情对话框
  const handleCloseInterviewDetails = () => {
    setInterviewDetailsOpen(false);
    setSelectedInterview(null);
  };

  // 自定义事件样式
  const eventStyleGetter = useCallback((event: Interview) => {
    const type = event.type;
    const backgroundColor = type === 'PHONE' ? '#DBEAFE' : 
                           type === 'TECHNICAL' ? '#DCFCE7' : 
                           type === 'HR' ? '#F3E8FF' : 
                           type === 'MANAGER' ? '#FEF3C7' : 
                           '#FCE7F3';
    const style = {
      backgroundColor,
      borderRadius: '4px',
      opacity: event.status === 'CANCELLED' ? 0.6 : 1,
      color: '#1F2937',
      border: '0',
      display: 'block',
    };
    return {
      style,
    };
  }, []);

  // 模拟获取面试数据
  useEffect(() => {
    // 这里应该是从API获取数据，现在使用模拟数据
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // 生成30个面试数据，分布在当前月份的不同日期
    const generateMockInterviews = () => {
      const types: Array<'PHONE' | 'TECHNICAL' | 'HR' | 'MANAGER' | 'PERSONALITY'> = [
        'PHONE', 'TECHNICAL', 'HR', 'MANAGER', 'PERSONALITY'
      ];
      const statuses: Array<'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'> = [
        'SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'
      ];
      const locations = ['线上会议', '会议室A', '会议室B', '会议室C', '会议室D'];
      const positions = [
        '前端开发工程师', '后端开发工程师', 'UI设计师', '产品经理', 
        '数据分析师', '测试工程师', 'DevOps工程师', '项目经理'
      ];
      const interviewers = [
        '李经理', '王主管', '赵总监', '孙经理', '周主管', 
        '吴总监', '郑经理', '钱主管', '张总监', '刘经理'
      ];
      
      const mockData: Interview[] = [];
      
      // 基础数据
      const baseInterviews: Interview[] = [
        {
          id: '1',
          title: '张三 - 前端开发工程师',
          candidateName: '张三',
          position: '前端开发工程师',
          interviewerName: '李经理',
          start: new Date(2025, 2, 5, 10, 0),
          end: new Date(2025, 2, 5, 11, 0),
          scheduledAt: new Date(2025, 2, 5, 10, 0).toISOString(),
          location: '线上会议',
          type: 'TECHNICAL',
          status: 'SCHEDULED',
        },
        {
          id: '2',
          title: '李四 - 后端开发工程师',
          candidateName: '李四',
          position: '后端开发工程师',
          interviewerName: '王主管',
          start: new Date(2025, 2, 5, 14, 30),
          end: new Date(2025, 2, 5, 15, 30),
          scheduledAt: new Date(2025, 2, 5, 14, 30).toISOString(),
          location: '会议室A',
          type: 'TECHNICAL',
          status: 'SCHEDULED',
        },
        {
          id: '3',
          title: '王五 - 产品经理',
          candidateName: '王五',
          position: '产品经理',
          interviewerName: '赵总监',
          start: new Date(2025, 2, 8, 11, 0),
          end: new Date(2025, 2, 8, 12, 0),
          scheduledAt: new Date(2025, 2, 8, 11, 0).toISOString(),
          location: '会议室B',
          type: 'MANAGER',
          status: 'SCHEDULED',
        },
        {
          id: '4',
          title: '赵六 - UI设计师',
          candidateName: '赵六',
          position: 'UI设计师',
          interviewerName: '孙经理',
          start: new Date(2025, 2, 12, 15, 0),
          end: new Date(2025, 2, 12, 16, 0),
          scheduledAt: new Date(2025, 2, 12, 15, 0).toISOString(),
          location: '线上会议',
          type: 'HR',
          status: 'SCHEDULED',
        },
        {
          id: '5',
          title: '钱七 - 数据分析师',
          candidateName: '钱七',
          position: '数据分析师',
          interviewerName: '周主管',
          start: new Date(2025, 2, 15, 10, 30),
          end: new Date(2025, 2, 15, 11, 30),
          scheduledAt: new Date(2025, 2, 15, 10, 30).toISOString(),
          location: '会议室C',
          type: 'PHONE',
          status: 'SCHEDULED',
        },
      ];
      
      mockData.push(...baseInterviews);
      
      // 生成额外的随机面试数据
      for (let i = 6; i <= 30; i++) {
        // 随机生成当前月份内的日期
        const day = Math.floor(Math.random() * 28) + 1;
        const hour = Math.floor(Math.random() * 8) + 9; // 9点到16点
        const minute = Math.random() > 0.5 ? 0 : 30;
        
        const startDate = new Date(2025, 2, day, hour, minute);
        const endDate = new Date(2025, 2, day, hour + 1, minute);
        
        const firstName = String.fromCharCode(Math.floor(Math.random() * 20) + 0x9000);
        const secondName = String.fromCharCode(Math.floor(Math.random() * 20) + 0x9000);
        const candidateName = `${firstName}${secondName}`;
        
        const position = positions[Math.floor(Math.random() * positions.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const interviewerName = interviewers[Math.floor(Math.random() * interviewers.length)];
        
        mockData.push({
          id: i.toString(),
          title: `${candidateName} - ${position}`,
          candidateName,
          position,
          interviewerName,
          start: startDate,
          end: endDate,
          scheduledAt: startDate.toISOString(),
          location,
          type,
          status,
        });
      }
      
      return mockData;
    };

    const mockInterviews = generateMockInterviews();
    setInterviews(mockInterviews);
  }, []);

  // 自定义工具栏
  const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    return (
      <div className="flex justify-between items-center mb-4 p-2">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('PREV')}>
            上一页
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('NEXT')}>
            下一页
          </Button>
        </div>
        <h2 className="text-xl font-semibold">{label}</h2>
        <div className="flex space-x-2">
          <Button 
            variant={view === 'week' ? "default" : "outline"} 
            size="sm" 
            onClick={() => onView('week')}
          >
            周视图
          </Button>
          <Button 
            variant={view === 'month' ? "default" : "outline"} 
            size="sm" 
            onClick={() => onView('month')}
          >
            月视图
          </Button>
          <Button 
            variant={view === 'year' ? "default" : "outline"} 
            size="sm" 
            onClick={() => onView('year')}
          >
            年视图
          </Button>
        </div>
      </div>
    );
  };

  // 自定义日期头部格式
  const formats = {
    monthHeaderFormat: 'YYYY年MM月',
    weekHeaderFormat: 'YYYY年MM月DD日',
    dayHeaderFormat: 'YYYY年MM月DD日',
    dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => 
      `${moment(start).format('YYYY年MM月DD日')} - ${moment(end).format('DD日')}`,
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">面试日历</h1>
      
      {/* 自定义样式 */}
      <style jsx global>{customStyles}</style>
      
      {/* 日历视图 */}
      <Card>
        <CardContent className="p-6">
          <div className="h-[700px]">
            <Calendar
              localizer={localizer}
              events={interviews}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={{
                week: true,
                month: true,
                year: YearView
              }}
              view={view}
              onView={(newView) => setView(newView)}
              date={date}
              onNavigate={(newDate) => setDate(newDate)}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              formats={formats}
              components={{
                toolbar: CustomToolbar,
              }}
              messages={{
                today: '今天',
                previous: '上一页',
                next: '下一页',
                month: '月',
                week: '周',
                year: '年',
                date: '日期',
                time: '时间',
                event: '事件',
                noEventsInRange: '此时间段内没有面试安排',
                showMore: (total) => `+${total}个更多`,
              }}
            />
          </div>
        </CardContent>
      </Card>
      
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
                    {moment(selectedInterview.start).format('YYYY-MM-DD HH:mm')}
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
