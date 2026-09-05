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
    value_unit_pattern = re.compile(
        r"([\d\.,]+)\s*"
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
            else:
                metric_name = "Mining Metric (Unclassified)"

        # Find current line containing the numeric match
        line_start = text.rfind("\n", 0, match.start())
        line_start = 0 if line_start == -1 else line_start + 1
        line_end = text.find("\n", match.end())
        line_end = len(text) if line_end == -1 else line_end
        current_line = text[line_start:line_end].strip()

        # Step 2: Entity & Mine Extraction (Line-proximity first, then distance-weighted)
        detected_mine = None

        # A. Check current line for known mines or mine regex (highest priority)
        for km in KNOWN_MINES:
            if re.search(r"\b" + re.escape(km) + r"\b", current_line, re.IGNORECASE):
                detected_mine = km
                break

        if not detected_mine:
            m_match = mine_name_regex.search(current_line)
            if m_match:
                detected_mine = m_match.group(1).strip()

        # B. Check previous line (table row header on preceding line)
        if not detected_mine and line_start > 0:
            prev_line_start = text.rfind("\n", 0, line_start - 1)
            prev_line_start = 0 if prev_line_start == -1 else prev_line_start + 1
            prev_line = text[prev_line_start:line_start - 1].strip()
            for km in KNOWN_MINES:
                if re.search(r"\b" + re.escape(km) + r"\b", prev_line, re.IGNORECASE):
                    detected_mine = km
                    break
            if not detected_mine:
                p_match = mine_name_regex.search(prev_line)
                if p_match:
                    detected_mine = p_match.group(1).strip()

        # C. If still not found, search snippet for the closest mine mention by character distance
        if not detected_mine:
            closest_mine = None
            min_dist = float("inf")
            match_offset_in_snippet = match.start() - max(0, match.start() - 180)
            for m in mine_name_regex.finditer(snippet):
                dist = abs(m.start() - match_offset_in_snippet)
                if dist < min_dist:
                    min_dist = dist
                    closest_mine = m.group(1).strip()
            if closest_mine:
                detected_mine = closest_mine

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

        # D. Safe non-misleading fallback for mine name (NO synthetic "ECL Mine")
        if not detected_mine:
            mine_name = "Unspecified Mine"
        else:
            mine_name = detected_mine

        # Step 4: Temporal / Fiscal Year Grounding
        is_historical = False
        fiscal_year = None

        # A. Detect historical year mentions (e.g. "in 1975", "at inception in 1975", "since 1975")
        hist_match = re.search(
            r"\b(?:in|since|inception\s+in|year\s+of\s+its\s+inception|during|year|established\s+in)\s+(19\d{2}|20[01]\d)\b",
            snippet,
            re.IGNORECASE
        )
        if hist_match:
            hist_year = hist_match.group(1)
            fiscal_year = f"{hist_year}-{int(hist_year[-2:])+1:02d}" if int(hist_year) < 2020 else f"{hist_year}"
            is_historical = True
        else:
            # Check for standalone historical 19xx years
            standalone_19xx = re.search(r"\b(19\d{2})\b", snippet)
            if standalone_19xx:
                hist_year = standalone_19xx.group(1)
                fiscal_year = f"{hist_year}"
                is_historical = True

        # B. If not historical, search for explicit fiscal year in local snippet
        if not fiscal_year:
            fy_match = re.search(r"\b(20\d{2}[-\/]\d{2,4})\b", snippet)
            if fy_match:
                fiscal_year = fy_match.group(1)
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
