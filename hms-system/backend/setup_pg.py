import os
import psycopg2
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from flask import Flask

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), '../database/pg_schema.sql')

def setup_pg():
    if not DATABASE_URL or not DATABASE_URL.startswith('postgresql'):
        print("DATABASE_URL is not set or not a PostgreSQL URL.")
        return

    print(f"Connecting to PostgreSQL: {DATABASE_URL}")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Read and execute schema
        print("Applying schema...")
        with open(SCHEMA_FILE, 'r') as f:
            schema_script = f.read()
        cursor.execute(schema_script)
        conn.commit()
        print("Schema applied successfully.")

        # Seed staff data
        print("Seeding staff data...")
        app = Flask(__name__)
        bcrypt = Bcrypt(app)
        pw_hash = bcrypt.generate_password_hash('password123').decode('utf-8')

        # Check if staff exists
        cursor.execute("SELECT COUNT(*) FROM staff")
        if cursor.fetchone()[0] == 0:
            staff_data = [
                ('ADM001', 'System', 'Administrator', 'admin@hospital.com', '555-1000', 'Admin', None, 'System Administrator', '2020-01-01', pw_hash),
                ('REC001', 'Priya', 'Sharma', 'priya.sharma@hospital.com', '555-1001', 'Receptionist', None, 'Senior Receptionist', '2021-03-15', pw_hash),
                ('DOC001', 'Dr. Rajiv', 'Menon', 'rajiv.menon@hospital.com', '555-2001', 'Doctor', None, 'Senior Cardiologist', '2019-05-10', pw_hash),
            ]
            for s in staff_data:
                cursor.execute("""
                    INSERT INTO staff (staff_id, first_name, last_name, email, phone, role, department_id, designation, date_of_joining, password_hash)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, s)
            conn.commit()
            print("Staff data seeded.")
        else:
            print("Staff data already exists. Skipping seed.")

        cursor.close()
        conn.close()
        print("PostgreSQL setup complete.")

    except Exception as e:
        print(f"Error setting up PostgreSQL: {e}")

if __name__ == "__main__":
    setup_pg()
