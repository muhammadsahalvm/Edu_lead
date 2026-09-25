import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Phone,
  MessageSquare,
  Users,
  ExternalLink,
  RefreshCw,
  Ban,
  Check,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { FollowUpStatusBadge } from '../components/common/Badge';
import { CompleteFollowUpModal } from '../components/followups/CompleteFollowUpModal';
import { MarkMissedModal } from '../components/followups/MarkMissedModal';
import { CancelFollowUpModal } from '../components/followups/CancelFollowUpModal';
import { RescheduleFollowUpModal } from '../components/followups/RescheduleFollowUpModal';
import { CreateFollowUpModal } from '../components/followups/CreateFollowUpModal';
import { followupsService } from '../api/followups';
import { leadsService } from '../api/leads';
import { formatApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TYPE_OPTIONS = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'COUNSELLING', label: 'Counselling Session' },
  { value: 'MEETING', label: 'Campus Meeting' },
  { value: 'EMAIL', label: 'Email' },
];

const getFollowupIcon = (type) => {
  switch (type) {
    case 'CALL':
    case 'PHONE_CALL':
      return <Phone className="w-4 h-4 text-blue-600" />;
    case 'WHATSAPP':
      return <MessageSquare className="w-4 h-4 text-emerald-600" />;
    case 'COUNSELLING':
    case 'MEETING':
      return <Users className="w-4 h-4 text-purple-600" />;
    default:
      return <Clock className="w-4 h-4 text-slate-500" />;
  }
};

export const FollowUpsPage = () => {
  const toast = useToast();
  const { isManager } = useAuth();

  // Active Tab: 'today', 'upcoming', 'overdue', 'completed', 'missed'
  const [activeTab, setActiveTab] = useState('today');

  // Follow-up task list
  const [followups, setFollowups] = useState([]);
  const [counts, setCounts] = useState({
    today: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    missed: 0,
  });
  const [counsellors, setCounsellors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionModal, setActionModal] = useState(null); // 'complete' | 'missed' | 'cancel' | 'reschedule'

  // Load counsellors for manager
  useEffect(() => {
    if (!isManager) return;
    const fetchCounsellors = async () => {
      try {
        const list = await leadsService.getCounsellors();
        setCounsellors(list);
      } catch (err) {
        // fail silently
      }
    };
    fetchCounsellors();
  }, [isManager]);

  // Fetch follow-ups based on active tab and filters
  const fetchFollowups = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Base query params
      const params = {};
      if (typeFilter) params.followup_type = typeFilter;
      if (dateFilter) params.scheduled_at__date = dateFilter;
      if (isManager && counsellorFilter) params.assigned_to = counsellorFilter;

      let list = [];

      if (activeTab === 'overdue') {
        const res = await followupsService.getOverdue();
        list = res.results || res || [];
        if (typeFilter) list = list.filter((f) => f.followup_type === typeFilter);
        if (dateFilter) list = list.filter((f) => f.scheduled_at?.startsWith(dateFilter));
        if (isManager && counsellorFilter) {
          list = list.filter((f) => String(f.assigned_to) === String(counsellorFilter));
        }
      } else if (activeTab === 'upcoming') {
        const res = await followupsService.getUpcoming();
        list = res.results || res || [];
        if (typeFilter) list = list.filter((f) => f.followup_type === typeFilter);
        if (dateFilter) list = list.filter((f) => f.scheduled_at?.startsWith(dateFilter));
        if (isManager && counsellorFilter) {
          list = list.filter((f) => String(f.assigned_to) === String(counsellorFilter));
        }
      } else if (activeTab === 'today') {
        params.status = 'PENDING';
        const res = await followupsService.getFollowUps(params);
        const raw = res.results || res || [];
        list = raw.filter((f) => f.scheduled_at && f.scheduled_at.startsWith(todayStr));
        if (typeFilter) list = list.filter((f) => f.followup_type === typeFilter);
        if (dateFilter) list = list.filter((f) => f.scheduled_at?.startsWith(dateFilter));
        if (isManager && counsellorFilter) {
          list = list.filter((f) => String(f.assigned_to) === String(counsellorFilter));
        }
      } else if (activeTab === 'completed') {
        params.status = 'COMPLETED';
        const res = await followupsService.getFollowUps(params);
        list = res.results || res || [];
        if (typeFilter) list = list.filter((f) => f.followup_type === typeFilter);
        if (dateFilter) list = list.filter((f) => f.scheduled_at?.startsWith(dateFilter));
        if (isManager && counsellorFilter) {
          list = list.filter((f) => String(f.assigned_to) === String(counsellorFilter));
        }
      } else if (activeTab === 'missed') {
        params.status = 'MISSED';
        const res = await followupsService.getFollowUps(params);
        list = res.results || res || [];
        if (typeFilter) list = list.filter((f) => f.followup_type === typeFilter);
        if (dateFilter) list = list.filter((f) => f.scheduled_at?.startsWith(dateFilter));
        if (isManager && counsellorFilter) {
          list = list.filter((f) => String(f.assigned_to) === String(counsellorFilter));
        }
      }

      setFollowups(list);

      // Refresh badge counters
      const [overdueRes, upcomingRes, allPendingRes] = await Promise.allSettled([
        followupsService.getOverdue(),
        followupsService.getUpcoming(),
        followupsService.getFollowUps({ status: 'PENDING' }),
      ]);

      const overdueItems = overdueRes.status === 'fulfilled' ? overdueRes.value.results || overdueRes.value || [] : [];
      const upcomingItems = upcomingRes.status === 'fulfilled' ? upcomingRes.value.results || upcomingRes.value || [] : [];
      const pendingItems = allPendingRes.status === 'fulfilled' ? allPendingRes.value.results || allPendingRes.value || [] : [];

      const todayPending = pendingItems.filter((f) => f.scheduled_at?.startsWith(todayStr));

      setCounts((prev) => ({
        ...prev,
        overdue: overdueItems.length,
        upcoming: upcomingItems.length,
        today: todayPending.length,
      }));
    } catch (err) {
      toast.error(formatApiError(err), 'Failed to fetch follow-ups');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, typeFilter, dateFilter, counsellorFilter, isManager, toast]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const hasActiveFilters = Boolean(typeFilter || dateFilter || counsellorFilter);

  const clearFilters = () => {
    setTypeFilter('');
    setDateFilter('');
    setCounsellorFilter('');
  };

  const tabs = [
    {
      id: 'today',
      label: 'Today',
      icon: Calendar,
      count: counts.today,
      highlight: counts.today > 0,
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      icon: Clock,
      count: counts.upcoming,
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: AlertTriangle,
      count: counts.overdue,
      danger: counts.overdue > 0,
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
    },
    {
      id: 'missed',
      label: 'Missed',
      icon: XCircle,
    },
  ];

  const handleOpenAction = (task, action) => {
    setSelectedTask(task);
    setActionModal(action);
  };

  return (
    <div className="space-y-6">
      {/* Stitch Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Follow-ups Management
            </h1>
            {counts.overdue > 0 && (
              <span className="font-mono-data text-xs bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-semibold border border-rose-200">
                {counts.overdue} SLA Breached
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Candidate Outreach Tasks across Phone, WhatsApp, and Campus Counselling
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            isLoading={isLoading}
            onClick={fetchFollowups}
            className="h-9 bg-white"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsCreateOpen(true)}
            className="h-9 shadow-xs"
          >
            + Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Stitch Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 bg-white px-4 pt-2 rounded-t-xl border border-b-0 border-slate-200/90 shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors shrink-0 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  tab.danger ? 'text-rose-500' : tab.highlight ? 'text-indigo-500' : ''
                }`}
              />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono-data font-semibold ${
                    tab.danger
                      ? 'bg-rose-100 text-rose-800'
                      : isActive
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <Card bodyClassName="p-3.5" className="rounded-t-none border-t-0 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Interaction Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Channel:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-1 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Channels</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="py-1 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Counsellor Filter for Managers */}
            {isManager && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Counsellor:</span>
                <select
                  value={counsellorFilter}
                  onChange={(e) => setCounsellorFilter(e.target.value)}
                  className="py-1 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Counsellors</option>
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Task List Container */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <LoadingSkeleton variant="table-row" count={4} />
          </div>
        ) : followups.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={`No ${activeTab.toUpperCase()} Follow-up Tasks`}
            description={
              hasActiveFilters
                ? 'No follow-up tasks match your active filters. Try adjusting or resetting your filters.'
                : 'All tasks in this queue are completed or none are scheduled.'
            }
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsCreateOpen(true)}
              >
                + Schedule Follow-up
              </Button>
            }
          />
        ) : (
          followups.map((task) => {
            const isTaskPending = task.status === 'PENDING';
            const scheduledDate = new Date(task.scheduled_at);
            const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = scheduledDate.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={task.id}
                className={`p-4 bg-white rounded-xl border transition-all duration-150 shadow-xs hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  task.is_overdue && isTaskPending
                    ? 'border-rose-200 bg-rose-50/10 ring-1 ring-rose-200/50'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Task Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      task.is_overdue && isTaskPending
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : task.status === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    }`}
                  >
                    {getFollowupIcon(task.followup_type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/leads/${task.lead}`}
                        className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                      >
                        <span>{task.lead_name || `Lead #${task.lead}`}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[10px] font-mono text-slate-400">
                        {task.lead_number}
                      </span>
                      <FollowUpStatusBadge
                        status={task.status}
                        isOverdue={task.is_overdue && isTaskPending}
                      />
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      <strong>{task.followup_type_display}</strong> • Counsellor:{' '}
                      <strong className="text-slate-800">{task.assigned_to_name}</strong>
                    </p>

                    {task.outcome_display && (
                      <p className="text-xs font-semibold text-emerald-700 mt-1">
                        Outcome: {task.outcome_display}
                      </p>
                    )}

                    {task.notes && (
                      <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xl">
                        "{task.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Scheduled Time & Action Buttons */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold block ${
                        task.is_overdue && isTaskPending ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {dateStr}
                    </span>
                    <span className="text-[11px] text-slate-400 block tabular-nums">{timeStr}</span>
                  </div>

                  {/* Actions for Pending Tasks */}
                  {isTaskPending && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => handleOpenAction(task, 'complete')}
                      >
                        Complete
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        icon={Clock}
                        onClick={() => handleOpenAction(task, 'reschedule')}
                        title="Reschedule to another time"
                      >
                        Reschedule
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAction(task, 'missed')}
                        title="Flag as missed interaction"
                      >
                        Missed
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAction(task, 'cancel')}
                        className="text-slate-400 hover:text-rose-600"
                        title="Cancel scheduled interaction"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Modals */}
      <CompleteFollowUpModal
        followup={selectedTask}
        isOpen={actionModal === 'complete'}
        onClose={() => setActionModal(null)}
        onCompleted={fetchFollowups}
      />

      <MarkMissedModal
        followup={selectedTask}
        isOpen={actionModal === 'missed'}
        onClose={() => setActionModal(null)}
        onUpdated={fetchFollowups}
      />

      <CancelFollowUpModal
        followup={selectedTask}
        isOpen={actionModal === 'cancel'}
        onClose={() => setActionModal(null)}
        onUpdated={fetchFollowups}
      />

      <RescheduleFollowUpModal
        followup={selectedTask}
        isOpen={actionModal === 'reschedule'}
        onClose={() => setActionModal(null)}
        onUpdated={fetchFollowups}
      />

      <CreateFollowUpModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchFollowups}
      />
    </div>
  );
};
