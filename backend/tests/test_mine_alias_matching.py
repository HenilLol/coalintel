"""
Regression tests for mine-alias symmetric matching (Issue #68).
Run: python -m pytest tests/test_mine_alias_matching.py -q
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.normalization_service import (
    get_base_mine_name,
    mine_name_variants,
    chunk_has_metric_for_entity,
)


class TestBaseNameStripping:
    """Issue #68: variant suffixes (OCP, OCM, Open Cast, Project) must strip."""

    @pytest.mark.parametrize("raw,expected", [
        ("Gevra OC", "Gevra"),
        ("Gevra OCP", "Gevra"),
        ("Gevra OCM", "Gevra"),
        ("Gevra OpenCast", "Gevra"),
        ("Gevra Open Cast", "Gevra"),
        ("Gevra Opencast", "Gevra"),
        ("Gevra Project", "Gevra"),
        ("Kusmunda OCP", "Kusmunda"),
        ("Moonidih UG", "Moonidih"),
        ("Moonidih Underground", "Moonidih"),
        ("Sonepur Bazari", "Sonepur Bazari"),      # no suffix: unchanged
        ("Sonepur-Bazari OC", "Sonepur-Bazari"),    # hyphenated base preserved
        ("", ""),
        (None, ""),
    ])
    def test_base_name(self, raw, expected):
        assert get_base_mine_name(raw) == expected


class TestVariantExpansion:
    """Issue #68: variant expansion must cover all alias families symmetrically."""

    def test_gevra_variants_include_all_opencast_aliases(self):
        variants = mine_name_variants("Gevra OCP")
        assert "Gevra" in variants
        lowered = {v.lower() for v in variants}
        for s in ["gevra oc", "gevra ocp", "gevra ocm", "gevra opencast",
                  "gevra open cast", "gevra project", "gevra ug", "gevra underground"]:
            assert s in lowered, f"missing alias '{s}' in {lowered}"

    def test_bare_name_expands_too(self):
        variants = mine_name_variants("Rajmahal")
        assert "Rajmahal" in variants
        assert "Rajmahal OC" in variants
        assert "Rajmahal OCP" in variants


COAL_PRODUCTION_DOMAIN = {
    "db_metric_names": ["Coal Production", "Production"],
    "canonical_name": "Coal Production",
    "patterns": [r"\bproduction\b", r"\bproduced\b", r"\bcoal\s+output\b"],
}


class TestChunkEntityMatching:
    """Issue #68 core: query variant <-> evidence variant must match in BOTH directions."""

    def test_ocp_query_matches_oc_evidence(self):
        chunk = "Kusmunda OC produced 62.5 MT of coal in FY 2023-24."
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Kusmunda OCP"], metric_domain=COAL_PRODUCTION_DOMAIN,
        ) is True

    def test_oc_query_matches_ocp_evidence(self):
        chunk = "Kusmunda OCP produced 62.5 MT of coal in FY 2023-24."
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Kusmunda OC"], metric_domain=COAL_PRODUCTION_DOMAIN,
        ) is True

    def test_bare_query_matches_suffixed_evidence(self):
        chunk = "Gevra OpenCast recorded coal production of 59.11 MT during 2023-24."
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Gevra"], metric_domain=COAL_PRODUCTION_DOMAIN,
        ) is True

    def test_suffixed_query_matches_bare_evidence(self):
        chunk = "Gevra achieved 59.11 MT coal production in FY 2023-24."
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Gevra OC"], metric_domain=COAL_PRODUCTION_DOMAIN,
        ) is True

    def test_hyphenated_base_preserved(self):
        chunk = "Sonepur-Bazari OC coal production was 21.4 MT in FY 2023-24."
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Sonepur-Bazari OCP"], metric_domain=COAL_PRODUCTION_DOMAIN,
        ) is True

    def test_unrelated_mine_still_rejected(self):
        """Alias expansion must not create false POSITIVES across different mines."""
        chunk = "Dipka OC produced 35.2 MT of coal in FY 2023-24."
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Kusmunda OCP"], metric_domain=COAL_PRODUCTION_DOMAIN,
        ) is False

    def test_mine_only_matching_no_metric_constraint(self):
        chunk = "Rajmahal OCM overburden removal figures for FY 2023-24."
        assert chunk_has_metric_for_entity(chunk, target_mines=["Rajmahal OC"]) is True
        assert chunk_has_metric_for_entity(chunk, target_mines=["Dipka OC"]) is False

    def test_structured_extraction_line_matches_variant(self):
        chunk = ("Mine Entity: Kusmunda OCP | Metric: Coal Production | "
                 "Raw Extracted Value: 62.5 Lakh Tonnes | Fiscal Year: 2023-24")
        assert chunk_has_metric_for_entity(
            chunk, target_mines=["Kusmunda OC"],
            metric_domain={"db_metric_names": ["Coal Production"], "canonical_name": "Coal Production", "patterns": [r"\bproduction\b"]},
        ) is True
