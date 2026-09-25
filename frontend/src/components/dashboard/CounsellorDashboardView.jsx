import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  Phone,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { StatusBadge, AgeingBadge, PriorityBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { StatusUpdateModal } from '../leads/StatusUpdateModal';
import { ScheduleFollowUpModal } from '../leads/ScheduleFollowUpModal';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const CounsellorDashboardView = ({
  user,
  dashboardData,
  overdueFollowups = [],
  todaysFollowups = [],
  recentLeads = [],
  isLoading,
  onRefresh,
}) => {
  const navigate = useNavigate();

  // Selected lead for quick action modals
  const [selectedLead, setSelectedLead] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const summary = dashboardData?.summary || {};
  const funnel = dashboardData?.funnel || [];

  // Real KPI calculations from backend data
  const myLeadsCount = summary.total_leads ?? 0;
  const todayFollowupsCount = summary.today_followups ?? summary.todays_followups ?? todaysFollowups.length;
  const overdueFollowupsCount = summary.overdue_followups ?? overdueFollowups.length;
  const pendingFollowupsCount = todayFollowupsCount + overdueFollowupsCount;

  const interestedLeadsCount =
    funnel.find((f) => f.stage === 'INTERESTED')?.count ?? 0;
  const applicationsInProgressCount =
    (funnel.find((f) => f.stage === 'APPLICATION_STARTED')?.count ?? 0) +
    (funnel.find((f) => f.stage === 'APPLICATION_SUBMITTED')?.count ?? 0);

  // Build the "Needs Attention" prioritized items
  // 1. Overdue follow-ups
  // 2. Follow-ups due today
  // 3. New uncontacted leads
  // 4. Stale leads
  const attentionItems = [];
  const seenLeadIds = new Set();

  // Tier 1: Overdue follow-ups
  overdueFollowups.forEach((f) => {
    if (!seenLeadIds.has(f.lead)) {
      seenLeadIds.add(f.lead);
      attentionItems.push({
        id: `overdue-${f.id}`,
        leadId: f.lead,
        leadNumber: f.lead_number,
        leadName: f.lead_name || `Lead #${f.lead}`,
        courseName: f.course_name || 'Academic Program',
        status: f.lead_status || 'IN_PROGRESS',
        priorityReason: 'Overdue Follow-up (SLA Breach)',
        priorityType: 'danger',
        scheduledAt: f.scheduled_at,
        notes: f.notes,
        followupType: f.followup_type,
        leadRaw: { id: f.lead, full_name: f.lead_name, lead_number: f.lead_number },
      });
    }
  });

  // Tier 2: Today's follow-ups
  todaysFollowups.forEach((f) => {
    if (!seenLeadIds.has(f.lead)) {
      seenLeadIds.add(f.lead);
      attentionItems.push({
        id: `today-${f.id}`,
        leadId: f.lead,
        leadNumber: f.lead_number,
        leadName: f.lead_name || `Lead #${f.lead}`,
        courseName: f.course_name || 'Academic Program',
        status: f.lead_status || 'IN_PROGRESS',
        priorityReason: 'Due Today',
        priorityType: 'warning',
        scheduledAt: f.scheduled_at,
        notes: f.notes,
        followupType: f.followup_type,
        leadRaw: { id: f.lead, full_name: f.lead_name, lead_number: f.lead_number },
      });
    }
  });

  // Tier 3 & 4: New / Uncontacted or Stale from recent leads
  recentLeads.forEach((lead) => {
    if (!seenLeadIds.has(lead.id)) {
      if (lead.status === 'NEW') {
        seenLeadIds.add(lead.id);
        attentionItems.push({
          id: `new-${lead.id}`,
          leadId: lead.id,
          leadNumber: lead.lead_number,
          leadName: lead.full_name,
          courseName: lead.course_name || 'Academic Program',
          status: lead.status,
          priorityReason: 'New Enquirer (Awaiting First Contact)',
          priorityType: 'info',
          scheduledAt: null,
          notes: lead.notes,
          leadRaw: lead,
        });
      } else if (lead.ageing_category === 'STALE') {
        seenLeadIds.add(lead.id);
        attentionItems.push({
          id: `stale-${lead.id}`,
          leadId: lead.id,
          leadNumber: lead.lead_number,
          leadName: lead.full_name,
          courseName: lead.course_name || 'Academic Program',
          status: lead.status,
          priorityReason: 'Stale Lead (8+ days without resolution)',
          priorityType: 'warning',
          scheduledAt: null,
          notes: lead.notes,
          leadRaw: lead,
        });
      }
    }
  });

  const handleOpenStatusModal = (lead) => {
    setSelectedLead(lead);
    setIsStatusModalOpen(true);
  };

  const handleOpenScheduleModal = (lead) => {
    setSelectedLead(lead);
    setIsScheduleModalOpen(true);
  };

  const counsellorName = user?.first_name || user?.username || 'Counsellor';

  return (
    <div className="space-y-6">
      {/* Stitch Executive Action Header for Counsellor */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Counsellor Queue Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            {getGreeting()}, {counsellorName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span>Assigned Candidate Enquiries</span>
            <span className="text-slate-300 font-mono-data">•</span>
            <span>Focus: High-Intent Outreach</span>
            {overdueFollowupsCount > 0 && (
              <>
                <span className="text-slate-300 font-mono-data">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueFollowupsCount} overdue follow-up tasks
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start xl:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/leads/new')}
            className="h-9 bg-white"
          >
            + Add Lead
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/followups')}
            className="h-9 shadow-xs"
          >
            Follow-up Queue ({pendingFollowupsCount})
          </Button>
        </div>
      </div>

      {/* Overdue Alert Banner if SLA breached */}
      {overdueFollowupsCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-rose-950">
                {overdueFollowupsCount} Follow-up {overdueFollowupsCount === 1 ? 'Task is' : 'Tasks are'} Overdue
              </p>
              <p className="text-rose-700 mt-0.5">
                These student enquiries have passed their scheduled contact time and require immediate outreach.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => navigate('/followups')}
          >
            Resolve Overdue
          </Button>
        </div>
      )}

      {/* Counsellor 6-KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="My Leads"
          value={myLeadsCount}
          subtitle="Assigned to your queue"
          icon={Users}
          variant="primary"
          isLoading={isLoading}
        />
        <MetricCard
          label="Today's Follow-ups"
          value={todayFollowupsCount}
          subtitle="Scheduled for today"
          icon={Calendar}
          variant="success"
          isLoading={isLoading}
        />
        <MetricCard
          label="Overdue Follow-ups"
          value={overdueFollowupsCount}
          subtitle={overdueFollowupsCount > 0 ? 'Urgent attention' : 'Zero overdue'}
          icon={AlertTriangle}
          variant={overdueFollowupsCount > 0 ? 'danger' : 'default'}
          alert={overdueFollowupsCount > 0}
          isLoading={isLoading}
        />
        <MetricCard
          label="Pending Follow-ups"
          value={pendingFollowupsCount}
          subtitle="Open interaction tasks"
          icon={Clock}
          variant="default"
          isLoading={isLoading}
        />
        <MetricCard
          label="Interested Leads"
          value={interestedLeadsCount}
          subtitle="Qualified prospects"
          icon={Flame}
          variant="purple"
          isLoading={isLoading}
        />
        <MetricCard
          label="Applications in Progress"
          value={applicationsInProgressCount}
          subtitle="Started & Submitted"
          icon={TrendingUp}
          variant="info"
          isLoading={isLoading}
        />
      </div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Priority "Needs Attention" Section */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Needs Attention"
            subtitle="Prioritized candidate action queue: overdue tasks, today's calls, and new enquiries"
            action={
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {attentionItems.length} Actionable Items
              </span>
            }
            bodyClassName="p-0"
          >
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : attentionItems.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CheckCircle2}
                  title="Queue is Up to Date"
                  description="You have completed all urgent tasks and followed up with your assigned enquiries."
                  className="py-6 border-none"
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attentionItems.slice(0, 7).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/leads/${item.leadId}`}
                          className="font-bold text-xs text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        >
                          <span>{item.leadName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.leadNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.priorityType === 'danger'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.priorityType === 'warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {item.priorityReason}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1">
                        Course: <strong className="text-slate-700">{item.courseName}</strong>
                        {item.scheduledAt && (
                          <span>
                            {' '}• Scheduled:{' '}
                            <strong className="text-slate-800">
                              {new Date(item.scheduledAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>
                          </span>
                        )}
                      </p>

                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/leads/${item.leadId}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenScheduleModal(item.leadRaw)}
                        title="Schedule next follow-up"
                      >
                        Follow-up
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenStatusModal(item.leadRaw)}
                        title="Update lead lifecycle status"
                      >
                        Status
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (5 cols): Today's Schedule Agenda & Recent Enquiries */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Agenda */}
          <Card
            title="Today's Outreach Agenda"
            subtitle="Scheduled candidate calls and meetings for today"
            action={
              <Link
                to="/followups"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Full Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : todaysFollowups.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Calendar}
                  title="No Interactions Scheduled Today"
                  description="Schedule follow-up tasks from your leads to build your daily outreach agenda."
                  className="py-4 border-none"
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {todaysFollowups.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/leads/${item.lead}`}
                        className="font-semibold text-xs text-slate-900 hover:text-indigo-600 truncate block"
                      >
                        {item.lead_name || `Lead #${item.lead}`}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.followup_type_display || item.followup_type}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">
                        {item.scheduled_at
                          ? new Date(item.scheduled_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick link to My Leads */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage Your Admissions Leads</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Filter by academic program, status, or ageing category.
              </p>
            </div>
            <Link to="/leads">
              <Button variant="outline" size="sm" icon={ArrowUpRight}>
                Open My Leads
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {selectedLead && (
        <>
          <StatusUpdateModal
            lead={selectedLead}
            isOpen={isStatusModalOpen}
            onClose={() => {
              setIsStatusModalOpen(false);
              setSelectedLead(null);
            }}
            onUpdated={() => {
              setIsStatusModalOpen(false);
              setSelectedLead(null);
              if (onRefresh) onRefresh();
            }}
          />

          <ScheduleFollowUpModal
            lead={selectedLead}
            isOpen={isScheduleModalOpen}
            onClose={() => {
              setIsScheduleModalOpen(false);
              setSelectedLead(null);
            }}
            onScheduled={() => {
              setIsScheduleModalOpen(false);
              setSelectedLead(null);
              if (onRefresh) onRefresh();
            }}
          />
        </>
      )}
    </div>
  );
};
