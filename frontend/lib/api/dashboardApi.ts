import { apiClient } from './client';
import {
  DashboardKpis,
  DashboardChartsResponse,
  ValidationFeedItem,
  WordCloudItem,
} from '@/types/dashboard';

export const dashboardApi = {
  getKpis: async (): Promise<DashboardKpis> => {
    const response = await apiClient.get<DashboardKpis>('/dashboard/kpis');
    return response.data;
  },
  getCharts: async (): Promise<DashboardChartsResponse> => {
    const response = await apiClient.get<DashboardChartsResponse>('/dashboard/charts');
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
