"""
Test Supabase PostgreSQL Connection
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

def test_supabase_connection():
    """Test connection to Supabase PostgreSQL"""
    
    # Your DATABASE_URL
    database_url = "postgresql://postgres:Sravan.9010@db.chbluhjswhkardbvntcl.supabase.co:5432/postgres"
    
    print("🔍 Testing Supabase PostgreSQL Connection...")
    print(f"DATABASE_URL: {database_url.split('@')[1]}")  # Hide password
    
    try:
        # Try direct connection
        print("\n📡 Attempting direct connection...")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Connected successfully!")
        print(f"📊 PostgreSQL Version: {version[0]}")
        
        # Check if we can create tables
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cursor.fetchall()
        print(f"📋 Current tables: {[table[0] for table in tables]}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        
        # Try with connection parameters
        print("\n🔧 Trying with individual parameters...")
        try:
            conn = psycopg2.connect(
                host="db.chbluhjswhkardbvntcl.supabase.co",
                port=5432,
                database="postgres",
                user="postgres",
                password="Sravan.9010"
            )
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print(f"✅ Alternative connection successful! Result: {result}")
            cursor.close()
            conn.close()
            return True
            
        except Exception as e2:
            print(f"❌ Alternative connection also failed: {e2}")
            return False

if __name__ == "__main__":
    success = test_supabase_connection()
    if success:
        print("\n🎉 Supabase connection test PASSED!")
        print("You can now initialize your database with: python3 init_postgres.py")
    else:
        print("\n❌ Supabase connection test FAILED!")
        print("Please check:")
        print("1. Your Supabase project is active")
        print("2. The DATABASE_URL is correct")
        print("3. Network connectivity to Supabase")
