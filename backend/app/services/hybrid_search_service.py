import re
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.extracted_metric import ExtractedMetric
from app.models.document import Document
from app.services.vector_store_service import search_vector_store
from app.services.keyword_search_service import search_keyword_store
from app.services.normalization_service import KNOWN_MINES, SUBSIDIARIES

logger = logging.getLogger(__name__)

RRF_K_CONSTANT = 60  # Frozen RRF Constant k=60


def detect_query_entities(query_text: str) -> Dict[str, Any]:
    """Extracts target mine names, subsidiaries, and metric types from query text."""
    q_lower = query_text.lower()
    
    target_mines = []
    for km in KNOWN_MINES:
        if km.lower() in q_lower:
            target_mines.append(km)
    
    # Generic mine name regex check (e.g. "Rajmahal", "Gevra", "Samaleswari")
    if not target_mines:
        mine_match = re.findall(r"\b([A-Z][a-z]+(?:\s+(?:OC|OpenCast|Mine|Colliery))?)\b", query_text)
        for mm in mine_match:
            if mm.lower() not in ["what", "where", "total", "coal", "production", "overburden", "fiscal", "year"]:
                target_mines.append(mm)

    target_subsidiary = None
    for sub in SUBSIDIARIES:
        if re.search(r"\b" + sub + r"\b", query_text, re.IGNORECASE):
            target_subsidiary = sub
            break

    target_metric = None
    if "production" in q_lower or "coal" in q_lower or "output" in q_lower:
        target_metric = "Coal Production"
    elif "overburden" in q_lower or "obr" in q_lower:
        target_metric = "Overburden Removal"

    is_comparison = "compare" in q_lower or "versus" in q_lower or "vs" in q_lower or ("total" in q_lower and len(target_mines) > 0)
    is_subsidiary_total_only = "total" in q_lower and not target_mines

    return {
        "mines": target_mines,
        "subsidiary": target_subsidiary,
        "metric": target_metric,
        "is_comparison": is_comparison,
        "is_subsidiary_total_only": is_subsidiary_total_only
    }


def execute_hybrid_search(
    db: Session,
    query_text: str,
    top_k: int = 5,
    subsidiary_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Executes Entity-Aware Hybrid Retrieval combining:
    1. Structured PostgreSQL ExtractedMetric table queries
    2. ChromaDB Cosine Vector Search (Semantic)
    3. PostgreSQL Keyword Search (BM25)

    Applies Reciprocal Rank Fusion (RRF k=60) with entity-aware rank boosting:
    Prioritizes exact mine/entity matches over subsidiary aggregates for mine queries.
    """
    if not query_text or not query_text.strip():
        return []

    entities = detect_query_entities(query_text)
    target_mines = entities["mines"]
    target_metric = entities["metric"]

    # 1. Fetch Top-K candidate results from Vector and Keyword channels
    vector_results = search_vector_store(query_text, top_k=top_k * 2, subsidiary_filter=subsidiary_filter)
    keyword_results = search_keyword_store(db, query_text, top_k=top_k * 2, subsidiary_filter=subsidiary_filter)

    # 2. Query ExtractedMetric table for structured evidence
    metric_results = []
    try:
        metric_query = db.query(ExtractedMetric, Document.filename).\
            join(Document, ExtractedMetric.document_id == Document.id)

        if subsidiary_filter and subsidiary_filter != "ALL":
            metric_query = metric_query.filter(ExtractedMetric.subsidiary == subsidiary_filter)

        if target_mines:
            mine_filters = [ExtractedMetric.mine_name.ilike(f"%{m}%") for m in target_mines]
            metric_query = metric_query.filter(*mine_filters)

        if target_metric:
            metric_query = metric_query.filter(ExtractedMetric.metric_name.ilike(f"%{target_metric}%"))

        metric_records = metric_query.limit(top_k * 2).all()

        for m, filename in metric_records:
            num_val_str = f"{float(m.numeric_value):.2f}" if m.numeric_value is not None else "N/A"
            std_val_str = f"{float(m.standard_value):.2f}" if m.standard_value is not None else "N/A"
            formatted_text = (
                f"Mine Entity: {m.mine_name} | Metric: {m.metric_name} | "
                f"Raw Extracted Value: {num_val_str} {m.unit} | "
                f"Normalized Value: {std_val_str} {m.standard_unit or 'MT'} | "
                f"Fiscal Year: {m.fiscal_year}\n"
                f"Raw Evidence Snippet: {m.raw_snippet or ''}"
            )
            metric_results.append({
                "chunk_id": f"metric_{m.id}",
                "document_id": m.document_id,
                "filename": filename,
                "page_number": m.page_number or 1,
                "chunk_index": 0,
                "text": formatted_text,
                "vector_score": 0.95,
                "keyword_score": 0.95,
                "is_metric": True,
                "mine_name": m.mine_name
            })
    except Exception as err:
        logger.warning(f"ExtractedMetric search query note: {err}")

    # 3. Fuse and deduplicate candidate chunks using canonical key
    fused_candidates: Dict[tuple, Dict[str, Any]] = {}

    def get_candidate_key(item: Dict[str, Any]) -> tuple:
        return (item.get("document_id", 0), item.get("page_number", 1), item.get("chunk_index", 0), item.get("chunk_id"))

    # Process Metric Results (Priority Rank 1..N)
    for rank, item in enumerate(metric_results, start=1):
        key = get_candidate_key(item)
        rrf_score_component = 1.0 / (RRF_K_CONSTANT + rank)
        fused_candidates[key] = {
            "chunk_id": item.get("chunk_id"),
            "document_id": item["document_id"],
            "filename": item["filename"],
            "page_number": item["page_number"],
            "chunk_index": item["chunk_index"],
            "text": item["text"],
            "vector_score": item.get("vector_score", 0.0),
            "keyword_score": item.get("keyword_score", 0.0),
            "rrf_score": rrf_score_component + 0.05  # Base boost for verified structured metric
        }

    # Process Vector Results
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

    # Process Keyword Results
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

    # 4. Entity & Metric-Aware Rank Boosting
    for cand in fused_candidates.values():
        text_lower = cand["text"].lower()

        if target_mines:
            if any(tm.lower() in text_lower for tm in target_mines):
                cand["rrf_score"] += 0.08
            elif not entities["is_comparison"] and not entities["is_subsidiary_total_only"]:
                if "total" in text_lower or "subsidiary" in text_lower or "ecl total" in text_lower:
                    cand["rrf_score"] -= 0.02

        if target_metric and target_metric.lower() in text_lower:
            cand["rrf_score"] += 0.06

    # 5. Sort candidates descending by RRF score
    sorted_chunks = sorted(fused_candidates.values(), key=lambda x: x["rrf_score"], reverse=True)

    # Format RRF scores
    for sc in sorted_chunks:
        sc["rrf_score"] = round(sc["rrf_score"], 6)

    logger.info(f"Hybrid search returned {len(sorted_chunks)} fused candidate chunks for query: '{query_text[:40]}...'")
    return sorted_chunks[:top_k]

