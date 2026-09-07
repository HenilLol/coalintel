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
    <div className="min-h-screen bg-[#0B1117] flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      {/* Left Column: Institutional Brand & Operational Storytelling (Desktop) */}
      <div className="relative flex-1 flex flex-col justify-between p-8 lg:p-16 z-10 bg-[#111B24] border-b lg:border-b-0 lg:border-r border-[#2C3D49]">
        <div>
          <Logo size="lg" />

          <div className="mt-12 space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3A2C0A] border border-[#F2A900]/40 text-[#F2A900] text-xs font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SIH26023 Enterprise Platform</span>
            </div>

            <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-[#F1F5F7] font-sans leading-tight">
              AI-Powered Evidence-Driven <span className="text-[#18B6B2]">Mining Intelligence</span> & Reporting
            </h1>

            <p className="text-sm lg:text-base text-[#9EADB7] leading-relaxed">
              Automated geological and production document processing, unit-normalized extraction,
              arithmetic validation, and institutional parliamentary report generation for Coal India Limited and CMPDI.
            </p>
          </div>
        </div>

        {/* Operational Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="p-4 rounded-xl bg-[#17232D] border border-[#2C3D49] space-y-2">
            <div className="p-2 rounded-lg bg-[#20313D] text-[#18B6B2] w-fit">
              <Database className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-[#F1F5F7]">Structured Data Mining</h4>
            <p className="text-[11px] text-[#9EADB7]">Automated extraction from PDF, DOCX, XLSX annual reports.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#17232D] border border-[#2C3D49] space-y-2">
            <div className="p-2 rounded-lg bg-[#20313D] text-[#39B978] w-fit">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-[#F1F5F7]">Validation & Grounding</h4>
            <p className="text-[11px] text-[#9EADB7]">5% arithmetic checks & 1% cross-document conflict detection.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#17232D] border border-[#2C3D49] space-y-2">
            <div className="p-2 rounded-lg bg-[#20313D] text-[#F2A900] w-fit">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-semibold text-[#F1F5F7]">ReportLab Wizard</h4>
            <p className="text-[11px] text-[#9EADB7]">Instant PDF synthesis for Ministry & CIL HQ disclosures.</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#2C3D49] text-xs text-[#9EADB7] font-mono">
          Ministry of Coal • Coal India Limited (CIL) • CMPDI Technical Platform
        </div>
      </div>

      {/* Right Column: Authentication Panel */}
      <div className="relative flex-1 flex items-center justify-center p-6 lg:p-16 z-10 bg-[#0B1117]">
        <div className="w-full max-w-md space-y-8 p-8 rounded-2xl bg-[#17232D] border border-[#2C3D49] shadow-2xl">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-[#F1F5F7]">Sign in to Platform</h2>
            <p className="text-xs text-[#9EADB7]">
              Enter your authorized operational credentials to access COALINTEL V2.
            </p>
          </div>

          {error && <ErrorState message={error} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User className="h-4 w-4 text-[#9EADB7]" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4 text-[#9EADB7]" />}
              required
            />

            <div className="flex items-center justify-between text-xs text-[#9EADB7] pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded bg-[#111B24] border-[#2C3D49] text-[#18B6B2] focus:ring-[#18B6B2]"
                />
                <span>Remember session</span>
              </label>

              <span className="text-[#9EADB7] cursor-not-allowed" title="Contact System Administrator for credentials">
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
          <div className="pt-4 border-t border-[#2C3D49] text-center text-xs text-[#9EADB7]">
            <span>New subsidiary user? </span>
            <span className="text-[#18B6B2] hover:text-[#35D3CE] font-semibold cursor-not-allowed" title="Account provisioning is managed by CIL HQ System Administrators">
              Request Access from Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
