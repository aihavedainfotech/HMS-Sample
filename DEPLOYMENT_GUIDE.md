# Hospital Management System - Deployment Guide

## 🚀 Free Deployment Options

### Overview
Your Hospital Management System has been successfully converted from SQLite to PostgreSQL and is ready for free deployment on various platforms.

### Current Status
- ✅ **Backend**: Running on http://localhost:5000 (SQLite for local development)
- ✅ **Patient Portal**: Ready for Vercel deployment
- ✅ **Staff Portal**: Ready for Vercel deployment
- ✅ **PostgreSQL Schema**: Converted and ready for Supabase
- ✅ **Migration Scripts**: Created for data transfer

## 📋 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION                               │
├─────────────────────────────────────────────────────────────┤
│  Patient Portal    │    Staff Portal    │   Backend API      │
│  (Vercel)          │    (Vercel)        │   (Render)         │
│  :5173             │    :5174           │   :5000            │
│                     │                   │                    │
│  React SPA         │  React SPA         │  Flask + PostgreSQL│
└────────────┬────────┴─────────┬─────────┴────────────┬────────┘
             │                  │                      │
             └──────────────────┼──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Supabase           │
                    │    PostgreSQL         │
                    │    Database           │
                    └───────────────────────┘
```

## 🌐 Step-by-Step Deployment

### 1. Set up Supabase Database

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for free tier

2. **Create New Project**
   - Click "New Project"
   - Choose organization
   - Set project name: `hms-database`
   - Set database password: `your-secure-password`
   - Choose region closest to you

3. **Get Database Credentials**
   - Go to Settings → Database
   - Copy the **Connection string**
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

### 2. Deploy Database Schema

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Set Environment Variables**
   ```bash
   export SUPABASE_PROJECT_REF=your-project-ref
   export SUPABASE_ACCESS_TOKEN=your-access-token
   ```

3. **Deploy Schema**
   ```bash
   cd deployment/backend
   chmod +x supabase_deploy.sh
   ./supabase_deploy.sh
   ```

### 3. Deploy Backend to Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up for free tier

2. **Create New Web Service**
   - Connect your GitHub repository
   - Select `deployment/backend` folder
   - Use the provided `render.yaml` configuration

3. **Set Environment Variables**
   ```
   DATABASE_URL=your-supabase-connection-string
   SECRET_KEY=your-secret-key
   JWT_SECRET_KEY=your-jwt-secret
   CORS_ORIGINS=https://your-patient-portal.vercel.app,https://your-staff-portal.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete

### 4. Deploy Frontends to Vercel

#### Patient Portal

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up for free tier

2. **Import Project**
   - Connect GitHub repository
   - Select `deployment/patient-portal` folder
   - Set environment variable: `VITE_API_URL=https://your-backend-url.onrender.com`

3. **Deploy**
   - Click "Deploy"
   - Copy the deployed URL

#### Staff Portal

1. **Import Project**
   - Connect GitHub repository
   - Select `deployment/staff-portal` folder
   - Set environment variable: `VITE_API_URL=https://your-backend-url.onrender.com`

2. **Deploy**
   - Click "Deploy"
   - Copy the deployed URL

### 5. Update CORS Settings

1. **Update Backend CORS**
   - Go to your Render dashboard
   - Update `CORS_ORIGINS` environment variable:
   ```
   https://your-patient-portal-url.vercel.app,https://your-staff-portal-url.vercel.app
   ```

2. **Restart Backend Service**

## 🔄 Data Migration (Optional)

If you want to migrate existing SQLite data to PostgreSQL:

1. **Run Migration Script**
   ```bash
   cd deployment/backend
   export DATABASE_URL=your-supabase-connection-string
   python3 migrate_sqlite_to_postgresql.py
   ```

## 📱 Access Your Deployed Application

After deployment, your application will be accessible at:

- **Patient Portal**: `https://your-patient-portal.vercel.app`
- **Staff Portal**: `https://your-staff-portal.vercel.app`
- **Backend API**: `https://your-backend-url.onrender.com`

## 🔧 Environment Variables Summary

### Backend (Render)
```bash
DATABASE_URL=postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres
SECRET_KEY=your-secure-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
CORS_ORIGINS=https://patient-portal.vercel.app,https://staff-portal.vercel.app
REGISTRATION_FEE=50.0
```

### Patient Portal (Vercel)
```bash
VITE_API_URL=https://your-backend.onrender.com
```

### Staff Portal (Vercel)
```bash
VITE_API_URL=https://your-backend.onrender.com
```

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify Supabase project is active
   - Ensure password is correct

2. **CORS Errors**
   - Update CORS_ORIGINS with correct URLs
   - Restart backend service

3. **Frontend Build Fails**
   - Check VITE_API_URL environment variable
   - Verify API endpoint is accessible

4. **Migration Issues**
   - Ensure SQLite database exists
   - Check PostgreSQL permissions

### Support Commands

```bash
# Test database connection
python3 -c "from database_hybrid import db; print(db.test_connection())"

# Check backend health
curl https://your-backend.onrender.com/api/health

# View logs
# Render: Dashboard → Logs
# Vercel: Dashboard → Logs
```

## 💰 Cost Breakdown (Free Tier)

| Service | Free Tier Limits | Cost |
|---------|------------------|------|
| Supabase | 500MB database, 2GB bandwidth | $0 |
| Render | 750 hours/month, 512MB RAM | $0 |
| Vercel | 100GB bandwidth, 100 builds | $0 |

**Total Monthly Cost: $0**

## 🔒 Security Considerations

1. **Change Default Passwords**
   - Update all staff passwords after deployment
   - Use strong passwords

2. **Environment Variables**
   - Never commit secrets to git
   - Use secure random strings

3. **Database Security**
   - Enable Row Level Security in Supabase
   - Use connection pooling

## 📈 Next Steps

1. **Monitor Performance**
   - Set up uptime monitoring
   - Monitor database usage

2. **Backup Strategy**
   - Enable automatic backups in Supabase
   - Regular database exports

3. **Scaling**
   - Upgrade plans as needed
   - Optimize database queries

## 🎉 Congratulations!

Your Hospital Management System is now deployed and ready for production use! The system includes:

- ✅ Patient registration and appointments
- ✅ Staff dashboards and management
- ✅ Real-time notifications
- ✅ Secure authentication
- ✅ Mobile-responsive design
- ✅ PostgreSQL database
- ✅ Free hosting on all tiers

For support, check the documentation files or contact your development team.
