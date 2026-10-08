'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { documentApi } from '@/lib/api/documentApi';
import { DashboardKpis, ProductionSeriesItem, ValidationFeedItem } from '@/types/dashboard';
import { DocumentItem } from '@/types/document';
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
  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams = {
        subsidiary_filter: selectedSubsidiary,
        fiscal_year: selectedFiscalYear,
      };

      const [kpiRes, chartRes, feedRes, docRes] = await Promise.allSettled([
        dashboardApi.getKpis(filterParams),
        dashboardApi.getCharts(filterParams),
        dashboardApi.getValidationFeed(),
        documentApi.getDocuments({
          subsidiary_filter: selectedSubsidiary,
          limit: 5,
        }),
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

      if (docRes.status === 'fulfilled' && docRes.value?.items) {
        setRecentDocuments(docRes.value.items);
      }
    } catch (error) {
      console.warn('Dashboard API fetch note:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubsidiary, selectedFiscalYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

          <CardContent>
            <div className="divide-y divide-[#30383D]">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="py-3 px-2 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#242C30]" />
                      <div className="space-y-1">
                        <div className="h-4 w-48 bg-[#242C30] rounded" />
                        <div className="h-3 w-32 bg-[#242C30] rounded" />
                      </div>
                    </div>
                    <div className="h-5 w-24 bg-[#242C30] rounded" />
                  </div>
                ))
              ) : recentDocuments.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#9BA5A8] font-mono">
                  No recently ingested documents found in this scope. Ingest a document or select another subsidiary.
                </div>
              ) : (
                recentDocuments.map((doc) => {
                  const statusVariant =
                    doc.status === 'PARSED' || doc.status === 'INDEXED'
                      ? 'success'
                      : doc.status === 'FAILED'
                      ? 'danger'
                      : 'warning';

                  return (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#242C30]/50 rounded-lg transition-colors text-xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#C58B3A] group-hover:border-[#C58B3A]/40 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span
                            className="font-bold text-[#E8ECEB] group-hover:text-[#C58B3A] transition-colors block font-sans truncate max-w-xs sm:max-w-md"
                            title={doc.filename}
                          >
                            {doc.filename}
                          </span>
                          <span className="text-[#9BA5A8] text-[11px] font-mono truncate block">
                            {doc.total_pages || 1} Pages • {doc.file_type || 'PDF'} • SHA-256:{' '}
                            {doc.file_hash ? doc.file_hash.substring(0, 12) : 'N/A'}... • {doc.subsidiary || 'CIL HQ'}
                          </span>
                        </div>
                      </div>
                      <Badge variant={statusVariant} size="sm" className="shrink-0 self-start sm:self-center">
                        {doc.status}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
