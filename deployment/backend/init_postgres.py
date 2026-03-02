"""
Hospital Management System - PostgreSQL Database Initialization
===========================================================
Initialize PostgreSQL database with schema and seed data
"""

import os
import sys
from database_postgres import db

def init_postgres_db():
    """Initialize PostgreSQL database with schema and seed data"""
    print("Initializing PostgreSQL database...")
    
    try:
        # Test connection first
        if not db.test_connection():
            raise Exception("Database connection test failed")
        
        print("✅ PostgreSQL connection successful")
        
        # Initialize schema and seed data
        schema_file = os.path.join(os.path.dirname(__file__), 'postgresql_schema.sql')
        seed_file = os.path.join(os.path.dirname(__file__), 'postgresql_seed_data.sql')
        
        # Execute schema
        if os.path.exists(schema_file):
            print("📋 Creating database schema...")
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(schema_sql)
                conn.commit()
                print("✅ Database schema created successfully")
        
        # Execute seed data
        if os.path.exists(seed_file):
            print("🌱 Loading seed data...")
            with open(seed_file, 'r') as f:
                seed_sql = f.read()
            
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(seed_sql)
                conn.commit()
                print("✅ Seed data loaded successfully")
        
        print("🎉 PostgreSQL database initialization completed!")
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = init_postgres_db()
    sys.exit(0 if success else 1)
