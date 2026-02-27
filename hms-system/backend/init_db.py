import sqlite3
import os

DB_FILE = 'hospital_db.sqlite'
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), '../database/sqlite_schema.sql')

def init_db():
    if os.path.exists(DB_FILE):
        print(f"Removing existing database: {DB_FILE}")
        os.remove(DB_FILE)

    print(f"Creating new database: {DB_FILE}")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    with open(SCHEMA_FILE, 'r') as f:
        schema_script = f.read()

    try:
        cursor.executescript(schema_script)
        
        # Seed Staff Data
        print("Seeding staff data...")
        from flask_bcrypt import Bcrypt
        from flask import Flask
        app = Flask(__name__)
        bcrypt = Bcrypt(app)
        pw_hash = bcrypt.generate_password_hash('password123').decode('utf-8')

        # Schema already seeds: ADM001, REC001, DOC001, PHR001
        # We need to add: Nurse, Lab Tech, Another Doctor
        
        # Department IDs based on schema order:
        # 1: Cardiology, 4: Pediatrics, 15: Pathology (Lab), 20: Nursing
        
        additional_staff = [
            ('DOC002', 'Susan', 'Smith', 'Doctor', 4, 'susan.smith@hospital.com', '9876543211'), # Pediatrics
            ('NUR001', 'Nancy', 'Nurse', 'Nurse', 20, 'nancy.nurse@hospital.com', '9876543212'),
            ('LAB001', 'Larry', 'Lab', 'Lab_Technician', 15, 'larry.lab@hospital.com', '9876543215')
        ]

        print("Seeding additional staff data...")
        for s in additional_staff:
            cursor.execute("SELECT 1 FROM staff WHERE staff_id = ?", (s[0],))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO staff (staff_id, first_name, last_name, role, department_id, email, phone, password_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, s + (pw_hash,))
        
        # Ensure all passwords (including schema-seeded ones) are set to 'password123'
        # The schema might have a different hash or hardcoded one. Let's overwrite to be sure.
        cursor.execute("UPDATE staff SET password_hash = ?", (pw_hash,))
        print("Updated all staff passwords to 'password123'")

        conn.commit()
        print("Database initialized successfully.")
        
        # Verify tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables created:")
        for table in tables:
            print(f"- {table[0]}")
            
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
