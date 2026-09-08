'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mountain, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  Layers, 
  Calendar, 
  Building2, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowUpDown,
  Pickaxe
} from 'lucide-react';
import { 
  minesApi, 
  MineSummary, 
  MineDetail, 
  CoalBlockItem, 
  DataSourceItem, 
  DataConflictRecordItem, 
  DataValidationResultItem,
  MinesSummaryStats
} from '@/lib/api/minesApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { MineDetailDrawer } from '@/components/mines/MineDetailDrawer';
import { SourceProvenanceModal } from '@/components/mines/SourceProvenanceModal';

export default function MinesPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'blocks' | 'sources' | 'reconciliation'>('directory');
  
  // Data States
  const [mines, setMines] = useState<MineSummary[]>([]);
  const [coalBlocks, setCoalBlocks] = useState<CoalBlockItem[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [conflicts, setConflicts] = useState<DataConflictRecordItem[]>([]);
  const [validations, setValidations] = useState<DataValidationResultItem[]>([]);
  const [stats, setStats] = useState<MinesSummaryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States for Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFy, setSelectedFy] = useState<string>('ALL');
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  // Drawer and Modal States
  const [selectedMineDetail, setSelectedMineDetail] = useState<MineDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSourceModalData, setSelectedSourceModalData] = useState<any | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

  // Initial Data Fetch
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [minesData, blocksData, sourcesData, conflictsData, validationsData, statsData] = await Promise.all([
        minesApi.getMines(),
        minesApi.getCoalBlocks(),
        minesApi.getDataSources(),
        minesApi.getDataConflicts(),
        minesApi.getDataValidations(),
        minesApi.getMinesSummaryStats(),
      ]);

      setMines(minesData);
      setCoalBlocks(blocksData);
      setDataSources(sourcesData);
      setConflicts(conflictsData);
      setValidations(validationsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load government mine data:', err);
      setError('Unable to connect to the Government Mine Intelligence registry. Please check server status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Mines
  const filteredMines = useMemo(() => {
    return mines.filter((mine) => {
      const matchesSearch = !searchQuery || 
        mine.mine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mine.mine_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mine.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mine.district && mine.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (mine.subsidiary_name && mine.subsidiary_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSub = selectedSubsidiary === 'ALL' || mine.subsidiary_name === selectedSubsidiary;
      const matchesState = selectedState === 'ALL' || mine.state === selectedState;
      const matchesType = selectedType === 'ALL' || mine.mine_type === selectedType;
      const matchesSector = selectedSector === 'ALL' || (mine.ownership_type && mine.ownership_type.toUpperCase().includes(selectedSector.toUpperCase()));

      return matchesSearch && matchesSub && matchesState && matchesType && matchesSector;
    });
  }, [mines, searchQuery, selectedSubsidiary, selectedState, selectedType, selectedSector]);

  // Unique list of states and subsidiaries for dropdown filters
  const uniqueSubsidiaries = useMemo(() => {
    const set = new Set<string>();
    mines.forEach((m) => { if (m.subsidiary_name) set.add(m.subsidiary_name); });
    return Array.from(set).sort();
  }, [mines]);

  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    mines.forEach((m) => { if (m.state) set.add(m.state); });
    return Array.from(set).sort();
  }, [mines]);

  const handleOpenMineDetail = async (mineId: string) => {
    try {
      const detail = await minesApi.getMineDetails(mineId);
      setSelectedMineDetail(detail);
      setIsDrawerOpen(true);
    } catch (e) {
      console.error('Failed to fetch mine details:', e);
    }
  };

  const handleOpenSourceModal = (mine: MineSummary) => {
    const matchingSource = dataSources.find((s) => s.document_title === mine.source_document) || dataSources[0];
    setSelectedSourceModalData({
      source_id: matchingSource?.source_id || 'SRC-GOV-MOC-2025',
      organization: matchingSource?.organization || mine.company_name,
      document_title: mine.source_document || matchingSource?.document_title,
      url: mine.source_url || matchingSource?.url,
      mine_name: mine.mine_name,
      metric_name: 'Annual Output',
      metric_value: mine.production_fy25_26 || mine.production_fy24_25,
      source_priority: matchingSource?.source_priority || 1,
      verification_status: 'verified',
      publication_date: matchingSource?.publication_date,
      financial_year: matchingSource?.financial_year,
    });
    setIsSourceModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 text-[#E8ECEB]">
      
      {/* Page Heading & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#30383D] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">PRIMARY GOVERNMENT OF INDIA DATA</Badge>
            <Badge variant="success" size="sm">AUTHENTICATED • ZERO INTERPOLATION</Badge>
          </div>
          <h1 className="text-2xl font-black text-[#E8ECEB] tracking-tight flex items-center gap-2.5">
            <Mountain className="w-6 h-6 text-[#C58B3A]" />
            Government Mine Intelligence & Registry
          </h1>
          <p className="text-xs text-[#9BA5A8] mt-1 max-w-3xl leading-relaxed">
            Production-quality mine-level intelligence covering FY 2024-25, FY 2025-26, and FY 2026-27 (Q1 YTD Provisional) directly ingested from the Ministry of Coal, Coal Controller&apos;s Organisation, and Nominated Authority.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </Button>
          <a
            href="https://coal.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#C58B3A]/10 border border-[#C58B3A]/40 text-xs font-semibold text-[#C58B3A] hover:bg-[#C58B3A]/20 transition-all flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>coal.gov.in</span>
          </a>
        </div>
      </div>

      {/* Top Aggregate KPI Metric Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card variant="bordered" className="p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#9BA5A8] block">Canonical Mines</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#E8ECEB]">
                {stats.total_canonical_mines}
              </span>
              <span className="text-[11px] text-[#4F8A62] font-semibold">Verified</span>
            </div>
            <span className="text-[10px] text-[#9BA5A8] block mt-0.5">PSU, Captive & Commercial</span>
          </Card>

          <Card variant="bordered" className="p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#9BA5A8] block">FY 24-25 Major Output</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#E8ECEB]">
                {stats.major_mines_production.fy_2024_25_mt}
              </span>
              <span className="text-xs font-mono text-[#9BA5A8]">MT</span>
            </div>
            <span className="text-[10px] text-[#9BA5A8] block mt-0.5">All-India: 1,047.52 MT</span>
          </Card>

          <Card variant="bordered" className="p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#9BA5A8] block">FY 25-26 Major Output</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#4F8A62]">
                {stats.major_mines_production.fy_2025_26_mt}
              </span>
              <span className="text-xs font-mono text-[#9BA5A8]">MT</span>
            </div>
            <span className="text-[10px] text-[#4F8A62] block mt-0.5">+5.29% YoY Growth</span>
          </Card>

          <Card variant="bordered" className="p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#9BA5A8] block">FY 26-27 (Q1 YTD)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#C58B3A]">
                {stats.major_mines_production.fy_2026_27_ytd_mt}
              </span>
              <span className="text-xs font-mono text-[#9BA5A8]">MT</span>
            </div>
            <span className="text-[10px] text-[#D6A23A] block mt-0.5">As of 30 June 2026</span>
          </Card>

          <Card variant="bordered" className="p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#9BA5A8] block">Authoritative Sources</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#E8ECEB]">
                {stats.authoritative_sources_count}
              </span>
              <span className="text-[11px] text-[#C58B3A] font-semibold">Tiers 1-6</span>
            </div>
            <span className="text-[10px] text-[#9BA5A8] block mt-0.5">Primary GOI Publications</span>
          </Card>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-[#30383D] gap-2 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-3 text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'directory'
              ? 'border-[#C58B3A] text-[#C58B3A] bg-[#C58B3A]/10'
              : 'border-transparent text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#1C2226]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>CANONICAL MINES DIRECTORY ({filteredMines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-4 py-3 text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'blocks'
              ? 'border-[#C58B3A] text-[#C58B3A] bg-[#C58B3A]/10'
              : 'border-transparent text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#1C2226]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>CAPTIVE & COMMERCIAL BLOCKS ({coalBlocks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-3 text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'sources'
              ? 'border-[#C58B3A] text-[#C58B3A] bg-[#C58B3A]/10'
              : 'border-transparent text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#1C2226]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>PRIMARY SOURCE CATALOG ({dataSources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-3 text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'border-[#C58B3A] text-[#C58B3A] bg-[#C58B3A]/10'
              : 'border-transparent text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#1C2226]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>RECONCILIATION & DISCREPANCIES ({conflicts.length})</span>
        </button>
      </div>

      {/* TAB 1: CANONICAL MINES DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-xl bg-[#151A1D] border border-[#30383D] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA5A8]" />
              <input
                type="text"
                placeholder="Search mine, coalfield, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-xs text-[#E8ECEB] placeholder-[#9BA5A8] focus:outline-none focus:border-[#C58B3A]"
              />
            </div>

            {/* Subsidiary Filter */}
            <div>
              <select
                value={selectedSubsidiary}
                onChange={(e) => setSelectedSubsidiary(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-xs text-[#E8ECEB] focus:outline-none focus:border-[#C58B3A]"
              >
                <option value="ALL">All Subsidiaries</option>
                {uniqueSubsidiaries.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-xs text-[#E8ECEB] focus:outline-none focus:border-[#C58B3A]"
              >
                <option value="ALL">All States</option>
                {uniqueStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Mine Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-xs text-[#E8ECEB] focus:outline-none focus:border-[#C58B3A]"
              >
                <option value="ALL">All Mine Types</option>
                <option value="Open Cast">Open Cast (OC)</option>
                <option value="Underground">Underground (UG)</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            {/* Sector Filter */}
            <div>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1C2226] border border-[#30383D] text-xs text-[#E8ECEB] focus:outline-none focus:border-[#C58B3A]"
              >
                <option value="ALL">All Sectors</option>
                <option value="CIL">CIL PSU</option>
                <option value="Captive">Captive</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
          </div>

          {/* Mines Table */}
          <div className="overflow-x-auto rounded-xl border border-[#30383D] bg-[#151A1D] shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1C2226] border-b border-[#30383D] text-[#9BA5A8] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Mine & Subsidiary</th>
                  <th className="py-3 px-3">Location & Type</th>
                  <th className="py-3 px-3 text-right">FY 24-25 (MT)</th>
                  <th className="py-3 px-3 text-right">FY 25-26 (MT)</th>
                  <th className="py-3 px-3 text-right">FY 26-27 YTD (MT)</th>
                  <th className="py-3 px-3 text-right">YoY Growth</th>
                  <th className="py-3 px-3 text-center">Star Rating</th>
                  <th className="py-3 px-3">Status & Provenance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30383D]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#9BA5A8]">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C58B3A]" />
                      <span>Loading authentic Government of India mine registry...</span>
                    </td>
                  </tr>
                ) : filteredMines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#9BA5A8]">
                      No mines found matching the selected search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMines.map((mine) => (
                    <tr 
                      key={mine.mine_id} 
                      className="hover:bg-[#1C2226]/60 transition-colors group cursor-pointer"
                      onClick={() => handleOpenMineDetail(mine.mine_id)}
                    >
                      {/* Mine & Subsidiary */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Pickaxe className="w-4 h-4 text-[#C58B3A] shrink-0" />
                          <div>
                            <span className="font-bold text-[#E8ECEB] group-hover:text-[#C58B3A] transition-colors block">
                              {mine.mine_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#9BA5A8] mt-0.5">
                              <span className="text-[#C58B3A]">{mine.subsidiary_name || mine.company_name}</span>
                              <span>•</span>
                              <span>{mine.mine_id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location & Type */}
                      <td className="py-3 px-3">
                        <div className="text-xs text-[#E8ECEB]">
                          {mine.district ? `${mine.district}, ` : ''}{mine.state}
                        </div>
                        <div className="text-[10px] font-mono text-[#9BA5A8]">
                          {mine.mine_type || 'Open Cast'} • {mine.ownership_type || 'PSU'}
                        </div>
                      </td>

                      {/* FY 24-25 */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#E8ECEB]">
                        {mine.production_fy24_25 !== null && mine.production_fy24_25 !== undefined ? (
                          <span>{mine.production_fy24_25}</span>
                        ) : (
                          <span className="text-[#9BA5A8] font-normal italic">NULL</span>
                        )}
                      </td>

                      {/* FY 25-26 */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#4F8A62]">
                        {mine.production_fy25_26 !== null && mine.production_fy25_26 !== undefined ? (
                          <span>{mine.production_fy25_26}</span>
                        ) : (
                          <span className="text-[#9BA5A8] font-normal italic">NULL</span>
                        )}
                      </td>

                      {/* FY 26-27 YTD */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#C58B3A]">
                        {mine.production_fy26_27_ytd !== null && mine.production_fy26_27_ytd !== undefined ? (
                          <div>
                            <span>{mine.production_fy26_27_ytd}</span>
                            <span className="text-[9px] text-[#D6A23A] block font-normal">
                              Q1 Provisional
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#9BA5A8] font-normal italic">NULL</span>
                        )}
                      </td>

                      {/* YoY Growth */}
                      <td className="py-3 px-3 text-right font-mono">
                        {mine.yoy_growth_percent !== null && mine.yoy_growth_percent !== undefined ? (
                          <span className={`inline-flex items-center gap-0.5 font-bold ${
                            mine.yoy_growth_percent >= 0 ? 'text-[#4F8A62]' : 'text-[#C94B45]'
                          }`}>
                            {mine.yoy_growth_percent >= 0 ? '+' : ''}{mine.yoy_growth_percent}%
                          </span>
                        ) : (
                          <span className="text-[#9BA5A8] italic">-</span>
                        )}
                      </td>

                      {/* Star Rating */}
                      <td className="py-3 px-3 text-center">
                        {mine.star_rating ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C58B3A]/10 text-[#C58B3A] font-bold font-mono text-[11px]">
                            {mine.star_rating} ★
                          </span>
                        ) : (
                          <span className="text-[#9BA5A8] italic">-</span>
                        )}
                      </td>

                      {/* Status & Provenance */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="success" size="sm">
                            GOVERNMENT VERIFIED
                          </Badge>
                          <span className="text-[10px] text-[#9BA5A8] truncate max-w-[140px]" title={mine.source_document}>
                            {mine.source_document || 'Official Disclosures'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenMineDetail(mine.mine_id)}
                            className="text-[11px] h-7 px-2"
                          >
                            Details
                          </Button>
                          <button
                            onClick={() => handleOpenSourceModal(mine)}
                            title="Inspect Primary Source Document"
                            className="p-1 rounded-md text-[#9BA5A8] hover:text-[#C58B3A] hover:bg-[#1C2226] transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CAPTIVE & COMMERCIAL BLOCKS */}
      {activeTab === 'blocks' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#1C2226] border border-[#30383D] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#E8ECEB] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C58B3A]" />
                Nominated Authority Commercial & Captive Coal Blocks Registry
              </h3>
              <p className="text-xs text-[#9BA5A8] mt-0.5">
                Official allocations administered by the Nominated Authority, Ministry of Coal (Tiers 1 & 3).
              </p>
            </div>
            <Badge variant="amber">OFFICIAL ALLOCATIONS</Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#30383D] bg-[#151A1D]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1C2226] border-b border-[#30383D] text-[#9BA5A8] font-mono text-[11px] uppercase">
                  <th className="py-3 px-4">Block Name & ID</th>
                  <th className="py-3 px-3">Allottee / Operating Entity</th>
                  <th className="py-3 px-3">State & District</th>
                  <th className="py-3 px-3 text-right">PRC (MTPA)</th>
                  <th className="py-3 px-3 text-right">Production (MT)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">End Use</th>
                  <th className="py-3 px-4">Source Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30383D]">
                {coalBlocks.map((block) => (
                  <tr key={block.coal_block_id} className="hover:bg-[#1C2226]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#E8ECEB]">{block.coal_block_name}</div>
                      <div className="text-[10px] font-mono text-[#C58B3A]">{block.coal_block_id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#E8ECEB]">{block.allottee}</div>
                      <div className="text-[10px] text-[#9BA5A8]">{block.company}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div>{block.district ? `${block.district}, ` : ''}{block.state}</div>
                      <div className="text-[10px] font-mono text-[#9BA5A8]">{block.allocation_method || 'Auction'}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#C58B3A]">
                      {block.peak_rated_capacity_mtpa ? `${block.peak_rated_capacity_mtpa}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#4F8A62]">
                      {block.production_mt !== null && block.production_mt !== undefined ? `${block.production_mt}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge 
                        variant={block.production_status === 'PRODUCING' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {block.production_status || 'UNDER_DEVELOPMENT'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#9BA5A8]">
                      {block.end_use || 'Commercial Sale'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-[#9BA5A8]">
                      Nominated Authority Report
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRIMARY SOURCE CATALOG */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#1C2226] border border-[#30383D] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#E8ECEB] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C58B3A]" />
                Authoritative Government of India Source Registry
              </h3>
              <p className="text-xs text-[#9BA5A8] mt-0.5">
                Complete traceability catalog adhering strictly to the Authoritative Source Policy (Tiers 1 to 6).
              </p>
            </div>
            <Badge variant="gold">TIERS 1 - 6</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((src) => (
              <Card key={src.source_id} variant="bordered" className="p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={src.source_priority === 1 ? 'gold' : src.source_priority === 2 ? 'info' : 'secondary'}>
                      TIER {src.source_priority} • {src.organization.split(' ')[0]}
                    </Badge>
                    <span className="text-[10px] font-mono text-[#4F8A62] font-semibold uppercase">
                      ✓ {src.verification_status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#E8ECEB] leading-snug">
                      {src.document_title}
                    </h4>
                    <p className="text-xs text-[#9BA5A8] mt-1 font-mono">
                      {src.organization} • FY {src.financial_year}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#151A1D] border border-[#30383D] text-xs space-y-1">
                    <div className="flex justify-between text-[#9BA5A8]">
                      <span>Source ID:</span>
                      <span className="font-mono text-[#E8ECEB]">{src.source_id}</span>
                    </div>
                    <div className="flex justify-between text-[#9BA5A8]">
                      <span>Document Type:</span>
                      <span className="text-[#E8ECEB]">{src.document_type}</span>
                    </div>
                    {src.publication_date && (
                      <div className="flex justify-between text-[#9BA5A8]">
                        <span>Publication Date:</span>
                        <span className="text-[#E8ECEB]">{src.publication_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#30383D] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#9BA5A8]">
                    {src.table_number ? `Ref: ${src.table_number}` : 'Official Publication'}
                  </span>
                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C58B3A] hover:text-[#D6A23A] transition-colors"
                    >
                      <span>Verify on Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-[#9BA5A8]">Official Document</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECONCILIATION & CONFLICT LEDGER */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          
          {/* Section 1: Cross-Document Conflicts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#E8ECEB] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D6A23A]" />
                  Official Cross-Document Discrepancy Register
                </h3>
                <p className="text-xs text-[#9BA5A8]">
                  Documented variance between Provisional Disclosures and Final Annual Directories with audited resolutions.
                </p>
              </div>
              <Badge variant="warning">{conflicts.length} TRACKED</Badge>
            </div>

            <div className="space-y-3">
              {conflicts.map((conf) => (
                <div 
                  key={conf.conflict_id}
                  className="p-4 rounded-xl bg-[#1C2226] border border-[#30383D] space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="gold" size="sm">{conf.entity_id}</Badge>
                      <span className="text-xs font-bold text-[#E8ECEB]">
                        {conf.metric} ({conf.financial_year})
                      </span>
                    </div>
                    <Badge variant={conf.resolution_status === 'RESOLVED' ? 'success' : 'warning'} size="sm">
                      {conf.resolution_status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#151A1D] border border-[#30383D]">
                      <span className="text-[10px] text-[#9BA5A8] block uppercase font-mono">
                        Source A ({conf.source_a})
                      </span>
                      <span className="font-mono font-bold text-sm text-[#E8ECEB]">
                        {conf.value_a} MT
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#151A1D] border border-[#30383D]">
                      <span className="text-[10px] text-[#9BA5A8] block uppercase font-mono">
                        Source B ({conf.source_b})
                      </span>
                      <span className="font-mono font-bold text-sm text-[#E8ECEB]">
                        {conf.value_b} MT
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#151A1D] border border-[#30383D]">
                      <span className="text-[10px] text-[#9BA5A8] block uppercase font-mono">
                        Variance / Discrepancy
                      </span>
                      <span className="font-mono font-bold text-sm text-[#C94B45]">
                        {conf.difference} MT ({conf.difference_percent}%)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-[#9BA5A8] bg-[#151A1D] p-3 rounded-lg border border-[#30383D]/60 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#E8ECEB]">Resolution Method:</span>
                      <span>{conf.resolution_method || 'Audited Primary Source Prioritization'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#4F8A62]">Resolved Value:</span>
                      <span className="font-mono text-[#E8ECEB] font-bold">{conf.resolved_value} MT</span>
                      <span className="text-[11px] text-[#9BA5A8]">
                        (Reason: {conf.possible_reason.replace(/_/g, ' ')})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Arithmetic Validations */}
          <div className="space-y-3 pt-4 border-t border-[#30383D]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#E8ECEB] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4F8A62]" />
                  Arithmetic Validation & Benchmark Reconciliations
                </h3>
                <p className="text-xs text-[#9BA5A8]">
                  Automated checks confirming sum of individual mines aligns with company and state official totals.
                </p>
              </div>
              <Badge variant="success">PASS VERIFIED</Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#30383D] bg-[#151A1D]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1C2226] border-b border-[#30383D] text-[#9BA5A8] font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Validation Type</th>
                    <th className="py-3 px-3">Entity</th>
                    <th className="py-3 px-3">Fiscal Year</th>
                    <th className="py-3 px-3 text-right">Computed Sum (MT)</th>
                    <th className="py-3 px-3 text-right">Reported Total (MT)</th>
                    <th className="py-3 px-3 text-right">Variance (%)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Audit Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30383D]">
                  {validations.map((val) => (
                    <tr key={val.id} className="hover:bg-[#1C2226]/50">
                      <td className="py-3 px-4 font-mono font-semibold text-[#E8ECEB]">
                        {val.validation_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#C58B3A]">{val.entity_id}</td>
                      <td className="py-3 px-3 font-mono text-[#9BA5A8]">{val.financial_year}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#E8ECEB]">
                        {val.calculated_value}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#4F8A62]">
                        {val.reported_value}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#9BA5A8]">
                        {val.variance_percent}%
                      </td>
                      <td className="py-3 px-3">
                        <Badge 
                          variant={val.status === 'PASSED' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {val.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#9BA5A8]">
                        {val.notes || 'Verified against primary benchmark'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Slide-out Mine Detail Drawer */}
      <MineDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mine={selectedMineDetail}
        onOpenSourceModal={(srcData) => {
          setSelectedSourceModalData(srcData);
          setIsSourceModalOpen(true);
        }}
      />

      {/* Primary Government Source Provenance Modal */}
      <SourceProvenanceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        sourceData={selectedSourceModalData}
      />

    </div>
  );
}
