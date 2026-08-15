"""AES-256-GCM encryption helpers for sensitive data stored by PBPA."""

import base64
import binascii
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import models

PREFIX = "aes256gcm:v1:"
NONCE_SIZE = 12


def _key() -> bytes:
    """Return the configured 32-byte AES key without ever logging it."""
    encoded_key = getattr(settings, "AES_256_GCM_KEY", "")
    if not encoded_key:
        raise ImproperlyConfigured("AES_256_GCM_KEY must be configured to encrypt sensitive data.")
    try:
        key = base64.urlsafe_b64decode(encoded_key + "=" * (-len(encoded_key) % 4))
    except (ValueError, binascii.Error) as exc:
        raise ImproperlyConfigured("AES_256_GCM_KEY must be base64url-encoded.") from exc
    if len(key) != 32:
        raise ImproperlyConfigured("AES_256_GCM_KEY must decode to exactly 32 bytes.")
    return key


def encrypt(plaintext: str, *, associated_data: bytes | None = None) -> str:
    """Encrypt text with AES-256-GCM and return a safe, versioned value."""
    if plaintext is None:
        return plaintext
    if not isinstance(plaintext, str):
        raise TypeError("AES encryption accepts text values only.")
    nonce = os.urandom(NONCE_SIZE)
    encrypted = AESGCM(_key()).encrypt(nonce, plaintext.encode("utf-8"), associated_data)
    return PREFIX + base64.urlsafe_b64encode(nonce + encrypted).decode("ascii")


def decrypt(value: str, *, associated_data: bytes | None = None) -> str:
    """Decrypt a value created by :func:`encrypt`.

    Non-prefixed values are legacy plaintext so an existing database can be
    migrated safely; subsequent saves write encrypted values.
    """
    if value is None or value == "" or not isinstance(value, str):
        return value
    if not value.startswith(PREFIX):
        return value
    try:
        token = value[len(PREFIX):]
        payload = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))
        if len(payload) <= NONCE_SIZE:
            raise ValueError("ciphertext is too short")
        return AESGCM(_key()).decrypt(payload[:NONCE_SIZE], payload[NONCE_SIZE:], associated_data).decode("utf-8")
    except (ValueError, binascii.Error, InvalidTag, UnicodeDecodeError) as exc:
        raise ValidationError("Encrypted data could not be authenticated. It may have been modified.") from exc


class EncryptedTextField(models.TextField):
    """Django field that transparently stores text encrypted with AES-256-GCM."""

    description = "AES-256-GCM encrypted text"

    def from_db_value(self, value, expression, connection):
        return decrypt(value) if value is not None else value

    def to_python(self, value):
        return value if value is None else str(value)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None or value == "" or value.startswith(PREFIX):
            return value
        return encrypt(value)
