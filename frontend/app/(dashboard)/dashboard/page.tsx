'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { ValidationFeedWidget } from '@/components/dashboard/ValidationFeedWidget';
import { DataPipeline3D } from '@/components/3d/DataPipeline3D';
import { GeologicalCrossSection3D } from '@/components/3d/GeologicalCrossSection3D';
import { dashboardApi } from '@/lib/api/dashboardApi';
import { DashboardKpis, ProductionSeriesItem, ValidationFeedItem } from '@/types/dashboard';
import { useScope } from '@/context/ScopeContext';
import {
  Upload,
  FileText,
  Activity,
  ArrowRight,
  Database,
  Mountain,
  Sparkles,
  BarChart3,
  Layers,
  GitCompare,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const { selectedSubsidiary, setSelectedSubsidiary, selectedFiscalYear, setSelectedFiscalYear } = useScope();
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [productionData, setProductionData] = useState<ProductionSeriesItem[]>([]);
  const [validationItems, setValidationItems] = useState<ValidationFeedItem[]>([]);
  const [activeCenterView, setActiveCenterView] = useState<'analytics' | 'geology'>('analytics');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, chartRes, feedRes] = await Promise.allSettled([
        dashboardApi.getKpis(),
        dashboardApi.getCharts(),
        dashboardApi.getValidationFeed(),
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        setKpis(kpiRes.value);
        setIsApiConnected(true);
      }

      if (chartRes.status === 'fulfilled' && chartRes.value?.production_data) {
        setProductionData(chartRes.value.production_data);
      }

      if (feedRes.status === 'fulfilled' && Array.isArray(feedRes.value)) {
        setValidationItems(feedRes.value);
      }
    } catch (error) {
      console.warn('Dashboard API fetch note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedSubsidiary, selectedFiscalYear]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="COALINTEL INTELLIGENCE CENTER"
        description="Unified operational telemetry, unit-normalized production intelligence, deterministic arithmetic verification, and real-time cross-document discrepancy tracking across CIL subsidiaries."
        breadcrumbs={[{ label: 'Intelligence Center' }]}
        badge={<Badge variant="amber">SIH26023 Live Command</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/mines">
              <Button variant="secondary" leftIcon={<Mountain className="h-4 w-4 text-[#C58B3A]" />}>
                Mines Intelligence
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="primary" leftIcon={<Upload className="h-4 w-4" />}>
                Ingest Document
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filter Scope Bar */}
      <FilterBar
        selectedSubsidiary={selectedSubsidiary}
        onSubsidiaryChange={setSelectedSubsidiary}
        selectedFiscalYear={selectedFiscalYear}
        onFiscalYearChange={setSelectedFiscalYear}
        onRefresh={fetchDashboardData}
        isLoading={isLoading}
      />

      {/* Top-Level 6 Intelligence Telemetry Cards */}
      <section aria-label="Key Performance Indicators">
        <KpiGrid kpis={kpis} loading={isLoading} isApiConnected={isApiConnected} />
      </section>

      {/* 3D Intelligence Flow Pipeline */}
      <section aria-label="3D Intelligence Lifecycle Pipeline">
        <DataPipeline3D />
      </section>

      {/* Center View Selector & Analytics/Geology Workspace */}
      <div className="flex items-center justify-between border-b border-[#30383D] pb-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCenterView('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeCenterView === 'analytics'
                ? 'bg-[#C58B3A]/20 border border-[#C58B3A] text-[#E8ECEB] font-bold shadow-glow-amber'
                : 'text-[#9BA5A8] hover:text-[#E8ECEB] bg-[#1C2226]'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-[#C58B3A]" />
            <span>Production & Despatch Analytics</span>
          </button>

          <button
            onClick={() => setActiveCenterView('geology')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeCenterView === 'geology'
                ? 'bg-[#14B8A6]/20 border border-[#14B8A6] text-[#E8ECEB] font-bold shadow-glow-teal'
                : 'text-[#9BA5A8] hover:text-[#E8ECEB] bg-[#1C2226]'
            }`}
          >
            <Mountain className="h-4 w-4 text-[#14B8A6]" />
            <span>3D Geological Strata Model</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#9BA5A8]">
          <Clock className="h-3.5 w-3.5 text-[#C58B3A]" />
          <span>Real-Time Stream Active</span>
        </div>
      </div>

      {/* Main Workspace: Active Center View + Validation Feed Widget */}
      <section aria-label="Analytics and Validation Center" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          {activeCenterView === 'analytics' ? (
            <ProductionChart
              data={productionData}
              loading={isLoading}
              isApiConnected={isApiConnected}
            />
          ) : (
            <GeologicalCrossSection3D />
          )}
        </div>

        <div className="lg:col-span-1">
          <ValidationFeedWidget items={validationItems} loading={isLoading} />
        </div>
      </section>

      {/* LIVE INTELLIGENCE FEED TIMELINE */}
      <section aria-label="Live Intelligence Feed Stream">
        <Card className="border-[#30383D] bg-[#1C2226]">
          <CardHeader className="py-3.5 px-4 bg-[#151A1D] border-b border-[#30383D]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#E8ECEB] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#C58B3A] animate-pulse" />
                <span>Live Intelligence Feed & Event Ledger</span>
              </CardTitle>
              <Link
                href="/documents"
                className="text-xs text-[#C58B3A] hover:text-[#D6A052] font-mono flex items-center gap-1 transition-colors"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs text-[#9BA5A8]">
              Automated operational timeline tracking newly parsed vector chunks, arithmetic audits, and cross-document discrepancy flags.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Event 1 */}
              <div className="p-3 rounded-lg bg-[#151A1D] border border-[#30383D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#242C30] text-[#10B981] border border-[#30383D]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[#E8ECEB] font-bold block font-sans">
                      Rajmahal OCP Opening Stock Arithmetic Audit
                    </span>
                    <span className="text-[#9BA5A8] text-[11px]">
                      Formula: 4.2 MT + 17.8 MT - 18.1 MT = 3.9 MT (Variance: 0.0%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" size="sm">VALIDATED</Badge>
                  <span className="text-[10px] text-[#9BA5A8]">2 mins ago</span>
                </div>
              </div>

              {/* Event 2 */}
              <div className="p-3 rounded-lg bg-[#151A1D] border border-[#30383D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#242C30] text-[#EF4444] border border-[#30383D]">
                    <GitCompare className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[#E8ECEB] font-bold block font-sans">
                      BCCL Moonidih UG Cross-Document Discrepancy Flagged
                    </span>
                    <span className="text-[#9BA5A8] text-[11px]">
                      Annual Report (1.20 MT) vs Ministry Monthly Return (1.35 MT) • Delta: 12.5%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger" size="sm">CONFLICT DETECTED</Badge>
                  <span className="text-[10px] text-[#9BA5A8]">14 mins ago</span>
                </div>
              </div>

              {/* Event 3 */}
              <div className="p-3 rounded-lg bg-[#151A1D] border border-[#30383D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#242C30] text-[#3B82F6] border border-[#30383D]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[#E8ECEB] font-bold block font-sans">
                      SECL_Gevra_Operational_Review_FY24.pdf
                    </span>
                    <span className="text-[#9BA5A8] text-[11px]">
                      112 Pages Ingested • 480 Vector Chunks Indexed to ChromaDB
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">INDEXED</Badge>
                  <span className="text-[10px] text-[#9BA5A8]">42 mins ago</span>
                </div>
              </div>

              {/* Event 4 */}
              <div className="p-3 rounded-lg bg-[#151A1D] border border-[#30383D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#242C30] text-[#8B5CF6] border border-[#30383D]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[#E8ECEB] font-bold block font-sans">
                      Parliamentary Starred Reply #482 Draft Compiled
                    </span>
                    <span className="text-[#9BA5A8] text-[11px]">
                      Grounded citation synthesis generated with 6 verified page citations
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="amber" size="sm">INSIGHT GENERATED</Badge>
                  <span className="text-[10px] text-[#9BA5A8]">1 hr ago</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
