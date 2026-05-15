# Smart Petroleum Reporting System - Deployment Guide

## 🚀 Production Deployment

### Option 1: Render Deployment

This repo includes a `render.yaml` Blueprint for the Django API, React static site, and Render PostgreSQL database.

#### Steps

1. **Put the project in Git and push it**
```bash
git init
git add .
git commit -m "Prepare Render deployment"
```

Push the repository to GitHub, GitLab, or Bitbucket.

2. **Create the Render Blueprint**
- In Render, open **Blueprints**.
- Click **New Blueprint Instance**.
- Select this repository.
- Apply the Blueprint.

3. **Open the generated services**
- Frontend: `https://smart-reporting-frontend.onrender.com`
- API: `https://smart-reporting-api.onrender.com`
- Admin: `https://smart-reporting-api.onrender.com/admin/`

Render may add a suffix if a service name is already taken, so use the actual URLs shown in your Render dashboard.

4. **Create the first admin user**
```bash
cd backend
python manage.py createsuperuser
```

Run that command in the Render Shell for the API service.

#### Manual Render Settings

If you deploy without the Blueprint:
- Backend build command: `bash build.sh`
- Backend start command: `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- Frontend build command: `cd frontend && npm ci && REACT_APP_API_URL=https://YOUR_API_HOST/api npm run build`
- Frontend publish directory: `frontend/build`
- Frontend rewrite rule: `/*` to `/index.html`

---

### Option 2: Docker Deployment

#### Prerequisites
- Docker
- Docker Compose
- 2GB RAM minimum
- 10GB storage

#### Steps

1. **Clone and prepare**
```bash
cd SMART\ REPORTING\ SYSTEM
```

2. **Configure environment**
Create `.env.production`:
```
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://postgres:INSPECTION@db:5432/petroleum_db
```

3. **Start services**
```bash
docker-compose -f docker-compose.yml up -d
```

4. **Create superuser**
```bash
docker-compose exec backend python manage.py createsuperuser
```

5. **Access application**
- Frontend: http://yourdomain.com
- Admin: http://yourdomain.com/admin/
- API: http://yourdomain.com/api/

---

### Option 3: Manual Server Deployment

#### System Requirements
- Ubuntu 20.04+ or similar
- Python 3.10+
- PostgreSQL 12+
- Nginx
- Supervisor or systemd

#### 1. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv postgresql nginx supervisor

# For PDF generation
sudo apt-get install -y wkhtmltopdf xvfb
```

#### 2. Setup Backend
```bash
# Clone project
git clone <repo> /opt/petroleum-system
cd /opt/petroleum-system/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r ../requirements.txt

# Configure database
sudo -u postgres createdb petroleum_db
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

#### 3. Configure Gunicorn

Create `/opt/petroleum-system/gunicorn.service`:
```ini
[Unit]
Description=Gunicorn daemon for Petroleum System
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/petroleum-system/backend
ExecStart=/opt/petroleum-system/backend/venv/bin/gunicorn \
  --workers 4 \
  --bind unix:/run/gunicorn.sock \
  config.wsgi:application
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Install service:
```bash
sudo cp gunicorn.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
sudo systemctl start gunicorn
```

#### 4. Configure Nginx

Create `/etc/nginx/sites-available/petroleum`:
```nginx
upstream gunicorn {
    server unix:/run/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 100M;

    location /static/ {
        alias /opt/petroleum-system/backend/staticfiles/;
    }

    location /media/ {
        alias /opt/petroleum-system/backend/media/;
    }

    location /api/ {
        proxy_pass http://gunicorn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://gunicorn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/petroleum /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Setup Frontend

```bash
cd /opt/petroleum-system/frontend
npm install
npm run build

# Copy to Nginx
sudo cp -r build/* /var/www/html/
```

#### 6. SSL/HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### Option 4: AWS Deployment

#### Using Elastic Beanstalk

1. **Install AWS CLI**
```bash
pip install awsebcli
```

2. **Initialize EB**
```bash
eb init -p python-3.11 petroleum-system
```

3. **Deploy**
```bash
eb create production-env
eb deploy
```

---

## 📊 Monitoring & Maintenance

### View Logs
```bash
# Docker
docker-compose logs -f backend

# Systemd
sudo journalctl -u gunicorn -f
```

### Database Backups
```bash
# Create backup
pg_dump petroleum_db > backup.sql

# Restore backup
psql petroleum_db < backup.sql
```

### Health Check
```bash
curl http://localhost:8000/api/users/profile/current_user/
```

---

## 🔒 Security Best Practices

1. **Change SECRET_KEY** in production
2. **Set DEBUG=False**
3. **Use HTTPS/SSL**
4. **Enable CSRF protection**
5. **Regular backups**
6. **Update dependencies** regularly
7. **Use strong passwords**
8. **Restrict database access**
9. **Monitor logs**
10. **Keep firewall enabled**

---

## 📈 Performance Optimization

### Database
- Add indexes on frequently queried fields
- Use connection pooling (PgBouncer)
- Regular VACUUM and ANALYZE

### Application
- Enable caching (Redis)
- Use CDN for static files
- Implement pagination
- Use async tasks (Celery)

### Server
- Use load balancing (Nginx)
- Enable gzip compression
- Optimize worker processes
- Monitor resource usage

---

## 🆘 Troubleshooting

### Database Connection Errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection
psql -U postgres -d petroleum_db
```

### Port Already in Use
```bash
# Find process using port
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R www-data:www-data /opt/petroleum-system
sudo chmod -R 755 /opt/petroleum-system
```

---

## 📞 Support

For issues or questions:
1. Check logs
2. Review documentation
3. Contact admin team
4. Submit issue report
