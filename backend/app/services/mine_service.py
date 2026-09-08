from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.models.mine import MineMaster, MineYearlyMetric, MineMonthlyMetric, CoalBlock, MineAlias
from app.models.data_provenance import DataSource, DataConflictRecord, DataValidationResult
from app.schemas.mine import (
    MineSummaryResponse,
    MineDetailResponse,
    MineMetricResponse,
    MineMonthlyMetricResponse,
    CoalBlockResponse,
    DataSourceResponse,
    DataConflictRecordResponse,
    DataValidationResultResponse
)


def get_mines_list(
    db: Session,
    fiscal_year: Optional[str] = None,
    subsidiary: Optional[str] = None,
    company: Optional[str] = None,
    state: Optional[str] = None,
    mine_type: Optional[str] = None,
    sector: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[MineSummaryResponse]:
    """
    Returns a unified summary list of canonical mines joined with authentic multi-year metrics.
    """
    query = db.query(MineMaster)

    if subsidiary and subsidiary.upper() != "ALL":
        query = query.filter(MineMaster.subsidiary_name.ilike(f"%{subsidiary}%"))
    if company and company.upper() != "ALL":
        query = query.filter(MineMaster.company_name.ilike(f"%{company}%"))
    if state and state.upper() != "ALL":
        query = query.filter(MineMaster.state.ilike(f"%{state}%"))
    if mine_type and mine_type.upper() != "ALL":
        query = query.filter(MineMaster.mine_type.ilike(f"%{mine_type}%"))
    if sector and sector.upper() != "ALL":
        query = query.filter(MineMaster.ownership_type.ilike(f"%{sector}%"))
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                MineMaster.mine_name.ilike(search_pattern),
                MineMaster.mine_id.ilike(search_pattern),
                MineMaster.state.ilike(search_pattern),
                MineMaster.district.ilike(search_pattern)
            )
        )

    mines = query.order_by(MineMaster.mine_name).offset(skip).limit(limit).all()
    results: List[MineSummaryResponse] = []

    for m in mines:
        # Fetch metrics for all 3 key financial years
        metrics = db.query(MineYearlyMetric).filter(MineYearlyMetric.mine_id == m.mine_id).all()
        metric_by_fy = {met.financial_year: met for met in metrics}

        fy24_25 = metric_by_fy.get("2024-25")
        fy25_26 = metric_by_fy.get("2025-26")
        fy26_27_ytd = metric_by_fy.get("2026-27")

        # Determine target metric: user requested FY or latest available
        target_metric = None
        if fiscal_year:
            target_metric = metric_by_fy.get(fiscal_year)
        if not target_metric:
            target_metric = fy26_27_ytd or fy25_26 or fy24_25

        prod_24 = float(fy24_25.production_mt) if (fy24_25 and fy24_25.production_mt is not None) else None
        prod_25 = float(fy25_26.production_mt) if (fy25_26 and fy25_26.production_mt is not None) else None
        prod_26_ytd = float(fy26_27_ytd.production_mt) if (fy26_27_ytd and fy26_27_ytd.production_mt is not None) else None

        # Calculate authentic YoY growth between FY24-25 and FY25-26 if both exist
        yoy_growth = None
        if prod_24 and prod_25 and prod_24 > 0:
            yoy_growth = round(((prod_25 - prod_24) / prod_24) * 100.0, 2)

        results.append(
            MineSummaryResponse(
                mine_id=m.mine_id,
                mine_name=m.mine_name,
                canonical_name=m.mine_name,
                company_name=m.company_name,
                subsidiary_name=m.subsidiary_name,
                state=m.state,
                district=m.district,
                mine_type=m.mine_type,
                operational_status=m.operational_status,
                ownership_type=m.ownership_type,
                data_origin="government",
                latest_production_mt=float(target_metric.production_mt) if (target_metric and target_metric.production_mt is not None) else None,
                latest_target_mt=float(target_metric.production_target_mt) if (target_metric and target_metric.production_target_mt is not None) else None,
                latest_achievement_percent=float(target_metric.production_achievement_percent) if (target_metric and target_metric.production_achievement_percent is not None) else None,
                latest_fiscal_year=target_metric.financial_year if target_metric else None,
                period_type=target_metric.period_type if target_metric else None,
                data_status=target_metric.data_status if target_metric else None,
                star_rating=target_metric.star_rating if (target_metric and target_metric.star_rating) else (fy24_25.star_rating if fy24_25 else None),
                source_document=target_metric.source_document if target_metric else m.source_document,
                source_url=target_metric.source_url if target_metric else m.source_url,
                production_fy24_25=prod_24,
                production_fy25_26=prod_25,
                production_fy26_27_ytd=prod_26_ytd,
                yoy_growth_percent=yoy_growth
            )
        )

    return results


def get_mine_detail(db: Session, mine_id: str) -> Optional[MineDetailResponse]:
    """
    Returns full details, multi-year metrics, monthly breakdown, aliases, and provenance data sources for a single mine.
    """
    mine = db.query(MineMaster).filter(MineMaster.mine_id == mine_id).first()
    if not mine:
        return None

    # Yearly Metrics
    yearly_metrics = db.query(MineYearlyMetric).filter(
        MineYearlyMetric.mine_id == mine_id
    ).order_by(desc(MineYearlyMetric.financial_year)).all()

    # Monthly Metrics
    monthly_metrics = db.query(MineMonthlyMetric).filter(
        MineMonthlyMetric.mine_id == mine_id
    ).order_by(desc(MineMonthlyMetric.month)).all()

    # Aliases
    aliases = db.query(MineAlias).filter(MineAlias.mine_id == mine_id).all()
    alias_names = [a.original_name for a in aliases]

    # Provenance Sources
    sources = db.query(DataSource).all()
    source_responses = [DataSourceResponse.model_validate(s) for s in sources]

    return MineDetailResponse(
        mine_id=mine.mine_id,
        mine_name=mine.mine_name,
        normalized_mine_name=mine.normalized_mine_name,
        original_mine_name=mine.original_mine_name,
        company_name=mine.company_name,
        subsidiary_name=mine.subsidiary_name,
        state=mine.state,
        district=mine.district,
        coal_or_lignite=mine.coal_or_lignite,
        mine_type=mine.mine_type,
        mining_method=mine.mining_method,
        ownership_type=mine.ownership_type,
        allocation_type=mine.allocation_type,
        end_use=mine.end_use,
        operational_status=mine.operational_status,
        production_status=mine.production_status,
        mine_opening_permission=mine.mine_opening_permission,
        source_id=mine.source_id,
        source_document=mine.source_document,
        source_url=mine.source_url,
        source_page=mine.source_page,
        source_table=mine.source_table,
        source_publication_date=mine.source_publication_date,
        last_verified_at=mine.last_verified_at,
        yearly_metrics=[MineMetricResponse.model_validate(ym) for ym in yearly_metrics],
        monthly_metrics=[MineMonthlyMetricResponse.model_validate(mm) for mm in monthly_metrics],
        aliases=alias_names,
        provenance_sources=source_responses
    )


def get_coal_blocks_list(
    db: Session,
    search: Optional[str] = None,
    state: Optional[str] = None,
    allocation_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[CoalBlockResponse]:
    """
    Returns captive and commercial coal blocks allocated by the Nominated Authority.
    """
    query = db.query(CoalBlock)
    if state and state.upper() != "ALL":
        query = query.filter(CoalBlock.state.ilike(f"%{state}%"))
    if allocation_status and allocation_status.upper() != "ALL":
        query = query.filter(CoalBlock.production_status.ilike(f"%{allocation_status}%"))
    if search:
        search_pat = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CoalBlock.coal_block_name.ilike(search_pat),
                CoalBlock.coal_block_id.ilike(search_pat),
                CoalBlock.allottee.ilike(search_pat),
                CoalBlock.company.ilike(search_pat)
            )
        )

    blocks = query.order_by(CoalBlock.coal_block_name).offset(skip).limit(limit).all()
    return [CoalBlockResponse.model_validate(b) for b in blocks]


def get_data_sources_list(db: Session) -> List[DataSourceResponse]:
    """
    Returns all authoritative primary source documents cataloged in the system.
    """
    sources = db.query(DataSource).order_by(DataSource.source_priority, DataSource.publication_date.desc()).all()
    return [DataSourceResponse.model_validate(s) for s in sources]


def get_data_conflicts_list(
    db: Session,
    resolution_status: Optional[str] = None
) -> List[DataConflictRecordResponse]:
    """
    Returns cross-document conflict records between primary sources.
    """
    query = db.query(DataConflictRecord)
    if resolution_status and resolution_status.upper() != "ALL":
        query = query.filter(DataConflictRecord.resolution_status.ilike(f"%{resolution_status}%"))
    conflicts = query.order_by(desc(DataConflictRecord.conflict_id)).all()
    return [DataConflictRecordResponse.model_validate(c) for c in conflicts]


def get_data_validations_list(
    db: Session,
    status_filter: Optional[str] = None
) -> List[DataValidationResultResponse]:
    """
    Returns arithmetic and reconciliation checks between granular records and official benchmarks.
    """
    query = db.query(DataValidationResult)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(DataValidationResult.status.ilike(f"%{status_filter}%"))
    validations = query.order_by(desc(DataValidationResult.id)).all()
    return [DataValidationResultResponse.model_validate(v) for v in validations]
