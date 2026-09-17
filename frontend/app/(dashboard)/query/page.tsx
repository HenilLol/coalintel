'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { QueryInput } from '@/components/query/QueryInput';
import { RagPipelineVisualizer } from '@/components/query/RagPipelineVisualizer';
import { StructuredInsightCard } from '@/components/query/StructuredInsightCard';
import { CitationDrawer } from '@/components/query/CitationDrawer';
import { queryApi, QueryResponse, CitationItem, EvidenceChunkItem } from '@/lib/api/queryApi';
import { useScope } from '@/context/ScopeContext';
import { Sparkles, Bot, ShieldCheck } from 'lucide-react';

export default function QueryPage() {
  const { selectedSubsidiary, setSelectedSubsidiary } = useScope();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeResponse, setActiveResponse] = useState<QueryResponse | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<{
    citation: CitationItem;
    chunk?: EvidenceChunkItem;
  } | null>(null);

  const handleRunQuery = async (queryText?: string) => {
    const textToRun = queryText || prompt;
    if (!textToRun || !textToRun.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedCitation(null);

    try {
      const data = await queryApi.askQuery(textToRun, {
        subsidiary_filter: selectedSubsidiary,
      });
      setActiveResponse(data);
    } catch (err: any) {
      console.warn('Query API error:', err);
      const detail = err.response?.data?.detail || 'Query execution failed. Please verify backend connection.';
      setError(detail);
      setActiveResponse({
        query: textToRun,
        answer: 'Failed to retrieve evidence grounded response from AI assistant. Please check backend connection.',
        citations: [],
        evidence_chunks: [],
        degraded_mode: true,
        provider: 'Degraded Mode',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Ask COALINTEL — Cited Mining Intelligence Workspace"
        description="Evidence-driven natural language retrieval enforcing page-level citation verification [Doc_Name.pdf, Page X] against ChromaDB vector embeddings."
        breadcrumbs={[{ label: 'Ask COALINTEL' }]}
        badge={<Badge variant="amber">Hybrid RAG Engine</Badge>}
      />

      {/* RAG Evidence Pipeline Visualizer */}
      <RagPipelineVisualizer
        isLoading={isLoading}
        hasResponse={!!activeResponse}
        citationCount={activeResponse?.citations?.length || 0}
      />

      {/* Query Input & Sample Pills */}
      <QueryInput
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleRunQuery}
        isLoading={isLoading}
        selectedSubsidiary={selectedSubsidiary}
        onSubsidiaryChange={setSelectedSubsidiary}
      />

      {/* Error Alert */}
      {error && <ErrorState message={error} />}

      {/* Signature Structured Intelligence Output Cards (7 Sections) */}
      {!isLoading && activeResponse && (
        <StructuredInsightCard
          response={activeResponse}
          onSelectCitation={(citation, chunk) => setSelectedCitation({ citation, chunk })}
        />
      )}

      {/* Citation Evidence Inspection Drawer */}
      <CitationDrawer
        citation={selectedCitation?.citation || null}
        chunk={selectedCitation?.chunk || null}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
