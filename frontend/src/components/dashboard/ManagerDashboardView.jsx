import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Button } from '../common/Button';
import { SummaryMetricsGrid } from './SummaryMetricsGrid';
import { LeadFunnelChart } from './LeadFunnelChart';
import { LeadSourceChart } from './LeadSourceChart';
import { LeadCourseChart } from './LeadCourseChart';
import { CounsellorWorkloadTable } from './CounsellorWorkloadTable';
import { LeadAgeingWidget } from './LeadAgeingWidget';
import { TodayFollowupsWidget } from './TodayFollowupsWidget';

export const ManagerDashboardView = ({
  dashboardData,
  todaysFollowups = [],
  overdueFollowups = [],
  isLoading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const summary = dashboardData?.summary || {};
  const overdueCount = summary.overdue_followups ?? overdueFollowups.length;
  const unassignedCount = summary.unassigned_leads ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <PageHeader
        title="Dashboard"
        subtitle="Monitor admissions activity, counsellor workload, and lead conversion."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={onRefresh}
            >
              Sync Live Metrics
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/leads/new')}
            >
              + Add Lead
            </Button>
          </div>
        }
      />

      {/* Operational SLA Alert if overdue or unassigned > 0 */}
      {(overdueCount > 0 || unassignedCount > 0) && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950">Operational Attention Items</p>
              <p className="text-amber-800 mt-0.5">
                {unassignedCount > 0 && `${unassignedCount} enquiries currently unassigned to counsellors. `}
                {overdueCount > 0 && `${overdueCount} scheduled interactions have breached SLA.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unassignedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/leads')}
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

      {/* 1. KPI SECTION (7 Key Metrics Grid) */}
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
