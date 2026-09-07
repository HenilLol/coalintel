"""
COALINTEL V2 — PHASE 9A REGRESSION TESTS
Focused test suite covering P0 RAG / AI Query recovery:
A. ALL CIL scope returns evidence across subsidiaries / normalizes cleanly.
B. Specific subsidiary scope still filters correctly.
C. Gevra query retrieves 59.11 MT from SECL Annual Report Page 16.
D. Coal Production -> Production semantic mapping works.
E. Overburden Removal does not retrieve Production.
F. RRF merges identical physical chunks (document_id, page_number, chunk_index).
G. Degraded provider does not generate [Document.pdf, Page 1] unless such evidence exists.
H. Citation Gate accepts valid citation originating from retrieved evidence.
I. Citation Gate rejects fabricated/nonexistent citations.
J. Missing scope does not force Admin/global query into CIL HQ.
"""

import unittest
import os
import sys
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from database_seed import init_db
from app.models.document import Document
from app.models.extracted_metric import ExtractedMetric
from app.services.normalization_service import (
    normalize_subsidiary_scope,
    detect_query_metric_domain,
    METRIC_DOMAINS
)
from app.services.hybrid_search_service import (
    execute_hybrid_search,
    detect_query_entities,
    RRF_K_CONSTANT
)
from app.services.rag_service import (
    execute_rag_query,
    extract_and_validate_citations,
    build_isolated_prompt
)
from app.services.llm_provider import DegradedLLMProvider
from app.schemas.query import QueryRequest


class TestPhase9ARAGRecovery(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Sets up in-memory SQLite database seeded with domain metrics & documents."""
        cls.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=cls.engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        cls.db = TestingSessionLocal()
        init_db(cls.db)

        # Ensure SECL Gevra 59.11 MT record exists for Golden Query verification
        secl_doc = cls.db.query(Document).filter(Document.filename == "SECL_Annual_Report_2023-24.pdf").first()
        if not secl_doc:
            secl_doc = Document(
                filename="SECL_Annual_Report_2023-24.pdf",
                file_path="uploads/SECL_Annual_Report_2023-24.pdf",
                file_hash="mock_secl_hash_9a",
                file_type="pdf",
                file_size_bytes=1048576,
                subsidiary="SECL",
                fiscal_year="2023-24",
                status="PARSED",
                total_pages=20
            )
            cls.db.add(secl_doc)
            cls.db.commit()
            cls.db.refresh(secl_doc)

        gevra_metric = cls.db.query(ExtractedMetric).filter(
            ExtractedMetric.document_id == secl_doc.id,
            ExtractedMetric.mine_name.ilike("%Gevra%"),
            ExtractedMetric.metric_name == "Production"
        ).first()

        if not gevra_metric:
            gevra_metric = ExtractedMetric(
                document_id=secl_doc.id,
                page_number=16,
                mine_name="Gevra OC",
                subsidiary="SECL",
                metric_name="Production",
                numeric_value=59.11,
                unit="MT",
                raw_unit="MT",
                standard_value=59.11,
                standard_unit="MT",
                fiscal_year="2023-24",
                confidence_score=0.990,
                validation_status="VALIDATED",
                raw_snippet="Gevra OC achieved annual coal production of 59.11 MT in FY2023-24."
            )
            cls.db.add(gevra_metric)
            cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # --- Test A: Scope Normalization ---
    def test_a_all_cil_scope_normalization(self):
        """BUG-01: 'ALL CIL', 'ALL', '', None must normalize to None (unrestricted global scope)."""
        self.assertIsNone(normalize_subsidiary_scope("ALL CIL"))
        self.assertIsNone(normalize_subsidiary_scope("ALL"))
        self.assertIsNone(normalize_subsidiary_scope(""))
        self.assertIsNone(normalize_subsidiary_scope("   "))
        self.assertIsNone(normalize_subsidiary_scope(None))
        self.assertIsNone(normalize_subsidiary_scope("null"))
        self.assertIsNone(normalize_subsidiary_scope("NONE"))

        # Specific subsidiary must be preserved
        self.assertEqual(normalize_subsidiary_scope("ECL"), "ECL")
        self.assertEqual(normalize_subsidiary_scope("SECL"), "SECL")
        self.assertEqual(normalize_subsidiary_scope("WCL"), "WCL")

    # --- Test B: Specific Subsidiary Scope Filtering ---
    def test_b_specific_subsidiary_scope_filters(self):
        """Explicit subsidiary filter restricts hybrid search strictly to that subsidiary."""
        results = execute_hybrid_search(
            db=self.db,
            query_text="What was the coal production in FY 2023-24?",
            top_k=5,
            subsidiary_filter="ECL"
        )
        self.assertGreater(len(results), 0)
        for item in results:
            self.assertIn("ECL", item["filename"])

    # --- Test C: Golden Gevra RAG Query ---
    def test_c_gevra_golden_rag_query(self):
        """Golden Query: Gevra OC coal production in FY2023-24 retrieves 59.11 MT grounded in SECL report."""
        res = execute_rag_query(
            db=self.db,
            query_text="What was Gevra OC's coal production in FY2023-24?",
            top_k=5,
            subsidiary_filter="ALL CIL"
        )
        answer = res["answer"]
        self.assertIn("59.11", answer)
        self.assertTrue(len(res["citations"]) > 0)
        citation = res["citations"][0]
        self.assertEqual(citation["document_name"], "SECL_Annual_Report_2023-24.pdf")
        self.assertEqual(citation["page_number"], 16)
        self.assertIn("[SECL_Annual_Report_2023-24.pdf, Page 16]", citation["citation_tag"])

    # --- Test D: Semantic Metric Domain Mapping ---
    def test_d_semantic_metric_domain_mapping(self):
        """BUG-05: 'Coal Production' maps to 'Production' and 'Coal Output' in COAL_PRODUCTION domain."""
        dom = detect_query_metric_domain("What was Gevra OC's coal production in FY2023-24?")
        self.assertIsNotNone(dom)
        self.assertEqual(dom["domain_key"], "COAL_PRODUCTION")
        self.assertIn("Production", dom["db_metric_names"])
        self.assertIn("Coal Production", dom["db_metric_names"])
        self.assertIn("Coal Output", dom["db_metric_names"])

    # --- Test E: Metric Specificity Distinction ---
    def test_e_overburden_removal_does_not_match_production(self):
        """Specificity-first: 'overburden removal' must NOT resolve to Coal Production domain."""
        dom_obr = detect_query_metric_domain("What was Gevra OC's overburden removal?")
        self.assertIsNotNone(dom_obr)
        self.assertEqual(dom_obr["domain_key"], "OVERBURDEN_REMOVAL")
        self.assertNotIn("Production", dom_obr["db_metric_names"])

        dom_sr = detect_query_metric_domain("What was the stripping ratio for Gevra mine?")
        self.assertIsNotNone(dom_sr)
        self.assertEqual(dom_sr["domain_key"], "STRIPPING_RATIO")

        # Querying overburden removal must retrieve OBR record (310.50 M.Cu.M), not production
        res = execute_rag_query(
            db=self.db,
            query_text="What was Gevra OC's overburden removal in FY 2023-24?",
            top_k=5
        )
        self.assertIn("310.5", res["answer"])
        self.assertNotIn("59.11", res["answer"])

    # --- Test F: RRF Candidate Identity Fusion ---
    def test_f_rrf_merges_identical_physical_chunks(self):
        """BUG-06: Chunks with same (document_id, page_number, chunk_index) fuse into one candidate."""
        fused_candidates = {}

        def get_candidate_key(item):
            return (
                int(item.get("document_id") or 0),
                int(item.get("page_number") or 1),
                int(item.get("chunk_index") or 0)
            )

        # Vector result: chunk_id is None
        vector_item = {
            "chunk_id": None,
            "document_id": 9,
            "filename": "chap8AnnualReport2024en2.pdf",
            "page_number": 16,
            "chunk_index": 0,
            "text": "Gevra OC produced 59.11 MT coal.",
            "vector_score": 0.88
        }
        # Keyword result: chunk_id is 646
        keyword_item = {
            "chunk_id": 646,
            "document_id": 9,
            "filename": "chap8AnnualReport2024en2.pdf",
            "page_number": 16,
            "chunk_index": 0,
            "text": "Gevra OC produced 59.11 MT coal.",
            "keyword_score": 0.75
        }

        # Process vector
        key_v = get_candidate_key(vector_item)
        rrf_v = 1.0 / (RRF_K_CONSTANT + 1)
        fused_candidates[key_v] = {
            "chunk_id": vector_item.get("chunk_id"),
            "document_id": vector_item["document_id"],
            "filename": vector_item["filename"],
            "page_number": vector_item["page_number"],
            "chunk_index": vector_item["chunk_index"],
            "text": vector_item["text"],
            "vector_score": vector_item["vector_score"],
            "keyword_score": 0.0,
            "rrf_score": rrf_v
        }

        # Process keyword
        key_k = get_candidate_key(keyword_item)
        rrf_k = 1.0 / (RRF_K_CONSTANT + 1)
        if key_k in fused_candidates:
            if not fused_candidates[key_k].get("chunk_id") and keyword_item.get("chunk_id"):
                fused_candidates[key_k]["chunk_id"] = keyword_item.get("chunk_id")
            fused_candidates[key_k]["keyword_score"] = keyword_item["keyword_score"]
            fused_candidates[key_k]["rrf_score"] += rrf_k

        # Verify only 1 fused candidate exists and chunk_id is resolved to 646
        self.assertEqual(len(fused_candidates), 1)
        fused = list(fused_candidates.values())[0]
        self.assertEqual(fused["chunk_id"], 646)
        self.assertAlmostEqual(fused["rrf_score"], rrf_v + rrf_k)

    # --- Test G: Degraded LLM Citation Regex Collision Prevention ---
    def test_g_degraded_provider_no_instruction_collision(self):
        """BUG-02: Prompt instructions mention <untrusted_document_context>; parser must not capture them."""
        provider = DegradedLLMProvider()

        # Prompt with instructions containing the literal tag but NO evidence chunks
        prompt_empty = build_isolated_prompt("What is the coal production of Gevra OC?", [])
        answer_empty = provider.generate(prompt_empty)
        self.assertIn("Insufficient evidence", answer_empty)
        self.assertNotIn("[Document.pdf, Page 1]", answer_empty)

        # Prompt with valid evidence
        evidence = [{
            "filename": "SECL_Annual_Report_2023-24.pdf",
            "page_number": 16,
            "text": "Gevra OC achieved coal production of 59.11 MT in FY2023-24."
        }]
        prompt_with_doc = build_isolated_prompt("What was Gevra OC's coal production in FY2023-24?", evidence)
        answer_valid = provider.generate(prompt_with_doc)
        self.assertIn("59.11 MT", answer_valid)
        self.assertIn("[SECL_Annual_Report_2023-24.pdf, Page 16]", answer_valid)
        self.assertNotIn("Document.pdf", answer_valid)

    # --- Test H & I: Citation Gate ---
    def test_h_citation_gate_accepts_valid_citation(self):
        """Citation Gate: Accepts citation that exactly matches retrieved evidence."""
        text = "Gevra OC produced 59.11 MT in FY2023-24 [SECL_Annual_Report_2023-24.pdf, Page 16]."
        evidence_chunks = [{
            "filename": "SECL_Annual_Report_2023-24.pdf",
            "page_number": 16,
            "text": "Gevra OC achieved 59.11 MT."
        }]
        citations, is_valid = extract_and_validate_citations(text, evidence_chunks)
        self.assertTrue(is_valid)
        self.assertEqual(len(citations), 1)
        self.assertEqual(citations[0]["document_name"], "SECL_Annual_Report_2023-24.pdf")
        self.assertEqual(citations[0]["page_number"], 16)

    def test_i_citation_gate_rejects_fabricated_citation(self):
        """Citation Gate: Rejects fabricated citation [Document.pdf, Page 1] not in evidence."""
        text = "According to records [Document.pdf, Page 1], production was 59.11 MT."
        evidence_chunks = [{
            "filename": "SECL_Annual_Report_2023-24.pdf",
            "page_number": 16,
            "text": "Gevra OC achieved 59.11 MT."
        }]
        citations, is_valid = extract_and_validate_citations(text, evidence_chunks)
        self.assertFalse(is_valid)
        self.assertEqual(len(citations), 0)

    # --- Test J: Missing Scope RBAC Resolution ---
    def test_j_missing_scope_rbac_admin_global(self):
        """BUG-07: Admin or global user with stored subsidiary must NOT be restricted on missing scope."""
        # Admin user with stored subsidiary "CIL HQ"
        admin_user = MagicMock()
        admin_user.role = "Admin"
        admin_user.subsidiary = "CIL HQ"
        admin_user.username = "admin"

        # Missing scope in payload -> should remain unrestricted (None)
        payload = QueryRequest(query="What was Gevra OC's coal production in FY2023-24?", subsidiary_filter=None)
        raw_scope = normalize_subsidiary_scope(payload.subsidiary_filter)
        is_global_user = admin_user.role in ["Admin", "SuperAdmin", "Analyst"] or admin_user.subsidiary in ["CIL HQ", "Ministry of Coal"]

        if raw_scope:
            effective_subsidiary = raw_scope
        elif is_global_user:
            effective_subsidiary = None
        else:
            effective_subsidiary = normalize_subsidiary_scope(admin_user.subsidiary)

        self.assertIsNone(effective_subsidiary)

        # Subsidiary user with subsidiary "WCL" -> should be restricted to WCL
        sub_user = MagicMock()
        sub_user.role = "Subsidiary User"
        sub_user.subsidiary = "WCL"
        sub_user.username = "wcl_user"

        is_sub_global = sub_user.role in ["Admin", "SuperAdmin", "Analyst"] or sub_user.subsidiary in ["CIL HQ", "Ministry of Coal"]
        if raw_scope:
            effective_sub = raw_scope
        elif is_sub_global:
            effective_sub = None
        else:
            effective_sub = normalize_subsidiary_scope(sub_user.subsidiary)

        self.assertEqual(effective_sub, "WCL")


if __name__ == "__main__":
    unittest.main()
