# Hospital Management System (HMS) - Version 2.0

A comprehensive, modern Hospital Management System built with Flask (backend) and React (frontend), deployed on Render (backend) and Vercel (frontend) with Neon PostgreSQL database.

## 🏥 Overview

This HMS provides complete hospital workflow management including patient registration, appointment booking, staff management, billing, and real-time notifications. The system features a unified frontend with separate patient and staff portals.

## 🌐 Live Demo

- **Frontend (Patient Portal)**: https://hms-sample-self.vercel.app
- **Frontend (Staff Portal)**: https://hms-sample-self.vercel.app/staff
- **Backend API**: https://hms-backend-1hox.onrender.com
- **API Health Check**: https://hms-backend-1hox.onrender.com/api/health

## 📋 Features

### 🏥 Core Hospital Management
- **Patient Management**: Registration, medical records, appointments
- **Staff Management**: Multi-role staff (Doctors, Nurses, Receptionists, etc.)
- **Appointment System**: Booking, scheduling, token management
- **Bed Management**: Ward allocation, occupancy tracking
- **Billing System**: Invoice generation, payment tracking
- **Pharmacy Management**: Medicine inventory, dispensing
- **Laboratory Management**: Test orders, results, reports

### 👤 User Roles & Access
- **Admin**: System administration, user management
- **Receptionist**: Patient registration, appointment booking
- **Doctors**: Patient consultation, prescriptions, medical records
- **Nurses**: Patient care, vital signs monitoring
- **Pharmacist**: Medicine dispensing, inventory management
- **Lab Technician**: Test processing, result entry
- **Billing Staff**: Invoice generation, payment processing
- **Patients**: Appointment booking, medical records access

### 🔧 Technical Features
- **Real-time Notifications**: WhatsApp integration for patient updates
- **Queue Management**: Digital token system for appointments
- **Multi-tenant Architecture**: Separate patient and staff portals
- **RESTful API**: Complete CRUD operations for all entities
- **JWT Authentication**: Secure user authentication and authorization
- **Database Migrations**: SQLite to PostgreSQL migration support
- **Responsive Design**: Mobile-friendly interface

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │◄──►│   (Flask API)   │◄──►│  (Neon PG)      │
│   - Vercel      │    │   - Render      │    │   - PostgreSQL  │
│                 │    │                 │    │                 │
│ • Patient Portal│    │ • REST API      │    │ • Patient Data  │
│ • Staff Portal  │    │ • JWT Auth      │    │ • Staff Data    │
│ • Unified UI    │    │ • Socket.IO     │    │ • Appointments  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
HMS-Sample/
├── 📄 README.md                    # This file
├── 🔧 .env                         # Environment variables
├── 🚫 .gitignore                   # Git ignore rules
├── 📦 Procfile                     # Render deployment config
├── 🐍 app.py                       # Main Flask application
├── 📋 requirements.txt             # Python dependencies
├── 🐍 runtime.txt                  # Python version (3.11.9)
├── 🔄 migrate_to_neon.py           # Database migration script
├── 🌱 simple_seed.py               # Database seeding script
└── 📁 hms-system/                  # Main project folder
    ├── 📁 backend/                 # Flask backend
    │   ├── 🐍 app.py                # Main Flask app (full version)
    │   ├── 📄 .env                  # Backend environment
    │   ├── 📋 requirements.txt      # Backend dependencies
    │   ├── 🗄️ whatsapp_service.py  # WhatsApp notifications
    │   ├── 🗄️ setup_pg.py           # PostgreSQL setup
    │   └── 📁 __pycache__/          # Python cache
    ├── 📁 database/                # Database schemas
    │   └── 📄 pg_schema.sql         # PostgreSQL schema
    ├── 📁 staff-portal/             # React frontend (active)
    │   ├── 📄 package.json          # Node.js dependencies
    │   ├── 📄 vite.config.ts        # Vite configuration
    │   ├── 📄 vercel.json           # Vercel deployment
    │   ├── 📄 .env                  # Frontend environment
    │   └── 📁 src/                  # React source code
    │       ├── 📄 App.tsx           # Main React app (unified)
    │       ├── 📁 components/      # React components
    │       ├── 📁 contexts/        # React contexts
    │       ├── 📁 pages/           # React pages
    │       └── 📁 layouts/         # Layout components
    ├── 📁 patient-portal/          # React frontend (backup)
    └── 📁 images/                   # Image assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL (or Neon account)
- Render account (for backend deployment)
- Vercel account (for frontend deployment)

### 1. Clone the Repository
```bash
git clone https://github.com/aihavedainfotech/HMS-Sample.git
cd HMS-Sample
```

### 2. Backend Setup

#### Environment Variables
Create `.env` file in root:
```env
# Flask Configuration
FLASK_DEBUG=0
FLASK_ENV=production
PYTHONUNBUFFERED=1

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# WhatsApp API (Optional)
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Database Setup
```bash
# Setup PostgreSQL schema and seed data
python hms-system/backend/setup_pg.py

# Or use the simple seeder
python simple_seed.py
```

#### Run Backend Locally
```bash
python app.py
```
Backend will run on: http://localhost:5000

### 3. Frontend Setup

#### Environment Variables
Create `hms-system/staff-portal/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

#### Install Dependencies
```bash
cd hms-system/staff-portal
npm install
```

#### Run Frontend Locally
```bash
npm run dev
```
Frontend will run on: http://localhost:5173

## 🌐 Deployment

### Backend Deployment (Render)

1. **Create Render Account**: https://render.com
2. **Connect GitHub Repository**
3. **Configure Environment Variables** in Render dashboard
4. **Deploy**: Render will auto-detect and deploy

**Required Environment Variables on Render:**
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `FLASK_ENV`: production
- `WHATSAPP_API_URL`: WhatsApp API URL (optional)
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp phone ID (optional)
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp access token (optional)

### Frontend Deployment (Vercel)

1. **Create Vercel Account**: https://vercel.com
2. **Connect GitHub Repository**
3. **Configure Build Settings**:
   - **Root Directory**: `hms-system/staff-portal`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Add Environment Variables**:
   - `VITE_API_URL`: Your deployed backend URL
5. **Deploy**: Vercel will build and deploy

### Database Setup (Neon)

1. **Create Neon Account**: https://neon.tech
2. **Create Database**: Get connection string
3. **Update Environment Variables**: Add `DATABASE_URL`
4. **Run Migration**: `python simple_seed.py`

## 🔐 Default Credentials

### Staff Login
| Role | Username | Password |
|------|----------|----------|
| Admin | ADM001 | password123 |
| Receptionist | REC001 | password123 |
| Doctor (Cardiology) | DOC001 | password123 |
| Doctor (General) | DOC002 | password123 |
| Pharmacist | PHM001 | password123 |
| Lab Technician | LAB001 | password123 |
| Nurse | NUR001 | password123 |
| Admission | ADM002 | password123 |
| Billing | BIL001 | password123 |

### Patient Login
| Patient ID | Password |
|------------|----------|
| PAT001 | patient123 |
| PAT002 | patient123 |
| PAT003 | patient123 |

## 📊 Database Schema

### Core Tables
- **departments**: Hospital departments
- **staff**: Staff members and roles
- **doctors**: Doctor-specific information
- **patients**: Patient records and medical history
- **appointments**: Appointment scheduling and management
- **beds**: Hospital bed management
- **admissions**: Patient admissions
- **prescriptions**: Medical prescriptions
- **lab_orders**: Laboratory test orders
- **vital_signs**: Patient vital signs
- **pending_payments**: Billing and payments

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/staff/login` - Staff login
- `POST /api/auth/patient/login` - Patient login
- `POST /api/auth/patient/register` - Patient registration

### Patients
- `GET /api/patients/` - List patients
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient

### Staff
- `GET /api/staff/` - List staff
- `GET /api/staff/{id}` - Get staff details
- `PUT /api/staff/{id}` - Update staff

### Appointments
- `GET /api/appointments/` - List appointments
- `POST /api/appointments/` - Book appointment
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Cancel appointment

### Doctors
- `GET /api/doctors/` - List doctors
- `GET /api/doctors/{id}` - Get doctor details

### Departments
- `GET /api/departments/` - List departments

### Beds
- `GET /api/beds/` - List beds
- `PUT /api/beds/{id}` - Update bed status

## 🧪 Testing

### Backend Tests
```bash
cd hms-system/backend
python -m pytest
```

### Frontend Tests
```bash
cd hms-system/staff-portal
npm test
```

## 🔄 Database Migration

### From SQLite to Neon PostgreSQL
```bash
# Run migration script
python migrate_to_neon.py

# Or reset and seed fresh data
python simple_seed.py
```

## 📱 Mobile Responsiveness

The system is fully responsive and works on:
- 📱 Mobile phones (iOS/Android)
- 💻 Tablets (iPad/Android tablets)
- 🖥️ Desktop computers

## 🔔 Notifications

### WhatsApp Integration
- Patient registration confirmations
- Appointment booking confirmations
- Appointment reminders
- Test result notifications
- Payment reminders

## 🛠️ Technologies Used

### Backend
- **Flask**: Python web framework
- **PostgreSQL**: Primary database (Neon)
- **JWT**: Authentication
- **Socket.IO**: Real-time features
- **Flask-Bcrypt**: Password hashing
- **Flask-Limiter**: Rate limiting
- **psycopg2**: PostgreSQL adapter
- **Requests**: HTTP client

### Frontend
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **React Router**: Navigation
- **Axios**: HTTP client
- **Lucide React**: Icons

### Deployment
- **Render**: Backend hosting
- **Vercel**: Frontend hosting
- **Neon**: Database hosting
- **GitHub**: Version control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@hospital.com
- 🐛 Issues: [GitHub Issues](https://github.com/aihavedainfotech/HMS-Sample/issues)
- 📖 Documentation: [Wiki](https://github.com/aihavedainfotech/HMS-Sample/wiki)

## 🔄 Version History

### Version 2.0 (Current)
- ✅ Unified frontend architecture
- ✅ Neon PostgreSQL integration
- ✅ WhatsApp notifications
- ✅ Real-time features
- ✅ Mobile-responsive design
- ✅ Multi-role staff management
- ✅ Complete appointment system
- ✅ Billing and pharmacy management

### Version 1.0 (Legacy)
- ❌ Deprecated - replaced by Version 2.0

---

## 🎉 Ready to Use!

Your Hospital Management System is now ready with:
- ✅ **Production-ready backend** on Render
- ✅ **Modern frontend** on Vercel  
- ✅ **Neon PostgreSQL** database
- ✅ **Complete test data** pre-seeded
- ✅ **WhatsApp notifications** configured
- ✅ **Multi-device support** responsive design

**Start managing your hospital efficiently!** 🏥✨
