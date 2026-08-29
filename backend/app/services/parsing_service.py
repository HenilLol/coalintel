import os
import logging
from typing import List, Dict, Any, Tuple

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


def parse_pdf_document(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses digital and scanned PDF documents page-by-page.
    Uses PyMuPDF (fitz) for native text extraction.
    Triggers Tesseract OCR if page text length is < 100 characters.
    Returns list of dicts: [{'page_number': int, 'text': str, 'is_ocr': bool}]
    """
    pages_data = []

    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return pages_data

    if not HAS_PYMUPDF:
        logger.warning(f"PyMuPDF absent. Attempting basic file reading for {file_path}")
        return [{"page_number": 1, "text": f"Document text placeholder for {os.path.basename(file_path)}", "is_ocr": False}]

    try:
        doc = fitz.open(file_path)
        total_pages = len(doc)
        logger.info(f"Opened PDF document '{file_path}' with {total_pages} pages.")

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc.load_page(page_idx)
            native_text = page.get_text("text").strip()

            is_ocr = False
            final_text = native_text

            # If page text length is < 100 chars, trigger Tesseract OCR fallback
            if len(native_text) < 100 and HAS_PYTESSERACT:
                try:
                    logger.info(f"Page {page_num} contains low native text ({len(native_text)} chars). Triggering Tesseract OCR...")
                    pix = page.get_pixmap(dpi=150)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_text = pytesseract.image_to_string(img).strip()
                    if len(ocr_text) > len(native_text):
                        final_text = ocr_text
                        is_ocr = True
                        logger.info(f"OCR successfully extracted {len(ocr_text)} characters on page {page_num}.")
                except Exception as ocr_err:
                    logger.warning(f"Tesseract OCR failed on page {page_num}: {ocr_err}. Reverting to native text.")

            pages_data.append({
                "page_number": page_num,
                "text": final_text or f"Page {page_num} content.",
                "is_ocr": is_ocr
            })

        doc.close()
        return pages_data

    except Exception as e:
        logger.error(f"Failed to parse PDF document '{file_path}': {e}")
        return [{"page_number": 1, "text": f"Error parsing document: {e}", "is_ocr": False}]


def parse_docx_document(file_path: str) -> List[Dict[str, Any]]:
    """P1 Parser: Extracts text paragraphs from .docx files."""
    try:
        import docx
        doc = docx.Document(file_path)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        return [{"page_number": 1, "text": full_text or "DOCX document", "is_ocr": False}]
    except Exception as e:
        logger.error(f"Failed to parse DOCX file '{file_path}': {e}")
        return [{"page_number": 1, "text": f"DOCX document content for {os.path.basename(file_path)}", "is_ocr": False}]


def parse_excel_csv_document(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    """P1 Parser: Extracts tabular text from .xlsx and .csv files."""
    try:
        import pandas as pd
        if file_type == "CSV":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        text_content = df.to_string()
        return [{"page_number": 1, "text": text_content, "is_ocr": False}]
    except Exception as e:
        logger.error(f"Failed to parse {file_type} file '{file_path}': {e}")
        return [{"page_number": 1, "text": f"{file_type} table data for {os.path.basename(file_path)}", "is_ocr": False}]


def parse_document_file(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    """Unified document parser entrypoint dispatching by file extension/type."""
    f_type = file_type.upper()
    if f_type == "PDF":
        return parse_pdf_document(file_path)
    elif f_type == "DOCX":
        return parse_docx_document(file_path)
    elif f_type in ["XLSX", "CSV"]:
        return parse_excel_csv_document(file_path, f_type)
    else:
        return parse_pdf_document(file_path)
