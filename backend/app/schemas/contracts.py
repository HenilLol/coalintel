from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class PaginationInfo(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int

    model_config = ConfigDict(from_attributes=True)


class MineListRecord(BaseModel):
    mine_id: str
    mine_name: str
    canonical_name: str
    company_name: str
    parent_company: Optional[str] = None
    subsidiary_name: Optional[str] = None
    state: str
    district: Optional[str] = None
    block: Optional[str] = None
    coalfield: Optional[str] = None
    coal_or_lignite: str = "Coal"
    commodity: Optional[str] = "coal"
    mine_type: Optional[str] = None
    mining_method: Optional[str] = None
    sector: Optional[str] = None
    ownership_type: Optional[str] = None
    captive_or_commercial: Optional[str] = None
    operational_status: str = "operational"
    production_status: Optional[str] = None
    production_mt: Optional[float] = None
    target_mt: Optional[float] = None
    achievement_percent: Optional[float] = None
    financial_year: str
    period_type: Optional[str] = "annual"
    data_status: Optional[str] = "reported"
    star_rating: Optional[int] = None
    source_id: Optional[str] = None
    source_document: Optional[str] = None
    source_url: Optional[str] = None
    verification_status: str = "verified"
    data_origin: str = "government"

    # Multi-year trajectory indicators if available
    production_fy24_25: Optional[float] = None
    production_fy25_26: Optional[float] = None
    production_fy26_27_ytd: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class MineListEnvelope(BaseModel):
    data: List[MineListRecord]
    pagination: PaginationInfo
    filters: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class DataSourceContract(BaseModel):
    source_id: str
    organization: str
    document_title: str
    document_type: str
    publication_date: Optional[str] = None
    financial_year: str
    url: Optional[str] = None
    page_number: Optional[int] = None
    table_number: Optional[str] = None
    chapter: Optional[str] = None
    section_name: Optional[str] = None
    source_priority: int = 1
    verification_status: str = "verified"

    model_config = ConfigDict(from_attributes=True)


class MineMetricContract(BaseModel):
    id: Optional[int] = None
    mine_id: str
    financial_year: str
    period_type: str = "annual"
    data_status: str = "reported"
    production_mt: Optional[float] = None
    production_target_mt: Optional[float] = None
    production_achievement_percent: Optional[float] = None
    dispatch_mt: Optional[float] = None
    dispatch_target_mt: Optional[float] = None
    dispatch_achievement_percent: Optional[float] = None
    coal_grade: Optional[str] = None
    mine_type: Optional[str] = None
    mining_method: Optional[str] = None
    operational_status: Optional[str] = None
    production_status: Optional[str] = None
    star_rating: Optional[float] = None
    star_rating_category: Optional[str] = None
    obr_mcum: Optional[float] = None
    manpower: Optional[int] = None
    employment: Optional[int] = None
    as_of_date: Optional[str] = None
    source_id: str
    source_document: Optional[str] = None
    source_url: Optional[str] = None
    source_page: Optional[int] = None
    source_table: Optional[str] = None
    verification_status: str = "verified"
    data_origin: str = "government"

    model_config = ConfigDict(from_attributes=True)


class MineConflictContract(BaseModel):
    conflict_id: int
    entity_type: str
    entity_id: str
    metric: str
    financial_year: str
    source_a: str
    value_a: float
    source_b: str
    value_b: float
    difference: float
    difference_percent: float
    possible_reason: str
    resolution_status: str
    resolved_value: Optional[float] = None
    resolution_method: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MineDetailContract(BaseModel):
    mine_id: str
    mine_name: str
    normalized_mine_name: str
    original_mine_name: Optional[str] = None
    company_name: str
    parent_company: Optional[str] = None
    subsidiary_name: Optional[str] = None
    state: str
    district: Optional[str] = None
    block: Optional[str] = None
    block_name: Optional[str] = None
    coalfield: Optional[str] = None
    coal_or_lignite: str = "Coal"
    commodity: Optional[str] = "coal"
    mine_type: Optional[str] = None
    mining_method: Optional[str] = None
    sector: Optional[str] = None
    ownership_type: Optional[str] = None
    allocation_type: Optional[str] = None
    end_use: Optional[str] = None
    operational_status: str
    production_status: Optional[str] = None
    mine_opening_permission: Optional[str] = None
    captive_or_commercial: Optional[str] = None
    financial_year: Optional[str] = None
    source_id: Optional[str] = None
    source_document: Optional[str] = None
    source_url: Optional[str] = None
    source_page: Optional[int] = None
    source_table: Optional[str] = None
    verification_status: str = "verified"
    data_origin: str = "government"

    model_config = ConfigDict(from_attributes=True)


class MineDetailEnvelope(BaseModel):
    mine: MineDetailContract
    current_metrics: Optional[MineMetricContract] = None
    historical_metrics: List[MineMetricContract] = []
    aliases: List[str] = []
    sources: List[DataSourceContract] = []
    conflicts: List[MineConflictContract] = []

    model_config = ConfigDict(from_attributes=True)


class MineHistoryEnvelope(BaseModel):
    mine_id: str
    history: List[MineMetricContract]

    model_config = ConfigDict(from_attributes=True)


class MineFiltersOptionsResponse(BaseModel):
    financial_year: str
    states: List[str]
    ownership_types: List[str]
    sectors: List[str]
    commodities: List[str]
    operational_statuses: List[str]
    companies: List[str]

    model_config = ConfigDict(from_attributes=True)


class MineYearsResponse(BaseModel):
    available_years: List[str]
    default_year: str
    current_reporting_year: str

    model_config = ConfigDict(from_attributes=True)


class MineAnalyticsResponse(BaseModel):
    financial_year: str
    total_mines: int
    total_production_mt: float
    total_target_mt: Optional[float] = None
    achievement_percent: Optional[float] = None
    by_ownership: Dict[str, Any] = {}
    by_state: Dict[str, Any] = {}
    by_sector: Dict[str, Any] = {}
    star_rating_distribution: Dict[str, int] = {}

    model_config = ConfigDict(from_attributes=True)


class MineTrendPoint(BaseModel):
    financial_year: str
    total_mines: int
    production_mt: float
    target_mt: Optional[float] = None
    achievement_percent: Optional[float] = None
    growth_percent: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class MineAnalyticsTrendResponse(BaseModel):
    series: List[MineTrendPoint]

    model_config = ConfigDict(from_attributes=True)


# Coal Blocks
class CoalBlockItem(BaseModel):
    coal_block_id: str
    coal_block_name: str
    normalized_name: Optional[str] = None
    mine_name: Optional[str] = None
    mine_id: Optional[str] = None
    allottee: str
    company: Optional[str] = None
    company_name: Optional[str] = None
    state: str
    district: Optional[str] = None
    allocation_method: Optional[str] = None
    allocation_date: Optional[str] = None
    end_use: Optional[str] = None
    sale_of_coal: Optional[bool] = None
    mine_opening_permission: Optional[bool] = None
    operational_status: Optional[str] = None
    production_status: Optional[str] = None
    captive_or_commercial: Optional[str] = None
    production_mt: Optional[float] = None
    target_production_mt: Optional[float] = None
    peak_rated_capacity_mtpa: Optional[float] = None
    financial_year: Optional[str] = None
    source_id: str
    data_origin: str = "government"
    verification_status: str = "verified"

    model_config = ConfigDict(from_attributes=True)


class CoalBlockSummaryResponse(BaseModel):
    financial_year: str
    total_allocated_blocks: int
    operational_blocks: int
    total_production_mt: float
    target_production_mt: Optional[float] = None
    auctioned_blocks: int
    allotted_blocks: int

    model_config = ConfigDict(from_attributes=True)


class CoalBlocksEnvelope(BaseModel):
    data: List[CoalBlockItem]
    pagination: PaginationInfo
    summary: CoalBlockSummaryResponse
    filters: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class CoalBlockTrendPoint(BaseModel):
    financial_year: str
    operational_blocks: int
    production_mt: float
    target_mt: Optional[float] = None
    growth_percent: Optional[float] = None
    period_type: str = "annual"
    data_status: str = "final"
    source_document: str = "Nominated Authority, Ministry of Coal"

    model_config = ConfigDict(from_attributes=True)


class CoalBlockTrendResponse(BaseModel):
    trend: List[CoalBlockTrendPoint]

    model_config = ConfigDict(from_attributes=True)


# Provenance, Coverage & Reconciliation
class SourcesResponse(BaseModel):
    total_sources: int
    sources: List[DataSourceContract]

    model_config = ConfigDict(from_attributes=True)


class CoverageItem(BaseModel):
    source_id: str
    organization: str
    document_title: str
    financial_year: str
    observation_count: int
    granularity: str
    metrics: List[str]

    model_config = ConfigDict(from_attributes=True)


class CoverageResponse(BaseModel):
    financial_year: str
    national_benchmarks: Dict[str, Any]
    source_coverage: List[CoverageItem]

    model_config = ConfigDict(from_attributes=True)


class CoverageSourceResponse(BaseModel):
    source: DataSourceContract
    total_observations: int
    metrics_covered: List[str]
    entities_count: int

    model_config = ConfigDict(from_attributes=True)


class ValidationResultContract(BaseModel):
    id: int
    validation_type: str
    entity_id: str
    financial_year: str
    calculated_value: float
    reported_value: float
    variance: float
    variance_percent: float
    status: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReconciliationResponse(BaseModel):
    financial_year: str
    results: List[ValidationResultContract]
    conflicts: List[MineConflictContract]

    model_config = ConfigDict(from_attributes=True)


class ReconciliationSummaryResponse(BaseModel):
    financial_year: str
    passed: int
    warning: int
    failed: int
    open_conflicts: int
    resolved_conflicts: int

    model_config = ConfigDict(from_attributes=True)
