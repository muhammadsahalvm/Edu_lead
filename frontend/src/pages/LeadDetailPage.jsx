import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit,
  UserCheck,
  AlertTriangle,
  Plus,
  ExternalLink,
  RefreshCw,
  Clock,
  Award,
  BookOpen,
  Share2,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge, AgeingBadge, FollowUpStatusBadge, PriorityBadge } from '../components/common/Badge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { StatusUpdateModal } from '../components/leads/StatusUpdateModal';
import { ReassignModal } from '../components/leads/ReassignModal';
import { ScheduleFollowUpModal } from '../components/leads/ScheduleFollowUpModal';
import { LeadTimeline } from '../components/timeline/LeadTimeline';
import { leadsService } from '../api/leads';
import { formatApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const LeadDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isManager, user } = useAuth();

  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Note state
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const fetchLeadDetails = useCallback(async () => {
    // Guard: reject clearly invalid IDs before making any API calls
    if (!id || id === 'undefined' || isNaN(Number(id)) || Number(id) <= 0) {
      navigate('/leads', { replace: true });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [leadData, timelineData, followupsData] = await Promise.all([
        leadsService.getLead(id),
        leadsService.getLeadTimeline(id),
        leadsService.getLeadFollowups(id),
      ]);

      setLead(leadData);
      setTimeline(timelineData || []);
      const fList = followupsData?.results || followupsData || [];
      setFollowups(fList);
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      toast.error(formatted, 'Failed to load lead profile');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  // Handle Note Addition
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (isAddingNote) return;
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const timestamp = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const updatedNotes = lead.notes
        ? `${lead.notes}\n[${timestamp}] ${user?.username}: ${newNote.trim()}`
        : `[${timestamp}] ${user?.username}: ${newNote.trim()}`;

      const updated = await leadsService.updateLead(lead.id, { notes: updatedNotes });
      setLead(updated);
      setNewNote('');
      toast.success('Note recorded successfully.');

      // Refresh timeline to reflect new update log
      const freshTimeline = await leadsService.getLeadTimeline(id);
      setTimeline(freshTimeline || []);
    } catch (err) {
      toast.error(formatApiError(err), 'Failed to append note');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading && !lead) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <LoadingSkeleton variant="card" count={2} />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <LoadingSkeleton variant="card" count={2} />
          </div>
        </div>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="py-8">
        <ErrorState
          title="Lead Profile Unavailable"
          description={error}
          onRetry={fetchLeadDetails}
        />
      </div>
    );
  }

  if (!lead) {
    return (
      <div>
        <PageHeader title="Lead Not Found" />
        <EmptyState
          title="Lead Record Not Available"
          description="The requested student enquiry could not be found or you do not have permission to view it."
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/leads')}>
              Back to Leads
            </Button>
          }
        />
      </div>
    );
  }

  const isAssignedToCurrent = lead.counsellor === user?.id;
  const canUpdate = isManager || isAssignedToCurrent;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Lead Profile"
        subtitle={`${lead.full_name} • ${lead.lead_number}`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: isManager ? 'Leads' : 'My Leads', to: '/leads' },
          { label: lead.lead_number },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchLeadDetails}
            >
              Sync
            </Button>

            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                icon={Calendar}
                onClick={() => setIsScheduleModalOpen(true)}
              >
                + Add Follow-up
              </Button>
            )}

            {isManager && (
              <Button
                variant="outline"
                size="sm"
                icon={UserCheck}
                onClick={() => setIsReassignModalOpen(true)}
              >
                Assign / Reassign
              </Button>
            )}

            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStatusModalOpen(true)}
              >
                Change Status
              </Button>
            )}

            {canUpdate && (
              <Button
                variant="primary"
                size="sm"
                icon={Edit}
                onClick={() => navigate(`/leads/${lead.id}/edit`)}
              >
                Edit Lead
              </Button>
            )}
          </div>
        }
      />

      {/* Duplicate Warning Alert if Detected */}
      {lead.potential_duplicates && lead.potential_duplicates.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Potential Duplicate Enquiries Detected</p>
              <p className="mt-0.5 text-amber-800">
                Another enquiry in the system shares this candidate's phone number or email:
              </p>
              <ul className="mt-2 space-y-1.5">
                {lead.potential_duplicates.map((dup) => (
                  <li key={dup.id} className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-800">{dup.lead_number}</span>
                    <span className="text-slate-600">({dup.first_name} {dup.last_name}):</span>
                    <Link
                      to={`/leads/${dup.id}`}
                      className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Unified lead profile and candidate coordinates */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-sm ring-4 ring-blue-50">
            {(lead.full_name || 'Lead').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Applicant profile</p>
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{lead.full_name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono-data text-[11px] font-semibold text-slate-600">
                {lead.lead_number}
              </span>
              <StatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
              <AgeingBadge category={lead.ageing_category} days={lead.age_days} />
            </div>
          </div>
          <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Created Date</span>
            <span className="mt-1 block font-medium text-slate-700">
              {new Date(lead.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-2 sm:px-7">
          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><Phone className="h-4 w-4 text-slate-400" />Phone Number</span>
              <a href={`tel:${lead.phone}`} className="font-semibold text-blue-600 hover:text-blue-800 sm:text-right">{lead.phone}</a>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><Mail className="h-4 w-4 text-slate-400" />Email Address</span>
              <a href={`mailto:${lead.email}`} className="break-all font-semibold text-blue-600 hover:text-blue-800 sm:text-right">{lead.email || 'Not provided'}</a>
            </div>
            {(lead.city || lead.state) && (
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-4 w-4 text-slate-400" />Location</span>
                <span className="font-medium text-slate-800 sm:text-right">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><BookOpen className="h-4 w-4 text-slate-400" />Program Preference</span>
              <span className="font-semibold text-slate-800 sm:text-right">{lead.course_name || 'General Enquiry'}</span>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><Share2 className="h-4 w-4 text-slate-400" />Acquisition Channel</span>
              <span className="font-medium text-slate-800 sm:text-right">{lead.source_display || 'Not recorded'}</span>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><UserCheck className="h-4 w-4 text-slate-400" />Counsellor</span>
              <span className="font-semibold text-slate-800 sm:text-right">{lead.counsellor_name || 'Unassigned'}</span>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><Clock className="h-4 w-4 text-slate-400" />Last Contacted</span>
              <span className="font-medium text-slate-800 sm:text-right">
                {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never contacted'}
              </span>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="flex items-center gap-2 text-xs text-slate-500"><Calendar className="h-4 w-4 text-slate-400" />Next Follow-up</span>
              <span className="font-medium text-slate-800 sm:text-right">
                {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'None scheduled'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Status context */}
      {lead.status === 'CONVERTED' && (
        <Card title="Admission Confirmed" className="border-emerald-200 bg-emerald-50/20">
          <div className="flex items-center gap-3 text-xs text-emerald-800">
            <Award className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">Student Enrolled Successfully</p>
              <p className="mt-0.5 text-emerald-700">This applicant has confirmed admission and completed the enrollment pipeline.</p>
            </div>
          </div>
        </Card>
      )}
      {(lead.status === 'LOST' || lead.status === 'NOT_INTERESTED') && (
        <Card title="Loss / Drop-off Context" className="border-rose-200 bg-rose-50/20">
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-rose-800">Reason: {lead.loss_reason_display || lead.loss_reason || 'Unspecified'}</p>
            {lead.loss_notes && <p className="rounded-lg border border-rose-100 bg-white p-2.5 text-slate-600">"{lead.loss_notes}"</p>}
          </div>
        </Card>
      )}

      {/* Notes and follow-ups share a row; the timeline uses the full page width. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-7">
        <Card
          title="Counselor Remarks & Notes"
          subtitle="Historical comments and qualitative candidate context"
          className="h-full flex flex-col lg:col-span-5"
          bodyClassName="flex flex-1 flex-col"
        >
          <div className="flex h-full flex-col gap-3">
            {lead.notes ? (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                {lead.notes}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400">No notes recorded yet for this student.</p>
            )}
            {canUpdate && (
              <form onSubmit={handleAddNote} className="mt-auto pt-2">
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Append an operational note or call outcome..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="submit" variant="secondary" size="sm" isLoading={isAddingNote} disabled={!newNote.trim()}>
                    Post Note
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        <Card
          title="Follow-up Checklist"
          subtitle="Scheduled interactions, past meetings, and recorded outcomes"
          className="h-full flex flex-col lg:col-span-7"
          bodyClassName="flex-1"
          action={canUpdate && (
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsScheduleModalOpen(true)}>
              Schedule Next
            </Button>
          )}
        >
          {followups.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Follow-ups Recorded"
              description="Keep outreach moving by scheduling phone calls, WhatsApp messages, or counselling sessions."
              className="py-6 border-none"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {followups.map((f) => (
                <div key={f.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">{f.followup_type_display}</span>
                      <FollowUpStatusBadge status={f.status} isOverdue={f.is_overdue} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Assigned: <strong className="text-slate-700">{f.assigned_to_name}</strong> • Scheduled: {new Date(f.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {f.outcome_display && <p className="mt-0.5 text-[11px] font-medium text-emerald-700">Outcome: {f.outcome_display}</p>}
                    {f.notes && <p className="mt-0.5 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[11px] italic text-slate-500">"{f.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Activity Audit Timeline"
          subtitle="Immutable chronological history of all lifecycle transitions, assignments, and updates"
          className="lg:col-span-12"
        >
          <LeadTimeline timeline={timeline} isLoading={isLoading} />
        </Card>
      </div>

      {/* Action Modals */}
      <StatusUpdateModal
        lead={lead}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onUpdated={() => fetchLeadDetails()}
      />

      <ReassignModal
        lead={lead}
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        onReassigned={() => fetchLeadDetails()}
      />

      <ScheduleFollowUpModal
        lead={lead}
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduled={() => fetchLeadDetails()}
      />
    </div>
  );
};
