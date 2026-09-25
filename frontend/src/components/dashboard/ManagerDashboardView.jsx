import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertTriangle, Calendar, Download, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { SummaryMetricsGrid } from './SummaryMetricsGrid';
import { LeadFunnelChart } from './LeadFunnelChart';
import { LeadSourceChart } from './LeadSourceChart';
import { LeadCourseChart } from './LeadCourseChart';
import { CounsellorWorkloadTable } from './CounsellorWorkloadTable';
import { LeadAgeingWidget } from './LeadAgeingWidget';
import { TodayFollowupsWidget } from './TodayFollowupsWidget';
import { useAuth } from '../../context/AuthContext';

export const ManagerDashboardView = ({
  dashboardData,
  todaysFollowups = [],
  overdueFollowups = [],
  isLoading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const summary = dashboardData?.summary || {};
  const overdueCount = summary.overdue_followups ?? overdueFollowups.length;
  const unassignedCount = summary.unassigned_leads ?? 0;

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Priya Sharma';

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Stitch Executive Action Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cohort Operational Cycle Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Good morning, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span>Fall 2025 Admissions Cycle</span>
            <span className="text-slate-300 font-mono-data">•</span>
            <span>Today is {todayFormatted}</span>
            {overdueCount > 0 && (
              <>
                <span className="text-slate-300 font-mono-data">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueCount} urgent follow-ups require attention
                </span>
              </>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
          <div className="h-9 px-3 bg-white text-slate-700 border border-slate-200/90 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-mono-data">Cycle: Fall 2025</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            isLoading={isLoading}
            onClick={onRefresh}
            className="h-9 bg-white"
          >
            Sync Metrics
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/leads/new')}
            className="h-9 shadow-xs"
          >
            + Quick Add Lead
          </Button>
        </div>
      </div>

      {/* Operational SLA Alert if overdue or unassigned > 0 */}
      {(overdueCount > 0 || unassignedCount > 0) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/90 to-amber-50/50 border border-amber-200/90 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950">Operational Triage Notice</p>
              <p className="text-amber-800 mt-0.5">
                {unassignedCount > 0 && `${unassignedCount} enquiries currently unassigned to counsellors. `}
                {overdueCount > 0 && `${overdueCount} scheduled interactions have breached institutional SLA.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unassignedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/leads')}
                className="bg-white border-amber-300 text-amber-900"
              >
                Review Unassigned
              </Button>
            )}
            {overdueCount > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate('/followups')}
              >
                View Overdue Tasks
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. KPI SECTION (6-Metric Executive KPI Row) */}
      <SummaryMetricsGrid
        summary={summary}
        isLoading={isLoading && !dashboardData}
      />

      {/* 2. ROW 1: Lead Conversion Funnel */}
      <div>
        <LeadFunnelChart
          funnel={dashboardData?.funnel}
          isLoading={isLoading && !dashboardData}
        />
      </div>

      {/* 3. ROW 2: Leads by Source & Leads by Course (Two-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <LeadSourceChart
            sources={dashboardData?.source_analysis}
            isLoading={isLoading && !dashboardData}
          />
        </div>
        <div className="lg:col-span-6">
          <LeadCourseChart
            courses={dashboardData?.course_analysis}
            isLoading={isLoading && !dashboardData}
          />
        </div>
      </div>

      {/* 4. ROW 3: Counsellor Workload Distribution */}
      <div>
        <CounsellorWorkloadTable
          workload={dashboardData?.counsellor_workload}
          isLoading={isLoading && !dashboardData}
        />
      </div>

      {/* 5. ROW 4: Ageing Overview & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <LeadAgeingWidget
            ageing={dashboardData?.ageing}
            isLoading={isLoading && !dashboardData}
          />
        </div>
        <div className="lg:col-span-7">
          <TodayFollowupsWidget
            followups={todaysFollowups}
            isLoading={isLoading && !dashboardData}
          />
        </div>
      </div>
    </div>
  );
};
