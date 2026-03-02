# Hospital Management System - Database Architecture

## Overview
**Single Consolidated Database Model**

All application data is stored in and accessed from ONE database file only.

```
┌─────────────────────────────────────────────────────────────┐
│         SINGLE DATABASE: hospital_db.sqlite                 │
│     Located: hms-system/backend/hospital_db.sqlite           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAFF & AUTHENTICATION                               │  │
│  │  ├─ staff table (7 records)                           │  │
│  │  │  ├─ ADM001 (Admin) - Login credentials            │  │
│  │  │  ├─ REC001 (Receptionist) - Login credentials     │  │
│  │  │  ├─ DOC001-002 (Doctors) - Login credentials      │  │
│  │  │  ├─ PHR001 (Pharmacist) - Login credentials       │  │
│  │  │  ├─ LAB001 (Lab Tech) - Login credentials         │  │
│  │  │  └─ NUR001 (Nurse) - Login credentials            │  │
│  │  └─ All password hashes stored securely              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PATIENT MANAGEMENT                                   │  │
│  │  ├─ patients table (17 records)                      │  │
│  │  │  ├─ Patient profiles & demographics               │  │
│  │  │  ├─ Medical history                               │  │
│  │  │  ├─ Allergies & chronic conditions                │  │
│  │  │  └─ Contact information                           │  │
│  │  └─ vital_signs table                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ CLINICAL WORKFLOW                                    │  │
│  │  ├─ appointments table (25 records)                  │  │
│  │  │  ├─ Appointment booking data                      │  │
│  │  │  ├─ Status tracking                               │  │
│  │  │  └─ Doctor assignments                            │  │
│  │  ├─ queue_management table (9 records)               │  │
│  │  │  ├─ Real-time queue tracking                      │  │
│  │  │  ├─ Token numbers & status                        │  │
│  │  │  └─ Doctor assignment                             │  │
│  │  ├─ prescriptions table (11 records)                 │  │
│  │  │  ├─ Prescription details                          │  │
│  │  │  └─ Medicine assignments                          │  │
│  │  ├─ prescription_medicines table (11 records)        │  │
│  │  │  ├─ Medicine names, strengths                     │  │
│  │  │  ├─ Frequency & duration                          │  │
│  │  │  └─ Dosage information                            │  │
│  │  ├─ lab_orders table (5 records)                     │  │
│  │  │  ├─ Lab test orders                               │  │
│  │  │  └─ Clinical notes                                │  │
│  │  └─ lab_results table                                │  │
│  │     └─ Lab test results                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ HOSPITAL CONFIGURATION                               │  │
│  │  ├─ departments table (20 records)                   │  │
│  │  │  ├─ Department names                              │  │
│  │  │  └─ Specializations                               │  │
│  │  ├─ doctors table (1 record)                         │  │
│  │  │  └─ Doctor details & specialization               │  │
│  │  ├─ beds table                                       │  │
│  │  │  └─ Bed occupancy tracking                        │  │
│  │  ├─ admissions table                                 │  │
│  │  │  └─ Patient admissions                            │  │
│  │  └─ medicine_inventory table                         │  │
│  │     └─ Medicine stock tracking                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Size: 148 KB | Active: YES ✓                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Requests
     ↓
┌─────────────────────────────┐
│  Frontend (Patient/Staff)    │
│  Port: 5173 / 5175          │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│  Backend API                │
│  Port: 5000                 │
│  Flask + Flask-SocketIO     │
│  - Authentication           │
│  - REST Endpoints           │
│  - WebSocket Events         │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│  SINGLE DATABASE            │
│ hospital_db.sqlite          │
│  All Data Stored Here       │
│  - Patients                 │
│  - Staff/Login Credentials  │
│  - Appointments             │
│  - Prescriptions            │
│  - Lab Orders               │
│  - Queue Management         │
│  - Clinical Records         │
└─────────────────────────────┘
```

## Code Reference

### Backend Configuration (app.py)
```python
# Line 23
DB_FILE = 'hospital_db.sqlite'

# Database Connection Function
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn
```

### Access Pattern
All endpoints follow this pattern:
```python
@app.route('/api/<resource>', methods=['GET', 'POST'])
@jwt_required()
def resource_handler():
    conn = get_db_connection()  # Single connection point
    cursor = conn.cursor()
    # Query single database
    cursor.execute("SELECT * FROM <table>")
    data = cursor.fetchall()
    # Return data
    return jsonify(data)
```

## Removed Databases
- ✅ `/backend/hms.db` - Removed (empty)
- ✅ `/database/hms.db` - Removed (duplicate)
- ✅ `/database/hospital_db.sqlite` - Removed (backup copy)
- ✅ `/hospital_db.sqlite` - Removed (root copy)

**Only remaining:** `hms-system/backend/hospital_db.sqlite`

## Verification Commands

### Check database status:
```bash
cd hms-system/backend
python3 -c "import sqlite3; db=sqlite3.connect('hospital_db.sqlite'); c=db.cursor(); c.execute('SELECT count(*) FROM sqlite_master WHERE type=\"table\"'); print(f'Tables: {c.fetchone()[0]}')"
```

### View all tables:
```bash
cd hms-system/backend
python3 << 'EOF'
import sqlite3
db = sqlite3.connect('hospital_db.sqlite')
c = db.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
for table in c.fetchall():
    print(f"- {table[0]}")
db.close()
EOF
```

### Test backend connectivity:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "database": "connected",
  "status": "healthy",
  "timestamp": "2026-02-12T12:11:56.391351"
}
```

## Summary
- ✅ **Single Database:** `hospital_db.sqlite`
- ✅ **All data consolidated:** Patients, Staff, Logins, Appointments, Prescriptions, Lab Orders
- ✅ **All access points:** Backend API, WebSockets, Frontends
- ✅ **No duplicates:** Removed all backup/unnecessary database files
- ✅ **Source of truth:** One unified data store for entire application

---
**Last Updated:** 2026-02-12
**Status:** Production Ready ✓
