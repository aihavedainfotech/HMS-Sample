import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("DATABASE_URL not found in environment variables.")
else:
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        count = cur.fetchone()[0]
        print(f"Total tables in public schema: {count}")
        
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        print("\nTables:")
        for table in tables:
            print(f"- {table[0]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to database: {e}")
