"""Shared PBPA letterhead artwork for generated PDF reports."""
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


_ASSET_DIR = Path(__file__).resolve().parent / 'assets'
TANZANIA_EMBLEM = _ASSET_DIR / 'tanzania-emblem.png'
PBPA_LOGO = _ASSET_DIR / 'pbpa-logo.png'


def add_pbpa_letterhead(pdf_bytes: bytes, document_type: str = '') -> bytes:
    """Place the Tanzania emblem at left and the PBPA logo at right of page one.

    The report generators already print the official agency wording in the middle
    of their headers.  Keeping the artwork at the outer edges preserves each
    report's existing title and form layout while giving every downloaded report
    the same left-centre-right letterhead arrangement.  ``document_type`` is
    used only for an approved report-specific sizing exception.
    """
    if not pdf_bytes or not TANZANIA_EMBLEM.exists() or not PBPA_LOGO.exists():
        return pdf_bytes

    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        if not reader.pages:
            return pdf_bytes

        first_page = reader.pages[0]
        page_width = float(first_page.mediabox.width)
        page_height = float(first_page.mediabox.height)
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))

        # These are physical print dimensions, not proportions of the page.
        # Scaling from page *width* made landscape reports (Stock and
        # Provisional Outturn) render the marks about 40% larger than the same
        # letterhead on portrait reports.  All report generators use the same
        # Use one letterhead layout for every PDF orientation.  The left
        # Tanzania emblem is deliberately shorter than the PBPA mark so it
        # clears compact report header rules.
        # Keep the logo band above the full-width header rule used by the
        # portrait forms.  A 4 mm top inset makes the 22 mm portrait marks end
        # before that rule, leaving it as an even, uninterrupted divider.
        edge = 13 * mm
        standard_logo_size = 22 * mm
        # The Tanzania emblem has a taller visual silhouette than the PBPA
        # mark.  Keep it slightly shorter on portrait forms so it clears the
        # header landmark/rule without changing the right-hand logo.
        emblem_size = 19 * mm
        pbpa_logo_size = 38 * mm if document_type == 'Provisional Outturn Report' else standard_logo_size
        header_top = page_height - 4 * mm
        emblem_y = header_top - emblem_size
        pbpa_logo_y = header_top - pbpa_logo_size

        overlay.drawImage(
            ImageReader(str(TANZANIA_EMBLEM)), edge, emblem_y,
            width=emblem_size, height=emblem_size,
            preserveAspectRatio=True, anchor='n', mask='auto',
        )
        overlay.drawImage(
            ImageReader(str(PBPA_LOGO)), page_width - edge - pbpa_logo_size, pbpa_logo_y,
            width=pbpa_logo_size, height=pbpa_logo_size,
            preserveAspectRatio=True, anchor='n', mask='auto',
        )
        overlay.save()

        overlay_page = PdfReader(BytesIO(overlay_buffer.getvalue())).pages[0]
        first_page.merge_page(overlay_page)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        result = BytesIO()
        writer.write(result)
        return result.getvalue()
    except Exception:
        # Branding should never prevent an operational report from downloading.
        return pdf_bytes
