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
import { Filter, ArrowRight } from 'lucide-react';

const STAGE_COLORS = [
  '#6366f1', // NEW (Indigo)
  '#0ea5e9', // CONTACTED (Sky)
  '#3b82f6', // INTERESTED (Blue)
  '#8b5cf6', // COUNSELLING_SCHEDULED (Purple)
  '#f59e0b', // APPLICATION_STARTED (Amber)
  '#10b981', // APPLICATION_SUBMITTED (Emerald)
  '#059669', // CONVERTED (Deep Emerald)
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-lg shadow-lg border border-slate-700/80">
        <p className="font-semibold text-slate-100">{data.stage_display}</p>
        <p className="text-slate-300 mt-1">
          Active Leads: <span className="font-bold text-white tabular-nums">{data.count}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const LeadFunnelChart = ({ funnel = [], isLoading }) => {
  const totalInFunnel = funnel.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <Card
      title="Lead Conversion Funnel"
      subtitle="Progression from initial enquiry to enrolled student"
      action={
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/70">
          {totalInFunnel} Leads in Funnel
        </span>
      }
    >
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-full h-52 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : totalInFunnel === 0 ? (
        <EmptyState
          icon={Filter}
          title="No Funnel Data"
          description="There are currently no active leads in the intake pipeline."
        />
      ) : (
        <div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  dataKey="stage_display"
                  type="category"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                  width={145}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel progression pipeline pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 overflow-x-auto text-center">
            {funnel.map((item, idx) => (
              <React.Fragment key={item.stage}>
                <div className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100 min-w-[70px]">
                  <span className="block text-[10px] text-slate-500 font-medium truncate" title={item.stage_display}>
                    {item.stage_display.split(' ')[0]}
                  </span>
                  <span className="block text-xs font-bold text-slate-800 tabular-nums">{item.count}</span>
                </div>
                {idx < funnel.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
