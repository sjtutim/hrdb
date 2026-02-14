'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function Sparkline({ data, color = '#3b82f6', trend = 'neutral' }: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));
  
  const strokeColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : color;

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            strokeLinecap="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  sparklineData: number[];
  icon?: React.ReactNode;
}

export function KPICard({ title, value, change, trend = 'neutral', sparklineData, icon }: KPICardProps) {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−';

  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="kpi-label mb-2">{title}</p>
          <p className="kpi-value text-3xl sm:text-4xl">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor}`}>
              <span>{trendIcon}</span>
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          {icon && (
            <div className="p-2.5 rounded-xl bg-slate-800/50 text-blue-400 border border-slate-700/50 group-hover:border-blue-500/30 transition-colors">
              {icon}
            </div>
          )}
          <Sparkline data={sparklineData} trend={trend} />
        </div>
      </div>
    </div>
  );
}
