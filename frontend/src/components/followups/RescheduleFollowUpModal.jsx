import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { followupsService } from '../../api/followups';
import { formatApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const FOLLOWUP_TYPES = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'COUNSELLING', label: 'Admission Counselling' },
  { value: 'MEETING', label: 'Campus Meeting' },
  { value: 'EMAIL', label: 'Email' },
];

export const RescheduleFollowUpModal = ({ followup, isOpen, onClose, onUpdated }) => {
  const toast = useToast();

  const initialDateTime = followup?.scheduled_at
    ? new Date(followup.scheduled_at).toISOString().slice(0, 16)
    : '';

  const [scheduledAt, setScheduledAt] = useState(initialDateTime);
  const [followupType, setFollowupType] = useState(followup?.followup_type || 'CALL');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
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

  if (!isOpen || !followup) return null;

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
      const updatedNotes = rescheduleNotes.trim()
        ? `${followup.notes || ''}\n[Rescheduled]: ${rescheduleNotes.trim()}`.trim()
        : followup.notes;

      await followupsService.rescheduleFollowUp(followup.id, {
        scheduled_at: new Date(scheduledAt).toISOString(),
        followup_type: followupType,
        notes: updatedNotes,
      });

      toast.success('Follow-up task successfully rescheduled.');
      onUpdated();
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-followup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="reschedule-followup-title" className="text-sm font-bold text-slate-900">
              Reschedule Follow-up Task
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="font-semibold text-slate-800">{followup.lead_name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          <Select
            label="Interaction Channel / Type"
            value={followupType}
            onChange={(e) => setFollowupType(e.target.value)}
            required
            options={FOLLOWUP_TYPES}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              New Scheduled Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reschedule Context / Notes (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Candidate requested call tomorrow after 4 PM..."
              value={rescheduleNotes}
              onChange={(e) => setRescheduleNotes(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              icon={Clock}
            >
              Update Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
