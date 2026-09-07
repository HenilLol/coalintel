'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { CitationDrawer } from '@/components/query/CitationDrawer';
import { useScope } from '@/context/ScopeContext';
import { formatStandardValue } from '@/lib/utils/cn';
import {
  generateBriefing,
  exportBriefingPdf,
  ParliamentaryBriefingResponse,
  BriefingEvidenceItem,
} from '@/lib/api/parliamentaryApi';
import {
  Landmark,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

const PRESETS = [
  {
    title: 'Production Target Achievement',
    type: 'TARGETS',
    question: 'What is the subsidiary-wise coal production achievement and target variance for FY2023-24?',
  },
  {
    title: 'Overburden Stripping Analysis',
    type: 'OVERBURDEN',
    question: 'What is the overburden removal (OBR) and stripping ratio breakdown across opencast coal mines?',
  },
  {
    title: 'Cross-Document Discrepancy Audit',
    type: 'DISCREPANCIES',
    question: 'Identify any cross-document data discrepancies or conflicting metrics reported across CIL subsidiary annual reports.',
  },
  {
    title: 'Equipment & Washing Capacity',
    type: 'GENERAL',
    question: 'Provide executive briefing on HEMM equipment availability, coal washing capacity, and infrastructure readiness.',
  },
];

export default function ParliamentaryPage() {
  const { selectedSubsidiary, selectedFiscalYear } = useScope();
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('GENERAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<ParliamentaryBriefingResponse | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Citation Drawer state
  const [activeEvidence, setActiveEvidence] = useState<{
    chunkId: number | null;
    filename: string;
    pageNumber: number;
    snippet: string;
    rrfScore: number;
  } | null>(null);

  const handlePresetSelect = (preset: (typeof PRESETS)[0]) => {
    setQuestionText(preset.question);
    setQuestionType(preset.type);
  };

  const handleGenerate = async () => {
    if (!questionText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await generateBriefing({
        question_text: questionText,
        fiscal_year: selectedFiscalYear,
        subsidiary_filter: selectedSubsidiary,
        question_type: questionType,
      });
      setBriefing(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to generate Parliamentary Briefing Note.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!briefing) return;
    setDownloadingPdf(true);
    try {
      const blob = await exportBriefingPdf(briefing);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Parliamentary_Briefing_${briefing.selected_scope}_${briefing.fiscal_year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export PDF briefing document.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Parliamentary Question & Executive Briefing Intelligence Engine"
        description="Multi-subsidiary evidence synthesis, deterministic metric validation, and institutional briefing note compilation."
        breadcrumbs={[{ label: 'Parliamentary Intelligence' }]}
        badge={<Badge variant="gold">Parliamentary Engine</Badge>}
      />

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRESETS.map((p, idx) => (
          <Card
            key={idx}
            onClick={() => handlePresetSelect(p)}
            className="p-4 cursor-pointer hover:border-amber-500/50 hover:bg-ash/60 transition-all border-steel group bg-white shadow-card-light"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-amber-600 font-bold uppercase tracking-wider">{p.type}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slateText group-hover:text-amber-600 transition-colors" />
            </div>
            <h4 className="text-sm font-semibold text-ink group-hover:text-amber-600 mb-1">{p.title}</h4>
            <p className="text-xs text-slateText line-clamp-2">{p.question}</p>
          </Card>
        ))}
      </div>

      {/* Question Form & Scope Display */}
      <Card className="border-steel shadow-card-light">
        <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
              <Landmark className="h-4 w-4 text-amber-500" />
              <span>Parliamentary Question Input</span>
            </CardTitle>

            {/* Scope Badges */}
            <div className="flex items-center gap-2">
              <Badge variant="gold" size="sm" className="gap-1 font-mono">
                <Building2 className="h-3 w-3" />
                {selectedSubsidiary}
              </Badge>
              <Badge variant="default" size="sm" className="gap-1 font-mono">
                <Calendar className="h-3 w-3" />
                FY {selectedFiscalYear}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink mb-2">Parliamentary Starred / Executive Question Text</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Enter Parliamentary Question or Executive Query (e.g. Provide subsidiary-wise coal production and overburden removal figures for FY2023-24...)"
              className="w-full bg-white border border-steel rounded-xl px-4 py-3 text-sm text-ink placeholder-slateText focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slateText whitespace-nowrap">Intent Filter:</span>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="bg-white border border-steel rounded-lg px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="GENERAL">General Briefing</option>
                <option value="TARGETS">Production Targets</option>
                <option value="OVERBURDEN">Overburden Removal</option>
                <option value="SUBSIDIARIES">Subsidiary Comparison</option>
                <option value="DISCREPANCIES">Discrepancy Audit</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !questionText.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-coal-900 font-bold text-sm shadow-glow-amber transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Synthesizing Evidence...</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Parliamentary Briefing Note</span>
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && <ErrorState message={error} />}

      {/* Loading Indicator */}
      {loading && <LoadingState label="Extracting multi-subsidiary evidence & compiling Parliamentary Briefing Note..." />}

      {/* Briefing Results */}
      {briefing && !loading && (
        <div className="space-y-6">
          {/* Briefing Banner Card */}
          <Card className="border-steel shadow-card-light bg-white">
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-steel pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-ink">Parliamentary Briefing Note</h2>
                  </div>
                  <p className="text-xs text-slateText font-mono">
                    Target Scope: <span className="text-amber-600 font-bold">{briefing.selected_scope}</span> | Fiscal Year: <span className="text-green-600 font-bold">{briefing.fiscal_year}</span> | Compiled: {briefing.generated_at}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={briefing.confidence_rating === 'HIGH' ? 'success' : briefing.confidence_rating === 'MEDIUM' ? 'warning' : 'danger'}
                    size="md"
                    className="font-bold font-mono"
                  >
                    Confidence: {briefing.confidence_rating} ({Math.round(briefing.confidence * 100)}%)
                  </Badge>

                  <button
                    onClick={handleExportPdf}
                    disabled={downloadingPdf}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-ash border border-steel text-ink text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="h-4 w-4 text-amber-500" />
                    <span>{downloadingPdf ? 'Exporting PDF...' : 'Download Briefing Note (PDF)'}</span>
                  </button>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <b>Institutional Disclaimer:</b> AI-generated evidence-backed Parliamentary Briefing Note for analytical decision support. Not an official Ministry issued document.
                </span>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slateText font-bold">Executive Summary</h3>
                <p className="text-sm text-ink leading-relaxed bg-ash/50 p-4 rounded-xl border border-steel">
                  {briefing.executive_summary}
                </p>
              </div>

              {/* Key Findings */}
              {briefing.key_findings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slateText font-bold">Key Findings & Operational Highlights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {briefing.key_findings.map((finding, idx) => (
                      <div key={idx} className="p-3 bg-ash/50 border border-steel rounded-xl flex items-start gap-2.5 text-xs text-ink">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Subsidiary Metrics Table */}
          {briefing.subsidiary_metrics.length > 0 && (
            <Card className="border-steel shadow-card-light">
              <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel">
                <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-green-600" />
                  <span>Verified Operational Metrics Table</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-steel bg-ash text-[11px] font-mono text-slateText uppercase tracking-wider">
                        <th className="py-3 px-4">Mine Entity</th>
                        <th className="py-3 px-4">Subsidiary</th>
                        <th className="py-3 px-4">Metric Name</th>
                        <th className="py-3 px-4">Reported Value</th>
                        <th className="py-3 px-4">Standard Value</th>
                        <th className="py-3 px-4">Fiscal Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel/60 text-xs font-mono">
                      {briefing.subsidiary_metrics.map((m, idx) => (
                        <tr key={idx} className="hover:bg-ash/60 transition-colors">
                          <td className="py-3 px-4 font-sans font-semibold text-ink">{m.mine_name}</td>
                          <td className="py-3 px-4 text-amber-600 font-bold">{m.subsidiary}</td>
                          <td className="py-3 px-4 text-slateText">{m.metric_name}</td>
                          <td className="py-3 px-4 text-ink">{m.numeric_value} {m.unit}</td>
                          <td className="py-3 px-4 font-bold text-green-600">{formatStandardValue(m.standard_value)} {m.standard_unit}</td>
                          <td className="py-3 px-4 text-slateText">{m.fiscal_year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flagged Discrepancies */}
          {briefing.discrepancies.length > 0 && (
            <Card className="border-danger/30 shadow-card-light bg-danger/5">
              <CardHeader className="py-3.5 px-4 bg-danger/10 border-b border-danger/20">
                <CardTitle className="text-sm font-semibold text-danger flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  <span>Flagged Cross-Document Discrepancies ({briefing.discrepancies.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {briefing.discrepancies.map((d, idx) => (
                  <div key={idx} className="p-4 bg-white border border-danger/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">{d.entity}</span>
                        <span className="text-xs text-slateText font-mono">({d.metric_name})</span>
                      </div>
                      <Badge variant={d.is_seeded_demo ? 'warning' : 'danger'} size="sm" className="font-mono font-bold">
                        {d.provenance_label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-1">
                      <div className="p-2.5 bg-ash rounded-lg border border-steel">
                        <span className="text-slateText block text-[10px] truncate">{d.doc_a_filename}</span>
                        <span className="text-ink font-bold text-sm block mt-0.5">{d.doc_a_value} {d.unit}</span>
                      </div>
                      <div className="p-2.5 bg-ash rounded-lg border border-steel">
                        <span className="text-slateText block text-[10px] truncate">{d.doc_b_filename}</span>
                        <span className="text-ink font-bold text-sm block mt-0.5">{d.doc_b_value} {d.unit}</span>
                      </div>
                      <div className="p-2.5 bg-danger/10 rounded-lg border border-danger/30 text-center">
                        <span className="text-danger block text-[10px]">Variance Percentage</span>
                        <span className="text-danger font-bold text-sm block mt-0.5">{d.variance_percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Traceable Evidence Lineage */}
          {briefing.evidence.length > 0 && (
            <Card className="border-steel shadow-card-light">
              <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel">
                <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <span>Traceable Evidence Lineage ({briefing.evidence.length} Chunks)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {briefing.evidence.map((ev, idx) => (
                  <div key={idx} className="p-3.5 bg-ash/50 border border-steel rounded-xl flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-amber-600 font-bold">{ev.document_name}</span>
                        <span className="text-slateText">•</span>
                        <span className="text-ink">Page {ev.page_number}</span>
                        <span className="text-slateText">•</span>
                        <span className="text-green-600 font-semibold">RRF Score: {ev.rrf_score}</span>
                      </div>
                      <p className="text-xs text-ink line-clamp-2 leading-relaxed font-sans">{ev.text_snippet}</p>
                    </div>

                    <button
                      onClick={() =>
                        setActiveEvidence({
                          chunkId: typeof ev.chunk_id === 'number' ? ev.chunk_id : (Number(ev.chunk_id) || null),
                          filename: ev.document_name,
                          pageNumber: ev.page_number,
                          snippet: ev.text_snippet,
                          rrfScore: ev.rrf_score,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-ash border border-steel text-amber-600 text-xs font-semibold shrink-0 transition-colors whitespace-nowrap shadow-sm"
                    >
                      View Evidence
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Limitations Card */}
          {briefing.limitations.length > 0 && (
            <Card className="border-steel shadow-card-light bg-ash/50">
              <div className="p-4 space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slateText font-bold">System Limitations & Scope Boundaries</h4>
                <ul className="list-disc list-inside text-xs text-slateText space-y-1 font-mono">
                  {briefing.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Citation Drawer Modal */}
      {activeEvidence && (
        <CitationDrawer
          citation={{
            document_name: activeEvidence.filename,
            page_number: activeEvidence.pageNumber,
            citation_tag: `[${activeEvidence.filename}, Page ${activeEvidence.pageNumber}]`,
          }}
          chunk={{
            chunk_id: activeEvidence.chunkId ? Number(activeEvidence.chunkId) || 1 : 1,
            document_id: 1,
            filename: activeEvidence.filename,
            page_number: activeEvidence.pageNumber,
            chunk_index: 0,
            text: activeEvidence.snippet,
            rrf_score: activeEvidence.rrfScore,
          }}
          onClose={() => setActiveEvidence(null)}
        />
      )}
    </div>
  );
}
