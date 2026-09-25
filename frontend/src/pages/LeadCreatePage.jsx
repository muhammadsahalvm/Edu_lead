import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { leadsService } from '../api/leads';
import { formatApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website Enquiry' },
  { value: 'WALK_IN', label: 'Walk-In / Campus Visit' },
  { value: 'PHONE', label: 'Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EDUCATION_FAIR', label: 'Education Fair / Expo' },
  { value: 'CAMPAIGN', label: 'Digital Campaign (Ads)' },
  { value: 'REFERRAL', label: 'Student / Alumni Referral' },
  { value: 'OTHER', label: 'Other Source' },
];

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

export const LeadCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isManager, isCounsellor, user } = useAuth();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [courseId, setCourseId] = useState('');
  const [source, setSource] = useState('WEBSITE');
  const [priority, setPriority] = useState('MEDIUM');
  const [counsellorId, setCounsellorId] = useState('');
  const [notes, setNotes] = useState('');

  // Dropdown reference lists
  const [courses, setCourses] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Validation & Submission states
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [courseList, counsellorList] = await Promise.all([
          leadsService.getCourses(),
          leadsService.getCounsellors(),
        ]);
        setCourses(courseList);
        setCounsellors(counsellorList);
      } catch (err) {
        toast.error('Failed to load course or counsellor options.');
      } finally {
        setIsLoadingMeta(false);
      }
    };

    fetchMetadata();
  }, [toast]);

  // Real-time Duplicate Check
  const checkDuplicateEnquiry = async () => {
    if (!email && !phone) return;
    try {
      const data = await leadsService.checkDuplicate({
        email: email.trim(),
        phone: phone.trim(),
      });
      if (data.has_duplicate) {
        setDuplicateWarning(data.duplicates);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      // Quiet fail on check
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.first_name = 'First name is required.';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        newErrors.phone = 'Phone number must contain between 7 and 15 digits.';
      }
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please provide a valid email format (e.g. name@domain.com).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        state: state.trim(),
        source,
        priority,
        notes: notes.trim(),
      };

      if (courseId) {
        payload.course = parseInt(courseId, 10);
      }

      if (isManager && counsellorId) {
        payload.counsellor = parseInt(counsellorId, 10);
      } else if (isCounsellor) {
        payload.counsellor = user.id;
      }

      const created = await leadsService.createLead(payload);
      toast.success(`Lead ${created.lead_number} created successfully.`);
      navigate(`/leads/${created.id}`);
    } catch (err) {
      const msg = formatApiError(err);
      toast.error(msg, 'Failed to create lead');
      if (err.response?.data && typeof err.response.data === 'object') {
        setErrors(err.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name} (${c.department || 'Academic'})`,
  }));

  const counsellorOptions = [
    { value: '', label: '⚡ Auto-Assign (Deterministic Round-Robin)' },
    ...counsellors.map((c) => ({
      value: c.id,
      label: `${c.full_name || c.username} (${c.email}) ${
        !c.is_available_for_assignment ? '— Currently Away' : ''
      }`,
    })),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Register New Admission Enquiry"
        subtitle="Ingest candidate contact coordinates, program preference, and trigger counsellor assignment."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Leads', to: '/leads' },
          { label: 'New Lead' },
        ]}
        action={
          <Link to="/leads">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to Leads
            </Button>
          </Link>
        }
      />

      {/* Duplicate Alert Banner */}
      {duplicateWarning && duplicateWarning.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Potential Duplicate Warning</p>
              <p className="mt-0.5 text-amber-800">
                An existing lead already shares this contact coordinate:
              </p>
              <ul className="mt-1.5 space-y-1">
                {duplicateWarning.map((d) => (
                  <li key={d.id}>
                    • <strong>{d.lead_number}</strong> ({d.first_name} {d.last_name}): Status: {d.status} • Counsellor: {d.counsellor_name || 'Unassigned'}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-700">
                You can still proceed if this is a distinct applicant or new intake term.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate Information Card */}
        <Card title="Candidate Coordinates" subtitle="Applicant personal identification and primary contact channels">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="first_name"
                required
                placeholder="e.g. Aarav"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.first_name}
              />
              <Input
                label="Last Name"
                name="last_name"
                placeholder="e.g. Patel"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.last_name}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                name="phone"
                required
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={checkDuplicateEnquiry}
                error={errors.phone}
                helperText="Primary number for calling and WhatsApp outreach"
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="e.g. aarav.patel@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={checkDuplicateEnquiry}
                error={errors.email}
                helperText="Used for brochures, admission offers, and communication"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City"
                name="city"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State / Province"
                name="state"
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Academic & Outreach Preferences Card */}
        <Card title="Program & Lead Attribution" subtitle="Target degree preference, marketing channel, and urgency">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Academic Program Preference"
                name="course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={courseOptions}
                placeholder={isLoadingMeta ? 'Loading courses...' : 'Select degree program...'}
                error={errors.course}
              />

              <Select
                label="Lead Acquisition Source"
                name="source"
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                options={SOURCE_OPTIONS}
                error={errors.source}
              />

              <Select
                label="Initial Priority"
                name="priority"
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={PRIORITY_OPTIONS}
                error={errors.priority}
              />
            </div>

            {/* Counsellor assignment option for managers */}
            {isManager && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Select
                  label="Admission Counsellor Assignment"
                  name="counsellor"
                  value={counsellorId}
                  onChange={(e) => setCounsellorId(e.target.value)}
                  options={counsellorOptions}
                  helperText="Leave as Auto-Assign to use fair round-robin distribution among active counsellors."
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Initial Counsellor Remarks & Context
              </label>
              <textarea
                rows={3}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Candidate background, qualifying test scores, queries, or scheduled visit notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/leads">
            <Button variant="outline" size="md" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            isLoading={isSubmitting}
          >
            Create Lead & Save
          </Button>
        </div>
      </form>
    </div>
  );
};
