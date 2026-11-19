import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Lock, User, AlertCircle, ShieldCheck, Sparkles, UsersRound, BriefcaseBusiness } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = location.state?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const fillQuickCredentials = (role) => {
    setUsername(role === 'manager' ? 'manager_priya' : 'counsellor_amit');
    setPassword('Password@123');
    setError('');
  };

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

  return (
    <main className="login-page min-h-screen flex items-center justify-center p-4 sm:p-8">
      <section className="login-card grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white sm:grid-cols-2">
        <div className="login-visual relative flex min-h-[280px] flex-col justify-between overflow-hidden p-8 sm:min-h-[590px] sm:p-10">
          <div className="login-orb login-orb-one" />
          <div className="login-orb login-orb-two" />
          <div className="relative z-10 flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/35 backdrop-blur-sm"><GraduationCap className="h-6 w-6" /></div>
            <div><span className="block text-lg font-bold tracking-tight">EduLead</span><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/75">Admissions CRM</span></div>
          </div>
          <div className="relative z-10 max-w-sm text-white">
            <Sparkles className="mb-5 h-7 w-7 text-white/90" />
            <p className="mb-2 text-sm font-medium text-white/80">A clearer way to connect</p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem]">Every student journey, all in one place.</h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/75">Manage enquiries, meaningful conversations, and admissions progress with confidence.</p>
          </div>
          <div className="relative z-10 text-xs font-medium text-white/70">Your admissions workspace</div>
        </div>

        <div className="flex items-center justify-center p-7 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck className="h-5 w-5" /></span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">Welcome back</h2>
              <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your EduLead workspace.</p>
            </div>

            {error && <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                <div className="relative"><User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="username" name="username" type="text" required autoComplete="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} className="login-input w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400" /></div>
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="login-input w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400" /></div>
              </div>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="login-submit w-full rounded-xl py-3 text-sm font-semibold">Sign in to EduLead</Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[11px] font-medium text-slate-400"><span className="h-px flex-1 bg-slate-200" />Choose a workspace<span className="h-px flex-1 bg-slate-200" /></div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => fillQuickCredentials('manager')} className="role-choice group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100"><BriefcaseBusiness className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-slate-800">Manager</span><span className="block text-[11px] text-slate-500">Team overview</span></span></button>
              <button type="button" onClick={() => fillQuickCredentials('counsellor')} className="role-choice group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100"><UsersRound className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-slate-800">Counsellor</span><span className="block text-[11px] text-slate-500">My enquiries</span></span></button>
            </div>
            <p className="mt-7 text-center text-xs text-slate-400">Secure access for your admissions team</p>
          </div>
        </div>
      </section>
    </main>
  );
};
