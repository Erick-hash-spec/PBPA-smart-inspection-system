from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import datetime, os

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COUNTRY_NAME, 'TZ'),
    x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, 'Dar es Salaam'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'PBPA Smart Reporting System'),
    x509.NameAttribute(NameOID.COMMON_NAME, 'PBPA Document Signer'),
])
cert = (
    x509.CertificateBuilder()
    .subject_name(subject)
    .issuer_name(issuer)
    .public_key(key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.utcnow())
    .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=3650))
    .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
    .sign(key, hashes.SHA256())
)
os.makedirs('certs', exist_ok=True)
with open('certs/key.pem', 'wb') as f:
    f.write(key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))
with open('certs/cert.pem', 'wb') as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

print('Certificate generated: certs/cert.pem')
print('Private key generated: certs/key.pem')
print('Valid for 10 years')
