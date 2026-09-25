import React, { useState, useEffect } from 'react';
import { X, Ban } from 'lucide-react';
import { Button } from '../common/Button';
import { followupsService } from '../../api/followups';
import { formatApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const CancelFollowUpModal = ({ followup, isOpen, onClose, onUpdated }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
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
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A cancellation reason is mandatory (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await followupsService.cancelFollowUp(followup.id, { reason: reason.trim() });
      toast.info('Follow-up task has been cancelled.');
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
      aria-labelledby="cancel-followup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="cancel-followup-title" className="text-sm font-bold text-slate-900">
              Cancel Follow-up Task
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

          <p className="text-xs text-slate-600 leading-relaxed">
            Cancelling this task removes it from your pending operational queue. A cancellation reason is mandatory for operational visibility.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              placeholder="e.g. Candidate withdrew application, scheduled session duplicated, candidate opted out..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Keep Task
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isSubmitting}
              icon={Ban}
            >
              Cancel Follow-up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
