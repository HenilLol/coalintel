'use client';

import React from 'react';
import { Menu, Bell, Shield, Database, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useScope } from '@/context/ScopeContext';
import { CIL_SUBSIDIARIES } from '@/lib/constants';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  userName?: string;
  userRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileMenuToggle,
  userName = 'CMPDI Analyst',
  userRole = 'Analyst',
}) => {
  const { selectedSubsidiary, setSelectedSubsidiary, selectedFiscalYear } = useScope();

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#151A1D] border-b border-[#30383D] px-4 lg:px-8 flex items-center justify-between shadow-sm">
      {/* Left: Mobile Toggle, Mobile Branding & Context Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB] lg:hidden transition-colors shrink-0"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Mobile Header Branding */}
        <div className="lg:hidden flex items-center min-w-0">
          <Logo size="sm" showText={true} />
        </div>

        {/* Global Operational Context Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1C2226] border border-[#30383D] text-xs font-mono shadow-sm shrink-0">
          <Database className="h-3.5 w-3.5 text-[#C58B3A] shrink-0" />
          <span className="text-[#9BA5A8]">Scope:</span>
          <select
            value={selectedSubsidiary}
            onChange={(e) => setSelectedSubsidiary(e.target.value)}
            className="bg-[#151A1D] border border-[#30383D] text-[#E8ECEB] font-bold rounded-md px-2 py-0.5 focus:outline-none focus:border-[#C58B3A] text-xs transition-colors cursor-pointer"
            aria-label="Select Subsidiary Scope"
          >
            <option value="ALL CIL">ALL CIL (Corporate)</option>
            {CIL_SUBSIDIARIES.filter((s) => s.value !== 'ALL').map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.value}
              </option>
            ))}
          </select>
          <span className="text-[#30383D]">|</span>
          <span className="text-[#C58B3A] font-semibold">{selectedFiscalYear}</span>
        </div>
      </div>

      {/* Center Search Affordance */}
      <div className="hidden md:flex w-72 lg:w-96 relative items-center">
        <Input
          placeholder="Search mining metrics, documents, mines..."
          leftIcon={<Search className="h-4 w-4 text-[#9BA5A8]" />}
          className="bg-[#151A1D] border-[#30383D] text-[#E8ECEB] placeholder:text-[#9BA5A8]/70 text-xs py-2 pr-12 focus:border-[#C58B3A]"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block">
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#242C30] border border-[#30383D] text-[#9BA5A8]">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right User & System Status */}
      <div className="flex items-center gap-3">
        {/* System Health / Status Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#242C30]/50 border border-[#30383D] text-[11px] font-mono text-[#9BA5A8]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4F8A62] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F8A62]" />
          </span>
          <span>Live Platform</span>
        </div>

        <Badge variant="amber" size="sm" className="hidden lg:inline-flex gap-1 items-center">
          <Shield className="h-3 w-3" />
          <span>{userRole}</span>
        </Badge>

        <button
          className="relative p-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB] transition-colors"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C58B3A]" />
        </button>

        <div className="h-8 w-px bg-[#30383D] mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#242C30] border border-[#30383D] text-[#C58B3A] font-bold flex items-center justify-center text-xs">
            {userName ? userName.charAt(0) : 'U'}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#E8ECEB] leading-none">{userName}</span>
            <span className="text-[10px] text-[#9BA5A8] font-mono mt-0.5">Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
