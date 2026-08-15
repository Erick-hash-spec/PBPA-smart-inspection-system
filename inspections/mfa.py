"""RFC 6238 TOTP helpers for authenticator-app MFA."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote
from typing import Optional


def generate_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode('ascii').rstrip('=')


def provisioning_uri(secret: str, username: str, issuer: str = 'PBPA Smart Reporting') -> str:
    label = quote(f'{issuer}:{username}')
    return f'otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30'


def _code(secret: str, timestamp: float) -> str:
    normalized = secret.strip().replace(' ', '').upper()
    key = base64.b32decode(normalized + '=' * (-len(normalized) % 8), casefold=True)
    digest = hmac.new(key, struct.pack('>Q', int(timestamp // 30)), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = (struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7fffffff) % 1_000_000
    return f'{value:06d}'


def verify_code(secret: str, code: str, *, at_time: Optional[float] = None, valid_window: int = 1) -> bool:
    if not secret or not isinstance(code, str) or not code.isdigit() or len(code) != 6:
        return False
    now = time.time() if at_time is None else at_time
    try:
        return any(hmac.compare_digest(_code(secret, now + step * 30), code) for step in range(-valid_window, valid_window + 1))
    except (ValueError, struct.error):
        return False
