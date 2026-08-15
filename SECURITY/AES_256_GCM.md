# AES-256-GCM encryption at rest

PBPA encrypts sensitive application data with AES-256-GCM. This provides both
confidentiality and integrity: a changed ciphertext fails authentication.

Set `AES_256_GCM_KEY` to a base64url-encoded random 32-byte value in every
production environment. Generate it once in a secure administrator session:

```bash
python -c "import base64, secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))"
```

Store the key only in the deployment secret manager/environment configuration;
never commit it, put it in a frontend build, or log it. Losing the key makes
encrypted records unrecoverable, so protect and back it up through the approved
key-management process. Development derives a local-only key from `SECRET_KEY`;
production refuses to start without an explicit encryption key.

`ServiceRequest.contact_phone` is now encrypted in the database. The migration
converts existing non-empty phone numbers. Encrypted values cannot be searched,
filtered, or used in uniqueness checks.
