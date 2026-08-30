import re
from typing import Dict, Any, List, Optional, Tuple

# Mining Subsidiary Dictionary
SUBSIDIARIES = ["ECL", "BCCL", "CCL", "WCL", "SECL", "NCL", "MCL", "NEC", "CIL"]

# Known Mine Names
KNOWN_MINES = [
    "Rajmahal OC", "Rajmahal OpenCast", "Gevra OC", "Dipka OC", "Kusmunda OC",
    "Samaleswari OC", "Sonalpur OC", "Jayant OC", "Nigahi OC", "Amlohri OC"
]

# Target Metric Names
METRICS_PATTERNS = {
    "Production": r"(?:coal\s+)?production|coal|output|mined\ coal",
    "Overburden Removal": r"overburden(?:\s+removal)?|obr",
    "Despatch": r"despatch|dispatch|offtake",
    "Washing Capacity": r"wash(?:ing)?\s+capacity|washery",
    "Stripping Ratio": r"stripping\s+ratio",
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
    Deterministically normalizes raw extracted numerical values and units into Million Tonnes (MT).
    Example: 42.50 Lakh Tonnes -> 4.25 MT (Multiplier = 0.1)
    """
    if not raw_unit:
        return raw_value, "MT"

    unit_clean = raw_unit.strip().lower()
    
    for unit_pattern, multiplier in UNIT_MULTIPLIERS_TO_MT.items():
        if unit_pattern in unit_clean:
            standard_val = round(raw_value * multiplier, 4)
            standard_unit = "M.Cu.M" if "cu" in unit_clean or "mcum" in unit_clean else "MT"
            return standard_val, standard_unit

    # Default fallback if unit matches standard MT
    return raw_value, "MT"


def extract_entity_tuples_from_text(
    text: str,
    page_number: int,
    default_subsidiary: Optional[str] = "CIL HQ",
    default_year: Optional[str] = "2023-24"
) -> List[Dict[str, Any]]:
    """
    Scans page text using regex patterns to extract structured entity metrics tuples:
    (mine_name, subsidiary, metric_name, numeric_value, unit, standard_value, standard_unit, fiscal_year, page_number, raw_snippet)
    """
    extracted_tuples = []
    if not text:
        return extracted_tuples

    # Detect fiscal year in text (e.g. 2023-24 or 2022-2023)
    year_match = re.search(r"\b(20\d{2}[-\/]\d{2,4})\b", text)
    fiscal_year = year_match.group(1) if year_match else default_year

    # Detect subsidiary in text
    subsidiary = default_subsidiary
    for sub in SUBSIDIARIES:
        if re.search(r"\b" + sub + r"\b", text, re.IGNORECASE):
            subsidiary = sub
            break

    # Search for known mines in text
    detected_mine = None
    for km in KNOWN_MINES:
        if km.lower() in text.lower():
            detected_mine = km
            break

    # Match numeric values with units (e.g., "42.50 Lakh Tonnes" or "120.40 M.Cu.M")
    value_unit_pattern = re.compile(
        r"([\d\.,]+)\s*"
        r"(Lakh\s+Tonnes|Million\s+Tonnes|Thousand\s+Tonnes|MT|M\.Cu\.M|MCuM|Tonnes)",
        re.IGNORECASE
    )

    for match in value_unit_pattern.finditer(text):
        val_str = match.group(1).replace(",", "").strip()
        unit_raw = match.group(2).strip()

        try:
            numeric_val = float(val_str)
        except ValueError:
            continue

        # Extract surrounding context snippet (expanded window)
        start_pos = max(0, match.start() - 150)
        end_pos = min(len(text), match.end() + 150)
        snippet = text[start_pos:end_pos].strip()

        # Determine metric name from surrounding snippet or unit
        unit_clean = unit_raw.lower()
        if "cu" in unit_clean or "mcum" in unit_clean:
            metric_name = "Overburden Removal"
        else:
            metric_name = "Coal Production"

        for m_name, m_regex in METRICS_PATTERNS.items():
            if re.search(m_regex, snippet, re.IGNORECASE) or re.search(m_regex, text, re.IGNORECASE):
                metric_name = m_name
                break

        # Determine mine name from snippet if not already detected
        mine_name = detected_mine
        if not mine_name:
            m_match = re.search(r"([A-Z][A-Za-z0-9_]+\s+(?:OC|OpenCast|Mine|Colliery|Project))", snippet)
            if m_match:
                mine_name = m_match.group(1)
            else:
                mine_name = f"{subsidiary} Mine"

        # Normalize unit
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
            "confidence_score": 0.95,
            "raw_snippet": snippet
        })

    return extracted_tuples
