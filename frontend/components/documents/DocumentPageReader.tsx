'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  FileText,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DocumentPageItem } from '@/types/document';

interface DocumentPageReaderProps {
  filename: string;
  totalPages: number;
  pages: DocumentPageItem[];
  activePageNumber?: number;
  onPageChange?: (pageNum: number) => void;
  highlightTerm?: string;
  loading?: boolean;
}

export const DocumentPageReader: React.FC<DocumentPageReaderProps> = ({
  filename,
  totalPages,
  pages,
  activePageNumber = 1,
  onPageChange,
  highlightTerm = '',
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(activePageNumber);
  const [searchTerm, setSearchTerm] = useState<string>(highlightTerm);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Keep internal currentPage in sync when activePageNumber changes externally (e.g. from lineage drawer)
  React.useEffect(() => {
    if (activePageNumber) {
      setCurrentPage(activePageNumber);
    }
  }, [activePageNumber]);

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(totalPages || 1, newPage));
    setCurrentPage(validPage);
    if (onPageChange) onPageChange(validPage);
  };

  // Find active page content item
  const activePageItem = useMemo(() => {
    return pages.find((p) => p.page_number === currentPage) || pages[0] || null;
  }, [pages, currentPage]);

  // Render text with search term highlighting
  const renderHighlightedText = (text: string) => {
    const activeSearch = searchTerm || highlightTerm;
    if (!activeSearch.trim()) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    const regex = new RegExp(`(${activeSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-gold-500/40 text-gold-200 px-1 py-0.5 rounded font-semibold border border-gold-500/60">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const fontClasses = {
    sm: 'text-xs leading-relaxed',
    base: 'text-sm leading-relaxed',
    lg: 'text-base leading-loose',
  };

  return (
    <Card className="h-full flex flex-col min-h-[600px] border-slate-800/90 shadow-card-dark">
      {/* Header Toolbar */}
      <CardHeader className="py-3 px-4 bg-navy-950/80 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left Title & Provenance Badge */}
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-gold-400 shrink-0" />
            <CardTitle className="text-sm font-semibold truncate max-w-xs">{filename}</CardTitle>
            <Badge variant="gold" size="sm" className="hidden md:inline-flex">
              Page {currentPage} of {totalPages || 1}
            </Badge>
          </div>

          {/* Center Search within Page */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search text in page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-3.5 w-3.5 text-slate-400" />}
              className="bg-navy-900 text-xs py-1.5"
            />
          </div>

          {/* Right Controls: Font size & Navigation */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1 bg-navy-900 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${fontSize === 'sm' ? 'bg-gold-500 text-navy-950 font-bold' : 'text-slate-400'}`}
                title="Small Font"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${fontSize === 'base' ? 'bg-gold-500 text-navy-950 font-bold' : 'text-slate-400'}`}
                title="Normal Font"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${fontSize === 'lg' ? 'bg-gold-500 text-navy-950 font-bold' : 'text-slate-400'}`}
                title="Large Font"
              >
                A+
              </button>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded-lg bg-navy-900 border border-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={currentPage}
                  onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
                  className="w-10 text-center bg-navy-900 border border-slate-700 rounded text-xs py-1 text-gold-400 font-bold focus:outline-none focus:border-gold-500"
                />
                <span className="text-slate-400">/ {totalPages || 1}</span>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= (totalPages || 1) || loading}
                className="p-1.5 rounded-lg bg-navy-900 border border-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Main Scrollable Reading Area */}
      <CardContent className="flex-1 p-6 overflow-y-auto max-h-[650px] bg-navy-950/90 text-slate-200 scrollbar-thin">
        {loading ? (
          <div className="space-y-4 animate-pulse p-4">
            <div className="h-4 bg-navy-800 rounded w-3/4" />
            <div className="h-4 bg-navy-800 rounded w-full" />
            <div className="h-4 bg-navy-800 rounded w-5/6" />
            <div className="h-4 bg-navy-800 rounded w-2/3" />
          </div>
        ) : activePageItem ? (
          <div className="space-y-4">
            {/* Document Provenance Header inside Canvas */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Bookmark className="h-3.5 w-3.5 text-gold-400" />
                Provenanced Extracted Text Canvas
              </span>
              <span className="text-gold-400 font-semibold">Page {activePageItem.page_number}</span>
            </div>

            {/* Structured Page Content */}
            <div className={`font-sans tracking-wide text-slate-200 selection:bg-gold-500/30 ${fontClasses[fontSize]}`}>
              {renderHighlightedText(activePageItem.text_snippet || 'No text content available for this page.')}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-mono">
            No page text data retrieved for Page {currentPage}.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
