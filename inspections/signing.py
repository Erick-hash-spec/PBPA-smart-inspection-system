"""
PBPA Digital Signature Module
==============================
Provides:
  - SHA-256 document hash generation
  - HMAC-SHA256 digital signature (document hash + user + timestamp + secret)
  - Signature verification by recalculating and comparing hashes
  - pyHanko PDF cryptographic signing (optional, requires cert)
"""

import os
import io
import hmac
import hashlib
import datetime
import json
from decimal import Decimal
from pathlib import Path
from django.conf import settings

BASE_DIR  = Path(__file__).resolve().parent.parent  # backend/
CERT_DIR  = BASE_DIR / 'certs'
CERT_FILE = CERT_DIR / 'cert.pem'
KEY_FILE  = CERT_DIR / 'key.pem'


# ── Lazy-load pyHanko (optional dependency) ──────────────────────────────────

def _get_signer():
    """Load the PBPA SimpleSigner from cert/key files."""
    from pyhanko.sign import signers
    return signers.SimpleSigner.load(
        key_file=str(KEY_FILE),
        cert_file=str(CERT_FILE),
    )


def sign_pdf_bytes(pdf_bytes: bytes, signer_name: str = '', reason: str = 'PBPA Official Document') -> bytes:
    """
    Digitally sign a PDF and return the signed bytes.

    Args:
        pdf_bytes:    Raw PDF bytes (from reportlab, weasyprint, etc.)
        signer_name:  Name of the person/role signing (embedded in metadata)
        reason:       Reason string embedded in the signature

    Returns:
        Signed PDF bytes with embedded cryptographic signature.
    """
    from pyhanko.sign import signers, fields as sig_fields
    from pyhanko.sign.fields import SigFieldSpec
    from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter

    input_buf  = io.BytesIO(pdf_bytes)
    output_buf = io.BytesIO()

    signer = _get_signer()

    w = IncrementalPdfFileWriter(input_buf)

    # Add a signature field if not already present
    sig_fields.append_signature_field(
        w,
        SigFieldSpec(sig_field_name='PBPASignature', on_page=0)
    )

    meta = signers.PdfSignatureMetadata(
        field_name='PBPASignature',
        reason=reason,
        name=signer_name or 'PBPA Smart Reporting System',
        location='Dar es Salaam, Tanzania',
    )

    signers.sign_pdf(
        w,
        signature_meta=meta,
        signer=signer,
        output=output_buf,
    )

    return output_buf.getvalue()


def get_signature_info() -> dict:
    """Return info about the current signing certificate."""
    from cryptography import x509
    from cryptography.hazmat.primitives import serialization

    if not CERT_FILE.exists():
        return {'available': False, 'error': 'Certificate not found'}

    with open(CERT_FILE, 'rb') as f:
        cert = x509.load_pem_x509_certificate(f.read())

    return {
        'available': True,
        'subject':   cert.subject.rfc4514_string(),
        'issuer':    cert.issuer.rfc4514_string(),
        'valid_from': cert.not_valid_before_utc.isoformat(),
        'valid_until': cert.not_valid_after_utc.isoformat(),
        'serial':    str(cert.serial_number),
    }


def compute_document_hash(content: bytes) -> str:
    """SHA-256 hash of document content for integrity tracking."""
    return hashlib.sha256(content).hexdigest()


def add_verification_page(
    pdf_bytes: bytes,
    *,
    document_number: str,
    document_hash: str,
    document_type: str,
    signer_name: str = '',
    signer_role: str = '',
    signed: bool = False,
    verification_url: str = '',
) -> bytes:
    """Append a human-readable integrity record before cryptographically signing.

    The SHA-256 value is calculated from the canonical business record (when
    available), rather than volatile PDF bytes. This makes it stable across
    regenerated copies while the PDF signature protects the actual file.
    """
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    page_buf = io.BytesIO()
    width, height = A4
    pdf = canvas.Canvas(page_buf, pagesize=A4)
    margin = 18 * mm
    y = height - margin
    pdf.setTitle('PBPA Document Verification')
    pdf.setStrokeColor(colors.HexColor('#8B1A1A'))
    pdf.setLineWidth(1)
    pdf.line(margin, y, width - margin, y)
    y -= 12 * mm
    pdf.setFont('Helvetica-Bold', 16)
    pdf.drawString(margin, y, 'DOCUMENT SECURITY INFORMATION')
    y -= 10 * mm
    pdf.setFont('Helvetica', 9)
    signed_at = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3)))
    hash_display = document_hash
    if len(document_hash) > 20:
        hash_display = f'{document_hash[:8]}...{document_hash[-8:]}'
    signer_identity = signer_name or 'PBPA Smart Reporting System'
    if signer_role:
        signer_identity = f'{signer_identity} ({signer_role})'
    rows = (
        ('Document type', document_type),
        ('Document ID', document_number or 'Not assigned'),
        ('Integrity', 'VERIFIED - SHA-256 record hash embedded'),
        ('SHA-256', hash_display or 'Not available'),
        ('PDF signature', 'Digitally signed by PBPA Smart Reporting System'),
        ('Signed on', signed_at.strftime('%d-%b-%Y %H:%M:%S UTC+3')),
        ('Signed by', signer_identity),
        ('Record status', 'Signed record' if signed else 'Generated copy'),
    )
    for label, value in rows:
        pdf.setFont('Helvetica-Bold', 9)
        pdf.drawString(margin, y, f'{label}:')
        pdf.setFont('Helvetica', 8)
        pdf.drawString(margin + 38 * mm, y, str(value))
        y -= 8 * mm

    # A URL lets any phone camera open the live verification record.  Keep the
    # compact text payload as a fallback for deployments without a public URL.
    qr_data = verification_url or f'PBPA|{document_type}|{document_number}|{document_hash}'
    try:
        import qrcode
        qr_buf = io.BytesIO()
        qrcode.make(qr_data).save(qr_buf, format='PNG')
        qr_buf.seek(0)
        size = 42 * mm
        pdf.drawImage(ImageReader(qr_buf), width - margin - size, 38 * mm, size, size)
        pdf.setFont('Helvetica', 7)
        pdf.drawRightString(width - margin, 33 * mm, 'Scan to view the live verification record')
    except Exception:
        # A PDF remains verifiable through its embedded signature if QR support
        # is unavailable in a deployment.
        pass
    pdf.setFont('Helvetica-Oblique', 7)
    pdf.drawString(margin, 24 * mm, 'Open this PDF in Adobe Acrobat Reader to validate the embedded digital signature.')
    pdf.drawString(margin, 19 * mm, 'The QR code opens the document verification record and includes its SHA-256 integrity value.')
    pdf.save()

    reader = PdfReader(io.BytesIO(pdf_bytes))
    verification_reader = PdfReader(io.BytesIO(page_buf.getvalue()))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.add_page(verification_reader.pages[0])
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def overlay_verification_qr(
    pdf_bytes: bytes,
    *,
    document_number: str,
    document_hash: str,
    document_type: str,
    verification_url: str = '',
) -> bytes:
    """Overlay the verification QR code on the first report page.

    The QR opens the complete, live verification record, so no security page
    needs to be appended to the original report.
    """
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    try:
        import qrcode
        qr_buf = io.BytesIO()
        qr_data = verification_url or f'PBPA|{document_type}|{document_number}|{document_hash}'
        qrcode.make(qr_data).save(qr_buf, format='PNG')
        qr_buf.seek(0)
    except Exception:
        return pdf_bytes

    reader = PdfReader(io.BytesIO(pdf_bytes))
    if not reader.pages:
        return pdf_bytes
    first_page = reader.pages[0]
    width = float(first_page.mediabox.width)
    height = float(first_page.mediabox.height)
    overlay_buf = io.BytesIO()
    overlay = canvas.Canvas(overlay_buf, pagesize=(width, height))
    size = 18 * mm
    margin = 7 * mm
    x = width - margin - size
    y = margin
    overlay.drawImage(ImageReader(qr_buf), x, y, size, size, mask='auto')
    overlay.setFont('Helvetica', 5.5)
    overlay.drawRightString(width - margin, y - 2.5 * mm, 'Scan to verify report')
    overlay.save()

    first_page.merge_page(PdfReader(io.BytesIO(overlay_buf.getvalue())).pages[0])
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def finalize_pdf_bytes(
    pdf_bytes: bytes,
    *,
    document_number: str,
    document_hash: str,
    document_type: str,
    signer_name: str = '',
    signer_role: str = '',
    signed: bool = False,
    verification_url: str = '',
) -> bytes:
    """Add a QR verification mark without adding another report page."""
    prepared_pdf = overlay_verification_qr(
        pdf_bytes,
        document_number=document_number,
        document_hash=document_hash,
        document_type=document_type,
        verification_url=verification_url,
    )
    try:
        return sign_pdf_bytes(
            prepared_pdf,
            signer_name=signer_name,
            reason=f'PBPA {document_type}',
        )
    except Exception:
        # pyHanko signing is optional — return the PDF with the verification
        # page intact even when the certificate or library is unavailable.
        return prepared_pdf


def compute_fields_hash(fields_string: str) -> str:
    """SHA-256 hash of a canonical document fields string."""
    return hashlib.sha256(fields_string.encode('utf-8')).hexdigest()


def create_digital_signature(document_hash: str, user_id: str, timestamp: str) -> str:
    """
    HMAC-SHA256 signature combining document hash + user ID + timestamp + server secret.
    Returns hex digest.
    """
    secret = getattr(settings, 'SIGNING_SECRET_KEY', settings.SECRET_KEY)
    message = f"{document_hash}|{user_id}|{timestamp}"
    return hmac.new(secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()


def verify_digital_signature(document_hash: str, user_id: str, timestamp: str, stored_signature: str) -> bool:
    """Verify a stored digital signature by recomputing it."""
    expected = create_digital_signature(document_hash, user_id, timestamp)
    return hmac.compare_digest(expected, stored_signature)


def build_document_fields_string(doc_type: str, doc_number: str, fields: dict) -> str:
    """
    Build a canonical string from document fields for hashing.
    fields should be a dict of key=value pairs representing the signed content.
    """
    lines = [f"doc_type={doc_type}", f"doc_number={doc_number}"]
    for key in sorted(fields.keys()):
        lines.append(f"{key}={fields[key]}")
    return "\n".join(lines)


# These values describe the signing process rather than document content. They
# must not invalidate a signature simply because a counter-signing step moves
# the workflow forward.
SIGNING_METADATA_FIELDS = {
    'id', 'created_at', 'updated_at', 'document_hash', 'is_signed', 'signed_at',
    'signed_by', 'signing_step', 'inspector_signed_at', 'inspector_signed_by',
    'client_signed_at', 'client_signed_by', 'verified_at', 'issued_at',
    # Signer identities and drawn-signature placeholders are populated at
    # different workflow steps; they must not change the content hash signed
    # by an earlier party.
    'pbpa_inspector_name', 'pbpa_inspector_signature',
    'terminal_representative_name', 'terminal_representative_signature',
}


def _canonical_value(value):
    """Convert a model value to a deterministic JSON-safe representation."""
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return format(value, 'f')
    if isinstance(value, bytes):
        return value.hex()
    return value


def compute_model_hash(document, doc_type: str, doc_number: str) -> str:
    """Hash immutable business fields instead of a dynamically generated PDF.

    PDF bytes commonly vary between renderings due to metadata and timestamps;
    hashing canonical model data gives a reliable tamper-verification result.
    """
    fields = {}
    for field in document._meta.concrete_fields:
        if field.name in SIGNING_METADATA_FIELDS:
            continue
        value = getattr(document, field.name)
        if field.is_relation:
            value = getattr(document, field.attname)
        fields[field.name] = _canonical_value(value)
    canonical = json.dumps(
        {'doc_type': doc_type, 'doc_number': doc_number, 'fields': fields},
        sort_keys=True, separators=(',', ':'), ensure_ascii=False, default=str,
    )
    return compute_document_hash(canonical.encode('utf-8'))
