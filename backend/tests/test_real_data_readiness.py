"""
Issue #79 regression suite: real-government-data readiness.

Covers the two root causes found by ingesting the actual CCO Coal Directory
of India 2023-24 (274-page official PDF from coalcontroller.gov.in):

1. Year-series columnar tables (Item | Unit | FY columns) yield ZERO metrics
   through the narrative (inline-unit) extractor.
2. State/sector/national aggregate queries (e.g. "coking coal production of
   Chhattisgarh") were misparsed as MINE queries and refused by the citation
   gate even when the evidence existed in the index.
"""

import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.normalization_service import (
    extract_year_series_metrics_from_tables,
    chunk_has_metric_for_entity,
)
from app.services.hybrid_search_service import detect_query_entities


# ---------------------------------------------------------------------------
# Fixtures: real-shaped CCO table structures (layout, not hardcoded values)
# ---------------------------------------------------------------------------

CCO_TABLE_1_1 = {
    "raw_rows": [
        ["Table 1.1 : General Statistics of Coal", "", "", "", "", "", "", ""],
        ["Sl. No.", "Item", "Unit", "2019-20", "2020-21", "2021-22", "2022-23", "2023-24"],
        ["(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)", "(8)"],
        ["1", "Reserves (Proved)", "", "", "", "", "", ""],
        ["", "(i) Coking Coal", "Million Tonnes", "20062.740", "20169.030", "20873.000", "22161.750", "23064.200"],
        ["", "(ii) Non Coking", "", "143398.100", "157009.910", "166232.390", "177742.060", "189142.960"],
        ["2", "Production :", "", "", "", "", "", ""],
        ["", "(i) Coal", "Million Tonnes", "730.874", "716.083", "778.210", "893.191", "997.826"],
        ["", "(ii) Lignite", "", "42.096", "37.895", "47.492", "44.029", "42.921"],
    ],
    "row_count": 9,
    "col_count": 8,
}

CCO_STATE_DESPATCH = {
    "raw_rows": [
        ["State", "Raw Coal & Coal Products", "Power (Utility)", "Power (Captive)", "Cement"],
        ["Odisha", "Raw Coal", "49.172", "23.514", "0.106"],
        ["", "Total", "49.212", "24.798", "0.000"],
        ["Rajasthan", "Raw Coal", "28.281", "1.580", "0.160"],
    ],
    "row_count": 4,
    "col_count": 5,
}


class TestYearSeriesExtraction:
    """extract_year_series_metrics_from_tables reads Item|Unit|FY-column layouts."""

    def test_extracts_metrics_from_cco_general_statistics(self):
        metrics = extract_year_series_metrics_from_tables(
            tables=[CCO_TABLE_1_1], page_number=38,
            page_text="Table 1.1 : General Statistics of Coal Sector in India",
        )
        assert len(metrics) > 0, "Year-series extractor must produce metrics from the real CCO layout"

        # Production row: 5 FY values must all be captured
        coal_prod = [m for m in metrics if m["metric_name"] == "Coal Production"]
        assert len(coal_prod) == 5, f"Expected 5 FY values for Coal Production, got {len(coal_prod)}"
        by_fy = {m["fiscal_year"]: m for m in coal_prod}
        assert by_fy["2023-24"]["numeric_value"] == pytest.approx(997.826)
        assert by_fy["2019-20"]["numeric_value"] == pytest.approx(730.874)

    def test_unit_inheritance_and_standardization(self):
        metrics = extract_year_series_metrics_from_tables(
            tables=[CCO_TABLE_1_1], page_number=38,
            page_text="Table 1.1 : General Statistics",
        )
        coal_prod = {m["fiscal_year"]: m for m in metrics if m["metric_name"] == "Coal Production"}
        assert coal_prod["2023-24"]["unit"] == "Million Tonnes"
        assert coal_prod["2023-24"]["standard_unit"] == "MT"
        assert coal_prod["2023-24"]["standard_value"] == pytest.approx(997.826)

    def test_section_context_classification(self):
        """Section headers (Reserves / Production) drive metric classification —
        the CCO layout repeats '(i) Coking Coal' under different sections."""
        metrics = extract_year_series_metrics_from_tables(
            tables=[CCO_TABLE_1_1], page_number=38,
            page_text="Table 1.1 : General Statistics",
        )
        names = {m["metric_name"] for m in metrics}
        # Reserves section rows -> Coal Reserves; Production section -> Production
        assert "Coal Reserves" in names
        assert "Coal Production" in names
        assert "Lignite Production" in names

        reserves = [m for m in metrics if m["metric_name"] == "Coal Reserves"
                    and m["mine_name"].endswith("(i) Coking Coal")]
        assert any(m["numeric_value"] == pytest.approx(23064.200) and m["fiscal_year"] == "2023-24"
                   for m in reserves), "Coking-coal RESERVE 2023-24 value must be captured"
        production = [m for m in metrics if m["metric_name"] == "Coal Production"]
        assert any(m["numeric_value"] == pytest.approx(997.826) and m["fiscal_year"] == "2023-24"
                   for m in production), "National coal PRODUCTION 2023-24 must be captured"

    def test_provenance_snippet_contains_source_page(self):
        metrics = extract_year_series_metrics_from_tables(
            tables=[CCO_TABLE_1_1], page_number=38,
            page_text="Table 1.1 : General Statistics",
        )
        for m in metrics:
            assert "Page 38" in m["raw_snippet"]
            assert m["page_number"] == 38
            assert m["validation_status"] == "VALIDATED"

    def test_ignores_non_fy_tables(self):
        # A monthly report table (no FY columns) must yield nothing
        monthly = {
            "raw_rows": [
                ["Subsidiary", "Production during Mar FY 25", "Target"],
                ["ECL", "5.40", "5.50"],
                ["SECL", "14.20", "15.00"],
            ],
            "row_count": 3, "col_count": 3,
        }
        assert extract_year_series_metrics_from_tables([monthly], page_number=1) == []

    def test_empty_and_malformed_tables(self):
        assert extract_year_series_metrics_from_tables([], page_number=1) == []
        assert extract_year_series_metrics_from_tables([{"raw_rows": []}], page_number=1) == []
        assert extract_year_series_metrics_from_tables(
            [{"raw_rows": [["a"], ["b"]]}], page_number=1) == []


class TestQueryEntityDetection:
    """detect_query_entities recognizes states/sectors; states are no longer mines."""

    def test_state_detected_as_geography_not_mine(self):
        e = detect_query_entities("What is the coking coal production of Chhattisgarh?")
        assert "Chhattisgarh" in e["geographies"]
        assert e["mines"] == [], "States must NOT be misparsed as mine names"

    def test_common_states(self):
        for state in ["Odisha", "Jharkhand", "Madhya Pradesh", "West Bengal", "Maharashtra"]:
            e = detect_query_entities(f"Coal production in {state}")
            assert state in e["geographies"], f"{state} must be a geography"
            assert e["mines"] == []

    def test_sector_detection(self):
        e = detect_query_entities("despatch of raw coal for Power (Utility) sector")
        assert "Power (Utility)" in e["sectors"], "Power (Utility) sector must be detected"
        # coking coal as a category (table row dimension) is a sector entity
        e2 = detect_query_entities("coking coal production trend")
        assert "Coking Coal" in e2["sectors"], "'Coking Coal' must be detected as a sector/category entity"

    def test_mine_detection_unaffected(self):
        e = detect_query_entities("Gevra mine production")
        assert "Gevra" in e["mines"]
        assert e["geographies"] == []
        assert e["sectors"] == []


class TestChunkEntityMetricGate:
    """chunk_has_metric_for_entity accepts geographic/sector entities (#79)."""

    CCO_CHUNK = (
        "Coal Directory of India 2023-24 Table 1.1: Sl. No. Item Unit 2019-20 ... 2023-24 "
        "(i) Coking Coal 20062.740 ... 23064.200 (ii) Non Coking 143398.100 ... 189142.960 "
        "Production : (i) Coal 730.874 ... 997.826 Million Tonnes"
    )

    def test_geography_entity_satisfies_gate(self):
        assert chunk_has_metric_for_entity(
            self.CCO_CHUNK,
            target_mines=[],
            target_metric="Coal Production",
            target_entities=["Odisha"],  # not in this chunk
        ) is False
        # chunk that DOES mention the state
        state_chunk = "Odisha raw coal despatch to Power (Utility) 49.172 MT in 2023-24 Coal Directory"
        assert chunk_has_metric_for_entity(
            state_chunk,
            target_mines=[],
            target_metric="Coal Despatch",
            target_entities=["Odisha"],
        ) is True

    def test_sector_entity_satisfies_gate(self):
        chunk = "Coking Coal production 23064.200 thousand tonnes in 2023-24"
        assert chunk_has_metric_for_entity(
            chunk, target_mines=[], target_metric="Coal Production",
            target_entities=["Coking Coal"],
        ) is True
        assert chunk_has_metric_for_entity(
            chunk, target_mines=[], target_metric="Coal Production",
            target_entities=["Non-Coking Coal"],
        ) is False

    def test_mine_gate_backward_compatible(self):
        # existing mine behaviour unchanged when no geo/sector entities passed
        # (gate requires the metric term itself in the chunk — pre-existing contract)
        chunk = "Gevra OpenCast coal production 52.50 Lakh Tonnes FY 2023-24"
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Gevra"], target_metric="Coal Production",
        ) is True
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Kusmunda"], target_metric="Coal Production",
        ) is False
