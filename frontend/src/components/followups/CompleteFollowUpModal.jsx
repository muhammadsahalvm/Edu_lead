import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { followupsService } from '../../api/followups';
import { formatApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

const OUTCOME_OPTIONS = [
  { value: 'CONNECTED_POSITIVE', label: 'Connected - Positive Interest' },
  { value: 'CONNECTED_BUSY_CALL_BACK', label: 'Connected - Requested Callback' },
  { value: 'RINGING_NO_ANSWER', label: 'Ringing - No Answer' },
  { value: 'NUMBER_INVALID', label: 'Invalid / Unreachable Number' },
  { value: 'WHATSAPP_SENT', label: 'WhatsApp Prospectus Sent' },
  { value: 'EMAIL_SENT', label: 'Email Information Pack Sent' },
  { value: 'MEETING_COMPLETED', label: 'Counselling / Campus Session Completed' },
  { value: 'MEETING_NO_SHOW', label: 'Candidate Missed Session (No-Show)' },
];

const FOLLOWUP_TYPES = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'COUNSELLING', label: 'Admission Counselling' },
  { value: 'MEETING', label: 'Campus Meeting' },
  { value: 'EMAIL', label: 'Email' },
];

export const CompleteFollowUpModal = ({ followup, isOpen, onClose, onCompleted }) => {
  const toast = useToast();

  const [outcome, setOutcome] = useState('CONNECTED_POSITIVE');
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextType, setNextType] = useState('CALL');
  const [nextDateTime, setNextDateTime] = useState('');
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
    if (!outcome) {
      setError('Please choose an interaction outcome.');
      return;
    }

    if (scheduleNext && !nextDateTime) {
      setError('Please select a scheduled date and time for the next follow-up.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        outcome,
        notes: notes.trim(),
      };

      if (scheduleNext && nextDateTime) {
        payload.next_followup_at = new Date(nextDateTime).toISOString();
        payload.next_followup_type = nextType;
      }

      await followupsService.completeFollowUp(followup.id, payload);
      toast.success('Follow-up task successfully marked as completed.');
      onCompleted();
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
      aria-labelledby="complete-followup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="complete-followup-title" className="text-sm font-bold text-slate-900">
              Complete Follow-up Task
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="font-semibold text-slate-800">{followup.lead_name}</span> ({followup.lead_number})
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
            label="Call / Meeting Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            required
            options={OUTCOME_OPTIONS}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Discussion Notes & Candidate Feedback
            </label>
            <textarea
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Record candidate interest level, entrance test marks, documents pending..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Seamless next follow-up scheduler */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Schedule Next Follow-up Interaction</span>
            </label>

            {scheduleNext && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <Select
                  label="Next Channel"
                  value={nextType}
                  onChange={(e) => setNextType(e.target.value)}
                  options={FOLLOWUP_TYPES}
                />
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Scheduled Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required={scheduleNext}
                    value={nextDateTime}
                    onChange={(e) => setNextDateTime(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
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
              icon={CheckCircle}
            >
              Confirm Completion
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
