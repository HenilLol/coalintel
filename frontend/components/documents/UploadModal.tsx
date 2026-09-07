'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
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
    if (!selectedFile) {
      setErrorMessage('Please select a valid document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);
    setDuplicateDocInfo(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subsidiary', subsidiary);
    formData.append('fiscal_year', fiscalYear);

    try {
      const doc = await documentApi.uploadDocument(formData, (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 90) / progressEvent.total);
          setUploadProgress(Math.max(10, pct));
        }
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        if (onUploadSuccess) onUploadSuccess(doc);
        onClose();
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);

      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 409) {
        setDuplicateDocInfo(
          detail || 'Duplicate document detected. An identical document file (SHA-256 hash match) already exists in the database.'
        );
      } else if (status === 400) {
        setErrorMessage(detail || 'Validation error: Invalid file format or size limits exceeded.');
      } else if (status === 401 || status === 403) {
        setErrorMessage('Authorization required: You must be logged in as an Admin or Analyst to upload documents.');
      } else {
        setErrorMessage(detail || 'Upload failed due to a server error. Please try again.');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coal-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-white border border-steel shadow-2xl space-y-6 text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/30">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Ingest Mining Document</h3>
              <p className="text-xs text-slateText">PDF, DOCX, XLSX, CSV up to 100 MB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slateText hover:text-ink hover:bg-ash transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/40 text-danger text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
            <span>{errorMessage}</span>
          </div>
        )}

        {duplicateDocInfo && (
          <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/40 text-warning text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
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
                ? 'border-amber-500 bg-amber-500/10'
                : selectedFile
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-steel bg-ash/50 hover:border-steel/80 hover:bg-ash'
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
                <div className="p-3 rounded-full bg-green-500/20 text-green-600 border border-green-500/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <span className="text-sm font-semibold text-ink max-w-xs truncate">
                  {selectedFile.name}
                </span>
                <Badge variant="gold" size="sm">
                  {formatFileSize(selectedFile.size)}
                </Badge>
                <span className="text-[11px] text-slateText">Click or drag another file to replace</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-white text-amber-600 border border-steel shadow-sm">
                  <FileText className="h-8 w-8" />
                </div>
                <div className="text-xs text-slateText">
                  <span className="font-semibold text-amber-600">Click to browse</span> or drag and drop document here
                </div>
                <span className="text-[10px] text-slateText font-mono uppercase tracking-wider">
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
              <div className="flex items-center justify-between text-xs font-mono text-slateText">
                <span>Ingesting & Parsing Document...</span>
                <span className="text-amber-600 font-semibold">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-ash border border-steel overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-steel">
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
