'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CIL_SUBSIDIARIES } from '@/lib/constants';
import { documentApi } from '@/lib/api/documentApi';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pageSize = 10;

  // Detect Admin role on mount from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('coalintel_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setIsAdmin(user?.role === 'Admin');
        } catch (e) {
          setIsAdmin(false);
        }
      }
    }
  }, []);

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

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await documentApi.deleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete document.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#17232D] border border-[#2C3D49] shadow-lg">
        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by filename or SHA-256 hash..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="h-4 w-4 text-[#9EADB7]" />}
            className="bg-[#111B24] border-[#2C3D49] text-[#F1F5F7] text-xs py-2"
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
            className="bg-[#111B24] border-[#2C3D49] text-[#F1F5F7] text-xs font-medium py-2 w-48"
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#2C3D49]">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              onStatusChange(tab.value);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap select-none ${
              selectedStatus === tab.value
                ? 'bg-[#123C43] text-[#35D3CE] border border-[#18B6B2]/40 font-semibold shadow-glow-teal'
                : 'text-[#9EADB7] hover:text-[#F1F5F7] hover:bg-[#20313D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document Data Table */}
      <div className="rounded-xl border border-[#2C3D49] bg-[#17232D] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2C3D49] bg-[#20313D] text-[11px] font-mono text-[#F1F5F7] uppercase tracking-wider">
                <th className="py-3 px-4">Document / File Type</th>
                <th className="py-3 px-4">Subsidiary / FY</th>
                <th className="py-3 px-4">Pages / Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ingested Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#2C3D49] text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-4 w-48 bg-[#20313D] rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-[#20313D] rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-20 bg-[#20313D] rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-16 bg-[#20313D] rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-[#20313D] rounded" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-6 w-20 bg-[#20313D] rounded ml-auto" />
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
                  <tr key={doc.id} className="hover:bg-[#20313D]/50 transition-colors group">
                    {/* Filename & Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#20313D] border border-[#2C3D49] group-hover:border-[#18B6B2]/40 shrink-0">
                          {getFileTypeIcon(doc.file_type)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-[#F1F5F7] hover:text-[#35D3CE] transition-colors truncate block max-w-xs sm:max-w-sm"
                            title={doc.filename}
                          >
                            {doc.filename}
                          </Link>
                          <span className="text-[10px] font-mono text-[#9EADB7] truncate block max-w-xs">
                            SHA-256: {doc.file_hash ? doc.file_hash.substring(0, 16) : 'N/A'}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Subsidiary & FY */}
                    <td className="py-3.5 px-4 font-mono text-[#9EADB7]">
                      <span className="font-semibold block text-[#F1F5F7]">{doc.subsidiary || 'CIL HQ'}</span>
                      <span className="text-[11px] text-[#F2A900] font-semibold">{doc.fiscal_year || '2023-24'}</span>
                    </td>

                    {/* Pages & Size */}
                    <td className="py-3.5 px-4 font-mono text-[#9EADB7]">
                      <span className="block text-[#F1F5F7]">{doc.total_pages || 1} Pages</span>
                      <span className="text-[11px] text-[#9EADB7]">{formatFileSize(doc.file_size_bytes)}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(doc.status)}</td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[#9EADB7] font-mono text-[11px]">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/documents/${doc.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                          >
                            View Intelligence
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteError(null);
                              setDocumentToDelete(doc);
                            }}
                            className="text-[#F05B5B] hover:text-[#F05B5B] hover:bg-[#F05B5B]/10 border border-transparent hover:border-[#F05B5B]/30"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-[#2C3D49] bg-[#111B24] flex items-center justify-between text-xs font-mono text-[#9EADB7]">
          <span>
            Showing {filteredDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredDocuments.length)} of {filteredDocuments.length} documents
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 rounded-lg bg-[#20313D] border border-[#2C3D49] text-[#F1F5F7] hover:bg-[#2C3D49] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-1.5 rounded-lg bg-[#20313D] border border-[#2C3D49] text-[#F1F5F7] hover:bg-[#2C3D49] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Document Deletion Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1117]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-6 rounded-2xl bg-[#17232D] border border-[#F05B5B]/40 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2C3D49] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F05B5B]/10 text-[#F05B5B] border border-[#F05B5B]/30">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F1F5F7]">Delete this document?</h3>
                  <p className="text-xs text-[#9EADB7] font-mono">Document #{documentToDelete.id}</p>
                </div>
              </div>

              <button
                onClick={() => setDocumentToDelete(null)}
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-[#9EADB7] hover:text-[#F1F5F7] hover:bg-[#20313D] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Banner */}
            {deleteError && (
              <div className="p-3.5 rounded-xl bg-[#F05B5B]/10 border border-[#F05B5B]/40 text-[#F05B5B] text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#F05B5B]" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="space-y-3 text-xs text-[#9EADB7]">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-[#F1F5F7] font-semibold">{documentToDelete.filename}</strong>?
              </p>
              <div className="p-3.5 rounded-xl bg-[#111B24] border border-[#2C3D49] space-y-1.5 font-mono text-[11px] text-[#9EADB7]">
                <p className="text-[#F2A900] font-sans font-semibold text-xs">This operation will permanently remove:</p>
                <ul className="list-disc list-inside space-y-1 text-[#F1F5F7]">
                  <li>Stored source document file from storage</li>
                  <li>All extracted metrics and unit normalizations</li>
                  <li>Document text chunks and token metadata</li>
                  <li>Semantic vector embeddings in ChromaDB</li>
                </ul>
                <p className="text-[#F05B5B] pt-1 font-sans text-[11px] font-semibold">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2C3D49]">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDocumentToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

