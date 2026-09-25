import React from 'react';
import {
  Sparkles,
  UserCheck,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Ban,
  MessageSquare,
  History,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

const getActivityConfig = (type) => {
  switch (type) {
    case 'LEAD_CREATED':
      return {
        icon: Sparkles,
        bgColor: 'bg-indigo-50 border-indigo-200 text-indigo-600',
        dotColor: 'bg-indigo-600',
      };
    case 'LEAD_ASSIGNED':
    case 'LEAD_REASSIGNED':
      return {
        icon: UserCheck,
        bgColor: 'bg-purple-50 border-purple-200 text-purple-600',
        dotColor: 'bg-purple-600',
      };
    case 'STATUS_CHANGED':
      return {
        icon: RefreshCw,
        bgColor: 'bg-blue-50 border-blue-200 text-blue-600',
        dotColor: 'bg-blue-600',
      };
    case 'FOLLOWUP_CREATED':
      return {
        icon: Calendar,
        bgColor: 'bg-sky-50 border-sky-200 text-sky-600',
        dotColor: 'bg-sky-600',
      };
    case 'FOLLOWUP_COMPLETED':
      return {
        icon: CheckCircle2,
        bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        dotColor: 'bg-emerald-600',
      };
    case 'FOLLOWUP_MISSED':
      return {
        icon: AlertTriangle,
        bgColor: 'bg-amber-50 border-amber-200 text-amber-600',
        dotColor: 'bg-amber-600',
      };
    case 'FOLLOWUP_CANCELLED':
      return {
        icon: Ban,
        bgColor: 'bg-rose-50 border-rose-200 text-rose-600',
        dotColor: 'bg-rose-600',
      };
    default:
      return {
        icon: MessageSquare,
        bgColor: 'bg-slate-50 border-slate-200 text-slate-600',
        dotColor: 'bg-slate-500',
      };
  }
};

export const LeadTimeline = ({ timeline = [], isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="md" className="text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading audit history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
        <p className="font-semibold">Unable to load activity timeline</p>
        <p className="mt-0.5 text-rose-600">{error}</p>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No Activity Recorded"
        description="Chronological log of outreach, status changes, and assignments will appear here."
        className="py-6 border-none"
      />
    );
  }

  return (
    <div className="relative pl-6 before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 space-y-6">
      {timeline.map((item) => {
        const config = getActivityConfig(item.activity_type);
        const Icon = config.icon;

        const dateObj = new Date(item.created_at);
        const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = dateObj.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return (
          <div key={item.id} className="relative group">
            {/* Dot & Icon Marker */}
            <span
              className={`absolute -left-[27px] top-1 w-6 h-6 rounded-full border flex items-center justify-center shadow-xs bg-white ${config.bgColor}`}
            >
              <Icon className="w-3 h-3" />
            </span>

            {/* Bubble Card */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900">
                    {item.activity_type_display || item.activity_type}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {item.actor_name || 'System Automated'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {dateFormatted} at {timeFormatted}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {item.details}
              </p>

              {/* State Transition Diff Pill */}
              {(item.old_value || item.new_value) && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                  {item.old_value && (
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {item.old_value}
                    </span>
                  )}
                  {item.old_value && item.new_value && (
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  )}
                  {item.new_value && (
                    <span className="font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                      {item.new_value}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
