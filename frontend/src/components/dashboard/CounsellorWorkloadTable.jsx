import React from 'react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Users, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

export const CounsellorWorkloadTable = ({ workload = [], isLoading }) => {
  return (
    <Card
      title="Counsellor Workload Distribution"
      subtitle="Operational capacity balancing: assigned leads, pending interactions, and overdue tasks"
      bodyClassName="p-0 overflow-x-auto"
    >
      {isLoading ? (
        <div className="p-6">
          <div className="h-44 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : workload.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Users}
            title="No Counsellors Registered"
            description="Active admission counsellors will appear here with live task allocations."
          />
        </div>
      ) : (
        <table className="w-full text-left text-xs saas-table">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Counsellor</th>
              <th className="py-3 px-4">Queue Status</th>
              <th className="py-3 px-4 text-center">Assigned Leads</th>
              <th className="py-3 px-4 text-center">Pending Follow-ups</th>
              <th className="py-3 px-4 text-center">Overdue Follow-ups</th>
              <th className="py-3 px-4 text-right">Capacity State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workload.map((c) => {
              const assigned = c.assigned_leads_count ?? c.assigned_lead_count ?? 0;
              const pending = c.pending_followups_count ?? c.pending_followup_count ?? 0;
              const overdue = c.overdue_followups_count ?? c.overdue_followup_count ?? 0;

              return (
                <tr key={c.counsellor_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        {c.full_name?.[0] || c.username?.[0] || 'C'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate leading-tight">{c.full_name}</p>
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{c.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {c.is_available_for_assignment ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Away / Paused
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-slate-900 text-xs tabular-nums">{assigned}</span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="font-medium text-slate-700 tabular-nums">{pending}</span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {overdue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {overdue}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        0
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {overdue > 0 ? (
                      <span className="text-[11px] font-semibold text-rose-600">
                        Attention Required
                      </span>
                    ) : assigned > 6 ? (
                      <span className="text-[11px] font-medium text-amber-600">
                        High Load
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-600">
                        Balanced
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
};
