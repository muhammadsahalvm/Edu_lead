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
import { Filter, ArrowRight } from 'lucide-react';

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
        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/70">
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
          <div className="h-64 w-full rounded-lg bg-slate-50/70 px-2 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ top: 8, right: 18, left: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="leadFunnelBlue" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#7db7ff" />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke="#e6ebf2" strokeDasharray="3 5" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis
                  dataKey="stage_display"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                  width={138}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" barSize={19} radius={[0, 8, 8, 0]} fill="url(#leadFunnelBlue)" />
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
