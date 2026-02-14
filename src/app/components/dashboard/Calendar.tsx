'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'interview' | 'deadline' | 'meeting' | 'review';
  title: string;
}

interface MiniCalendarProps {
  events?: CalendarEvent[];
  onSelectDate?: (date: Date) => void;
}

const eventColors = {
  interview: 'bg-blue-500',
  deadline: 'bg-red-500',
  meeting: 'bg-purple-500',
  review: 'bg-amber-500',
};

export function MiniCalendar({ events = [], onSelectDate }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // 计算偏移量，使日历从周一开始
  const startOffset = (getDay(monthStart) + 6) % 7;

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const handleSelectDate = (day: Date) => {
    setSelectedDate(day);
    onSelectDate?.(day);
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="bento-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            今天
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 偏移空白 */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleSelectDate(day)}
              className={`
                calendar-day relative
                ${isToday ? 'today' : ''}
                ${isSelected ? 'active' : ''}
                ${dayEvents.length > 0 && !isToday ? 'text-slate-200' : 'text-slate-400'}
              `}
            >
              <span className="relative z-10">{format(day, 'd')}</span>
              
              {/* 事件指示点 */}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${eventColors[event.type]}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="w-1 h-1 rounded-full bg-slate-500" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-400">面试</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-slate-400">截止</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs text-slate-400">会议</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-400">评估</span>
        </div>
      </div>
    </div>
  );
}
