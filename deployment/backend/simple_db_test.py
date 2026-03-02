"""
Simple PostgreSQL Connection Test
"""

import os
import psycopg2

def test_simple_connection():
    """Test simple PostgreSQL connection"""
    
    # Load environment (look in current directory or fallback to backend/.env)
    database_url = None
    # Check current dir (when running from root) and main backend folder
    env_paths = [
        '.env',
        os.path.join(os.path.dirname(__file__), '..', '..', 'hms-system', 'backend', '.env')
    ]
    for path in env_paths:
        try:
            with open(path, 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        database_url = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            continue
        if database_url:
            break
    # if still not found, fall back to environment variable
    if not database_url:
        database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise RuntimeError('DATABASE_URL not found in .env or environment')
    
    print(f"🔍 Testing connection to: {database_url}")
    
    try:
        # Direct connection
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Connected successfully!")
        print(f"📊 PostgreSQL Version: {version[0]}")
        
        # Test if we can create tables
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cursor.fetchall()
        print(f"📋 Current tables: {[table[0] for table in tables]}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_simple_connection()
    print(f"\n🎯 Result: {'SUCCESS' if success else 'FAILED'}")
