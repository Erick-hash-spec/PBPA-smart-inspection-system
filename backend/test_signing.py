import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()

# Step 1: generate a minimal PDF with reportlab
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=letter)
c.setFont('Helvetica-Bold', 14)
c.drawString(100, 700, 'PBPA TEST DOCUMENT')
c.drawString(100, 680, 'This is a test for digital signing.')
c.save()
pdf_bytes = buf.getvalue()
print(f'PDF generated: {len(pdf_bytes)} bytes')

# Step 2: try signing
try:
    from inspections.signing import sign_pdf_bytes, get_signature_info
    print('Cert info:', get_signature_info())
    signed = sign_pdf_bytes(pdf_bytes, signer_name='Test Inspector', reason='Test signing')
    print(f'Signed PDF: {len(signed)} bytes - SUCCESS')
    with open('test_signed.pdf', 'wb') as f:
        f.write(signed)
    print('Saved to test_signed.pdf')
except Exception as e:
    import traceback
    print('ERROR:', e)
    traceback.print_exc()
