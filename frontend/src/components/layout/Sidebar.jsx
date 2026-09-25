import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  UserPlus,
  GraduationCap,
  LogOut,
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
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
          ? 'You are now marked as AVAILABLE for automated round-robin lead assignments.'
          : 'You are now marked as AWAY / UNAVAILABLE for lead assignments.'
      );
    } else {
      toast.error(res.error || 'Failed to update assignment status.');
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out securely.');
  };

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Staff User';

  const userRoleLabel = isManager
    ? 'Admissions Director (Manager)'
    : 'Admissions Counsellor';

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-slate-700 border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand & Institution Badge */}
          <div className="p-4 border-b border-slate-200/80 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 text-base leading-tight tracking-tight">
                  EduLead
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Admissions CRM
                </span>
              </div>
            </div>

            {/* Institution Context Pill */}
            <div className="mt-0.5 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] text-slate-800 font-medium truncate">
                  EduLead Institute
                </span>
              </div>
              <span className="font-mono-data text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50 shadow-2xs font-semibold">
                Fall '25
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
            <span className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Operations
            </span>

            <NavLink
              to="/dashboard"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </div>
            </NavLink>

            <NavLink
              to="/leads"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>{isManager ? 'All Leads' : 'My Leads'}</span>
              </div>
              <span className="font-mono-data text-[10px] bg-slate-100 text-slate-600 group-hover:bg-slate-200 px-1.5 py-0.5 rounded-full font-medium">
                Pipeline
              </span>
            </NavLink>

            <NavLink
              to="/followups"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-4 h-4 shrink-0" />
                <span>Follow-ups</span>
              </div>
              <span className="font-mono-data text-[10px] bg-rose-50 text-rose-700 border border-rose-200/80 px-1.5 py-0.5 rounded-full font-semibold">
                Tasks
              </span>
            </NavLink>

            <NavLink
              to="/leads/new"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Quick Intake</span>
              </div>
            </NavLink>

            {/* Analytics & System Section */}
            <span className="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Analytics & System
            </span>

            {isManager && (
              <NavLink
                to="/reports"
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Reports & Export</span>
                </div>
              </NavLink>
            )}

            {/* Counsellor Availability Toggle */}
            {isCounsellor && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700">
                    Lead Queue
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAvailability}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      user?.is_available_for_assignment
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {user?.is_available_for_assignment ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-amber-600" />
                        <span>Paused</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {user?.is_available_for_assignment
                    ? 'Receiving round-robin enquiries'
                    : 'Queue paused for campus tours'}
                </p>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Profile Bar */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col gap-2">
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-900 truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-500 truncate leading-tight">
                  {userRoleLabel}
                </span>
              </div>
            </div>
            {isManager && (
              <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" title="Institution Manager" />
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-rose-600 py-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <span className="font-mono-data text-[10px] text-slate-400">
              v1.0.0
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
