from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.core.rbac import get_current_user, require_roles
from app.schemas.document import DocumentResponse, DocumentListResponse, DocumentPagesResponse, DocumentPageItem
from app.services.ingestion_service import process_file_ingestion
from app.services.processing_pipeline import execute_document_processing_pipeline

router = APIRouter(tags=["Documents"])


@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subsidiary: Optional[str] = Form(None),
    fiscal_year: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin", "Analyst"]))
):
    """
    Ingests a raw document file (.pdf, .docx, .xlsx, .csv up to 100MB).
    - Enforces max size limit (100MB) and extension whitelist.
    - Computes SHA-256 digest and blocks duplicate uploads with HTTP 409 Conflict.
    - Saves file safely to encapsulated storage path (/storage/uploads/).
    - Inserts document record with status 'PENDING' and logs audit event.
    - Triggers Day 4 Document Processing Pipeline (Parsing, Chunking, Extraction, Unit Normalization).
    """
    file_bytes = await file.read()
    
    doc = process_file_ingestion(
        db=db,
        file_bytes=file_bytes,
        original_filename=file.filename or "uploaded_file.pdf",
        user_id=current_user.id,
        subsidiary=subsidiary or current_user.subsidiary,
        fiscal_year=fiscal_year or "2023-24"
    )

    # Synchronously execute Day 4 pipeline for instant parsing and DB metric extraction
    execute_document_processing_pipeline(db, doc.id)
    db.refresh(doc)
    
    return DocumentResponse.model_validate(doc)


@router.get("/documents", response_model=DocumentListResponse)
def list_documents(
    status_filter: Optional[str] = None,
    subsidiary_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves paginated list of uploaded documents with status and subsidiary filter options.
    """
    query = db.query(Document)
    
    if status_filter:
        query = query.filter(Document.status == status_filter.upper())
    if subsidiary_filter and subsidiary_filter != "ALL":
        query = query.filter(Document.subsidiary == subsidiary_filter)
        
    total = query.count()
    items = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    
    return DocumentListResponse(
        total=total,
        items=[DocumentResponse.model_validate(d) for d in items]
    )


@router.get("/documents/{id}", response_model=DocumentResponse)
def get_document_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves document metadata by ID."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID #{id} not found."
        )
    return DocumentResponse.model_validate(doc)


@router.get("/documents/{id}/pages", response_model=DocumentPagesResponse)
def get_document_pages(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves document page breakdown and extracted text snippets for document page viewer.
    """
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID #{id} not found."
        )
        
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == id).order_by(DocumentChunk.page_number, DocumentChunk.chunk_index).all()
    
    # Group text snippets per page
    page_map = {}
    for chunk in chunks:
        pg = chunk.page_number
        if pg not in page_map:
            page_map[pg] = []
        page_map[pg].append(chunk.chunk_text)
        
    pages = [
        DocumentPageItem(page_number=pg, text_snippet="\n\n".join(snippets))
        for pg, snippets in sorted(page_map.items())
    ]
    
    return DocumentPagesResponse(
        document_id=doc.id,
        filename=doc.filename,
        total_pages=doc.total_pages or len(pages),
        pages=pages
    )
