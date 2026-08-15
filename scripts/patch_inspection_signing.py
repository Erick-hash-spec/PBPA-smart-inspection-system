import sys

path = r'd:\SMART REPORTING SYSTEM\SMART REPORTING SYSTEM\SMART REPORTING SYSTEM\backend\inspections\models.py'
content = open(path, 'rb').read()

old = (
    b'    # Status tracking\r\n'
    b"    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')\r\n"
    b'    inspection_date = models.DateTimeField(default=timezone.now)\r\n'
    b'    approval_date = models.DateTimeField(null=True, blank=True)\r\n'
    b'    rejection_reason = EncryptedTextField(blank=True)\n'
    b'    \r\n'
    b'    # Metadata\r\n'
    b'    created_at = models.DateTimeField(auto_now_add=True)\r\n'
    b'    updated_at = models.DateTimeField(auto_now=True)\r\n'
)

new = (
    b'    # Status tracking\r\n'
    b"    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')\r\n"
    b'    inspection_date = models.DateTimeField(default=timezone.now)\r\n'
    b'    approval_date = models.DateTimeField(null=True, blank=True)\r\n'
    b'    rejection_reason = EncryptedTextField(blank=True)\n'
    b'\r\n'
    b'    # -- Digital signature fields --\r\n'
    b'    is_signed     = models.BooleanField(default=False)\r\n'
    b'    signed_at     = models.DateTimeField(null=True, blank=True)\r\n'
    b"    signed_by     = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_inspections')\r\n"
    b'    document_hash = models.CharField(max_length=64, blank=True)\r\n'
    b'    # -- Multi-party signing workflow --\r\n'
    b'    SIGNING_STEP_CHOICES = (\r\n'
    b"        ('draft',             'Draft'),\r\n"
    b"        ('inspector_signed',  'Inspector Signed'),\r\n"
    b"        ('sent_to_client',    'Sent to Terminal Rep'),\r\n"
    b"        ('client_signed',     'Terminal Rep Signed'),\r\n"
    b"        ('sent_to_inspector', 'Sent Back to Inspector'),\r\n"
    b"        ('verified',          'Inspector Verified'),\r\n"
    b"        ('submitted',         'Submitted to Admin'),\r\n"
    b'    )\r\n'
    b"    signing_step        = models.CharField(max_length=20, choices=SIGNING_STEP_CHOICES, default='draft')\r\n"
    b'    inspector_signed_at = models.DateTimeField(null=True, blank=True)\r\n'
    b"    inspector_signed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='dip_inspector_signed')\r\n"
    b'    client_signed_at    = models.DateTimeField(null=True, blank=True)\r\n'
    b"    client_signed_by    = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='dip_client_signed')\r\n"
    b'    verified_at         = models.DateTimeField(null=True, blank=True)\r\n'
    b'\r\n'
    b'    # Metadata\r\n'
    b'    created_at = models.DateTimeField(auto_now_add=True)\r\n'
    b'    updated_at = models.DateTimeField(auto_now=True)\r\n'
)

if old not in content:
    sys.stdout.write('ERROR: old block not found\n')
    sys.exit(1)

new_content = content.replace(old, new, 1)
open(path, 'wb').write(new_content)
sys.stdout.write('OK: signing fields added to Inspection model\n')
