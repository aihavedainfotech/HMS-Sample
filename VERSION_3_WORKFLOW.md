# HMS System - Version 3 Development Workflow
## Project Structure & Deployment Architecture

---

## 📁 PROJECT STRUCTURE

```
HMS-Sample/                          # GitHub Repository Root
├── hms-system/
│   ├── backend/                       # Flask Backend (Render)
│   │   ├── app.py                     # Main Flask Application
│   │   ├── hospital_db.sqlite         # SQLite Database
│   │   ├── requirements.txt           # Python Dependencies
│   │   ├── config.py                  # Configuration Settings
│   │   ├── init_db.py                 # Database Initialization
│   │   ├── seed_db.py                 # Sample Data Seeding
│   │   └── venv/                      # Python Virtual Environment
│   │
│   ├── frontend/                      # React + Vite Frontend (Vercel)
│   │   ├── src/
│   │   │   ├── App.tsx                # Main React Router
│   │   │   ├── components/
│   │   │   │   ├── HospitalNavbar.tsx # Patient Portal Navbar
│   │   │   │   └── ui/                # UI Components
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx           # Patient Portal Landing
│   │   │   │   ├── auth/
│   │   │   │   │   ├── PatientLogin.tsx
│   │   │   │   │   ├── PatientRegister.tsx
│   │   │   │   │   └── StaffLogin.tsx
│   │   │   │   └── dashboard/         # Role Dashboards
│   │   │   ├── contexts/
│   │   │   │   └── AuthContext.tsx
│   │   │   └── layouts/               # Dashboard Layouts
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── vercel.json                # Vercel Routing Config
│   │
│   ├── staff-portal/                  # Original Staff Portal (Deprecated)
│   └── patient-portal/                # Original Patient Portal (Deprecated)
│
├── .gitignore
├── README.md
└── package.json
```

---

## 🚀 CURRENT DEPLOYMENT ARCHITECTURE

### **Version 1 (Current - This Laptop)**
| Component | Platform | URL | Status |
|-----------|----------|-----|--------|
| **Frontend** | Vercel | https://hms-sample-self.vercel.app | ✅ Live |
| **Backend** | Render | https://hms-backend-1hox.onrender.com | ✅ Live |
| **Database** | SQLite (file) | hospital_db.sqlite | ✅ Connected |

### **Deployment Flow:**
```
GitHub Repository
       ↓
Vercel (Frontend Auto-Deploy)
       ↓
Render (Backend Auto-Deploy)
       ↓
Live URLs
```

---

## 💻 VERSION 3 DEVELOPMENT WORKFLOW

### **Setup New Laptop (Version 3 Development)**

#### **Step 1: Clone Repository**
```bash
# Open terminal/PowerShell
cd Documents  # or your preferred folder
git clone https://github.com/aihavedainfotech/HMS-Sample.git
cd HMS-Sample
```

#### **Step 2: Setup Frontend (Vercel)**
```bash
cd hms-system/frontend

# Install dependencies
npm install

# Create local environment file
echo "VITE_API_URL=https://hms-backend-1hox.onrender.com" > .env.local

# Run local development server
npm run dev
```
**Local URL:** http://localhost:5173

#### **Step 3: Setup Backend (Optional - for local testing)**
```bash
cd hms-system/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run local server
python app.py
```
**Local URL:** http://localhost:5000

---

## 🔧 MAKING CODE CHANGES (Version 3)

### **Workflow for Version 3:**

#### **1. Create Feature Branch (Recommended)**
```bash
# Create and switch to new branch
git checkout -b version-3-feature-name
```

#### **2. Make Your Changes**
- Edit files in `hms-system/frontend/src/`
- Edit files in `hms-system/backend/`
- Test locally with `npm run dev`

#### **3. Commit Changes**
```bash
# Check what changed
git status

# Add specific files
git add hms-system/frontend/src/App.tsx

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "Version 3: Add new patient dashboard features

- Add appointment booking system
- Update patient login UI
- Add doctor availability check
- Fix routing issues"
```

#### **4. Push to GitHub**
```bash
# Push to your branch
git push origin version-3-feature-name

# Or if on main branch
git push origin main
```

---

## 🚀 DEPLOYMENT TO VERCEL

### **Option 1: Automatic Deployment (Recommended)**
Vercel automatically deploys when you push to GitHub.

1. Push code to GitHub
2. Vercel detects changes
3. Auto-build and deploy
4. Live at: https://hms-sample-self.vercel.app

### **Option 2: Manual Deployment (From New Laptop)**

#### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

#### **Step 2: Login to Vercel**
```bash
vercel login
# Use your Vercel account credentials
```

#### **Step 3: Link to Existing Project**
```bash
cd hms-system/frontend

# Link to existing hms-sample project
vercel link
# Select: aihavedainfotechs-projects/hms-sample
```

#### **Step 4: Deploy**
```bash
# Deploy to production
vercel --prod

# Or with token (if configured)
vercel --prod --token YOUR_VERCEL_TOKEN
```

---

## 📋 VERSION 3 CHECKLIST

### **Before Starting Version 3:**
- [ ] Clone repo on new laptop
- [ ] Install frontend dependencies (`npm install`)
- [ ] Run local dev server (`npm run dev`)
- [ ] Verify local server works at localhost:5173
- [ ] Check current deployment URLs work

### **During Development:**
- [ ] Create feature branch: `git checkout -b version-3`
- [ ] Make code changes
- [ ] Test locally
- [ ] Commit regularly with clear messages
- [ ] Push to GitHub

### **Deployment:**
- [ ] Push final changes to main branch
- [ ] Verify Vercel auto-deployment
- [ ] Test live URLs
- [ ] Commit deployment notes

---

## 🔗 IMPORTANT URLS & CREDENTIALS

### **Live URLs:**
- **Frontend:** https://hms-sample-self.vercel.app
- **Backend:** https://hms-backend-1hox.onrender.com
- **GitHub:** https://github.com/aihavedainfotech/HMS-Sample

### **Routes:**
- `/` → Patient Portal (Default)
- `/staff` → Staff Portal
- `/patient/login` → Patient Login
- `/services` → Hospital Services
- `/doctors` → Doctors Directory

### **Database:**
- **File:** `hospital_db.sqlite`
- **Type:** SQLite3
- **Location:** `hms-system/backend/`

---

## ⚠️ VERSION 3 DEVELOPMENT NOTES

### **Key Files to Modify:**
1. **Frontend Routing:** `hms-system/frontend/src/App.tsx`
2. **Patient Portal:** `hms-system/frontend/src/pages/Home.tsx`
3. **Staff Login:** `hms-system/frontend/src/pages/auth/StaffLogin.tsx`
4. **Patient Login:** `hms-system/frontend/src/pages/auth/PatientLogin.tsx`
5. **Backend API:** `hms-system/backend/app.py`

### **Git Commands Cheat Sheet:**
```bash
git clone https://github.com/aihavedainfotech/HMS-Sample.git
git checkout -b version-3
git add .
git commit -m "Version 3 changes"
git push origin version-3
git pull origin main
git merge main
```

### **NPM Commands:**
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 🎯 SUMMARY

### **Current Status:**
- ✅ Version 1 deployed and working
- ✅ Version 2 exists on another laptop
- 🔄 Version 3 being developed on new laptop

### **Next Steps for Version 3:**
1. **New Laptop:** Clone repo, setup environment
2. **Development:** Make changes, test locally
3. **Version Control:** Commit and push to GitHub
4. **Deployment:** Vercel auto-deploys from GitHub
5. **Testing:** Verify live URLs work

### **Three Laptop Workflow:**
```
Laptop 1 (Version 1) → GitHub → Vercel/Render
Laptop 2 (Version 2) → GitHub → Vercel/Render  
Laptop 3 (Version 3) → GitHub → Vercel/Render
```

**All laptops push to same GitHub repo → Auto-deploy to same Vercel/Render URLs!**

---

## ❓ NEED HELP?

Common issues and solutions:
- **404 errors:** Check vercel.json routing
- **Build fails:** Run `npm install` again
- **Database issues:** Check hospital_db.sqlite exists
- **Login fails:** Verify backend URL in .env.local
- **Routing issues:** Check App.tsx route configuration
