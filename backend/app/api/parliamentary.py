import os
import io
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.extracted_metric import ExtractedMetric
from app.models.data_conflict import DataConflict
from app.core.rbac import get_current_user
from app.schemas.parliamentary import (
    ParliamentaryBriefingRequest,
    ParliamentaryBriefingResponse,
    SubsidiaryMetricItem,
    FlaggedDiscrepancyItem,
    BriefingEvidenceItem,
)
from app.services.rag_service import execute_rag_query
from app.services.conflict_service import (
    get_metric_domain,
    are_units_compatible,
    is_generic_mine_name,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Parliamentary & Executive Briefing Intelligence"])


# Try importing ReportLab for PDF generation
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


@router.post("/parliamentary/briefing", response_model=ParliamentaryBriefingResponse)
def generate_parliamentary_briefing(
    payload: ParliamentaryBriefingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parliamentary Question & Executive Briefing Intelligence Engine.
    Orchestrates RAG retrieval, structured metric extractions, deterministic validation,
    and cross-document conflict detection into an auditable institutional briefing.
    """
    question_text = payload.question_text.strip()
    if not question_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question text cannot be empty."
        )

    scope = payload.subsidiary_filter or "ALL CIL"
    fy = payload.fiscal_year or "2023-24"
    q_type = (payload.question_type or "GENERAL").upper()

    # 1. Query structured DB metrics for the selected scope & fiscal year
    metric_query = db.query(ExtractedMetric, Document).join(
        Document, ExtractedMetric.document_id == Document.id
    )

    if scope.upper() not in ["ALL", "ALL CIL"]:
        metric_query = metric_query.filter(Document.subsidiary == scope)

    if fy and fy.upper() != "ALL":
        metric_query = metric_query.filter(ExtractedMetric.fiscal_year == fy)

    extracted_records = metric_query.order_by(ExtractedMetric.id.desc()).limit(20).all()

    # 2. Execute Hybrid RAG Search for context & citations
    rag_result = execute_rag_query(
        db=db,
        query_text=question_text,
        top_k=6,
        subsidiary_filter=scope if scope.upper() not in ["ALL", "ALL CIL"] else None
    )

    evidence_chunks = rag_result.get("evidence_chunks", [])
    
    # 3. Handle Insufficient Evidence Case
    if not extracted_records and not evidence_chunks:
        return ParliamentaryBriefingResponse(
            question=question_text,
            question_type=q_type,
            fiscal_year=fy,
            selected_scope=scope,
            executive_summary=(
                f"No official document records or extracted evidence were found in the database "
                f"matching target scope '{scope}' for Fiscal Year {fy}."
            ),
            key_findings=[
                "Insufficient evidence available in ingested repository.",
                f"No indexed documents found for target scope '{scope}'."
            ],
            subsidiary_metrics=[],
            discrepancies=[],
            evidence=[],
            confidence=0.0,
            confidence_rating="INSUFFICIENT_EVIDENCE",
            has_sufficient_evidence=False,
            limitations=[
                f"Zero source documents available in repository for '{scope}'.",
                "Cannot generate synthetic answers without verified source backing."
            ],
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        )

    # 4. Format Subsidiary Metrics
    subsidiary_metrics: List[SubsidiaryMetricItem] = []
    for m, doc in extracted_records:
        subsidiary_metrics.append(
            SubsidiaryMetricItem(
                mine_name=m.mine_name,
                subsidiary=doc.subsidiary,
                metric_name=m.metric_name,
                numeric_value=m.numeric_value,
                unit=m.unit,
                standard_value=m.standard_value,
                standard_unit=m.standard_unit,
                fiscal_year=m.fiscal_year or fy,
                page_number=m.page_number,
                document_filename=doc.filename
            )
        )

    # 5. Check for Cross-Document Discrepancies relevant to scope
    discrepancies: List[FlaggedDiscrepancyItem] = []
    conflicts_query = db.query(DataConflict).filter(DataConflict.status.in_(["ACTIVE", "OPEN"]))
    active_conflicts = conflicts_query.limit(5).all()

    for c in active_conflicts:
        doc_a_name = c.doc_a.filename if c.doc_a else f"Document #{c.doc_a_id}"
        doc_b_name = c.doc_b.filename if c.doc_b else f"Document #{c.doc_b_id}"
        sub_a = c.doc_a.subsidiary if c.doc_a else "CIL"
        sub_b = c.doc_b.subsidiary if c.doc_b else "CIL"

        # Scope filtering if specific subsidiary requested
        if scope.upper() not in ["ALL", "ALL CIL"] and scope not in [sub_a, sub_b]:
            continue

        is_seeded = "BCCL_Production_Audit_Q4.pdf" in [doc_a_name, doc_b_name]
        prov_label = "Seeded Mine-Level Discrepancy" if is_seeded else "Verified High-Precision Conflict"
        
        discrepancies.append(
            FlaggedDiscrepancyItem(
                entity=c.mine_name,
                metric_name=c.metric_name,
                fiscal_year=c.fiscal_year or fy,
                doc_a_filename=doc_a_name,
                doc_a_value=float(c.doc_a_value or 0.0),
                doc_b_filename=doc_b_name,
                doc_b_value=float(c.doc_b_value or 0.0),
                unit="MT",
                variance_percentage=float(round(c.discrepancy_pct or 0.0, 2)),
                status="DISCREPANCY DETECTED",
                is_seeded_demo=is_seeded,
                provenance_label=prov_label
            )
        )

    # 6. Format Evidence Lineage Items
    evidence_list: List[BriefingEvidenceItem] = []
    for chunk in evidence_chunks:
        evidence_list.append(
            BriefingEvidenceItem(
                chunk_id=chunk.get("chunk_id"),
                document_id=chunk.get("document_id", 0),
                document_name=chunk.get("filename", "Document.pdf"),
                page_number=chunk.get("page_number", 1),
                chunk_index=chunk.get("chunk_index", 0),
                text_snippet=chunk.get("text", "")[:300],
                rrf_score=round(chunk.get("rrf_score", 0.0), 4),
                subsidiary=scope
            )
        )

    # 7. Synthesize Executive Summary & Key Findings
    rag_answer = rag_result.get("answer", "")
    exec_summary = (
        f"Parliamentary Briefing Note compiled for target scope '{scope}' ({fy}). "
        f"{rag_answer}"
    )

    key_findings = []
    if subsidiary_metrics:
        first_m = subsidiary_metrics[0]
        key_findings.append(f"Recorded {first_m.metric_name} for {first_m.mine_name} ({first_m.subsidiary}): {first_m.standard_value:.2f} {first_m.standard_unit}.")
    if len(subsidiary_metrics) > 1:
        key_findings.append(f"Total {len(subsidiary_metrics)} verified operational metrics extracted across official CIL documents.")
    if discrepancies:
        d_first = discrepancies[0]
        key_findings.append(f"Discrepancy Flagged: {d_first.entity} ({d_first.metric_name}) variance of {d_first.variance_percentage}% between {d_first.doc_a_filename} and {d_first.doc_b_filename} [{d_first.provenance_label}].")
    else:
        key_findings.append("No active metric discrepancies detected across current scope documents.")

    confidence_rating = "HIGH" if len(evidence_list) >= 3 else ("MEDIUM" if len(evidence_list) >= 1 else "LOW")
    confidence_val = 0.95 if confidence_rating == "HIGH" else (0.75 if confidence_rating == "MEDIUM" else 0.50)

    limitations = [
        "Analysis relies exclusively on ingested official reports and indexed database metrics.",
        "Deterministic arithmetic validation threshold set at >5.0%; conflict threshold set at >1.0%."
    ]

    return ParliamentaryBriefingResponse(
        question=question_text,
        question_type=q_type,
        fiscal_year=fy,
        selected_scope=scope,
        executive_summary=exec_summary,
        key_findings=key_findings,
        subsidiary_metrics=subsidiary_metrics,
        discrepancies=discrepancies,
        evidence=evidence_list,
        confidence=confidence_val,
        confidence_rating=confidence_rating,
        has_sufficient_evidence=True,
        limitations=limitations,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    )


@router.post("/parliamentary/export-pdf")
def export_parliamentary_pdf(
    payload: ParliamentaryBriefingResponse,
    current_user: User = Depends(get_current_user)
):
    """
    Generates and streams an official-styled Parliamentary Briefing Note PDF document.
    Disclaims explicitly: "AI-generated evidence-backed Parliamentary Briefing Note (Not an official Ministry issued document)".
    """
    pdf_buffer = io.BytesIO()

    if HAS_REPORTLAB:
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=4
        )
        sub_style = ParagraphStyle(
            'HeaderSub',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=12
        )
        heading2_style = ParagraphStyle(
            'SectionHead',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#334155'),
            leading=13
        )

        story = []

        # Document Header
        story.append(Paragraph("<b>COALINTEL — Parliamentary Briefing Note</b>", title_style))
        story.append(Paragraph("<i>AI-generated evidence-backed Parliamentary Briefing Note (Not an official Ministry issued document)</i>", sub_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

        # Metadata Table
        meta_data = [
            ["Question:", payload.question],
            ["Target Scope:", payload.selected_scope],
            ["Fiscal Year:", payload.fiscal_year],
            ["Confidence Rating:", f"{payload.confidence_rating} ({payload.confidence * 100:.0f}%)"],
            ["Generated Timestamp:", payload.generated_at]
        ]
        meta_table = Table(meta_data, colWidths=[120, 400])
        meta_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1E293B')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # Executive Summary
        story.append(Paragraph("<b>Executive Summary</b>", heading2_style))
        story.append(Paragraph(payload.executive_summary, body_style))
        story.append(Spacer(1, 10))

        # Key Findings
        story.append(Paragraph("<b>Key Findings & Operational Highlights</b>", heading2_style))
        for finding in payload.key_findings:
            story.append(Paragraph(f"• {finding}", body_style))
        story.append(Spacer(1, 10))

        # Subsidiary Metrics Table
        if payload.subsidiary_metrics:
            story.append(Paragraph("<b>Verified Operational Metrics</b>", heading2_style))
            m_table_data = [["Mine Entity", "Subsidiary", "Metric Name", "Value", "Unit", "FY"]]
            for m in payload.subsidiary_metrics:
                m_table_data.append([
                    m.mine_name,
                    m.subsidiary,
                    m.metric_name,
                    f"{m.standard_value:.2f}",
                    m.standard_unit,
                    m.fiscal_year
                ])
            m_table = Table(m_table_data, colWidths=[100, 70, 150, 60, 50, 60])
            m_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(m_table)
            story.append(Spacer(1, 10))

        # Discrepancies Section
        if payload.discrepancies:
            story.append(Paragraph("<b>Flagged Cross-Document Discrepancies</b>", heading2_style))
            d_table_data = [["Entity", "Metric", "Doc A (Val)", "Doc B (Val)", "Variance", "Provenance Status"]]
            for d in payload.discrepancies:
                d_table_data.append([
                    d.entity,
                    d.metric_name,
                    f"{d.doc_a_filename} ({d.doc_a_value:.2f})",
                    f"{d.doc_b_filename} ({d.doc_b_value:.2f})",
                    f"{d.variance_percentage}%",
                    d.provenance_label
                ])
            d_table = Table(d_table_data, colWidths=[90, 80, 130, 130, 50, 100])
            d_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#991B1B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FCA5A5')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(d_table)
            story.append(Spacer(1, 10))

        # Limitations Footer
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceBefore=10, spaceAfter=8))
        story.append(Paragraph("<b>Limitations & System Disclaimers:</b>", body_style))
        for lim in payload.limitations:
            story.append(Paragraph(f"• {lim}", sub_style))

        doc.build(story)
        pdf_bytes = pdf_buffer.getvalue()
    else:
        # Fallback PDF writer if reportlab missing
        text_content = (
            f"%PDF-1.4\nCOALINTEL Parliamentary Briefing Note\n"
            f"Question: {payload.question}\nScope: {payload.selected_scope}\n"
            f"Summary: {payload.executive_summary}\n"
        )
        pdf_bytes = text_content.encode("utf-8")

    filename = f"Parliamentary_Briefing_{payload.selected_scope}_{payload.fiscal_year}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
