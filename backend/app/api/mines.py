from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from app.schemas.mine import (
    MineSummaryResponse,
    MineDetailResponse,
    CoalBlockResponse,
    DataSourceResponse,
    DataConflictRecordResponse,
    DataValidationResultResponse
)
from app.services import mine_service

router = APIRouter(tags=["Government Mine Intelligence"])


@router.get("/mines", response_model=List[MineSummaryResponse])
def get_mines(
    fiscal_year: Optional[str] = Query(None, description="Fiscal year filter, e.g. '2024-25', '2025-26', '2026-27'"),
    subsidiary: Optional[str] = Query(None, description="Subsidiary filter, e.g. 'SECL', 'MCL', 'NCL'"),
    company: Optional[str] = Query(None, description="Company filter, e.g. 'Coal India Limited', 'NTPC'"),
    state: Optional[str] = Query(None, description="State filter, e.g. 'Chhattisgarh', 'Odisha', 'Madhya Pradesh'"),
    mine_type: Optional[str] = Query(None, description="Mine type, e.g. 'Open Cast', 'Underground'"),
    sector: Optional[str] = Query(None, description="Sector, e.g. 'PSU', 'Captive', 'Commercial'"),
    search: Optional[str] = Query(None, description="Search term for mine name, district, or coalfield"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns authentic Government of India canonical mines data.
    Preserves exact granularity without fabrication or estimation.
    """
    return mine_service.get_mines_list(
        db=db,
        fiscal_year=fiscal_year,
        subsidiary=subsidiary,
        company=company,
        state=state,
        mine_type=mine_type,
        sector=sector,
        search=search,
        skip=skip,
        limit=limit
    )


@router.get("/mines/{mine_id}", response_model=MineDetailResponse)
def get_mine_details(
    mine_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves full canonical details, yearly metrics, monthly metrics, aliases,
    and authoritative source citations for a single mine.
    """
    mine = mine_service.get_mine_detail(db=db, mine_id=mine_id)
    if not mine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found in canonical registry."
        )
    return mine


@router.get("/coal-blocks", response_model=List[CoalBlockResponse])
def get_coal_blocks(
    search: Optional[str] = Query(None, description="Search term for block name, allottee, or coalfield"),
    state: Optional[str] = Query(None, description="State filter"),
    allocation_status: Optional[str] = Query(None, description="Allocation status, e.g. 'Operational', 'Under Development'"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns captive and commercial coal blocks allocated by the Nominated Authority, Ministry of Coal.
    """
    return mine_service.get_coal_blocks_list(
        db=db,
        search=search,
        state=state,
        allocation_status=allocation_status,
        skip=skip,
        limit=limit
    )


@router.get("/data-sources", response_model=List[DataSourceResponse])
def get_data_sources(db: Session = Depends(get_db)):
    """
    Returns the authoritative Government of India data source catalog (Tiers 1-6)
    with publication dates, document titles, reference numbers, and verification statuses.
    """
    return mine_service.get_data_sources_list(db=db)


@router.get("/data-conflicts", response_model=List[DataConflictRecordResponse])
def get_data_conflicts(
    resolution_status: Optional[str] = Query(None, description="Filter by resolution status, e.g. 'RESOLVED', 'OPEN'"),
    db: Session = Depends(get_db)
):
    """
    Returns cross-document discrepancy records identified between official publications.
    """
    return mine_service.get_data_conflicts_list(db=db, resolution_status=resolution_status)


@router.get("/data-validations", response_model=List[DataValidationResultResponse])
def get_data_validations(
    status_filter: Optional[str] = Query(None, description="Filter by status, e.g. 'VERIFIED_EXACT', 'WITHIN_TOLERANCE', 'DISCREPANCY_NOTED'"),
    db: Session = Depends(get_db)
):
    """
    Returns arithmetic verification checks (sum of mines vs company/state/national benchmarks).
    """
    return mine_service.get_data_validations_list(db=db, status_filter=status_filter)


@router.get("/mines-summary-stats")
def get_mines_summary_stats(db: Session = Depends(get_db)):
    """
    Provides top-level aggregate statistics across all canonical mines and government data sources.
    """
    from app.models.mine import MineMaster, MineYearlyMetric, CoalBlock
    from app.models.data_provenance import DataSource, DataConflictRecord, DataValidationResult
    from sqlalchemy import func

    total_mines = db.query(MineMaster).count()
    total_blocks = db.query(CoalBlock).count()
    total_sources = db.query(DataSource).count()
    total_conflicts = db.query(DataConflictRecord).count()
    total_validations = db.query(DataValidationResult).count()

    # Sum of actual production for FY24-25, FY25-26, FY26-27 YTD across canonical mines
    fy24_sum = db.query(func.sum(MineYearlyMetric.production_mt)).filter(
        MineYearlyMetric.financial_year == "2024-25"
    ).scalar() or 0.0

    fy25_sum = db.query(func.sum(MineYearlyMetric.production_mt)).filter(
        MineYearlyMetric.financial_year == "2025-26"
    ).scalar() or 0.0

    fy26_sum = db.query(func.sum(MineYearlyMetric.production_mt)).filter(
        MineYearlyMetric.financial_year == "2026-27"
    ).scalar() or 0.0

    return {
        "total_canonical_mines": total_mines,
        "total_coal_blocks": total_blocks,
        "authoritative_sources_count": total_sources,
        "cross_document_conflicts_count": total_conflicts,
        "validation_checks_count": total_validations,
        "major_mines_production": {
            "fy_2024_25_mt": round(float(fy24_sum), 3),
            "fy_2025_26_mt": round(float(fy25_sum), 3),
            "fy_2026_27_ytd_mt": round(float(fy26_sum), 3),
            "as_of_date": "2026-06-30",
            "period_type_26_27": "YTD (Q1 April-June 2026)",
            "data_status_26_27": "provisional"
        },
        "national_benchmarks": {
            "fy_2024_25_all_india_mt": 1047.523,
            "fy_2024_25_captive_commercial_mt": 190.95,
            "fy_2025_26_captive_commercial_mt": 210.47,
            "source_authority": "Ministry of Coal, Government of India (coal.gov.in)"
        }
    }
