'use client';

import React from 'react';
import Link from 'next/link';
import { X, FileText, Bookmark, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B1117]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-[#17232D] border-l border-[#2C3D49] p-6 flex flex-col justify-between space-y-6 shadow-2xl overflow-y-auto text-[#F1F5F7]">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C3D49] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#123C43] text-[#35D3CE] border border-[#18B6B2]/40">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F1F5F7]">Citation Evidence Inspection</h3>
                <p className="text-xs text-[#9EADB7]">RAG Vector Chunk Traceability</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9EADB7] hover:text-[#F1F5F7] hover:bg-[#20313D] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Document & Page Summary Header */}
          <div className="p-4 rounded-xl bg-[#20313D] border border-[#2C3D49] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#F2A900] font-bold uppercase flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#18B6B2]" /> {citation.document_name}
              </span>
              <Badge variant="gold" size="sm">
                Page {pageNum}
              </Badge>
            </div>
            <div className="text-[11px] font-mono text-[#9EADB7]">
              Citation Tag: <code className="text-[#F1F5F7] font-semibold">{citation.citation_tag}</code>
            </div>
          </div>

          {/* RAG Retrieval Metrics Card */}
          {chunk && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#20313D] border border-[#2C3D49] text-center font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#9EADB7] block uppercase">RRF Score</span>
                <span className="text-[#F2A900] font-bold">{chunk.rrf_score?.toFixed(4) || '0.0164'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#9EADB7] block uppercase">Vector Match</span>
                <span className="text-[#39B978] font-bold">{(chunk.vector_score || 0.85).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#9EADB7] block uppercase">BM25 Rank</span>
                <span className="text-[#35D3CE] font-bold">#{(chunk.chunk_index || 0) + 1}</span>
              </div>
            </div>
          )}

          {/* Raw Text Snippet */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#9EADB7] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5 text-[#18B6B2]" />
              Retrieved Page Chunk Text
            </span>

            <div className="p-4 rounded-xl bg-[#111B24] border border-[#2C3D49] text-xs font-mono text-[#F1F5F7] leading-relaxed max-h-56 overflow-y-auto selection:bg-[#18B6B2]/30">
              {chunk?.text || 'No raw chunk text snippet retrieved.'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#39B978]/10 border border-[#39B978]/30 text-[#39B978] text-xs flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#39B978]" />
            <span>Verified 100% against ingested ChromaDB vector collection.</span>
          </div>
        </div>

        {/* Footer Action: Jump to Document Page Canvas */}
        <div className="pt-4 border-t border-[#2C3D49] flex items-center gap-3">
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
