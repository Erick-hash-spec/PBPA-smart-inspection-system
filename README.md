# PBPA Smart Petroleum Reporting System
### Final Year Project — Technical Documentation

**Author:** Erick Muhanuzi  
**Institution:** PBPA  
**Year:** 2026 

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Features & Modules](#5-features--modules)
6. [Database Models](#6-database-models)
7. [API Reference](#7-api-reference)
8. [Calculation Engine](#8-calculation-engine)
9. [Signing Workflow](#9-signing-workflow)
10. [Real-Time Messaging](#10-real-time-messaging)
11. [Notification System](#11-notification-system)
12. [Quick Start Guide](#12-quick-start-guide)
13. [Configuration](#13-configuration)
14. [Deployment](#14-deployment)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

The **PBPA Smart Petroleum Reporting System** is a full-stack web application that digitizes petroleum tank inspection and reporting processes at petroleum storage facilities. It replaces manual paperwork with a structured digital workflow covering inspection, calculation, signing, submission, and approval.

### Key Capabilities

| Capability | Description |
|---|---|
| Digital Inspections | Capture dip readings, temperatures, seal/isolation checks |
| ASTM D1250 Calculations | Automatic VCF, WCF, NSV using lookup tables and formula fallback |
| Shore Tank Calculations | Multi-tank initial/final volume reconciliation with PDF export |
| Document Signing | 4-step inspector → terminal rep → inspector → admin workflow |
| Submissions Inbox | Admin receives and reviews all submitted documents |
| Vessel Reports | Discharge summary linking all documents for a vessel |
| Service Requests | Terminal rep submits requests; inspector/admin reply in real time |
| Real-Time Messaging | Chat thread per service request with live polling |
| Notifications | In-app notifications for messages, submissions, and signing events |
| Inspector Roster | Admin assigns inspectors to vessels with scheduling |
| Sampling Forms | Digital sampling records with PDF generation |
| Stock Reports | Periodic stock reconciliation reports |
| Provisional Outturn | Ship vs shore volume comparison reports |
| System Analytics | Activity logs, document counts, period-based statistics |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  (Create React App · Tailwind CSS · Axios · React Router)│
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST (JWT Auth)
┌────────────────────────▼────────────────────────────────┐
│                  Django REST Framework                   │
│         (ViewSets · JWT · CORS · Throttling)             │
├─────────────────────────────────────────────────────────┤
│              inspections app (main)                      │
│  models · serializers · views · calculations · signing  │
│  astm_tables · shore_tank_utils · permissions · throttles│
└────────────────────────┬────────────────────────────────┘
                         │ ORM
┌────────────────────────▼────────────────────────────────┐
│                    PostgreSQL Database                   │
└─────────────────────────────────────────────────────────┘
```

**Tech Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Axios, React Router v6, Lucide Icons |
| Backend | Django 4, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 12+ |
| PDF Generation | ReportLab |
| ASTM Calculations | Custom lookup tables + formula fallback (astm_tables.py) |

---

## 3. Project Structure

```
SMART REPORTING SYSTEM/
├── backend/
│   ├── config/
│   │   ├── settings.py          # Django settings
│   │   └── wsgi.py              # WSGI entry point
│   ├── inspections/
│   │   ├── models.py            # All database models (25 models)
│   │   ├── serializers.py       # DRF serializers
│   │   ├── views.py             # ViewSets & API endpoints
│   │   ├── urls.py              # URL routing
│   │   ├── calculations.py      # Shore tank validation & calculation engine
│   │   ├── astm_tables.py       # ASTM D1250 VCF/WCF lookup tables
│   │   ├── shore_tank_utils.py  # Shore tank PDF generation
│   │   ├── signing.py           # Document signing workflow helpers
│   │   ├── permissions.py       # Custom DRF permissions
│   │   ├── middleware.py        # Request logging middleware
│   │   ├── throttles.py         # API rate limiting
│   │   ├── validators.py        # Custom field validators
│   │   ├── exception_handler.py # Custom error responses
│   │   ├── admin.py             # Django admin configuration
│   │   └── tests.py             # Unit tests
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── InspectionListPage.js
│   │   │   ├── InspectionFormPage.js
│   │   │   ├── InspectionDetailPage.js
│   │   │   ├── SealIsolationReportListPage.js
│   │   │   ├── SealIsolationReportFormPage.js
│   │   │   ├── SealIsolationReportDetailPage.js
│   │   │   ├── ShoreTankCalculationListPage.js
│   │   │   ├── ShoreTankCalculationFormPage.js
│   │   │   ├── ShoreTankCalculationDetailPage.js
│   │   │   ├── ProductReceiptCertificateListPage.js
│   │   │   ├── ProductReceiptCertificateFormPage.js
│   │   │   ├── ProductReceiptCertificateDetailPage.js
│   │   │   ├── VesselReportPage.js
│   │   │   ├── SubmissionsInboxPage.js
│   │   │   ├── ServiceRequestPage.js
│   │   │   ├── StockReportPage.js
│   │   │   ├── ProvisionalOutturnReportListPage.js
│   │   │   ├── ProvisionalOutturnReportFormPage.js
│   │   │   ├── ProvisionalOutturnReportDetailPage.js
│   │   │   ├── SamplingFormPage.js
│   │   │   ├── RosterPage.js
│   │   │   ├── RosterFormPage.js
│   │   │   ├── ClientDashboardPage.js
│   │   │   ├── UserManagementPage.js
│   │   │   ├── TankListPage.js
│   │   │   ├── AdminPanelPage.js
│   │   │   └── SystemAnalyticsPage.js
│   │   ├── components/
│   │   │   ├── Navigation.js    # Sidebar navigation
│   │   │   ├── TopBar.js        # Header with notification bells
│   │   │   └── SigningActions.js # Document signing UI
│   │   ├── services/
│   │   │   └── api.js           # Axios API client (all services)
│   │   └── App.js               # Routes & auth guards
│   └── package.json
└── README.md
```

---

## 4. User Roles & Permissions

### Inspector
- Create and manage dip ticket inspections
- Create seal & isolation reports
- Create shore tank calculations
- Create product receipt certificates
- Create stock reports, sampling forms, provisional outturn reports
- Sign documents (Step 1 of signing workflow)
- Submit signed documents to admin
- View own roster assignments
- Reply to service requests in real time
- Receive notifications for signing events and messages

### Terminal Representative (Supervisor)
- Submit service requests for inspection operations
- View own submitted documents on client dashboard
- Sign documents (Step 2 — counter-sign)
- Receive real-time message notifications from inspector/admin
- Chat with inspector and admin on service requests

### Admin
- Full access to all documents and reports
- Manage users and tanks
- View submissions inbox (all submitted documents)
- Create and finalize vessel reports
- Assign inspectors to roster
- Acknowledge, assign, and complete service requests
- View system analytics and activity logs
- Receive notifications for all submissions and messages

---

## 5. Features & Modules

### 5.1 Dashboard
- Role-based card layout (daily/weekly/monthly/yearly/all period filter)
- Defaults to **today's** counts
- Submissions inbox card shows unread + read counts
- Recent submissions panel for admin

### 5.2 Dip Ticket Inspections
- Tank selection with calibration data
- Dip reading, temperature, water level capture
- Automatic volume calculations
- Seal and isolation sub-records
- PDF dip ticket generation
- Signing workflow integration

### 5.3 Shore Tank Calculations
- Multi-tank initial and final readings
- ASTM D1250 VCF/WCF auto-calculation via lookup table with formula fallback
- Correct alpha coefficients per product:
  - Gasoline/Naphtha (< 0.770 kg/L): α = 0.001200
  - Kerosene/Jet A1 (0.770–0.800 kg/L): α = 0.001000
  - Gasoil/Diesel/Fuel Oil (≥ 0.800 kg/L): α = 0.000640
- WCF = density@20°C − 0.0011 (valid range 0.5–1.2)
- Terminal totals and received volume summary
- PDF report generation with company letterhead
- 4-step signing workflow

### 5.4 Seal & Isolation Reports
- Seal integrity checks per tank
- Valve/pipeline isolation records
- PDF generation
- Signing workflow

### 5.5 Product Receipt Certificates
- Multi-item product receipt records
- Quantity and weight tracking
- PDF generation
- Signing workflow

### 5.6 Vessel Reports
- Links dip tickets, seal reports, shore calculations, certificates
- Auto-fill vessel details from linked documents
- Total weight (MT) and volume (m³) summary
- Draft → Final → Cancelled status flow
- Admin-only creation; links documents from any inspector

### 5.7 Submissions Inbox
- All submitted documents appear here for admin review
- Filter by document type (server-side)
- Deleted source documents automatically excluded
- Unread/read badge counts on dashboard card
- Mark individual or all as read

### 5.8 Service Requests
- Terminal rep submits requests (operation type, vessel, terminal, date/time)
- Admin can acknowledge, assign to inspector, complete, or cancel
- Inspector can complete assigned requests
- **Real-time chat thread** per request (4-second polling)
- Message notifications sent to all participants on new message

### 5.9 Inspector Roster
- Admin creates roster assignments per vessel/date
- Inspector receives bell notification for new assignments
- Inspector marks assignments as read

### 5.10 Sampling Forms
- Digital sampling records
- PDF generation

### 5.11 Stock Reports
- Periodic stock reconciliation
- Opening/closing stock tracking
- PDF export

### 5.12 Provisional Outturn Reports
- Ship vs shore volume comparison per terminal
- Difference volume and percentage calculations
- PDF generation

### 5.13 System Analytics (Admin)
- Document counts by type and period
- Activity log viewer
- User activity overview

---

## 6. Database Models

| Model | Description |
|---|---|
| `UserProfile` | Extends Django User with role (admin/inspector/supervisor) and department |
| `RosterAssignment` | Inspector roster entries per vessel/date |
| `Tank` | Tank specifications, dimensions, calibration data |
| `Inspection` | Dip ticket inspection record |
| `Seal` | Seal integrity check linked to inspection |
| `Isolation` | Valve/pipeline isolation check linked to inspection |
| `InspectionCalculation` | Calculated volumes for an inspection |
| `InspectionReport` | Generated PDF report record |
| `ProductReceiptCertificate` | Product receipt certificate header |
| `ProductReceiptCertificateItem` | Line items for a certificate |
| `SealIsolationReport` | Seal & isolation report header |
| `SealIsolationEntry` | Individual seal/isolation entry |
| `ShoreTankCalculation` | Shore tank calculation header |
| `ShoreTankCalculationItem` | Per-tank calculation row (VCF, WCF, volumes) |
| `Submission` | Document submitted to admin inbox |
| `VesselReport` | Vessel discharge summary report |
| `StockReport` | Stock reconciliation report |
| `StockReportItem` | Per-product stock line item |
| `ProvisionalOuturnReport` | Provisional outturn report header |
| `ProvisionalOuturnItem` | Per-terminal outturn comparison row |
| `ServiceRequest` | Inspection operation request from terminal rep |
| `ServiceRequestMessage` | Chat message on a service request thread |
| `Notification` | In-app notification (sr_message, ready_to_submit, report_submitted) |
| `SamplingForm` | Sampling form record |
| `ActivityLog` | System audit log entry |

---

## 7. API Reference

All endpoints require `Authorization: Bearer {access_token}` unless noted.

### Authentication

```
POST   /api/auth/token/              Login — returns access + refresh tokens
POST   /api/auth/token/refresh/      Refresh access token
POST   /api/auth/register/           Register new user
```

### Users & Profiles

```
GET    /api/users/profile/           List user profiles
GET    /api/users/profile/{id}/      Get profile
PUT    /api/users/profile/{id}/      Update profile
```

### Tanks

```
GET    /api/tanks/                   List tanks
POST   /api/tanks/                   Create tank (admin)
GET    /api/tanks/{id}/              Tank detail
GET    /api/tanks/{id}/inspection_history/  Inspection history
```

### Inspections (Dip Tickets)

```
GET    /api/inspections/             List inspections
POST   /api/inspections/             Create inspection
GET    /api/inspections/{id}/        Detail
PUT    /api/inspections/{id}/        Update
POST   /api/inspections/{id}/submit/         Submit for approval
POST   /api/inspections/{id}/approve/        Approve (supervisor)
POST   /api/inspections/{id}/reject/         Reject (supervisor)
POST   /api/inspections/{id}/inspector_sign/ Inspector sign (Step 1)
POST   /api/inspections/{id}/client_sign/    Terminal rep sign (Step 2)
POST   /api/inspections/{id}/submit_to_admin/ Submit to admin (Step 4)
GET    /api/inspections/{id}/generate_document/ Download PDF
GET    /api/inspections/dashboard/   Dashboard statistics
```

### Shore Tank Calculations

```
GET    /api/shore-tank-calculations/           List
POST   /api/shore-tank-calculations/           Create
GET    /api/shore-tank-calculations/{id}/      Detail
PUT    /api/shore-tank-calculations/{id}/      Update
POST   /api/shore-tank-calculations/{id}/inspector_sign/
POST   /api/shore-tank-calculations/{id}/client_sign/
POST   /api/shore-tank-calculations/{id}/submit_to_admin/
GET    /api/shore-tank-calculations/{id}/pdf/  Download PDF
POST   /api/astm/lookup/                       ASTM D1250 VCF/WCF lookup
```

### Seal & Isolation Reports

```
GET    /api/seal-isolation-reports/            List
POST   /api/seal-isolation-reports/            Create
GET    /api/seal-isolation-reports/{id}/       Detail
POST   /api/seal-isolation-reports/{id}/inspector_sign/
POST   /api/seal-isolation-reports/{id}/client_sign/
POST   /api/seal-isolation-reports/{id}/submit_to_admin/
GET    /api/seal-isolation-reports/{id}/pdf/   Download PDF
```

### Product Receipt Certificates

```
GET    /api/product-receipt-certificates/      List
POST   /api/product-receipt-certificates/      Create
GET    /api/product-receipt-certificates/{id}/ Detail
POST   /api/product-receipt-certificates/{id}/inspector_sign/
POST   /api/product-receipt-certificates/{id}/client_sign/
POST   /api/product-receipt-certificates/{id}/submit_to_admin/
GET    /api/product-receipt-certificates/{id}/pdf/
```

### Vessel Reports

```
GET    /api/vessel-reports/          List
POST   /api/vessel-reports/          Create (admin)
GET    /api/vessel-reports/{id}/     Detail
PUT    /api/vessel-reports/{id}/     Update
POST   /api/vessel-reports/{id}/finalize/   Finalize
POST   /api/vessel-reports/{id}/cancel/     Cancel
GET    /api/vessel-reports/{id}/pdf/        Download PDF
```

### Submissions Inbox

```
GET    /api/submissions/             List (filtered by doc_type query param)
DELETE /api/submissions/{id}/        Delete (admin/supervisor)
POST   /api/submissions/{id}/mark_read/     Mark as read
POST   /api/submissions/mark_all_read/      Mark all read
GET    /api/submissions/unread_count/       Unread count
```

### Service Requests

```
GET    /api/service-requests/        List
POST   /api/service-requests/        Create (terminal rep)
GET    /api/service-requests/{id}/   Detail
PUT    /api/service-requests/{id}/   Update
DELETE /api/service-requests/{id}/   Delete (admin)
POST   /api/service-requests/{id}/acknowledge/  Acknowledge (admin)
POST   /api/service-requests/{id}/assign/       Assign inspector (admin)
POST   /api/service-requests/{id}/complete/     Mark complete
POST   /api/service-requests/{id}/cancel/       Cancel
POST   /api/service-requests/{id}/mark_read/    Mark read
POST   /api/service-requests/mark_all_read/     Mark all read
GET    /api/service-requests/unread_count/      Unread count
GET    /api/service-requests/{id}/messages/     Get chat messages
POST   /api/service-requests/{id}/messages/     Send chat message
```

### Notifications

```
GET    /api/notifications/                      List notifications
GET    /api/notifications/unread_count/         Unread count (supports ?notification_type=)
POST   /api/notifications/{id}/mark_read/       Mark read
POST   /api/notifications/mark_all_read/        Mark all read
```

### Other Endpoints

```
GET    /api/rosters/                 Roster assignments
POST   /api/rosters/                 Create assignment (admin)
GET    /api/rosters/unread_count/    Inspector unread count
POST   /api/rosters/{id}/mark_read/  Mark read

GET    /api/sampling-forms/          List sampling forms
POST   /api/sampling-forms/          Create
GET    /api/sampling-forms/{id}/pdf/ Download PDF

GET    /api/stock-reports/           List stock reports
POST   /api/stock-reports/           Create
GET    /api/stock-reports/{id}/pdf/  Download PDF

GET    /api/provisional-outturn-reports/       List
POST   /api/provisional-outturn-reports/       Create
GET    /api/provisional-outturn-reports/{id}/pdf/

GET    /api/activity-logs/           System activity log (admin)
```

---

## 8. Calculation Engine

### ASTM D1250 — Volume Correction Factor (VCF)

VCF corrects observed volume at tank temperature to volume at 15°C standard.

**Process:**
1. Compute density at 20°C from observed density and sample temperature using ASTM Table 54B
2. Look up VCF from ASTM tables using density@20 and tank temperature
3. Fall back to formula if table lookup returns no result:

```
VCF = exp(−α × ΔT × (1 + 0.8 × α × ΔT))
where ΔT = tank_temperature − 15°C
```

**Alpha coefficients (ASTM D1250 Table 54B):**

| Product | Density@20 Range | α (per °C) |
|---|---|---|
| Gasoline / Naphtha | < 0.770 kg/L | 0.001200 |
| Kerosene / Jet A1 | 0.770 – 0.800 kg/L | 0.001000 |
| Gasoil / Diesel / Fuel Oil | ≥ 0.800 kg/L | 0.000640 |

### Weight Conversion Factor (WCF)

```
WCF = density@20°C − 0.0011
Valid range: 0.5 – 1.2
```

WCF converts standard volume (m³) to weight in air (MT):
```
Weight in Air (MT) = Standard Volume (m³) × WCF
```

### Shore Tank Volume Calculation

```
Gross Observed Volume = from dip reading and tank calibration
Net Observed Volume   = Gross − Roof Displacement − Water Volume
Standard Volume       = Net Observed Volume × VCF
Weight in Air (MT)    = Standard Volume × WCF
```

---

## 9. Signing Workflow

All major documents follow a 4-step signing workflow:

```
Step 1: Inspector signs
        → Document status: inspector_signed
        → Terminal rep notified

Step 2: Terminal rep counter-signs
        → Document status: sent_to_inspector
        → Inspector notified: "Please submit to Admin"

Step 3: Inspector reviews and submits to Admin
        → Document status: submitted
        → Admin notified
        → Submission record created in inbox

Step 4: Admin reviews in Submissions Inbox
        → Creates Vessel Report linking all documents
```

**Status flow:**
```
draft → inspector_signed → sent_to_inspector → submitted
```

Legacy states `client_signed` and `verified` are supported for backward compatibility.

---

## 10. Real-Time Messaging

Service requests have a built-in chat thread visible to all participants.

**How it works:**
- Any user (inspector, admin, terminal rep) can open the chat panel from the service requests table
- Messages are stored in `ServiceRequestMessage` model
- Frontend polls every **4 seconds** for new messages
- On sending a message, the backend creates `Notification` records for:
  - The terminal rep (submitted_by)
  - The assigned inspector
  - All admin users
  - Any other user who has previously replied in the thread
  - (Sender is excluded)

**Notification bell (TopBar):**
- Blue `MessageSquare` bell visible to all roles
- Polls every **10 seconds** for unread SR message count
- Dropdown shows message preview, sender name, timestamp
- Clicking navigates to `/service-requests` and marks notification read

---

## 11. Notification System

Three notification types:

| Type | Trigger | Recipients |
|---|---|---|
| `ready_to_submit` | Document signed by terminal rep and ready for inspector to submit | Inspector |
| `report_submitted` | Document submitted to admin inbox | Admin |
| `sr_message` | New message on a service request thread | All thread participants |

**TopBar bells:**

| Bell | Icon | Roles | Color |
|---|---|---|---|
| Report notifications | FileCheck | Admin, Inspector | Green |
| Submissions inbox | Bell | Admin | Red |
| Roster assignments | Bell | Inspector | Red |
| Service requests | ConciergeBell | Admin, Inspector | Orange |
| SR messages | MessageSquare | All | Blue |

---

## 12. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL 12+

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create PostgreSQL database
psql -U postgres
CREATE DATABASE petroleum_db;
\q

# 5. Run migrations
python manage.py migrate

# 6. Create admin superuser
python manage.py createsuperuser

# 7. Start development server
python manage.py runserver
```

Backend available at: **http://localhost:8000**

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
echo REACT_APP_API_URL=http://localhost:8000/api > .env

# 4. Start development server
npm start
```

Frontend available at: **http://localhost:3000**

---

## 13. Configuration

### Database (`backend/config/settings.py`)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'petroleum_db',
        'USER': 'postgres',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### CORS

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
]
```

### JWT Token Lifetime

```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

---

## 14. Deployment

### Production with Gunicorn

```bash
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Environment Variables (Production)

```bash
SECRET_KEY=your_strong_secret_key
DEBUG=False
DATABASE_URL=postgresql://user:password@host:5432/petroleum_db
ALLOWED_HOSTS=yourdomain.com
```

### Frontend Build

```bash
cd frontend
npm run build
# Serve the build/ folder with Nginx or any static file server
```

---

## 15. Troubleshooting

| Problem | Solution |
|---|---|
| Database connection error | Ensure PostgreSQL is running; verify credentials in settings.py |
| Migration errors | Run `python manage.py makemigrations` then `python manage.py migrate` |
| CORS errors | Add frontend URL to `CORS_ALLOWED_ORIGINS` in settings.py |
| Token expired | Call `POST /api/auth/token/refresh/` with refresh token; re-login if expired |
| WCF validation error | Ensure density@20 is in range 0.5–1.2 kg/L |
| Messages not appearing | Check browser console for 401 errors; re-login if token expired |
| PDF not generating | Ensure ReportLab is installed: `pip install reportlab` |

### Useful Management Commands

```bash
# Run tests
python manage.py test

# Export all data
python manage.py dumpdata inspections > backup.json

# Load sample data
python manage.py loaddata sample_data.json

# Add a tank via shell
python manage.py shell
>>> from inspections.models import Tank
>>> Tank.objects.create(
...     tank_id='TANK-001',
...     tank_name='Crude Oil Storage A',
...     product_type='crude_oil',
...     capacity=1000,
...     location='Bay 1',
...     height=15.5,
...     diameter=8.2
... )
```

---

## Support

- Admin Dashboard: `/admin/`
- API Root: `/api/`

---

## License

© 2024 PBPA Smart Reporting System — Erick Muhanuzi Final Year Project
