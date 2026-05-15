# Security Implementation Guide

## 📋 Overview

This document provides a comprehensive security overview of the SMART Reporting System. It covers security features, best practices, and deployment guidelines for production environments.

---

## 🔐 Security Architecture

### Authentication & Authorization

#### JWT Token-Based Authentication
- **Access Tokens**: 15-minute lifetime (short-lived)
- **Refresh Tokens**: 7-day lifetime with automatic rotation
- **Token Blacklisting**: Invalidated tokens are tracked to prevent replay attacks
- **Algorithm**: HMAC SHA-256 (HS256) with secure secret key

#### Role-Based Access Control (RBAC)
```
Inspector:   Create and submit inspections
Supervisor:  Approve/reject inspections, manage approvals
Admin:       System administration, user management
```

#### Session Security
- `SESSION_COOKIE_SECURE`: HTTPS-only in production
- `SESSION_COOKIE_HTTPONLY`: Inaccessible to JavaScript
- `SESSION_COOKIE_SAMESITE`: 'Strict' CSRF protection
- `SESSION_COOKIE_AGE`: 1 hour expiration

---

## 🛡️ Security Features Implemented

### Backend Security

#### 1. **Middleware Security**
- `SecurityAuditMiddleware`: Logs all security-relevant events
- `SecurityHeadersMiddleware`: Adds security HTTP headers
- `RateLimitMonitorMiddleware`: Tracks and logs rate limiting

#### 2. **HTTP Security Headers**
```
X-Content-Type-Options: nosniff           # Prevent MIME sniffing
X-Frame-Options: DENY                     # Prevent clickjacking
X-XSS-Protection: 1; mode=block          # Enable browser XSS protection
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: Comprehensive CSP policy
HSTS: 1 year with subdomains and preload
```

#### 3. **Rate Limiting**
- Anonymous users: 30 requests/minute
- Authenticated users: 300 requests/minute
- Login attempts: 5 requests/minute
- Registration: 3 requests/hour

#### 4. **Input Validation & Sanitization**
- All user inputs are validated and sanitized
- File uploads are validated for:
  - Size (max 2.5MB)
  - File type (extension and magic bytes)
  - Malicious content detection
- SQL injection prevention through ORM and parameterized queries
- XSS prevention through HTML escaping

#### 5. **Database Security**
- Parameterized queries (Django ORM prevents SQL injection)
- Connection pooling with health checks
- Automated backups (recommended)
- Environment variable for sensitive credentials

#### 6. **CORS & CSRF Protection**
- CORS limited to whitelisted origins
- No wildcard CORS allowed
- CSRF tokens enforced on state-changing operations
- Same-Site cookie policy

#### 7. **Logging & Monitoring**
- Security events logged to: `logs/security.log`
- Audit events logged to: `logs/audit.log`
- Error events logged to: `logs/error.log`
- Rotating log files (10MB max per file, 10 backups retained)
- JSON-formatted structured logging for analysis

#### 8. **Password Security**
- Minimum 12 characters
- Must include uppercase, lowercase, numbers
- No common passwords
- No user attribute similarity
- No numeric-only passwords

### Frontend Security

#### 1. **Content Security Policy (CSP)**
- Implemented via meta tags and server headers
- Restricts script sources to prevent inline code execution
- Limits external resource loading

#### 2. **Token Storage**
- Access tokens stored in `sessionStorage` (cleared on tab close)
- Refresh tokens stored securely
- No storage of sensitive data in `localStorage`

#### 3. **XSS Prevention**
- Input sanitization functions
- HTML entity encoding
- Input validation with pattern matching
- Secure string escaping

#### 4. **HTTPS Enforcement**
- All communication over HTTPS in production
- HSTS headers enforce HTTPS-only connections
- Mixed content blocked

#### 5. **Secure API Client**
- Request/response interceptors for token management
- Automatic token refresh on expiration
- Error handling without sensitive information leakage
- CSRF token inclusion in requests

---

## 🚀 Production Deployment Checklist

### Pre-Deployment ✅

- [ ] Generate strong SECRET_KEY (min 50 characters)
  ```bash
  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```

- [ ] Set all environment variables in `.env.production`
  ```bash
  # Critical variables:
  SECRET_KEY=<strong-random-value>
  DEBUG=false
  ALLOWED_HOSTS=your-domain.com
  DATABASE_URL=postgresql://user:password@host/db
  POSTGRES_PASSWORD=<strong-password>
  REDIS_PASSWORD=<strong-password>
  ```

- [ ] Database setup
  ```bash
  # Create separate database user with limited permissions
  # Only grant SELECT, INSERT, UPDATE, DELETE on application tables
  ```

- [ ] SSL/TLS Certificates
  - Use Let's Encrypt for free certificates
  - Auto-renewal configured
  - HSTS preload list submission

- [ ] CORS Configuration
  - Update `CORS_ALLOWED_ORIGINS` with production domains only
  - No wildcard origins

- [ ] Rate Limiting
  - Configured in `settings.py`
  - Monitor logs for abuse patterns

### Deployment Steps 🚀

1. **Update Environment Variables**
   ```bash
   cp .env.production .env
   # Edit .env with production values
   ```

2. **Build Docker Images**
   ```bash
   docker-compose build --no-cache
   ```

3. **Run Migrations**
   ```bash
   docker-compose run backend python manage.py migrate
   ```

4. **Create Superuser**
   ```bash
   docker-compose run backend python manage.py createsuperuser
   ```

5. **Start Services**
   ```bash
   docker-compose up -d
   ```

6. **Verify Deployment**
   ```bash
   # Check health endpoints
   curl https://your-domain.com/api/
   # Verify SSL certificate
   curl -vI https://your-domain.com/api/
   ```

### Post-Deployment ✅

- [ ] Monitor security logs
  ```bash
  docker-compose logs -f backend | grep -i security
  ```

- [ ] Test rate limiting
  - Make multiple requests and verify throttling

- [ ] Verify HTTPS
  - No mixed content warnings
  - Valid certificate

- [ ] Database backups
  - Automated backups configured
  - Test restore procedures

- [ ] Log rotation
  - Configure logrotate for production logs
  - Archive old logs

- [ ] Regular updates
  - Subscribe to security advisories
  - Update dependencies regularly

---

## 📝 Security Best Practices

### Development

1. **Never commit secrets**
   ```bash
   # .gitignore should include
   .env
   .env.*
   *.key
   *.pem
   ```

2. **Use local development environment**
   ```bash
   # Use .env.development
   source .env.development
   python manage.py runserver
   ```

3. **Test security features**
   ```bash
   # Test rate limiting
   for i in {1..50}; do curl http://localhost:8000/api/; done
   
   # Test CSRF protection
   curl -X POST http://localhost:8000/api/inspections/ -d {}
   ```

### Production

1. **Regular security audits**
   ```bash
   # Check for vulnerabilities
   pip install safety
   safety check
   
   # Security scanning
   pip install bandit
   bandit -r backend/
   ```

2. **Monitor security logs**
   ```bash
   # Check for unauthorized access attempts
   tail -f logs/security.log | grep -i "warning\|error"
   ```

3. **Database backups**
   ```bash
   # Automated daily backups
   docker-compose exec db pg_dump -U postgres petroleum_db > backup_$(date +%Y%m%d).sql
   ```

4. **Keep dependencies updated**
   ```bash
   # Check for outdated packages
   pip list --outdated
   
   # Update packages safely
   pip install --upgrade package_name
   ```

---

## 🔍 Security Audit Trail

### Logged Events

#### Authentication Events
- Login attempts (successful and failed)
- Token refresh
- Logout
- Session creation/destruction

#### Authorization Events
- Permission denied (403)
- Unauthorized access (401)
- Admin actions

#### Data Modification Events
- Create operations
- Update operations
- Delete operations
- Who made the change (user ID, timestamp)

#### Security Events
- Rate limit violations
- Suspicious patterns detected
- File upload attempts
- API errors

### Viewing Logs

```bash
# Real-time security logs
docker-compose logs -f backend | grep security

# View audit trail
docker-compose exec backend tail -f logs/audit.log

# Search for specific events
docker-compose exec backend grep "INSERT\|UPDATE\|DELETE" logs/audit.log

# View error logs
docker-compose exec backend tail -f logs/error.log
```

---

## 🆘 Incident Response

### Security Incident Detected

1. **Isolate the system**
   ```bash
   docker-compose down
   ```

2. **Collect evidence**
   ```bash
   # Preserve logs
   cp logs/* incident_$(date +%Y%m%d_%H%M%S)/
   
   # Database snapshot
   docker-compose exec db pg_dump -U postgres petroleum_db > incident_snapshot.sql
   ```

3. **Investigate root cause**
   - Review security logs
   - Check for unauthorized access
   - Verify data integrity

4. **Patch vulnerability**
   - Update affected dependencies
   - Fix code vulnerability
   - Deploy patch

5. **Restore service**
   ```bash
   docker-compose up -d
   ```

6. **Post-incident review**
   - Document incident details
   - Update security procedures
   - Communicate changes to team

---

## 📚 Security References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security Documentation](https://docs.djangoproject.com/en/4.2/topics/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

---

## 📞 Support & Reporting

For security vulnerabilities or concerns:

1. **Do not** create public issues
2. Contact security team immediately
3. Provide detailed reproduction steps
4. Include affected versions and components

---

**Last Updated**: May 2026
**Version**: 1.0
**Status**: Production Ready ✅
