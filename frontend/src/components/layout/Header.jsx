import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  ChevronRight,
  Bell,
  Clock3,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { API_ENDPOINTS } from '../../api/endpoints';

export const Header = ({ onOpenMobile }) => {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const notificationsRef = useRef(null);
  const warningCount = Number(unassignedCount > 0) + Number(overdueCount > 0);

  const refreshNotifications = useCallback(async () => {
    const [dashboardResult, overdueResult] = await Promise.allSettled([
      apiClient.get(API_ENDPOINTS.ANALYTICS.DASHBOARD),
      apiClient.get(API_ENDPOINTS.FOLLOWUPS.OVERDUE),
    ]);

    if (dashboardResult.status === 'fulfilled') {
      const count = Number(dashboardResult.value.data?.summary?.unassigned_leads || 0);
      setUnassignedCount(isManager ? count : 0);
    }
    if (overdueResult.status === 'fulfilled') {
      const overdueData = overdueResult.value.data;
      const overdueItems = overdueData?.results || overdueData || [];
      setOverdueCount(Array.isArray(overdueItems) ? overdueItems.length : 0);
    }
  }, [isManager]);

  useEffect(() => {
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 45000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };
    window.addEventListener('focus', refreshNotifications);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshNotifications);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    if (!isNotificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationsRef.current?.contains(event.target)) setIsNotificationsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isNotificationsOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/leads?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Staff User';

  // Get readable page name from current path
  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Dashboard';
    if (p.includes('/leads/new')) return 'New lead';
    if (p.includes('/leads/')) return 'Lead details';
    if (p.includes('/leads')) return 'Leads';
    if (p.includes('/followups')) return 'Follow-ups';
    if (p.includes('/reports')) return 'Analytics';
    return 'Workspace';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 sticky top-0 z-30 flex items-center gap-4 px-4 sm:px-6 lg:px-7">
      {/* Left side: Hamburger, Breadcrumbs & Global Search */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Institutional Breadcrumbs */}
        <div className="hidden xl:flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 font-medium">
          <span className="text-slate-800 font-semibold">Admissions</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600">{getPageTitle()}</span>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex min-w-0 flex-1 items-center max-w-lg">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads, phone, email, application..."
            className="w-full h-9 pl-9 pr-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <kbd className="absolute right-2.5 font-mono-data text-[10px] bg-white text-slate-400 border border-slate-200 px-1 py-0.5 rounded shadow-2xs pointer-events-none">
            ↵
          </kbd>
        </form>
      </div>

      {/* Right side: Notifications and profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((open) => !open)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${warningCount > 0 ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            aria-label={warningCount > 0 ? `Notifications, ${warningCount} active warnings` : 'Notifications'}
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
          >
            <Bell className="h-[18px] w-[18px]" />
            {warningCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
                {warningCount > 9 ? '9+' : warningCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <section role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{warningCount ? `${warningCount} active warning${warningCount === 1 ? '' : 's'}` : 'You’re all caught up'}</p>
                </div>
                {warningCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">Action needed</span>}
              </div>

              <div className="space-y-3 p-4">
                {warningCount === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Bell className="h-4 w-4" /></span>
                    <p className="text-sm text-slate-600">There are no active warnings right now.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      <h3 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Operational Triage Notice</h3>
                      {unassignedCount > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                          <div className="flex items-start gap-2.5">
                            <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-5 text-amber-950">{unassignedCount} {unassignedCount === 1 ? 'enquiry is' : 'enquiries are'} currently unassigned to counsellors.</p>
                              <button type="button" onClick={() => { setIsNotificationsOpen(false); navigate('/leads'); }} className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-800">Review Unassigned <span aria-hidden="true">→</span></button>
                            </div>
                          </div>
                        </div>
                      )}
                      {overdueCount > 0 && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                          <div className="flex items-start gap-2.5">
                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-5 text-rose-950">{overdueCount} scheduled {overdueCount === 1 ? 'interaction has' : 'interactions have'} breached the follow-up schedule.</p>
                              <button type="button" onClick={() => { setIsNotificationsOpen(false); navigate('/followups'); }} className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-800">View Overdue Tasks <span aria-hidden="true">→</span></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="px-1 text-[11px] text-slate-400">Warnings refresh automatically while you work.</p>
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
          <div title={displayName} className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
