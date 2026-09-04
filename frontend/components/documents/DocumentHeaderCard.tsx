'use client';

import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
  Hash,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DocumentItem } from '@/types/document';

interface DocumentHeaderCardProps {
  document: DocumentItem;
}

const getFileTypeIcon = (fileType: string) => {
  switch (fileType?.toUpperCase()) {
    case 'PDF':
      return <FileText className="h-6 w-6 text-red-400" />;
    case 'DOCX':
      return <FileText className="h-6 w-6 text-sky-400" />;
    case 'XLSX':
      return <FileSpreadsheet className="h-6 w-6 text-emerald-400" />;
    case 'CSV':
      return <FileCode className="h-6 w-6 text-amber-400" />;
    default:
      return <File className="h-6 w-6 text-slate-400" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const DocumentHeaderCard: React.FC<DocumentHeaderCardProps> = ({ document }) => {
  // Determine status steps based on document status
  const isParsed = document.status === 'PARSED' || document.status === 'INDEXED';
  const isIndexed = document.status === 'INDEXED' || document.status === 'PARSED';
  const isPending = document.status === 'PENDING';
  const isProcessing = document.status === 'PROCESSING';
  const isFailed = document.status === 'FAILED';

  const pipelineSteps = [
    { label: 'Ingestion', completed: !isPending && !isFailed, active: isPending },
    { label: 'Parsing', completed: isParsed, active: isProcessing },
    { label: 'Chunking', completed: isParsed, active: false },
    { label: 'Metric Normalization', completed: isParsed, active: false },
    { label: 'Vector Indexing', completed: isIndexed, active: false },
  ];

  return (
    <Card className="space-y-6">
      {/* Primary Document Metadata Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 shrink-0">
            {getFileTypeIcon(document.file_type)}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight font-sans">
                {document.filename}
              </h2>
              <Badge variant={isFailed ? 'danger' : isPending || isProcessing ? 'warning' : 'success'}>
                {document.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-0.5">
              <span className="flex items-center gap-1 text-slate-200">
                <Database className="h-3.5 w-3.5 text-gold-400" />
                {document.subsidiary || 'CIL HQ'}
              </span>
              <span>•</span>
              <span className="text-gold-400 font-semibold">{document.fiscal_year || '2023-24'}</span>
              <span>•</span>
              <span>{document.total_pages || 1} Pages</span>
              <span>•</span>
              <span>{formatFileSize(document.file_size_bytes)}</span>
            </div>
          </div>
        </div>

        {/* File Hash Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-xs font-mono text-slate-400 shrink-0">
          <Hash className="h-3.5 w-3.5 text-slate-500" />
          <span>SHA-256:</span>
          <span className="text-slate-300 select-all" title={document.file_hash}>
            {document.file_hash ? document.file_hash.substring(0, 18) : 'N/A'}...
          </span>
        </div>
      </div>

      {/* Document Processing Pipeline Stepper */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gold-400" />
          <span>Document Processing Pipeline Traceability</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {pipelineSteps.map((step, idx) => {
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  step.completed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : step.active
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                    : isFailed
                    ? 'bg-red-950/20 border-red-500/20 text-slate-500'
                    : 'bg-navy-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <span className="font-medium text-[11px] truncate">{step.label}</span>
                {step.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : step.active ? (
                  <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-spin" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-slate-700 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Failure Alert Banner */}
      {isFailed && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-red-300">Processing Interrupted:</span>
            <p className="text-slate-300">{document.error_message || 'The document processing pipeline encountered an error. Please try re-uploading the file.'}</p>
          </div>
        </div>
      )}
    </Card>
  );
};
