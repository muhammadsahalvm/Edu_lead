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
        title={lead.full_name}
        subtitle={`Lead ID: ${lead.lead_number} • Enquired on ${new Date(
          lead.created_at
        ).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`}
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
                      className="font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1"
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

      {/* Header Profile Hero Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
            {lead.first_name?.[0] || 'L'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{lead.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-data text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                #{lead.lead_number}
              </span>
              <StatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
              <AgeingBadge category={lead.ageing_category} days={lead.age_days} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Course: <strong className="text-slate-800">{lead.course_name || 'General Enquiry'}</strong>
              <span className="mx-2 text-slate-300">•</span>
              Source: <strong className="text-slate-800">{lead.source_display}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-right">
          <div>
            <span className="block text-slate-400 text-[11px] font-medium uppercase tracking-wider">Counsellor</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {lead.counsellor_name || 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 text-[11px] font-medium uppercase tracking-wider">Next Follow-up</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {lead.next_followup_at
                ? new Date(lead.next_followup_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'None scheduled'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Information Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Candidate Information & Notes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact Details & Metadata */}
          <Card title="Candidate Coordinates" subtitle="Applicant contact channels and lifecycle metadata">
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Phone Number
                </span>
                <a
                  href={`tel:${lead.phone}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {lead.phone}
                </a>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Address
                </span>
                <a
                  href={`mailto:${lead.email}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 truncate max-w-[200px]"
                >
                  {lead.email}
                </a>
              </div>

              {(lead.city || lead.state) && (
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Location
                  </span>
                  <span className="font-medium text-slate-800">
                    {[lead.city, lead.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  Program Preference
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[190px]">
                  {lead.course_name || 'General Enquiry'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  Acquisition Channel
                </span>
                <span className="font-medium text-slate-800">
                  {lead.source_display}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Last Contacted
                </span>
                <span className="font-medium text-slate-800">
                  {lead.last_contacted_at
                    ? new Date(lead.last_contacted_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never contacted'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Created Date
                </span>
                <span className="font-medium text-slate-800">
                  {new Date(lead.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </Card>

          {/* Conversion Details if applicable */}
          {lead.status === 'CONVERTED' && (
            <Card title="Admission Confirmed" className="border-emerald-200 bg-emerald-50/20">
              <div className="flex items-center gap-3 text-emerald-800 text-xs">
                <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Student Enrolled Successfully</p>
                  <p className="text-emerald-700 mt-0.5">
                    This applicant has confirmed admission and completed the enrollment pipeline.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Loss Details if terminal */}
          {(lead.status === 'LOST' || lead.status === 'NOT_INTERESTED') && (
            <Card title="Loss / Drop-off Context" className="border-rose-200 bg-rose-50/20">
              <div className="text-xs space-y-2">
                <p className="font-semibold text-rose-800">
                  Reason: {lead.loss_reason_display || lead.loss_reason || 'Unspecified'}
                </p>
                {lead.loss_notes && (
                  <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-rose-100">
                    "{lead.loss_notes}"
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Remarks & Operational Notes */}
          <Card title="Counselor Remarks & Notes" subtitle="Historical comments and qualitative candidate context">
            <div className="space-y-3">
              {lead.notes ? (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-slate-100 font-sans">
                  {lead.notes}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No notes recorded yet for this student.</p>
              )}

              {/* Append note box */}
              {canUpdate && (
                <form onSubmit={handleAddNote} className="pt-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Append an operational note or call outcome..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isAddingNote}
                      disabled={!newNote.trim()}
                    >
                      Post Note
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (7 cols): Follow-ups & Activity Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scheduled & Completed Follow-ups */}
          <Card
            title="Follow-up Checklist"
            subtitle="Scheduled interactions, past meetings, and recorded outcomes"
            action={
              canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsScheduleModalOpen(true)}
                >
                  Schedule Next
                </Button>
              )
            }
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
                  <div key={f.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {f.followup_type_display}
                        </span>
                        <FollowUpStatusBadge status={f.status} isOverdue={f.is_overdue} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Assigned: <strong className="text-slate-700">{f.assigned_to_name}</strong> •{' '}
                        Scheduled:{' '}
                        {new Date(f.scheduled_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {f.outcome_display && (
                        <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
                          Outcome: {f.outcome_display}
                        </p>
                      )}
                      {f.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{f.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Activity Audit Timeline */}
          <Card
            title="Activity Audit Timeline"
            subtitle="Immutable chronological history of all lifecycle transitions, assignments, and updates"
          >
            <LeadTimeline timeline={timeline} isLoading={isLoading} />
          </Card>
        </div>
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
