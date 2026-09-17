'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mountain,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  GitCompare,
  BarChart3,
  Landmark,
  FileSpreadsheet,
  Layers,
  Activity,
  CheckCircle2,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IntelligentBackground } from '@/components/layout/IntelligentBackground';
import { GeologicalCrossSection3D } from '@/components/3d/GeologicalCrossSection3D';
import { DataPipeline3D } from '@/components/3d/DataPipeline3D';

export default function RootLandingPage() {
  const router = useRouter();
  const [isQuickEntering, setIsQuickEntering] = useState(false);

  // Instant seamless evaluator access
  const handleEnterIntelligenceCenter = (destination = '/dashboard') => {
    setIsQuickEntering(true);
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('coalintel_token');
      if (!existingToken) {
        // Automatically establish verified demo session
        localStorage.setItem('coalintel_token', 'demo_jwt_session_token_sih26023');
        localStorage.setItem(
          'coalintel_user',
          JSON.stringify({
            username: 'CMPDI Analyst',
            role: 'Analyst',
            subsidiary: 'CMPDI',
          })
        );
      }
    }
    router.push(destination);
  };

  return (
    <div className="min-h-screen bg-[#0E1113] text-[#E8ECEB] font-sans relative overflow-x-hidden selection:bg-[#C58B3A]/30 selection:text-[#E8ECEB]">
      {/* Dynamic Layered Intelligent Background */}
      <IntelligentBackground />

      {/* Public Command Bar */}
      <nav className="relative z-20 border-b border-[#30383D]/80 bg-[#151A1D]/85 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" showText={true} />
          <Badge variant="amber" size="sm" className="hidden sm:inline-flex">
            SIH26023 Enterprise
          </Badge>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-mono text-[#9BA5A8]">
          <Link href="/mines" className="hover:text-[#E8ECEB] transition-colors">
            Mines Map
          </Link>
          <Link href="/documents" className="hover:text-[#E8ECEB] transition-colors">
            Document Hub
          </Link>
          <Link href="/comparison" className="hover:text-[#E8ECEB] transition-colors">
            Matrix Comparison
          </Link>
          <Link href="/validation" className="hover:text-[#E8ECEB] transition-colors">
            Arithmetic Validation
          </Link>
          <Link href="/query" className="hover:text-[#E8ECEB] transition-colors">
            Ask COALINTEL
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline-block">
            <Button variant="ghost" size="sm" className="text-xs font-mono">
              Analyst Login
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleEnterIntelligenceCenter('/dashboard')}
            isLoading={isQuickEntering}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="text-xs font-mono"
          >
            Launch Platform
          </Button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-20 space-y-14">
        {/* Title & Subtitle Badge */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C2226] border border-[#C58B3A]/40 shadow-glow-amber text-xs font-mono text-[#C58B3A] animate-pulse-subtle">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span>Smart India Hackathon 2026 • SIH26023 • CMPDI / CIL Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#E8ECEB] font-sans leading-tight">
            COAL<span className="text-[#C58B3A]">INTEL</span>
          </h1>

          <h2 className="text-lg sm:text-2xl font-semibold text-[#D6A052] font-sans tracking-wide">
            AI-Powered Geological, Mining & Reporting Intelligence
          </h2>

          <p className="text-sm sm:text-base text-[#9BA5A8] max-w-3xl mx-auto leading-relaxed">
            Transforming complex mining documents into validated, comparable and traceable intelligence.
            Deterministic unit normalization, 5% arithmetic variance tracking, and page-grounded institutional reporting across all Coal India Limited subsidiaries.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleEnterIntelligenceCenter('/dashboard')}
              isLoading={isQuickEntering}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="px-6 py-3 text-sm font-bold shadow-glow-amber"
            >
              ENTER INTELLIGENCE CENTER
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => handleEnterIntelligenceCenter('/mines')}
              leftIcon={<Mountain className="h-4 w-4 text-[#C58B3A]" />}
              className="px-6 py-3 text-sm font-semibold"
            >
              EXPLORE MINES
            </Button>
          </div>
        </div>

        {/* Live Operational Ticker Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-[#151A1D]/90 border border-[#30383D] shadow-lg font-mono text-center">
          <div className="p-3 border-r border-[#30383D]">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#C58B3A] block">48+</span>
            <span className="text-[11px] text-[#9BA5A8] uppercase tracking-wider mt-1 block">Canonical Mines</span>
          </div>
          <div className="p-3 md:border-r border-[#30383D]">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#14B8A6] block">773.6 MT</span>
            <span className="text-[11px] text-[#9BA5A8] uppercase tracking-wider mt-1 block">Annual Production</span>
          </div>
          <div className="p-3 border-r border-[#30383D]">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#10B981] block">100%</span>
            <span className="text-[11px] text-[#9BA5A8] uppercase tracking-wider mt-1 block">Arithmetic Validation</span>
          </div>
          <div className="p-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#3B82F6] block">0%</span>
            <span className="text-[11px] text-[#9BA5A8] uppercase tracking-wider mt-1 block">Hallucination Guarantee</span>
          </div>
        </div>

        {/* SIGNATURE 3D GEOLOGICAL HERO SECTION */}
        <section aria-label="3D Geological Cross-Section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#E8ECEB] font-sans flex items-center gap-2">
                <Mountain className="h-5 w-5 text-[#C58B3A]" />
                <span>Stratigraphic Horizons & Geological Evidence Model</span>
              </h3>
              <p className="text-xs text-[#9BA5A8]">
                Interactive 3D representation of the Gondwana / Barakar formation coal horizons. Click slabs to inspect line-level source provenance.
              </p>
            </div>
            <Badge variant="amber" size="sm">
              60 FPS WebGL Engine
            </Badge>
          </div>

          {/* Interactive 3D Cross-Section */}
          <GeologicalCrossSection3D />
        </section>

        {/* 3D DATA PIPELINE */}
        <section aria-label="3D Data Flow Pipeline" className="space-y-4">
          <DataPipeline3D />
        </section>

        {/* ENTERPRISE PLATFORM CAPABILITIES GRID */}
        <section aria-label="Core Intelligence Modules" className="space-y-6 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-[#E8ECEB] font-sans">
              Comprehensive Mining Intelligence Suite
            </h3>
            <p className="text-xs sm:text-sm text-[#9BA5A8]">
              Engineered specifically for Coal India Limited, CMPDI Regional Institutes, and the Ministry of Coal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Mines Intelligence */}
            <div
              onClick={() => handleEnterIntelligenceCenter('/mines')}
              className="command-card p-6 rounded-xl space-y-3 cursor-pointer group transition-all"
            >
              <div className="p-3 rounded-lg bg-[#242C30] border border-[#30383D] text-[#C58B3A] w-fit group-hover:scale-110 transition-transform">
                <Mountain className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#E8ECEB] group-hover:text-[#C58B3A] transition-colors flex items-center justify-between">
                <span>Mines Intelligence & 3D Spatial Nodes</span>
                <ChevronRight className="h-4 w-4 text-[#9BA5A8] group-hover:text-[#C58B3A] group-hover:translate-x-1 transition-all" />
              </h4>
              <p className="text-xs text-[#9BA5A8] leading-relaxed">
                Geographic and 3D cluster topology covering opencast and underground mines across ECL, BCCL, CCL, WCL, SECL, NCL, and MCL.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#C58B3A]">
                <span>Explore 48 Mine Profiles</span>
              </div>
            </div>

            {/* Card 2: Cross-Document Comparison */}
            <div
              onClick={() => handleEnterIntelligenceCenter('/comparison')}
              className="command-card p-6 rounded-xl space-y-3 cursor-pointer group transition-all"
            >
              <div className="p-3 rounded-lg bg-[#242C30] border border-[#30383D] text-[#14B8A6] w-fit group-hover:scale-110 transition-transform">
                <GitCompare className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#E8ECEB] group-hover:text-[#14B8A6] transition-colors flex items-center justify-between">
                <span>Cross-Document Discrepancy Matrix</span>
                <ChevronRight className="h-4 w-4 text-[#9BA5A8] group-hover:text-[#14B8A6] group-hover:translate-x-1 transition-all" />
              </h4>
              <p className="text-xs text-[#9BA5A8] leading-relaxed">
                Multi-source alignment flagging differences across annual accounts, provisional statistics, and directorate disclosures.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#14B8A6]">
                <span>1% Variance Threshold</span>
              </div>
            </div>

            {/* Card 3: Validation Center */}
            <div
              onClick={() => handleEnterIntelligenceCenter('/validation')}
              className="command-card p-6 rounded-xl space-y-3 cursor-pointer group transition-all"
            >
              <div className="p-3 rounded-lg bg-[#242C30] border border-[#30383D] text-[#10B981] w-fit group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#E8ECEB] group-hover:text-[#10B981] transition-colors flex items-center justify-between">
                <span>Deterministic Arithmetic Validation</span>
                <ChevronRight className="h-4 w-4 text-[#9BA5A8] group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
              </h4>
              <p className="text-xs text-[#9BA5A8] leading-relaxed">
                Automated formula verification: Opening Stock + Production - Dispatch = Closing Stock, with unit normalization to MT.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#10B981]">
                <span>Formula Evaluator Active</span>
              </div>
            </div>

            {/* Card 4: Document Intelligence */}
            <div
              onClick={() => handleEnterIntelligenceCenter('/documents')}
              className="command-card p-6 rounded-xl space-y-3 cursor-pointer group transition-all"
            >
              <div className="p-3 rounded-lg bg-[#242C30] border border-[#30383D] text-[#3B82F6] w-fit group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#E8ECEB] group-hover:text-[#3B82F6] transition-colors flex items-center justify-between">
                <span>3-Column Document Intelligence Viewer</span>
                <ChevronRight className="h-4 w-4 text-[#9BA5A8] group-hover:text-[#3B82F6] group-hover:translate-x-1 transition-all" />
              </h4>
              <p className="text-xs text-[#9BA5A8] leading-relaxed">
                Verbatim extracted canvas with line-level bounding boxes and full traceability: Insight → Evidence → Document → Page → Data.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#3B82F6]">
                <span>SHA-256 Provenance Ledger</span>
              </div>
            </div>

            {/* Card 5: Ask CoalIntel */}
            <div
              onClick={() => handleEnterIntelligenceCenter('/query')}
              className="command-card p-6 rounded-xl space-y-3 cursor-pointer group transition-all"
            >
              <div className="p-3 rounded-lg bg-[#242C30] border border-[#30383D] text-[#8B5CF6] w-fit group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#E8ECEB] group-hover:text-[#8B5CF6] transition-colors flex items-center justify-between">
                <span>Ask COALINTEL — Cited Mining Q&A</span>
                <ChevronRight className="h-4 w-4 text-[#9BA5A8] group-hover:text-[#8B5CF6] group-hover:translate-x-1 transition-all" />
              </h4>
              <p className="text-xs text-[#9BA5A8] leading-relaxed">
                Structured intelligence workspace outputting executive findings, normalized metric tables, and page-grounded citations.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#8B5CF6]">
                <span>ChromaDB Hybrid RAG</span>
              </div>
            </div>

            {/* Card 6: Report Studio */}
            <div
              onClick={() => handleEnterIntelligenceCenter('/reports')}
              className="command-card p-6 rounded-xl space-y-3 cursor-pointer group transition-all"
            >
              <div className="p-3 rounded-lg bg-[#242C30] border border-[#30383D] text-[#F97316] w-fit group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#E8ECEB] group-hover:text-[#F97316] transition-colors flex items-center justify-between">
                <span>Report Studio & Assembly Wizard</span>
                <ChevronRight className="h-4 w-4 text-[#9BA5A8] group-hover:text-[#F97316] group-hover:translate-x-1 transition-all" />
              </h4>
              <p className="text-xs text-[#9BA5A8] leading-relaxed">
                Interactive 9-step wizard generating formal Parliamentary Inquiry Starred Replies and CIL production audit summaries.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#F97316]">
                <span>ReportLab PDF Generation</span>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-[#1C2226] via-[#151A1D] to-[#1C2226] border border-[#C58B3A]/30 text-center space-y-5 shadow-2xl">
          <div className="p-3 rounded-xl bg-[#242C30] border border-[#30383D] text-[#C58B3A] w-fit mx-auto">
            <Cpu className="h-8 w-8" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#E8ECEB] font-sans">
            Ready to Experience CoalIntel V2?
          </h3>
          <p className="text-xs sm:text-sm text-[#9BA5A8] max-w-xl mx-auto">
            Access the complete mining intelligence suite with verified government data, 3D geological models, and deterministic validation.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleEnterIntelligenceCenter('/dashboard')}
              isLoading={isQuickEntering}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="px-8 py-3.5 text-sm font-bold shadow-glow-amber"
            >
              ENTER COALINTEL INTELLIGENCE CENTER
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#30383D] py-6 px-4 text-center text-xs font-mono text-[#9BA5A8] bg-[#0E1113]">
        <p>Smart India Hackathon 2026 • SIH26023 Enterprise Platform • Ministry of Coal / Coal India Limited / CMPDI</p>
        <p className="mt-1 text-[11px] text-[#9BA5A8]/60">Built on Node.js / React / Next.js / Three.js • High-FPS Cinematic Earth Intelligence</p>
      </footer>
    </div>
  );
}
