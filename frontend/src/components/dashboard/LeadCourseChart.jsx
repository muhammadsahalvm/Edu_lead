import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { GraduationCap } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold text-slate-100">{data.course_name}</p>
        <p className="text-slate-300 mt-0.5">
          Code: <span className="font-mono text-blue-300">{data.course_code}</span>
        </p>
        <p className="text-slate-300">
          Enquiries: <span className="font-bold text-white">{data.count}</span> ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export const LeadCourseChart = ({ courses = [], isLoading }) => {
  const totalLeads = courses.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <Card
      title="Academic Program Demand"
      subtitle="Lead volume distribution and interest grouped by degree course"
      className="h-full"
    >
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-full h-48 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : totalLeads === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Course Preferences Recorded"
          description="Lead interest grouped by degree program will render here as leads are recorded."
        />
      ) : (
        <div>
          <div className="h-64 w-full rounded-lg bg-slate-50/70 px-2 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={courses}
                margin={{ top: 12, right: 12, left: -12, bottom: 16 }}
              >
                <defs>
                  <linearGradient id="leadCourseBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#004A6B" />
                    <stop offset="100%" stopColor="#8CB9CC" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#DFEAF0" strokeDasharray="3 5" />
                <XAxis
                  dataKey="course_code"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tick={{ fontSize: 10, fill: '#52656D' }}
                  interval={0}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6C8791' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" barSize={30} radius={[8, 8, 0, 0]} fill="url(#leadCourseBlue)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100">
            {courses.slice(0, 4).map((c) => (
              <div key={c.course_id || c.course_code} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate max-w-[200px]" title={c.course_name}>
                  {c.course_name}
                </span>
                <span className="font-semibold text-slate-800">
                  {c.count} leads ({c.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
