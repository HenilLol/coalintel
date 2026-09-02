import { apiClient } from './client';

export interface ReportGeneratePayload {
  report_type: string;
  fiscal_year?: string;
  subsidiary?: string;
  title?: string;
}

export interface ReportItem {
  id: number;
  title: string;
  report_type: string;
  subsidiary?: string | null;
  fiscal_year?: string | null;
  file_path: string;
  approval_status: string;
  created_by?: number | null;
  created_at?: string | null;
}

export interface ReportListParams {
  subsidiary_filter?: string;
  approval_status_filter?: string;
}

export const reportApi = {
  generateReport: async (payload: ReportGeneratePayload): Promise<ReportItem> => {
    const response = await apiClient.post<ReportItem>('/reports/generate', payload);
    return response.data;
  },

  getReports: async (params?: ReportListParams): Promise<ReportItem[]> => {
    const response = await apiClient.get<ReportItem[]>('/reports', {
      params: {
        subsidiary_filter: params?.subsidiary_filter && params.subsidiary_filter !== 'ALL' ? params.subsidiary_filter : undefined,
        approval_status_filter: params?.approval_status_filter,
      },
    });
    return response.data;
  },

  approveReport: async (id: number): Promise<ReportItem> => {
    const response = await apiClient.post<ReportItem>(`/reports/${id}/approve`);
    return response.data;
  },

  getDownloadUrl: (id: number): string => {
    const baseURL = apiClient.defaults.baseURL || '/api/v1';
    return `${baseURL}/reports/${id}/download`;
  },

  downloadReport: async (id: number, filename?: string): Promise<void> => {
    const response = await apiClient.get<Blob>(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `Report_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
