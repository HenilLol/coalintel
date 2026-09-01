'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CIL_SUBSIDIARIES } from '@/lib/constants';
import { DocumentItem, DocumentStatus } from '@/types/document';

interface DocumentTableProps {
  documents: DocumentItem[];
  loading?: boolean;
  onRefresh?: () => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedSubsidiary: string;
  onSubsidiaryChange: (subsidiary: string) => void;
}

const getFileTypeIcon = (fileType: string) => {
  switch (fileType?.toUpperCase()) {
    case 'PDF':
      return <FileText className="h-5 w-5 text-red-400" />;
    case 'DOCX':
      return <FileText className="h-5 w-5 text-sky-400" />;
    case 'XLSX':
      return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    case 'CSV':
      return <FileCode className="h-5 w-5 text-amber-400" />;
    default:
      return <File className="h-5 w-5 text-slate-400" />;
  }
};

const getStatusBadge = (status: DocumentStatus) => {
  switch (status) {
    case 'PARSED':
    case 'INDEXED':
      return <Badge variant="success">{status}</Badge>;
    case 'PROCESSING':
    case 'PENDING':
      return <Badge variant="warning">{status}</Badge>;
    case 'FAILED':
      return <Badge variant="danger">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  loading = false,
  onRefresh,
  selectedStatus,
  onStatusChange,
  selectedSubsidiary,
  onSubsidiaryChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const statusTabs = [
    { value: 'ALL', label: 'All Documents' },
    { value: 'PARSED', label: 'Parsed' },
    { value: 'INDEXED', label: 'Indexed' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'FAILED', label: 'Failed' },
  ];

  // Client-side search filtering
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        !searchTerm.trim() ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_hash.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [documents, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl bg-navy-900/80 border border-slate-800/90 shadow-card-dark">
        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by filename or SHA-256 hash..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            className="bg-navy-950/90 text-xs py-2"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedSubsidiary}
            onChange={(e) => {
              onSubsidiaryChange(e.target.value);
              setCurrentPage(1);
            }}
            options={CIL_SUBSIDIARIES}
            className="bg-navy-950/90 text-xs font-medium py-2 w-48"
          />

          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              isLoading={loading}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              onStatusChange(tab.value);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap select-none ${
              selectedStatus === tab.value
                ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 font-semibold shadow-glow-gold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document Data Table */}
      <div className="rounded-xl border border-slate-800/90 bg-navy-900/60 overflow-hidden shadow-card-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/90 bg-navy-950/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Document / File Type</th>
                <th className="py-3 px-4">Subsidiary / FY</th>
                <th className="py-3 px-4">Pages / Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ingested Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-4 w-48 bg-navy-800 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-navy-800 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-20 bg-navy-800 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-16 bg-navy-800 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-navy-800 rounded" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-6 w-20 bg-navy-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      title="No Documents Found"
                      description="No mining documents match your current filter parameters."
                    />
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-navy-800/40 transition-colors group">
                    {/* Filename & Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-navy-950 border border-slate-800 group-hover:border-slate-700 shrink-0">
                          {getFileTypeIcon(doc.file_type)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-slate-200 hover:text-gold-400 transition-colors truncate block max-w-xs sm:max-w-sm"
                            title={doc.filename}
                          >
                            {doc.filename}
                          </Link>
                          <span className="text-[10px] font-mono text-slate-500 truncate block max-w-xs">
                            SHA-256: {doc.file_hash ? doc.file_hash.substring(0, 16) : 'N/A'}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Subsidiary & FY */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="font-semibold block text-slate-200">{doc.subsidiary || 'CIL HQ'}</span>
                      <span className="text-[11px] text-gold-400">{doc.fiscal_year || '2023-24'}</span>
                    </td>

                    {/* Pages & Size */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="block">{doc.total_pages || 1} Pages</span>
                      <span className="text-[11px] text-slate-500">{formatFileSize(doc.file_size_bytes)}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(doc.status)}</td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/documents/${doc.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                        >
                          View Intelligence
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-800/80 bg-navy-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            Showing {filteredDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredDocuments.length)} of {filteredDocuments.length} documents
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 rounded-lg bg-navy-900 border border-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-1.5 rounded-lg bg-navy-900 border border-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
