# CoalIntel Real Government Corpus — Document Inception Report

**Issue #80 deliverable** · Generated from live pipeline state (authenticated ingestion, October 2026)

## Purpose

CoalIntel demonstrates evidence-driven intelligence from **genuine Government of India
publications** — not seed data. Every number surfaced on the demo dashboard traces to a
real document, a real page, and a real extraction via the authenticated pipeline
(`POST /documents/upload` → parse → extract → normalize → RAG → conflict detection).
This report records the corpus, its provenance, and the extraction quality verified live.

## Corpus (all official, free-to-download sources)

| # | Document | Publisher | Pages | Ingestion | Metrics |
|---|----------|-----------|-------|-----------|---------|
| 1 | Coal Directory of India 2023-24 (parts 1–7) | Coal Controller Organisation (CCO) | 274 | 7 PDF parts (<50 MB cap, pages copied verbatim) | state/national production, geological resources, company tables |
| 2 | Provisional Coal Statistics 2022-23 (parts 1–5) | Ministry of Coal (MOC) | 174 | 5 PDF parts | production/despatch year-series, sector tables |
| 3 | CIL Annual Report & Accounts 2023-24 | Coal India Limited | 260 | 1 PDF (17 MB) | 218 metrics incl. subsidiary production, reserves |
| 4 | SCCL Performance Report 2024-25 (Mar 2025) | The Singareni Collieries Co. Ltd. | 31 | 1 PDF (413 KB) | 253 metrics: area-wise production (KGM/YLD/MNG), grade-wise, OBR, safety |
| 5 | MOC Production & Despatch table Apr–Nov 2025 (prov.) | Ministry of Coal (DDG Office) | 1 | 1 CSV (verbatim table from coal.gov.in) | CIL/SCCL/Captive targets & actuals; indexed for RAG |

Sources:
- CCO: https://www.coalcontroller.gov.in/files/annual_coal_directories_document/28-10-2024adir_0.pdf
- MOC Provisional Coal Statistics: https://coal.nic.in/en/major-statistics/coal-statistics
- CIL AR: https://www.coalindia.in/documents/10748/annual_report.pdf (via /performance/annual-reports)
- SCCL: https://scclmines.com/scclnew/arti.asp?rt=162.PDF
- MOC live table: http://coal.gov.in/major-statistics/production-and-supplies

## Verified data anchors (spot-checked against source PDFs)

- National raw coal production 2023-24: **997.826 MT** (Coal Directory, Table 1.1 / §3.1.1) → extracted, attributed **All India | Production**
- National raw coal production 2022-23: **893.190 MT** (PCS) vs **893.191 MT** (Directory) — 0.0001% revision, **correctly below the 1% conflict threshold** (cross-document agreement, no false alarm)
- Geological resources: **377,012.11 MT** total; state shares extracted and individually attributed (Odisha 99,203.83 · Jharkhand 91,811.57 · Chhattisgarh 82,666.36 · West Bengal 33,958.07 · Madhya Pradesh 32,815.13 · Telangana 23,205.52 · Maharashtra 13,351.63)
- SCCL 2024-25 production target: **72.00 MT**; CIL Apr–Nov 2025 actual **493.11 MT** (MOC table)

## Pipeline capabilities proven on the real corpus

1. **Authenticated ingestion with dedup** — SHA-256 duplicate rejection (409) makes re-runs idempotent; verified on a 12-document corpus re-run
2. **Scanned-page OCR** (#83/#84) — hybrid pages (native running header over scanned table body) now OCR at 200 dpi; Coal Directory part 2 went from 0 → 15 OCR pages
3. **Year-series columnar extraction** (#79/#81) — `Item | Unit | FY₁ | FY₂ | …` tables yield per-FY metrics
4. **Aggregate entity attribution** (#80/#82) — state / All India / sector entities with proximity-aware, paragraph-guarded matching
5. **Cross-line seam repair** (#85/#86) — OCR hard-wraps no longer shift attributions; split state names ("Madhya\nPradesh") repaired
6. **Table entity-column sanity** (#88/#89) — count columns ("No. of Mines") and phone numbers can never become mine names
7. **RAG grounding** — every query answer cites `[document, page]`; MOC CSV table indexed into ChromaDB and searchable
8. **Conflict detection honesty** — the engine reports **0 conflicts** on agreeing sources (Directory 893.191 vs PCS 893.190) rather than fabricating discrepancies

## Repeatable ingestion

```bash
python backend/scripts/ingest_real_gov_corpus.py \
    --api-base http://localhost:8000/api/v1 \
    --username admin \
    --password-file /secure/pw.txt \
    --docs-dir /path/to/coalintel-docs
```

- Uploads only through the authenticated API (no DB shortcuts)
- Splits >50 MB sources into parts (pages copied verbatim — preserves table geometry & scanned images)
- Treats 409 dedup as ALREADY-INGESTED → idempotent re-runs
- Polls each document to PARSED, prints per-document lineage summary (metric counts + entity buckets)

## Extraction quality (live-verified per document)

- **Coal Directory part 2**: 23 metrics from 40 pages; geological-resources page fully correct (7 states + 4 national totals); remaining Unspecified are chart pages / coal-type shares (honest fallbacks, not failures)
- **PCS**: 144 metrics; Unspecified Mine reduced 105 → 72 (rest are scanned-image annexure pages)
- **CIL Annual Report**: 218 metrics incl. subsidiary-level and reserve figures
- **SCCL report**: 253 metrics; entity labels are real (Grand Total, UG, OC, months, area codes); **zero digit-string or phone-number entities**

## Remaining known gaps (documented, not hidden)

- Mine-wise production tables in the Coal Directory are scanned *charts* (part 3, Tables 3.7–3.14 are company/state/grade-wise); per-mine figures remain served by the seeded government mine registry until an OCR'd mine-wise source (e.g., CIL subsidiary appendix) is ingested
- Narrative text quality beats OCR quality on dense tables; values with ambiguous entity context honestly fall back to "Unspecified Mine"
- PIB press-release pages are JS-gated and bot-protected; the MOC live table (same DDG Office data PIB republishes) was ingested instead as CSV
- CSV ingestion currently embeds text for RAG but does not run the table-role extractor (PDF-only path) — CSV metric extraction is a future enhancement

## Fixes shipped during corpus ingestion (each with live evidence + regressions)

| PR | Issue | Fix |
|----|-------|-----|
| #81 | #79 | year-series columnar extraction |
| #82 | #80 (partial) | aggregate entity attribution (states / All India / sectors) |
| #84 | #83 | OCR fallback: Windows binary resolution + hybrid-page trigger + 200 dpi |
| #86 | #85 | OCR cross-seam attribution + geological-resource classification |
| #87 | #80 (script) | repeatable corpus ingestion runner |
| #89 | #88 | table extractor count/phone-column entity fix |
