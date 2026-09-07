'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { documentApi } from '@/lib/api/documentApi';
import { CIL_SUBSIDIARIES, FISCAL_YEARS } from '@/lib/constants';
import { DocumentItem } from '@/types/document';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (doc: DocumentItem) => void;
}

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv'];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subsidiary, setSubsidiary] = useState('ECL');
  const [fiscalYear, setFiscalYear] = useState('2023-24');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateDocInfo, setDuplicateDocInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateFile = (file: File): boolean => {
    setErrorMessage(null);
    setDuplicateDocInfo(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`File type '${ext}' is not supported. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`File size (${sizeMb} MB) exceeds maximum allowed limit of 100 MB.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);
    setDuplicateDocInfo(null);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subsidiary', subsidiary);
      formData.append('fiscal_year', fiscalYear);

      const result = await documentApi.uploadDocument(formData);
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        if (onUploadSuccess && result) {
          onUploadSuccess(result);
        }
        onClose();
      }, 500);
    } catch (err: unknown) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);

      const error = err as { response?: { status?: number; data?: { detail?: string; error?: string; existing_document?: { id: number; filename: string } } }; message?: string };

      if (error.response?.status === 409) {
        const detail = error.response.data?.detail || error.response.data?.error || 'A document with identical content (SHA-256 hash) already exists.';
        setDuplicateDocInfo(detail);
      } else {
        setErrorMessage(
          error.response?.data?.detail ||
          error.response?.data?.error ||
          error.message ||
          'Failed to upload and parse document. Please check connection and try again.'
        );
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1117]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-[#17232D] border border-[#2C3D49] shadow-2xl space-y-6 text-[#F1F5F7]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C3D49] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#123C43] text-[#35D3CE] border border-[#18B6B2]/40">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F1F5F7]">Ingest Mining Document</h3>
              <p className="text-xs text-[#9EADB7]">PDF, DOCX, XLSX, CSV up to 100 MB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[#9EADB7] hover:text-[#F1F5F7] hover:bg-[#20313D] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#F05B5B]/10 border border-[#F05B5B]/40 text-[#F05B5B] text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#F05B5B]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {duplicateDocInfo && (
          <div className="p-3.5 rounded-xl bg-[#F08A24]/10 border border-[#F08A24]/40 text-[#F08A24] text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#F08A24]" />
            <div className="space-y-1">
              <span className="font-semibold block">Duplicate SHA-256 Hash Detected</span>
              <span>{duplicateDocInfo}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 text-center ${
              dragActive
                ? 'border-[#18B6B2] bg-[#18B6B2]/10'
                : selectedFile
                ? 'border-[#39B978]/50 bg-[#39B978]/10'
                : 'border-[#2C3D49] bg-[#111B24] hover:border-[#18B6B2]/60 hover:bg-[#20313D]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-[#39B978]/20 text-[#39B978] border border-[#39B978]/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <span className="text-sm font-semibold text-[#F1F5F7] max-w-xs truncate">
                  {selectedFile.name}
                </span>
                <Badge variant="gold" size="sm">
                  {formatFileSize(selectedFile.size)}
                </Badge>
                <span className="text-[11px] text-[#9EADB7]">Click or drag another file to replace</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-[#20313D] text-[#35D3CE] border border-[#2C3D49] shadow-sm">
                  <FileText className="h-8 w-8" />
                </div>
                <div className="text-xs text-[#9EADB7]">
                  <span className="font-semibold text-[#35D3CE]">Click to browse</span> or drag and drop document here
                </div>
                <span className="text-[10px] text-[#9EADB7] font-mono uppercase tracking-wider">
                  Supported formats: PDF, DOCX, XLSX, CSV (Max 100 MB)
                </span>
              </div>
            )}
          </div>

          {/* Subsidiary & Fiscal Year Scope Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Subsidiary / Enterprise"
              value={subsidiary}
              onChange={(e) => setSubsidiary(e.target.value)}
              options={CIL_SUBSIDIARIES.filter((s) => s.value !== 'ALL')}
            />

            <Select
              label="Fiscal Year Scope"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              options={FISCAL_YEARS}
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#9EADB7]">
                <span>Ingesting & Parsing Document...</span>
                <span className="text-[#35D3CE] font-semibold">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#111B24] border border-[#2C3D49] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#18B6B2] to-[#35D3CE] transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2C3D49]">
            <Button variant="ghost" size="md" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedFile || isUploading}
              isLoading={isUploading}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Upload & Parse Document
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
