import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { leadsService } from '../../api/leads';
import { formatApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const FOLLOWUP_TYPES = [
  { value: 'CALL', label: 'Phone Call Discussion' },
  { value: 'WHATSAPP', label: 'WhatsApp Outreach' },
  { value: 'COUNSELLING', label: 'Admission Counselling Session' },
  { value: 'MEETING', label: 'Campus In-Person Meeting' },
  { value: 'EMAIL', label: 'Email Prospectus / Brochure' },
];

export const ScheduleFollowUpModal = ({ lead, isOpen, onClose, onScheduled }) => {
  const toast = useToast();

  // Default to tomorrow 10:00 AM
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(10, 0, 0, 0);
  const defaultIso = defaultDate.toISOString().slice(0, 16);

  const [followupType, setFollowupType] = useState('CALL');
  const [scheduledAt, setScheduledAt] = useState(defaultIso);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!scheduledAt) {
      setError('Please select a valid scheduled date and time.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        lead: lead.id,
        followup_type: followupType,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes.trim(),
      };

      await leadsService.scheduleFollowup(payload);
      toast.success('Follow-up task successfully scheduled.');
      onScheduled();
      onClose();
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h3 id="schedule-modal-title" className="text-base leading-6 font-semibold text-slate-900">
              Schedule Follow-up Task
            </h3>
            <p className="text-sm leading-5 text-slate-500 mt-1">
              Candidate: <span className="font-semibold text-slate-800">{lead.full_name}</span> ({lead.lead_number})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 -mr-2 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm leading-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <Select
            label="Interaction Channel / Type"
            value={followupType}
            onChange={(e) => setFollowupType(e.target.value)}
            required
            options={FOLLOWUP_TYPES}
            labelClassName="!text-sm !mb-2"
            className="!h-11 !rounded-xl !px-3.5 !text-sm"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Scheduled Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full h-11 text-sm rounded-xl border border-slate-300 px-3.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Task Agenda / Discussion Notes
            </label>
            <textarea
              rows={4}
              className="w-full min-h-28 text-sm leading-6 rounded-xl border border-slate-300 p-3.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Discuss scholarship eligibility, program prospectus, entrance exam cutoff..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="outline" size="md" className="rounded-xl px-4 py-2.5" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={Calendar}
              className="rounded-xl px-4 py-2.5"
            >
              Save Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
