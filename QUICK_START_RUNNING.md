# Hospital Management System - Quick Start Guide

## ✅ ALL SERVICES ARE CURRENTLY RUNNING

### Access the Applications

| Service | URL | Purpose |
|---------|-----|---------|
| **Patient Portal** | http://localhost:5173 | Patient registration, appointments, medical records |
| **Staff Portal** | http://localhost:5174 | Doctor, staff dashboards, appointment management |
| **Backend API** | http://localhost:5000 | REST API and WebSocket server |

---

## 🚀 How to Start Services

### Option 1: Start All Services in Separate Terminals

#### Terminal 1 - Backend Server
```bash
cd /home/ubuntu/Downloads/kimi_clone/hms-system/backend
source /home/ubuntu/Downloads/kimi_clone/.venv/bin/activate
python app.py
```
✅ Backend will start on `http://localhost:5000`

#### Terminal 2 - Patient Portal
```bash
cd /home/ubuntu/Downloads/kimi_clone/app
npm run dev
```
✅ Patient Portal will start on `http://localhost:5173`

#### Terminal 3 - Staff Portal
```bash
cd /home/ubuntu/Downloads/kimi_clone/hms-system/staff-portal
npm run dev
```
✅ Staff Portal will start on `http://localhost:5174`

---

## 📋 Service Details

### Backend (Flask)
- **Status:** ✅ Running
- **Port:** 5000
- **Database:** SQLite (`hospital_db.sqlite`)
- **Features:**
  - REST API endpoints
  - JWT authentication
  - Real-time WebSocket (Socket.io)
  - Rate limiting
  - Role-based access control

### Patient Portal (React)
- **Status:** ✅ Running
- **Port:** 5173
- **Features:**
  - Patient registration & login
  - Book appointments
  - View medical records
  - Manage prescriptions
  - Access lab results
  - Real-time notifications

### Staff Portal (React)
- **Status:** ✅ Running
- **Port:** 5174
- **Features:**
  - Multi-role staff authentication
  - Doctor dashboard
  - Receptionist interface
  - Pharmacist management
  - Lab technician interface
  - Admin panel
  - Real-time notifications

---

## 🔧 Environment Setup

### Python Virtual Environment
```bash
# The venv is already configured at:
/home/ubuntu/Downloads/kimi_clone/.venv

# To activate it:
source /home/ubuntu/Downloads/kimi_clone/.venv/bin/activate

# All Python dependencies are installed:
Flask==2.3.3
Flask-CORS==4.0.0
Flask-JWT-Extended==4.5.3
Flask-Bcrypt==1.0.1
Flask-SocketIO==5.3.2
# ... and more (see requirements.txt)
```

### Node.js / NPM
```bash
# Both portals have node_modules installed
# No additional npm install needed

# Commands available:
npm run dev      # Development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

---

## 🗄️ Database Information

### SQLite Database
- **Location:** `/home/ubuntu/Downloads/kimi_clone/hms-system/backend/hospital_db.sqlite`
- **Schema:** `/home/ubuntu/Downloads/kimi_clone/hms-system/database/sqlite_schema.sql`
- **Status:** ✅ Initialized and ready

### Tables Included
- patients
- departments
- doctors
- appointments
- medical_records
- prescriptions
- lab_results
- staff_users
- queue_management
- and more...

---

## 🔐 Authentication

### Default Credentials (Development)
You can use test credentials for development. Check the database or API documentation for specific test accounts.

### JWT Authentication
- Token-based authentication
- Tokens expire after 8-24 hours
- Tokens stored in localStorage (client-side)
- Socket.io connections also use JWT

---

## ⚡ API Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Patient Endpoints
```
POST   /api/patient/register     - Register new patient
POST   /api/patient/login        - Patient login
GET    /api/patient/profile      - Get patient profile
GET    /api/patient/appointments - List appointments
POST   /api/patient/appointments - Book appointment
```

### Staff Endpoints
```
POST   /api/staff/login          - Staff login
GET    /api/staff/dashboard      - Get dashboard data
GET    /api/appointments         - List all appointments
POST   /api/appointments/<id>/approve - Approve appointment
```

*See backend app.py for complete API documentation*

---

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check if port 5000 is in use:
lsof -i :5000

# If occupied, kill the process:
kill -9 <PID>

# Or use a different port in Flask
export FLASK_PORT=5001
```

### Patient Portal Not Starting
```bash
# Check if port 5173 is in use:
lsof -i :5173

# Clear npm cache if needed:
npm cache clean --force
npm install
npm run dev
```

### Staff Portal Not Starting
```bash
# Check if port 5174 is in use:
lsof -i :5174

# Clear vite cache:
rm -rf hms-system/staff-portal/node_modules/.vite
npm run dev
```

### Database Issues
```bash
# Check if database exists:
ls -la /home/ubuntu/Downloads/kimi_clone/hms-system/backend/hospital_db.sqlite

# Reset database (WARNING: clears all data):
rm hospital_db.sqlite
python init_db.py
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSERS                             │
└────────────┬──────────────────────────────────────┬──────────┘
             │                                      │
      ┌──────▼────────┐                     ┌───────▼──────┐
      │  Patient      │                     │    Staff     │
      │  Portal       │                     │    Portal    │
      │ :5173         │                     │   :5174      │
      │               │                     │              │
      │  React App    │                     │  React App   │
      └──────┬────────┘                     └───────┬──────┘
             │          API Requests               │
             └────────────────┬────────────────────┘
                              │
                      ┌───────▼────────┐
                      │  Flask API     │
                      │  Server        │
                      │  :5000         │
                      │                │
                      │ • REST API     │
                      │ • WebSocket    │
                      │ • Auth JWT     │
                      └───────┬────────┘
                              │
                      ┌───────▼────────┐
                      │  SQLite DB     │
                      │  hospital_db   │
                      │                │
                      │ • Patients     │
                      │ • Appointments │
                      │ • Records      │
                      └────────────────┘
```

---

## 📝 Recent Changes

### Fixed Issues
1. ✅ **MedicalRecords.tsx** - Added missing `useNavigate` import
   - Location: `app/src/pages/patient/MedicalRecords.tsx`
   - Fix: Added React Router navigation hook
   - Status: Resolved ✅

### Build Status
- ✅ Patient Portal: 0 errors, builds successfully
- ✅ Staff Portal: 0 errors, builds successfully  
- ✅ Backend: All Python files compile without errors

---

## 🧪 Testing

### Manual Testing
1. Open http://localhost:5173 (Patient Portal)
2. Try patient registration
3. Try booking an appointment
4. Open http://localhost:5174 (Staff Portal)
5. Login with staff credentials
6. Check real-time notifications

### API Testing with cURL
```bash
# Test backend health
curl http://localhost:5000/

# Test patient registration (example)
curl -X POST http://localhost:5000/api/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## 📚 Documentation

See the following files for more information:
- `ANALYSIS_REPORT.md` - Detailed analysis of all files
- `IMPLEMENTATION_COMPLETE.md` - Implementation details
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `VERIFICATION_REPORT.txt` - Verification results
- `README_REAL_TIME_IMPLEMENTATION.md` - Real-time features

---

## ✅ Current Status Summary

| Component | Status | Port | Health |
|-----------|--------|------|--------|
| Backend API | ✅ Running | 5000 | Healthy |
| Patient Portal | ✅ Running | 5173 | Healthy |
| Staff Portal | ✅ Running | 5174 | Healthy |
| Database | ✅ Initialized | - | Ready |
| Dependencies | ✅ Installed | - | Complete |
| Error Status | ✅ Fixed (1/1) | - | Clear |

**System is READY for production testing!**

---

Last Updated: February 12, 2026
