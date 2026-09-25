import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { leadsService } from '../api/leads';
import { formatApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

export const LeadEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isManager, user } = useAuth();

  const [lead, setLead] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [courseId, setCourseId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [leadData, courseList] = await Promise.all([
          leadsService.getLead(id),
          leadsService.getCourses(),
        ]);

        setLead(leadData);
        setCourses(courseList);

        // Prepopulate form fields
        setFirstName(leadData.first_name || '');
        setLastName(leadData.last_name || '');
        setEmail(leadData.email || '');
        setPhone(leadData.phone || '');
        setCity(leadData.city || '');
        setState(leadData.state || '');
        setCourseId(leadData.course || '');
        setPriority(leadData.priority || 'MEDIUM');
        setNotes(leadData.notes || '');
      } catch (err) {
        toast.error(formatApiError(err), 'Failed to load lead details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, toast]);

  const validate = () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.first_name = 'First name is required.';
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        newErrors.phone = 'Phone number must contain between 7 and 15 digits.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

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
        priority,
        notes: notes.trim(),
      };

      if (courseId) {
        payload.course = parseInt(courseId, 10);
      }

      await leadsService.updateLead(id, payload);
      toast.success('Lead coordinates successfully updated.');
      navigate(`/leads/${id}`);
    } catch (err) {
      const msg = formatApiError(err);
      toast.error(msg, 'Failed to update lead');
      if (err.response?.data && typeof err.response.data === 'object') {
        setErrors(err.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" className="text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading lead #{id} for editing...</p>
      </div>
    );
  }

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Edit Lead: ${lead?.full_name}`}
        subtitle={`System Identifier: ${lead?.lead_number} • Current Status: ${lead?.status_display}`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Leads', to: '/leads' },
          { label: lead?.lead_number, to: `/leads/${id}` },
          { label: 'Edit' },
        ]}
        action={
          <Link to={`/leads/${id}`}>
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Cancel
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Candidate Coordinates" subtitle="Update personal identification and reachability">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="first_name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.first_name}
              />
              <Input
                label="Last Name"
                name="last_name"
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State"
                name="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card title="Program & Outreach Settings">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Academic Program Preference"
                name="course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={courseOptions}
              />
              <Select
                label="Operational Priority"
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={PRIORITY_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Counsellor Remarks & Context
              </label>
              <textarea
                rows={4}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to={`/leads/${id}`}>
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
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
