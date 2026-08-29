import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  MessageSquareQuote,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Analyst', 'Reviewer', 'Viewer'] },
    { label: 'Document Library', path: '/documents', icon: FileText, roles: ['Admin', 'Analyst', 'Reviewer', 'Viewer'] },
    { label: 'Ask COALINTEL', path: '/query', icon: MessageSquareQuote, roles: ['Admin', 'Analyst', 'Reviewer', 'Viewer'] },
    { label: 'Analytics & Cloud', path: '/analytics', icon: BarChart3, roles: ['Admin', 'Analyst', 'Reviewer', 'Viewer'] },
    { label: 'Validation Feed', path: '/validation', icon: CheckCircle2, roles: ['Admin', 'Analyst', 'Reviewer'] },
    { label: 'Conflict Resolver', path: '/conflicts', icon: AlertTriangle, roles: ['Admin', 'Reviewer'] },
    { label: 'Report Wizard', path: '/reports', icon: FileSpreadsheet, roles: ['Admin', 'Analyst', 'Reviewer'] },
    { label: 'Audit Trail', path: '/audit', icon: ShieldCheck, roles: ['Admin'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/50">
        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wider">COALINTEL</h1>
          <p className="text-[10px] text-amber-400 font-medium tracking-tight">CIL / CMPDI Intelligence</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Main Navigation
        </div>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Status: <strong className="text-emerald-400 font-medium">Online</strong></span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">SIH26023 • Day 2 Baseline Shell</p>
      </div>
    </aside>
  );
};
