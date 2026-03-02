# Supabase Connection Troubleshooting

## 🚨 Current Issue: Network Unreachable

**Error**: `Network is unreachable` when connecting to `db.chbluhjswhkardbvntcl.supabase.co`

**Root Cause**: Your network environment cannot reach Supabase servers (possibly IPv6 routing issue)

---

## 🔧 Troubleshooting Steps

### 1. Verify Supabase Project Status
- Go to your [Supabase Dashboard](https://supabase.com/dashboard)
- Check that your project is **Active** (not paused)
- Verify the project URL and connection string

### 2. Test Network Connectivity
```bash
# Try different connection methods
curl -I https://supabase.com
ping db.chbluhjswhkardbvntcl.supabase.co

# Check DNS resolution
nslookup db.chbluhjswhkardbvntcl.supabase.co
```

### 3. Try IPv4 Only Connection
Create a modified connection string that forces IPv4:
```python
# In your database connection, add this parameter:
psycopg2.connect(
    database_url,
    connect_timeout=10,
    options="-c host=64.23.220.123"  # Force IPv4 if needed
)
```

---

## 🚀 Alternative Solutions

### Option 1: Local PostgreSQL (Recommended for now)
Since Supabase isn't accessible, set up a local PostgreSQL:

```bash
# Install PostgreSQL
sudo apt update && sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb hospital_db
sudo -u postgres psql -c "CREATE USER hms_user WITH PASSWORD 'Sravan.9010';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hms_user;"

# Set local DATABASE_URL
export DATABASE_URL="postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db"

# Initialize database
cd deployment/backend
python3 init_postgres.py
```

### Option 2: Docker PostgreSQL
```bash
# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: hospital_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: Sravan.9010
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:Sravan.9010@localhost:5432/hospital_db"

# Initialize
python3 init_postgres.py
```

### Option 3: Railway PostgreSQL
1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Get connection string from Railway
4. Update your DATABASE_URL

---

## 🔄 Migration Plan

### Step 1: Get PostgreSQL Working Locally
```bash
# Use one of the alternative solutions above
# Verify connection works:
python3 test_supabase_connection.py  # Should pass with local DB
```

### Step 2: Initialize Database
```bash
cd deployment/backend
python3 init_postgres.py
```

### Step 3: Start Backend
```bash
python3 app.py
```

### Step 4: Deploy to Supabase Later
Once network issues are resolved:
1. Export data from local PostgreSQL
2. Import to Supabase
3. Update DATABASE_URL
4. Deploy to production

---

## 🛠️ Network Fixes to Try

### Force IPv4 in Python
```python
import socket
# Force IPv4
socket.getaddrinfo = lambda *args, **kwargs: [
    (socket.AF_INET, socket.SOCK_STREAM, 6, '', (args[0], args[1]))
]
```

### Check Firewall
```bash
# Check if firewall is blocking
sudo ufw status
# Allow PostgreSQL port if needed
sudo ufw allow 5432
```

### Use HTTP Tunnel (Advanced)
If you have SSH access to a server that can reach Supabase:
```bash
# Create SSH tunnel
ssh -L 5432:db.chbluhjswhkardbvntcl.supabase.co:5432 user@server
# Then connect to localhost:5432
```

---

## 📊 Quick Test Commands

```bash
# Test 1: Basic connectivity
curl -v https://db.chbluhjswhkardbvntcl.supabase.co:5432

# Test 2: DNS resolution
dig db.chbluhjswhkardbvntcl.supabase.co

# Test 3: Local PostgreSQL (if installed)
psql -U postgres -h localhost -c "SELECT version();"

# Test 4: Python connection test
cd deployment/backend
python3 test_supabase_connection.py
```

---

## 🎯 Recommendation

**For now, use Local PostgreSQL** to get your system running:

1. Install PostgreSQL locally
2. Create the database
3. Initialize with your schema
4. Start the backend
5. Work on resolving Supabase connectivity later

This way you can:
✅ Get your HMS running immediately  
✅ Test all PostgreSQL features  
✅ Debug any SQL query issues  
✅ Deploy to Supabase when network is fixed

**Your system will work perfectly with local PostgreSQL and be ready for Supabase deployment!**
