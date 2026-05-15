# ⚡ Quick Start Guide - 5 Minutes to Running

This guide will get you up and running in 5 minutes.

## Prerequisites Check

Verify you have installed:
```bash
python --version    # Should be 3.10+
node --version      # Should be 16+
npm --version       # Should be 8+
postgres --version  # Should be 12+
```

If any are missing, install them first.

---

## Step 1: Start PostgreSQL (1 min)

**Option A: Docker (Simplest)**
```bash
docker run --name petroleum_db \
  -e POSTGRES_PASSWORD=INSPECTION \
  -e POSTGRES_DB=petroleum_db \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Local PostgreSQL**
```bash
# macOS/Linux - start PostgreSQL
brew services start postgresql

# Windows - PostgreSQL service should auto-start
```

---

## Step 2: Backend Setup (2 min)

**Terminal 1 - Backend**

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate    # On Windows

# Install dependencies
pip install -r ../requirements.txt

# Run migrations
python manage.py migrate

# Load sample data
python manage.py shell < load_sample_data.py

# Start server
python manage.py runserver
```

✅ Backend running at http://localhost:8000

---

## Step 3: Frontend Setup (2 min)

**Terminal 2 - Frontend**

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

✅ Frontend running at http://localhost:3000

---

## Step 4: Login & Explore (Opens automatically)

When `npm start` completes, your browser opens automatically.

### Login Credentials:
```
Username: inspector1
Password: password123
```

Or try:
```
Username: supervisor1
Password: password123
```

---

## 🎯 What to Try First

### As an Inspector:
1. Go to Dashboard
2. Click "New Inspection"
3. Select tank "TANK-001"
4. Fill in readings:
   - Dip Reading: 12.5 (meters)
   - Temperature: 25 (°C)
   - Water Level: 0.5 (cm)
5. Add a seal with number "S-001"
6. Add a valve isolation "V-001"
7. Click "Submit" (system auto-calculates volumes!)

### As a Supervisor:
1. Login with supervisor1
2. Go to Inspections
3. See submitted inspections
4. Review and "Approve" or "Reject"

### As an Admin:
1. Login with admin1
2. Visit http://localhost:8000/admin
3. Manage users, tanks, view all data

---

## 📊 Key Calculations Explained

The system automatically calculates:

```
Gross Volume = π × r² × dip_height
Net Volume = Gross Volume - Water Volume
Temperature Correction = 1 + (0.0008 × ΔT)
Corrected Volume = Net Volume × Temperature Correction
Net Standard Volume = Corrected Volume × Density Factor
```

All calculations are done in **barrels** (1 barrel = 159 liters).

---

## 🔧 Stopping Services

```bash
# Backend: Press Ctrl+C in Terminal 1
# Frontend: Press Ctrl+C in Terminal 2
# Database (if Docker): docker stop petroleum_db
```

---

## 🆘 Common Issues

### "Connection refused" - Database
**Solution:** Start PostgreSQL or Docker container

### "Port 8000 already in use"
```bash
# Kill process using port 8000
# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "Module not found" errors
```bash
# Reinstall dependencies
pip install -r ../requirements.txt
npm install
```

### CORS errors
- Backend CORS already configured for localhost:3000
- If using different URL, update `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`

---

## 📱 Dashboard Walkthrough

### Inspector Dashboard Shows:
- Total Inspections (count)
- Draft inspections (awaiting submission)
- Submitted inspections (awaiting approval)
- Approved inspections (completed)

### Supervisor Dashboard Shows:
- Pending Approvals (awaiting your review)
- Total Approved (your approvals)

### Admin Dashboard Shows:
- Total Tanks
- Total Inspections
- Approved
- Rejected

---

## 🚀 Next Steps

### Learn the System:
1. Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for detailed docs
2. Check API endpoints at http://localhost:8000/api/
3. Try the Django Admin at http://localhost:8000/admin/

### Deploy to Production:
1. Use Docker Compose: `docker-compose up`
2. Setup HTTPS/SSL certificates
3. Configure a production database (RDS, etc.)
4. Deploy frontend to Netlify/Vercel/AWS
5. Deploy backend to Heroku/AWS/DigitalOcean

### Customize:
- Edit tank specifications
- Create your own inspection templates
- Add custom calculations
- Configure report generation

---

## 📚 Documentation Files

- **IMPLEMENTATION_GUIDE.md** - Complete technical guide
- **DEPLOYMENT.md** - Production deployment guide
- **README.md** - Project overview

---

## 💡 Pro Tips

1. **Bulk Import**: Load tanks from CSV using Django admin
2. **Batch Approvals**: Supervisors can approve multiple inspections
3. **Historical Analysis**: Compare recent vs historical readings
4. **Auto-Export**: Generate PDF reports automatically
5. **Mobile**: Use responsive design on tablets during inspections

---

## ✅ System Ready!

Your Smart Petroleum Reporting System is now running!

```
✓ Backend API  → http://localhost:8000
✓ Frontend UI  → http://localhost:3000
✓ Database     → postgresql://localhost:5432/petroleum_db
✓ Admin Panel  → http://localhost:8000/admin
```

**Happy Inspecting! 🔷**

---

For help, refer to:
- Full docs: IMPLEMENTATION_GUIDE.md
- API reference: See backend/inspections/urls.py
- Issue? Check Django logs: backend/logs/debug.log
