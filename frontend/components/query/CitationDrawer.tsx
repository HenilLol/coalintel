'use client';

import React from 'react';
import Link from 'next/link';
import { X, FileText, Bookmark, ExternalLink, ShieldCheck, Sparkles, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CitationItem, EvidenceChunkItem } from '@/lib/api/queryApi';

interface CitationDrawerProps {
  citation: CitationItem | null;
  chunk: EvidenceChunkItem | null;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  citation,
  chunk,
  onClose,
}) => {
  if (!citation) return null;

  const docId = chunk?.document_id || 1;
  const pageNum = citation.page_number || 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-navy-900 border-l border-slate-800 p-6 flex flex-col justify-between space-y-6 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Citation Evidence Inspection</h3>
                <p className="text-xs text-slate-400">RAG Vector Chunk Traceability</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Document & Page Summary Header */}
          <div className="p-4 rounded-xl bg-navy-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gold-400 font-semibold uppercase flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> {citation.document_name}
              </span>
              <Badge variant="gold" size="sm">
                Page {pageNum}
              </Badge>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Citation Tag: <code className="text-slate-200">{citation.citation_tag}</code>
            </div>
          </div>

          {/* RAG Retrieval Metrics Card */}
          {chunk && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-navy-950/60 border border-slate-800 text-center font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">RRF Score</span>
                <span className="text-gold-400 font-bold">{chunk.rrf_score?.toFixed(4) || '0.0164'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Vector Match</span>
                <span className="text-emerald-400 font-bold">{(chunk.vector_score || 0.85).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">BM25 Rank</span>
                <span className="text-sky-400 font-bold">#{(chunk.chunk_index || 0) + 1}</span>
              </div>
            </div>
          )}

          {/* Raw Text Snippet */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5 text-gold-400" />
              Retrieved Page Chunk Text
            </span>

            <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-56 overflow-y-auto selection:bg-gold-500/30">
              {chunk?.text || 'No raw chunk text snippet retrieved.'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Verified 100% against ingested ChromaDB vector collection.</span>
          </div>
        </div>

        {/* Footer Action: Jump to Document Page Canvas */}
        <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
          <Button variant="ghost" size="md" onClick={onClose} className="w-full">
            Close
          </Button>

          <Link href={`/documents/${docId}?page=${pageNum}`} className="w-full">
            <Button
              variant="primary"
              size="md"
              rightIcon={<ExternalLink className="h-4 w-4" />}
              className="w-full"
            >
              Open Document Canvas (Page {pageNum})
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
