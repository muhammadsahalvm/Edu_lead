import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { leadsService } from '../../api/leads';
import { formatApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const ALL_STATUSES = [
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

const LOSS_REASONS = [
  { value: 'FEES_HIGH', label: 'Tuition / Fee Constraint' },
  { value: 'DISTANCE_LOCATION', label: 'Distance / Relocation Constraint' },
  { value: 'CHOSE_COMPETITOR', label: 'Admitted to Another Institution' },
  { value: 'INELIGIBLE_ACADEMICS', label: 'Academic Ineligibility / Minimum Marks' },
  { value: 'COURSE_NOT_OFFERED', label: 'Desired Specialization Not Offered' },
  { value: 'UNRESPONSIVE_EXHAUSTED', label: 'Unresponsive After Maximum Attempts' },
  { value: 'OTHER', label: 'Other / Personal Reason' },
];

export const StatusUpdateModal = ({ lead, isOpen, onClose, onUpdated }) => {
  const toast = useToast();
  const { isManager } = useAuth();

  const [newStatus, setNewStatus] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const [remarks, setRemarks] = useState('');
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

  const isTerminalTarget = newStatus === 'LOST' || newStatus === 'NOT_INTERESTED';
  const isCurrentlyTerminal = ['CONVERTED', 'NOT_INTERESTED', 'LOST'].includes(lead.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newStatus) {
      setError('Please select a target status.');
      return;
    }

    if (isTerminalTarget && !lossReason) {
      setError('A loss reason is mandatory when marking a lead as Lost or Not Interested.');
      return;
    }

    if (isCurrentlyTerminal && !isManager) {
      setError('Only managers can recover or reopen a closed lead.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        status: newStatus,
        loss_reason: isTerminalTarget ? lossReason : null,
        loss_notes: isTerminalTarget ? lossNotes : '',
        remarks: remarks || '',
      };

      const updated = await leadsService.updateLeadStatus(lead.id, payload);
      toast.success(`Lead status updated to ${updated.status_display || newStatus}.`);
      onUpdated(updated);
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
      aria-labelledby="status-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="status-modal-title" className="text-sm font-bold text-slate-900">
              Update Lead Lifecycle Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current: <span className="font-semibold text-indigo-600">{lead.status_display}</span>
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
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isCurrentlyTerminal && !isManager && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              This lead is in a closed state. Only managers can perform pipeline recovery.
            </div>
          )}

          <Select
            label="Target Lifecycle Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            required
            options={ALL_STATUSES.filter((s) => s.value !== lead.status)}
            placeholder="Select new status..."
          />

          {isTerminalTarget && (
            <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200 space-y-3">
              <Select
                label="Loss Reason"
                required
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                options={LOSS_REASONS}
                placeholder="Choose primary reason for loss..."
              />

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Loss Remarks & Candidate Feedback
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Additional context on candidate decision or competitor details..."
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Transition Remarks (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Operational remarks recorded in activity audit log..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
              icon={ArrowRight}
            >
              Confirm Transition
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
