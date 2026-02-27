
import sqlite3
from flask_bcrypt import Bcrypt
from flask import Flask

app = Flask(__name__)
bcrypt = Bcrypt(app)

db_path = '/home/ubuntu/Downloads/kimi_clone/hms-system/database/hms.db'

def seed_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add Staff
    pass_hash = bcrypt.generate_password_hash('password123').decode('utf-8')
    cursor.execute("""
        INSERT OR IGNORE INTO staff (staff_id, first_name, last_name, role, email, password_hash, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ('DOC001', 'Doctor', 'One', 'Doctor', 'doctor@hospital.com', pass_hash, 1))

    # Add Doctor Profile (to match common queries)
    cursor.execute("""
        INSERT OR IGNORE INTO doctors (staff_id, specialization)
        VALUES (?, ?)
    """, ('DOC001', 'General Medicine'))
    
    # Add Patient
    # Column check: gender, blood_group, mobile_number, email, password_hash, is_active
    cursor.execute("""
        INSERT OR IGNORE INTO patients (patient_id, first_name, last_name, gender, blood_group, mobile_number, email, password_hash, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ('P0099', 'Test', 'Patient', 'Male', 'A+', '9999999999', 'patient@test.com', pass_hash, 1))
    
    conn.commit()
    conn.close()
    print("Database seeded with DOC001 and P0099")

if __name__ == "__main__":
    with app.app_context():
        seed_db()
