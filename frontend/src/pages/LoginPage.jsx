import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect
  const from = location.state?.from?.pathname || '/dashboard';
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await login(username.trim(), password);

    setIsSubmitting(false);

    if (result.success) {
      toast.success(`Welcome back, ${result.user.first_name || result.user.username}!`);
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const fillQuickCredentials = (userType) => {
    if (userType === 'manager') {
      setUsername('manager_priya');
      setPassword('Password@123');
    } else {
      setUsername('counsellor_amit');
      setPassword('Password@123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle institutional grid / ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-1 ring-indigo-700/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">EduLead</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Operational Console</span>
          </div>
        </div>
        <h2 className="mt-5 text-center text-lg font-bold text-slate-900 tracking-tight">
          Admissions Management Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 max-w-xs mx-auto">
          Secure CRM for Higher Education Enquiries, Counseling Workflows & Conversions
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="stitch-card p-6 sm:p-8 bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Staff Identifier / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="e.g. manager_priya or counsellor_amit"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                Sign In to Console
              </Button>
            </div>
          </form>

          {/* Assessment quick-login helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Quick Fill Assessment Accounts
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('manager')}
                className="flex-1 py-1.5 px-3 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 transition-colors hover:border-slate-300"
              >
                Manager Demo
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('counsellor')}
                className="flex-1 py-1.5 px-3 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 transition-colors hover:border-slate-300"
              >
                Counsellor Demo
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Institutional JWT with Refresh Token Rotation</span>
        </div>
      </div>
    </div>
  );
};
