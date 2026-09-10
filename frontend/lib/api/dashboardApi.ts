import { apiClient } from './client';
import {
  DashboardKpis,
  DashboardChartsResponse,
  ValidationFeedItem,
  WordCloudItem,
} from '@/types/dashboard';

export interface DashboardFilterParams {
  fiscal_year?: string;
  subsidiary_filter?: string;
}

export const dashboardApi = {
  getKpis: async (params?: DashboardFilterParams): Promise<DashboardKpis> => {
    const response = await apiClient.get<DashboardKpis>('/dashboard/kpis', {
      params: {
        fiscal_year: params?.fiscal_year || undefined,
        subsidiary_filter:
          params?.subsidiary_filter &&
          params.subsidiary_filter !== 'ALL' &&
          params.subsidiary_filter !== 'ALL CIL'
            ? params.subsidiary_filter
            : undefined,
      },
    });
    return response.data;
  },
  getCharts: async (params?: DashboardFilterParams): Promise<DashboardChartsResponse> => {
    const response = await apiClient.get<DashboardChartsResponse>('/dashboard/charts', {
      params: {
        fiscal_year: params?.fiscal_year || undefined,
        subsidiary_filter:
          params?.subsidiary_filter &&
          params.subsidiary_filter !== 'ALL' &&
          params.subsidiary_filter !== 'ALL CIL'
            ? params.subsidiary_filter
            : undefined,
      },
    });
    return response.data;
  },
  getValidationFeed: async (): Promise<ValidationFeedItem[]> => {
    const response = await apiClient.get<ValidationFeedItem[]>('/validation/feed');
    return response.data;
  },
  getWordCloud: async (): Promise<WordCloudItem[]> => {
    const response = await apiClient.get<WordCloudItem[]>('/analytics/wordcloud');
    return response.data;
  },
};
