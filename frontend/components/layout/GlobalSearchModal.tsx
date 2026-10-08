'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Mountain,
  FileText,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  GitCompare,
  ShieldCheck,
  X,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Mine' | 'Document' | 'Metric' | 'Report' | 'Topic' | 'Insight';
  href: string;
  badge?: string;
}

// Built-in canonical searchable index across all platform entities
const SEARCH_INDEX: SearchResultItem[] = [
  // Mines
  { id: 'm1', title: 'Gevra Expansion OCP', subtitle: 'SECL • Chhattisgarh • 52.5 MT Production', category: 'Mine', href: '/mines?search=Gevra', badge: 'SECL' },
  { id: 'm2', title: 'Kusmunda OCP', subtitle: 'SECL • Chhattisgarh • 43.2 MT Production', category: 'Mine', href: '/mines?search=Kusmunda', badge: 'SECL' },
  { id: 'm3', title: 'Rajmahal Opencast Mine', subtitle: 'ECL • Jharkhand • 17.8 MT Production', category: 'Mine', href: '/mines?search=Rajmahal', badge: 'ECL' },
  { id: 'm4', title: 'Samaleswari OCP', subtitle: 'MCL • Odisha • 14.85 MT Production', category: 'Mine', href: '/mines?search=Samaleswari', badge: 'MCL' },
  { id: 'm5', title: 'Nigahi Opencast Project', subtitle: 'NCL • Singrauli MP • 20.5 MT Production', category: 'Mine', href: '/mines?search=Nigahi', badge: 'NCL' },
  { id: 'm6', title: 'Moonidih Underground Mine', subtitle: 'BCCL • Jharia Coalfield • Prime Coking Coal', category: 'Mine', href: '/mines?search=Moonidih', badge: 'BCCL' },
  { id: 'm7', title: 'Amrapali OCP', subtitle: 'CCL • Jharkhand • North Karanpura Coalfield', category: 'Mine', href: '/mines?search=Amrapali', badge: 'CCL' },
  { id: 'm8', title: 'Penganga OCP', subtitle: 'WCL • Maharashtra • Wardha Valley Coalfield', category: 'Mine', href: '/mines?search=Penganga', badge: 'WCL' },

  // Documents
  { id: 'd1', title: 'ECL_Annual_Report_2023-24.pdf', subtitle: '84 Pages • Annual Audited Accounts • SHA-256 Verified', category: 'Document', href: '/documents', badge: 'PDF' },
  { id: 'd2', title: 'SECL_Operational_Review_FY24.pdf', subtitle: '112 Pages • Opencast Performance Summary', category: 'Document', href: '/documents', badge: 'PDF' },
  { id: 'd3', title: 'MCL_Samaleswari_Audit.xlsx', subtitle: '18 Sheets • Monthly Production & Dispatch Ledger', category: 'Document', href: '/documents', badge: 'XLSX' },
  { id: 'd4', title: 'CMPDI_Exploration_Vol_IV.pdf', subtitle: '240 Pages • Geological Reserves & Seam Borehole Logs', category: 'Document', href: '/documents', badge: 'CMPDI' },
  { id: 'd5', title: 'BCCL_Coking_Coal_Discrepancy_Audit.pdf', subtitle: '46 Pages • Cross-document reconciliation', category: 'Document', href: '/documents', badge: 'BCCL' },

  // Metrics
  { id: 'mt1', title: 'Coal Production (MT)', subtitle: 'Raw coal extraction across opencast & underground mines', category: 'Metric', href: '/comparison?metric=Coal+Production', badge: 'Metric' },
  { id: 'mt2', title: 'Overburden Removal (OBR)', subtitle: 'Volume in Million Cubic Meters (M.Cu.M)', category: 'Metric', href: '/comparison?metric=Overburden+Removal', badge: 'Metric' },
  { id: 'mt3', title: 'Coal Despatch & Offtake (MT)', subtitle: 'Dispatches to thermal power plants & steel washeries', category: 'Metric', href: '/comparison?metric=Coal+Dispatch', badge: 'Metric' },
  { id: 'mt4', title: 'Stripping Ratio (m³/Tonne)', subtitle: 'Ratio of excavation volume to extracted raw coal', category: 'Metric', href: '/comparison?metric=Stripping+Ratio', badge: 'Metric' },

  // Reports
  { id: 'r1', title: 'Parliamentary Starred Inquiry Reply Draft', subtitle: 'Ministry of Coal • Target vs Actual Production variance', category: 'Report', href: '/parliamentary', badge: 'Briefing' },
  { id: 'r2', title: 'Subsidiary Cross-Comparison Audit Summary', subtitle: 'Automated compilation across 8 CIL subsidiaries', category: 'Report', href: '/reports', badge: 'ReportLab' },
  { id: 'r3', title: 'Arithmetic Reconciliation Ledger FY24', subtitle: 'Opening Stock + Production - Dispatch = Closing Stock', category: 'Report', href: '/validation', badge: 'Audit' },

  // Topics
  { id: 't1', title: 'Overburden Removal & Stripping', subtitle: 'Statistical TF-IDF weight: 98 • 42 Document Mentions', category: 'Topic', href: '/analytics', badge: 'Topic' },
  { id: 't2', title: 'HEMM Heavy Equipment Availability', subtitle: 'Draglines, Shovels, Dumpers Fleet Utilization', category: 'Topic', href: '/analytics', badge: 'Topic' },
  { id: 't3', title: 'Environmental & Forestry Clearances', subtitle: 'MoEFCC statutory approvals & Stage II compliance', category: 'Topic', href: '/analytics', badge: 'Topic' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Mine: <Mountain className="h-4 w-4 text-[#C58B3A]" />,
  Document: <FileText className="h-4 w-4 text-[#3B82F6]" />,
  Metric: <BarChart3 className="h-4 w-4 text-[#10B981]" />,
  Report: <FileSpreadsheet className="h-4 w-4 text-[#F97316]" />,
  Topic: <Sparkles className="h-4 w-4 text-[#8B5CF6]" />,
  Insight: <GitCompare className="h-4 w-4 text-[#14B8A6]" />,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Gevra Expansion',
    'Opening Stock Reconciliation',
    'SECL Annual Report',
  ]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filtered results
  const filteredResults = useMemo(() => {
    let list = SEARCH_INDEX;

    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    if (!query.trim()) return list.slice(0, 8);

    const q = query.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query, selectedCategory]);

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredResults.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(filteredResults.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    // Save to recent
    setRecentSearches((prev) => {
      const updated = [item.title, ...prev.filter((t) => t !== item.title)].slice(0, 5);
      return updated;
    });
    onClose();
    router.push(item.href);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl bg-[#151A1D] border border-[#30383D] shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#30383D] bg-[#1C2226]">
          <Search className="h-5 w-5 text-[#C58B3A] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search mines, annual reports, metrics, parliamentary briefs..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-[#E8ECEB] placeholder-[#9BA5A8] focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-[#9BA5A8] hover:text-[#E8ECEB] mr-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-[#9BA5A8] bg-[#242C30] border border-[#30383D] rounded">
            ESC
          </kbd>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#30383D] bg-[#151A1D] overflow-x-auto text-xs font-mono">
          {['ALL', 'Mine', 'Document', 'Metric', 'Report', 'Topic'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#C58B3A]/20 text-[#C58B3A] border border-[#C58B3A]/40 font-bold'
                  : 'text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#1C2226]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#30383D]/60 p-2">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[#E8ECEB]">No matching intelligence entities found</p>
              <p className="text-xs text-[#9BA5A8]">
                Try searching for subsidiary names (e.g. &apos;SECL&apos;), metrics (e.g. &apos;OBR&apos;), or annual reports.
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isFocused = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    isFocused
                      ? 'bg-[#242C30] border border-[#C58B3A]/40 shadow-sm'
                      : 'hover:bg-[#1C2226] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-[#151A1D] border border-[#30383D] shrink-0">
                      {categoryIcons[item.category] || <Search className="h-4 w-4 text-[#C58B3A]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#E8ECEB] font-sans truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge variant="amber" size="sm" className="shrink-0 text-[9px] py-0 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9BA5A8] font-mono truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isFocused ? 'text-[#C58B3A] translate-x-0.5' : 'text-[#9BA5A8] opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Recent Searches and Keyboard Hints */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#1C2226] border-t border-[#30383D] text-[11px] font-mono text-[#9BA5A8]">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Navigate:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#242C30] border border-[#30383D]">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-[#242C30] border border-[#30383D]">↓</kbd>
            <span className="hidden sm:inline">Select:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#242C30] border border-[#30383D]">↵</kbd>
          </div>

          <div className="flex items-center gap-1">
            <span>CoalIntel SIH26023 Fast Index</span>
          </div>
        </div>
      </div>
    </div>
  );
};
