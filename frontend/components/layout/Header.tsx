'use client';

import React from 'react';
import { Menu, Bell, Shield, Database, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  selectedSubsidiary?: string;
  selectedFiscalYear?: string;
  userName?: string;
  userRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileMenuToggle,
  selectedSubsidiary = 'CIL HQ',
  selectedFiscalYear = '2023-24',
  userName = 'CMPDI Analyst',
  userRole = 'Analyst',
}) => {
  return (
    <header className="sticky top-0 z-20 h-16 bg-navy-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between shadow-sm">
      {/* Left: Mobile Toggle & Context Indicator */}
      <div className="flex items-center gap-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-lg bg-navy-900 border border-slate-800 text-slate-300 hover:text-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Global Operational Context Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-900/90 border border-slate-800 text-xs font-mono">
          <Database className="h-3.5 w-3.5 text-gold-400" />
          <span className="text-slate-400">Target:</span>
          <span className="text-slate-200 font-semibold">{selectedSubsidiary}</span>
          <span className="text-slate-600">|</span>
          <span className="text-gold-400 font-semibold">{selectedFiscalYear}</span>
        </div>
      </div>

      {/* Center Search Affordance */}
      <div className="hidden md:flex w-72 lg:w-96">
        <Input
          placeholder="Search mining metrics, documents, mines..."
          leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          className="bg-navy-900/60 border-slate-800/90 text-xs py-2"
        />
      </div>

      {/* Right User & System Status */}
      <div className="flex items-center gap-3">
        <Badge variant="gold" size="sm" className="hidden lg:inline-flex gap-1 items-center">
          <Shield className="h-3 w-3" />
          <span>{userRole} Mode</span>
        </Badge>

        <button
          className="relative p-2 rounded-lg bg-navy-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold-500 shadow-glow-gold" />
        </button>

        <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gold-600 to-amber-400 text-navy-950 font-extrabold flex items-center justify-center text-xs shadow-glow-gold">
            {userName ? userName.charAt(0) : 'U'}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200 leading-none">{userName}</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
