'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, FileText, ShieldCheck, AlertTriangle, Eye } from 'lucide-react';
import { QueryResponse, CitationItem, EvidenceChunkItem } from '@/lib/api/queryApi';

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
      <Card className="lg:col-span-8 space-y-4 border-[#2C3D49] shadow-lg bg-[#17232D]">
        <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#18B6B2]" />
            <CardTitle className="text-sm font-bold text-[#F1F5F7]">Evidence-Grounded AI Answer</CardTitle>
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
          <div className="p-3 rounded-lg bg-[#111B24] border border-[#2C3D49] text-xs font-mono text-[#F1F5F7]">
            <span className="text-[#F2A900] font-bold uppercase mr-2">Query:</span>
            <span>&quot;{response.query}&quot;</span>
          </div>

          {/* Generated Cited Text */}
          <div className="p-4 rounded-xl bg-[#111B24] border border-[#2C3D49] text-[#F1F5F7] text-sm leading-relaxed whitespace-pre-line font-sans selection:bg-[#18B6B2]/30">
            {response.answer}
          </div>

          {/* Verification Footer Banner */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-[#2C3D49] text-xs text-[#9EADB7] gap-2 font-mono">
            {response.degraded_mode ? (
              <span className="flex items-center gap-1.5 text-warning font-semibold">
                <AlertTriangle className="h-4 w-4" /> Degraded Mode
              </span>
            ) : response.citations && response.citations.length > 0 ? (
              <span className="flex items-center gap-1.5 text-[#39B978] font-semibold">
                <ShieldCheck className="h-4 w-4" /> Evidence Grounded
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#9EADB7] font-semibold">
                <AlertTriangle className="h-4 w-4 text-[#9EADB7]" /> No Evidence Found
              </span>
            )}
            <span className="text-[#9EADB7]">
              {response.citations?.length || 0} Grounded Citations Provided
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CITATION EVIDENCE DRAWER LIST (4 cols) */}
      <Card className="lg:col-span-4 border-[#2C3D49] shadow-lg bg-[#17232D]">
        <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49]">
          <CardTitle className="text-sm font-bold text-[#F1F5F7] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#18B6B2]" />
            <span>Source Lineage Citations</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-[#9EADB7]">
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
                  className="p-3 rounded-xl bg-[#20313D] border border-[#2C3D49] hover:border-[#18B6B2]/60 hover:bg-[#123C43]/40 transition-all cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#F1F5F7] group-hover:text-[#35D3CE]">
                    <span className="truncate max-w-[170px]" title={c.document_name}>
                      {c.document_name}
                    </span>
                    <Badge variant="gold" size="sm">
                      Page {c.page_number}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#9EADB7]">
                    <span className="bg-[#111B24] px-1.5 py-0.5 rounded text-[#35D3CE] border border-[#2C3D49]">
                      {c.citation_tag}
                    </span>
                    <span className="flex items-center gap-1 text-[#35D3CE] group-hover:text-[#18B6B2] font-sans text-xs">
                      Inspect <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-[#9EADB7] font-mono">
              No citations attached to query response.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
