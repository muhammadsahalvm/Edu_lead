import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { leadsService } from '../../api/leads';
import { formatApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const ReassignModal = ({ lead, isOpen, onClose, onReassigned }) => {
  const toast = useToast();

  const [counsellors, setCounsellors] = useState([]);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchCounsellors = async () => {
      setIsLoading(true);
      try {
        const list = await leadsService.getCounsellors();
        setCounsellors(list);
      } catch (err) {
        toast.error('Failed to load active counsellors list.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounsellors();
  }, [isOpen, toast]);

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
    if (!selectedCounsellorId) {
      setError('Please select a target counsellor.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A valid reason for reassignment is mandatory (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await leadsService.reassignLead(lead.id, {
        counsellor_id: parseInt(selectedCounsellorId, 10),
        reason: reason.trim(),
      });

      toast.success(response.detail || 'Lead reassigned successfully.');
      onReassigned();
      onClose();
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const counsellorOptions = counsellors.map((c) => ({
    value: c.id,
    label: `${c.full_name || c.username} (${c.email}) ${
      !c.is_available_for_assignment ? '— Currently Away' : ''
    }`,
  }));

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="reassign-modal-title" className="text-sm font-bold text-slate-900">
              Reassign Admission Lead
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Owner: <span className="font-semibold text-slate-700">{lead.counsellor_name || 'Unassigned'}</span>
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

          <Select
            label="Assign to Counsellor"
            value={selectedCounsellorId}
            onChange={(e) => setSelectedCounsellorId(e.target.value)}
            required
            disabled={isLoading}
            options={counsellorOptions}
            placeholder={isLoading ? 'Loading counsellors...' : 'Choose new counsellor...'}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reassignment Rationale <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Workload balancing, language preference, or counsellor leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This note is permanently recorded in the immutable audit log for compliance.
            </p>
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
              icon={UserCheck}
            >
              Reassign Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
