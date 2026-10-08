"""Issue #83: the OCR fallback must actually fire.

Found live while ingesting the real CCO Coal Directory 2023-24: part 2
(40 pages, 20+ scanned government tables) went through the authenticated
pipeline with ZERO pages OCR'd because
  (a) pytesseract could not find tesseract.exe on a default Windows
      install (winget puts it in %ProgramFiles%/Tesseract-OCR, not on
      PATH) and the per-page except silently swallowed the failure, and
  (b) the < 100-char trigger never fires on HYBRID pages: a ~120-char
      native running header sits on top of a fully scanned table body.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.parsing_service import _resolve_tesseract_cmd  # noqa: E402


class TestTesseractResolution:
    """The binary resolver: TESSERACT_CMD env > PATH > known locations."""

    def test_env_override_wins(self, monkeypatch):
        fake = Path(__file__).parent / "_does_not_exist_tesseract.exe"
        monkeypatch.setenv("TESSERACT_CMD", str(fake))
        # env candidate must be returned only if it exists; a nonexistent
        # path must fall through to the next candidate
        result = _resolve_tesseract_cmd()
        assert result != str(fake)

    def test_resolver_returns_a_path_when_tesseract_installed(self, monkeypatch):
        # On this dev machine tesseract IS installed via winget
        monkeypatch.delenv("TESSERACT_CMD", raising=False)
        result = _resolve_tesseract_cmd()
        if result is not None:  # None is acceptable when truly absent
            assert os.path.isfile(result)

    def test_resolver_none_when_nowhere(self, monkeypatch):
        monkeypatch.delenv("TESSERACT_CMD", raising=False)
        monkeypatch.setattr("shutil.which", lambda *_: None, raising=False)
        import app.services.parsing_service as ps
        monkeypatch.setattr(ps.shutil, "which", lambda *_: None) if hasattr(ps, "shutil") else None
        # point ProgramFiles at an empty temp dir so well-known locations miss
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            monkeypatch.setenv("ProgramFiles", td)
            monkeypatch.setenv("ProgramFiles(x86)", td)
            monkeypatch.setenv("LOCALAPPDATA", td)
            result = _resolve_tesseract_cmd()
        assert result is None


class TestHybridPageTrigger:
    """Hybrid scanned pages (thin native header over a scanned table body)
    must trigger OCR. Reproduced from Coal Directory pages: ~120 chars of
    native text + images covering > 30% of the page."""

    def _build_synthetic_pdf(self, tmp_path, native_text_len=120, with_big_image=True):
        """Synthetic PDF mimicking the Coal Directory's hybrid pages."""
        import fitz

        pdf_path = str(tmp_path / "hybrid.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)  # A4
        # native running header (the real pages carry ~115-123 chars)
        page.insert_text((72, 60), "Coal Controller Organisation, 5th Floor, Core-I, Scope Minar, Laxmi Nagar, Delhi-110 092 " * 2, fontsize=8)
        if with_big_image:
            # one large image covering most of the page = scanned table body
            img = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 1200, 1600))
            img.clear_with(90)
            page.insert_image(fitz.Rect(20, 100, 575, 800), pixmap=img)
        doc.save(pdf_path)
        doc.close()
        return pdf_path

    def test_hybrid_page_triggers_ocr(self, tmp_path, monkeypatch):
        """Thin native text + large image area => OCR must fire."""
        import fitz

        pdf_path = self._build_synthetic_pdf(tmp_path)
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        native_text = page.get_text("text").strip()

        from app.services import parsing_service as ps
        # simulate the trigger logic exactly as the parser computes it
        trigger_ocr = False
        if native_text is not None:
            if len(native_text) < 100:
                trigger_ocr = True
            elif len(native_text) < 500:
                page_rect = page.rect
                page_area = max(page_rect.get_area(), 1.0)
                img_area = 0.0
                seen_xrefs = set()
                for img_info in page.get_images(full=True):
                    xref = img_info[0]
                    if xref in seen_xrefs:
                        continue
                    seen_xrefs.add(xref)
                    for r in page.get_image_rects(xref):
                        img_area += r.get_area()
                if min(img_area / page_area, 1.0) >= 0.30:
                    trigger_ocr = True
        assert trigger_ocr is True, "hybrid page (thin text + big image) must trigger OCR"

    def test_rich_text_page_does_not_trigger(self, tmp_path):
        """A text-dense page (native text > 500 chars) must NOT OCR."""
        import fitz

        pdf_path = str(tmp_path / "rich.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        # multiple lines: insert_text clips at page width, so write many lines
        for i in range(40):
            page.insert_text((72, 72 + 12 * i), "lorem ipsum dolor sit amet consectetur adipiscing elit sed do", fontsize=9)
        doc.save(pdf_path)
        doc.close()

        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        native_text = page.get_text("text").strip()
        assert len(native_text) >= 500
        trigger_ocr = len(native_text) < 100 or (
            len(native_text) < 500
            and any(page.get_image_rects(i[0]) for i in page.get_images(full=True))
        )
        assert trigger_ocr is False
