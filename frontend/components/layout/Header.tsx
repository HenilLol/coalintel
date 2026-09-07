'use client';

import React from 'react';
import { Menu, Bell, Shield, Database, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
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
    <header className="sticky top-0 z-20 h-16 bg-[#111B24]/95 backdrop-blur-md border-b border-[#2C3D49] px-4 lg:px-8 flex items-center justify-between shadow-lg">
      {/* Left: Mobile Toggle & Context Indicator */}
      <div className="flex items-center gap-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-lg bg-[#17232D] border border-[#2C3D49] text-[#9EADB7] hover:text-[#F1F5F7] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Global Operational Context Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#17232D] border border-[#2C3D49] text-xs font-mono shadow-sm">
          <Database className="h-3.5 w-3.5 text-[#18B6B2] shrink-0" />
          <span className="text-[#9EADB7]">Target Scope:</span>
          <select
            value={selectedSubsidiary}
            onChange={(e) => setSelectedSubsidiary(e.target.value)}
            className="bg-[#111B24] border border-[#2C3D49] text-[#35D3CE] font-bold rounded px-2 py-0.5 focus:outline-none focus:border-[#18B6B2] text-xs"
          >
            <option value="ALL CIL">ALL CIL (Corporate)</option>
            {CIL_SUBSIDIARIES.filter((s) => s.value !== 'ALL').map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.value}
              </option>
            ))}
          </select>
          <span className="text-[#2C3D49]">|</span>
          <span className="text-[#F2A900] font-semibold">{selectedFiscalYear}</span>
        </div>
      </div>

      {/* Center Search Affordance */}
      <div className="hidden md:flex w-72 lg:w-96">
        <Input
          placeholder="Search mining metrics, documents, mines..."
          leftIcon={<Search className="h-4 w-4 text-[#9EADB7]" />}
          className="bg-[#111B24] border-[#2C3D49] text-[#F1F5F7] placeholder:text-[#9EADB7]/70 text-xs py-2"
        />
      </div>

      {/* Right User & System Status */}
      <div className="flex items-center gap-3">
        <Badge variant="gold" size="sm" className="hidden lg:inline-flex gap-1 items-center">
          <Shield className="h-3 w-3" />
          <span>{userRole} Mode</span>
        </Badge>

        <button
          className="relative p-2 rounded-lg bg-[#17232D] border border-[#2C3D49] text-[#9EADB7] hover:text-[#F1F5F7] transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#18B6B2] shadow-glow-teal" />
        </button>

        <div className="h-8 w-px bg-[#2C3D49] mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#123C43] to-[#18B6B2] text-[#0B1117] font-extrabold flex items-center justify-center text-xs shadow-glow-teal">
            {userName ? userName.charAt(0) : 'U'}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#F1F5F7] leading-none">{userName}</span>
            <span className="text-[10px] text-[#9EADB7] font-mono mt-0.5">Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
