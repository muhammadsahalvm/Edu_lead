import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Phone, MessageSquare, Users, Clock, ExternalLink } from 'lucide-react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { FollowUpStatusBadge } from '../common/Badge';

const getChannelIcon = (type) => {
  switch (type) {
    case 'CALL':
    case 'PHONE_CALL':
      return <Phone className="w-3.5 h-3.5 text-blue-600" />;
    case 'WHATSAPP':
      return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
    case 'COUNSELLING':
    case 'MEETING':
      return <Users className="w-3.5 h-3.5 text-purple-600" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-slate-500" />;
  }
};

export const TodayFollowupsWidget = ({ followups = [], isLoading }) => {
  return (
    <Card
      title="Today's Scheduled Follow-ups"
      subtitle="Candidate outreach scheduled for today across all counsellors"
      action={
        <Link
          to="/followups"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <span>View All Tasks</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      }
      bodyClassName="p-0 overflow-x-auto"
    >
      {isLoading ? (
        <div className="p-6">
          <div className="h-44 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : followups.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Calendar}
            title="No Follow-ups Today"
            description="There are no candidate interactions scheduled for today's date."
            className="py-6 border-none"
          />
        </div>
      ) : (
        <table className="w-full text-left text-xs saas-table">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-4">Lead</th>
              <th className="py-2.5 px-4">Counsellor</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Scheduled Time</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {followups.slice(0, 6).map((item) => {
              const scheduledTime = item.scheduled_at
                ? new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—';

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4">
                    <Link
                      to={`/leads/${item.lead}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5"
                    >
                      <span>{item.lead_name || `Lead #${item.lead}`}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {item.lead_number}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 text-slate-700 font-medium">
                    {item.assigned_to_name || 'Unassigned'}
                  </td>

                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      {getChannelIcon(item.followup_type)}
                      <span>{item.followup_type_display || item.followup_type}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {scheduledTime}
                  </td>

                  <td className="py-2.5 px-4 text-right">
                    <FollowUpStatusBadge status={item.status} isOverdue={item.is_overdue} />
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
