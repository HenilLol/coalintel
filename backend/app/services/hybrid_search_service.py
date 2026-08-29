import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.vector_store_service import search_vector_store
from app.services.keyword_search_service import search_keyword_store

logger = logging.getLogger(__name__)

RRF_K_CONSTANT = 60  # Frozen RRF Constant k=60


def execute_hybrid_search(
    db: Session,
    query_text: str,
    top_k: int = 5,
    subsidiary_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Executes Hybrid Retrieval combining:
    1. ChromaDB Cosine Vector Search (Semantic)
    2. PostgreSQL Keyword Search (BM25)
    
    Fuses candidate rankings using Reciprocal Rank Fusion (RRF):
    RRF(d) = SUM( 1 / (60 + rank) )
    Deduplicates candidates and returns top_k evidence chunks with RRF scores.
    """
    if not query_text or not query_text.strip():
        return []

    # 1. Fetch Top-K candidate results from both retrieval channels
    vector_results = search_vector_store(query_text, top_k=top_k * 2, subsidiary_filter=subsidiary_filter)
    keyword_results = search_keyword_store(db, query_text, top_k=top_k * 2, subsidiary_filter=subsidiary_filter)

    # 2. Map and deduplicate candidate chunks using canonical tuple key: (document_id, page_number, chunk_index)
    fused_candidates: Dict[tuple, Dict[str, Any]] = {}

    def get_candidate_key(item: Dict[str, Any]) -> tuple:
        return (item.get("document_id", 0), item.get("page_number", 1), item.get("chunk_index", 0))

    # Process Vector Results (Rank 1..N)
    for rank, item in enumerate(vector_results, start=1):
        key = get_candidate_key(item)
        rrf_score_component = 1.0 / (RRF_K_CONSTANT + rank)
        
        if key not in fused_candidates:
            fused_candidates[key] = {
                "chunk_id": item.get("chunk_id"),
                "document_id": item["document_id"],
                "filename": item["filename"],
                "page_number": item["page_number"],
                "chunk_index": item["chunk_index"],
                "text": item["text"],
                "vector_score": item.get("vector_score", 0.0),
                "keyword_score": 0.0,
                "rrf_score": rrf_score_component
            }
        else:
            fused_candidates[key]["vector_score"] = item.get("vector_score", 0.0)
            fused_candidates[key]["rrf_score"] += rrf_score_component

    # Process Keyword Results (Rank 1..N)
    for rank, item in enumerate(keyword_results, start=1):
        key = get_candidate_key(item)
        rrf_score_component = 1.0 / (RRF_K_CONSTANT + rank)

        if key not in fused_candidates:
            fused_candidates[key] = {
                "chunk_id": item.get("chunk_id"),
                "document_id": item["document_id"],
                "filename": item["filename"],
                "page_number": item["page_number"],
                "chunk_index": item["chunk_index"],
                "text": item["text"],
                "vector_score": 0.0,
                "keyword_score": item.get("keyword_score", 0.0),
                "rrf_score": rrf_score_component
            }
        else:
            fused_candidates[key]["keyword_score"] = item.get("keyword_score", 0.0)
            fused_candidates[key]["rrf_score"] += rrf_score_component

    # 3. Sort candidates descending by RRF score
    sorted_chunks = sorted(fused_candidates.values(), key=lambda x: x["rrf_score"], reverse=True)
    
    # Format RRF scores
    for sc in sorted_chunks:
        sc["rrf_score"] = round(sc["rrf_score"], 6)

    logger.info(f"Hybrid search returned {len(sorted_chunks)} fused candidate chunks for query: '{query_text[:40]}...'")
    return sorted_chunks[:top_k]
