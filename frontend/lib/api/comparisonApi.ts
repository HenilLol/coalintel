import { apiClient } from './client';

export interface ComparisonSourceItem {
  metric_id: number;
  document_id: number;
  filename: string;
  subsidiary: string;
  mine_name: string;
  metric_name: string;
  fiscal_year: string;
  raw_value: number;
  raw_unit: string;
  standard_value: number;
  standard_unit: string;
  page_number: number;
  snippet: string;
  chunk_id: number | null;
  is_seeded_demo: boolean;
  provenance_label: string;
}

export interface ComparisonMatrixItem {
  entity: string;
  metric_name: string;
  fiscal_year: string;
  source_count: number;
  sources: ComparisonSourceItem[];
  units_compatible: boolean;
  variance_percentage: number;
  status: 'CONSISTENT' | 'DISCREPANCY DETECTED';
  has_discrepancy: boolean;
  is_seeded_demo: boolean;
  provenance_notice: string;
}

export interface ComparisonMatrixResponse {
  target_metric: string;
  target_domain: string;
  target_fiscal_year: string;
  subsidiary_scope: string;
  total_entities_compared: number;
  matrices: ComparisonMatrixItem[];
}

export interface ComparisonOptionsResponse {
  subsidiaries: string[];
  entities: string[];
  metrics: string[];
  fiscal_years: string[];
}

export async function fetchComparisonOptions(): Promise<ComparisonOptionsResponse> {
  const response = await apiClient.get<ComparisonOptionsResponse>('/comparison/options');
  return response.data;
}

export async function fetchComparisonMatrix(params: {
  metric_name: string;
  fiscal_year?: string;
  entity_filter?: string;
  subsidiary_filter?: string;
}): Promise<ComparisonMatrixResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('metric_name', params.metric_name);
  if (params.fiscal_year) queryParams.append('fiscal_year', params.fiscal_year);
  if (params.entity_filter) queryParams.append('entity_filter', params.entity_filter);
  if (params.subsidiary_filter) queryParams.append('subsidiary_filter', params.subsidiary_filter);

  const response = await apiClient.get<ComparisonMatrixResponse>(`/comparison/matrix?${queryParams.toString()}`);
  return response.data;
}
