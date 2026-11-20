import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Calendar } from 'lucide-react';
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
  isLoading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const summary = dashboardData?.summary || {};
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Stitch Executive Action Header */}
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Here is the summary of your admissions data <span className="px-1 text-slate-300">·</span>{todayFormatted}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="h-10 px-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Fall 2025</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            isLoading={isLoading}
            onClick={onRefresh}
            className="h-10 rounded-xl bg-white"
          >
            Sync Metrics
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/leads/new')}
            className="h-10 rounded-xl shadow-xs"
          >
            Quick Add Lead
          </Button>
        </div>
      </div>

      {/* Priority KPI row */}
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
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-12 gap-6">
        <div className="h-full lg:col-span-6">
          <LeadSourceChart
            sources={dashboardData?.source_analysis}
            isLoading={isLoading && !dashboardData}
          />
        </div>
        <div className="h-full lg:col-span-6">
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
