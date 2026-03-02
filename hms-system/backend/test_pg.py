import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def test_conn():
    url = os.getenv('DATABASE_URL')
    print(f"Testing connection to: {url}")
    try:
        conn = psycopg2.connect(url)
        print("Successfully connected to PostgreSQL!")
        cur = conn.cursor()
        cur.execute("SELECT version();")
        print(f"PostgreSQL version: {cur.fetchone()}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_conn()
