import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  UserPlus,
  GraduationCap,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { user, isManager, isCounsellor, toggleAvailability, logout } = useAuth();
  const toast = useToast();

  const handleToggleAvailability = async () => {
    const res = await toggleAvailability();
    if (res.success) {
      toast.info(
        res.user.is_available_for_assignment
          ? 'You are now marked as AVAILABLE for lead assignment.'
          : 'You are now marked as AWAY / UNAVAILABLE for lead assignment.'
      );
    } else {
      toast.error(res.error || 'Failed to update assignment status.');
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out securely.');
  };

  // Role-distinguished navigation
  const navItems = isManager
    ? [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          to: '/leads',
          label: 'Leads',
          icon: Users,
        },
        {
          to: '/followups',
          label: 'Follow-ups',
          icon: CalendarCheck,
        },
        {
          to: '/reports',
          label: 'Reports',
          icon: BarChart3,
        },
      ]
    : [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          to: '/leads',
          label: 'My Leads',
          icon: Users,
        },
        {
          to: '/followups',
          label: 'Follow-ups',
          icon: CalendarCheck,
        },
      ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-none">
                EduLead
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-1 block">
                Admission CRM
              </span>
            </div>
          </div>
          <span
            className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
              isManager
                ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
            }`}
          >
            {isManager ? 'Manager' : 'Counsellor'}
          </span>
        </div>

        {/* Primary Action Button */}
        <div className="p-3.5 border-b border-slate-800/60">
          <NavLink
            to="/leads/new"
            onClick={onCloseMobile}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs active:scale-[0.99]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Lead</span>
          </NavLink>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {isManager ? 'Operations & Management' : 'Daily Execution'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-xs border-l-2 border-indigo-500 pl-2.5'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-200" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Counsellor Availability Toggle (if applicable) */}
        {isCounsellor && (
          <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-300 text-[11px]">Assignment Queue</span>
              <button
                type="button"
                onClick={handleToggleAvailability}
                aria-label="Toggle lead assignment queue status"
                aria-pressed={!!user?.is_available_for_assignment}
                className="text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 rounded focus-visible:outline-none"
                title="Toggle lead assignment queue status"
              >
                {user?.is_available_for_assignment ? (
                  <ToggleRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {user?.is_available_for_assignment ? (
                <span className="text-emerald-400 font-medium">● Available for auto-routing</span>
              ) : (
                <span className="text-slate-500">○ Paused / Away</span>
              )}
            </p>
          </div>
        )}

        {/* User Profile & Logout section in footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/90 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center border border-slate-700 shrink-0">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                  {user?.email || (isManager ? 'Manager' : 'Counsellor')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors shrink-0"
              title="Sign out of admission portal"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
