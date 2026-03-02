import os
import sqlite3
from pathlib import Path

BASE_DIR = os.path.dirname(__file__)
SCHEMA_FILE = os.path.join(BASE_DIR, '../database/sqlite_schema.sql')
DB_PATH = os.environ.get('DB_PATH', os.path.join(BASE_DIR, 'hospital_db.sqlite'))

def dict_factory(cursor, row):
    """Convert SQLite row to dictionary"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def init_db():
    """Initialize SQLite database with schema and seed data."""
    print(f"Using SQLite database at: {DB_PATH}")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = dict_factory
        conn.execute("PRAGMA foreign_keys = ON")
        cursor = conn.cursor()
        
        # Check if tables already exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='departments'")
        if cursor.fetchone():
            print("Database already initialized. Skipping schema creation.")
        else:
            # Read and execute schema
            print("Creating database schema...")
            with open(SCHEMA_FILE, 'r') as f:
                schema_script = f.read()
            
            conn.executescript(schema_script)
            print("Schema created successfully.")
        
        # Seed additional staff data
        print("Seeding staff data...")
        from flask_bcrypt import Bcrypt
        from flask import Flask
        app = Flask(__name__)
        bcrypt = Bcrypt(app)
        pw_hash = bcrypt.generate_password_hash('password123').decode('utf-8')

        additional_staff = [
            ('DOC002', 'Susan', 'Smith', 'Doctor', 4, 'susan.smith@hospital.com', '9876543211', '2023-01-15'),
            ('NUR001', 'Nancy', 'Nurse', 'Nurse', 20, 'nancy.nurse@hospital.com', '9876543212', '2023-02-01'),
            ('LAB001', 'Larry', 'Lab', 'Lab_Technician', 15, 'larry.lab@hospital.com', '9876543215', '2023-03-01')
        ]

        print("Seeding additional staff data...")
        for s in additional_staff:
            cursor.execute("SELECT 1 FROM staff WHERE staff_id = ?", (s[0],))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO staff (staff_id, first_name, last_name, role, department_id, email, phone, date_of_joining, password_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, s + (pw_hash,))
        
        # Ensure all passwords are set to 'password123'
        cursor.execute("UPDATE staff SET password_hash = ?", (pw_hash,))
        conn.commit()
        print("Updated all staff passwords to 'password123'")
        
        print("SQLite database initialized successfully.")
        
        # Verify tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        print("Tables created:")
        for table in tables:
            print(f"- {table['name']}")
            
    except Exception as e:
        print(f"Error initializing SQLite database: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    init_db()
