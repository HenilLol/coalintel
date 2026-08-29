from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.models.data_conflict import DataConflict
from app.models.document import Document
from app.core.rbac import get_current_user, require_roles
from app.schemas.validation import ValidationItemResponse, ConflictResponse, ConflictResolveRequest
from app.services.validation_service import run_deterministic_validation_feed
from app.services.conflict_service import detect_and_register_cross_document_conflicts, resolve_data_conflict

router = APIRouter(tags=["Validation & Conflict Resolver"])


@router.get("/validation/feed", response_model=List[ValidationItemResponse])
def get_validation_feed(
    subsidiary_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns deterministic arithmetic validation warnings (> 5% discrepancy) and data quality feed items.
    """
    items = run_deterministic_validation_feed(
        db=db,
        subsidiary_filter=subsidiary_filter or current_user.subsidiary
    )
    return [ValidationItemResponse.model_validate(i) for i in items]


@router.get("/conflicts", response_model=List[ConflictResponse])
def list_conflicts(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers cross-document conflict detection engine (> 1% threshold) and returns conflicts.
    """
    # Trigger conflict engine scan
    detect_and_register_cross_document_conflicts(db)

    query = db.query(DataConflict)
    if status_filter:
        query = query.filter(DataConflict.status == status_filter.upper())
    
    conflicts = query.order_by(DataConflict.created_at.desc()).all()

    # Map filename relationships for Document A and Document B
    response_list = []
    for c in conflicts:
        doc_a = db.query(Document).filter(Document.id == c.document_a_id).first()
        doc_b = db.query(Document).filter(Document.id == c.document_b_id).first()
        
        response_list.append(ConflictResponse(
            id=c.id,
            mine_name=c.mine_name,
            subsidiary=c.subsidiary,
            metric_name=c.metric_name,
            fiscal_year=c.fiscal_year,
            document_a_id=c.document_a_id,
            document_a_filename=doc_a.filename if doc_a else f"Doc #{c.document_a_id}",
            document_a_value=c.document_a_value,
            document_a_unit=c.document_a_unit or "MT",
            document_b_id=c.document_b_id,
            document_b_filename=doc_b.filename if doc_b else f"Doc #{c.document_b_id}",
            document_b_value=c.document_b_value,
            document_b_unit=c.document_b_unit or "MT",
            discrepancy_percentage=c.discrepancy_percentage,
            status=c.status,
            resolved_by=c.resolved_by,
            resolution_notes=c.resolution_notes,
            created_at=c.created_at
        ))

    return response_list


@router.post("/conflicts/{id}/resolve", response_model=ConflictResponse)
def resolve_conflict_endpoint(
    id: int,
    payload: ConflictResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "Reviewer"]))
):
    """
    Resolves an open cross-document conflict record.
    Requires Admin or Reviewer RBAC role. Appends immutable audit log.
    """
    try:
        updated = resolve_data_conflict(
            db=db,
            conflict_id=id,
            user_id=current_user.id,
            resolution_action=payload.resolution_action,
            override_value=payload.override_value,
            notes=payload.notes
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )

    doc_a = db.query(Document).filter(Document.id == updated.document_a_id).first()
    doc_b = db.query(Document).filter(Document.id == updated.document_b_id).first()

    return ConflictResponse(
        id=updated.id,
        mine_name=updated.mine_name,
        subsidiary=updated.subsidiary,
        metric_name=updated.metric_name,
        fiscal_year=updated.fiscal_year,
        document_a_id=updated.document_a_id,
        document_a_filename=doc_a.filename if doc_a else f"Doc #{updated.document_a_id}",
        document_a_value=updated.document_a_value,
        document_a_unit=updated.document_a_unit or "MT",
        document_b_id=updated.document_b_id,
        document_b_filename=doc_b.filename if doc_b else f"Doc #{updated.document_b_id}",
        document_b_value=updated.document_b_value,
        document_b_unit=updated.document_b_unit or "MT",
        discrepancy_percentage=updated.discrepancy_percentage,
        status=updated.status,
        resolved_by=updated.resolved_by,
        resolution_notes=updated.resolution_notes,
        created_at=updated.created_at
    )
