"""
Hospital Management System - PostgreSQL Verification
==================================================
Verify that all components are configured for PostgreSQL only
"""

import os
import sys
import re

def check_file_for_sqlite(file_path):
    """Check if file contains SQLite references"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        sqlite_patterns = [
            r'sqlite3',
            r'SQLite',
            r'sqlite_master',
            r'date\(',
            r'strftime',
            r'DB_PATH',
            r'\.sqlite'
        ]
        
        matches = []
        for pattern in sqlite_patterns:
            found = re.findall(pattern, content, re.IGNORECASE)
            if found:
                matches.extend(found)
        
        return matches
    except Exception as e:
        return [f"Error reading file: {e}"]

def verify_postgresql_setup():
    """Verify complete PostgreSQL setup"""
    print("🔍 PostgreSQL Setup Verification")
    print("=" * 50)
    
    # Check environment variables
    print("\n📋 Environment Variables:")
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        print(f"✅ DATABASE_URL: {database_url[:20]}...")
        if database_url.startswith('postgresql://'):
            print("✅ DATABASE_URL format is correct")
        else:
            print("❌ DATABASE_URL format is incorrect")
    else:
        print("❌ DATABASE_URL not set")
    
    # Check key files
    files_to_check = [
        'app.py',
        'config.py', 
        'database_postgres.py',
        'requirements.txt',
        '.env'
    ]
    
    print("\n📁 File Analysis:")
    all_sqlite_refs = []
    
    for file_name in files_to_check:
        file_path = file_name
        if os.path.exists(file_path):
            sqlite_refs = check_file_for_sqlite(file_path)
            if sqlite_refs:
                print(f"⚠️  {file_name}: Found SQLite references: {sqlite_refs}")
                all_sqlite_refs.extend([(file_name, ref) for ref in sqlite_refs])
            else:
                print(f"✅ {file_name}: No SQLite references found")
        else:
            print(f"❌ {file_name}: File not found")
    
    # Check for required PostgreSQL files
    required_files = [
        'postgresql_schema.sql',
        'postgresql_seed_data.sql',
        'database_postgres.py',
        'init_postgres.py'
    ]
    
    print("\n📄 Required PostgreSQL Files:")
    for file_name in required_files:
        if os.path.exists(file_name):
            print(f"✅ {file_name}")
        else:
            print(f"❌ {file_name}")
    
    # Summary
    print("\n📊 Summary:")
    if not database_url:
        print("❌ DATABASE_URL environment variable is required")
    
    if all_sqlite_refs:
        print(f"❌ Found {len(all_sqlite_refs)} SQLite references that need to be removed")
        for file_name, ref in all_sqlite_refs:
            print(f"   - {file_name}: {ref}")
    else:
        print("✅ No SQLite references found in checked files")
    
    # Check if PostgreSQL is available
    try:
        import psycopg2
        print("✅ psycopg2 module is available")
    except ImportError:
        print("❌ psycopg2 module not found")
    
    print("\n🎯 PostgreSQL Setup Status:")
    if database_url and not all_sqlite_refs:
        print("✅ Project is configured for PostgreSQL only")
        return True
    else:
        print("❌ Project still has SQLite dependencies")
        return False

if __name__ == "__main__":
    success = verify_postgresql_setup()
    sys.exit(0 if success else 1)
