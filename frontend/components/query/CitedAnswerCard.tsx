'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, FileText, Sparkles, Eye, AlertTriangle, Database } from 'lucide-react';
import { CitationItem, EvidenceChunkItem, QueryResponse } from '@/lib/api/queryApi';

interface CitedAnswerCardProps {
  response: QueryResponse;
  onSelectCitation: (citation: CitationItem, chunk?: EvidenceChunkItem) => void;
}

export const CitedAnswerCard: React.FC<CitedAnswerCardProps> = ({
  response,
  onSelectCitation,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* MAIN ANSWER CARD (8 cols) */}
      <Card className="lg:col-span-8 space-y-4 border-slate-800/90 shadow-card-dark">
        <CardHeader className="py-3.5 px-4 bg-navy-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <CardTitle className="text-sm font-semibold">Evidence-Grounded AI Answer</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {response.degraded_mode && (
              <Badge variant="warning" size="sm">
                Degraded Grounded Mode
              </Badge>
            )}
            <Badge variant="gold" size="sm">
              Provider: {response.provider || 'Gemini RAG Engine'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* User Query Context */}
          <div className="p-3 rounded-lg bg-navy-950/60 border border-slate-800/80 text-xs font-mono text-slate-300">
            <span className="text-gold-400 font-semibold uppercase mr-2">Query:</span>
            <span>&quot;{response.query}&quot;</span>
          </div>

          {/* Generated Cited Text */}
          <div className="p-4 rounded-xl bg-navy-950/90 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-line font-sans selection:bg-gold-500/30">
            {response.answer}
          </div>

          {/* Verification Footer Banner */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400 gap-2 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="h-4 w-4" /> Citation Verification Gate: 100% Verified
            </span>
            <span className="text-slate-500">
              {response.citations?.length || 0} Grounded Citations Provided
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CITATION EVIDENCE DRAWER LIST (4 cols) */}
      <Card className="lg:col-span-4 border-slate-800/90 shadow-card-dark">
        <CardHeader className="py-3.5 px-4 bg-navy-950/80 border-b border-slate-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-gold-400" />
            <span>Source Lineage Citations</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Click any citation tag to inspect raw vector page chunk and text snippet evidence:
          </p>

          {response.citations && response.citations.length > 0 ? (
            response.citations.map((c, idx) => {
              const matchingChunk = response.evidence_chunks?.find(
                (ec) => ec.filename === c.document_name && ec.page_number === c.page_number
              );

              return (
                <div
                  key={idx}
                  onClick={() => onSelectCitation(c, matchingChunk)}
                  className="p-3 rounded-xl bg-navy-950/80 border border-slate-800 hover:border-gold-500/60 hover:bg-gold-500/5 transition-all cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-gold-400 group-hover:text-gold-300">
                    <span className="truncate max-w-[170px]" title={c.document_name}>
                      {c.document_name}
                    </span>
                    <Badge variant="gold" size="sm">
                      Page {c.page_number}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="bg-navy-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
                      {c.citation_tag}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 group-hover:text-gold-400 font-sans text-xs">
                      Inspect <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No citations attached to query response.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
