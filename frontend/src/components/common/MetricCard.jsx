import React from 'react';
import { Info } from 'lucide-react';

export const MetricCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  alert = false,
  tooltip,
  isLoading = false,
  className = '',
  onClick,
}) => {
  const iconVariants = {
    default: 'text-slate-600 bg-slate-50 border-slate-200',
    primary: 'text-indigo-600 bg-indigo-50/80 border-indigo-100',
    success: 'text-emerald-600 bg-emerald-50/80 border-emerald-100',
    warning: 'text-amber-600 bg-amber-50/80 border-amber-200',
    danger: 'text-rose-600 bg-rose-50/80 border-rose-200',
    info: 'text-sky-600 bg-sky-50/80 border-sky-100',
    purple: 'text-purple-600 bg-purple-50/80 border-purple-100',
  };

  if (isLoading) {
    return (
      <div className={`p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="w-8 h-8 rounded-lg bg-slate-100" />
        </div>
        <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
        <div className="h-2.5 w-24 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 bg-white rounded-xl border transition-all duration-150 shadow-xs ${
        alert
          ? 'border-amber-300 ring-1 ring-amber-200/70 bg-gradient-to-b from-amber-50/20 to-white'
          : 'border-slate-200/80 hover:border-slate-300'
      } ${onClick ? 'cursor-pointer hover:shadow-sm' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate" title={label}>
          {label}
        </span>
        {Icon && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
              iconVariants[variant] || iconVariants.default
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-0.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {value ?? 0}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[11px] text-slate-500 truncate">{subtitle}</span>
        {tooltip && (
          <span
            title={tooltip}
            className="cursor-help text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Info className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
};
