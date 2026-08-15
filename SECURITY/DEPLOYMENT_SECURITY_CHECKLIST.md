# 🚀 Production Deployment Security Checklist

## Pre-Deployment Security Review

### Configuration Management ✅

- [ ] **Secret Key Generation**
  ```bash
  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
  - Minimum 50 characters
  - No predictable patterns
  - Rotate on key compromise

- [ ] **Environment Variables**
  - [ ] Copy `.env.production` template
  - [ ] Set all required variables
  - [ ] Remove `.env` from version control
  - [ ] Use strong database password (16+ chars, mixed case, numbers, symbols)
  - [ ] Set unique Redis password
  - [ ] Configure email credentials safely

- [ ] **Database Configuration**
  - [ ] PostgreSQL 12+ installed
  - [ ] Separate database user created with limited permissions
  - [ ] SSL/TLS connections enabled
  - [ ] Automated backups configured
  - [ ] Connection pooling configured (recommended: 10-20 connections)

- [ ] **.env File Security**
  ```bash
  # Ensure .env is not in git
  echo ".env" >> .gitignore
  echo ".env.*" >> .gitignore
  
  # Restrict file permissions
  chmod 600 .env
  chmod 600 .env.production
  ```

### Network Security ✅

- [ ] **SSL/TLS Certificates**
  - [ ] Valid certificate obtained (Let's Encrypt recommended)
  - [ ] Certificate authority (CA) recognized
  - [ ] Certificate covers all domains (SAN configured)
  - [ ] Auto-renewal enabled
  - [ ] Certificate chain properly installed

- [ ] **Firewall Configuration**
  - [ ] Port 80 (HTTP) → 443 (HTTPS) redirect configured
  - [ ] Port 8000 (Django) restricted to internal only (not exposed)
  - [ ] Only necessary ports open
  - [ ] DDoS protection configured (if available)

- [ ] **Domain Configuration**
  - [ ] DNS CNAME/A records pointing to application
  - [ ] HSTS header preload list submitted (optional but recommended)
  - [ ] CAA DNS records configured (optional)
  - [ ] SPF/DKIM/DMARC configured for email

- [ ] **Load Balancer / Reverse Proxy**
  - [ ] HTTPS configured
  - [ ] X-Forwarded-For header trusted
  - [ ] Health checks configured
  - [ ] Session persistence enabled (if required)

### Application Security ✅

- [ ] **Django Settings Review**
  - [ ] `DEBUG = False`
  - [ ] `SECURE_SSL_REDIRECT = True`
  - [ ] `SESSION_COOKIE_SECURE = True`
  - [ ] `CSRF_COOKIE_SECURE = True`
  - [ ] `SECURE_HSTS_SECONDS` set to 31536000 (1 year)
  - [ ] `ALLOWED_HOSTS` configured with production domain only
  - [ ] `CSRF_TRUSTED_ORIGINS` configured correctly

- [ ] **Dependency Vulnerability Scan**
  ```bash
  pip install safety bandit
  safety check
  bandit -r backend/
  ```
  - [ ] No critical vulnerabilities found
  - [ ] All dependencies up-to-date
  - [ ] Security patches applied

- [ ] **CORS Configuration**
  - [ ] Only production frontend domain allowed
  - [ ] No wildcard origins
  - [ ] `CORS_ALLOW_CREDENTIALS = True` only if needed
  - [ ] Verify in browser dev tools

- [ ] **API Rate Limiting**
  - [ ] Configured in `settings.py`
  - [ ] Tested with multiple requests
  - [ ] Throttle rates appropriate for use case

### Database Security ✅

- [ ] **Database User Permissions**
  ```sql
  -- Minimal permissions example
  CREATE ROLE app_user WITH PASSWORD '<strong-password>' LOGIN;
  GRANT CONNECT ON DATABASE petroleum_db TO app_user;
  GRANT USAGE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  ```

- [ ] **Database Backup**
  - [ ] Automated backup script configured
  - [ ] Backup location secured
  - [ ] Backup encryption enabled (if sensitive)
  - [ ] Restore procedures tested
  - [ ] Retention policy defined (7-30 days minimum)

- [ ] **Database Monitoring**
  - [ ] Slow query logging enabled
  - [ ] Connection monitoring configured
  - [ ] Disk space monitoring set up
  - [ ] Error rate monitoring active

### File & Media Security ✅

- [ ] **Upload Directory**
  - [ ] Located outside web root
  - [ ] Appropriate permissions (644 for files, 755 for directories)
  - [ ] Virus scanning configured (optional)
  - [ ] Old files cleaned up regularly

- [ ] **Static Files**
  - [ ] Collected with `python manage.py collectstatic`
  - [ ] Served via CDN or static file server (recommended)
  - [ ] Cache headers configured
  - [ ] Compression enabled (gzip)

### Logging & Monitoring ✅

- [ ] **Log Configuration**
  - [ ] Log files stored outside web root
  - [ ] Permissions: 640 (root:www-data)
  - [ ] Rotation configured (daily or 100MB)
  - [ ] Retention period: 30+ days
  - [ ] Logs shipped to external service (recommended)

- [ ] **Audit Logging**
  - [ ] All authentication events logged
  - [ ] All data modifications logged
  - [ ] User actions tied to user ID and timestamp
  - [ ] Failed operations logged with error details

- [ ] **Monitoring Alerts**
  - [ ] High error rate alerts configured
  - [ ] Unusual access pattern alerts
  - [ ] Database connectivity alerts
  - [ ] Disk space alerts (>80% threshold)
  - [ ] Security event alerts

### Container Security ✅

- [ ] **Docker Image Security**
  - [ ] Non-root user configured in Dockerfile
  - [ ] Minimal base image used (Alpine Linux)
  - [ ] Multi-stage builds for smaller images
  - [ ] No secrets in image layers

- [ ] **Docker Compose Security**
  - [ ] Environment variables from `.env` file
  - [ ] No hardcoded credentials
  - [ ] Network isolation configured
  - [ ] Resource limits set (CPU, Memory)
  - [ ] Restart policies configured
  - [ ] Health checks enabled

- [ ] **Registry Security**
  - [ ] Private registry used (if building custom images)
  - [ ] Image scanning enabled
  - [ ] Access control configured
  - [ ] Image signing configured (optional)

### User Management ✅

- [ ] **Admin User**
  - [ ] Strong password set (16+ characters)
  - [ ] Unique username (not "admin")
  - [ ] Email verified
  - [ ] 2FA enabled (if available)

- [ ] **Initial User Setup**
  ```bash
  docker-compose exec backend python manage.py createsuperuser
  ```

- [ ] **Access Control**
  - [ ] Default users disabled/removed
  - [ ] Admin panel protected
  - [ ] Only necessary staff users created
  - [ ] Permissions reviewed for each user

---

## Deployment Steps

### 1. Pre-Deployment Tasks

```bash
# 1. Clone repository
git clone <repository-url>
cd "SMART REPORTING SYSTEM"

# 2. Setup environment
cp .env.production .env
# Edit .env with production values

# 3. Build images
docker-compose build --no-cache

# 4. Review configuration
cat .env  # Verify all values

# 5. Backup existing database (if migration)
docker-compose exec db pg_dump -U postgres petroleum_db > backup_pre_deploy.sql
```

### 2. Run Migrations

```bash
# Apply database migrations
docker-compose run --rm backend python manage.py migrate

# Verify migration success
docker-compose run --rm backend python manage.py showmigrations
```

### 3. Initialize Application

```bash
# Create superuser
docker-compose run --rm backend python manage.py createsuperuser

# Load initial data (if needed)
docker-compose run --rm backend python manage.py loaddata initial_data.json

# Collect static files
docker-compose run --rm backend python manage.py collectstatic --noinput
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs --tail=50 backend
```

### 5. Verify Deployment

```bash
# Test API endpoint
curl -s https://your-domain.com/api/ | jq

# Test health check
curl -I https://your-domain.com/api/

# Verify SSL certificate
curl -vI https://your-domain.com/api/ 2>&1 | grep -i "certificate"

# Check database connection
docker-compose exec backend python manage.py dbshell

# Verify static files
curl -I https://your-domain.com/static/admin/css/base.css
```

---

## Post-Deployment Tasks

### Immediate (Within 24 hours)

- [ ] **Monitor logs for errors**
  ```bash
  docker-compose logs -f backend
  docker-compose logs -f frontend
  docker-compose logs -f db
  ```

- [ ] **Test critical workflows**
  - [ ] User login
  - [ ] Create inspection
  - [ ] Submit inspection
  - [ ] Approve inspection
  - [ ] Generate report

- [ ] **Security verification**
  - [ ] Test HTTPS enforcement
  - [ ] Verify security headers present
  - [ ] Test rate limiting
  - [ ] Verify logs being recorded

- [ ] **Performance check**
  - [ ] Response times normal
  - [ ] Database queries optimized
  - [ ] Memory usage stable
  - [ ] CPU usage acceptable

### Daily

- [ ] **Review security logs**
  ```bash
  docker-compose exec backend tail -50 logs/security.log
  ```

- [ ] **Check system resources**
  ```bash
  docker stats
  ```

- [ ] **Verify backups completed**
  ```bash
  ls -la /path/to/backups/
  ```

### Weekly

- [ ] **Security patch check**
  ```bash
  pip list --outdated
  ```

- [ ] **Database integrity check**
  ```bash
  docker-compose exec db reindex
  ```

- [ ] **Audit log review**
  ```bash
  docker-compose exec backend tail -100 logs/audit.log
  ```

### Monthly

- [ ] **Full security audit**
  - Run vulnerability scan
  - Review user access
  - Check backup integrity

- [ ] **Performance analysis**
  - Review slow query logs
  - Analyze error rates
  - Check resource usage trends

- [ ] **Dependency updates**
  - Check for updates
  - Test in staging
  - Deploy to production

---

## Rollback Procedures

### If Deployment Fails

```bash
# Stop services
docker-compose down

# Restore from backup
docker-compose exec db psql -U postgres -d petroleum_db < backup_pre_deploy.sql

# Restart with previous version
docker-compose up -d
```

---

## Security Maintenance

### Monthly Tasks

- [ ] Review user access logs
- [ ] Audit permissions
- [ ] Check certificate expiration
- [ ] Review firewall rules

### Quarterly Tasks

- [ ] Full security audit
- [ ] Penetration testing (recommended)
- [ ] Disaster recovery drill
- [ ] Update security policies

### Annually

- [ ] Comprehensive security review
- [ ] Third-party security assessment
- [ ] Update incident response procedures
- [ ] Compliance audit (if required)

---

**Deployment Status**: Ready for Production ✅
**Last Updated**: May 2026
**Version**: 1.0
