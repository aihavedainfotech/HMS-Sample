"""
Simple Neon Database Seeding Script
==================================
This script seeds basic test data into Neon PostgreSQL database
"""
import psycopg2
import os
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from flask import Flask
from datetime import datetime, date

load_dotenv()

NEON_DB_URL = os.getenv('DATABASE_URL')

def simple_seed():
    print("🌱 Simple seeding Neon PostgreSQL...")
    
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        print("✅ Connected to Neon PostgreSQL")
        
        # Initialize Flask for password hashing
        app = Flask(__name__)
        bcrypt = Bcrypt(app)
        
        # Clear existing data
        print("\n🗑️ Clearing existing data...")
        cursor.execute("DELETE FROM appointments")
        cursor.execute("DELETE FROM patients")
        cursor.execute("DELETE FROM doctors")
        cursor.execute("DELETE FROM beds")
        cursor.execute("DELETE FROM staff")
        cursor.execute("DELETE FROM departments")
        conn.commit()
        
        # 1. Seed Departments
        print("\n📋 Seeding departments...")
        departments = [
            ('GEN', 'General Medicine', 'General medical care', 1, '555-1001', 'general@hospital.com'),
            ('CARD', 'Cardiology', 'Heart care', 2, '555-2001', 'cardiology@hospital.com'),
            ('ORTHO', 'Orthopedics', 'Bone care', 1, '555-3001', 'ortho@hospital.com'),
            ('ADMIN', 'Administration', 'Admin', 4, '555-0001', 'admin@hospital.com'),
        ]
        
        for dept in departments:
            cursor.execute("""
                INSERT INTO departments (dept_code, dept_name, description, floor_number, contact_number, email, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, dept + (True, datetime.now(), datetime.now()))
        print("✅ Departments seeded")
        
        # Get department IDs
        cursor.execute("SELECT id, dept_code FROM departments")
        dept_map = {row[1]: row[0] for row in cursor.fetchall()}
        
        # 2. Seed Staff
        print("\n👨‍⚕️ Seeding staff...")
        default_password = bcrypt.generate_password_hash('password123').decode('utf-8')
        
        staff_data = [
            ('ADM001', 'System', 'Administrator', 'admin@hospital.com', '555-1000', 'Admin', dept_map['ADMIN'], None, 'System Administrator', '2020-01-01'),
            ('REC001', 'Priya', 'Sharma', 'priya.sharma@hospital.com', '555-1001', 'Receptionist', dept_map['ADMIN'], None, 'Senior Receptionist', '2021-03-15'),
            ('DOC001', 'Dr. Rajiv', 'Menon', 'rajiv.menon@hospital.com', '555-2001', 'Doctor', dept_map['CARD'], None, 'Senior Cardiologist', '2019-05-10'),
            ('DOC002', 'Dr. Anita', 'Desai', 'anita.desai@hospital.com', '555-2002', 'Doctor', dept_map['GEN'], None, 'General Physician', '2020-08-15'),
        ]
        
        for staff in staff_data:
            cursor.execute("""
                INSERT INTO staff (
                    staff_id, first_name, last_name, email, phone, role, department_id, sub_department,
                    designation, date_of_joining, employment_type, password_hash, is_active, last_login,
                    failed_login_attempts, locked_until, password_changed_at, mfa_enabled, mfa_secret,
                    created_by, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, staff + ('Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()))
        print("✅ Staff seeded")
        
        # 3. Seed Doctors
        print("\n🩺 Seeding doctors...")
        doctors_data = [
            ('DOC001', 'MD, DM Cardiology', 'Interventional Cardiology', 15, 'MCN-12345', 1500.00, 800.00, '{}', 'MD - AIIMS', 'FACC', 'Best Cardiologist', 'Published 25 papers', 'Senior Cardiologist', None, 4.8, 150, True, 25),
            ('DOC002', 'MD, DNB', 'Internal Medicine', 10, 'MCN-12346', 800.00, 400.00, '{}', 'MD - KMC', 'FACP', 'Excellence', 'Published 15 papers', 'General Physician', None, 4.6, 200, True, 30),
        ]
        
        for doctor in doctors_data:
            cursor.execute("""
                INSERT INTO doctors (
                    staff_id, qualifications, specialization, years_of_experience, registration_number,
                    consultation_fee, follow_up_fee, availability_schedule, education, certifications,
                    awards, publications, bio, profile_image_path, rating, total_reviews,
                    is_available_for_teleconsultation, max_patients_per_day, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, doctor + (datetime.now(), datetime.now()))
        print("✅ Doctors seeded")
        
        # 4. Seed Beds
        print("\n🛏️ Seeding beds...")
        beds_data = [
            ('BED001', 'General_Male', 'Ward A', 1, '101', False, False, False, 'Vacant', 1500.00),
            ('BED002', 'General_Female', 'Ward B', 1, '201', False, False, False, 'Vacant', 1500.00),
            ('BED003', 'Private_AC', 'Ward C', 2, '301', True, True, False, 'Vacant', 3000.00),
            ('BED004', 'ICU', 'ICU', 3, 'ICU01', True, True, True, 'Vacant', 8000.00),
        ]
        
        for bed in beds_data:
            cursor.execute("""
                INSERT INTO beds (
                    bed_id, bed_type, ward_name, floor_number, room_number, has_oxygen, has_monitor,
                    has_ventilator, status, daily_charge, current_patient_id, admission_date,
                    expected_discharge_date, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, bed + (None, None, None, datetime.now(), datetime.now()))
        print("✅ Beds seeded")
        
        # 5. Seed Simple Patients
        print("\n👥 Seeding simple patients...")
        patient_password = bcrypt.generate_password_hash('patient123').decode('utf-8')
        
        # Insert patients with only required fields
        patients_data = [
            ('PAT001', 'John', 'Doe', '1990-05-15', 'Male', 'B+', 'Single', '9876543210', 'john.doe@email.com', patient_password),
            ('PAT002', 'Jane', 'Smith', '1985-08-22', 'Female', 'A+', 'Married', '9876543212', 'jane.smith@email.com', patient_password),
            ('PAT003', 'Robert', 'Johnson', '1992-12-10', 'Male', 'O+', 'Single', '9876543214', 'robert.johnson@email.com', patient_password),
        ]
        
        for patient in patients_data:
            cursor.execute("""
                INSERT INTO patients (
                    patient_id, first_name, last_name, date_of_birth, gender, blood_group, marital_status,
                    mobile_number, email, password_hash, is_active, email_verified, phone_verified,
                    registered_by, registration_date, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, patient + (True, False, False, 'REC001', datetime.now(), datetime.now(), datetime.now()))
        print("✅ Patients seeded")
        
        # 6. Seed Sample Appointments
        print("\n📅 Seeding sample appointments...")
        appointments_data = [
            ('APT001', 'PAT001', 'DOC001', dept_map['CARD'], 'First_Consultation', date.today(), '09:00:00', '001', 'Confirmed', 'Chest pain', 1500.00, 'Paid', '9876543210'),
            ('APT002', 'PAT002', 'DOC002', dept_map['GEN'], 'Follow_up', date.today(), '10:30:00', '002', 'Confirmed', 'Follow up', 400.00, 'Paid', '9876543212'),
        ]
        
        for apt in appointments_data:
            cursor.execute("""
                INSERT INTO appointments (
                    appointment_id, patient_id, doctor_id, department_id, appointment_type,
                    appointment_date, appointment_time, token_number, status, reason_for_visit,
                    consultation_fee, payment_status, mobile_number, booked_by, booking_date,
                    booking_source, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, apt + (apt[1], datetime.now(), 'Online', datetime.now(), datetime.now()))
        print("✅ Appointments seeded")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Simple seeding completed successfully!")
        
        # Show summary
        print("\n📊 Database Summary:")
        tables = ['departments', 'staff', 'doctors', 'beds', 'patients', 'appointments']
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   {table}: {count} records")
        
        print("\n🔑 Login Credentials:")
        print("\n👨‍⚕️ STAFF LOGIN:")
        print("   Admin: ADM001 / password123")
        print("   Receptionist: REC001 / password123")
        print("   Doctor (Cardiology): DOC001 / password123")
        print("   Doctor (General): DOC002 / password123")
        
        print("\n👥 PATIENT LOGIN:")
        print("   Patient 1: PAT001 / patient123")
        print("   Patient 2: PAT002 / patient123")
        print("   Patient 3: PAT003 / patient123")
        
        print("\n🌐 URLs:")
        print("   Frontend: https://hms-sample-self.vercel.app")
        print("   Backend: https://hms-backend-1hox.onrender.com")
        print("   Patient Portal: https://hms-sample-self.vercel.app/patient/login")
        print("   Staff Portal: https://hms-sample-self.vercel.app/staff/login")
        
    except Exception as e:
        print(f"❌ Seeding error: {e}")
        conn.rollback()
    
    finally:
        conn.close()
        print("\n🔚 Database connection closed")

if __name__ == "__main__":
    simple_seed()
