import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Compass } from 'lucide-react';

const SOURCE_COLORS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700">
        <p className="font-semibold text-slate-100">{data.source_display}</p>
        <p className="text-slate-300 mt-0.5">
          Count: <span className="font-bold text-white">{data.count}</span> ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export const LeadSourceChart = ({ sources = [], isLoading }) => {
  const totalLeads = sources.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <Card
      title="Leads by Acquisition Source"
      subtitle="Volume and attribution percentage per outreach channel"
    >
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-full h-48 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : totalLeads === 0 ? (
        <EmptyState
          icon={Compass}
          title="No Source Records"
          description="Lead acquisition source metrics will appear as student enquiries are ingested."
        />
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-60 w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="count"
                  nameKey="source_display"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {sources.map((entry, index) => (
                    <Cell
                      key={`source-cell-${index}`}
                      fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Clean Channel List with Counts and Percentages */}
          <div className="w-full sm:w-1/2 space-y-2 text-xs">
            {sources.map((item, idx) => (
              <div key={item.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: SOURCE_COLORS[idx % SOURCE_COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate" title={item.source_display}>
                    {item.source_display}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-900">{item.count}</span>
                  <span className="text-slate-400 text-[10px] w-10 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
