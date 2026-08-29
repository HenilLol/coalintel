import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.extracted_metric import ExtractedMetric
from app.models.document import Document
from app.models.data_conflict import DataConflict
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

CONFLICT_THRESHOLD_PERCENT = 1.0  # Frozen 1.0% threshold


def detect_and_register_cross_document_conflicts(db: Session) -> int:
    """
    Scans extracted_metrics for identical (mine_name, metric_name, fiscal_year) triplets
    across different ingested documents.
    If standard values differ by > 1.0%, creates a DataConflict record (status='OPEN').
    Prevents duplicate logical conflict record creation.
    Returns count of newly registered conflicts.
    """
    metrics = db.query(ExtractedMetric, Document.filename).\
        join(Document, ExtractedMetric.document_id == Document.id).all()

    # Group metrics by (mine_name, metric_name, fiscal_year)
    metric_groups: Dict[tuple, List[tuple]] = {}
    for m, fname in metrics:
        key = (m.mine_name.strip().lower(), m.metric_name.strip().lower(), m.fiscal_year)
        if key not in metric_groups:
            metric_groups[key] = []
        metric_groups[key].append((m, fname))

    new_conflicts_count = 0

    for key, group in metric_groups.items():
        if len(group) < 2:
            continue  # Need at least two different records to compare

        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                m_a, fname_a = group[i]
                m_b, fname_b = group[j]

                # Only compare across distinct documents
                if m_a.document_id == m_b.document_id:
                    continue

                val_a = m_a.standard_value
                val_b = m_b.standard_value

                ref_val = max(abs(val_a), abs(val_b))
                if ref_val == 0:
                    continue

                diff = abs(val_a - val_b)
                pct_diff = round((diff / ref_val) * 100.0, 2)

                # Check > 1.0% conflict threshold
                if pct_diff > CONFLICT_THRESHOLD_PERCENT:
                    doc_min_id = min(m_a.document_id, m_b.document_id)
                    doc_max_id = max(m_a.document_id, m_b.document_id)

                    # Check for duplicate existing conflict record
                    existing = db.query(DataConflict).filter(
                        DataConflict.mine_name == m_a.mine_name,
                        DataConflict.metric_name == m_a.metric_name,
                        DataConflict.fiscal_year == m_a.fiscal_year,
                        or_(
                            (DataConflict.document_a_id == m_a.document_id) & (DataConflict.document_b_id == m_b.document_id),
                            (DataConflict.document_a_id == m_b.document_id) & (DataConflict.document_b_id == m_a.document_id)
                        )
                    ).first()

                    if not existing:
                        conflict_rec = DataConflict(
                            document_a_id=m_a.document_id,
                            document_b_id=m_b.document_id,
                            mine_name=m_a.mine_name,
                            subsidiary=m_a.subsidiary,
                            metric_name=m_a.metric_name,
                            fiscal_year=m_a.fiscal_year,
                            document_a_value=val_a,
                            document_a_unit=m_a.standard_unit,
                            document_b_value=val_b,
                            document_b_unit=m_b.standard_unit,
                            discrepancy_percentage=pct_diff,
                            status="OPEN"
                        )
                        db.add(conflict_rec)
                        new_conflicts_count += 1
                        logger.info(
                            f"Registered cross-document conflict for {m_a.mine_name} ({m_a.metric_name}): "
                            f"{val_a} vs {val_b} ({pct_diff}% diff > 1%)."
                        )

    if new_conflicts_count > 0:
        db.commit()

    return new_conflicts_count


def resolve_data_conflict(
    db: Session,
    conflict_id: int,
    user_id: int,
    resolution_action: str,
    override_value: Optional[float] = None,
    notes: Optional[str] = None
) -> DataConflict:
    """
    Resolves an open data conflict and appends an immutable audit log entry.
    """
    conflict = db.query(DataConflict).filter(DataConflict.id == conflict_id).first()
    if not conflict:
        raise ValueError(f"Conflict ID #{conflict_id} not found.")

    conflict.status = "RESOLVED"
    conflict.resolved_by = user_id
    conflict.resolution_notes = notes or f"Resolved via action '{resolution_action}' by User #{user_id}"

    # Log resolution event in audit_logs
    audit_entry = AuditLog(
        user_id=user_id,
        action="CONFLICT_RESOLVE",
        resource_type="DataConflict",
        resource_id=conflict.id,
        details=f"Resolved conflict #{conflict.id} for {conflict.mine_name} ({conflict.metric_name}). Action: {resolution_action}.",
        details_json={
            "conflict_id": conflict.id,
            "mine_name": conflict.mine_name,
            "metric_name": conflict.metric_name,
            "resolution_action": resolution_action,
            "override_value": override_value
        }
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(conflict)

    return conflict
