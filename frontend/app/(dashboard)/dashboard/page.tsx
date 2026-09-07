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
import { Upload, FileText, Sparkles, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

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

      {/* KPI Overview Grid */}
      <KpiGrid kpis={kpis} loading={isLoading} isApiConnected={isApiConnected} />

      {/* Charts & Validation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProductionChart
          data={productionData}
          loading={isLoading}
          isApiConnected={isApiConnected}
        />
        <ValidationFeedWidget items={validationItems} loading={isLoading} />
      </div>

      {/* Recent Ingestion & Evidence Activity Stream */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Activity className="h-5 w-5 text-[#18B6B2]" />
              <span>Recent Ingestion & Evidence Traceability Stream</span>
            </CardTitle>
            <Link href="/documents" className="text-xs text-[#18B6B2] hover:text-[#35D3CE] font-mono">
              View Repository →
            </Link>
          </div>
          <CardDescription>
            Audit stream of recently ingested documents, parsed vector chunks, and extracted mining metrics.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-[#2C3D49]">
            <div className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#20313D] border border-[#2C3D49] text-[#18B6B2]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-[#F1F5F7] block">ECL_Annual_Report_2023-24.pdf</span>
                  <span className="text-[#9EADB7] text-[11px]">84 Pages • PDF • SHA-256 Verified • ECL</span>
                </div>
              </div>
              <Badge variant="success" size="sm">PARSED & INDEXED</Badge>
            </div>

            <div className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#20313D] border border-[#2C3D49] text-[#F05B5B]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-[#F1F5F7] block">BCCL_Production_Audit_Q4.pdf</span>
                  <span className="text-[#9EADB7] text-[11px]">42 Pages • PDF • SHA-256 Verified • BCCL</span>
                </div>
              </div>
              <Badge variant="danger" size="sm">CONFLICT DISCOVERED</Badge>
            </div>

            <div className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#20313D] border border-[#2C3D49] text-[#39B978]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-[#F1F5F7] block">MCL_Samaleswari_Performance.xlsx</span>
                  <span className="text-[#9EADB7] text-[11px]">12 Pages • XLSX • SHA-256 Verified • MCL</span>
                </div>
              </div>
              <Badge variant="success" size="sm">PARSED & INDEXED</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
