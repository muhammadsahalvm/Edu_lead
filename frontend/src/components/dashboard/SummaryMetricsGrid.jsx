import React from 'react';
import {
  Users,
  UserPlus,
  UserX,
  Calendar,
  AlertTriangle,
  Award,
  TrendingUp,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';

export const SummaryMetricsGrid = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <MetricCard key={i} isLoading />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      id: 'total_leads',
      label: 'Total Leads',
      value: summary?.total_leads ?? 0,
      icon: Users,
      variant: 'primary',
      subtitle: 'All enquiries received',
    },
    {
      id: 'new_leads',
      label: 'New Leads',
      value: summary?.new_leads ?? 0,
      icon: UserPlus,
      variant: 'info',
      subtitle: 'Awaiting first contact',
    },
    {
      id: 'unassigned_leads',
      label: 'Unassigned Leads',
      value: summary?.unassigned_leads ?? 0,
      icon: UserX,
      variant: summary?.unassigned_leads > 0 ? 'warning' : 'default',
      subtitle: summary?.unassigned_leads > 0 ? 'Requires counsellor allocation' : 'Queue fully allocated',
      alert: summary?.unassigned_leads > 0,
    },
    {
      id: 'today_followups',
      label: "Today's Follow-ups",
      value: summary?.today_followups ?? summary?.todays_followups ?? 0,
      icon: Calendar,
      variant: 'success',
      subtitle: 'Scheduled interactions',
    },
    {
      id: 'overdue_followups',
      label: 'Overdue Follow-ups',
      value: summary?.overdue_followups ?? 0,
      icon: AlertTriangle,
      variant: summary?.overdue_followups > 0 ? 'danger' : 'default',
      subtitle: summary?.overdue_followups > 0 ? 'SLA deadline breached' : 'Zero overdue tasks',
      alert: summary?.overdue_followups > 0,
    },
    {
      id: 'converted_leads',
      label: 'Converted Leads',
      value: summary?.converted_leads ?? 0,
      icon: Award,
      variant: 'purple',
      subtitle: 'Confirmed enrollments',
    },
    {
      id: 'conversion_rate',
      label: 'Conversion Rate',
      value: `${summary?.conversion_rate ?? 0}%`,
      icon: TrendingUp,
      variant: 'success',
      subtitle: 'Converted / Total enquiries',
      tooltip: summary?.calculation_definition || 'Formula: (converted_leads / total_leads) * 100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          subtitle={m.subtitle}
          icon={m.icon}
          variant={m.variant}
          alert={m.alert}
          tooltip={m.tooltip}
        />
      ))}
    </div>
  );
};
