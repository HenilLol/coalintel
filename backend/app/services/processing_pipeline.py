import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.extracted_metric import ExtractedMetric
from app.services.storage_service import file_exists
from app.services.parsing_service import parse_document_file
from app.services.chunking_service import chunk_text_by_tokens
from app.services.normalization_service import extract_entity_tuples_from_text

logger = logging.getLogger(__name__)


def execute_document_processing_pipeline(db: Session, document_id: int) -> bool:
    """
    Orchestrates the Day 4 Document Ingestion & Extraction Pipeline:
    1. Validates document existence and physical storage file presence.
    2. Updates status -> 'PROCESSING' and commits initial state.
    3. Executes PyMuPDF / Tesseract OCR page parsing.
    4. Idempotently clears previous derived chunks and metrics for this document.
    5. Splits page text into 500-token chunks and persists to document_chunks.
    6. Extracts entity metrics tuples, applies deterministic unit normalization (-> MT),
       and persists to extracted_metrics.
    7. Indexes chunk vectors into persistent ChromaDB.
    8. Updates total_pages and marks document status -> 'PARSED'.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        logger.error(f"Processing pipeline failed: Document ID #{document_id} not found.")
        return False

    # Check physical file existence before starting processing
    if not file_exists(doc.file_path):
        logger.error(f"Cannot process Document #{doc.id}: physical file missing at '{doc.file_path}'.")
        doc.status = "FAILED"
        doc.error_message = "Source document file is missing from storage. Please re-upload the document."
        db.commit()
        return False

    try:
        logger.info(f"Starting processing pipeline for Document #{doc.id} ('{doc.filename}')...")
        doc.status = "PROCESSING"
        doc.error_message = None
        db.commit()

        # Step 1: Parse Document Pages (PyMuPDF / OCR)
        pages_data = parse_document_file(doc.file_path, doc.file_type)
        total_pages = len(pages_data)
        
        if total_pages == 0:
            logger.warning(f"No pages or text extracted from Document #{doc.id}.")
            doc.status = "FAILED"
            doc.error_message = "Document parser could not extract any readable pages or text from file."
            db.commit()
            return False

        logger.info(f"Extracted {total_pages} pages for Document #{doc.id}.")

        # Step 2: Idempotent Cleanup of existing derived records for this document
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.query(ExtractedMetric).filter(ExtractedMetric.document_id == doc.id).delete()
        db.flush()

        all_chunks = []
        all_metrics = []

        # Step 3: Iterate pages -> Chunking & Metric Extraction
        for page_info in pages_data:
            page_num = page_info["page_number"]
            page_text = page_info["text"]

            # Chunking (500 tokens, 50 overlap)
            chunks = chunk_text_by_tokens(page_text, page_number=page_num)
            for c in chunks:
                all_chunks.append(DocumentChunk(
                    document_id=doc.id,
                    page_number=c["page_number"],
                    chunk_index=c["chunk_index"],
                    chunk_text=c["chunk_text"],
                    token_count=c["token_count"],
                    embedding_id=f"chunk_{doc.id}_{c['page_number']}_{c['chunk_index']}"
                ))

            # Entity Metric Extraction & Unit Normalization (-> MT)
            metric_tuples = extract_entity_tuples_from_text(
                text=page_text,
                page_number=page_num,
                default_subsidiary=doc.subsidiary or "CIL HQ",
                default_year=doc.fiscal_year or "2023-24"
            )
            for m in metric_tuples:
                all_metrics.append(ExtractedMetric(
                    document_id=doc.id,
                    page_number=m["page_number"],
                    mine_name=m["mine_name"],
                    subsidiary=m["subsidiary"],
                    metric_name=m["metric_name"],
                    numeric_value=m["numeric_value"],
                    unit=m["unit"],
                    raw_unit=m["unit"],
                    standard_value=m["standard_value"],
                    standard_unit=m["standard_unit"],
                    fiscal_year=m["fiscal_year"],
                    confidence_score=m["confidence_score"],
                    validation_status="VALIDATED",
                    raw_snippet=m["raw_snippet"]
                ))

        # Step 4: Bulk Persist to Database & ChromaDB Vector Store
        if all_chunks:
            db.bulk_save_objects(all_chunks)
            # Index chunks into ChromaDB persistent vector store
            try:
                from app.services.vector_store_service import add_chunks_to_vector_store
                add_chunks_to_vector_store(all_chunks, filename=doc.filename, subsidiary=doc.subsidiary)
            except Exception as vec_err:
                logger.warning(f"Vector store indexing note for Document #{doc.id}: {vec_err}")

        if all_metrics:
            db.bulk_save_objects(all_metrics)

        # Step 5: Update Document Metadata & Status
        doc.total_pages = total_pages
        doc.status = "PARSED"
        doc.error_message = None
        db.commit()

        logger.info(
            f"Successfully processed Document #{doc.id}: "
            f"{len(all_chunks)} chunks, {len(all_metrics)} metrics stored. Status -> PARSED."
        )
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"Pipeline error processing Document #{document_id}: {type(e).__name__} - {e}")
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = "FAILED"
                doc.error_message = f"Processing failed: {str(e)[:450]}"
                db.commit()
        except Exception as fail_err:
            logger.error(f"Failed to record failure status for Document #{document_id}: {fail_err}")
        return False


def recover_stale_processing_documents(db: Session, stale_minutes: int = 15) -> int:
    """
    Lightweight startup recovery mechanism for orphaned PROCESSING records.
    Only transitions documents that are clearly stale (> stale_minutes) AND have lost physical storage files.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=stale_minutes)
    
    stale_docs = db.query(Document).filter(Document.status == "PROCESSING").all()
    recovered_count = 0
    
    for doc in stale_docs:
        doc_time = doc.created_at
        if doc_time is not None and doc_time.tzinfo is None:
            doc_time = doc_time.replace(tzinfo=timezone.utc)
            
        is_stale = (doc_time is None) or (doc_time < cutoff)
        
        if is_stale:
            if not file_exists(doc.file_path):
                logger.warning(
                    f"Recovering stale Document #{doc.id} ('{doc.filename}'): "
                    f"Created at {doc.created_at}, physical file missing. Marking FAILED."
                )
                doc.status = "FAILED"
                doc.error_message = "Processing was interrupted during server restart and source file is unavailable in storage. Please re-upload the document."
                recovered_count += 1
            else:
                logger.info(f"Stale Document #{doc.id} detected but physical file exists at '{doc.file_path}'. Eligible for reprocessing.")
                
    if recovered_count > 0:
        db.commit()
        logger.info(f"Recovered {recovered_count} stale PROCESSING document(s) on startup.")
        
    return recovered_count
