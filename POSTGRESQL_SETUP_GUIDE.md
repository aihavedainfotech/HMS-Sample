# PostgreSQL Database Setup Guide

## 🚀 Recommended Options for HMS

### Option 1: Supabase (Easiest & Free) ⭐ RECOMMENDED

**Why Supabase?**
- ✅ Completely free for development and small projects
- ✅ Managed PostgreSQL - no installation required
- ✅ Built-in authentication and real-time features
- ✅ Easy web interface
- ✅ Perfect for deployment

#### Step-by-Step Supabase Setup:

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project" 
   - Sign up with GitHub/Google

2. **Create New Project**
   - Click "New Project"
   - Choose organization (or create new)
   - **Project name**: `hospital-management-system`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - Click "Create new project"

3. **Get Database Credentials**
   - Wait for project to be created (2-3 minutes)
   - Go to **Settings** → **Database**
   - Copy the **Connection string**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

4. **Set Environment Variable**
   ```bash
   export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

5. **Initialize Database**
   ```bash
   cd deployment/backend
   python3 init_postgres.py
   ```

---

### Option 2: Local PostgreSQL Installation

#### Ubuntu/Debian Setup:

1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Start PostgreSQL Service**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Create Database and User**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # In PostgreSQL shell:
   CREATE DATABASE hospital_db;
   CREATE USER hms_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hms_user;
   ALTER USER hms_user CREATEDB;
   \q
   ```

4. **Set Environment Variable**
   ```bash
   export DATABASE_URL="postgresql://hms_user:your_secure_password@localhost:5432/hospital_db"
   ```

5. **Initialize Database**
   ```bash
   cd deployment/backend
   python3 init_postgres.py
   ```

#### macOS Setup:

1. **Install with Homebrew**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```

2. **Create Database**
   ```bash
   createdb hospital_db
   ```

3. **Set Environment Variable**
   ```bash
   export DATABASE_URL="postgresql://$USER@localhost:5432/hospital_db"
   ```

#### Windows Setup:

1. **Download and Install**
   - Go to [postgresql.org](https://postgresql.org/download/windows/)
   - Download and run installer
   - Remember password you set during installation

2. **Create Database**
   ```cmd
   # Open SQL Shell (psql)
   CREATE DATABASE hospital_db;
   \q
   ```

3. **Set Environment Variable**
   ```cmd
   set DATABASE_URL="postgresql://postgres:your_password@localhost:5432/hospital_db"
   ```

---

### Option 3: Docker PostgreSQL

1. **Create Docker Compose File**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: hospital_db
         POSTGRES_USER: hms_user
         POSTGRES_PASSWORD: your_secure_password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   volumes:
     postgres_data:
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

3. **Set Environment Variable**
   ```bash
   export DATABASE_URL="postgresql://hms_user:your_secure_password@localhost:5432/hospital_db"
   ```

---

## 🔧 Database Initialization

After setting up PostgreSQL and setting DATABASE_URL:

1. **Test Connection**
   ```bash
   cd deployment/backend
   python3 -c "from database_postgres import db; print('✅ Connected to PostgreSQL!' if db.test_connection() else '❌ Connection failed')"
   ```

2. **Initialize Schema**
   ```bash
   python3 init_postgres.py
   ```

3. **Start Backend**
   ```bash
   python3 app.py
   ```

---

## 🌐 Connecting from Different Environments

### Local Development
```bash
export DATABASE_URL="postgresql://hms_user:password@localhost:5432/hospital_db"
```

### Supabase Production
```bash
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Railway/Render
```bash
# Set in environment variables:
DATABASE_URL=postgresql://username:password@host:port/database
```

---

## 🛠️ Common Issues & Solutions

### Issue: "Connection refused"
**Solution**: Make sure PostgreSQL is running
```bash
# Ubuntu/Debian
sudo systemctl status postgresql
sudo systemctl start postgresql

# macOS
brew services list
brew services start postgresql
```

### Issue: "Database does not exist"
**Solution**: Create the database
```bash
# Local PostgreSQL
sudo -u postgres createdb hospital_db

# Or with psql
psql -U postgres -c "CREATE DATABASE hospital_db;"
```

### Issue: "Permission denied"
**Solution**: Grant proper permissions
```sql
GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hms_user;
```

### Issue: "Password authentication failed"
**Solution**: Check credentials in DATABASE_URL
- Verify username and password
- Make sure user exists in PostgreSQL

---

## 📊 Database Management Tools

### GUI Tools:
- **pgAdmin** - Official PostgreSQL GUI
- **DBeaver** - Universal database tool
- **Supabase Dashboard** - Web interface for Supabase

### Command Line:
```bash
# Connect to database
psql -U hms_user -d hospital_db -h localhost

# Common commands
\l                    # List databases
\dt                   # List tables
\d table_name         # Describe table
\q                    # Quit
```

---

## 🚀 Quick Start (Supabase - Recommended)

```bash
# 1. Get your Supabase DATABASE_URL from dashboard
# 2. Set environment variable
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 3. Initialize database
cd deployment/backend
python3 init_postgres.py

# 4. Start backend
python3 app.py
```

---

## 🎯 Recommendation

**For your Hospital Management System:**

1. **Development**: Use **Supabase** (easiest, free, managed)
2. **Production**: **Supabase** or **Render PostgreSQL**
3. **Local Testing**: **Docker PostgreSQL** (consistent environment)

Supabase is highly recommended because:
- ✅ No installation required
- ✅ Free tier available
- ✅ Easy backup and management
- ✅ Built-in security features
- ✅ Perfect for both development and production

Choose Supabase for the smoothest experience! 🚀
