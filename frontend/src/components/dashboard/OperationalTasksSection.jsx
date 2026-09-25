import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  Users,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge, AgeingBadge } from '../common/Badge';

const getFollowupIcon = (type) => {
  switch (type) {
    case 'CALL':
    case 'PHONE_CALL':
      return <Phone className="w-3.5 h-3.5 text-blue-500" />;
    case 'WHATSAPP':
      return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
    case 'COUNSELLING':
    case 'MEETING':
      return <Users className="w-3.5 h-3.5 text-purple-500" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-slate-500" />;
  }
};

export const OperationalTasksSection = ({
  todaysFollowups = [],
  overdueFollowups = [],
  recentLeads = [],
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState('overdue');

  const tabs = [
    {
      id: 'overdue',
      label: 'Overdue Follow-ups',
      count: overdueFollowups.length,
      icon: AlertTriangle,
      danger: overdueFollowups.length > 0,
    },
    {
      id: 'today',
      label: "Today's Schedule",
      count: todaysFollowups.length,
      icon: Calendar,
      highlight: todaysFollowups.length > 0,
    },
    {
      id: 'recent',
      label: 'Recently Updated Leads',
      count: recentLeads.length,
      icon: Clock,
    },
  ];

  return (
    <Card
      title="Live Operational Queues"
      subtitle="Actionable follow-up tasks and recently updated student enquiries"
      bodyClassName="p-0"
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 bg-slate-50/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  tab.danger ? 'text-rose-500' : tab.highlight ? 'text-indigo-500' : ''
                }`}
              />
              <span>{tab.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tab.danger
                    ? 'bg-rose-100 text-rose-700'
                    : isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'overdue' ? (
          overdueFollowups.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All Caught Up!"
              description="No overdue follow-ups found. Every candidate has been addressed within expected SLAs."
              className="border-none py-6"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {overdueFollowups.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 mt-0.5">
                      {getFollowupIcon(item.followup_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/leads/${item.lead}`}
                          className="font-semibold text-xs text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        >
                          <span>{item.lead_name || `Lead #${item.lead}`}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.lead_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.followup_type_display} • Assigned to:{' '}
                        <strong className="text-slate-700">{item.assigned_to_name}</strong>
                      </p>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <AlertTriangle className="w-3 h-3" />
                      Due: {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(item.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'today' ? (
          todaysFollowups.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Tasks for Today"
              description="No follow-up tasks currently scheduled for today. Check upcoming agenda."
              className="border-none py-6"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {todaysFollowups.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 mt-0.5">
                      {getFollowupIcon(item.followup_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/leads/${item.lead}`}
                          className="font-semibold text-xs text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        >
                          <span>{item.lead_name || `Lead #${item.lead}`}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.lead_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.followup_type_display} • Assigned to:{' '}
                        <strong className="text-slate-700">{item.assigned_to_name}</strong>
                      </p>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Time: {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Recent Leads */
          recentLeads.length === 0 ? (
            <EmptyState
              title="No Recent Enquiries"
              description="New prospective student enquiries will appear here in chronological order."
              className="border-none py-6"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLeads.slice(0, 6).map((lead) => (
                <div
                  key={lead.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {lead.first_name?.[0] || 'L'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="font-semibold text-xs text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        >
                          <span>{lead.full_name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <span className="text-[10px] font-mono text-slate-400">
                          {lead.lead_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lead.course_name || 'General Enquiry'} • Counsellor:{' '}
                        <strong className="text-slate-700">
                          {lead.counsellor_name || 'Unassigned'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={lead.status} />
                    <AgeingBadge category={lead.ageing_category} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
};
