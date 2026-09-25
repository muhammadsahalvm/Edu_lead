import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    neutral: 'bg-slate-50 text-slate-600 border-slate-200/80',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium leading-tight',
    md: 'text-xs px-2.5 py-0.5 font-medium leading-tight',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

/**
 * Maps LeadStatus strings to exact Stitch lifecycle tokens.
 */
export const StatusBadge = ({ status }) => {
  const statusMap = {
    NEW: {
      label: 'New',
      className: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
      dotClass: 'bg-[#2563eb]',
    },
    CONTACTED: {
      label: 'Contacted',
      className: 'bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]',
      dotClass: 'bg-[#0284c7]',
    },
    INTERESTED: {
      label: 'Interested',
      className: 'bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]',
      dotClass: 'bg-[#4f46e5]',
    },
    COUNSELLING_SCHEDULED: {
      label: 'Counselling Scheduled',
      className: 'bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]',
      dotClass: 'bg-[#7c3aed]',
    },
    APPLICATION_STARTED: {
      label: 'App Started',
      className: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
      dotClass: 'bg-[#d97706]',
    },
    APPLICATION_SUBMITTED: {
      label: 'App Submitted',
      className: 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]',
      dotClass: 'bg-[#ea580c]',
    },
    CONVERTED: {
      label: 'Converted / Enrolled',
      className: 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]',
      dotClass: 'bg-[#059669]',
    },
    NO_RESPONSE: {
      label: 'No Response',
      className: 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]',
      dotClass: 'bg-[#64748b]',
    },
    LOST: {
      label: 'Lost / Closed',
      className: 'bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]',
      dotClass: 'bg-[#e11d48]',
    },
    NOT_INTERESTED: {
      label: 'Not Interested',
      className: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]',
      dotClass: 'bg-[#475569]',
    },
  };

  const config = statusMap[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium leading-tight shadow-2xs ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
};

/**
 * Maps Ageing Category (Fresh, Ageing, Stale) with Stitch dot and duration formatting.
 */
export const AgeingBadge = ({ category, days }) => {
  const cat = String(category || '').toUpperCase();
  const daysFormatted = days !== undefined && days !== null ? `${Math.round(days)}d` : null;

  if (cat.includes('FRESH')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] text-[11px] font-medium leading-tight shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
        <span>Fresh</span>
        {daysFormatted && <span className="font-mono-data opacity-80 text-[10px]">({daysFormatted})</span>}
      </span>
    );
  }
  if (cat.includes('AGEING')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-[#fffbeb] text-[#92400e] border-[#fde68a] text-[11px] font-medium leading-tight shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />
        <span>Ageing</span>
        {daysFormatted && <span className="font-mono-data opacity-80 text-[10px]">({daysFormatted})</span>}
      </span>
    );
  }
  if (cat.includes('STALE')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-[#fff1f2] text-[#9f1239] border-[#fecdd3] text-[11px] font-medium leading-tight shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] shrink-0" />
        <span>Stale</span>
        {daysFormatted && <span className="font-mono-data opacity-80 text-[10px]">({daysFormatted})</span>}
      </span>
    );
  }
  return <Badge variant="neutral">{category || 'Active'}</Badge>;
};

/**
 * Maps FollowUpStatus and overdue state to semantic Badges.
 */
export const FollowUpStatusBadge = ({ status, isOverdue = false }) => {
  if (status === 'COMPLETED') {
    return <Badge variant="success" dot size="sm">Completed</Badge>;
  }
  if (status === 'CANCELLED') {
    return <Badge variant="neutral" size="sm">Cancelled</Badge>;
  }
  if (status === 'MISSED') {
    return <Badge variant="danger" dot size="sm">Missed</Badge>;
  }
  if (isOverdue) {
    return <Badge variant="danger" dot size="sm">Overdue SLA</Badge>;
  }
  return <Badge variant="primary" dot size="sm">Pending</Badge>;
};

/**
 * Maps Priority level to compact Badges.
 */
export const PriorityBadge = ({ priority }) => {
  const p = String(priority || '').toUpperCase();
  if (p === 'HIGH') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
        High
      </span>
    );
  }
  if (p === 'MEDIUM') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[11px] font-normal">
      Low
    </span>
  );
};
