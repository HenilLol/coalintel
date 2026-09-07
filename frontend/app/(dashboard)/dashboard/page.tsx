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
import { dashboardApi } from '@/lib/api/dashboardApi';
import { DashboardKpis, ProductionSeriesItem, ValidationFeedItem } from '@/types/dashboard';
import { useScope } from '@/context/ScopeContext';
import { Upload, FileText, Activity, ArrowRight, Database } from 'lucide-react';

export default function DashboardPage() {
  const { selectedSubsidiary, setSelectedSubsidiary, selectedFiscalYear, setSelectedFiscalYear } = useScope();
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [productionData, setProductionData] = useState<ProductionSeriesItem[]>([]);
  const [validationItems, setValidationItems] = useState<ValidationFeedItem[]>([]);

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
        title="Executive Mining Intelligence Dashboard"
        description="Unified operational insights, unit-normalized production metrics, arithmetic validation, and cross-document discrepancy tracking across CIL subsidiaries."
        breadcrumbs={[{ label: 'Executive Dashboard' }]}
        badge={<Badge variant="amber">V2 Live Platform</Badge>}
        actions={
          <Link href="/documents">
            <Button variant="primary" leftIcon={<Upload className="h-4 w-4" />}>
              Ingest Mining Document
            </Button>
          </Link>
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

      {/* KPI Overview Grid with visual hierarchy */}
      <section aria-label="Key Performance Indicators">
        <KpiGrid kpis={kpis} loading={isLoading} isApiConnected={isApiConnected} />
      </section>

      {/* Charts & Validation Feed Grid */}
      <section aria-label="Production Charts and Validation Feed" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <ProductionChart
          data={productionData}
          loading={isLoading}
          isApiConnected={isApiConnected}
        />
        <ValidationFeedWidget items={validationItems} loading={isLoading} />
      </section>

      {/* Recent Ingestion & Evidence Activity Stream */}
      <section aria-label="Recent Ingestion Stream">
        <Card className="border-[#30383D] bg-[#1C2226]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <Activity className="h-5 w-5 text-[#C58B3A]" />
                <span>Recent Ingestion & Evidence Traceability Stream</span>
              </CardTitle>
              <Link
                href="/documents"
                className="text-xs text-[#C58B3A] hover:text-[#D6A052] font-mono flex items-center gap-1 transition-colors"
              >
                <span>View Full Repository</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>
              Audit stream of recently ingested documents, parsed vector chunks, and extracted mining metrics across CIL subsidiaries.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-[#30383D]">
              <div className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#242C30]/50 rounded-lg transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#C58B3A]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#E8ECEB] block font-sans">ECL_Annual_Report_2023-24.pdf</span>
                    <span className="text-[#9BA5A8] text-[11px] font-mono">84 Pages • PDF • SHA-256 Verified • ECL</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">PARSED & INDEXED</Badge>
              </div>

              <div className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#242C30]/50 rounded-lg transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#C94B45]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#E8ECEB] block font-sans">BCCL_Production_Audit_Q4.pdf</span>
                    <span className="text-[#9BA5A8] text-[11px] font-mono">42 Pages • PDF • SHA-256 Verified • BCCL</span>
                  </div>
                </div>
                <Badge variant="danger" size="sm">DISCREPANCY DETECTED</Badge>
              </div>

              <div className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#242C30]/50 rounded-lg transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#4F8A62]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#E8ECEB] block font-sans">MCL_Samaleswari_Performance.xlsx</span>
                    <span className="text-[#9BA5A8] text-[11px] font-mono">12 Pages • XLSX • SHA-256 Verified • MCL</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">PARSED & INDEXED</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
