import { apiClient } from './client';

export interface PaginationInfo {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface MineSummary {
  mine_id: string;
  mine_name: string;
  canonical_name: string;
  company_name: string;
  parent_company?: string;
  subsidiary_name?: string;
  state: string;
  district?: string;
  block?: string;
  coalfield?: string;
  coal_or_lignite?: string;
  commodity?: string;
  mine_type?: string;
  mining_method?: string;
  sector?: string;
  ownership_type?: string;
  captive_or_commercial?: string;
  operational_status: string;
  production_status?: string;
  financial_year?: string;
  verification_status?: string;
  data_origin: string;
  production_mt?: number;
  target_mt?: number;
  achievement_percent?: number;
  latest_production_mt?: number;
  latest_target_mt?: number;
  latest_achievement_percent?: number;
  latest_fiscal_year?: string;
  period_type?: string;
  data_status?: string;
  star_rating?: number;
  source_id?: string;
  source_document?: string;
  source_url?: string;
  production_fy24_25?: number;
  production_fy25_26?: number;
  production_fy26_27_ytd?: number;
  yoy_growth_percent?: number;
}

export interface MineListEnvelope {
  data: MineSummary[];
  pagination: PaginationInfo;
  filters: Record<string, any>;
}

export interface DimensionCountItem {
  name: string;
  count: number;
  code?: string;
}

export interface MineYearlyMetric {
  id?: number;
  mine_id: string;
  financial_year: string;
  period_type: string;
  data_status: string;
  production_mt?: number;
  production_target_mt?: number;
  production_achievement_percent?: number;
  dispatch_mt?: number;
  dispatch_target_mt?: number;
  dispatch_achievement_percent?: number;
  coal_grade?: string;
  mine_type?: string;
  mining_method?: string;
  operational_status?: string;
  production_status?: string;
  star_rating?: number;
  star_rating_category?: string;
  obr_mcum?: number;
  manpower?: number;
  employment?: number;
  as_of_date?: string;
  source_id: string;
  source_document?: string;
  source_url?: string;
  source_page?: number;
  source_table?: string;
  source_published_date?: string;
  verification_status: string;
  quality_status?: string;
  data_origin: string;
}

export interface MineMonthlyMetric {
  id?: number;
  mine_id: string;
  financial_year: string;
  month: string;
  period_type: string;
  production_mt?: number;
  dispatch_mt?: number;
  target_mt?: number;
  achievement_percent?: number;
  data_status: string;
  as_of_date?: string;
  source_id: string;
  source_document?: string;
  source_url?: string;
}

export interface DataSourceItem {
  source_id: string;
  organization: string;
  document_title: string;
  document_type: string;
  publication_date?: string;
  financial_year: string;
  url?: string;
  page_number?: number;
  table_number?: string;
  chapter?: string;
  section_name?: string;
  source_priority: number;
  verification_status: string;
}

export interface MineDetail {
  mine_id: string;
  mine_name: string;
  normalized_mine_name: string;
  original_mine_name?: string;
  company_name: string;
  parent_company?: string;
  subsidiary_name?: string;
  state: string;
  district?: string;
  block?: string;
  block_name?: string;
  coalfield?: string;
  coal_or_lignite: string;
  commodity?: string;
  mine_type?: string;
  mining_method?: string;
  sector?: string;
  ownership_type?: string;
  allocation_type?: string;
  end_use?: string;
  operational_status: string;
  production_status?: string;
  mine_opening_permission?: string;
  captive_or_commercial?: string;
  financial_year?: string;
  source_id?: string;
  source_document?: string;
  source_url?: string;
  source_page?: number;
  source_table?: string;
  source_chapter?: string;
  source_publication_date?: string;
  retrieved_at?: string;
  last_verified_at?: string;
  verification_status?: string;
  data_origin?: string;
  yearly_metrics: MineYearlyMetric[];
  monthly_metrics: MineMonthlyMetric[];
  aliases: string[];
  provenance_sources: DataSourceItem[];
}

export interface MineDetailEnvelope {
  mine: MineDetail;
  current_metrics?: MineYearlyMetric;
  historical_metrics: MineYearlyMetric[];
  aliases: string[];
  sources: DataSourceItem[];
  conflicts: DataConflictRecordItem[];
}

export interface MineHistoryEnvelope {
  mine_id: string;
  history: MineYearlyMetric[];
}

export interface MineFiltersOptionsResponse {
  financial_year: string;
  states: string[];
  ownership_types: string[];
  sectors: string[];
  commodities: string[];
  operational_statuses: string[];
  companies: string[];
}

export interface MineYearsResponse {
  available_years: string[];
  default_year: string;
  current_reporting_year: string;
}

export interface MineAnalyticsResponse {
  financial_year: string;
  total_mines: number;
  total_production_mt: number;
  total_target_mt?: number;
  achievement_percent?: number;
  by_ownership: Record<string, number>;
  by_state: Record<string, number>;
  by_sector: Record<string, number>;
  star_rating_distribution: Record<string, number>;
}

export interface MineTrendPoint {
  financial_year: string;
  total_mines: number;
  production_mt: number;
  target_mt?: number;
  achievement_percent?: number;
  growth_percent?: number;
}

export interface MineAnalyticsTrendResponse {
  series: MineTrendPoint[];
}

export interface CoalBlockItem {
  coal_block_id: string;
  coal_block_name: string;
  normalized_name?: string;
  mine_name?: string;
  mine_id?: string;
  allottee: string;
  company: string;
  company_name?: string;
  state: string;
  district?: string;
  allocation_method?: string;
  allocation_date?: string;
  end_use?: string;
  sale_of_coal?: string;
  production_status?: string;
  operational_status?: string;
  captive_or_commercial?: string;
  production_mt?: number;
  target_production_mt?: number;
  peak_rated_capacity_mtpa?: number;
  financial_year?: string;
  source_id: string;
}

export interface CoalBlockSummaryResponse {
  financial_year: string;
  total_allocated_blocks: number;
  operational_blocks: number;
  total_production_mt: number;
  target_production_mt?: number;
  auctioned_blocks: number;
  allotted_blocks: number;
}

export interface CoalBlocksEnvelope {
  data: CoalBlockItem[];
  pagination: PaginationInfo;
  summary: CoalBlockSummaryResponse;
  filters: Record<string, any>;
}

export interface CoalBlockTrendPoint {
  financial_year: string;
  operational_blocks: number;
  production_mt: number;
  target_mt?: number;
  growth_percent?: number;
  period_type: string;
  data_status: string;
  source_document: string;
}

export interface CoalBlockTrendResponse {
  trend: CoalBlockTrendPoint[];
}

export interface SourcesResponse {
  total_sources: number;
  sources: DataSourceItem[];
}

export interface CoverageItem {
  source_id: string;
  organization: string;
  document_title: string;
  financial_year: string;
  observation_count: number;
  granularity: string;
  metrics: string[];
}

export interface CoverageResponse {
  financial_year: string;
  national_benchmarks: Record<string, any>;
  source_coverage: CoverageItem[];
}

export interface CoverageSourceResponse {
  source: DataSourceItem;
  total_observations: number;
  metrics_covered: string[];
  entities_count: number;
}

export interface DataConflictRecordItem {
  conflict_id: number;
  entity_type: string;
  entity_id: string;
  metric: string;
  financial_year: string;
  source_a: string;
  value_a: number;
  source_b: string;
  value_b: number;
  difference: number;
  difference_percent: number;
  possible_reason: string;
  resolution_status: string;
  resolved_value?: number;
  resolution_method?: string;
}

export interface DataValidationResultItem {
  id: number;
  validation_type: string;
  entity_id: string;
  financial_year: string;
  calculated_value: number;
  reported_value: number;
  variance: number;
  variance_percent: number;
  status: string;
  notes?: string;
}

export interface ReconciliationResponse {
  financial_year: string;
  results: DataValidationResultItem[];
  conflicts: DataConflictRecordItem[];
}

export interface ReconciliationSummaryResponse {
  financial_year: string;
  passed: number;
  warning: number;
  failed: number;
  open_conflicts: number;
  resolved_conflicts: number;
}

export interface MinesSummaryStats {
  total_canonical_mines: number;
  total_coal_blocks: number;
  authoritative_sources_count: number;
  cross_document_conflicts_count: number;
  validation_checks_count: number;
  coverage?: {
    total_canonical_records: number;
    states_covered: number;
    districts_covered: number;
    companies_count: number;
    subsidiaries_count: number;
    coal_mines_count: number;
    lignite_mines_count: number;
    producing_mines_count: number;
    non_producing_mines_count: number;
    records_with_source_citations: number;
    records_missing_key_fields: number;
  };
  breakdowns?: {
    by_state: Record<string, number>;
    by_subsidiary: Record<string, number>;
    by_type: Record<string, number>;
    by_sector: Record<string, number>;
    by_status: Record<string, number>;
    by_fuel: Record<string, number>;
  };
  major_mines_production: {
    fy_2024_25_mt: number;
    fy_2025_26_mt: number;
    fy_2026_27_ytd_mt: number;
    as_of_date: string;
    period_type_26_27: string;
    data_status_26_27: string;
  };
  national_benchmarks: {
    fy_2024_25_all_india_mt: number;
    fy_2024_25_captive_commercial_mt: number;
    fy_2025_26_captive_commercial_mt: number;
    source_authority: string;
  };
}

export interface MineFilterParams {
  financial_year?: string;
  fiscal_year?: string;
  subsidiary?: string;
  company?: string;
  state?: string;
  district?: string;
  mine_type?: string;
  sector?: string;
  ownership_type?: string;
  ownership?: string;
  commodity?: string;
  coal_or_lignite?: string;
  status?: string;
  operational_status?: string;
  captive_or_commercial?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
  skip?: number;
  limit?: number;
}

export interface MinesListResult {
  items: MineSummary[];
  total: number;
}

export const minesApi = {
  // Contract Envelope for /mines
  getMinesEnvelope: async (params?: MineFilterParams): Promise<MineListEnvelope> => {
    const res = await apiClient.get<MineListEnvelope>('/mines', { params });
    return res.data;
  },

  // Legacy/Flexible getMines
  getMines: async (params?: MineFilterParams): Promise<MineSummary[]> => {
    const res = await apiClient.get<any>('/mines', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  getMinesWithCount: async (params?: MineFilterParams): Promise<MinesListResult> => {
    const res = await apiClient.get<any>('/mines', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return {
        items: res.data.data,
        total: res.data.pagination?.total_records ?? res.data.data.length,
      };
    }
    const total = parseInt(res.headers['x-total-count'] || '0', 10) || (Array.isArray(res.data) ? res.data.length : 0);
    return { items: Array.isArray(res.data) ? res.data : [], total };
  },

  getMineYears: async (): Promise<MineYearsResponse> => {
    const res = await apiClient.get<MineYearsResponse>('/mines/years');
    return res.data;
  },

  getMineFilters: async (financialYear?: string): Promise<MineFiltersOptionsResponse> => {
    const res = await apiClient.get<MineFiltersOptionsResponse>('/mines/filters', {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getMineAnalytics: async (financialYear?: string): Promise<MineAnalyticsResponse> => {
    const res = await apiClient.get<MineAnalyticsResponse>('/mines/analytics', {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getMineAnalyticsTrend: async (): Promise<MineAnalyticsTrendResponse> => {
    const res = await apiClient.get<MineAnalyticsTrendResponse>('/mines/analytics/trend');
    return res.data;
  },

  getMineDetails: async (mineId: string, financialYear?: string): Promise<MineDetail> => {
    const res = await apiClient.get<any>(`/mines/${encodeURIComponent(mineId)}`, {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    if (res.data && res.data.mine) {
      return {
        ...res.data.mine,
        yearly_metrics: res.data.historical_metrics || [],
        monthly_metrics: [],
        aliases: res.data.aliases || [],
        provenance_sources: res.data.sources || [],
      };
    }
    return res.data;
  },

  getMineDetailEnvelope: async (mineId: string, financialYear?: string): Promise<MineDetailEnvelope> => {
    const res = await apiClient.get<MineDetailEnvelope>(`/mines/${encodeURIComponent(mineId)}`, {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getMineHistory: async (mineId: string): Promise<MineHistoryEnvelope> => {
    const res = await apiClient.get<MineHistoryEnvelope>(`/mines/${encodeURIComponent(mineId)}/history`);
    return res.data;
  },

  getCoalBlocksEnvelope: async (params?: any): Promise<CoalBlocksEnvelope> => {
    const res = await apiClient.get<CoalBlocksEnvelope>('/coal-blocks', { params });
    return res.data;
  },

  getCoalBlocksSummary: async (financialYear?: string): Promise<CoalBlockSummaryResponse> => {
    const res = await apiClient.get<CoalBlockSummaryResponse>('/coal-blocks/summary', {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getCoalBlocksTrend: async (): Promise<CoalBlockTrendResponse> => {
    const res = await apiClient.get<CoalBlockTrendResponse>('/coal-blocks/trend');
    return res.data;
  },

  getCoalBlocks: async (params?: { search?: string; state?: string; allocation_status?: string; financial_year?: string }): Promise<CoalBlockItem[]> => {
    const res = await apiClient.get<any>('/coal-blocks', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  getSources: async (): Promise<SourcesResponse> => {
    const res = await apiClient.get<SourcesResponse>('/sources');
    return res.data;
  },

  getDataSources: async (): Promise<DataSourceItem[]> => {
    const res = await apiClient.get<any>('/sources');
    if (res.data && Array.isArray(res.data.sources)) {
      return res.data.sources;
    }
    const legacyRes = await apiClient.get<DataSourceItem[]>('/data-sources');
    return legacyRes.data;
  },

  getCoverage: async (financialYear?: string): Promise<CoverageResponse> => {
    const res = await apiClient.get<CoverageResponse>('/coverage', {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getCoverageSource: async (sourceId: string): Promise<CoverageSourceResponse> => {
    const res = await apiClient.get<CoverageSourceResponse>(`/coverage/source/${encodeURIComponent(sourceId)}`);
    return res.data;
  },

  getReconciliation: async (financialYear?: string): Promise<ReconciliationResponse> => {
    const res = await apiClient.get<ReconciliationResponse>('/reconciliation', {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getReconciliationSummary: async (financialYear?: string): Promise<ReconciliationSummaryResponse> => {
    const res = await apiClient.get<ReconciliationSummaryResponse>('/reconciliation/summary', {
      params: financialYear ? { financial_year: financialYear } : undefined,
    });
    return res.data;
  },

  getStats: async (): Promise<MinesSummaryStats> => {
    const res = await apiClient.get<MinesSummaryStats>('/mines/stats');
    return res.data;
  },

  getStates: async (): Promise<DimensionCountItem[]> => {
    const res = await apiClient.get<DimensionCountItem[]>('/mines/states');
    return res.data;
  },

  getSubsidiaries: async (): Promise<DimensionCountItem[]> => {
    const res = await apiClient.get<DimensionCountItem[]>('/mines/subsidiaries');
    return res.data;
  },

  getSectors: async (): Promise<DimensionCountItem[]> => {
    const res = await apiClient.get<DimensionCountItem[]>('/mines/sectors');
    return res.data;
  },

  getMineTypes: async (): Promise<DimensionCountItem[]> => {
    const res = await apiClient.get<DimensionCountItem[]>('/mines/types');
    return res.data;
  },

  getCompanies: async (): Promise<DimensionCountItem[]> => {
    const res = await apiClient.get<DimensionCountItem[]>('/mines/companies');
    return res.data;
  },

  getDataConflicts: async (resolutionStatus?: string): Promise<DataConflictRecordItem[]> => {
    const res = await apiClient.get<DataConflictRecordItem[]>('/data-conflicts', {
      params: resolutionStatus ? { resolution_status: resolutionStatus } : undefined,
    });
    return res.data;
  },

  getDataValidations: async (statusFilter?: string): Promise<DataValidationResultItem[]> => {
    const res = await apiClient.get<DataValidationResultItem[]>('/data-validations', {
      params: statusFilter ? { status_filter: statusFilter } : undefined,
    });
    return res.data;
  },

  getMinesSummaryStats: async (): Promise<MinesSummaryStats> => {
    const res = await apiClient.get<MinesSummaryStats>('/mines-summary-stats');
    return res.data;
  },
};
