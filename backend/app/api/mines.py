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
    DimensionCountResponse
)
from app.services import mine_service

router = APIRouter(tags=["Government Mine Intelligence"])


@router.get("/mines", response_model=List[MineSummaryResponse])
def get_mines(
    response: Response,
    fiscal_year: Optional[str] = Query(None, description="Fiscal year filter, e.g. '2024-25', '2025-26', '2026-27'"),
    subsidiary: Optional[str] = Query(None, description="Subsidiary filter, e.g. 'SECL', 'MCL', 'NCL'"),
    company: Optional[str] = Query(None, description="Company filter, e.g. 'Coal India Limited', 'NTPC'"),
    state: Optional[str] = Query(None, description="State filter, e.g. 'Chhattisgarh', 'Odisha', 'Tamil Nadu'"),
    district: Optional[str] = Query(None, description="District filter"),
    mine_type: Optional[str] = Query(None, description="Mine type, e.g. 'OC', 'UG', 'Mixed'"),
    sector: Optional[str] = Query(None, description="Sector/Ownership filter, e.g. 'CIL', 'Captive', 'Commercial'"),
    ownership: Optional[str] = Query(None, description="Ownership filter"),
    coal_or_lignite: Optional[str] = Query(None, description="Fuel filter, e.g. 'Coal', 'Lignite'"),
    status: Optional[str] = Query(None, description="Operational status, e.g. 'PRODUCING', 'UNDER_DEVELOPMENT'"),
    search: Optional[str] = Query(None, description="Search term for mine name, ID, state, district, or company"),
    sort_by: Optional[str] = Query("name", description="Sort by 'name', 'production', 'state', 'subsidiary', 'type', 'status'"),
    sort_order: Optional[str] = Query("asc", description="Sort order 'asc' or 'desc'"),
    page: Optional[int] = Query(None, ge=1, description="1-indexed page number"),
    page_size: Optional[int] = Query(None, ge=1, le=500, description="Items per page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns authentic Government of India canonical mines data.
    Supports search, multi-field filtering, sorting, and pagination.
    Emits X-Total-Count header for pagination awareness.
    """
    # Calculate skip/limit if page/page_size provided
    actual_skip = skip
    actual_limit = limit
    if page is not None and page_size is not None:
        actual_skip = (page - 1) * page_size
        actual_limit = page_size
    elif page_size is not None:
        actual_limit = page_size

    items, total_count = mine_service.get_mines_list(
        db=db,
        fiscal_year=fiscal_year,
        subsidiary=subsidiary,
        company=company,
        state=state,
        district=district,
        mine_type=mine_type,
        sector=sector,
        ownership=ownership,
        coal_or_lignite=coal_or_lignite,
        status=status,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=actual_skip,
        limit=actual_limit
    )

    response.headers["X-Total-Count"] = str(total_count)
    return items


@router.get("/mines/stats")
def get_mines_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns comprehensive summary statistics and dimensional breakdowns
    across canonical mines, fuel types, mine types, states, and sectors.
    """
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
