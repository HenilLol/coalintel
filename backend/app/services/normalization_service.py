import re
from typing import Dict, Any, List, Optional, Tuple

# Mining Subsidiary Dictionary
SUBSIDIARIES = ["ECL", "BCCL", "CCL", "WCL", "SECL", "NCL", "MCL", "NEC", "CIL"]

# Known Mine Names
KNOWN_MINES = [
    "Rajmahal OC", "Rajmahal OpenCast", "Gevra OC", "Dipka OC", "Kusmunda OC",
    "Samaleswari OC", "Sonalpur OC", "Jayant OC", "Nigahi OC", "Amlohri OC",
    "Belpahar OC", "Lakhanpur OC", "Bhubaneswari OC", "Ananta OC", "Bharatpur OC",
    "Lingaraj OC", "Kalinga OC", "Dudhichua OC", "Khadia OC", "Bina OC",
    "Kakri OC", "Block B OC", "Jhingurda OC", "Ashok OC", "Piparwar OC",
    "Magadh OC", "Amrapali OC", "Kalyani OC", "Moonidih UG", "Jharia OC"
]

GENERIC_MINE_PHRASES = {
    "cil mine", "coal mine", "overall mine", "unspecified mine",
    "mines of cil", "cil mines", "company mine", "total mine", "national mine",
    "coalfield", "coalfields"
}


def get_base_mine_name(name: str) -> str:
    """
    Extracts the base mine name by stripping mining type suffixes.
    Supported suffixes: OC, OCP, OCM, OpenCast, Open Cast, Opencast, UG, Underground,
    Mine, Colliery, Project, Block, Washery (Issue #68: government reports alternate
    between 'Gevra OC', 'Gevra OCP', 'Gevra OCM', 'Gevra OpenCast' etc.).
    Examples:
        "Gevra OC" -> "Gevra"
        "Gevra OCP" -> "Gevra"
        "Gevra OpenCast" -> "Gevra"
        "Gevra Open Cast" -> "Gevra"
        "Alpha Mine" -> "Alpha"
        "Alpha UG" -> "Alpha"
    """
    if not name:
        return ""
    clean = str(name).strip()
    # Strip suffix tokens repeatedly (handles "Gevra OC Project" style stacking)
    base = clean
    for _ in range(3):
        new_base = re.sub(
            r"\s+(?:OC|OCP|OCM|OpenCast|Open\s+Cast|Opencast|UG|Underground|Mine|Colliery|Project|Block|Washery)\b",
            "",
            base,
            flags=re.IGNORECASE
        ).strip()
        if new_base == base:
            break
        base = new_base
    return base if base else clean


# Issue #68: explicit suffix alias map for symmetric query<->evidence matching.
# All variants within a family are treated as interchangeable when matching a
# mine mention in chunk text against a queried mine (and vice versa).
MINE_SUFFIX_ALIAS_FAMILIES: List[List[str]] = [
    ["OC", "OCP", "OCM", "OpenCast", "Open Cast", "Opencast", "Project"],
    ["UG", "Underground"],
    ["Mine", "Colliery", "Block", "Washery"],
]


def mine_name_variants(name: str) -> List[str]:
    """
    Issue #68: returns the base mine name plus all common suffixed variants,
    e.g. "Gevra" -> ["Gevra", "Gevra OC", "Gevra OCP", "Gevra OCM",
    "Gevra OpenCast", "Gevra Open Cast", "Gevra Opencast", "Gevra Project",
    "Gevra UG", "Gevra Underground", ...]. Used so a query mentioning
    'Kusmunda OCP' matches evidence text saying 'Kusmunda OC' or bare
    'Kusmunda', symmetrically.
    """
    if not name:
        return []
    base = get_base_mine_name(name)
    if not base:
        return [str(name).strip()] if name else []
    variants = [base]
    seen = {base.lower()}
    for family in MINE_SUFFIX_ALIAS_FAMILIES:
        for suffix in family:
            v = f"{base} {suffix}"
            if v.lower() not in seen:
                seen.add(v.lower())
                variants.append(v)
    return variants


def canonicalize_mine_name(name: str) -> str:
    """
    Returns the canonical mine name representation if matched against KNOWN_MINES,
    otherwise preserves the source's explicit entity without inventing suffixes.
    """
    if not name:
        return ""
    clean = str(name).strip()
    base = get_base_mine_name(clean)
    for km in KNOWN_MINES:
        if km.lower() == clean.lower():
            return km
        if get_base_mine_name(km).lower() == base.lower():
            # If source already has a suffix, preserve it with canonical casing
            if base.lower() != clean.lower():
                return clean
            # If source is bare base name, keep source's explicit entity
            return clean
    return clean


def detect_query_fiscal_year(query_text: str) -> Optional[str]:
    """
    Detects explicit fiscal year from query string.
    Supports: FY2023-24, FY 2023-24, 2023-24, FY 23-24, 2023/24.
    Normalizes to canonical 'YYYY-YY' (e.g. '2023-24').
    """
    if not query_text or not query_text.strip():
        return None
    # Match FY 2023-24 or FY2023-24 or 2023-24 or 2023/24
    m = re.search(r"\b(?:FY\s*)?((?:19|20)\d{2})[-\/](\d{2,4})\b", query_text, re.IGNORECASE)
    if m:
        start_yr = m.group(1)
        end_yr = m.group(2)
        if len(end_yr) == 4:
            end_yr = end_yr[-2:]
        return f"{start_yr}-{end_yr}"
    # Match FY 23-24 or FY23-24
    m2 = re.search(r"\bFY\s*(\d{2})[-\/](\d{2})\b", query_text, re.IGNORECASE)
    if m2:
        start_yr_short = int(m2.group(1))
        full_start = 2000 + start_yr_short if start_yr_short < 70 else 1900 + start_yr_short
        return f"{full_start}-{m2.group(2)}"
    # Match single FY YYYY e.g. FY2035 or FY 2035
    m3 = re.search(r"\bFY\s*((?:19|20)\d{2})\b", query_text, re.IGNORECASE)
    if m3:
        yr = int(m3.group(1))
        return f"{yr-1}-{str(yr)[-2:]}"
    return None



def classify_document_authority(filename: str) -> str:
    """
    Classifies document source authority into:
    - OFFICIAL: Official annual reports, ministry reports, audited filings, CIL/subsidiary reports
    - SYNTHETIC_TEST: Test files, demo files, synthetic/mock uploads
    - INTERNAL / UNKNOWN: Other sources
    """
    if not filename:
        return "UNKNOWN"
    # Issue #79: normalize separators so 'coal_directory', 'coal-directory' and
    # 'coal directory' all classify identically (real filenames vary by source).
    f_lower = filename.lower().replace("_", " ").replace("-", " ").replace(".", " ")
    if any(t in f_lower for t in ["test", "demo", "synthetic", "mock"]):
        return "SYNTHETIC_TEST"
    if any(o in f_lower for o in [
        "annual_report", "annual report", "annualreport", "chap", "moc", "ministry",
        "audit", "srn-", "secl", "ecl", "bccl", "cmpdi", "cil", "wcl", "mcl", "ccl", "ncl",
        # Issue #79: real government publications — Coal Controller's Organisation
        # directories, PIB releases, provincial statistics publications
        "cco", "coal directory", "coal controller",
        "pib", "provisional coal statistics", "parliamentary", "gazette", "gov in", "govt",
        "statistics", "statistical"
    ]):
        return "OFFICIAL"
    return "INTERNAL"


HISTORICAL_INCEPTION_PATTERNS = [
    r"\b(?:came\s+into\s+being|year\s+of\s+its\s+inception|at\s+(?:the\s+)?inception|since\s+inception)\b",
    r"\b(?:established|incorporated|founded)\s+in\s+19\d{2}\b",
    r"\b(?:modest\s+production\s+of|inception\s+in)\s+19\d{2}\b",
    r"\b(?:taking\s+over\s+private\s+coal\s+mines|in\s+November\s+1975|in\s+1975)\b",
]


def is_historical_evidence_snippet(text: Optional[str], target_fy: Optional[str] = None) -> bool:
    """
    Identifies historical / inception context snippets (e.g. 1975 CIL inception)
    that must not be confused with modern fiscal year operational metrics.
    """
    if not text:
        return False
    t_lower = text.lower()
    for pat in HISTORICAL_INCEPTION_PATTERNS:
        if re.search(pat, t_lower, re.IGNORECASE):
            if target_fy:
                target_short = target_fy[-5:] if len(target_fy) >= 5 else target_fy
                # If target fiscal year is NOT present in text, this is clearly historical
                if target_fy not in text and target_short not in text:
                    return True
                # If target FY is present elsewhere in chunk, check whether inception phrasing qualifies the metric
                if re.search(r"\b(?:modest\s+production\s+of|at\s+(?:the\s+)?inception|came\s+into\s+being)\b", t_lower):
                    return True
            else:
                return True
    return False


def is_corporate_context_snippet(text: Optional[str]) -> bool:
    """
    Identifies corporate / overarching CIL aggregate context in text snippets.
    e.g. company-wide production, CIL milestones, national coal production, annual corporate target, etc.
    """
    if not text:
        return False
    corp_patterns = [
        r"\b(?:company-wide|organization-wide|group-wide|nationwide)\b",
        r"\b(?:corporate-level|corporate\s+production|consolidated\s+production|aggregate\s+production)\b",
        r"\b(?:milestones\s+in\s+20\d{2}|annual\s+(?:corporate\s+)?target|growth\s+over\s+last\s+fiscal\s+year)\b",
        r"\b(?:cil\s+as\s+a\s+whole|coal\s+india\s+as\s+a\s+whole|company\s+as\s+a\s+whole)\b",
        r"\b(?:total\s+production\s+of\s+(?:cil|coal\s+india)|all\s+mines\s+of\s+cil|corporate\s+cil|overall\s+cil\s+production)\b",
        r"\b(?:cil['’]?s\s+subsidiaries|across\s+all\s+subsidiaries|all\s+subsidiaries\s+of\s+cil|single\s+largest\s+coal\s+producer)\b",
        r"\b(?:coal\s+production\s+of\s+[\d\.]+\s*(?:mt|million\s+tonnes)\s+during\b)",
    ]
    t_lower = text.lower()
    return any(re.search(pat, t_lower, re.IGNORECASE) for pat in corp_patterns)



# Specificity Precedence Rules for Metric Classification
# Evaluated strictly against local line/sentence context (bare 'coal' removed from triggers)
METRIC_CLASSIFICATION_RULES = [
    ("Exploration / Core Drilling", r"\b(?:core\s+)?drill(?:ing)?\b|\bmeterage\b|\bborehole\b"),
    ("Washing Capacity", r"\bwash(?:ing)?\s+capacity\b|\bwashery(?:\s+capacity)?\b|\bclean\s+coal\s+yield\b"),
    ("Overburden Removal", r"\boverburden(?:\s+removal)?\b|\bobr\b|\bcomposite\s+obr\b"),
    ("Coal Despatch", r"\b(?:coal\s+)?despatch\b|\b(?:coal\s+)?dispatch\b|\bofftake\b"),
    ("Stripping Ratio", r"\bstripping\s+ratio\b"),
    ("Coal Production", r"\b(?:raw\s+coal|coal|opencast|underground)\s+production\b|\bproduction\s+of\s+coal\b|\bmined\s+coal\b|\bcoal\s+output\b|\btotal\s+production\b|\bannual\s+production\b"),
    ("Production", r"\bproduction\b|\boutput\b"),
]

# Backward-compatible map
METRICS_PATTERNS = {
    "Exploration / Core Drilling": r"\b(?:core\s+)?drill(?:ing)?\b|\bmeterage\b|\bborehole\b",
    "Washing Capacity": r"\bwash(?:ing)?\s+capacity\b|\bwashery(?:\s+capacity)?\b|\bclean\s+coal\s+yield\b",
    "Overburden Removal": r"\boverburden(?:\s+removal)?\b|\bobr\b|\bcomposite\s+obr\b",
    "Despatch": r"\b(?:coal\s+)?despatch\b|\b(?:coal\s+)?dispatch\b|\bofftake\b",
    "Stripping Ratio": r"\bstripping\s+ratio\b",
    "Production": r"\b(?:raw\s+coal|coal|opencast|underground)\s+production\b|\bproduction\s+of\s+coal\b|\bmined\s+coal\b|\bcoal\s+output\b|\bproduction\b|\boutput\b",
}

# Metric Domain Definitions for Specificity-First Query & Database Matching
METRIC_DOMAINS = [
    {
        "domain_key": "STRIPPING_RATIO",
        "canonical_name": "Stripping Ratio",
        "patterns": [r"\bstripping\s+ratio\b"],
        "db_metric_names": ["Stripping Ratio"],
    },
    {
        "domain_key": "OVERBURDEN_REMOVAL",
        "canonical_name": "Overburden Removal",
        "patterns": [r"\boverburden(?:\s+removal)?\b", r"\bobr\b", r"\bcomposite\s+obr\b"],
        "db_metric_names": ["Overburden Removal", "OBR", "Composite OBR"],
    },
    {
        "domain_key": "WASHING_CAPACITY",
        "canonical_name": "Washing Capacity",
        "patterns": [r"\bwash(?:ing)?\s+capacity\b", r"\bwashery(?:\s+capacity)?\b", r"\bclean\s+coal\s+yield\b"],
        "db_metric_names": ["Washing Capacity", "Washery", "Clean Coal Yield"],
    },
    {
        "domain_key": "EXPLORATION_DRILLING",
        "canonical_name": "Exploration / Core Drilling",
        "patterns": [r"\b(?:core\s+)?drill(?:ing)?\b", r"\bmeterage\b", r"\bborehole\b"],
        "db_metric_names": ["Exploration / Core Drilling", "Core Drilling", "Drilling"],
    },
    {
        "domain_key": "COAL_DESPATCH",
        "canonical_name": "Coal Despatch",
        "patterns": [r"\b(?:coal\s+)?despatch\b", r"\b(?:coal\s+)?dispatch\b", r"\bofftake\b"],
        "db_metric_names": ["Coal Despatch", "Despatch", "Dispatch", "Offtake"],
    },
    {
        "domain_key": "COAL_PRODUCTION",
        "canonical_name": "Coal Production",
        "patterns": [
            r"\b(?:raw\s+coal|coal|opencast|underground)\s+production\b",
            r"\bproduction\s+of\s+coal\b",
            r"\bmined\s+coal\b",
            r"\bcoal\s+output\b",
            r"\braw\s+coal\b",
            r"\bproduction\b",
            r"\boutput\b",
        ],
        "db_metric_names": [
            "Coal Production",
            "Production",
            "Coal Output",
            "Raw Coal Production",
            "Annual Production",
        ],
    },
]


def normalize_subsidiary_scope(scope: Optional[str]) -> Optional[str]:
    """
    Normalizes subsidiary scope strings into either:
    - None: representing unrestricted/global scope ("ALL", "ALL CIL", "ALL SUBSIDIARIES", "ALL_CIL", "ALL_SUBSIDIARIES", "", None, "NULL", "NONE")
    - Normalized uppercase subsidiary name (e.g. "SECL", "ECL", "WCL")
    """
    if not scope:
        return None
    s = str(scope).strip()
    if not s or s.upper() in ["ALL", "ALL CIL", "ALL SUBSIDIARIES", "ALL_CIL", "ALL_SUBSIDIARIES", "NONE", "NULL"]:
        return None
    if s.upper().startswith("ALL ") or s.upper().startswith("ALL_"):
        return None
    return s.upper()


def detect_query_metric_domain(query_text: str) -> Optional[Dict[str, Any]]:
    """
    Evaluates query string against specificity-first metric domains.
    Returns domain dictionary with canonical name and matching database metric names,
    or None if no recognized metric domain pattern matches.
    """
    if not query_text or not query_text.strip():
        return None
    q_lower = query_text.lower()
    for domain in METRIC_DOMAINS:
        for pat in domain["patterns"]:
            if re.search(pat, q_lower):
                return domain
    return None


# Unit Multipliers to convert raw units to Million Tonnes (MT) or M.Cu.M
UNIT_MULTIPLIERS_TO_MT = {
    "lakh tonnes": 0.1,
    "lakh tonne": 0.1,
    "lakh mt": 0.1,
    "million tonnes": 1.0,
    "million tonne": 1.0,
    "mt": 1.0,
    "thousand tonnes": 0.001,
    "thousand tonne": 0.001,
    "tonnes": 0.000001,
    "tonne": 0.000001,
    "tons": 0.000001,
    "ton": 0.000001,
    "m.cu.m": 1.0,
    "million cu.m": 1.0,
    "mcum": 1.0,
}


def normalize_unit_to_mt(raw_value: float, raw_unit: str) -> Tuple[float, str]:
    """
    Deterministically normalizes raw extracted numerical values and units into Million Tonnes (MT)
    or M.Cu.M with high precision (avoiding premature rounding to 4 decimals).
    Example: 42.50 Lakh Tonnes -> 4.25 MT (Multiplier = 0.1)
    Example: 7.99 Tonnes -> 0.000008 MT (Multiplier = 1e-6)
    """
    if not raw_unit:
        return raw_value, "MT"

    unit_clean = raw_unit.strip().lower()

    for unit_pattern, multiplier in UNIT_MULTIPLIERS_TO_MT.items():
        if unit_pattern in unit_clean:
            # Maintain high precision for fractional units like Tonnes without zero underflow
            standard_val = round(raw_value * multiplier, 6)
            standard_unit = "M.Cu.M" if ("cu" in unit_clean or "mcum" in unit_clean) else "MT"
            return standard_val, standard_unit

    # Default fallback if unit matches standard MT
    return raw_value, "MT"


def _extract_local_context(text: str, start_char: int, end_char: int, window: int = 180) -> str:
    """Extracts a clean, sentence-aligned local context snippet around the match."""
    s_start = max(0, start_char - window)
    s_end = min(len(text), end_char + window)
    return text[s_start:s_end].strip()


def extract_entity_tuples_from_text(
    text: str,
    page_number: int,
    default_subsidiary: Optional[str] = "CIL HQ",
    default_year: Optional[str] = "2023-24"
) -> List[Dict[str, Any]]:
    """
    Scans page text using proximity-first parsing and strict classification rules to extract
    structured entity metrics tuples with dynamic evidence confidence and temporal grounding.
    """
    extracted_tuples = []
    if not text or not text.strip():
        return extracted_tuples

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    # Match numeric values with mining units (e.g., "42.50 Lakh Tonnes" or "120.40 M.Cu.M")
    # Issue #85: government publications interleave a parenthetical share
    # between value and unit ("377012.11 (96.81%) million Tonnes"); allow
    # one such parenthetical between them. The inner percentage itself
    # never matches (a lone "%" cannot be followed by a unit in the same
    # sentence without an intervening value).
    value_unit_pattern = re.compile(
        r"([\d\.,]+)(?:\s*\([^)]*\))?\s*"
        r"(Lakh\s+Tonnes|Million\s+Tonnes|Thousand\s+Tonnes|MT|M\.Cu\.M|MCuM|Tonnes)",
        re.IGNORECASE
    )

    mine_name_regex = re.compile(
        r"\b([A-Z][A-Za-z0-9_\-\.]+(?:\s+[A-Z][A-Za-z0-9_\-\.]+)*\s+(?:OC|OpenCast|UG|Underground|Mine|Colliery|Project|Washery|Block))\b"
    )

    for match in value_unit_pattern.finditer(text):
        val_str = match.group(1).replace(",", "").strip()
        unit_raw = match.group(2).strip()

        try:
            numeric_val = float(val_str)
        except ValueError:
            continue

        # Extract surrounding local snippet
        snippet = _extract_local_context(text, match.start(), match.end(), window=180)
        unit_clean = unit_raw.lower()

        # Step 1: Metric Classification (Strict Specificity Precedence on LOCAL context)
        metric_name = None
        if "cu" in unit_clean or "mcum" in unit_clean:
            metric_name = "Overburden Removal"
        else:
            for m_name, m_regex in METRIC_CLASSIFICATION_RULES:
                if re.search(m_regex, snippet, re.IGNORECASE):
                    metric_name = m_name
                    break

        if not metric_name:
            # Check if production keywords exist in local snippet
            if re.search(r"\b(?:production|output|produced)\b", snippet, re.IGNORECASE):
                metric_name = "Coal Production"
            elif re.search(r"\b(?:geological\s+resources?|total\s+resources?|proved,?\s+indicated|indicated\s+and\s+inferred|resources\s+are)\b", snippet, re.IGNORECASE):
                # Issue #85: geological-resource statements in the Coal
                # Directory ("total geological resources ... 377012.11",
                # "share of proved, indicated and inferred resources are
                # 212207.16 ...") must not degrade to Unclassified
                metric_name = "Geological Resources"
            else:
                metric_name = "Mining Metric (Unclassified)"

        # Find current line containing the numeric match
        line_start = text.rfind("\n", 0, match.start())
        line_start = 0 if line_start == -1 else line_start + 1
        line_end = text.find("\n", match.end())
        line_end = len(text) if line_end == -1 else line_end
        current_line = text[line_start:line_end].strip()

        # Step 2: Entity & Mine Extraction (Line-proximity first, specific over generic)
        detected_mine = None

        # Issue #80: geographic / sector / national aggregate attribution.
        # Real government narrative text ("All India production of raw coal was
        # 893.190 MT", "Odisha registered highest coal production of 218.981 MT")
        # attributes to aggregate entities, not mines. Attribution is
        # PROXIMITY-AWARE and line-first: the candidate nearest the numeric
        # value wins, so a table's 'All India' label 180 chars earlier cannot
        # steal a state's narrative figure on the current line.
        detected_aggregate = None

        _AGG_CANDIDATE_PATTERNS = (
            ("All India", re.compile(r"\ball\s+india\b", re.IGNORECASE)),
            ("All India", re.compile(r"\b(?:in|of|for)\s+the\s+country\b", re.IGNORECASE)),
            ("All India", re.compile(r"\b(?:in|of)\s+india\b", re.IGNORECASE)),
            ("All India", re.compile(r"\btotal\s+(?:geological\s+)?resources?\s+of\b", re.IGNORECASE)),
        ) + tuple(
            (state, re.compile(r"\b" + re.escape(state) + r"\b", re.IGNORECASE))
            for state in INDIAN_COAL_STATES
        ) + (
            ("Public Sector", re.compile(r"\bpublic\s+sector\b", re.IGNORECASE)),
            ("Private Sector", re.compile(r"\bprivate\s+sector\b", re.IGNORECASE)),
            ("Captive & Commercial Blocks", re.compile(r"\bcaptive\s*(?:&|and)\s*commercial\b", re.IGNORECASE)),
        )

        def _nearest_aggregate(haystack: str, value_offset_in_hay: int):
            """Returns the candidate aggregate whose mention is closest to the
            numeric value (preceding mentions win ties)."""
            best = None
            best_dist = float("inf")
            for label, pattern in _AGG_CANDIDATE_PATTERNS:
                for m in pattern.finditer(haystack):
                    # preceding mentions: distance from mention END to value;
                    # following mentions: distance from value to mention START
                    dist = (value_offset_in_hay - m.end()) if m.end() <= value_offset_in_hay \
                        else (m.start() - value_offset_in_hay) + 10_000  # deprioritize following
                    if dist < best_dist:
                        best_dist = dist
                        best = label
            return best

        value_offset_in_line = match.start() - line_start
        _pl_start = text.rfind("\n", 0, max(line_start - 1, 0))
        _pl_start = 0 if _pl_start == -1 else _pl_start + 1
        _prev_line_txt = text[_pl_start:line_start].strip() if line_start > 0 else ""

        def _nearest_with_dist(haystack: str, value_offset_in_hay: int):
            """Nearest candidate + its distance (following mentions carry the
            +10,000 deprioritization so callers can tell them apart)."""
            best = None
            best_dist = float("inf")
            for label, pattern in _AGG_CANDIDATE_PATTERNS:
                for m in pattern.finditer(haystack):
                    dist = (value_offset_in_hay - m.end()) if m.end() <= value_offset_in_hay \
                        else (m.start() - value_offset_in_hay) + 10_000
                    if dist < best_dist:
                        best_dist = dist
                        best = label
            return best, best_dist

        detected_aggregate, _cur_dist = _nearest_with_dist(current_line, value_offset_in_line)

        # Issue #85: OCR'd scanned pages hard-wrap mid-sentence, putting the
        # value at the START of its line while its entity label ends the
        # PREVIOUS line ("... Jharkhand\n91811.57 MT"). The current line then
        # contains only the NEXT entity's label, a FOLLOWING mention that
        # wins by default and shifts every attribution by one. When the
        # current-line winner is a following mention AND the value sits near
        # the line start, join the seam (prev-line tail + current line) and
        # re-pick. This also repairs multi-word states split across the
        # break ("Madhya\nPradesh" -> joined "Madhya Pradesh").
        _SEAM_VALUE_OFFSET = 40   # value this close to the line start = continued sentence
        _TAIL_GUARD = 24          # prev-line mention must trail this close to its line end
        if (
            detected_aggregate is not None
            and _cur_dist >= 10_000              # winner on the line is a FOLLOWING mention
            and value_offset_in_line <= _SEAM_VALUE_OFFSET
            and _prev_line_txt
        ):
            _tail = _prev_line_txt[-80:]
            _joined = _tail + " " + current_line[:80]
            _joined_off = len(_tail) + 1 + min(value_offset_in_line, 80)
            _seam_agg, _seam_dist = _nearest_with_dist(_joined, _joined_off)
            if _seam_agg is not None and _seam_dist < 10_000:
                detected_aggregate = _seam_agg

        if not detected_aggregate and _prev_line_txt:
            # Prev-line fallback WITH tail guard: the winning mention must end
            # near the prev line's end (the label trails directly into the
            # value across the break). Without the guard, a fresh paragraph
            # inherits whatever state the previous paragraph ended with
            # (observed live: the national resource total picking up
            # 'Maharashtra' from the previous sentence's tail).
            # The search haystack JOINS the prev-line tail with the current
            # line's head so multi-word entity names split by the OCR hard-wrap
            # ("Madhya\nPradesh") still match as a whole.
            _join_hay = _prev_line_txt + " " + current_line
            _join_off = len(_prev_line_txt) + 1 + min(value_offset_in_line, 80)
            _agg, _d = _nearest_with_dist(_join_hay, _join_off)
            if _agg is not None and _d < 10_000:
                _lbl_pat = re.compile(r"\b" + re.escape(_agg) + r"\b", re.IGNORECASE)
                _last_m = None
                for _m in _lbl_pat.finditer(_join_hay):
                    _last_m = _m
                # guard: winner must end within _TAIL_GUARD of the seam
                if _last_m is not None and _last_m.end() >= len(_prev_line_txt) - _TAIL_GUARD:
                    detected_aggregate = _agg

        if not detected_aggregate:
            # Snippet fallback, tight radius: entity labels live within ~60
            # chars of their figures in government narrative ("Odisha
            # registered highest coal production of 218.981 MT"). The old 180
            # radius let stale mentions from the previous paragraph steal
            # paragraph-level national figures (observed live on p34).
            _snip_val_off = 180 if match.start() >= 180 else match.start()
            _para_break = snippet.rfind("\n\n", 0, _snip_val_off)
            if _para_break != -1:
                # paragraph boundary inside the window: never look across it —
                # the previous paragraph's last mention cannot steal this value
                _trimmed = snippet[_para_break + 2:]
                _trimmed_off = _snip_val_off - _para_break - 2
                detected_aggregate = _nearest_aggregate(_trimmed, _trimmed_off)
            else:
                detected_aggregate = _nearest_aggregate(snippet, _snip_val_off)

        # Check for specific known mines on current line (full name first)
        for km in KNOWN_MINES:
            if re.search(r"\b" + re.escape(km) + r"\b", current_line, re.IGNORECASE):
                detected_mine = km
                break

        # Check for base name of known mines on current line (e.g. "Gevra" in "Gevra achieved 59.11 MT")
        if not detected_mine:
            for km in KNOWN_MINES:
                base_km = get_base_mine_name(km)
                if len(base_km) >= 3 and re.search(r"\b" + re.escape(base_km) + r"\b", current_line, re.IGNORECASE):
                    # Check if suffix exists in line, else preserve explicit entity
                    suffix_m = re.search(r"\b" + re.escape(base_km) + r"\s+(OC|OpenCast|UG|Underground|Mine|Colliery|Project|Block)\b", current_line, re.IGNORECASE)
                    if suffix_m:
                        detected_mine = suffix_m.group(0).strip()
                    else:
                        detected_mine = base_km
                    break

        # Check previous line for known mines or base name
        if not detected_mine and line_start > 0:
            prev_line_start = text.rfind("\n", 0, line_start - 1)
            prev_line_start = 0 if prev_line_start == -1 else prev_line_start + 1
            prev_line = text[prev_line_start:line_start - 1].strip()
            for km in KNOWN_MINES:
                if re.search(r"\b" + re.escape(km) + r"\b", prev_line, re.IGNORECASE):
                    detected_mine = km
                    break
                base_km = get_base_mine_name(km)
                if len(base_km) >= 3 and re.search(r"\b" + re.escape(base_km) + r"\b", prev_line, re.IGNORECASE):
                    suffix_m = re.search(r"\b" + re.escape(base_km) + r"\s+(OC|OpenCast|UG|Underground|Mine|Colliery|Project|Block)\b", prev_line, re.IGNORECASE)
                    detected_mine = suffix_m.group(0).strip() if suffix_m else base_km
                    break

        # Check regex for general mine entities on current line or previous line
        if not detected_mine:
            m_match = mine_name_regex.search(current_line)
            if m_match and m_match.group(1).strip().lower() not in GENERIC_MINE_PHRASES:
                detected_mine = m_match.group(1).strip()
            elif line_start > 0:
                p_match = mine_name_regex.search(prev_line)
                if p_match and p_match.group(1).strip().lower() not in GENERIC_MINE_PHRASES:
                    detected_mine = p_match.group(1).strip()

        # Check snippet for known mine base names (specific entity over corporate generic)
        if not detected_mine:
            for km in KNOWN_MINES:
                base_km = get_base_mine_name(km)
                if len(base_km) >= 3 and re.search(r"\b" + re.escape(base_km) + r"\b", snippet, re.IGNORECASE):
                    suffix_m = re.search(r"\b" + re.escape(base_km) + r"\s+(OC|OpenCast|UG|Underground|Mine|Colliery|Project|Block)\b", snippet, re.IGNORECASE)
                    detected_mine = suffix_m.group(0).strip() if suffix_m else base_km
                    break

        # Closest regex mine mention in snippet (excluding generic corporate phrases)
        if not detected_mine:
            closest_mine = None
            min_dist = float("inf")
            match_offset_in_snippet = match.start() - max(0, match.start() - 180)
            for m in mine_name_regex.finditer(snippet):
                m_str = m.group(1).strip()
                if m_str.lower() in GENERIC_MINE_PHRASES:
                    continue
                dist = abs(m.start() - match_offset_in_snippet)
                if dist < min_dist:
                    min_dist = dist
                    closest_mine = m_str
            if closest_mine:
                detected_mine = closest_mine

        # Check for named entity followed by operational verb on current line or snippet (e.g. 'Alpha achieved 15.5 MT')
        if not detected_mine:
            action_verb_match = re.search(
                r"\b([A-Z][A-Za-z0-9_\-\.]+(?:\s+[A-Za-z0-9_\-\.]+)*(?:\s+(?:OC|OpenCast|UG|Underground|Mine|Colliery|Project|Block))?)\s+(?:achieved|produced|recorded|reached|reported|mined|extracted)\b",
                current_line or snippet
            )
            if action_verb_match:
                cand = action_verb_match.group(1).strip()
                cand_lower = cand.lower()
                stop_words = {"during", "in", "the", "total", "annual", "overall", "target", "cil", "this"}
                is_corp = any(w in cand_lower for w in ["limited", "ltd", "company", "coalfields", "corporation", "subsidiary", "board"])
                is_sub = any(s.lower() == cand_lower for s in SUBSIDIARIES)
                if cand_lower not in GENERIC_MINE_PHRASES and cand_lower not in stop_words and not is_corp and not is_sub and len(cand) >= 3:
                    # If it doesn't have a mine suffix, ensure it looks like a clean single or double named entity
                    detected_mine = cand

        # Step 3: Subsidiary Extraction (Local first, then fallback)
        subsidiary = None
        for sub in SUBSIDIARIES:
            if re.search(r"\b" + sub + r"\b", snippet, re.IGNORECASE):
                subsidiary = sub
                break

        if not subsidiary:
            # Check full text for page-level subsidiary or use default
            for sub in SUBSIDIARIES:
                if re.search(r"\b" + sub + r"\b", text, re.IGNORECASE):
                    subsidiary = sub
                    break
            if not subsidiary:
                subsidiary = default_subsidiary or "CIL HQ"

        # Safe non-misleading fallback for mine name (NO synthetic "CIL Mine" or "ECL Mine")
        if not detected_mine or detected_mine.lower() in GENERIC_MINE_PHRASES:
            # Issue #80: aggregate entity (state / All India / sector) is a more
            # accurate attribution than the "Unspecified Mine" bucket when the
            # text clearly reports an aggregate figure
            mine_name = detected_aggregate or "Unspecified Mine"
        else:
            mine_name = detected_mine

        # Step 4: Temporal / Fiscal Year Grounding
        is_historical = False
        fiscal_year = None

        # A. Detect historical year mentions (e.g. "in 1975", "at inception in 1975", "since 1975")
        hist_match = re.search(
            r"\b(?:in|since|inception\s+in|year\s+of\s+its\s+inception|during|year|established\s+in)\s+(19\d{2}|20[01]\d)\b",
            current_line or snippet,
            re.IGNORECASE
        )
        if hist_match:
            hist_year = hist_match.group(1)
            fiscal_year = f"{hist_year}-{int(hist_year[-2:])+1:02d}" if int(hist_year) < 2020 else f"{hist_year}"
            is_historical = True
        else:
            # Check for standalone historical 19xx years
            standalone_19xx = re.search(r"\b(19\d{2})\b", current_line or snippet)
            if standalone_19xx:
                hist_year = standalone_19xx.group(1)
                fiscal_year = f"{hist_year}"
                is_historical = True

        # B. Multi-year table / line-proximity fiscal year extraction
        if not fiscal_year:
            # 1. Prefer fiscal year on the same line as the numeric value (e.g. "4. 2023-24 - 1.22 MT")
            line_fy = re.search(r"\b(20\d{2}[-\/]\d{2,4})\b", current_line)
            if line_fy:
                raw_fy = line_fy.group(1)
                if "/" in raw_fy:
                    raw_fy = raw_fy.replace("/", "-")
                if len(raw_fy) == 9 and "-" in raw_fy:
                    parts = raw_fy.split("-")
                    raw_fy = f"{parts[0]}-{parts[1][-2:]}"
                fiscal_year = raw_fy
            else:
                # 2. Search snippet for the closest fiscal year relative to the numeric match position
                match_offset_in_snippet = match.start() - max(0, match.start() - 180)
                fy_candidates = []
                for fy_m in re.finditer(r"\b(20\d{2}[-\/]\d{2,4})\b", snippet):
                    dist = abs(fy_m.start() - match_offset_in_snippet)
                    is_preceding = fy_m.start() <= match_offset_in_snippet
                    score = dist if is_preceding else (dist + 40)
                    raw_cand = fy_m.group(1)
                    if "/" in raw_cand:
                        raw_cand = raw_cand.replace("/", "-")
                    if len(raw_cand) == 9 and "-" in raw_cand:
                        parts = raw_cand.split("-")
                        raw_cand = f"{parts[0]}-{parts[1][-2:]}"
                    fy_candidates.append((score, raw_cand))
                if fy_candidates:
                    fy_candidates.sort(key=lambda x: x[0])
                    fiscal_year = fy_candidates[0][1]
                else:
                    fiscal_year = default_year or "2023-24"

        # Step 5: Dynamic Confidence Scoring
        confidence = 0.40  # Base for numeric value + valid unit
        has_specific_mine = (mine_name != "Unspecified Mine" and not mine_name.endswith("(Unspecified)"))

        if metric_name not in ["Mining Metric (Unclassified)", "Unclassified"]:
            confidence += 0.25
        if has_specific_mine:
            confidence += 0.25
        if not is_historical and fiscal_year == default_year:
            confidence += 0.10

        if is_historical:
            confidence -= 0.20
        if not has_specific_mine:
            confidence -= 0.15

        confidence_score = round(max(0.35, min(0.98, confidence)), 3)

        # Step 6: Validation Status
        if confidence_score >= 0.80 and has_specific_mine and not is_historical:
            validation_status = "VALIDATED"
        else:
            validation_status = "UNVERIFIED"

        # Step 7: Normalize unit
        standard_val, standard_unit = normalize_unit_to_mt(numeric_val, unit_raw)

        extracted_tuples.append({
            "mine_name": mine_name,
            "subsidiary": subsidiary,
            "metric_name": metric_name,
            "numeric_value": numeric_val,
            "unit": unit_raw,
            "standard_value": standard_val,
            "standard_unit": standard_unit,
            "fiscal_year": fiscal_year,
            "page_number": page_number,
            "confidence_score": confidence_score,
            "validation_status": validation_status,
            "raw_snippet": snippet
        })

    return extracted_tuples


def chunk_has_metric_for_entity(
    chunk_text: str,
    target_mines: Optional[List[str]] = None,
    metric_domain: Optional[Dict[str, Any]] = None,
    target_metric: Optional[str] = None,
    target_entities: Optional[List[str]] = None
) -> bool:
    """
    Evaluates whether a text chunk provides semantic evidence specifically linking
    the queried entity/mine with the requested metric domain.
    Prevents unrelated official metrics (e.g. Coal Production 59.11 MT) from satisfying
    a distinct metric query (e.g. Overburden Removal) merely because they appear in the same document/chunk.

    Issue #79: `target_entities` carries non-mine entities (states, sectors like
    'Coking Coal'/'Power (Utility)') that real government tables report at
    aggregate level. Presence in the chunk satisfies the entity requirement the
    same way a mine name does.
    """
    if not chunk_text:
        return False

    chunk_lower = chunk_text.lower()

    # Issue #79: normalize entity requirement — with geographies/sectors present
    # but no mines, the entity check below must still run (previously a
    # no-mine query bypassed entity checks entirely, letting wrong-entity
    # chunks pass; and entity-bearing queries were refused entirely).
    entity_terms = [e.lower() for e in (target_entities or []) if e]

    # Determine metric keywords and patterns
    domain_terms: List[str] = []
    domain_patterns: List[str] = []
    if metric_domain:
        domain_terms.extend([t.lower() for t in metric_domain.get("db_metric_names", [])])
        if metric_domain.get("canonical_name"):
            domain_terms.append(metric_domain["canonical_name"].lower())
        domain_patterns.extend(metric_domain.get("patterns", []))
    elif target_metric:
        domain_terms.append(target_metric.lower())

    # If no metric constraint, only check entity presence (mines, geographies, sectors)
    if not domain_terms and not domain_patterns:
        if not target_mines and not entity_terms:
            return True
        for tm in target_mines:
            if tm.lower() in chunk_lower:
                return True
            # Issue #68: symmetric alias matching — any suffix variant of the
            # base name counts (OCP/OCM/OpenCast/Project/UG/...)
            for variant in mine_name_variants(tm):
                if len(variant) >= 3 and variant.lower() in chunk_lower:
                    return True
        # Issue #79: geographic/sector entities
        for et in entity_terms:
            if et in chunk_lower:
                return True
        return False

    # Check for structured extraction format:
    # "Mine Entity: ... | Metric: ... | Raw Extracted Value: ... | Normalized Value: ... | Fiscal Year: ..."
    if "mine entity:" in chunk_lower or "metric:" in chunk_lower:
        mine_m = re.search(r"Mine Entity:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        metric_m = re.search(r"Metric:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        s_mine = mine_m.group(1).strip() if mine_m else None
        s_metric = metric_m.group(1).strip() if metric_m else None

        if s_metric:
            s_metric_lower = s_metric.lower()
            metric_matches = any(dt in s_metric_lower for dt in domain_terms) or any(
                re.search(pat, s_metric, re.IGNORECASE) for pat in domain_patterns
            )
            if not metric_matches:
                return False

            if not target_mines:
                # Issue #79: entity terms (states/sectors) may still gate
                if not entity_terms:
                    return True
                if s_mine:
                    s_mine_lower_79 = s_mine.lower()
                    if any(et in s_mine_lower_79 for et in entity_terms):
                        return True
                if any(et in chunk_lower for et in entity_terms):
                    return True
                return False

            if s_mine:
                s_mine_lower = s_mine.lower()
                s_mine_base = get_base_mine_name(s_mine).lower()
                for tm in target_mines:
                    tm_l = tm.lower()
                    base_l = get_base_mine_name(tm).lower()
                    if tm_l in s_mine_lower or tm_l in s_mine_base or base_l in s_mine_lower or base_l in s_mine_base:
                        return True

    # Unstructured text evaluation:
    # If no target mines specified (e.g. broad CIL metric query):
    if not target_mines:
        metric_ok = any(dt in chunk_lower for dt in domain_terms) or any(
            re.search(pat, chunk_text, re.IGNORECASE) for pat in domain_patterns
        )
        if not metric_ok:
            return False
        # Issue #79: entity gating for state/sector queries
        if entity_terms:
            return any(et in chunk_lower for et in entity_terms)
        return True

    # Specific target mine(s) queried:
    mine_terms = []
    for tm in target_mines:
        mine_terms.append(tm.lower())
        # Issue #68: expand to all suffix variants for symmetric matching
        for variant in mine_name_variants(tm):
            v_lower = variant.lower()
            if len(v_lower) >= 3 and v_lower not in mine_terms:
                mine_terms.append(v_lower)

    # Check if mine is mentioned in the chunk at all
    if not any(mt in chunk_lower for mt in mine_terms):
        return False

    # Break chunk into logical lines/sentences
    segments = [seg.strip() for seg in re.split(r"(?:[\r\n]+|(?<=[.!?])\s+)", chunk_text) if seg.strip()]

    # First check: Does any single segment contain both the entity AND the metric terms?
    for seg in segments:
        seg_lower = seg.lower()
        has_mine = any(mt in seg_lower for mt in mine_terms)
        if has_mine:
            has_metric = any(dt in seg_lower for dt in domain_terms) or any(
                re.search(pat, seg, re.IGNORECASE) for pat in domain_patterns
            )
            if has_metric:
                return True

    # Second check: In multi-line tabular/bullet contexts, check adjacent 2-segment windows (line N and line N+1)
    for i in range(len(segments) - 1):
        window = segments[i] + " " + segments[i + 1]
        window_lower = window.lower()
        if any(mt in window_lower for mt in mine_terms):
            has_metric = any(dt in window_lower for dt in domain_terms) or any(
                re.search(pat, window, re.IGNORECASE) for pat in domain_patterns
            )
            if has_metric:
                # Disqualify window if the second segment explicitly attributes the metric to a different entity (e.g. corporate CIL)
                different_entity_phrases = ["cil as a whole", "total cil", "cil total", "overall cil", "corporate cil"]
                if any(dep in segments[i + 1].lower() for dep in different_entity_phrases) and not any(mt in segments[i + 1].lower() for mt in mine_terms):
                    continue
                return True

    return False


def parse_numeric_cell(cell_val: Any) -> Optional[float]:
    """
    Deterministically parses numeric tokens from table cells, safely handling boundary bleed
    where adjacent percentage/growth numbers bleed into the cell (e.g. '7.07 1' -> 7.07).
    """
    if cell_val is None:
        return None
    raw_str = str(cell_val).strip()
    if not raw_str or raw_str in ["-", "--", "N/A", "NA", "nil", "Nil"]:
        return None

    # Remove trend arrows and currency indicators (do not strip decimal dot)
    clean_str = re.sub(r"[▲▼\u25b2\u25bc₹$]+", " ", raw_str).strip()

    tokens = clean_str.split()
    for tok in tokens:
        norm_tok = tok.replace(",", "").rstrip("%").strip()
        if re.match(r"^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$", norm_tok):
            try:
                return float(norm_tok)
            except ValueError:
                continue
    return None


def detect_table_unit(raw_rows: List[List[Any]], page_text: str = "") -> str:
    """
    Detects table-level or header-level unit from table rows or page text.
    Handles 'Fig. in MT', 'Qty. in MT', '(Qty. in MT)', 'All Figures in MT', 'M.Cu.M', etc.
    """
    combined_header_text = ""
    for r in raw_rows[:3]:
        combined_header_text += " " + " ".join(str(c) for c in r if c is not None)
    search_corpus = f"{combined_header_text} {page_text[:600]}"

    unit_m = re.search(
        r"\b(?:Fig\.?|Qty\.?|Figures?|Quantity|All\s+Figures)?\s*(?:in\s+)?(MT|M\.?Cu\.?M\.?|MCuM|M\.Cum|Tonnes?|Lakh\s+Te|Lakh\s+Tonnes?|Te)\b",
        search_corpus,
        re.IGNORECASE
    )
    if unit_m:
        raw_u = unit_m.group(1).upper()
        if "CU" in raw_u:
            return "M.Cu.M"
        if "LAKH" in raw_u:
            return "Lakh Tonnes"
        if "TONNE" in raw_u:
            return "Tonnes"
        return "MT"

    return "MT"


def extract_entity_tuples_from_tables(
    tables: List[Dict[str, Any]],
    page_number: int,
    page_text: str = "",
    default_subsidiary: Optional[str] = "CIL HQ",
    default_year: Optional[str] = "2023-24"
) -> List[Dict[str, Any]]:
    """
    Additive table-aware extraction: parses PyMuPDF native table rows, resolves multi-level
    headers, inherits header-level units (e.g. 'Fig. in MT' -> MT), handles cell boundary bleed,
    and produces structured ExtractedMetric tuples with high confidence (0.98).
    """
    if not tables:
        return []

    extracted_metrics = []

    for tab_info in tables:
        raw_rows = tab_info.get("raw_rows", [])
        if not raw_rows or len(raw_rows) < 3:
            continue

        table_unit = detect_table_unit(raw_rows, page_text)

        # Detect table title from nearby text or row 0
        title_m = re.search(r"\bTable\s*[\d\.]+\s*[:\-]?[^\n]{0,80}(?:Production|Despatch|OBR|Overburden|Offtake|Coal)[^\n]{0,80}", page_text, re.IGNORECASE)
        if not title_m:
            title_m = re.search(r"\bTable\s*[\d\.]+\s*[:\-]?[^\n]{1,80}", page_text, re.IGNORECASE)
        table_title = title_m.group(0).strip() if title_m else ""

        # Step 1: Detect header rows (Row 0 and optionally Row 1)
        row0 = [str(c).replace("\n", " ").strip() if c is not None else "" for c in raw_rows[0]]
        row1 = [str(c).replace("\n", " ").strip() if c is not None else "" for c in raw_rows[1]]

        is_two_level_header = False
        if any(re.search(r"\b(?:FY|Achmt|Growth|Actual|Target)\b", c, re.IGNORECASE) for c in row1):
            is_two_level_header = True

        data_start_idx = 2 if is_two_level_header else 1

        # Build column metadata
        col_count = max(len(row0), len(row1))
        col_headers = []

        last_parent = ""
        for c_idx in range(col_count):
            r0_val = row0[c_idx] if c_idx < len(row0) else ""
            if r0_val:
                last_parent = r0_val
            parent = r0_val or last_parent
            sub = row1[c_idx] if (is_two_level_header and c_idx < len(row1)) else ""
            combined_header = f"{parent} {sub}".strip()
            col_headers.append(combined_header)

        # Step 2: Identify column roles
        entity_col_idx = None
        monthly_prod_col_idx = None
        cumulative_prod_col_idx = None
        target_col_idx = None

        for c_idx, h in enumerate(col_headers):
            h_lower = h.lower()
            # Issue #88: 'No. of Mines' is a COUNT column, not an entity
            # column — the substring 'mine' must not select it (live failure:
            # SCCL area/region tables produced mine_name='1', '0', '4' from
            # the mine-count digits while the real entity column
            # 'Area/ Region' was ignored).
            _is_count_col = bool(re.match(r"^(?:no\.?/?\s*of\s+)?(?:no\.?|number)?\s*(?:of\s+)?mines?$", h_lower.strip())) or "no. of mines" in h_lower
            if entity_col_idx is None and any(w in h_lower for w in ["subs", "company", "entity"]):
                entity_col_idx = c_idx
            elif entity_col_idx is None and "mine" in h_lower and not _is_count_col:
                entity_col_idx = c_idx

            # Monthly production column (e.g. 'Production during Mar FY 25')
            if ("production during" in h_lower or ("production" in h_lower and "upto" not in h_lower and "cumulative" not in h_lower)):
                if "fy 25" in h_lower or "fy25" in h_lower or "2024-25" in h_lower:
                    monthly_prod_col_idx = c_idx
                elif monthly_prod_col_idx is None and not any(f"fy {y}" in h_lower for y in ["24", "23", "22", "21"]):
                    monthly_prod_col_idx = c_idx

            # Cumulative production column (e.g. 'Production upto Mar FY 25')
            if "production upto" in h_lower or "cumulative" in h_lower or "upto" in h_lower:
                if "fy 25" in h_lower or "fy25" in h_lower or "2024-25" in h_lower:
                    cumulative_prod_col_idx = c_idx
                elif cumulative_prod_col_idx is None and not any(f"fy {y}" in h_lower for y in ["24", "23", "22", "21"]):
                    cumulative_prod_col_idx = c_idx

            # Monthly target column
            if "target" in h_lower and target_col_idx is None:
                target_col_idx = c_idx

        # Fallback for entity column: Col 1 (after Sl No) or Col 0
        if entity_col_idx is None:
            if col_count > 1 and "sl" in col_headers[0].lower():
                entity_col_idx = 1
            else:
                # Issue #88: prefer the first column whose header is NOT a
                # count column ('No. of Mines', 'No.', 'Sl No') and NOT purely
                # numeric/percentage headers; scanning left-to-right mirrors
                # how these tables are laid out (count first, entity second).
                entity_col_idx = 0
                for c_idx, h in enumerate(col_headers[:4]):
                    h_lower = h.lower().strip()
                    _is_count = (
                        "no. of mines" in h_lower
                        or re.match(r"^(?:sl\.?\s*)?no\.?$", h_lower)
                        or re.match(r"^(?:no\.?|number)\.?$", h_lower)
                    )
                    if h_lower and not _is_count and not re.match(r"^[\d.%\s]+$", h_lower):
                        entity_col_idx = c_idx
                        break

        # Check if table semantically pertains to coal production vs other metric families (OBR, Despatch, etc.)
        combined_title_headers = f"{table_title} " + " ".join(col_headers)
        # Issue #88: the production keyword often lives in the page/nearby text
        # ("Chapter-I PRODUCTION a) Area/Region-wise production") rather than
        # in the column headers themselves — include the local page context in
        # the semantic check.
        _page_ctx = page_text[:400] if page_text else ""
        is_other_family = bool(re.search(r"\b(?:overburden|obr|despatch|offtake|exploration|safety)\b", combined_title_headers, re.IGNORECASE))
        has_production_keyword = bool(
            re.search(r"\b(?:production|prod)\b", combined_title_headers + " " + _page_ctx, re.IGNORECASE)
        )
        is_production_table = has_production_keyword and not is_other_family

        # Fallback for monthly production: Col 3 (ONLY if table is clearly a production table)
        if monthly_prod_col_idx is None and col_count >= 4:
            if is_production_table:
                monthly_prod_col_idx = 3
            else:
                monthly_prod_col_idx = None

        # Step 3: Detect Temporal Context (Month & FY)
        table_month = None
        for m_name in ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]:
            short_m = m_name[:3]
            if any(short_m.lower() in h.lower() for h in col_headers) or short_m.lower() in page_text[:400].lower():
                table_month = m_name
                break

        table_fy = default_year or "2024-25"
        fy_m = re.search(r"\b(?:FY\s*(\d{2})|20(\d{2})[-/](\d{2}))\b", " ".join(col_headers) + " " + page_text[:400], re.IGNORECASE)
        if fy_m:
            if fy_m.group(1):
                y2 = int(fy_m.group(1))
                table_fy = f"20{y2-1}-{y2:02d}"
            elif fy_m.group(2) and fy_m.group(3):
                table_fy = f"20{fy_m.group(2)}-{fy_m.group(3)}"

        # Step 4: Iterate Data Rows
        for r_idx in range(data_start_idx, len(raw_rows)):
            row = raw_rows[r_idx]
            if not row or len(row) <= entity_col_idx:
                continue

            raw_entity_cell = str(row[entity_col_idx]).strip() if row[entity_col_idx] is not None else ""
            if not raw_entity_cell and entity_col_idx > 0 and row[0]:
                raw_entity_cell = str(row[0]).strip()

            clean_entity = re.sub(r"[\r\n\t]+", " ", raw_entity_cell).strip()
            if not clean_entity or clean_entity in ["-", "--", "Sl No", "Total"]:
                if row[0] and "total" in str(row[0]).lower():
                    clean_entity = str(row[0]).strip()

            # Issue #88 (follow-up): cells that are pure numbers are COUNTS or
            # identifiers (mine-count digits, 10-digit phone numbers found
            # live in SCCL contact tables), never entity names. A numeric
            # entity label is worse than Unspecified — it fabricates an
            # attribution. Reject and fall back to the honest bucket.
            if clean_entity and re.fullmatch(r"[\d\s\-()\.]+", clean_entity):
                clean_entity = ""

            ent_upper = clean_entity.upper()

            # Map organization / entity semantics
            if "GRAND TOTAL" in ent_upper or ent_upper == "TOTAL":
                entity_label = "Grand Total"
                subsidiary = None
                mine_name = "Grand Total"
            elif "CIL" in ent_upper or ent_upper == "CIL TOTAL":
                entity_label = "CIL Total"
                subsidiary = None
                mine_name = "CIL Total"
            elif "CAPTIVE" in ent_upper:
                entity_label = "Captive/Others"
                subsidiary = None
                mine_name = "Captive/Others"
            elif ent_upper in ["ECL", "BCCL", "CCL", "NCL", "WCL", "SECL", "MCL", "NEC", "SCCL"]:
                entity_label = ent_upper
                subsidiary = ent_upper
                mine_name = ent_upper
            else:
                matched_sub = None
                for sub in ["ECL", "BCCL", "CCL", "NCL", "WCL", "SECL", "MCL", "NEC", "SCCL"]:
                    if sub in ent_upper:
                        matched_sub = sub
                        break
                if matched_sub:
                    entity_label = clean_entity
                    subsidiary = matched_sub
                    mine_name = clean_entity
                else:
                    entity_label = clean_entity
                    subsidiary = default_subsidiary
                    mine_name = clean_entity

            month_str = f" ({table_month} {table_fy})" if table_month else f" ({table_fy})"
            snip_title = table_title or "Coal Production Table"

            # Extract Monthly Production
            if is_production_table and monthly_prod_col_idx is not None and monthly_prod_col_idx < len(row):
                m_val = parse_numeric_cell(row[monthly_prod_col_idx])
                if m_val is not None:
                    std_val, std_unit = normalize_unit_to_mt(m_val, table_unit)
                    raw_snip = f"{snip_title} | {entity_label} | Monthly Production{month_str}: {m_val} {table_unit} | Page {page_number}"
                    extracted_metrics.append({
                        "mine_name": mine_name,
                        "subsidiary": subsidiary,
                        "metric_name": "Coal Production",
                        "numeric_value": m_val,
                        "unit": table_unit,
                        "standard_value": std_val,
                        "standard_unit": std_unit,
                        "fiscal_year": table_fy,
                        "page_number": page_number,
                        "confidence_score": 0.980,
                        "validation_status": "VALIDATED",
                        "raw_snippet": raw_snip
                    })

            # Extract Cumulative Production
            if is_production_table and cumulative_prod_col_idx is not None and cumulative_prod_col_idx < len(row):
                c_val = parse_numeric_cell(row[cumulative_prod_col_idx])
                if c_val is not None:
                    std_val, std_unit = normalize_unit_to_mt(c_val, table_unit)
                    raw_snip = f"{snip_title} | {entity_label} | Cumulative Production upto {table_month or 'Month'}{month_str}: {c_val} {table_unit} | Page {page_number}"
                    extracted_metrics.append({
                        "mine_name": mine_name,
                        "subsidiary": subsidiary,
                        "metric_name": "Cumulative Coal Production",
                        "numeric_value": c_val,
                        "unit": table_unit,
                        "standard_value": std_val,
                        "standard_unit": std_unit,
                        "fiscal_year": table_fy,
                        "page_number": page_number,
                        "confidence_score": 0.980,
                        "validation_status": "VALIDATED",
                        "raw_snippet": raw_snip
                    })

            # Extract Monthly Target if present
            if is_production_table and target_col_idx is not None and target_col_idx < len(row):
                t_val = parse_numeric_cell(row[target_col_idx])
                if t_val is not None:
                    std_val, std_unit = normalize_unit_to_mt(t_val, table_unit)
                    raw_snip = f"{snip_title} | {entity_label} | Monthly Target{month_str}: {t_val} {table_unit} | Page {page_number}"
                    extracted_metrics.append({
                        "mine_name": mine_name,
                        "subsidiary": subsidiary,
                        "metric_name": "Monthly Production Target",
                        "numeric_value": t_val,
                        "unit": table_unit,
                        "standard_value": std_val,
                        "standard_unit": std_unit,
                        "fiscal_year": table_fy,
                        "page_number": page_number,
                        "confidence_score": 0.980,
                        "validation_status": "VALIDATED",
                        "raw_snippet": raw_snip
                    })

    return extracted_metrics


# ---------------------------------------------------------------------------
# Issue #79: Year-series columnar table extraction (real government layout)
#
# Government statistical tables (CCO Coal Directory, CIL annual reports, PIB
# releases) lay data out as:
#     Item | Unit | 2019-20 | 2020-21 | ... | 2023-24
# with the unit stated once and bare numbers under fiscal-year columns. The
# narrative extractor (inline "42.50 Lakh Tonnes") and the monthly/cumulative
# column-role extractor both miss this layout entirely. This pass reads the
# fiscal-year columns directly and emits one metric tuple per (row item, FY).
# ---------------------------------------------------------------------------

INDIAN_COAL_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Jharkhand", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab",
    "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal",
    "Chattisgarh", "Orissa", "Tamilnadu", "Uttarakhand",
]

_FY_COLUMN_RE = re.compile(r"^(?:FY\s*)?(20\d{2})\s*[-/]\s*(\d{2,4})$")


def _parse_fy_header(cell: str) -> Optional[str]:
    """Parses a fiscal-year column header ('2023-24', 'FY 2023-24', '2023/24') into 'YYYY-YY'."""
    if not cell:
        return None
    m = _FY_COLUMN_RE.match(str(cell).strip())
    if not m:
        return None
    start = m.group(1)
    end = m.group(2)
    if len(end) == 4:
        end = end[-2:]
    return f"{start}-{end}"


def _classify_year_series_metric(item_text: str, unit_hint: str) -> Optional[str]:
    """Classifies a row item from a year-series table into a canonical metric name."""
    t = (item_text or "").lower()
    if "obr" in t or "overburden" in t or "stripping" in t:
        return "Overburden Removal"
    if "despatch" in t or "dispatch" in t or "off-take" in t or "offtake" in t:
        return "Coal Despatch"
    if "import" in t:
        return "Coal Import"
    if "export" in t:
        return "Coal Export"
    if "reserve" in t or "resource" in t:
        return "Coal Reserves"
    if "opening stock" in t:
        return "Opening Stock"
    if "closing stock" in t:
        return "Closing Stock"
    if "stock" in t:
        return "Coal Stock"
    if "production" in t or "output" in t or "produced" in t:
        if "coking" in t:
            return "Coking Coal Production"
        if "non" in t and "coking" in t:
            return "Non-Coking Coal Production"
        if "lignite" in t:
            return "Lignite Production"
        return "Coal Production"
    if "lignite" in t and unit_hint and ("tonne" in unit_hint.lower() or "mt" in unit_hint.lower()):
        return "Lignite Production"
    if "coking coal" in t:
        return "Coking Coal Production"
    return None


def _year_series_entity_label(item_text: str, table_title: str) -> Tuple[str, Optional[str]]:
    """
    Resolves (entity_label, subsidiary) for a year-series row item.
    Recognizes states, CIL subsidiaries, parent companies and sector buckets —
    no hardcoded mine names.
    """
    t = (item_text or "").strip()
    t_lower = t.lower()

    for state in INDIAN_COAL_STATES:
        if state.lower() in t_lower:
            return state, None

    for sub in ["ECL", "BCCL", "CCL", "NCL", "WCL", "SECL", "MCL", "NEC", "SCCL", "NLCIL", "NLC"]:
        if re.search(r"\b" + sub + r"\b", t, re.IGNORECASE):
            return t, sub

    if "coal india" in t_lower or re.search(r"\bCIL\b", t):
        return "Coal India Limited", "CIL"
    if "singareni" in t_lower:
        return "Singareni Collieries (SCCL)", "SCCL"
    if "captive" in t_lower or "commercial" in t_lower:
        return "Captive & Commercial Blocks", None
    return t, None


def extract_year_series_metrics_from_tables(
    tables: List[Dict[str, Any]],
    page_number: int,
    page_text: str = "",
    default_subsidiary: Optional[str] = "CIL HQ",
    default_year: Optional[str] = "2023-24",
) -> List[Dict[str, Any]]:
    """
    Extracts metrics from year-series columnar tables (Item | Unit | FY columns).
    One metric tuple per (row item, fiscal-year column) pair. Runs additively
    alongside the existing extractors; duplicate suppression happens in the
    processing pipeline as today (table metrics take precedence).
    """
    if not tables:
        return []

    extracted: List[Dict[str, Any]] = []

    for tab_info in tables:
        raw_rows = tab_info.get("raw_rows", []) or []
        if len(raw_rows) < 3:
            continue

        # Find a header row containing >= 2 fiscal-year cells
        header_idx = None
        fy_cols: Dict[int, str] = {}
        unit_col_idx = None
        item_col_idx = None
        for h_idx in range(min(4, len(raw_rows))):
            row = raw_rows[h_idx]
            cells = [str(c).strip().replace("\n", " ") if c is not None else "" for c in row]
            fy_map = {}
            for c_idx, cell in enumerate(cells):
                fy = _parse_fy_header(cell)
                if fy:
                    fy_map[c_idx] = fy
            if len(fy_map) >= 2:
                header_idx = h_idx
                fy_cols = fy_map
                # unit column: header cell containing 'Unit'
                for c_idx, cell in enumerate(cells):
                    cl = cell.lower()
                    if not unit_col_idx and cl == "unit":
                        unit_col_idx = c_idx
                    if not item_col_idx and cl in ("item", "particulars", "state", "company", "item/particulars"):
                        item_col_idx = c_idx
                break

        if header_idx is None:
            continue

        if item_col_idx is None:
            item_col_idx = 0
            # skip 'Sl. No.' style first column when a second text column exists
            if len(raw_rows[header_idx]) > 1:
                second = str(raw_rows[header_idx][1]).strip().lower() if raw_rows[header_idx][1] else ""
                if second in ("item", "particulars", "state", "company", "entity") or second:
                    item_col_idx = 1

        # Table title for provenance snippets
        title_m = re.search(r"\bTable\s*[\d\.]+\s*:?\s*[^\n]{0,100}", page_text, re.IGNORECASE)
        table_title = title_m.group(0).strip() if title_m else "Year-series table"

        # Header-inherited unit (e.g. 'Million Tonnes' cell under 'Unit')
        header_unit = None
        if unit_col_idx is not None:
            for r_idx in range(header_idx + 1, min(header_idx + 4, len(raw_rows))):
                pass  # units live per-row; resolved below

        # Iterate data rows
        current_item = ""
        for r_idx in range(header_idx + 1, len(raw_rows)):
            row = raw_rows[r_idx]
            if not row:
                continue
            cells = [str(c).strip().replace("\n", " ") if c is not None else "" for c in row]

            raw_item = cells[item_col_idx] if item_col_idx < len(cells) else ""
            # Section rows like '3 Production :' have no numbers — carry context forward
            has_fy_number = any(
                c_idx in fy_cols and parse_numeric_cell(c)
                for c_idx, c in enumerate(cells)
            )
            if raw_item and not has_fy_number:
                # Section header row (e.g. '2 Opening Stock', '3 Production :') —
                # remember it as context for the indented rows below
                current_item = re.sub(r"\s*[:$]\s*$", "", raw_item)
                continue

            if not raw_item:
                continue

            # Row-level unit cell
            row_unit = cells[unit_col_idx] if (unit_col_idx is not None and unit_col_idx < len(cells)) else None
            # Some rows inherit the unit from the first data row in the section
            if not row_unit:
                row_unit = header_unit

            full_item = f"{current_item} - {raw_item}" if current_item and raw_item != current_item else raw_item

            metric_name = _classify_year_series_metric(full_item, row_unit or "")
            if not metric_name:
                continue

            entity_label, subsidiary = _year_series_entity_label(full_item, table_title)

            for c_idx, fy in fy_cols.items():
                val = parse_numeric_cell(cells[c_idx]) if c_idx < len(cells) else None
                if val is None:
                    continue
                std_val, std_unit = normalize_unit_to_mt(val, row_unit or "MT")
                raw_snip = (
                    f"{table_title} | {full_item} | FY {fy}: {val} {row_unit or 'MT'} "
                    f"(standardized {std_val} {std_unit}) | Page {page_number}"
                )
                extracted.append({
                    "mine_name": entity_label,
                    "subsidiary": subsidiary if subsidiary else default_subsidiary,
                    "metric_name": metric_name,
                    "numeric_value": val,
                    "unit": row_unit or "MT",
                    "standard_value": std_val,
                    "standard_unit": std_unit,
                    "fiscal_year": fy,
                    "page_number": page_number,
                    "confidence_score": 0.98,
                    "validation_status": "VALIDATED",
                    "raw_snippet": raw_snip,
                })

    return extracted
