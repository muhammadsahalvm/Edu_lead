import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Shield, User as UserIcon, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Header = ({ onOpenMobile }) => {
  const { user, logout, isManager } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out securely.');
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Institutional Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 tracking-tight">
            EduLead Admissions
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {isManager ? 'Manager Console' : 'Counsellor Workspace'}
          </span>
          <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-slate-300 mx-1" />
          <span className="text-xs text-slate-400 font-normal hidden md:inline">
            {todayFormatted}
          </span>
        </div>
      </div>

      {/* Right: Quick Action, Role, Profile & Logout */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Quick Add Lead */}
        <button
          type="button"
          onClick={() => navigate('/leads/new')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors shadow-2xs"
          title="Create a new student enquiry"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lead</span>
        </button>

        {/* Role Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs">
          {isManager ? (
            <Shield className="w-3.5 h-3.5 text-purple-600" />
          ) : (
            <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span className="font-semibold text-slate-700 text-[11px]">
            {isManager ? 'Manager' : 'Counsellor'}
          </span>
        </div>

        {/* User Details */}
        <div className="text-right hidden lg:block">
          <p className="text-xs font-semibold text-slate-900 leading-tight">
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
          </p>
          <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[140px] mt-0.5">
            {user?.email || 'Authenticated'}
          </p>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out of admission portal"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
          title="Sign out of admission portal"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Logout</span>
        </button>
      </div>
    </header>
  );
};
