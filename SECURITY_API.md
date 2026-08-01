# API Security Documentation

## Authentication

### JWT Token Flow

```text
+--------------------------------------------------------------+
|                    Authentication Flow                       |
+--------------------------------------------------------------+

1. LOGIN
   POST /api/auth/token/
   {
     "username": "inspector1",
     "password": "secure_password"
   }

   Response (200 OK):
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
   }

2. ACCESS PROTECTED ENDPOINTS
   GET /api/inspections/
   Headers: {
     "Authorization": "Bearer <access_token>",
     "Content-Type": "application/json"
   }

3. TOKEN REFRESH (before expiration)
   POST /api/auth/token/refresh/
   {
     "refresh": "<refresh_token>"
   }

   Response (200 OK):
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
   }

4. LOGOUT
   POST /api/auth/logout/
   Headers: {
     "Authorization": "Bearer <access_token>"
   }

   Note: Tokens are invalidated on the backend.
```

### Token Specifications

| Property | Value | Notes |
|----------|-------|-------|
| **Access Token Lifetime** | 15 minutes | Short-lived for security |
| **Refresh Token Lifetime** | 7 days | Longer but rotated |
| **Algorithm** | HS256 | HMAC SHA-256 |
| **Automatic Rotation** | Enabled | Old tokens invalidated |
| **Token Blacklisting** | Enabled | Prevents token reuse |

### Rate Limiting on Auth Endpoints

```text
Login endpoint: 5 attempts per minute per IP
Registration: 3 attempts per hour per IP
Token refresh: 10 attempts per minute per IP
```

**Response when rate limit exceeded (429):**

```json
{
  "detail": "Request was throttled. Expected available in 12 seconds."
}
```

---

## Authorization

### Role-Based Access Control

#### Inspector Role

```text
Permissions:
- Create inspections
- View own inspections
- Submit inspections for approval
- View reports (own only)
- Cannot approve or reject inspections
- Cannot manage users

Example Request:
POST /api/inspections/
{
  "tank": 1,
  "dip_reading": 12.5,
  "temperature": 28.0,
  ...
}
```

#### Supervisor Role

```text
Permissions:
- View all inspections
- Approve or reject inspections
- View all reports
- Cannot create inspections
- Cannot modify inspections
- Cannot manage users, except view profiles

Example Request:
POST /api/inspections/1/approve/
{
  "approval_date": "2024-05-15T10:30:00Z"
}
```

#### Admin Role

```text
Permissions:
- Full system access
- User management: create, update, delete
- Role assignment
- System configuration
- View all logs
- Data export

Example Request:
POST /api/users/profile/
{
  "user": { "username": "newuser", "password": "secure" },
  "role": "inspector"
}
```

### Permission Checking

All endpoints check permissions:

```python
# Example from views
permission_classes = [IsAuthenticated, IsInspector]

# or

permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]
```

---

## Request/Response Security

### CSRF Protection

All `POST`, `PUT`, `PATCH`, and `DELETE` requests require a CSRF token when session authentication is used:

```python
# Django handles CSRF validation for unsafe methods.
# Include the X-CSRFToken header when using session authentication.

headers = {
    "Content-Type": "application/json",
    "X-CSRFToken": "csrftoken_value",
}
```

JWT bearer-token requests generally do not use CSRF protection because the token is sent in the `Authorization` header instead of a browser-managed cookie.

### Input Validation

All inputs are validated server-side:

```text
POST /api/inspections/

Validations:
- dip_reading: float, 0 <= value <= 100
- temperature: float, -50 <= value <= 150
- water_level: float, >= 0
- tank_id: valid tank reference
- All text fields: maximum length enforced, XSS patterns checked
```

### Response Sanitization

Sensitive information is removed from responses:

```json
{
  "id": 1,
  "tank": {
    "id": 1,
    "tank_name": "Tank A",
    "tank_id": "T001"
  },
  "inspector": {
    "id": 5,
    "first_name": "John",
    "last_name": "Doe"
  },
  "status": "draft",
  "created_at": "2024-05-15T10:30:00Z"
}
```

Passwords, tokens, and sensitive internal fields are never returned.

---

## API Endpoint Security

### Inspection Endpoints

#### List Inspections

```text
GET /api/inspections/
Authorization: Bearer <token>
Query Parameters:
  - tank_id: Filter by tank
  - status: Filter by status: draft, submitted, approved, rejected
  - inspector: Filter by inspector ID
  - page: Pagination, 20 items per page

Response: 200 OK
{
  "count": 45,
  "next": "http://api/inspections/?page=2",
  "previous": null,
  "results": [...]
}
```

#### Create Inspection

```text
POST /api/inspections/
Authorization: Bearer <token>
Permission: IsInspector

Request Body:
{
  "tank": 1,
  "dip_reading": 12.5,
  "temperature": 28.0,
  "water_level": 0.3,
  ...
}

Response: 201 Created
{
  "id": 1,
  "status": "draft",
  ...
}

Errors:
- 400: Invalid data
- 401: Unauthorized
- 403: Permission denied
```

#### Submit Inspection

```text
POST /api/inspections/1/submit/
Authorization: Bearer <token>
Permission: IsInspector, owner only

Response: 200 OK
{
  "id": 1,
  "status": "submitted",
  "submission_date": "2024-05-15T10:30:00Z"
}

Errors:
- 400: Cannot submit: already submitted or invalid state
- 403: Not owner or not inspector
- 404: Inspection not found
```

#### Approve Inspection

```text
POST /api/inspections/1/approve/
Authorization: Bearer <token>
Permission: IsSupervisor or IsAdmin

Response: 200 OK
{
  "id": 1,
  "status": "approved",
  "approval_date": "2024-05-15T14:30:00Z"
}

Errors:
- 400: Cannot approve: already approved or invalid state
- 403: Supervisor/Admin only
```

#### Reject Inspection

```text
POST /api/inspections/1/reject/
Authorization: Bearer <token>
Permission: IsSupervisor or IsAdmin

Request Body:
{
  "rejection_reason": "Dip reading appears incorrect"
}

Response: 200 OK
{
  "id": 1,
  "status": "rejected",
  "rejection_reason": "Dip reading appears incorrect"
}
```

---

## Common Security Issues and Solutions

### Issue: Token Exposure

**Problem**: Token stored in `localStorage`, which is vulnerable to XSS.

**Solution**:

```javascript
// Avoid persistent token storage.
localStorage.setItem("token", accessToken);

// Prefer shorter-lived storage when using browser storage.
sessionStorage.setItem("access_token", accessToken);
```

For stronger protection, use short-lived access tokens and rotate refresh tokens. If refresh tokens are stored in cookies, make them `HttpOnly`, `Secure`, and `SameSite=Lax` or stricter.

### Issue: Missing CORS Headers

**Problem**: Browser blocks cross-origin requests.

**Solution**: Verify CORS configuration.

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",  # Production
    "http://localhost:3000",    # Development
]
```

### Issue: Rate Limit Bypass

**Problem**: Attacker uses multiple IP addresses to bypass rate limiting.

**Solution**: Implement additional protections.

```python
# Monitor for suspicious patterns.
# Implement IP reputation checking.
# Use CDN DDoS protection such as Cloudflare or AWS Shield.
```

### Issue: SQL Injection

**Problem**: Malicious SQL in user input.

**Solution**: Use Django ORM parameterization and avoid raw string interpolation.

```python
# Vulnerable
Inspection.objects.raw(f"SELECT * FROM inspections_inspection WHERE id = {inspection_id}")

# Safe
Inspection.objects.get(id=inspection_id)
```

### Issue: XSS Attack

**Problem**: Malicious JavaScript in user input.

**Solution**: Sanitize input and escape output.

```python
# Input validation
from inspections.validators import sanitize_input

clean_input = sanitize_input(user_input, field_type="text")

# Django templates auto-escape variables by default:
# {{ user_input }}
```

---

## Monitoring and Logging

### Security Events Logged

```text
- All authentication attempts: success and failure
- Authorization failures: 403 errors
- Rate limit violations
- Invalid input detected
- Data modification operations
- Error conditions
- Suspicious patterns
```

### Viewing Security Logs

```bash
# Real-time security events
tail -f logs/security.log

# Search for specific user
grep "username" logs/security.log

# Search for errors
grep -i "error\|warning" logs/security.log

# JSON parsing for structured queries
grep '"action": "create"' logs/audit.log | jq ".user_id"
```

### Alert Thresholds

```text
WARNING, logged as warning:
- Failed login attempts: 3+ per minute from same IP
- API errors: 5+ per minute
- Rate limit violations: 2+ per minute

CRITICAL, logged as error:
- SQL injection attempt detected
- XSS pattern detected
- Token tampering detected
- Unauthorized admin access
```

---

## Testing API Security

### Test Rate Limiting

```bash
# Test login rate limit. This should fail after 5 attempts in 1 minute.
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/auth/token/ \
    -H "Content-Type: application/json" \
    -d '{"username":"user","password":"pass"}'
  echo "Attempt $i"
  sleep 5
done
```

### Test CSRF Protection

```bash
# This should fail without CSRF token when session authentication is used.
curl -X POST http://localhost:8000/api/inspections/ \
  -H "Content-Type: application/json" \
  -d '{"tank": 1}' \
  -b cookies.txt \
  -c cookies.txt

# Response: 403 Forbidden, CSRF token required
```

### Test Token Expiration

```bash
# 1. Get access token.
TOKEN=$(curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' | jq -r ".access")

# 2. Immediate request should work.
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/inspections/

# 3. Wait 15+ minutes and retry. This should fail with 401.
sleep 900
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/inspections/

# Response: 401 Unauthorized
```

### Test Role-Based Access

```bash
# Inspector trying to approve should fail.
curl -X POST http://localhost:8000/api/inspections/1/approve/ \
  -H "Authorization: Bearer $INSPECTOR_TOKEN" \
  -H "Content-Type: application/json"

# Response: 403 Forbidden

# Supervisor approving should work.
curl -X POST http://localhost:8000/api/inspections/1/approve/ \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json"

# Response: 200 OK
```

---

## Security Headers Verification

### Expected Headers

```bash
curl -I https://your-domain.com/api/

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Content-Security-Policy: default-src 'self'; ...
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## Related Documentation

- [Main Security Guide](./SECURITY.md)
- [Deployment Checklist](./DEPLOYMENT_SECURITY_CHECKLIST.md)
- [Django Security Documentation](https://docs.djangoproject.com/en/4.2/topics/security/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

**Last Updated**: May 2026
**Version**: 1.0
