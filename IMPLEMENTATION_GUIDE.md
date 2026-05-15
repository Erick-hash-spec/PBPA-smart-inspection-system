# 🚀 Smart Petroleum Reporting System - Implementation & Deployment Guide

## 📋 System Overview

The Smart Petroleum Reporting System is a comprehensive web platform for managing petroleum tank inspections, calculations, and reporting. It replaces manual paperwork with digital workflows.

### Core Features
✅ User Management (Inspector, Supervisor, Admin roles)
✅ Tank Information Management
✅ Digital Inspection Forms (Dip Tickets, Seals, Isolation)
✅ Automatic Calculations (Volume, Temperature Corrections)
✅ Approval Workflows
✅ Report Generation
✅ Dashboard Analytics

---

## 🛠️ Complete Setup Instructions

### Phase 1: Backend Setup

#### Step 1.1: Install Python Dependencies

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r ../requirements.txt
```

#### Step 1.2: PostgreSQL Setup

**Option A: Using Docker (Recommended)**
```bash
docker run --name petroleum_db \
  -e POSTGRES_PASSWORD=INSPECTION \
  -e POSTGRES_DB=petroleum_db \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Local PostgreSQL Installation**
```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create database and user
CREATE DATABASE petroleum_db;
CREATE USER postgres_user WITH PASSWORD 'INSPECTION';
ALTER ROLE postgres_user SET client_encoding TO 'utf8';
ALTER ROLE postgres_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE postgres_user SET default_transaction_deferrable TO on;
ALTER ROLE postgres_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE petroleum_db TO postgres_user;
```

#### Step 1.3: Database Migrations

```bash
# From backend directory
python manage.py makemigrations
python manage.py migrate
```

#### Step 1.4: Create Admin User

```bash
python manage.py createsuperuser

# Follow prompts:
# Username: admin
# Email: admin@example.com
# Password: (secure password)
```

#### Step 1.5: Load Sample Data

```bash
# Run Django shell script to create demo data
python manage.py shell < load_sample_data.py

# This creates:
# - Demo users (inspector1, supervisor1, admin1)
# - Sample tanks (TANK-001, TANK-002, TANK-003)
```

#### Step 1.6: Run Backend Server

```bash
python manage.py runserver
```

✅ Backend API available at: **http://localhost:8000**
✅ Admin panel at: **http://localhost:8000/admin**

---

### Phase 2: Frontend Setup

#### Step 2.1: Install Node Dependencies

```bash
# Navigate to frontend
cd frontend

# Install packages
npm install
```

#### Step 2.2: Configure Environment

```bash
# Create .env file (if not exists)
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000/api
EOF
```

#### Step 2.3: Run Frontend Server

```bash
npm start
```

✅ Frontend available at: **http://localhost:3000**

---

## 🔐 Login Credentials

After running `load_sample_data.py`, use these credentials:

| Role | Username | Password |
|------|----------|----------|
| Inspector | inspector1 | password123 |
| Supervisor | supervisor1 | password123 |
| Admin | admin1 | password123 |

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│            (http://localhost:3000)                   │
└──────────────┬──────────────────────────────────────┘
               │
               │ HTTP/REST
               │ JWT Token Auth
               ▼
┌──────────────────────────────────────────────────────┐
│           Django REST API                            │
│        (http://localhost:8000/api)                   │
├──────────────────────────────────────────────────────┤
│ • User Management (Login, Profile, Roles)           │
│ • Tank Management                                   │
│ • Inspection CRUD                                   │
│ • Calculations (Volume, Temp Corrections)           │
│ • Seal & Isolation Management                       │
│ • Report Generation                                 │
└──────────────┬──────────────────────────────────────┘
               │
               │ SQL ORM
               ▼
┌──────────────────────────────────────────────────────┐
│           PostgreSQL Database                        │
│  (petroleum_db on localhost:5432)                   │
└──────────────────────────────────────────────────────┘
```

---

## 🔄 API Endpoints Reference

### Authentication
```
POST   /api/auth/token/              # Login (username + password)
POST   /api/auth/token/refresh/      # Refresh JWT token
POST   /api/auth/register/           # Register new user
```

### Users
```
GET    /api/users/profile/           # List profiles (admin only)
GET    /api/users/profile/current_user/  # Current user profile
GET    /api/users/profile/list_inspectors/  # Get all inspectors
```

### Tanks
```
GET    /api/tanks/                   # List all active tanks
POST   /api/tanks/                   # Create new tank (admin)
GET    /api/tanks/{id}/              # Tank details
PUT    /api/tanks/{id}/              # Update tank (admin)
GET    /api/tanks/{id}/inspection_history/  # Tank inspection history
GET    /api/tanks/summary/           # Tank summary stats
```

### Inspections
```
GET    /api/inspections/             # List inspections (role-based)
POST   /api/inspections/             # Create inspection
GET    /api/inspections/{id}/        # Inspection details
PUT    /api/inspections/{id}/        # Update inspection
POST   /api/inspections/{id}/submit/ # Submit for approval
POST   /api/inspections/{id}/approve/ # Approve (supervisor)
POST   /api/inspections/{id}/reject/  # Reject with reason
GET    /api/inspections/dashboard/   # Dashboard stats
GET    /api/inspections/recent/      # Recent inspections
```

### Seals & Isolation
```
GET    /api/seals/                   # Get seals for inspection
POST   /api/seals/                   # Create seal
PUT    /api/seals/{id}/              # Update seal
DELETE /api/seals/{id}/              # Delete seal

GET    /api/isolations/              # Get isolations for inspection
POST   /api/isolations/              # Create isolation
PUT    /api/isolations/{id}/         # Update isolation
DELETE /api/isolations/{id}/         # Delete isolation
```

### Calculations & Reports
```
GET    /api/calculations/            # Get calculation for inspection
GET    /api/reports/                 # Get reports for inspection
GET    /api/reports/{id}/            # Download report
```

---

## 🎯 Workflow Example

### Inspector Workflow
1. **Login** with inspector credentials
2. **Dashboard** shows draft inspections
3. **Create Inspection**:
   - Select tank
   - Enter dip reading, temperature, water level
   - Add seal information
   - Add valve isolation checks
   - Save as draft OR submit
4. **System automatically calculates**:
   - Gross volume
   - Net volume (after water)
   - Temperature correction
   - Net Standard Volume (NSV)
5. **Submit** inspection for approval

### Supervisor Workflow
1. **Login** with supervisor credentials
2. **Dashboard** shows submitted inspections pending approval
3. **Review** inspection details and calculations
4. **Approve** or **Reject** with optional comments
5. **Dashboard** updates with approval stats

### Admin Workflow
1. **Login** with admin credentials
2. **Access Django Admin** at /admin/
3. **Manage**:
   - Users and roles
   - Tank information
   - View all inspections
   - Generate reports
4. **Monitor** system usage and statistics

---

## 📱 Frontend Pages

| Page | Route | Access |
|------|-------|--------|
| Login | /login | Public |
| Register | /register | Public |
| Dashboard | /dashboard | Authenticated |
| Tank List | /tanks | Authenticated |
| Tank Details | /tanks/{id} | Authenticated |
| Inspection List | /inspections | Authenticated |
| Inspection Details | /inspections/{id} | Authenticated |
| New Inspection | /inspections/new | Inspector+ |

---

## 🧮 Calculation Engine Details

### Volume Calculation
```
For cylindrical tank:
Volume = π × r² × h

where:
- r = diameter / 2
- h = dip reading (height of liquid)

Result: Volume in barrels (1 barrel = 159 liters)
```

### Temperature Correction
```
Correction Factor = 1 + (α × ΔT)

where:
- α = 0.0008 (thermal expansion coefficient for petroleum)
- ΔT = Measured Temperature - Reference Temperature (15°C)

Corrected Volume = Gross Volume × Correction Factor
```

### Density Correction
```
Density varies by product and temperature:

- Crude Oil: 0.87 g/cm³
- Fuel Oil: 0.89 g/cm³
- Diesel: 0.84 g/cm³
- Gasoline: 0.75 g/cm³

Net Standard Volume = Corrected Volume × Density Correction Factor
```

---

## 🐳 Docker Deployment

### Build & Run with Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Run migrations
docker-compose exec backend python manage.py migrate

# Load sample data
docker-compose exec backend python manage.py shell < backend/load_sample_data.py
```

### Access After Docker Deployment
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Panel: http://localhost:8000/admin
- Database: localhost:5432

---

## 📚 Database Models

### UserProfile
- Extended User model with roles (Inspector, Supervisor, Admin)
- Department and phone tracking

### Tank
- Tank specifications (ID, name, product type, capacity)
- Physical dimensions (height, diameter)
- Calibration tracking
- Location tracking

### Inspection
- Linked to tank and inspector
- DIP ticket data (reading, temperature, water level)
- Status workflow (draft → submitted → approved/rejected)
- Supervisor approval tracking
- Timestamps for auditing

### Seal
- Linked to inspection
- Seal number, type, status (intact/damaged/missing)
- Location and remarks

### Isolation
- Pipeline and valve information
- Open/closed/unknown status
- Isolation verification

### InspectionCalculation
- All calculated values (volumes, corrections)
- Temperature and density factors
- Final Net Standard Volume (NSV)

### InspectionReport
- Generated report files (PDF)
- Report type (Dip Ticket, Inspection Report, Daily Summary)
- Generation tracking and metadata

---

## 🔒 Security Features

✅ JWT Token Authentication
✅ Role-Based Access Control (RBAC)
✅ Password hashing with Django's default (PBKDF2)
✅ CORS configuration for cross-origin requests
✅ CSRF protection enabled
✅ Secure token refresh mechanism
✅ Read-only API fields for audit trails
✅ Timestamp tracking for all operations

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: could not connect to server: Connection refused
Solution: Ensure PostgreSQL is running on localhost:5432
```

### Migration Errors
```bash
# Reset migrations (development only!)
python manage.py migrate inspections zero
python manage.py migrate
```

### Token Expired
```
Frontend automatically refreshes token
If still issues: Clear localStorage and re-login
```

### CORS Errors
```
Check CORS_ALLOWED_ORIGINS in backend/config/settings.py
Add your frontend URL if missing
```

---

## 📈 Next Steps / Enhancement Ideas

### Phase 4 - Smart Features
- [ ] Add historical anomaly detection
- [ ] Implement tank trend analysis
- [ ] Add predictive maintenance alerts
- [ ] Barcode/QR code tank identification
- [ ] Mobile app (React Native)

### Phase 5 - Advanced Features
- [ ] Real-time monitoring dashboard
- [ ] Automated report generation schedules
- [ ] Email notifications for approvals
- [ ] Integration with ERP systems
- [ ] Bulk import capabilities
- [ ] Advanced search and filtering
- [ ] Data export (Excel, CSV)
- [ ] Multi-site support
- [ ] Audit log viewer

### Phase 6 - DevOps
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing
- [ ] Performance monitoring
- [ ] Backup and disaster recovery

---

## 📞 Support & Contact

For questions or issues:
1. Check the troubleshooting section above
2. Review Django logs: `backend/logs/debug.log`
3. Review API responses for error messages
4. Check browser console for frontend errors

---

## 📄 License

This project is proprietary to PBPA.

---

## 🎓 Technical Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Framework | Django | 4.2.11 |
| REST Framework | DRF | 3.14.0 |
| Database | PostgreSQL | 12+ |
| Frontend Framework | React | 18.2.0 |
| Authentication | JWT | via SimpleJWT |
| Styling | Tailwind CSS | 3.2.0 |
| HTTP Client | Axios | 1.3.0 |
| Calculations | Python Math | Built-in |

---

**Last Updated**: April 2026
**Status**: Production Ready
