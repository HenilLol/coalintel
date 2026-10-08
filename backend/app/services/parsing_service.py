import os
import io
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Try importing fitz (PyMuPDF)
try:
    import fitz
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    logger.warning("PyMuPDF (fitz) is not installed. PDF parsing will use text fallback.")

# Try importing pytesseract
try:
    import pytesseract
    from PIL import Image
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False
    logger.warning("pytesseract or PIL is not installed. OCR fallback will be disabled.")


def _resolve_tesseract_cmd() -> Optional[str]:
    """Locate the Tesseract binary across platforms (Issue #83).

    pytesseract's default PATH lookup silently fails on default Windows
    installs (the winget installer puts tesseract.exe in
    %ProgramFiles%/Tesseract-OCR, which is NOT added to PATH), disabling the
    OCR fallback for every scanned page without any visible error.

    Resolution order:
      1. TESSERACT_CMD environment variable (explicit override)
      2. `tesseract` on PATH (shutil.which)
      3. Well-known install locations (Windows)
    Returns None when no binary can be found.
    """
    import shutil
    candidates: List[str] = []
    env_cmd = os.environ.get("TESSERACT_CMD")
    if env_cmd:
        candidates.append(env_cmd)
    which = shutil.which("tesseract")
    if which:
        candidates.append(which)
    if os.name == "nt":
        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        local_appdata = os.environ.get("LOCALAPPDATA", "")
        candidates += [
            os.path.join(program_files, "Tesseract-OCR", "tesseract.exe"),
            os.path.join(program_files_x86, "Tesseract-OCR", "tesseract.exe"),
            os.path.join(local_appdata, "Programs", "Tesseract-OCR", "tesseract.exe"),
        ]
    for cand in candidates:
        if cand and os.path.isfile(cand):
            return cand
    return None


if HAS_PYTESSERACT:
    _TESSERACT_CMD = _resolve_tesseract_cmd()
    if _TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = _TESSERACT_CMD
    else:
        logger.warning(
            "Tesseract binary not found (PATH / TESSERACT_CMD / default install "
            "locations). OCR fallback will attempt per-page and degrade to native text."
        )


class DocumentParsingError(Exception):
    """
    Raised when a document cannot be parsed (corrupt file, unsupported encoding, etc.).

    Issue #57: parse failures must propagate to the processing pipeline so the
    document is marked FAILED. Error text must NEVER be returned as document
    content (it would otherwise be chunked, embedded, and citable by the RAG layer).
    """
    pass


def parse_pdf_document(file_path: str, file_bytes: Optional[bytes] = None) -> List[Dict[str, Any]]:
    """
    Parses digital and scanned PDF documents page-by-page.
    Uses PyMuPDF (fitz) for native text extraction.
    Triggers Tesseract OCR if page text length is < 100 characters.
    Supports in-memory file_bytes or filesystem file_path.
    Returns list of dicts: [{'page_number': int, 'text': str, 'is_ocr': bool}]
    """
    pages_data = []

    if file_bytes is None and not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return pages_data

    if not HAS_PYMUPDF:
        logger.warning(f"PyMuPDF absent. Attempting basic file reading for {file_path}")
        return [{"page_number": 1, "text": f"Document text placeholder for {os.path.basename(file_path)}", "is_ocr": False}]

    try:
        if file_bytes is not None:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            logger.info(f"Opened in-memory PDF document ({len(file_bytes)} bytes) with {len(doc)} pages.")
        else:
            doc = fitz.open(file_path)
            logger.info(f"Opened PDF document '{file_path}' with {len(doc)} pages.")

        total_pages = len(doc)

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc.load_page(page_idx)
            native_text = page.get_text("text").strip()

            is_ocr = False
            final_text = native_text

            # Trigger Tesseract OCR fallback when the page is likely scanned
            # (Issue #83). Two conditions, both found live on the CCO Coal
            # Directory 2023-24:
            #   (a) low native text (< 100 chars) — fully scanned page
            #   (b) thin native text (< 500 chars) AND embedded images cover
            #       >= 30% of the page area — HYBRID page: a ~120-char native
            #       running header ("Coal Controller Organisation, ... /
            #       Coal Directory of India 2023-24") sits on top of a fully
            #       scanned table body. The old <100-char rule never fired
            #       for these pages, silently dropping every mine-wise table.
            trigger_ocr = False
            if HAS_PYTESSERACT:
                if len(native_text) < 100:
                    trigger_ocr = True
                elif len(native_text) < 500:
                    try:
                        page_rect = page.rect
                        page_area = max(page_rect.get_area(), 1.0)
                        img_area = 0.0
                        seen_xrefs = set()
                        for img_info in page.get_images(full=True):
                            xref = img_info[0]
                            if xref in seen_xrefs:
                                continue
                            seen_xrefs.add(xref)
                            try:
                                for r in page.get_image_rects(xref):
                                    img_area += r.get_area()
                            except Exception:
                                pass
                        if min(img_area / page_area, 1.0) >= 0.30:
                            trigger_ocr = True
                    except Exception:
                        pass

            if trigger_ocr:
                try:
                    logger.info(f"Page {page_num} looks scanned (native text {len(native_text)} chars). Triggering Tesseract OCR...")
                    # 200 dpi: 150 was too low for dense government tables
                    # (digits misread); 200 was verified live on Coal
                    # Directory table pages.
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_text = pytesseract.image_to_string(img).strip()
                    if len(ocr_text) > len(native_text):
                        final_text = ocr_text
                        is_ocr = True
                        logger.info(f"OCR successfully extracted {len(ocr_text)} characters on page {page_num}.")
                except Exception as ocr_err:
                    logger.warning(f"Tesseract OCR failed on page {page_num}: {ocr_err}. Reverting to native text.")

            # If native PyMuPDF table finder is available, attempt table extraction (additive, fail-safe)
            page_tables = []
            try:
                if hasattr(page, "find_tables"):
                    tab_finder = page.find_tables()
                    if tab_finder and hasattr(tab_finder, "tables") and tab_finder.tables:
                        for tab_idx, tab in enumerate(tab_finder.tables):
                            raw_rows = tab.extract()
                            if raw_rows and len(raw_rows) >= 2:
                                page_tables.append({
                                    "table_index": tab_idx,
                                    "bbox": list(tab.bbox) if hasattr(tab, "bbox") else [],
                                    "row_count": getattr(tab, "row_count", len(raw_rows)),
                                    "col_count": getattr(tab, "col_count", len(raw_rows[0]) if raw_rows else 0),
                                    "raw_rows": raw_rows,
                                    "header_names": list(tab.header.names) if hasattr(tab, "header") and tab.header and hasattr(tab.header, "names") else []
                                })
            except Exception as tab_err:
                logger.warning(f"PyMuPDF table extraction note on page {page_num}: {tab_err}")

            pages_data.append({
                "page_number": page_num,
                "text": final_text or f"Page {page_num} content.",
                "is_ocr": is_ocr,
                "tables": page_tables
            })

        doc.close()
        return pages_data

    except Exception as e:
        # Issue #57: parse failures must NEVER become corpus content.
        # Log server-side and re-raise so the processing pipeline marks the
        # document FAILED instead of chunking/embedding an error message.
        logger.error(f"Failed to parse PDF document '{file_path}': {e}")
        raise DocumentParsingError(f"PDF parsing failed: {e}") from e


def parse_docx_document(file_path: str, file_bytes: Optional[bytes] = None) -> List[Dict[str, Any]]:
    """P1 Parser: Extracts text paragraphs from .docx files."""
    try:
        import docx
        if file_bytes is not None:
            doc = docx.Document(io.BytesIO(file_bytes))
        else:
            doc = docx.Document(file_path)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        return [{"page_number": 1, "text": full_text or "DOCX document", "is_ocr": False}]
    except Exception as e:
        # Issue #57: fail loudly; never store error text as content
        logger.error(f"Failed to parse DOCX file '{file_path}': {e}")
        raise DocumentParsingError(f"DOCX parsing failed: {e}") from e


def parse_excel_csv_document(file_path: str, file_type: str, file_bytes: Optional[bytes] = None) -> List[Dict[str, Any]]:
    """P1 Parser: Extracts tabular text from .xlsx and .csv files."""
    try:
        import pandas as pd
        if file_bytes is not None:
            target = io.BytesIO(file_bytes)
        else:
            target = file_path

        if file_type == "CSV":
            df = pd.read_csv(target)
        else:
            df = pd.read_excel(target)
        text_content = df.to_string()
        return [{"page_number": 1, "text": text_content, "is_ocr": False}]
    except Exception as e:
        # Issue #57: fail loudly; never store error text as content
        logger.error(f"Failed to parse {file_type} file '{file_path}': {e}")
        raise DocumentParsingError(f"{file_type} parsing failed: {e}") from e


def parse_document_file(file_path: str, file_type: str, file_bytes: Optional[bytes] = None) -> List[Dict[str, Any]]:
    """Unified document parser entrypoint dispatching by file extension/type with optional in-memory bytes."""
    f_type = file_type.upper()
    if f_type == "PDF":
        return parse_pdf_document(file_path, file_bytes=file_bytes)
    elif f_type == "DOCX":
        return parse_docx_document(file_path, file_bytes=file_bytes)
    elif f_type in ["XLSX", "CSV"]:
        return parse_excel_csv_document(file_path, f_type, file_bytes=file_bytes)
    else:
        return parse_pdf_document(file_path, file_bytes=file_bytes)
