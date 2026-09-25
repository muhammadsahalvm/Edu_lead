import React from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  AlertTriangle,
  Award,
  TrendingUp,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';

export const SummaryMetricsGrid = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCard key={i} isLoading />
        ))}
      </div>
    );
  }

  const unassigned = summary?.unassigned_leads ?? 0;
  const overdue = summary?.overdue_followups ?? 0;
  const total = summary?.total_leads ?? 0;
  const newLeads = summary?.new_leads ?? 0;
  const today = summary?.today_followups ?? summary?.todays_followups ?? 0;
  const converted = summary?.converted_leads ?? 0;
  const rate = summary?.conversion_rate ?? 0;

  const metrics = [
    {
      id: 'total_leads',
      label: 'Total Leads',
      value: total,
      icon: Users,
      variant: 'primary',
      subtitle: '+12.4% vs prev cycle',
    },
    {
      id: 'new_leads',
      label: 'New Leads',
      value: newLeads,
      icon: UserCheck,
      variant: 'info',
      subtitle: unassigned > 0 ? `${unassigned} Unassigned` : 'All allocated',
      alert: unassigned > 0,
    },
    {
      id: 'today_followups',
      label: "Today's Follow-ups",
      value: today,
      icon: Calendar,
      variant: 'success',
      subtitle: 'Scheduled outreach',
    },
    {
      id: 'overdue_followups',
      label: 'Overdue SLA',
      value: overdue,
      icon: AlertTriangle,
      variant: overdue > 0 ? 'danger' : 'default',
      subtitle: overdue > 0 ? 'Requires immediate triage' : 'SLA compliant',
      alert: overdue > 0,
    },
    {
      id: 'converted_leads',
      label: 'Enrolled / Converted',
      value: converted,
      icon: Award,
      variant: 'purple',
      subtitle: 'Confirmed admissions',
    },
    {
      id: 'conversion_rate',
      label: 'Net Yield Rate',
      value: `${rate}%`,
      icon: TrendingUp,
      variant: 'success',
      subtitle: `${rate}% Conversion yield`,
      tooltip: summary?.calculation_definition || 'Formula: (converted_leads / total_leads) * 100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
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
