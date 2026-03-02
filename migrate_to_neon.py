"""
SQLite to Neon Migration Script
================================
This script migrates data from SQLite to PostgreSQL (Neon)
"""
import sqlite3
import psycopg2
import os
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from flask import Flask
from datetime import datetime, date
import json

load_dotenv()

# Database connections
SQLITE_DB = "hospital_db.sqlite"
NEON_DB_URL = os.getenv('DATABASE_URL')

def migrate_data():
    print("🔄 Starting SQLite to Neon migration...")
    
    # Connect to SQLite
    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        sqlite_conn.row_factory = sqlite3.Row
        print("✅ Connected to SQLite database")
    except Exception as e:
        print(f"❌ SQLite connection error: {e}")
        return
    
    # Connect to Neon PostgreSQL
    try:
        neon_conn = psycopg2.connect(NEON_DB_URL)
        neon_cursor = neon_conn.cursor()
        print("✅ Connected to Neon PostgreSQL")
    except Exception as e:
        print(f"❌ Neon connection error: {e}")
        return
    
    try:
        # Initialize Flask for password hashing
        app = Flask(__name__)
        bcrypt = Bcrypt(app)
        
        # Migrate departments
        print("\n📋 Migrating departments...")
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM departments")
        departments = sqlite_cursor.fetchall()
        
        for dept in departments:
            try:
                neon_cursor.execute("""
                    INSERT INTO departments (dept_code, dept_name, description, floor_number, contact_number, email, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (dept_code) DO NOTHING
                """, (dept['dept_code'], dept['dept_name'], dept['description'], dept['floor_number'], 
                      dept['contact_number'], dept['email'], dept['is_active']))
            except Exception as e:
                print(f"⚠️ Department {dept['dept_code']} already exists or error: {e}")
        
        # Migrate patients
        print("\n👥 Migrating patients...")
        sqlite_cursor.execute("SELECT * FROM patients")
        patients = sqlite_cursor.fetchall()
        
        for patient in patients:
            try:
                neon_cursor.execute("""
                    INSERT INTO patients (
                        patient_id, first_name, middle_name, last_name, date_of_birth, gender, blood_group,
                        marital_status, mobile_number, email, emergency_contact_name, emergency_contact_number,
                        emergency_contact_relation, current_address_street, current_address_area, current_city,
                        current_state, current_pincode, permanent_address_same_as_current, permanent_address_street,
                        permanent_address_area, permanent_city, permanent_state, permanent_pincode, id_proof_type,
                        id_proof_number, id_proof_file_path, known_allergies, chronic_conditions, current_medications,
                        previous_surgeries, insurance_provider, insurance_policy_number, insurance_coverage_amount,
                        password_hash, is_active, email_verified, phone_verified, registered_by, registration_date,
                        registration_fee_paid, registration_fee_receipt
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (patient_id) DO NOTHING
                """, (
                    patient['patient_id'], patient['first_name'], patient['middle_name'], patient['last_name'],
                    patient['date_of_birth'], patient['gender'], patient['blood_group'], patient['marital_status'],
                    patient['mobile_number'], patient['email'], patient['emergency_contact_name'],
                    patient['emergency_contact_number'], patient['emergency_contact_relation'],
                    patient['current_address_street'], patient['current_address_area'], patient['current_city'],
                    patient['current_state'], patient['current_pincode'], patient['permanent_address_same_as_current'],
                    patient['permanent_address_street'], patient['permanent_address_area'], patient['permanent_city'],
                    patient['permanent_state'], patient['permanent_pincode'], patient['id_proof_type'],
                    patient['id_proof_number'], patient['id_proof_file_path'], patient['known_allergies'],
                    patient['chronic_conditions'], patient['current_medications'], patient['previous_surgeries'],
                    patient['insurance_provider'], patient['insurance_policy_number'], patient['insurance_coverage_amount'],
                    patient['password_hash'], patient['is_active'], patient['email_verified'], patient['phone_verified'],
                    patient['registered_by'], patient['registration_date'], patient['registration_fee_paid'],
                    patient['registration_fee_receipt']
                ))
            except Exception as e:
                print(f"⚠️ Patient {patient['patient_id']} already exists or error: {e}")
        
        # Migrate staff
        print("\n👨‍⚕️ Migrating staff...")
        sqlite_cursor.execute("SELECT * FROM staff")
        staff = sqlite_cursor.fetchall()
        
        for staff_member in staff:
            try:
                neon_cursor.execute("""
                    INSERT INTO staff (
                        staff_id, first_name, last_name, email, phone, role, department_id, sub_department,
                        designation, date_of_joining, employment_type, password_hash, is_active, last_login,
                        failed_login_attempts, locked_until, password_changed_at, mfa_enabled, mfa_secret,
                        created_by, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (staff_id) DO NOTHING
                """, (
                    staff_member['staff_id'], staff_member['first_name'], staff_member['last_name'],
                    staff_member['email'], staff_member['phone'], staff_member['role'], staff_member['department_id'],
                    staff_member['sub_department'], staff_member['designation'], staff_member['date_of_joining'],
                    staff_member['employment_type'], staff_member['password_hash'], staff_member['is_active'],
                    staff_member['last_login'], staff_member['failed_login_attempts'], staff_member['locked_until'],
                    staff_member['password_changed_at'], staff_member['mfa_enabled'], staff_member['mfa_secret'],
                    staff_member['created_by'], staff_member['created_at'], staff_member['updated_at']
                ))
            except Exception as e:
                print(f"⚠️ Staff {staff_member['staff_id']} already exists or error: {e}")
        
        # Add default staff if none exist
        neon_cursor.execute("SELECT COUNT(*) FROM staff")
        if neon_cursor.fetchone()[0] == 0:
            print("\n🔧 Adding default staff credentials...")
            default_password = bcrypt.generate_password_hash('password123').decode('utf-8')
            
            default_staff = [
                ('ADM001', 'System', 'Administrator', 'admin@hospital.com', '555-1000', 'Admin', None, None, 'System Administrator', '2020-01-01', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('REC001', 'Priya', 'Sharma', 'priya.sharma@hospital.com', '555-1001', 'Receptionist', None, None, 'Senior Receptionist', '2021-03-15', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('DOC001', 'Dr. Rajiv', 'Menon', 'rajiv.menon@hospital.com', '555-2001', 'Doctor', None, None, 'Senior Cardiologist', '2019-05-10', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('PHM001', 'Amit', 'Patel', 'amit.patel@hospital.com', '555-3001', 'Pharmacist', None, None, 'Senior Pharmacist', '2020-06-20', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('LAB001', 'Sneha', 'Reddy', 'sneha.reddy@hospital.com', '555-4001', 'Lab_Technician', None, None, 'Lab Technician', '2021-01-10', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('NUR001', 'Anita', 'Desai', 'anita.desai@hospital.com', '555-5001', 'Nurse', None, None, 'Senior Nurse', '2020-08-15', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('ADM002', 'Rahul', 'Verma', 'rahul.verma@hospital.com', '555-1002', 'Admission', None, None, 'Admission Officer', '2021-09-01', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
                ('BIL001', 'Kavita', 'Singh', 'kavita.singh@hospital.com', '555-6001', 'Billing', None, None, 'Billing Executive', '2020-11-20', 'Full-time', default_password, True, None, 0, None, datetime.now(), False, None, None, datetime.now(), datetime.now()),
            ]
            
            for staff_data in default_staff:
                neon_cursor.execute("""
                    INSERT INTO staff (
                        staff_id, first_name, last_name, email, phone, role, department_id, sub_department,
                        designation, date_of_joining, employment_type, password_hash, is_active, last_login,
                        failed_login_attempts, locked_until, password_changed_at, mfa_enabled, mfa_secret,
                        created_by, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, staff_data)
        
        # Migrate doctors
        print("\n🩺 Migrating doctors...")
        sqlite_cursor.execute("SELECT * FROM doctors")
        doctors = sqlite_cursor.fetchall()
        
        for doctor in doctors:
            try:
                neon_cursor.execute("""
                    INSERT INTO doctors (
                        staff_id, qualifications, specialization, years_of_experience, registration_number,
                        consultation_fee, follow_up_fee, availability_schedule, education, certifications,
                        awards, publications, bio, profile_image_path, rating, total_reviews,
                        is_available_for_teleconsultation, max_patients_per_day, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (staff_id) DO NOTHING
                """, (
                    doctor['staff_id'], doctor['qualifications'], doctor['specialization'],
                    doctor['years_of_experience'], doctor['registration_number'], doctor['consultation_fee'],
                    doctor['follow_up_fee'], doctor['availability_schedule'], doctor['education'],
                    doctor['certifications'], doctor['awards'], doctor['publications'], doctor['bio'],
                    doctor['profile_image_path'], doctor['rating'], doctor['total_reviews'],
                    doctor['is_available_for_teleconsultation'], doctor['max_patients_per_day'],
                    doctor['created_at'], doctor['updated_at']
                ))
            except Exception as e:
                print(f"⚠️ Doctor {doctor['staff_id']} already exists or error: {e}")
        
        # Migrate beds
        print("\n🛏️ Migrating beds...")
        sqlite_cursor.execute("SELECT * FROM beds")
        beds = sqlite_cursor.fetchall()
        
        for bed in beds:
            try:
                neon_cursor.execute("""
                    INSERT INTO beds (
                        bed_id, bed_type, ward_name, floor_number, room_number, has_oxygen, has_monitor,
                        has_ventilator, status, daily_charge, current_patient_id, admission_date,
                        expected_discharge_date, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (bed_id) DO NOTHING
                """, (
                    bed['bed_id'], bed['bed_type'], bed['ward_name'], bed['floor_number'], bed['room_number'],
                    bed['has_oxygen'], bed['has_monitor'], bed['has_ventilator'], bed['status'],
                    bed['daily_charge'], bed['current_patient_id'], bed['admission_date'],
                    bed['expected_discharge_date'], bed['created_at'], bed['updated_at']
                ))
            except Exception as e:
                print(f"⚠️ Bed {bed['bed_id']} already exists or error: {e}")
        
        # Add default beds if none exist
        neon_cursor.execute("SELECT COUNT(*) FROM beds")
        if neon_cursor.fetchone()[0] == 0:
            print("\n🔧 Adding default beds...")
            default_beds = [
                ('BED001', 'General_Male', 'Ward A', 1, '101', False, False, False, 'Vacant', 1500.00, None, None, None, datetime.now(), datetime.now()),
                ('BED002', 'General_Male', 'Ward A', 1, '102', False, False, False, 'Vacant', 1500.00, None, None, None, datetime.now(), datetime.now()),
                ('BED003', 'General_Female', 'Ward B', 1, '201', False, False, False, 'Vacant', 1500.00, None, None, None, datetime.now(), datetime.now()),
                ('BED004', 'General_Female', 'Ward B', 1, '202', False, False, False, 'Vacant', 1500.00, None, None, None, datetime.now(), datetime.now()),
                ('BED005', 'Private_AC', 'Ward C', 2, '301', True, True, False, 'Vacant', 3000.00, None, None, None, datetime.now(), datetime.now()),
                ('BED006', 'Private_AC', 'Ward C', 2, '302', True, True, False, 'Vacant', 3000.00, None, None, None, datetime.now(), datetime.now()),
                ('BED007', 'ICU', 'ICU', 3, 'ICU01', True, True, True, 'Vacant', 8000.00, None, None, None, datetime.now(), datetime.now()),
                ('BED008', 'ICU', 'ICU', 3, 'ICU02', True, True, True, 'Vacant', 8000.00, None, None, None, datetime.now(), datetime.now()),
            ]
            
            for bed_data in default_beds:
                neon_cursor.execute("""
                    INSERT INTO beds (
                        bed_id, bed_type, ward_name, floor_number, room_number, has_oxygen, has_monitor,
                        has_ventilator, status, daily_charge, current_patient_id, admission_date,
                        expected_discharge_date, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, bed_data)
        
        # Migrate appointments
        print("\n📅 Migrating appointments...")
        sqlite_cursor.execute("SELECT * FROM appointments")
        appointments = sqlite_cursor.fetchall()
        
        for appointment in appointments:
            try:
                neon_cursor.execute("""
                    INSERT INTO appointments (
                        appointment_id, patient_id, doctor_id, department_id, appointment_type,
                        appointment_date, appointment_time, time_slot, token_number, status, reason_for_visit,
                        consultation_mode, special_requirements, booked_by, booking_date, booking_source,
                        approved_by, approved_at, rejection_reason, consultation_start_time, consultation_end_time,
                        consultation_fee, payment_status, payment_mode, payment_transaction_id, mobile_number,
                        symptoms, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (appointment_id) DO NOTHING
                """, (
                    appointment['appointment_id'], appointment['patient_id'], appointment['doctor_id'],
                    appointment['department_id'], appointment['appointment_type'], appointment['appointment_date'],
                    appointment['appointment_time'], appointment['time_slot'], appointment['token_number'],
                    appointment['status'], appointment['reason_for_visit'], appointment['consultation_mode'],
                    appointment['special_requirements'], appointment['booked_by'], appointment['booking_date'],
                    appointment['booking_source'], appointment['approved_by'], appointment['approved_at'],
                    appointment['rejection_reason'], appointment['consultation_start_time'],
                    appointment['consultation_end_time'], appointment['consultation_fee'], appointment['payment_status'],
                    appointment['payment_mode'], appointment['payment_transaction_id'], appointment['mobile_number'],
                    appointment['symptoms'], appointment['created_at'], appointment['updated_at']
                ))
            except Exception as e:
                print(f"⚠️ Appointment {appointment['appointment_id']} already exists or error: {e}")
        
        # Commit all changes
        neon_conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Show summary
        print("\n📊 Migration Summary:")
        tables = ['departments', 'patients', 'staff', 'doctors', 'beds', 'appointments']
        for table in tables:
            neon_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = neon_cursor.fetchone()[0]
            print(f"   {table}: {count} records")
        
        print("\n🔑 Default Staff Credentials:")
        print("   Admin: ADM001 / password123")
        print("   Receptionist: REC001 / password123")
        print("   Doctor: DOC001 / password123")
        print("   Pharmacist: PHM001 / password123")
        print("   Lab Technician: LAB001 / password123")
        print("   Nurse: NUR001 / password123")
        print("   Admission: ADM002 / password123")
        print("   Billing: BIL001 / password123")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        neon_conn.rollback()
    
    finally:
        sqlite_conn.close()
        neon_conn.close()
        print("\n🔚 Database connections closed")

if __name__ == "__main__":
    migrate_data()
