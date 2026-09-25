import React, { useEffect, useState, useCallback } from 'react';
import { apiClient, formatApiError } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ManagerDashboardView } from '../components/dashboard/ManagerDashboardView';
import { CounsellorDashboardView } from '../components/dashboard/CounsellorDashboardView';
import { ErrorState } from '../components/common/ErrorState';

export const DashboardPage = () => {
  const { user, isManager } = useAuth();
  const toast = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [overdueFollowups, setOverdueFollowups] = useState([]);
  const [todaysFollowups, setTodaysFollowups] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel execution of operational queries
      const [dashRes, overdueRes, followupsRes, recentLeadsRes] = await Promise.allSettled([
        apiClient.get(API_ENDPOINTS.ANALYTICS.DASHBOARD),
        apiClient.get(API_ENDPOINTS.FOLLOWUPS.OVERDUE),
        apiClient.get(`${API_ENDPOINTS.FOLLOWUPS.LIST}?status=PENDING`),
        apiClient.get(`${API_ENDPOINTS.LEADS.LIST}?ordering=-updated_at`),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data);
      } else {
        throw dashRes.reason;
      }

      if (overdueRes.status === 'fulfilled') {
        const rawOverdue = overdueRes.value.data;
        setOverdueFollowups(rawOverdue?.results || rawOverdue || []);
      }

      if (followupsRes.status === 'fulfilled') {
        const rawPending = followupsRes.value.data;
        const pendingList = rawPending?.results || rawPending || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const todays = pendingList.filter((f) => {
          if (!f.scheduled_at) return false;
          return f.scheduled_at.startsWith(todayStr);
        });
        setTodaysFollowups(todays);
      }

      if (recentLeadsRes.status === 'fulfilled') {
        const rawLeads = recentLeadsRes.value.data;
        setRecentLeads(rawLeads?.results || rawLeads || []);
      }
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      toast.error(formatted, 'Dashboard Synchronization Error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error && !dashboardData) {
    return (
      <div className="py-8">
        <ErrorState
          title="Failed to Load Dashboard Metrics"
          description={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  return isManager ? (
    <ManagerDashboardView
      dashboardData={dashboardData}
      todaysFollowups={todaysFollowups}
      overdueFollowups={overdueFollowups}
      isLoading={isLoading}
      onRefresh={fetchDashboardData}
    />
  ) : (
    <CounsellorDashboardView
      user={user}
      dashboardData={dashboardData}
      overdueFollowups={overdueFollowups}
      todaysFollowups={todaysFollowups}
      recentLeads={recentLeads}
      isLoading={isLoading}
      onRefresh={fetchDashboardData}
    />
  );
};
