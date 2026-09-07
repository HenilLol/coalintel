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
      <Card className="lg:col-span-8 space-y-4 border-steel shadow-card-light bg-white">
        <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold text-ink">Evidence-Grounded AI Answer</CardTitle>
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
          <div className="p-3 rounded-lg bg-ash border border-steel text-xs font-mono text-ink">
            <span className="text-amber-600 font-bold uppercase mr-2">Query:</span>
            <span>&quot;{response.query}&quot;</span>
          </div>

          {/* Generated Cited Text */}
          <div className="p-4 rounded-xl bg-ash/40 border border-steel text-ink text-sm leading-relaxed whitespace-pre-line font-sans selection:bg-amber-500/30">
            {response.answer}
          </div>

          {/* Verification Footer Banner */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-steel text-xs text-slateText gap-2 font-mono">
            {response.degraded_mode ? (
              <span className="flex items-center gap-1.5 text-warning font-semibold">
                <AlertTriangle className="h-4 w-4" /> Degraded Mode
              </span>
            ) : response.citations && response.citations.length > 0 ? (
              <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                <ShieldCheck className="h-4 w-4" /> Evidence Grounded
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slateText font-semibold">
                <AlertTriangle className="h-4 w-4 text-slateText" /> No Evidence Found
              </span>
            )}
            <span className="text-slateText">
              {response.citations?.length || 0} Grounded Citations Provided
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CITATION EVIDENCE DRAWER LIST (4 cols) */}
      <Card className="lg:col-span-4 border-steel shadow-card-light bg-white">
        <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel">
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" />
            <span>Source Lineage Citations</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-slateText">
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
                  className="p-3 rounded-xl bg-ash border border-steel hover:border-amber-500/60 hover:bg-amber-500/5 transition-all cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-ink group-hover:text-amber-600">
                    <span className="truncate max-w-[170px]" title={c.document_name}>
                      {c.document_name}
                    </span>
                    <Badge variant="gold" size="sm">
                      Page {c.page_number}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slateText">
                    <span className="bg-white px-1.5 py-0.5 rounded text-slateText border border-steel">
                      {c.citation_tag}
                    </span>
                    <span className="flex items-center gap-1 text-teal-600 group-hover:text-teal-700 font-sans text-xs">
                      Inspect <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slateText font-mono">
              No citations attached to query response.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
