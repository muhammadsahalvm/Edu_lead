import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium leading-tight',
    md: 'text-xs px-2.5 py-0.5 font-medium leading-tight',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.neutral}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

/**
 * Maps LeadStatus strings to visually clean, semantic Badges with WCAG AA compliant contrast.
 */
export const StatusBadge = ({ status }) => {
  const statusMap = {
    NEW: { label: 'New', variant: 'primary' },
    CONTACTED: { label: 'Contacted', variant: 'info' },
    INTERESTED: { label: 'Interested', variant: 'warning' },
    COUNSELLING_SCHEDULED: { label: 'Counselling', variant: 'purple' },
    APPLICATION_STARTED: { label: 'App Started', variant: 'warning' },
    APPLICATION_SUBMITTED: { label: 'App Submitted', variant: 'info' },
    CONVERTED: { label: 'Converted', variant: 'success' },
    NO_RESPONSE: { label: 'No Response', variant: 'neutral' },
    LOST: { label: 'Lost', variant: 'danger' },
    NOT_INTERESTED: { label: 'Not Interested', variant: 'danger' },
  };

  const config = statusMap[status] || { label: status, variant: 'neutral' };

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
};

/**
 * Maps Ageing Category (Fresh, Ageing, Stale) to semantic Badges.
 */
export const AgeingBadge = ({ category }) => {
  const cat = String(category || '').toUpperCase();
  if (cat.includes('FRESH')) {
    return <Badge variant="success">Fresh (0-2d)</Badge>;
  }
  if (cat.includes('AGEING')) {
    return <Badge variant="warning">Ageing (3-7d)</Badge>;
  }
  if (cat.includes('STALE')) {
    return <Badge variant="danger">Stale (8+d)</Badge>;
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
    return <Badge variant="danger" dot size="sm">Overdue</Badge>;
  }
  return <Badge variant="primary" dot size="sm">Pending</Badge>;
};

/**
 * Maps Priority level to compact Badges.
 */
export const PriorityBadge = ({ priority }) => {
  const p = String(priority || '').toUpperCase();
  if (p === 'HIGH') {
    return <Badge variant="danger" size="sm">High Priority</Badge>;
  }
  if (p === 'MEDIUM') {
    return <Badge variant="neutral" size="sm">Medium</Badge>;
  }
  return <Badge variant="neutral" size="sm">Low</Badge>;
};
