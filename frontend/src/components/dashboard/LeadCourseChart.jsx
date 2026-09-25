import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { GraduationCap } from 'lucide-react';

const COURSE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold text-slate-100">{data.course_name}</p>
        <p className="text-slate-300 mt-0.5">
          Code: <span className="font-mono text-indigo-300">{data.course_code}</span>
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
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={courses}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <XAxis
                  dataKey="course_code"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {courses.map((entry, index) => (
                    <Cell
                      key={`course-cell-${index}`}
                      fill={COURSE_COLORS[index % COURSE_COLORS.length]}
                    />
                  ))}
                </Bar>
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
