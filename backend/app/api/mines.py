from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status, Response
from sqlalchemy.orm import Session

from database import get_db
from app.schemas.mine import (
    MineSummaryResponse,
    MineDetailResponse,
    CoalBlockResponse,
    DataSourceResponse,
    DataConflictRecordResponse,
    DataValidationResultResponse,
    DimensionCountResponse,
)
from app.schemas.contracts import (
    MineListEnvelope,
    MineDetailEnvelope,
    MineHistoryEnvelope,
    MineFiltersOptionsResponse,
    MineYearsResponse,
    MineAnalyticsResponse,
    MineAnalyticsTrendResponse,
    CoalBlocksEnvelope,
    CoalBlockSummaryResponse,
    CoalBlockTrendResponse,
    SourcesResponse,
    CoverageResponse,
    CoverageSourceResponse,
    ReconciliationResponse,
    ReconciliationSummaryResponse,
)
from app.services import mine_service

router = APIRouter(tags=["Government Mine Intelligence"])


# -------------------------------------------------------------------------
# Exact Contract: /mines with envelope
# -------------------------------------------------------------------------
@router.get("/mines", response_model=MineListEnvelope)
def get_mines(
    response: Response,
    financial_year: Optional[str] = Query("2024-25", description="Financial year strictly in YYYY-YY format, e.g. '2024-25', '2025-26', '2026-27'"),
    fiscal_year: Optional[str] = Query(None, description="Alias for financial_year"),
    state: Optional[str] = Query(None, description="State filter, e.g. 'Chhattisgarh', 'Odisha'"),
    ownership_type: Optional[str] = Query(None, description="Ownership filter, e.g. 'CIL', 'Captive', 'Commercial'"),
    sector: Optional[str] = Query(None, description="Sector filter"),
    commodity: Optional[str] = Query(None, description="Commodity filter, e.g. 'coal', 'lignite'"),
    operational_status: Optional[str] = Query(None, description="Operational status, e.g. 'operational', 'under_development'"),
    captive_or_commercial: Optional[str] = Query(None, description="Captive vs Commercial filter"),
    company: Optional[str] = Query(None, description="Company filter"),
    subsidiary: Optional[str] = Query(None, description="Subsidiary filter"),
    coal_or_lignite: Optional[str] = Query(None, description="Fuel filter"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter"),
    search: Optional[str] = Query(None, description="Search across mine name, ID, state, district, or company"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(25, ge=1, le=500, description="Items per page"),
    sort_by: Optional[str] = Query("name", description="Sort by 'name', 'production', 'state', 'subsidiary', 'type', 'status'"),
    sort_order: Optional[str] = Query("asc", description="Sort order 'asc' or 'desc'"),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns authentic Government of India canonical mines data in strict contract envelope:
    { "data": [...], "pagination": { "page", "page_size", "total_records", "total_pages" }, "filters": { ... } }
    """
    fy = fiscal_year or financial_year or "2024-25"
    actual_page = page
    actual_size = page_size
    if skip is not None and limit is not None:
        actual_page = (skip // limit) + 1
        actual_size = limit
    elif limit is not None:
        actual_size = limit

    envelope = mine_service.get_mines_envelope(
        db=db,
        financial_year=fy,
        state=state,
        ownership_type=ownership_type,
        sector=sector,
        commodity=commodity,
        operational_status=operational_status or status_filter,
        captive_or_commercial=captive_or_commercial,
        company=company,
        subsidiary=subsidiary,
        coal_or_lignite=coal_or_lignite,
        search=search,
        page=actual_page,
        page_size=actual_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    response.headers["X-Total-Count"] = str(envelope.pagination.total_records)
    return envelope


# -------------------------------------------------------------------------
# Static Sub-routes for /mines/... (MUST precede /{mine_id})
# -------------------------------------------------------------------------
@router.get("/mines/filters", response_model=MineFiltersOptionsResponse)
def get_mine_filters(
    financial_year: Optional[str] = Query(None, description="Selected financial year"),
    db: Session = Depends(get_db)
):
    """Returns available dynamic filter options for canonical mines."""
    return mine_service.get_mine_filters_options(db=db, financial_year=financial_year)


@router.get("/mines/years", response_model=MineYearsResponse)
def get_mine_years(db: Session = Depends(get_db)):
    """Returns available financial years strictly formatted as YYYY-YY."""
    return mine_service.get_mine_years(db=db)


@router.get("/mines/analytics", response_model=MineAnalyticsResponse)
def get_mine_analytics(
    financial_year: Optional[str] = Query("2024-25", description="Financial year in YYYY-YY format"),
    db: Session = Depends(get_db)
):
    """Returns aggregated analytics for canonical mines for a specified financial year."""
    return mine_service.get_mine_analytics(db=db, financial_year=financial_year)


@router.get("/mines/analytics/trend", response_model=MineAnalyticsTrendResponse)
def get_mine_analytics_trend(db: Session = Depends(get_db)):
    """Returns multi-year production and achievement trend across financial years."""
    return mine_service.get_mine_analytics_trend(db=db)


@router.get("/mines/stats")
def get_mines_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns comprehensive summary statistics and dimensional breakdowns."""
    return mine_service.get_mines_stats_data(db=db)


@router.get("/mines/states", response_model=List[DimensionCountResponse])
def get_mines_states(db: Session = Depends(get_db)):
    """Returns dynamic list of all represented states with canonical mine counts."""
    return mine_service.get_states_list(db=db)


@router.get("/mines/subsidiaries", response_model=List[DimensionCountResponse])
def get_mines_subsidiaries(db: Session = Depends(get_db)):
    """Returns dynamic list of all operating subsidiaries with canonical mine counts."""
    return mine_service.get_subsidiaries_list(db=db)


@router.get("/mines/sectors", response_model=List[DimensionCountResponse])
def get_mines_sectors(db: Session = Depends(get_db)):
    """Returns dynamic list of ownership sectors with canonical mine counts."""
    return mine_service.get_sectors_list(db=db)


@router.get("/mines/types", response_model=List[DimensionCountResponse])
def get_mines_types(db: Session = Depends(get_db)):
    """Returns dynamic list of mine types (OC, UG, Mixed) with canonical mine counts."""
    return mine_service.get_mine_types_list(db=db)


@router.get("/mines/companies", response_model=List[DimensionCountResponse])
def get_mines_companies(db: Session = Depends(get_db)):
    """Returns dynamic list of operating companies with canonical mine counts."""
    return mine_service.get_companies_list(db=db)


@router.get("/mines-summary-stats")
def get_mines_summary_stats_alias(db: Session = Depends(get_db)):
    """Backward-compatible alias for /mines/stats."""
    return mine_service.get_mines_stats_data(db=db)


# -------------------------------------------------------------------------
# Dynamic /mines/{mine_id} Sub-routes
# -------------------------------------------------------------------------
@router.get("/mines/{mine_id}/history", response_model=MineHistoryEnvelope)
def get_mine_history(
    mine_id: str,
    db: Session = Depends(get_db)
):
    """Returns complete multi-year production and dispatch history for a single mine."""
    history_env = mine_service.get_mine_history_envelope(db=db, mine_id=mine_id)
    if not history_env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found in canonical registry."
        )
    return history_env


@router.get("/mines/{mine_id}", response_model=MineDetailEnvelope)
def get_mine_details(
    mine_id: str,
    financial_year: Optional[str] = Query(None, description="Optional financial year filter for current_metrics"),
    db: Session = Depends(get_db)
):
    """
    Retrieves full canonical details, yearly metrics, monthly metrics, aliases,
    authoritative sources, and discrepancy records for a single mine.
    """
    mine = mine_service.get_mine_detail_envelope(db=db, mine_id=mine_id, financial_year=financial_year)
    if not mine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found in canonical registry."
        )
    return mine


# -------------------------------------------------------------------------
# Coal Blocks Routes
# -------------------------------------------------------------------------
@router.get("/coal-blocks/summary", response_model=CoalBlockSummaryResponse)
def get_coal_blocks_summary(
    financial_year: Optional[str] = Query("2024-25", description="Financial year strictly in YYYY-YY format"),
    db: Session = Depends(get_db)
):
    """Returns official Nominated Authority summary benchmarks for captive & commercial coal blocks."""
    return mine_service.get_coal_blocks_summary(db=db, financial_year=financial_year)


@router.get("/coal-blocks/trend", response_model=CoalBlockTrendResponse)
def get_coal_blocks_trend(db: Session = Depends(get_db)):
    """Returns Nominated Authority historical trend series from 2015-16 to 2026-27 YTD."""
    return mine_service.get_coal_blocks_trend(db=db)


@router.get("/coal-blocks", response_model=CoalBlocksEnvelope)
def get_coal_blocks(
    financial_year: Optional[str] = Query("2024-25", description="Financial year in YYYY-YY format"),
    search: Optional[str] = Query(None, description="Search term for block name, allottee, or company"),
    state: Optional[str] = Query(None, description="State filter"),
    allocation_method: Optional[str] = Query(None, description="Allocation method, e.g. 'Auction', 'Allotment'"),
    allocation_status: Optional[str] = Query(None, description="Allocation / operational status"),
    operational_status: Optional[str] = Query(None, description="Operational status filter"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(25, ge=1, le=500, description="Items per page"),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Returns captive and commercial coal blocks allocated by the Nominated Authority."""
    actual_page = page
    actual_size = page_size
    if skip is not None and limit is not None:
        actual_page = (skip // limit) + 1
        actual_size = limit
    elif limit is not None:
        actual_size = limit

    return mine_service.get_coal_blocks_envelope(
        db=db,
        financial_year=financial_year,
        state=state,
        allocation_method=allocation_method,
        operational_status=operational_status or allocation_status,
        search=search,
        page=actual_page,
        page_size=actual_size,
    )


# -------------------------------------------------------------------------
# Sources, Coverage & Reconciliation Routes
# -------------------------------------------------------------------------
@router.get("/sources", response_model=SourcesResponse)
def get_sources(db: Session = Depends(get_db)):
    """Returns the authoritative Government of India data source catalog envelope."""
    return mine_service.get_sources_envelope(db=db)


@router.get("/data-sources", response_model=List[DataSourceResponse])
def get_data_sources_legacy(db: Session = Depends(get_db)):
    """Legacy endpoint returning list of authoritative data sources."""
    return mine_service.get_data_sources_list(db=db)


@router.get("/coverage/source/{source_id}", response_model=CoverageSourceResponse)
def get_coverage_by_source(source_id: str, db: Session = Depends(get_db)):
    """Returns coverage and observation breakdown for a specific source ID."""
    cov = mine_service.get_coverage_source_detail(db=db, source_id=source_id)
    if not cov:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source with ID '{source_id}' not found."
        )
    return cov


@router.get("/coverage", response_model=CoverageResponse)
def get_coverage(
    financial_year: Optional[str] = Query("2024-25", description="Financial year in YYYY-YY format"),
    db: Session = Depends(get_db)
):
    """Returns coverage benchmarks and source observation counts for the specified financial year."""
    return mine_service.get_coverage_envelope(db=db, financial_year=financial_year)


@router.get("/reconciliation/summary", response_model=ReconciliationSummaryResponse)
def get_reconciliation_summary(
    financial_year: Optional[str] = Query("2024-25", description="Financial year in YYYY-YY format"),
    db: Session = Depends(get_db)
):
    """Returns validation pass/fail summary and open discrepancy count."""
    return mine_service.get_reconciliation_summary(db=db, financial_year=financial_year)


@router.get("/reconciliation", response_model=ReconciliationResponse)
def get_reconciliation(
    financial_year: Optional[str] = Query("2024-25", description="Financial year in YYYY-YY format"),
    db: Session = Depends(get_db)
):
    """Returns arithmetic verification checks and cross-document discrepancy records."""
    return mine_service.get_reconciliation_envelope(db=db, financial_year=financial_year)


@router.get("/data-conflicts", response_model=List[DataConflictRecordResponse])
def get_data_conflicts_legacy(
    resolution_status: Optional[str] = Query(None, description="Filter by resolution status, e.g. 'RESOLVED', 'OPEN'"),
    db: Session = Depends(get_db)
):
    """Legacy endpoint returning cross-document discrepancy records."""
    return mine_service.get_data_conflicts_list(db=db, resolution_status=resolution_status)


@router.get("/data-validations", response_model=List[DataValidationResultResponse])
def get_data_validations_legacy(
    status_filter: Optional[str] = Query(None, description="Filter by status, e.g. 'PASSED', 'WARNING', 'FAILED'"),
    db: Session = Depends(get_db)
):
    """Legacy endpoint returning arithmetic verification checks."""
    return mine_service.get_data_validations_list(db=db, status_filter=status_filter)
