export interface DocumentItem {
  id: number;
  filename: string;
  file_path: string;
  file_hash: string;
  file_type: 'PDF' | 'DOCX' | 'XLSX' | 'CSV';
  file_size_bytes: number;
  subsidiary: string | null;
  fiscal_year: string | null;
  status: 'PENDING' | 'PROCESSING' | 'PARSED' | 'INDEXED' | 'FAILED';
  total_pages: number;
  uploaded_by: number | null;
  error_message: string | null;
  created_at: string;
}

export interface ExtractedMetricItem {
  id: number;
  document_id: number;
  page_number: number | null;
  mine_name: string;
  subsidiary: string | null;
  metric_name: string;
  numeric_value: number;
  unit: string;
  raw_unit: string | null;
  standard_value: number | null;
  standard_unit: string | null;
  fiscal_year: string;
  confidence_score: number | null;
  validation_status: string;
  raw_snippet: string | null;
  created_at: string;
}
