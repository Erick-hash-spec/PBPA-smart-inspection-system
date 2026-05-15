"""
PBPA Digital Signature Module
==============================
Signs PDF documents using pyHanko with a self-signed X.509 certificate.

Workflow:
  1. Generate PDF (via reportlab / existing PDF bytes)
  2. Call sign_pdf_bytes(pdf_bytes, signer_name, reason) → signed PDF bytes
  3. Store signed PDF, lock document

The signed PDF will show a valid cryptographic signature in Adobe Acrobat
and other PDF viewers, proving:
  - Document has NOT been altered since signing
  - Signed by PBPA system with known certificate
"""

import os
import io
import hashlib
import datetime
from pathlib import Path

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
