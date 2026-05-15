# Smart Petroleum Reporting System

A comprehensive web-based inspection and reporting platform for petroleum storage facilities.

## 🎯 Overview

This system digitizes petroleum tank inspection processes, replacing manual paperwork with:
- Real-time inspection data capture
- Automatic calculations (volumes, temperature corrections)
- Digital report generation
- Supervisor approval workflow
- Historical tracking and analytics

---

## 📋 Project Structure

```
SMART REPORTING SYSTEM/
├── backend/                    # Django REST API
│   ├── config/                 # Django settings & WSGI
│   ├── inspections/            # Main app
│   │   ├── models.py           # Database models
│   │   ├── serializers.py      # DRF serializers
│   │   ├── views.py            # ViewSets & endpoints
│   │   ├── urls.py             # URL routing
│   │   ├── permissions.py      # Custom permissions
│   │   ├── calculations.py     # Calculation engine
│   │   └── admin.py            # Django admin config
│   └── manage.py               # Django CLI
├── frontend/                   # React UI
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client
│   │   └── App.js
│   └── package.json
├── requirements.txt            # Python dependencies
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL 12+
- Git

### Step 1: Setup Backend

#### 1.1 Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows
```

#### 1.2 Install Dependencies
```bash
pip install -r ../requirements.txt
```

#### 1.3 Setup PostgreSQL Database

```bash
# Create database
createdb petroleum_db

# Or using psql
psql -U postgres
CREATE DATABASE petroleum_db;
```

#### 1.4 Run Migrations
```bash
python manage.py migrate
```

#### 1.5 Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

#### 1.6 Load Initial Data (Optional)
```bash
python manage.py loaddata initial_tanks.json
```

#### 1.7 Run Development Server
```bash
python manage.py runserver
```

Server will be available at: http://localhost:8000

---

### Step 2: Setup Frontend

#### 2.1 Navigate to Frontend
```bash
cd frontend
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Create Environment File
Create `.env` file:
```
REACT_APP_API_URL=http://localhost:8000/api
```

#### 2.4 Start Development Server
```bash
npm start
```

App will be available at: http://localhost:3000

---

## 📚 API Documentation

### Authentication

#### Login
```bash
POST /api/auth/token/
Content-Type: application/json

{
  "username": "inspector1",
  "password": "password123"
}
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

Use the `access` token in headers:
```
Authorization: Bearer {access_token}
```

#### Register
```bash
POST /api/auth/register/
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepass123",
  "confirm_password": "securepass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

---

### Tanks

#### List Tanks
```bash
GET /api/tanks/
Authorization: Bearer {access_token}
```

#### Get Tank Details
```bash
GET /api/tanks/{id}/
Authorization: Bearer {access_token}
```

#### Get Tank Inspection History
```bash
GET /api/tanks/{id}/inspection_history/
Authorization: Bearer {access_token}
```

---

### Inspections

#### Create Inspection
```bash
POST /api/inspections/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "tank": 1,
  "dip_reading": 12.5,
  "temperature": 28.5,
  "water_level": 0.3,
  "observations": "Tank appears normal",
  "tank_condition": "Good",
  "inspection_date": "2024-04-30T10:30:00Z"
}
```

#### List Inspections
```bash
GET /api/inspections/
Authorization: Bearer {access_token}

# With filters:
?status=submitted&tank_id=1&date_from=2024-04-01&date_to=2024-04-30
```

#### Get Inspection Details
```bash
GET /api/inspections/{id}/
Authorization: Bearer {access_token}
```

#### Submit Inspection for Approval
```bash
POST /api/inspections/{id}/submit/
Authorization: Bearer {access_token}
```

#### Approve Inspection (Supervisor Only)
```bash
POST /api/inspections/{id}/approve/
Authorization: Bearer {access_token}
```

#### Reject Inspection (Supervisor Only)
```bash
POST /api/inspections/{id}/reject/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "rejection_reason": "Temperature reading is incorrect"
}
```

#### Get Dashboard Statistics
```bash
GET /api/inspections/dashboard/
Authorization: Bearer {access_token}
```

---

## 🔐 User Roles & Permissions

### Inspector
- Create inspections
- View own inspections
- Submit inspections for approval
- View dashboard (own inspections)

### Supervisor
- View all submitted inspections
- Approve/reject inspections
- View statistics
- View dashboard (approval metrics)

### Admin
- Full system access
- Manage users
- Manage tanks
- View all reports
- System settings

---

## 🧮 Calculation Engine

The system automatically calculates:

1. **Gross Volume** - From dip reading using tank calibration
   - Formula: V = π × r² × h

2. **Net Volume** - After subtracting water
   - Net Volume = Gross Volume - Water Volume

3. **Temperature Correction** - ASTM standards
   - V_corrected = V_net × (1 + α × ΔT)
   - Where α ≈ 0.0008 for petroleum

4. **Density Correction** - Based on product type and temperature
   - NSV = V_corrected × density_factor

5. **Net Standard Volume (NSV)** - Final standardized measurement

---

## 📊 Database Models

### Users
- `User` - Django auth user
- `UserProfile` - Extended user info (role, department)

### Facilities
- `Tank` - Tank specifications and calibration data

### Inspections
- `Inspection` - Main inspection record
- `Seal` - Seal integrity checks
- `Isolation` - Valve/pipeline isolation checks
- `InspectionCalculation` - Calculated volumes
- `InspectionReport` - Generated reports

---

## 🛠️ Configuration

### Database Connection
Edit `backend/config/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'petroleum_db',
        'USER': 'postgres',
        'PASSWORD': 'INSPECTION',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### CORS Settings
Edit `backend/config/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "http://localhost:8000",  # Django server
]
```

### JWT Settings
Modify token lifetime in `backend/config/settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

---

## 📝 Common Tasks

### Add a Tank
```bash
python manage.py shell
from inspections.models import Tank
Tank.objects.create(
    tank_id='TANK-001',
    tank_name='Crude Oil Storage A',
    product_type='crude_oil',
    capacity=1000,
    location='Bay 1',
    height=15.5,
    diameter=8.2
)
```

### Create Sample Data
```bash
python manage.py loaddata sample_data.json
```

### Export Data
```bash
python manage.py dumpdata inspections > backup.json
```

---

## 🧪 Testing

### Run Tests
```bash
python manage.py test
```

### Run Specific Test
```bash
python manage.py test inspections.tests.InspectionTestCase
```

---

## 📦 Deployment

### Using Gunicorn
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### Using Docker
See `Dockerfile` and `docker-compose.yml`

---

## 🐛 Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check credentials in settings.py
- Verify database exists: `createdb petroleum_db`

### Migration Issues
```bash
python manage.py makemigrations
python manage.py migrate
```

### CORS Errors
- Check CORS_ALLOWED_ORIGINS in settings
- Ensure frontend URL is included

### Token Expired
- Refresh token using `/api/auth/token/refresh/`
- Re-login if refresh fails

---

## 📞 Support

For issues or questions, contact:
- Admin Dashboard: /admin/
- API Documentation: /api/

---

## 📄 License

© 2024 PBPA Smart Reporting System
#   P B P A - s m a r t - i n s p e c t i o n - s y s t e m  
 