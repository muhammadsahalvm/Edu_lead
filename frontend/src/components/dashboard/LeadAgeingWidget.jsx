import React from 'react';
import { Card } from '../common/Card';
import { Clock, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export const LeadAgeingWidget = ({ ageing, isLoading }) => {
  const fresh = ageing?.fresh || 0;
  const ageingCount = ageing?.ageing || 0;
  const stale = ageing?.stale || 0;
  const closed = ageing?.closed || 0;

  const totalActive = fresh + ageingCount + stale;
  const grandTotal = totalActive + closed;

  const freshPct = totalActive > 0 ? Math.round((fresh / totalActive) * 100) : 0;
  const ageingPct = totalActive > 0 ? Math.round((ageingCount / totalActive) * 100) : 0;
  const stalePct = totalActive > 0 ? Math.round((stale / totalActive) * 100) : 0;

  return (
    <Card
      title="Lead Ageing & Pipeline Health"
      subtitle="Dynamic age evaluation from created_at: Fresh (0-2d), Ageing (3-7d), Stale (8+d)"
      action={
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {totalActive} Active Leads
        </span>
      }
    >
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-full h-36 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Proportion bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-slate-600">
              <span>Pipeline Age Composition</span>
              <span>{stale > 0 ? `${stale} Stale Need Attention` : 'All Leads Within SLA'}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
              {freshPct > 0 && (
                <div
                  style={{ width: `${freshPct}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`Fresh: ${fresh} (${freshPct}%)`}
                />
              )}
              {ageingPct > 0 && (
                <div
                  style={{ width: `${ageingPct}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Ageing: ${ageingCount} (${ageingPct}%)`}
                />
              )}
              {stalePct > 0 && (
                <div
                  style={{ width: `${stalePct}%` }}
                  className="bg-rose-500 transition-all duration-300"
                  title={`Stale: ${stale} (${stalePct}%)`}
                />
              )}
            </div>
          </div>

          {/* Cards for the 3 active tiers + closed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fresh */}
            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-emerald-800">Fresh Leads</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-950">{fresh}</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                0–{ageing?.fresh_threshold_days || 2} days • {freshPct}% of active
              </p>
            </div>

            {/* Ageing */}
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-amber-800">Ageing Leads</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-amber-950">{ageingCount}</p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                3–{ageing?.ageing_threshold_days || 7} days • {ageingPct}% of active
              </p>
            </div>

            {/* Stale */}
            <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-rose-800">Stale Leads</span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className="text-xl font-bold text-rose-950">{stale}</p>
              <p className="text-[10px] text-rose-700 mt-0.5">
                8+ days • {stalePct}% of active
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Closed / Converted: <strong className="text-slate-700">{closed} leads</strong></span>
            </span>
            <span className="text-[11px] text-slate-400">
              Total Ingested: {grandTotal}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
