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
    extract_entity_tuples_from_text,
    extract_year_series_metrics_from_tables,
    chunk_has_metric_for_entity,
    classify_document_authority,
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


class TestDocumentAuthorityClassification:
    """Issue #79: real government publications must classify as OFFICIAL.

    Found live: the CCO Coal Directory upload classified as INTERNAL because
    the authority list predated real government documents, so the authority
    gate refused every query about it.
    """

    def test_cco_coal_directory_is_official(self):
        assert classify_document_authority(
            "CCO_Coal_Directory_2023-24_part1_pp1-40.pdf") == "OFFICIAL"

    def test_common_government_publications_are_official(self):
        for fname in [
            "coal_directory_2022-23.pdf",
            "Provisional_Coal_Statistics_2022-23.pdf",
            "PIB_coal_production_release.pdf",
            "Ministry_of_Coal_annual_report.pdf",
        ]:
            assert classify_document_authority(fname) == "OFFICIAL", fname

    def test_synthetic_documents_still_rejected(self):
        assert classify_document_authority("synthetic_test_upload.pdf") == "SYNTHETIC_TEST"
        assert classify_document_authority("demo_mine_data.pdf") == "SYNTHETIC_TEST"

    def test_unknown_documents_still_internal(self):
        assert classify_document_authority("random_notes.pdf") == "INTERNAL"
        assert classify_document_authority("") == "UNKNOWN"


class TestAggregateEntityAttribution:
    """Issue #80: narrative text about state/national/sector aggregates must
    attribute to the aggregate entity, not the 'Unspecified Mine' bucket.

    Found live: 105 of 144 metrics extracted from the Ministry of Coal
    Provisional Coal Statistics 2022-23 landed in 'Unspecified Mine' because
    the narrative extractor only recognized mine-shaped entities — silently
    defeating cross-document conflict detection.
    """

    def test_all_india_narrative_attributes_to_all_india(self):
        text = ("Production of Raw Coal in the country during 2022-23 was "
                "893.190 Million Tonnes")
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        assert tuples, "narrative extraction must fire on the All India line"
        assert any(t["mine_name"] == "All India" for t in tuples)

    def test_state_narrative_attributes_to_state(self):
        text = "Odisha produced 154.200 Million Tonnes of coal during 2022-23"
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        assert any(t["mine_name"] == "Odisha" for t in tuples)

    def test_sector_narrative_attributes_to_sector(self):
        text = "Production from public sector mines was 853.861 Million Tonnes"
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        assert any(t["mine_name"] == "Public Sector" for t in tuples)

    def test_mine_narrative_still_attributes_to_mine(self):
        text = "Gevra OpenCast produced 52.50 Million Tonnes during 2023-24"
        tuples = extract_entity_tuples_from_text(text, page_number=42)
        assert tuples and tuples[0]["mine_name"] != "Unspecified Mine"
        assert "gevra" in tuples[0]["mine_name"].lower()

    def test_unattributable_values_stay_unspecified(self):
        # no mine, no state, no sector — must remain the honest fallback
        text = "The annual target for the period was set at 12.5 Million Tonnes"
        tuples = extract_entity_tuples_from_text(text, page_number=9)
        if tuples:
            assert all(t["mine_name"] == "Unspecified Mine" for t in tuples)

    def test_aggregates_flow_into_conflict_engine(self):
        """Aggregate entity names must pass the conflict engine's generic-name
        exclusion so cross-source discrepancies at state/national level can be
        detected between two real documents."""
        from app.services.conflict_service import is_generic_mine_name
        for name in ["All India", "Odisha", "Public Sector", "Captive & Commercial Blocks"]:
            assert is_generic_mine_name(name) is False, name
        assert is_generic_mine_name("Unspecified Mine") is True


class TestProximityAggregateAttribution:
    """Issue #80 follow-up: proximity-aware aggregate attribution, using the
    EXACT narrative phrasings from the Ministry of Coal Provisional Coal
    Statistics 2022-23 (found live during ingestion)."""

    def test_national_figure_in_india_phrasing(self):
        text = ("In the year 2022-23, total production of raw coal in India was "
                "893.190 MT whereas it was 778.210 MT in 2021-22")
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        assert tuples
        assert all(t["mine_name"] == "All India" for t in tuples)

    def test_state_ranking_sentence_attributes_each_value_correctly(self):
        text = ("In the year 2022-23, Odisha registered highest coal production "
                "of 218.981 MT (24.52%), followed by Chhattisgarh 184.895 MT "
                "(20.70%), Jharkhand 156.445 MT (17.52%)")
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        by_value = {t["numeric_value"]: t["mine_name"] for t in tuples}
        assert by_value.get(218.981) == "Odisha"
        assert by_value.get(184.895) == "Chhattisgarh"
        assert by_value.get(156.445) == "Jharkhand"

    def test_table_label_cannot_steal_narrative_state_figure(self):
        # 'All India' appears in a table ABOVE the line; the value belongs to Odisha
        text = ("All India 60.760 832.430 893.190\n"
                "In the year 2022-23, Odisha registered highest coal production of 218.981 MT")
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        by_value = {t["numeric_value"]: t["mine_name"] for t in tuples}
        assert by_value.get(218.981) == "Odisha", "line-proximity must beat table label 180 chars away"


class TestCrossSeamAttribution:
    """Issue #85: OCR'd scanned pages hard-wrap mid-sentence, putting values
    at the START of their line with the entity label ending the PREVIOUS
    line. Found live on Coal Directory p.4 (geological resources) where every
    state figure shifted to the NEXT state, and paragraph-level national
    totals inherited the previous paragraph's last state."""

    def test_seam_value_gets_prev_line_label(self):
        # exact OCR layout from the real document: "Jharkhand\n91811.57 MT"
        text = ("Out of the total geological resources in the country, 377012.11 (96.81%)\n"
                "million Tonnes (MT) are shared by seven states, Odisha 99203.83\n"
                "(25.47%), Jharkhand\n"
                "91811.57 MT (23.58%), Chhattisgarh 82666.36 MT (21.23%)")
        tuples = extract_entity_tuples_from_text(text, page_number=4)
        by_value = {t["numeric_value"]: t["mine_name"] for t in tuples}
        assert by_value.get(91811.57) == "Jharkhand"
        assert by_value.get(82666.36) == "Chhattisgarh"

    def test_same_line_label_still_wins_over_prev_line(self):
        # when the label precedes the value on the SAME line, it wins
        text = "Odisha registered highest coal production of 218.981 MT (24.52%)"
        tuples = extract_entity_tuples_from_text(text, page_number=27)
        by_value = {t["numeric_value"]: t["mine_name"] for t in tuples}
        assert by_value.get(218.981) == "Odisha"

    def test_paragraph_boundary_blocks_stale_mention(self):
        # national total in a NEW paragraph must not inherit the previous
        # paragraph's trailing state (observed live: 389421.34 -> West Bengal)
        text = ("... and Maharashtra 13351.63 MT (3.43%).\n\n"
                "Out of the total resource of 389421.34 MT as on 1 April 2024,\n"
                "the share of proved, indicated and inferred resources are\n"
                "212207.16 MT (54.49%), 148716.53 MT (38.19%)")
        tuples = extract_entity_tuples_from_text(text, page_number=4)
        by_value = {t["numeric_value"]: t["mine_name"] for t in tuples}
        assert by_value.get(389421.34) == "All India"
        assert by_value.get(212207.16) == "All India"
        assert by_value.get(148716.53) == "All India"
        # 13351.63 belongs to Maharashtra (same sentence); the national
        # figures in the NEXT paragraph must NOT inherit it
        assert by_value.get(13351.63) == "Maharashtra"
        assert "West Bengal" not in by_value.values()

    def test_split_state_name_repaired_across_break(self):
        # "Madhya\nPradesh" split by OCR hard-wrap
        text = ("seven states, Telangana 23205.52 MT (5.96%), Madhya\n"
                "Pradesh 32815.13 MT (8.43%) and others")
        tuples = extract_entity_tuples_from_text(text, page_number=4)
        by_value = {t["numeric_value"]: t["mine_name"] for t in tuples}
        assert by_value.get(32815.13) == "Madhya Pradesh"

    def test_geological_resources_metric_classification(self):
        text = ("Out of the total geological resources in the country,\n"
                "377012.11 (96.81%) million Tonnes (MT) are shared by seven states")
        tuples = extract_entity_tuples_from_text(text, page_number=4)
        assert tuples
        assert all(t["metric_name"] == "Geological Resources" for t in tuples)

    def test_proved_indicated_inferred_classified(self):
        text = ("the share of proved, indicated and inferred resources are\n"
                "212207.16 MT (54.49%), 148716.53 MT (38.19%) and 28497.65 MT (7.32%)")
        tuples = extract_entity_tuples_from_text(text, page_number=4)
        assert tuples
        assert all(t["metric_name"] == "Geological Resources" for t in tuples)
