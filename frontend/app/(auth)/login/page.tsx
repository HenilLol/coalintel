'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { authApi } from '@/lib/api/authApi';
import { ShieldCheck, Lock, User, Sparkles, Database, FileSpreadsheet, Pickaxe } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your authorized username and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await authApi.login(username, password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('coalintel_token', data.access_token);
        localStorage.setItem('coalintel_user', JSON.stringify(data.user));
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const detail =
        err.response?.data?.detail || 'Authentication failed. Invalid username or password.';
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      {/* Background Visual Storytelling Grid & Radial Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-900 via-coal-950 to-navy-950 opacity-90" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Left Column: Institutional Brand & Operational Storytelling (Desktop) */}
      <div className="relative flex-1 flex flex-col justify-between p-8 lg:p-16 z-10 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <div>
          <Logo size="lg" />

          <div className="mt-12 space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SIH26023 Enterprise Platform</span>
            </div>

            <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-slate-100 font-sans leading-tight">
              AI-Powered Evidence-Driven <span className="text-gold-500">Mining Intelligence</span> & Reporting
            </h1>

            <p className="text-sm lg:text-base text-slate-400 leading-relaxed">
              Automated geological and production document processing, unit-normalized extraction,
              arithmetic validation, and institutional parliamentary report generation for Coal India Limited and CMPDI.
            </p>
          </div>
        </div>

        {/* Operational Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
            <div className="p-2 rounded-lg bg-navy-800 text-gold-400 w-fit">
              <Database className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-slate-200">Structured Data Mining</h4>
            <p className="text-[11px] text-slate-400">Automated extraction from PDF, DOCX, XLSX annual reports.</p>
          </div>

          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
            <div className="p-2 rounded-lg bg-navy-800 text-emerald-400 w-fit">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-slate-200">Validation & Grounding</h4>
            <p className="text-[11px] text-slate-400">5% arithmetic checks & 1% cross-document conflict detection.</p>
          </div>

          <div className="p-4 rounded-xl bg-navy-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
            <div className="p-2 rounded-lg bg-navy-800 text-sky-400 w-fit">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-slate-200">ReportLab Wizard</h4>
            <p className="text-[11px] text-slate-400">Instant PDF synthesis for Ministry & CIL HQ disclosures.</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-xs text-slate-500 font-mono">
          Ministry of Coal • Coal India Limited (CIL) • CMPDI Technical Platform
        </div>
      </div>

      {/* Right Column: Authentication Panel */}
      <div className="relative flex-1 flex items-center justify-center p-6 lg:p-16 z-10">
        <div className="w-full max-w-md space-y-8 p-8 rounded-2xl bg-navy-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">Sign in to Platform</h2>
            <p className="text-xs text-slate-400">
              Enter your authorized operational credentials to access COALINTEL V2.
            </p>
          </div>

          {error && <ErrorState message={error} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username or Email"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User className="h-4 w-4 text-slate-400" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
              required
            />

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded bg-navy-950 border-slate-700 text-gold-500 focus:ring-gold-500"
                />
                <span>Remember session</span>
              </label>

              <span className="text-slate-500 cursor-not-allowed" title="Contact System Administrator for credentials">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Authenticate & Access Platform
            </Button>
          </form>

          {/* Future-Ready Architecture Notice */}
          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
            <span>New subsidiary user? </span>
            <span className="text-gold-400 font-semibold cursor-not-allowed" title="Account provisioning is managed by CIL HQ System Administrators">
              Request Access from Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
