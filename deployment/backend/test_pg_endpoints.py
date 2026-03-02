"""
Test PostgreSQL endpoints directly
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def test_direct_pg_query():
    """Test direct PostgreSQL query"""
    database_url = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Test departments query
        cursor.execute("SELECT * FROM departments LIMIT 5")
        departments = cursor.fetchall()
        
        print("✅ PostgreSQL Direct Query Test:")
        print(f"Found {len(departments)} departments:")
        for dept in departments:
            print(f"  - {dept['dept_name']} ({dept['dept_code']})")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Direct query failed: {e}")
        return False

if __name__ == "__main__":
    test_direct_pg_query()
