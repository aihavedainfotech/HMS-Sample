"""
Neon Database Reset and Seeding Script
======================================
This script clears existing data and seeds fresh test data
"""
import psycopg2
import os
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from flask import Flask
from datetime import datetime, date
import random

load_dotenv()

NEON_DB_URL = os.getenv('DATABASE_URL')

def reset_and_seed():
    print("🔄 Resetting and seeding Neon PostgreSQL...")
    
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        cursor = conn.cursor()
        print("✅ Connected to Neon PostgreSQL")
        
        # Initialize Flask for password hashing
        app = Flask(__name__)
        bcrypt = Bcrypt(app)
        
        # Clear existing data (in order of dependencies)
        print("\n🗑️ Clearing existing data...")
        tables_to_clear = ['appointments', 'patients', 'doctors', 'beds', 'staff', 'departments']
        for table in tables_to_clear:
            cursor.execute(f"DELETE FROM {table}")
            print(f"   Cleared {table}")
        conn.commit()
        
        # 1. Seed Departments
        print("\n📋 Seeding departments...")
        departments = [
            ('GEN', 'General Medicine', 'General medical care and consultations', 1, '555-1001', 'general@hospital.com'),
            ('CARD', 'Cardiology', 'Heart and cardiovascular care', 2, '555-2001', 'cardiology@hospital.com'),
            ('ORTHO', 'Orthopedics', 'Bone and joint treatments', 1, '555-3001', 'ortho@hospital.com'),
            ('PED', 'Pediatrics', 'Child healthcare', 3, '555-4001', 'pediatrics@hospital.com'),
            ('GYNAE', 'Gynecology', 'Women healthcare', 3, '555-5001', 'gynae@hospital.com'),
            ('EMERGENCY', 'Emergency', 'Emergency medical care', 1, '555-9999', 'emergency@hospital.com'),
            ('PHARMACY', 'Pharmacy', 'Medicine dispensing', 1, '555-6001', 'pharmacy@hospital.com'),
            ('LAB', 'Laboratory', 'Pathology and diagnostics', 2, '555-7001', 'lab@hospital.com'),
            ('RADIO', 'Radiology', 'X-ray and imaging', 2, '555-8001', 'radio@hospital.com'),
            ('ADMIN', 'Administration', 'Hospital administration', 4, '555-0001', 'admin@hospital.com'),
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
            ('DOC003', 'Dr. Vikram', 'Singh', 'vikram.singh@hospital.com', '555-2003', 'Doctor', dept_map['ORTHO'], None, 'Orthopedic Surgeon', '2021-01-20'),
            ('DOC004', 'Dr. Meera', 'Patel', 'meera.patel@hospital.com', '555-2004', 'Doctor', dept_map['PED'], None, 'Pediatrician', '2020-11-10'),
            ('DOC005', 'Dr. Kavita', 'Reddy', 'kavita.reddy@hospital.com', '555-2005', 'Doctor', dept_map['GYNAE'], None, 'Gynecologist', '2019-09-05'),
            ('PHM001', 'Amit', 'Patel', 'amit.patel@hospital.com', '555-3001', 'Pharmacist', dept_map['PHARMACY'], None, 'Senior Pharmacist', '2020-06-20'),
            ('LAB001', 'Sneha', 'Reddy', 'sneha.reddy@hospital.com', '555-4001', 'Lab_Technician', dept_map['LAB'], None, 'Lab Technician', '2021-01-10'),
            ('NUR001', 'Anita', 'Sharma', 'anita.sharma@hospital.com', '555-5001', 'Nurse', dept_map['GEN'], None, 'Senior Nurse', '2020-08-15'),
            ('ADM002', 'Rahul', 'Verma', 'rahul.verma@hospital.com', '555-1002', 'Admission', dept_map['ADMIN'], None, 'Admission Officer', '2021-09-01'),
            ('BIL001', 'Kavita', 'Singh', 'kavita.singh@hospital.com', '555-6001', 'Billing', dept_map['ADMIN'], None, 'Billing Executive', '2020-11-20'),
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
            ('DOC001', 'MD, DM Cardiology', 'Interventional Cardiology', 15, 'MCN-12345', 1500.00, 800.00, '{"monday": "9-5", "tuesday": "9-5", "wednesday": "9-5", "thursday": "9-5", "friday": "9-5"}', 'MD - AIIMS, DM - CMC Vellore', 'FACC, FCSI', 'Best Cardiologist Award 2020', 'Published 25 papers', 'Senior Interventional Cardiologist with expertise in complex coronary interventions', None, 4.8, 150, True, 25),
            ('DOC002', 'MD, DNB', 'Internal Medicine', 10, 'MCN-12346', 800.00, 400.00, '{"monday": "9-6", "tuesday": "9-6", "wednesday": "9-6", "thursday": "9-6", "friday": "9-6"}', 'MD - KMC, DNB - Apollo', 'FACP', 'Excellence in Primary Care', 'Published 15 papers', 'Experienced General Physician with expertise in chronic disease management', None, 4.6, 200, True, 30),
            ('DOC003', 'MS, DNB Ortho', 'Joint Replacement Surgery', 12, 'MCN-12347', 1200.00, 600.00, '{"monday": "8-4", "tuesday": "8-4", "wednesday": "8-4", "thursday": "8-4", "friday": "8-4"}', 'MS - JIPMER, DNB - Apollo', 'FAAOS', 'Best Orthopedic Surgeon 2021', 'Published 20 papers', 'Expert in joint replacement and arthroscopic surgery', None, 4.7, 180, True, 20),
            ('DOC004', 'MD, DCH', 'Pediatrics', 8, 'MCN-12348', 600.00, 300.00, '{"monday": "9-5", "tuesday": "9-5", "wednesday": "9-5", "thursday": "9-5", "friday": "9-5"}', 'MD - BMC, DCH - KEM', 'FAPP', 'Best Pediatrician Award 2022', 'Published 10 papers', 'Specialized in neonatal care and pediatric emergencies', None, 4.9, 120, True, 25),
            ('DOC005', 'MS, DNB Gynae', 'High-Risk Pregnancy', 10, 'MCN-12349', 1000.00, 500.00, '{"monday": "9-6", "tuesday": "9-6", "wednesday": "9-6", "thursday": "9-6", "friday": "9-6"}', 'MS - GMC, DNB - Apollo', 'FOGSI', 'Best Gynecologist 2021', 'Published 18 papers', 'Expert in high-risk pregnancy and minimally invasive gynecological surgery', None, 4.8, 160, True, 22),
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
            # General Male Ward
            ('BED001', 'General_Male', 'Ward A', 1, '101', False, False, False, 'Vacant', 1500.00),
            ('BED002', 'General_Male', 'Ward A', 1, '102', False, False, False, 'Vacant', 1500.00),
            ('BED003', 'General_Male', 'Ward A', 1, '103', False, False, False, 'Vacant', 1500.00),
            ('BED004', 'General_Male', 'Ward A', 1, '104', False, False, False, 'Vacant', 1500.00),
            # General Female Ward
            ('BED005', 'General_Female', 'Ward B', 1, '201', False, False, False, 'Vacant', 1500.00),
            ('BED006', 'General_Female', 'Ward B', 1, '202', False, False, False, 'Vacant', 1500.00),
            ('BED007', 'General_Female', 'Ward B', 1, '203', False, False, False, 'Vacant', 1500.00),
            ('BED008', 'General_Female', 'Ward B', 1, '204', False, False, False, 'Vacant', 1500.00),
            # Private Rooms
            ('BED009', 'Private_AC', 'Ward C', 2, '301', True, True, False, 'Vacant', 3000.00),
            ('BED010', 'Private_AC', 'Ward C', 2, '302', True, True, False, 'Vacant', 3000.00),
            ('BED011', 'Private_AC', 'Ward C', 2, '303', True, True, False, 'Vacant', 3000.00),
            ('BED012', 'Private_Non_AC', 'Ward C', 2, '304', False, True, False, 'Vacant', 2000.00),
            # ICU
            ('BED013', 'ICU', 'ICU', 3, 'ICU01', True, True, True, 'Vacant', 8000.00),
            ('BED014', 'ICU', 'ICU', 3, 'ICU02', True, True, True, 'Vacant', 8000.00),
            ('BED015', 'ICU', 'ICU', 3, 'ICU03', True, True, True, 'Vacant', 8000.00),
            ('BED016', 'ICU', 'ICU', 3, 'ICU04', True, True, True, 'Vacant', 8000.00),
            # NICU
            ('BED017', 'NICU', 'NICU', 3, 'NICU01', True, True, True, 'Vacant', 10000.00),
            ('BED018', 'NICU', 'NICU', 3, 'NICU02', True, True, True, 'Vacant', 10000.00),
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
        
        # 5. Seed Test Patients
        print("\n👥 Seeding test patients...")
        patient_password = bcrypt.generate_password_hash('patient123').decode('utf-8')
        
        patients_data = [
            ('PAT001', 'John', None, 'Doe', '1990-05-15', 'Male', 'B+', 'Single', '9876543210', 'john.doe@email.com', 'Jane Doe', '9876543211', 'Wife', '123 Main St', 'Area 1', 'Mumbai', 'Maharashtra', '400001', True, None, None, None, None, None, 'Aadhar', '123456789012', None, 'None', 'None', 'None', 'None', 'Star Health', 'SH123456', 500000.00, patient_password, True, False, False, None, None, None, 'REC001', datetime.now(), True, 'REC2024001', datetime.now(), datetime.now()),
            ('PAT002', 'Jane', None, 'Smith', '1985-08-22', 'Female', 'A+', 'Married', '9876543212', 'jane.smith@email.com', 'John Smith', '9876543213', 'Husband', '456 Oak Ave', 'Area 2', 'Mumbai', 'Maharashtra', '400002', True, None, None, None, None, None, 'Aadhar', '987654321098', None, 'Penicillin', 'Hypertension', 'Lisinopril', 'None', 'ICICI Lombard', 'IL789012', 300000.00, patient_password, True, False, False, None, None, None, 'REC001', datetime.now(), True, 'REC2024002', datetime.now(), datetime.now()),
            ('PAT003', 'Robert', None, 'Johnson', '1992-12-10', 'Male', 'O+', 'Single', '9876543214', 'robert.johnson@email.com', 'Mary Johnson', '9876543215', 'Mother', '789 Pine Rd', 'Area 3', 'Mumbai', 'Maharashtra', '400003', True, None, None, None, None, None, 'Aadhar', '456789012345', None, 'None', 'None', 'None', 'Appendectomy', 'Max Bupa', 'MB345678', 200000.00, patient_password, True, False, False, None, None, None, 'REC001', datetime.now(), True, 'REC2024003', datetime.now(), datetime.now()),
            ('PAT004', 'Emily', None, 'Brown', '1988-03-25', 'Female', 'AB+', 'Married', '9876543216', 'emily.brown@email.com', 'Michael Brown', '9876543217', 'Husband', '321 Elm St', 'Area 4', 'Mumbai', 'Maharashtra', '400004', True, None, None, None, None, None, 'Aadhar', '789012345678', None, 'None', 'Diabetes', 'Metformin', 'C-section', 'HDFC Ergo', 'HE901234', 400000.00, patient_password, True, False, False, None, None, None, 'REC001', datetime.now(), True, 'REC2024004', datetime.now(), datetime.now()),
            ('PAT005', 'Michael', None, 'Wilson', '1995-07-18', 'Male', 'B-', 'Single', '9876543218', 'michael.wilson@email.com', 'David Wilson', '9876543219', 'Father', '654 Maple Dr', 'Area 5', 'Mumbai', 'Maharashtra', '400005', True, None, None, None, None, None, 'Aadhar', '234567890123', None, 'Dust allergy', 'None', 'None', 'None', 'Religare Health', 'RH567890', 250000.00, patient_password, True, False, False, None, None, None, 'REC001', datetime.now(), True, 'REC2024005', datetime.now(), datetime.now()),
        ]
        
        for patient in patients_data:
            cursor.execute("""
                INSERT INTO patients (
                    patient_id, first_name, middle_name, last_name, date_of_birth, gender, blood_group, marital_status,
                    mobile_number, email, emergency_contact_name, emergency_contact_number, emergency_contact_relation,
                    current_address_street, current_address_area, current_city, current_state, current_pincode,
                    permanent_address_same_as_current, permanent_address_street, permanent_address_area, permanent_city,
                    permanent_state, permanent_pincode, id_proof_type, id_proof_number, id_proof_file_path,
                    known_allergies, chronic_conditions, current_medications, previous_surgeries,
                    insurance_provider, insurance_policy_number, insurance_coverage_amount, password_hash,
                    is_active, email_verified, phone_verified, last_login, current_otp, otp_expiry, registered_by, registration_date,
                    registration_fee_paid, registration_fee_receipt, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, patient)
        print("✅ Patients seeded")
        
        # 6. Seed Sample Appointments
        print("\n📅 Seeding sample appointments...")
        appointments_data = [
            ('APT001', 'PAT001', 'DOC001', dept_map['CARD'], 'First_Consultation', date.today(), '09:00:00', '9-10 AM', '001', 'Confirmed', 'Chest pain and shortness of breath', 'In-person', None, 'PAT001', datetime.now(), 'Online', 'DOC001', datetime.now(), None, None, None, 1500.00, 'Paid', 'Cash', 'TXN001', '9876543210', 'Chest discomfort for 2 weeks'),
            ('APT002', 'PAT002', 'DOC002', dept_map['GEN'], 'Follow_up', date.today(), '10:30:00', '10:30-11:00 AM', '002', 'Confirmed', 'Follow up for hypertension', 'In-person', None, 'PAT002', datetime.now(), 'Online', 'DOC002', datetime.now(), None, None, None, 400.00, 'Paid', 'Cash', 'TXN002', '9876543212', 'BP readings review'),
            ('APT003', 'PAT003', 'DOC003', dept_map['ORTHO'], 'First_Consultation', date.today(), '14:00:00', '2-3 PM', '003', 'Pending_Approval', 'Knee pain for 3 months', 'In-person', None, 'PAT003', datetime.now(), 'Online', None, None, None, None, None, 1200.00, 'Pending', None, None, '9876543214', 'Right knee pain'),
            ('APT004', 'PAT004', 'DOC004', dept_map['PED'], 'First_Consultation', date.today(), '11:00:00', '11-11:30 AM', '004', 'Confirmed', 'Child fever and cough', 'In-person', None, 'PAT004', datetime.now(), 'Online', 'DOC004', datetime.now(), None, None, None, 600.00, 'Paid', 'Cash', 'TXN004', '9876543216', 'Fever for 2 days'),
            ('APT005', 'PAT005', 'DOC005', dept_map['GYNAE'], 'First_Consultation', date.today(), '15:30:00', '3:30-4 PM', '005', 'Pending_Approval', 'Routine checkup', 'In-person', None, 'PAT005', datetime.now(), 'Online', None, None, None, None, None, 1000.00, 'Pending', None, None, '9876543218', 'Annual checkup'),
        ]
        
        for apt in appointments_data:
            cursor.execute("""
                INSERT INTO appointments (
                    appointment_id, patient_id, doctor_id, department_id, appointment_type,
                    appointment_date, appointment_time, time_slot, token_number, status, reason_for_visit,
                    consultation_mode, special_requirements, booked_by, booking_date, booking_source,
                    approved_by, approved_at, rejection_reason, consultation_start_time, consultation_end_time,
                    consultation_fee, payment_status, payment_mode, payment_transaction_id, mobile_number,
                    symptoms, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, apt + (datetime.now(), datetime.now()))
        print("✅ Appointments seeded")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Database reset and seeding completed successfully!")
        
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
        print("   Doctor (Orthopedic): DOC003 / password123")
        print("   Doctor (Pediatrics): DOC004 / password123")
        print("   Doctor (Gynecology): DOC005 / password123")
        print("   Pharmacist: PHM001 / password123")
        print("   Lab Technician: LAB001 / password123")
        print("   Nurse: NUR001 / password123")
        print("   Admission: ADM002 / password123")
        print("   Billing: BIL001 / password123")
        
        print("\n👥 PATIENT LOGIN:")
        print("   Patient 1: PAT001 / patient123")
        print("   Patient 2: PAT002 / patient123")
        print("   Patient 3: PAT003 / patient123")
        print("   Patient 4: PAT004 / patient123")
        print("   Patient 5: PAT005 / patient123")
        
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
    reset_and_seed()
