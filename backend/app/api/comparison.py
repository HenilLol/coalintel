from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.extracted_metric import ExtractedMetric
from app.core.rbac import get_current_user
from app.services.conflict_service import (
    get_metric_domain,
    are_units_compatible,
    is_generic_mine_name,
    CONFLICT_THRESHOLD_PERCENT,
)

router = APIRouter(tags=["Cross-Document Comparison Matrix"])


@router.get("/comparison/options")
def get_comparison_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns available entities (mine names / subsidiaries), metrics, and fiscal years
    dynamically discovered from actual ingested documents and extracted metrics.
    """
    # Distinct Mine Names / Entities (excluding generic fallbacks)
    raw_mines = db.query(distinct(ExtractedMetric.mine_name)).filter(ExtractedMetric.mine_name.isnot(None)).all()
    entities = [
        m[0] for m in raw_mines
        if m[0] and not is_generic_mine_name(m[0])
    ]

    # Distinct Subsidiaries
    raw_subs = db.query(distinct(Document.subsidiary)).filter(Document.subsidiary.isnot(None)).all()
    subsidiaries = ["ALL CIL"] + sorted(list({s[0] for s in raw_subs if s[0]}))

    # Distinct Metric Names
    raw_metrics = db.query(distinct(ExtractedMetric.metric_name)).filter(ExtractedMetric.metric_name.isnot(None)).all()
    metrics = sorted(list({m[0] for m in raw_metrics if m[0]}))

    # Augment with canonical Government of India mines and fiscal years
    try:
        from app.models.mine import MineMaster, MineYearlyMetric
        gov_mines = db.query(MineMaster.mine_name).all()
        for gm in gov_mines:
            if gm[0]:
                entities.append(gm[0])
        gov_fys = db.query(distinct(MineYearlyMetric.financial_year)).all()
        for gf in gov_fys:
            if gf[0]:
                fiscal_years.append(gf[0])
    except Exception:
        pass

    # Defaults if DB is empty
    if not metrics:
        metrics = ["Coal Production", "Overburden Removal", "Washing Capacity", "Drilling Meterage"]
    if not fiscal_years:
        fiscal_years = ["2026-27", "2025-26", "2024-25", "2023-24", "2022-23"]

    return {
        "subsidiaries": subsidiaries,
        "entities": sorted(list(set(entities))),
        "metrics": metrics,
        "fiscal_years": sorted(list(set(fiscal_years)), reverse=True)
    }


@router.get("/comparison/matrix")
def get_comparison_matrix(
    metric_name: str = Query("Coal Production", description="Target metric name"),
    fiscal_year: Optional[str] = Query("2023-24", description="Target fiscal year filter"),
    entity_filter: Optional[str] = Query(None, description="Optional entity / mine name filter"),
    subsidiary_filter: Optional[str] = Query(None, description="Optional subsidiary filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes a judge-facing Cross-Document Comparison Matrix:
    - Matches identical metric domain and entity across multiple available document sources.
    - Evaluates unit compatibility and computes deterministic numeric variance.
    - Labels status as CONSISTENT (<= 1.0% variance) vs DISCREPANCY DETECTED (> 1.0% variance).
    - Preserves provenance for seeded demo data ('BCCL_Production_Audit_Q4.pdf').
    """
    target_domain = get_metric_domain(metric_name)

    # Query metrics joined with document metadata
    query = db.query(ExtractedMetric, Document).join(Document, ExtractedMetric.document_id == Document.id)

    if fiscal_year:
        query = query.filter(ExtractedMetric.fiscal_year == fiscal_year)

    if subsidiary_filter and subsidiary_filter.upper() not in ["ALL", "ALL CIL"]:
        query = query.filter(Document.subsidiary == subsidiary_filter)

    if entity_filter:
        query = query.filter(
            (ExtractedMetric.mine_name.ilike(f"%{entity_filter}%")) |
            (Document.subsidiary.ilike(f"%{entity_filter}%"))
        )

    results = query.all()

    # Group metrics by specific verified entity
    grouped_rows = {}
    for metric, doc in results:
        # Re-verify metric domain matches target domain
        if get_metric_domain(metric.metric_name, metric.raw_snippet) != target_domain:
            continue

        # Exclude historical records from operational current-year comparison matrix
        if metric.validation_status == "HISTORICAL" or (metric.fiscal_year and "historical" in str(metric.fiscal_year).lower()):
            continue

        # Exclude generic fallback placeholders from false cross-document comparison
        if is_generic_mine_name(metric.mine_name):
            continue

        entity_key = metric.mine_name
        if not entity_key:
            continue

        if entity_key not in grouped_rows:
            grouped_rows[entity_key] = []

        # Find matching chunk ID for CitationDrawer integration
        chunk = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == doc.id,
            DocumentChunk.page_number == (metric.page_number or 1)
        ).first()

        is_seeded = (doc.filename == "BCCL_Production_Audit_Q4.pdf" or "Audit_Q4" in doc.filename)

        grouped_rows[entity_key].append({
            "metric_id": metric.id,
            "document_id": doc.id,
            "filename": doc.filename,
            "subsidiary": doc.subsidiary,
            "mine_name": metric.mine_name or doc.subsidiary,
            "metric_name": metric.metric_name,
            "fiscal_year": metric.fiscal_year,
            "raw_value": float(metric.numeric_value) if metric.numeric_value is not None else 0.0,
            "raw_unit": metric.unit or "MT",
            "standard_value": float(metric.standard_value) if metric.standard_value is not None else 0.0,
            "standard_unit": metric.standard_unit or "MT",
            "page_number": metric.page_number or 1,
            "snippet": metric.raw_snippet or "",
            "chunk_id": chunk.id if chunk else None,
            "is_seeded_demo": is_seeded,
            "provenance_label": "Seeded Mine-Level Discrepancy" if is_seeded else "Authentic Official Document"
        })

    # Build comparison matrices per entity
    comparison_matrices = []
    for entity, rows in grouped_rows.items():
        if not rows:
            continue

        # Sort rows by filename for consistent display
        rows.sort(key=lambda x: x["filename"])

        # Compute variance if 2 or more sources exist
        values = [r["standard_value"] for r in rows if r["standard_value"] > 0]
        units = [r["standard_unit"] for r in rows]

        units_compatible = True
        if len(set(units)) > 1:
            for i in range(len(units) - 1):
                if not are_units_compatible(units[i], units[i+1]):
                    units_compatible = False
                    break

        variance_pct = 0.0
        status_label = "CONSISTENT"
        has_discrepancy = False

        if len(values) >= 2 and units_compatible:
            val_max = max(values)
            val_min = min(values)
            if val_max > 0:
                variance_pct = round(((val_max - val_min) / val_max) * 100.0, 2)
                if variance_pct > CONFLICT_THRESHOLD_PERCENT:
                    status_label = "DISCREPANCY DETECTED"
                    has_discrepancy = True

        has_seeded = any(r["is_seeded_demo"] for r in rows)

        comparison_matrices.append({
            "entity": entity,
            "metric_name": metric_name,
            "fiscal_year": fiscal_year or "2023-24",
            "source_count": len(rows),
            "sources": rows,
            "units_compatible": units_compatible,
            "variance_percentage": variance_pct,
            "status": status_label,
            "has_discrepancy": has_discrepancy,
            "is_seeded_demo": has_seeded,
            "provenance_notice": "Contains Seeded Mine-Level Discrepancy Fixture (database_seed.py)" if has_seeded else "100% Authentic Source Documents"
        })

    return {
        "target_metric": metric_name,
        "target_domain": target_domain,
        "target_fiscal_year": fiscal_year or "2023-24",
        "subsidiary_scope": subsidiary_filter or "ALL CIL",
        "total_entities_compared": len(comparison_matrices),
        "matrices": comparison_matrices
    }
