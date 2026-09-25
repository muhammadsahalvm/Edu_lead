import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Plus,
  Shield,
  User as UserIcon,
  ChevronRight,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onOpenMobile }) => {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

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
    if (p.includes('/dashboard')) return 'Admissions Dashboard';
    if (p.includes('/leads/new')) return 'Intake Registration';
    if (p.includes('/leads/')) return 'Lead Dossier';
    if (p.includes('/leads')) return 'Leads Directory';
    if (p.includes('/followups')) return 'Follow-ups Management';
    if (p.includes('/reports')) return 'Reports & Analytics';
    return 'Workspace';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Hamburger, Breadcrumbs & Global Search */}
      <div className="flex items-center gap-3 md:gap-5 flex-1 max-w-2xl">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Institutional Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="text-slate-800 font-semibold">Admissions CRM</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600">{getPageTitle()}</span>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads, phone, email, application..."
            className="w-full h-9 pl-9 pr-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <kbd className="absolute right-2.5 font-mono-data text-[10px] bg-white text-slate-400 border border-slate-200 px-1 py-0.5 rounded shadow-2xs pointer-events-none">
            ↵
          </kbd>
        </form>
      </div>

      {/* Right side: View indicator, Notifications, Add Lead CTA, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Role View Indicator */}
        <div className="hidden lg:inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
          <span
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              isManager
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            Manager View
          </span>
          <span
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              !isManager
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            Counsellor View
          </span>
        </div>

        {/* Quick Add Lead CTA */}
        <button
          type="button"
          onClick={() => navigate('/leads/new')}
          className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
