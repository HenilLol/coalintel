'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  BarChart3,
  ShieldCheck,
  GitCompare,
  FileSpreadsheet,
  History,
  Landmark,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from '@/lib/constants';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userRole?: string;
  userName?: string;
  userSubsidiary?: string;
  onLogout?: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5 text-amber-500" />,
  Landmark: <Landmark className="h-5 w-5 text-amber-500" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  ShieldCheck: <ShieldCheck className="h-5 w-5" />,
  GitCompare: <GitCompare className="h-5 w-5" />,
  FileSpreadsheet: <FileSpreadsheet className="h-5 w-5" />,
  History: <History className="h-5 w-5" />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  userRole = 'Analyst',
  userName = 'CMPDI Analyst',
  userSubsidiary = 'CMPDI',
  onLogout,
}) => {
  const pathname = usePathname();

  // Filter navigation items by role permissions
  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-coal-900 border-r border-coal-800 text-slate-200 transition-all duration-300 h-screen sticky top-0 z-30 select-none shadow-2xl backdrop-blur-xl',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header & Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-coal-800">
        <Logo size={collapsed ? 'sm' : 'md'} showText={!collapsed} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg bg-coal-800 hover:bg-coal-700 border border-coal-700 text-slate-400 hover:text-slate-100 transition-colors hidden lg:flex"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        {!collapsed && (
          <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-slateText mb-2 font-semibold">
            Intelligence Modules
          </p>
        )}

        {filteredNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? 'bg-gradient-to-r from-amber-500/15 to-coal-800 text-amber-500 font-semibold border border-amber-500/30 shadow-glow-amber'
                  : 'text-slateText hover:text-slate-100 hover:bg-coal-800/80 hover:border-coal-700 border border-transparent'
              )}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={cn(
                  'shrink-0 transition-transform group-hover:scale-110',
                  isActive ? 'text-amber-500' : 'text-slateText group-hover:text-slate-200'
                )}
              >
                {iconMap[item.icon]}
              </div>

              {!collapsed && <span className="truncate">{item.label}</span>}

              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-amber-500 rounded-l-full shadow-glow-amber" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Section */}
      <div className="p-3 border-t border-coal-800 bg-coal-800/40">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-lg bg-coal-800 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-100 truncate">{userName}</span>
                <span className="text-[10px] font-mono text-amber-500 truncate uppercase">
                  {userRole} • {userSubsidiary}
                </span>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-slateText hover:text-danger hover:bg-danger/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
