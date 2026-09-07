'use client';

import React from 'react';
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
  Sparkles: <Sparkles className="h-5 w-5 text-[#C58B3A]" />,
  Landmark: <Landmark className="h-5 w-5 text-[#54788A]" />,
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
        'relative flex flex-col bg-[#151A1D] border-r border-[#30383D] text-[#E8ECEB] transition-all duration-200 h-screen sticky top-0 z-30 select-none shadow-sm',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header & Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#30383D]">
        <Logo size={collapsed ? 'sm' : 'md'} showText={!collapsed} />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg bg-[#1C2226] hover:bg-[#242C30] border border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB] transition-colors hidden lg:flex"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        {!collapsed && (
          <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-[#9BA5A8] mb-2 font-semibold">
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
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 relative',
                isActive
                  ? 'bg-[#C58B3A]/15 text-[#C58B3A] font-semibold border border-[#C58B3A]/40'
                  : 'text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#1C2226] hover:border-[#30383D] border border-transparent'
              )}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-[#C58B3A]' : 'text-[#9BA5A8] group-hover:text-[#E8ECEB]'
                )}
              >
                {iconMap[item.icon]}
              </div>

              {!collapsed && <span className="truncate">{item.label}</span>}

              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C58B3A] rounded-l" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Section */}
      <div className="p-3 border-t border-[#30383D] bg-[#151A1D]">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-lg bg-[#1C2226] border border-[#30383D] flex items-center justify-center text-[#C58B3A] font-bold shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#E8ECEB] truncate">{userName}</span>
                <span className="text-[10px] font-mono text-[#9BA5A8] truncate uppercase">
                  {userRole} • {userSubsidiary}
                </span>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-[#9BA5A8] hover:text-[#C94B45] hover:bg-[#C94B45]/10 transition-colors"
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
