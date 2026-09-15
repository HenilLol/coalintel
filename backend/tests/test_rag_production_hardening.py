import unittest
import os
import sys
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import Base
from database_seed import init_db
from app.models.document import Document
from app.models.extracted_metric import ExtractedMetric
from app.models.document_chunk import DocumentChunk
from app.services.hybrid_search_service import detect_query_entities, execute_hybrid_search
from app.services.rag_service import (
    classify_query_intent,
    execute_rag_query,
    build_insufficient_evidence_response,
    handle_structured_analytical_query
)


class TestRAGProductionHardening(unittest.TestCase):
    """
    Regression Test Suite for the 10 Accepted Forensic Audit Test Cases (TC-RAG-01 through TC-RAG-10).
    Verifies query entity parsing, intent classification, corpus-wide retrieval, structured analytical
    query processing, authority gate behavior, and citation preservation across official reports.
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=cls.engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        cls.db = TestingSessionLocal()

        # Seed standard DB
        init_db(cls.db)

        # Seed representation of the 5 Ministry of Coal Monthly Statistical Reports
        cls._seed_ministry_reports(cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    @classmethod
    def _seed_ministry_reports(cls, db):
        """Seeds official Ministry of Coal monthly reports (Nov 2024, Dec 2024, Jan 2025, Feb 2025, Mar 2025)."""
        reports = [
            ("srn-november-2024.pdf", "2024-25", "November", "2024"),
            ("srn-december-2024.pdf", "2024-25", "December", "2024"),
            ("srn-january-2025.pdf", "2024-25", "January", "2025"),
            ("srn-february-2025.pdf", "2024-25", "February", "2025"),
            ("srn-march-2025.pdf", "2024-25", "March", "2025"),
        ]

        # In production March 2025 Page 5:
        # Table 1: Subsidiary-wise Coal Production (Fig. in MT)
        # MCL: 22.38, SECL: 20.30, NCL: 13.97, CCL: 10.42, WCL: 8.35, ECL: 5.76, BCCL: 4.58, Total CIL: 85.76
        subsidiary_prod_march = [
            ("MCL", Decimal("22.38")),
            ("SECL", Decimal("20.30")),
            ("NCL", Decimal("13.97")),
            ("CCL", Decimal("10.42")),
            ("WCL", Decimal("8.35")),
            ("ECL", Decimal("5.76")),
            ("BCCL", Decimal("4.58")),
            ("CIL Corporate", Decimal("85.76")),
        ]

        # Nov 2024 Page 5
        subsidiary_prod_nov = [
            ("MCL", Decimal("18.50")),
            ("SECL", Decimal("16.80")),
            ("NCL", Decimal("11.50")),
            ("CCL", Decimal("8.20")),
            ("WCL", Decimal("6.90")),
            ("ECL", Decimal("4.30")),
            ("BCCL", Decimal("3.80")),
            ("CIL Corporate", Decimal("70.00")),
        ]

        for fname, fy, month, year in reports:
            doc = Document(
                filename=fname,
                file_path=f"storage/uploads/{fname}",
                file_hash=f"hash_{fname.replace('.', '_')}",
                file_type="PDF",
                file_size_bytes=500000,
                subsidiary="CIL",
                fiscal_year=fy,
                status="INDEXED",
                total_pages=128
            )
            db.add(doc)
            db.flush()

            # Seed Page 5 chunk
            sub_prod = subsidiary_prod_march if month == "March" else subsidiary_prod_nov
            sub_lines = "\n".join(f"{sub}: {val} MT" for sub, val in sub_prod)
            chunk_p5_text = (
                f"Ministry of Coal Provisional Monthly Statistics for {month} {year}.\n"
                f"Table 1: Subsidiary-Wise Coal Production (Fig. in MT):\n"
                f"{sub_lines}\n"
                f"Total Overburden Removal (OBR) for {month} {year} was 10.0 M.Cu.M."
            )
            c5 = DocumentChunk(
                document_id=doc.id,
                chunk_index=5,
                chunk_text=chunk_p5_text,
                page_number=5,
                token_count=180
            )
            db.add(c5)

            # Seed Page 5 metrics
            for sub, val in sub_prod:
                mine_label = "CIL Corporate" if sub == "CIL Corporate" else f"{sub} Total"
                sub_label = "CIL" if sub == "CIL Corporate" else sub
                m = ExtractedMetric(
                    document_id=doc.id,
                    page_number=5,
                    mine_name=mine_label,
                    subsidiary=sub_label,
                    metric_name="Coal Production",
                    numeric_value=val,
                    unit="MT",
                    standard_value=val,
                    standard_unit="MT",
                    fiscal_year=fy,
                    confidence_score=Decimal("0.98"),
                    validation_status="VALIDATED",
                    raw_snippet=f"{sub}: {val} MT (Table 1: Subsidiary-Wise Coal Production for {month} {year})",
                    data_origin="OFFICIAL"
                )
                db.add(m)

            # Seed Cumulative Coal Production metrics for Table 1
            for sub, val in sub_prod:
                cum_val = val * Decimal("8.5")
                mine_label = "CIL Corporate" if sub == "CIL Corporate" else f"{sub} Total"
                sub_label = "CIL" if sub == "CIL Corporate" else sub
                cum_m = ExtractedMetric(
                    document_id=doc.id,
                    page_number=5,
                    mine_name=mine_label,
                    subsidiary=sub_label,
                    metric_name="Cumulative Coal Production",
                    numeric_value=cum_val,
                    unit="MT",
                    standard_value=cum_val,
                    standard_unit="MT",
                    fiscal_year=fy,
                    confidence_score=Decimal("0.98"),
                    validation_status="VALIDATED",
                    raw_snippet=f"{sub}: {cum_val} MT (Table 1: Cumulative Production upto {month} {year})",
                    data_origin="OFFICIAL"
                )
                db.add(cum_m)

            # Seed Monthly Production Target metrics for Table 1
            for sub, val in sub_prod:
                tgt_val = val * Decimal("1.05")
                mine_label = "CIL Corporate" if sub == "CIL Corporate" else f"{sub} Total"
                sub_label = "CIL" if sub == "CIL Corporate" else sub
                tgt_m = ExtractedMetric(
                    document_id=doc.id,
                    page_number=5,
                    mine_name=mine_label,
                    subsidiary=sub_label,
                    metric_name="Monthly Production Target",
                    numeric_value=tgt_val,
                    unit="MT",
                    standard_value=tgt_val,
                    standard_unit="MT",
                    fiscal_year=fy,
                    confidence_score=Decimal("0.98"),
                    validation_status="VALIDATED",
                    raw_snippet=f"{sub}: {tgt_val} MT (Table 1: Monthly Target for {month} {year})",
                    data_origin="OFFICIAL"
                )
                db.add(tgt_m)

            # Seed an unrelated high-value production metric to test mixed-metric contamination immunity
            unrelated_m = ExtractedMetric(
                document_id=doc.id,
                page_number=120,
                mine_name="Project Alpha",
                subsidiary="CIL",
                metric_name="Project Production",
                numeric_value=Decimal("999.00"),
                unit="MT",
                standard_value=Decimal("999.00"),
                standard_unit="MT",
                fiscal_year=fy,
                confidence_score=Decimal("0.90"),
                validation_status="VALIDATED",
                raw_snippet=f"Project Alpha Production: 999.00 MT on Page 120",
                data_origin="OFFICIAL"
            )
            db.add(unrelated_m)

            # Seed an OBR metric for this report (e.g. 10.0 M.Cu.M.)
            obr_m = ExtractedMetric(
                document_id=doc.id,
                page_number=5,
                mine_name="CIL Total OBR",
                subsidiary="CIL",
                metric_name="Overburden Removal",
                numeric_value=Decimal("10.00"),
                unit="M.Cu.M.",
                standard_value=Decimal("10.00"),
                standard_unit="MCuM",
                fiscal_year=fy,
                confidence_score=Decimal("0.95"),
                validation_status="VALIDATED",
                raw_snippet=f"Total Overburden Removal for {month} {year} was 10.0 M.Cu.M.",
                data_origin="OFFICIAL"
            )
            db.add(obr_m)

        db.commit()

    # =========================================================================
    # TC-RAG-01: "What is the overburden removal in the ingested documents?"
    # =========================================================================
    def test_tc_rag_01_overburden_in_ingested_documents(self):
        """TC-RAG-01: Corpus-wide document inquiry on OBR must route to EVIDENCE_GROUNDED and retrieve evidence."""
        query = "What is the overburden removal in the ingested documents?"
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED", f"Expected EVIDENCE_GROUNDED, got {intent}")

        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertGreater(len(res["citations"]), 0)
        self.assertNotIn("configure a valid LLM API key", res["answer"])
        self.assertTrue(
            any("srn-" in c["document_name"] or "SECL" in c["document_name"] or "ECL" in c["document_name"]
                for c in res["citations"])
        )

    # =========================================================================
    # TC-RAG-02: "What was the coal production reported in the ingested documents?"
    # =========================================================================
    def test_tc_rag_02_coal_production_reported_in_ingested_documents(self):
        """TC-RAG-02: Plural 'ingested documents' coal production inquiry routes to EVIDENCE_GROUNDED."""
        query = "What was the coal production reported in the ingested documents?"
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED", f"Expected EVIDENCE_GROUNDED, got {intent}")

        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertGreater(len(res["citations"]), 0)
        self.assertNotIn("configure a valid LLM API key", res["answer"])

    # =========================================================================
    # TC-RAG-03: "What was the coal production in March 2025?"
    # =========================================================================
    def test_tc_rag_03_coal_production_march_2025(self):
        """TC-RAG-03: Calendar month 'March' must NEVER be parsed as a mine. Retrieves March 2025 evidence."""
        query = "What was the coal production in March 2025?"

        # 1. Entity parsing check
        entities = detect_query_entities(query)
        self.assertEqual(entities["mines"], [], "March must NEVER be parsed as a mine entity!")
        self.assertEqual(entities["metric"], "Coal Production")
        t_scope = entities.get("temporal_scope", {})
        self.assertEqual(t_scope.get("primary_month"), "March")
        self.assertEqual(t_scope.get("primary_year"), "2025")

        # 2. Intent check
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED")

        # 3. Execution check
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertNotIn("for mine 'March'", res["answer"])
        self.assertGreater(len(res["citations"]), 0)
        self.assertTrue(any("srn-march-2025.pdf" in c["document_name"] for c in res["citations"]))

    # =========================================================================
    # TC-RAG-04: "Compare coal production between November 2024 and March 2025."
    # =========================================================================
    def test_tc_rag_04_compare_nov_2024_and_mar_2025(self):
        """TC-RAG-04: Neither November nor March may be parsed as a mine. Both periods retrieved."""
        query = "Compare coal production between November 2024 and March 2025."

        # 1. Entity parsing check
        entities = detect_query_entities(query)
        self.assertEqual(entities["mines"], [], "Months must NEVER be parsed as mines!")
        t_scope = entities.get("temporal_scope", {})
        self.assertEqual(len(t_scope.get("periods", [])), 2)
        months_found = {p["month"] for p in t_scope["periods"]}
        self.assertIn("November", months_found)
        self.assertIn("March", months_found)

        # 2. Intent check
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED")

        # 3. Execution check
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertNotIn("for mine 'November'", res["answer"])
        self.assertNotIn("for mine 'March'", res["answer"])
        doc_names = [c["document_name"] for c in res["citations"]]
        self.assertTrue(any("srn-november-2024.pdf" in d for d in doc_names))
        self.assertTrue(any("srn-march-2025.pdf" in d for d in doc_names))

    # =========================================================================
    # TC-RAG-05: "Which CIL subsidiary had the highest coal production in the ingested reports?"
    # =========================================================================
    def test_tc_rag_05_highest_subsidiary_coal_production(self):
        """TC-RAG-05: Structured aggregation for subsidiary comparison with evidence citations."""
        query = "Which CIL subsidiary had the highest coal production in the ingested reports?"

        # 1. Intent check
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED")

        # 2. Execution check
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertIn("highest", res["answer"].lower())
        # MCL has highest production (22.38 MT in March, or 193.30 MT in seed)
        self.assertTrue("MCL" in res["answer"] or "SECL" in res["answer"])
        self.assertGreater(len(res["citations"]), 0)
        # Must retain document filename and page number
        for c in res["citations"]:
            self.assertTrue(c["document_name"].endswith(".pdf") or c["document_name"].endswith(".xlsx"))
            self.assertIsInstance(c["page_number"], int)

    # =========================================================================
    # TC-RAG-06: "List all projects/mines with overburden removal exceeding 100 M.Cu.M."
    # =========================================================================
    def test_tc_rag_06_overburden_exceeding_100_numeric_filter(self):
        """
        TC-RAG-06: 'Cu' is NOT a mine. Structured numeric filter.
        If no values exceed 100, clearly state:
        'No indexed project/mine exceeds 100 M.Cu.M. in the available evidence.'
        Do NOT prepend 'Insufficient evidence'.
        """
        query = "List all projects/mines with overburden removal exceeding 100 M.Cu.M."

        # 1. Entity parsing check
        entities = detect_query_entities(query)
        self.assertEqual(entities["mines"], [], "'Cu' must NEVER be parsed as a mine entity!")
        self.assertEqual(entities["metric"], "Overburden Removal")

        # 2. Intent check
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED")

        # 3. Execution check
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertNotIn("mine 'Cu'", res["answer"])
        # Either list projects exceeding 100 or clearly state none exceeds 100 without prepending "Insufficient evidence"
        if "No indexed project/mine exceeds 100" in res["answer"]:
            self.assertFalse(res["answer"].startswith("Insufficient evidence"))
            self.assertIn("No indexed project/mine exceeds 100", res["answer"])
            self.assertGreater(len(res["citations"]), 0)
        else:
            # If standard seed has Rajmahal OC (120.40 M.Cu.M.), it should be listed
            self.assertIn("100", res["answer"])
            self.assertGreater(len(res["citations"]), 0)

    # =========================================================================
    # TC-RAG-07: "Give the source document and page number for the overburden removal figures."
    # =========================================================================
    def test_tc_rag_07_source_doc_and_page_number_citations(self):
        """TC-RAG-07: Grounded inquiry asking for source document and page number provides verified citations."""
        query = "Give the source document and page number for the overburden removal figures."
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED")

        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        self.assertGreater(len(res["citations"]), 0)
        for c in res["citations"]:
            self.assertTrue(any(c["document_name"].endswith(ext) for ext in [".pdf", ".csv", ".xlsx"]))
            self.assertGreaterEqual(c["page_number"], 1)

    # =========================================================================
    # TC-RAG-08: "What is opencast mining?"
    # =========================================================================
    def test_tc_rag_08_what_is_opencast_mining_general_ai(self):
        """TC-RAG-08: Pure conceptual question must route to GENERAL_AI with no document retrieval."""
        query = "What is opencast mining?"
        intent = classify_query_intent(query)
        self.assertEqual(intent, "GENERAL_AI", f"Expected GENERAL_AI for conceptual query, got {intent}")

        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "GENERAL_AI")
        self.assertEqual(len(res["citations"]), 0, "GENERAL_AI queries must never have fake citations.")
        self.assertIn("opencast", res["answer"].lower())

    # =========================================================================
    # TC-RAG-09: "What is overburden?"
    # =========================================================================
    def test_tc_rag_09_what_is_overburden_general_ai(self):
        """TC-RAG-09: Pure conceptual definition of overburden must route to GENERAL_AI."""
        query = "What is overburden?"
        intent = classify_query_intent(query)
        self.assertEqual(intent, "GENERAL_AI", f"Expected GENERAL_AI for conceptual query, got {intent}")

        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "GENERAL_AI")
        self.assertEqual(len(res["citations"]), 0)
        self.assertIn("overburden", res["answer"].lower())

    # =========================================================================
    # TC-RAG-10: "What was production in an unindexed mine XYZ?"
    # =========================================================================
    def test_tc_rag_10_unindexed_mine_xyz_insufficient_evidence(self):
        """TC-RAG-10: Query targeting unindexed mine XYZ must return safe insufficient-evidence refusal without hallucination."""
        query = "What was production in an unindexed mine XYZ?"

        # 1. Entity parsing check
        entities = detect_query_entities(query)
        self.assertIn("XYZ", entities["mines"])

        # 2. Intent check
        intent = classify_query_intent(query)
        self.assertEqual(intent, "EVIDENCE_GROUNDED")

        # 3. Execution check: Authority Gate must reject unindexed entity
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(len(res["citations"]), 0)
        self.assertIn("Insufficient evidence found for this query", res["answer"])
        self.assertIn("XYZ", res["answer"])
        # No hallucination of fake production numbers
        self.assertNotIn("42.50 MT", res["answer"])
        self.assertNotIn("85.76 MT", res["answer"])

    # =========================================================================
    # REQ-TEST-A: Monthly production query selects ONLY "Coal Production"
    # =========================================================================
    def test_req_test_a_monthly_production_intent_exact_selection(self):
        """REQ-TEST-A: Monthly production query must select 'Coal Production' and exclude Cumulative, Target, and unrelated metrics."""
        query = "What was the coal production in March 2025?"
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        answer = res["answer"]
        self.assertIn("coal production figures", answer.lower())
        # Authoritative monthly figures from test fixtures
        self.assertIn("22.38", answer)  # MCL
        self.assertIn("5.76", answer)   # ECL
        # Must strictly EXCLUDE cumulative figures (e.g. 190.23, 48.96)
        self.assertNotIn("190.23", answer)
        self.assertNotIn("48.96", answer)
        # Must strictly EXCLUDE target figures (e.g. 23.499, 6.048)
        self.assertNotIn("23.499", answer)
        self.assertNotIn("6.048", answer)
        # Must strictly EXCLUDE unrelated production metrics (e.g. 999.00)
        self.assertNotIn("999.00", answer)
        self.assertNotIn("Project Alpha", answer)

    # =========================================================================
    # REQ-TEST-B: Cumulative query selects ONLY "Cumulative Coal Production"
    # =========================================================================
    def test_req_test_b_cumulative_production_intent_exact_selection(self):
        """REQ-TEST-B: Cumulative inquiry must select 'Cumulative Coal Production'."""
        query = "What was the cumulative coal production up to March 2025?"
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        answer = res["answer"]
        self.assertIn("cumulative coal production figures", answer.lower())
        # Authoritative cumulative figures from test fixtures (val * 8.5)
        self.assertIn("190.23", answer)  # MCL cumulative
        self.assertIn("48.96", answer)   # ECL cumulative
        # Must strictly EXCLUDE monthly actuals
        self.assertNotIn("22.38 MT", answer)
        self.assertNotIn("999.00", answer)

    # =========================================================================
    # REQ-TEST-C: Target query selects ONLY "Monthly Production Target"
    # =========================================================================
    def test_req_test_c_monthly_production_target_intent_exact_selection(self):
        """REQ-TEST-C: Target inquiry must select 'Monthly Production Target'."""
        query = "What was the monthly production target for March 2025?"
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        answer = res["answer"]
        self.assertIn("monthly production target figures", answer.lower())
        # Target figures from test fixtures (val * 1.05)
        self.assertIn("23.499", answer)  # MCL target
        self.assertIn("6.048", answer)   # ECL target
        # Must strictly EXCLUDE monthly actuals and cumulative
        self.assertNotIn("22.38 MT", answer)
        self.assertNotIn("190.23", answer)
        self.assertNotIn("999.00", answer)

    # =========================================================================
    # REQ-TEST-D: Entity-filtered monthly query
    # =========================================================================
    def test_req_test_d_entity_filtered_monthly_query(self):
        """REQ-TEST-D: Subsidiary filter (e.g. ECL) must isolate the requested entity with Coal Production."""
        query = "What was ECL production in March 2025?"
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        answer = res["answer"]
        self.assertIn("ECL", answer)
        self.assertIn("5.76", answer)
        # Must not list other subsidiaries
        self.assertNotIn("MCL", answer)
        self.assertNotIn("SECL", answer)
        # Must not contain cumulative or target figures for ECL
        self.assertNotIn("48.96", answer)
        self.assertNotIn("6.048", answer)
        self.assertNotIn("999.00", answer)

    # =========================================================================
    # REQ-TEST-E: Cross-month generic behavior
    # =========================================================================
    def test_req_test_e_cross_month_generic_behavior(self):
        """REQ-TEST-E: System adapts dynamically to different periods (Nov 2024 and Mar 2025) without hardcoding."""
        # 1. November 2024 corpus query
        query_nov = "What was the coal production in November 2024?"
        res_nov = execute_rag_query(self.db, query_nov, top_k=5)
        self.assertEqual(res_nov["mode"], "EVIDENCE_GROUNDED")
        ans_nov = res_nov["answer"]
        self.assertIn("November 2024", ans_nov)
        self.assertIn("18.50", ans_nov)  # Nov MCL
        self.assertIn("4.30", ans_nov)   # Nov ECL
        self.assertNotIn("22.38", ans_nov)  # March MCL must NOT leak into Nov

        # 2. November 2024 entity-filtered query
        query_nov_ecl = "What was ECL production in November 2024?"
        res_nov_ecl = execute_rag_query(self.db, query_nov_ecl, top_k=5)
        self.assertEqual(res_nov_ecl["mode"], "EVIDENCE_GROUNDED")
        ans_nov_ecl = res_nov_ecl["answer"]
        self.assertIn("ECL", ans_nov_ecl)
        self.assertIn("4.30", ans_nov_ecl)
        self.assertNotIn("5.76", ans_nov_ecl)  # March ECL must NOT leak into Nov

    # =========================================================================
    # REQ-TEST-F: Mixed-metric contamination immunity
    # =========================================================================
    def test_req_test_f_mixed_metric_contamination_cannot_override_intent(self):
        """
        REQ-TEST-F: A numerically larger unrelated production metric (Project Alpha: 999.00 MT on Page 120)
        must NEVER be selected ahead of Coal Production. Proves numeric sorting cannot override metric intent.
        """
        query = "What was the coal production in March 2025?"
        res = execute_rag_query(self.db, query, top_k=5)
        self.assertEqual(res["mode"], "EVIDENCE_GROUNDED")
        answer = res["answer"]
        self.assertNotIn("Project Alpha", answer)
        self.assertNotIn("999.00", answer)
        self.assertNotIn("Page 120", answer)
        self.assertIn("Page 5", answer)
        self.assertIn("22.38", answer)

    # =========================================================================
    # REQ-TEST-G: Structured Query Routing Boundary Protection
    # =========================================================================
    def test_req_test_g_structured_query_routing_boundaries(self):
        """
        REQ-TEST-G: Ordinary conceptual/evidence questions containing 'coal' but NOT asking
        for a production metric must NOT enter the structured production analytical path.
        """
        boundary_queries = [
            "What is coal?",
            "What are the main types of coal?",
            "Explain coal mining in March 2025.",
            "What is the role of coal in India's energy sector?",
        ]
        for query in boundary_queries:
            struct_res = handle_structured_analytical_query(self.db, query)
            self.assertIsNone(
                struct_res,
                f"Query '{query}' must NOT enter structured analytical production handling!"
            )

        # Full RAG execution checks: provider must not be structured_analytics
        for query in boundary_queries:
            rag_res = execute_rag_query(self.db, query, top_k=5)
            self.assertNotEqual(
                rag_res.get("provider"),
                "structured_analytics",
                f"Query '{query}' must NOT be answered by structured_analytics provider!"
            )
            # Must not output the structured production figures table header
            self.assertNotIn(
                "coal production figures for **March 2025** are:",
                rag_res.get("answer", "")
            )


if __name__ == "__main__":
    unittest.main()

