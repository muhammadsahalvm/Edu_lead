import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  User,
  ExternalLink,
  RefreshCw,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { StatusBadge, AgeingBadge, PriorityBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { leadsService } from '../api/leads';
import { formatApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const STATUS_CHOICES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'INTERESTED', label: 'Interested & Qualified' },
  { value: 'COUNSELLING_SCHEDULED', label: 'Counselling Scheduled' },
  { value: 'APPLICATION_STARTED', label: 'Application Started' },
  { value: 'APPLICATION_SUBMITTED', label: 'Application Submitted' },
  { value: 'CONVERTED', label: 'Enrolled / Converted' },
  { value: 'NO_RESPONSE', label: 'No Response' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'LOST', label: 'Lost / Closed' },
];

const SOURCE_CHOICES = [
  { value: 'WEBSITE', label: 'Website Enquiry' },
  { value: 'WALK_IN', label: 'Walk-In / Campus Visit' },
  { value: 'PHONE', label: 'Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EDUCATION_FAIR', label: 'Education Fair' },
  { value: 'CAMPAIGN', label: 'Digital Campaign' },
  { value: 'REFERRAL', label: 'Referral' },
];

const PRIORITY_CHOICES = [
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

const AGEING_CHOICES = [
  { value: 'FRESH', label: 'Fresh (0-2 days)' },
  { value: 'AGEING', label: 'Ageing (3-7 days)' },
  { value: 'STALE', label: 'Stale (8+ days)' },
];

export const LeadsListPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isManager, isCounsellor } = useAuth();

  // Data states
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Query & Filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [ageingFilter, setAgeingFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load dropdown references
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [courseList, counsellorList] = await Promise.all([
          leadsService.getCourses(),
          leadsService.getCounsellors(),
        ]);
        setCourses(courseList);
        setCounsellors(counsellorList);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    loadDropdownData();
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        ordering,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (courseFilter) params.course = courseFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (ageingFilter) params.ageing = ageingFilter;

      if (counsellorFilter) {
        if (counsellorFilter === 'unassigned') {
          params.unassigned = 'true';
        } else {
          params.counsellor = counsellorFilter;
        }
      }

      const response = await leadsService.getLeads(params);
      const results = response.results || response || [];
      setLeads(results);
      setTotalCount(response.count ?? results.length);
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      toast.error(formatted, 'Failed to retrieve leads');
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    statusFilter,
    courseFilter,
    sourceFilter,
    priorityFilter,
    counsellorFilter,
    ageingFilter,
    ordering,
    toast,
  ]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      statusFilter ||
      courseFilter ||
      sourceFilter ||
      priorityFilter ||
      counsellorFilter ||
      ageingFilter ||
      ordering !== '-created_at'
  );

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setCourseFilter('');
    setSourceFilter('');
    setPriorityFilter('');
    setCounsellorFilter('');
    setAgeingFilter('');
    setOrdering('-created_at');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / 20) || 1;
  const pageTitle = isManager ? 'Admission Leads Directory' : 'My Assigned Leads';
  const pageSubtitle = isManager
    ? `Monitor, filter, and manage all student enquiries across admissions channels (${totalCount} records)`
    : `Candidate enquiries assigned to your counseling queue (${totalCount} records)`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: isManager ? 'Leads' : 'My Leads' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={fetchLeads}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/leads/new')}
            >
              + Create Lead
            </Button>
          </div>
        }
      />

      {/* Search & Filter Toolbar */}
      <Card bodyClassName="p-4 space-y-3" className="shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, phone, email, or lead ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Filters & Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>

            {/* Sorting selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={ordering}
                onChange={(e) => {
                  setOrdering(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-updated_at">Recently Updated</option>
                <option value="first_name">Candidate Name (A-Z)</option>
                <option value="next_followup_at">Next Follow-up Due</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                {STATUS_CHOICES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Program</label>
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Sources</option>
                {SOURCE_CHOICES.map((src) => (
                  <option key={src.value} value={src.value}>
                    {src.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Priorities</option>
                {PRIORITY_CHOICES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Counsellor Filter (for Manager) */}
            {isManager && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Counsellor</label>
                <select
                  value={counsellorFilter}
                  onChange={(e) => {
                    setCounsellorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Counsellors</option>
                  <option value="unassigned">⚠️ Unassigned Leads</option>
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ageing Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ageing Tier</label>
              <select
                value={ageingFilter}
                onChange={(e) => {
                  setAgeingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Tiers</option>
                {AGEING_CHOICES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Clear Filters bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
            <span>Filter results active</span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset all filters
            </button>
          </div>
        )}
      </Card>

      {/* Leads Content */}
      {error && !leads.length ? (
        <ErrorState
          title="Could not load leads"
          description={error}
          onRetry={fetchLeads}
        />
      ) : (
        <Card bodyClassName="p-0 overflow-x-auto" className="shadow-xs">
          {isLoading ? (
            <div className="p-8 space-y-3">
              <LoadingSkeleton variant="table-row" count={8} />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Admission Leads Found"
                description={
                  hasActiveFilters
                    ? 'No records match your active search and filter criteria. Try adjusting or resetting your filters.'
                    : 'Get started by creating your first student enquiry.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={() => navigate('/leads/new')}
                    >
                      + Create Lead
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              {/* Desktop High-Density CRM Table */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs saas-table">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Lead ID</th>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Program</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Counsellor</th>
                      <th className="py-3 px-4">Ageing</th>
                      <th className="py-3 px-4">Next Follow-up</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                          <Link
                            to={`/leads/${lead.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {lead.lead_number}
                          </Link>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{lead.full_name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[170px] mt-0.5">
                            {lead.phone} • {lead.email}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className="text-slate-800 font-medium truncate max-w-[140px] block"
                            title={lead.course_name}
                          >
                            {lead.course_name || '—'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {lead.source_display || lead.source}
                        </td>

                        <td className="py-3 px-4">
                          <StatusBadge status={lead.status} />
                        </td>

                        <td className="py-3 px-4">
                          <PriorityBadge priority={lead.priority} />
                        </td>

                        <td className="py-3 px-4">
                          {lead.counsellor ? (
                            <span className="text-slate-700 font-medium flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {lead.counsellor_name?.[0] || 'C'}
                              </span>
                              <span className="truncate max-w-[110px]">{lead.counsellor_name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <AgeingBadge category={lead.ageing_category} />
                        </td>

                        <td className="py-3 px-4">
                          {lead.next_followup_at ? (
                            <span className="text-slate-700 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(lead.next_followup_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/leads/${lead.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Strategy */}
              <div className="divide-y divide-slate-100 md:hidden">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-600">
                          {lead.lead_number}
                        </span>
                        <StatusBadge status={lead.status} />
                      </div>
                      <PriorityBadge priority={lead.priority} />
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{lead.full_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lead.course_name || 'No program specified'} • {lead.source_display}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span>Counsellor: <strong className="text-slate-700">{lead.counsellor_name || 'Unassigned'}</strong></span>
                      <AgeingBadge category={lead.ageing_category} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination Bar */}
          {totalCount > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <div>
                Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * 20 + 1}</span> to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * 20, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{totalCount}</span> leads
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Prev
                </Button>
                <span className="px-2 font-medium text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
