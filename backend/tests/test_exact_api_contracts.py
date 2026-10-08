import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from database import SessionLocal
from app.models.mine import MineMaster, MineYearlyMetric
from data.contract_historical_seed import run_contract_seed

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_contract_data():
    run_contract_seed()


def test_get_mines_years_contract():
    """Verify GET /api/v1/mines/years contract and YYYY-YY formatting."""
    response = client.get("/api/v1/mines/years")
    assert response.status_code == 200
    data = response.json()
    assert "available_years" in data
    assert "default_year" in data
    assert "current_reporting_year" in data
    assert data["default_year"] == "2024-25"
    assert data["current_reporting_year"] == "2026-27"

    # All years must be strictly YYYY-YY format
    for yr in data["available_years"]:
        assert len(yr) == 7
        assert yr[4] == "-"
        assert yr[:4].isdigit()
        assert yr[5:].isdigit()
    assert "2024-25" in data["available_years"]
    assert "2025-26" in data["available_years"]
    assert "2026-27" in data["available_years"]
    assert "2023-24" in data["available_years"]
    assert "2022-23" in data["available_years"]


def test_get_mines_envelope_and_pagination():
    """Verify GET /api/v1/mines returns exact envelope with data, pagination, and filters."""
    response = client.get("/api/v1/mines?page=1&page_size=10&financial_year=2024-25")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "pagination" in body
    assert "filters" in body

    pagination = body["pagination"]
    assert pagination["page"] == 1
    assert pagination["page_size"] == 10
    assert pagination["total_records"] > 0
    assert pagination["total_pages"] >= 1
    assert len(body["data"]) <= 10
    assert body["filters"]["financial_year"] == "2024-25"

    # Check X-Total-Count header
    assert "x-total-count" in response.headers


def test_get_mines_year_isolation():
    """
    Verify year isolation: selecting 2023-24 returns metrics for 2023-24,
    not 2024-25 metrics, and preserves NULL for mines not reported in 2023-24.
    """
    res_24 = client.get("/api/v1/mines?financial_year=2024-25&limit=100")
    assert res_24.status_code == 200
    gevra_24 = next((m for m in res_24.json()["data"] if m["mine_id"] == "MINE-SECL-GEVRA"), None)
    assert gevra_24 is not None
    assert gevra_24["financial_year"] == "2024-25"
    assert gevra_24["production_mt"] == 59.32

    res_23 = client.get("/api/v1/mines?financial_year=2023-24&limit=100")
    assert res_23.status_code == 200
    gevra_23 = next((m for m in res_23.json()["data"] if m["mine_id"] == "MINE-SECL-GEVRA"), None)
    assert gevra_23 is not None
    assert gevra_23["financial_year"] == "2023-24"
    assert gevra_23["production_mt"] == 56.10  # Verified 2023-24 production, distinct from 59.32

    # Verify that a mine with no 2023-24 reported data has production_mt as None (not copied from 2024-25)
    unreported_23 = next((m for m in res_23.json()["data"] if m["production_mt"] is None), None)
    if unreported_23:
        assert unreported_23["financial_year"] == "2023-24"


def test_get_mine_detail_contract():
    """Verify GET /api/v1/mines/{mineId} returns the exact 6-part envelope."""
    response = client.get("/api/v1/mines/MINE-SECL-GEVRA")
    assert response.status_code == 200
    data = response.json()
    assert "mine" in data
    assert "current_metrics" in data
    assert "historical_metrics" in data
    assert "aliases" in data
    assert "sources" in data
    assert "conflicts" in data

    assert data["mine"]["mine_id"] == "MINE-SECL-GEVRA"
    assert data["mine"]["state"] == "Chhattisgarh"
    assert len(data["historical_metrics"]) >= 3
    assert len(data["aliases"]) >= 1


def test_get_mine_history_contract():
    """Verify GET /api/v1/mines/{mineId}/history contract."""
    response = client.get("/api/v1/mines/MINE-SECL-GEVRA/history")
    assert response.status_code == 200
    data = response.json()
    assert data["mine_id"] == "MINE-SECL-GEVRA"
    assert "history" in data
    assert len(data["history"]) >= 3
    years = [h["financial_year"] for h in data["history"]]
    assert "2024-25" in years


def test_get_mine_filters_contract():
    """Verify GET /api/v1/mines/filters returns valid option arrays."""
    response = client.get("/api/v1/mines/filters?financial_year=2024-25")
    assert response.status_code == 200
    data = response.json()
    assert data["financial_year"] == "2024-25"
    assert isinstance(data["states"], list)
    assert "Chhattisgarh" in data["states"] or "Odisha" in data["states"]
    assert isinstance(data["ownership_types"], list)
    assert isinstance(data["commodities"], list)
    assert "coal" in data["commodities"]


def test_get_mine_analytics_and_trend():
    """Verify GET /api/v1/mines/analytics and GET /api/v1/mines/analytics/trend."""
    res_analytics = client.get("/api/v1/mines/analytics?financial_year=2024-25")
    assert res_analytics.status_code == 200
    a_data = res_analytics.json()
    assert a_data["financial_year"] == "2024-25"
    assert a_data["total_mines"] > 0
    assert a_data["total_production_mt"] > 0
    assert "star_rating_distribution" in a_data

    res_trend = client.get("/api/v1/mines/analytics/trend")
    assert res_trend.status_code == 200
    t_data = res_trend.json()
    assert "series" in t_data
    assert len(t_data["series"]) >= 3


def test_coal_blocks_contract_and_benchmarks():
    """
    Verify Section 31 Nominated Authority benchmarks:
    - 2024-25: 69 operational blocks, 190.95 MT
    - 2025-26: 81 operational blocks, 210.47 MT
    - 2026-27: 82 operational blocks, 30.50 MT (YTD)
    """
    # 2024-25 summary
    s24 = client.get("/api/v1/coal-blocks/summary?financial_year=2024-25")
    assert s24.status_code == 200
    assert s24.json()["operational_blocks"] == 69
    assert s24.json()["total_production_mt"] == 190.95

    # 2025-26 summary
    s25 = client.get("/api/v1/coal-blocks/summary?financial_year=2025-26")
    assert s25.status_code == 200
    assert s25.json()["operational_blocks"] == 81
    assert s25.json()["total_production_mt"] == 210.47

    # 2026-27 summary
    s26 = client.get("/api/v1/coal-blocks/summary?financial_year=2026-27")
    assert s26.status_code == 200
    assert s26.json()["operational_blocks"] == 82
    assert s26.json()["total_production_mt"] == 30.50

    # Trend
    trend_res = client.get("/api/v1/coal-blocks/trend")
    assert trend_res.status_code == 200
    trend = trend_res.json()["trend"]
    assert len(trend) >= 10
    # First point 2015-16
    assert trend[0]["financial_year"] == "2015-16"
    assert trend[0]["operational_blocks"] == 11
    assert trend[0]["production_mt"] == 29.50


def test_sources_and_coverage_contract():
    """Verify GET /api/v1/sources and GET /api/v1/coverage contracts."""
    res_sources = client.get("/api/v1/sources")
    assert res_sources.status_code == 200
    sources_data = res_sources.json()
    assert "total_sources" in sources_data
    assert sources_data["total_sources"] > 0
    assert len(sources_data["sources"]) > 0

    res_cov = client.get("/api/v1/coverage?financial_year=2024-25")
    assert res_cov.status_code == 200
    cov_data = res_cov.json()
    assert cov_data["financial_year"] == "2024-25"
    assert "national_benchmarks" in cov_data


def test_reconciliation_contract():
    """Verify GET /api/v1/reconciliation and GET /api/v1/reconciliation/summary contracts."""
    res_rec = client.get("/api/v1/reconciliation?financial_year=2024-25")
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert rec_data["financial_year"] == "2024-25"
    assert "results" in rec_data
    assert "conflicts" in rec_data

    res_sum = client.get("/api/v1/reconciliation/summary?financial_year=2024-25")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["financial_year"] == "2024-25"
    assert "passed" in sum_data
    assert "open_conflicts" in sum_data
