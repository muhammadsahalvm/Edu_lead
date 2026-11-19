import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../common/Card';
import { CheckCircle2 } from 'lucide-react';

const formatDay = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(year, month - 1, day));
};

const CompletionTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-blue-700">
        <span className="font-bold tabular-nums">{payload[0].value}</span>{' '}
        {payload[0].value === 1 ? 'task completed' : 'tasks completed'}
      </p>
    </div>
  );
};

export const TaskCompletionChart = ({ data = [], isLoading = false, className = '' }) => {
  const total = data.reduce((sum, day) => sum + (day.count || 0), 0);
  const chartData = data.map((day) => ({
    ...day,
    dayLabel: formatDay(day.date),
  }));

  return (
    <Card
      title="Tasks Completed"
      subtitle="Your completed follow-ups over the last 7 days"
      className={`h-full flex flex-col ${className}`}
      bodyClassName="flex flex-1 flex-col"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {total} this week
        </span>
      }
    >
      {isLoading ? (
        <div className="min-h-[280px] flex-1 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="min-h-[280px] w-full flex-1 rounded-xl bg-slate-50/70 px-2 py-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 14, right: 14, bottom: 4, left: -18 }}>
              <CartesianGrid vertical={false} stroke="#DFEAF0" strokeDasharray="3 5" />
              <XAxis
                dataKey="dayLabel"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fontSize: 11, fill: '#52656D' }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={32}
                tick={{ fontSize: 10, fill: '#6C8791' }}
              />
              <Tooltip content={<CompletionTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Tasks completed"
                stroke="#00638E"
                strokeWidth={3}
                dot={{ r: 3, fill: '#ffffff', stroke: '#00638E', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#00638E', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
