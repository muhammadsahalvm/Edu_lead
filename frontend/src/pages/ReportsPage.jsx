import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Users,
  PieChart,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  Award,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { apiClient, formatApiError } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export const ReportsPage = () => {
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ANALYTICS.DASHBOARD);
      setAnalytics(res.data);
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      toast.error(formatted, 'Failed to fetch operational report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (!analytics) return;

    try {
      const rows = [
        ['EduLead Operational Admissions Summary Report'],
        ['Generated At', new Date().toISOString()],
        [],
        ['Metric', 'Value'],
        ['Total Leads', analytics.summary?.total_leads ?? 0],
        ['New Leads', analytics.summary?.new_leads ?? 0],
        ['Unassigned Leads', analytics.summary?.unassigned_leads ?? 0],
        ['Today Follow-ups', analytics.summary?.today_followups ?? 0],
        ['Overdue Follow-ups', analytics.summary?.overdue_followups ?? 0],
        ['Converted Leads', analytics.summary?.converted_leads ?? 0],
        ['Conversion Rate (%)', `${analytics.summary?.conversion_rate ?? 0}%`],
        [],
        ['Counsellor Workload Distribution'],
        ['Counsellor', 'Email', 'Assigned Leads', 'Pending Follow-ups', 'Overdue Follow-ups', 'Queue Status'],
      ];

      (analytics.counsellor_workload || []).forEach((c) => {
        rows.push([
          c.full_name,
          c.email,
          c.assigned_lead_count,
          c.pending_followup_count,
          c.overdue_followup_count,
          c.is_available_for_assignment ? 'Available' : 'Away',
        ]);
      });

      rows.push([]);
      rows.push(['Acquisition Channel Attribution']);
      rows.push(['Channel', 'Count', 'Percentage (%)']);
      (analytics.source_analysis || []).forEach((s) => {
        rows.push([s.source_display, s.count, `${s.percentage}%`]);
      });

      rows.push([]);
      rows.push(['Academic Program Demand']);
      rows.push(['Code', 'Program Name', 'Count', 'Percentage (%)']);
      (analytics.course_analysis || []).forEach((c) => {
        rows.push([c.course_code, c.course_name, c.count, `${c.percentage}%`]);
      });

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `edulead_admissions_report_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report successfully exported as CSV.');
    } catch (err) {
      toast.error('Failed to generate CSV export.');
    }
  };

  const summary = analytics?.summary || {};
  const workload = analytics?.counsellor_workload || [];
  const sources = analytics?.source_analysis || [];
  const courses = analytics?.course_analysis || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Executive audit and operational reporting across workload allocation, channel yield, and pipeline yield"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Reports' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={fetchReports}
            >
              Sync Live Metrics
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              disabled={isLoading || !analytics}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {error && !analytics ? (
        <ErrorState
          title="Could not load reports"
          description={error}
          onRetry={fetchReports}
        />
      ) : (
        <>
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Total Enquiries"
              value={summary.total_leads}
              subtitle="All recorded leads"
              icon={Layers}
              variant="primary"
              isLoading={isLoading}
            />
            <MetricCard
              label="Confirmed Admissions"
              value={summary.converted_leads}
              subtitle="Enrolled students"
              icon={Award}
              variant="purple"
              isLoading={isLoading}
            />
            <MetricCard
              label="Gross Conversion Rate"
              value={`${summary.conversion_rate ?? 0}%`}
              subtitle="Yield: Converted / Total"
              icon={TrendingUp}
              variant="success"
              isLoading={isLoading}
            />
            <MetricCard
              label="Active Counsellors"
              value={workload.length}
              subtitle="Assigned to queue"
              icon={Users}
              variant="default"
              isLoading={isLoading}
            />
          </div>

          {/* Grid: Counsellor Workload Distribution & Channel Yield */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left (7 cols): Counsellor Workload Distribution Table */}
            <div className="lg:col-span-7">
              <Card
                title="Counsellor Workload Distribution"
                subtitle="Real-time capacity tracking across active counseling team"
                bodyClassName="p-0 overflow-x-auto"
              >
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    <LoadingSkeleton variant="table-row" count={4} />
                  </div>
                ) : (
                  <table className="w-full text-left text-xs saas-table">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Counsellor</th>
                        <th className="py-2.5 px-4 text-center">Assigned</th>
                        <th className="py-2.5 px-4 text-center">Pending Tasks</th>
                        <th className="py-2.5 px-4 text-center">Overdue Tasks</th>
                        <th className="py-2.5 px-4 text-right">Queue State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workload.map((c) => (
                        <tr key={c.counsellor_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{c.full_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{c.email}</p>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900 tabular-nums">
                            {c.assigned_lead_count}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700 tabular-nums">
                            {c.pending_followup_count}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {c.overdue_followup_count > 0 ? (
                              <span className="font-bold text-rose-600">
                                {c.overdue_followup_count}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {c.is_available_for_assignment ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                Away
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            {/* Right (5 cols): Channel Attribution Breakdown */}
            <div className="lg:col-span-5 space-y-6">
              <Card
                title="Channel Attribution Yield"
                subtitle="Distribution of student enquiries by acquisition source"
                bodyClassName="p-0 overflow-x-auto"
              >
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    <LoadingSkeleton variant="table-row" count={4} />
                  </div>
                ) : (
                  <table className="w-full text-left text-xs saas-table">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Channel</th>
                        <th className="py-2.5 px-4 text-center">Leads</th>
                        <th className="py-2.5 px-4 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sources.map((s) => (
                        <tr key={s.source} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">
                            {s.source_display}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-900 tabular-nums">
                            {s.count}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                            {s.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* Program Interest */}
              <Card
                title="Academic Program Demand"
                subtitle="Enquiry volume grouped by degree program"
                bodyClassName="p-0 overflow-x-auto"
              >
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    <LoadingSkeleton variant="table-row" count={3} />
                  </div>
                ) : (
                  <table className="w-full text-left text-xs saas-table">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4">Course Name</th>
                        <th className="py-2.5 px-4 text-right">Enquiries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courses.map((c) => (
                        <tr key={c.course_id || c.course_code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-4 font-mono font-semibold text-indigo-600">
                            {c.course_code}
                          </td>
                          <td className="py-2 px-4 text-slate-800 font-medium truncate max-w-[140px]" title={c.course_name}>
                            {c.course_name}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-slate-900 tabular-nums">
                            {c.count} ({c.percentage}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
