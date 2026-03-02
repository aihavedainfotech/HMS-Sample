-- Simple Neon-compatible schema for HMS
-- Fix for PostgreSQL generation expression issue

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    dept_code VARCHAR(10) UNIQUE NOT NULL,
    dept_name VARCHAR(100) NOT NULL,
    description TEXT,
    floor_number INTEGER,
    contact_number VARCHAR(15),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    marital_status VARCHAR(20),
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    emergency_contact_name VARCHAR(100),
    emergency_contact_number VARCHAR(15),
    emergency_contact_relation VARCHAR(20),
    current_address_street VARCHAR(200),
    current_address_area VARCHAR(100),
    current_city VARCHAR(100),
    current_state VARCHAR(100),
    current_pincode VARCHAR(10),
    permanent_address_same_as_current BOOLEAN DEFAULT FALSE,
    permanent_address_street VARCHAR(200),
    permanent_address_area VARCHAR(100),
    permanent_city VARCHAR(100),
    permanent_state VARCHAR(100),
    permanent_pincode VARCHAR(10),
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(50),
    id_proof_file_path VARCHAR(500),
    known_allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    previous_surgeries TEXT,
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    insurance_coverage_amount DECIMAL(12,2),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    current_otp VARCHAR(10),
    otp_expiry TIMESTAMP,
    registered_by VARCHAR(20),
    registration_date TIMESTAMP DEFAULT now(),
    registration_fee_paid BOOLEAN DEFAULT FALSE,
    registration_fee_receipt VARCHAR(50),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) NOT NULL CHECK (role IN ('Doctor', 'Receptionist', 'Pharmacist', 'Lab_Technician', 'Admission', 'Nurse', 'Admin', 'Billing', 'IT_Support', 'Housekeeping')),
    department_id INTEGER,
    sub_department VARCHAR(50),
    designation VARCHAR(100),
    date_of_joining DATE,
    employment_type VARCHAR(20) DEFAULT 'Full-time',
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT now(),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(10) UNIQUE REFERENCES staff(staff_id),
    qualifications TEXT,
    specialization TEXT,
    years_of_experience INTEGER,
    registration_number VARCHAR(50),
    consultation_fee DECIMAL(10,2),
    follow_up_fee DECIMAL(10,2),
    availability_schedule TEXT DEFAULT '{}',
    education TEXT,
    certifications TEXT,
    awards TEXT,
    publications TEXT,
    bio TEXT,
    profile_image_path VARCHAR(500),
    rating DECIMAL(2,1) DEFAULT 5.0,
    total_reviews INTEGER DEFAULT 0,
    is_available_for_teleconsultation BOOLEAN DEFAULT FALSE,
    max_patients_per_day INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Beds Table
CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    bed_id VARCHAR(10) UNIQUE NOT NULL,
    bed_type VARCHAR(50) NOT NULL CHECK (bed_type IN ('General_Male', 'General_Female', 'General_Pediatric', 'General_Maternity', 'Private_AC', 'Private_Non_AC', 'Deluxe', 'Suite', 'ICU', 'NICU', 'PICU', 'CCU', 'HDU', 'Isolation', 'Dialysis', 'Recovery', 'Labor')),
    ward_name VARCHAR(50),
    floor_number INTEGER,
    room_number VARCHAR(10),
    has_oxygen BOOLEAN DEFAULT FALSE,
    has_monitor BOOLEAN DEFAULT FALSE,
    has_ventilator BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Vacant' CHECK (status IN ('Vacant', 'Occupied', 'Reserved', 'Under_Maintenance', 'Blocked')),
    daily_charge DECIMAL(10,2),
    current_patient_id VARCHAR(10) REFERENCES patients(patient_id),
    admission_date TIMESTAMP,
    expected_discharge_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(10) UNIQUE NOT NULL,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    doctor_id VARCHAR(10) NOT NULL REFERENCES staff(staff_id),
    department_id INTEGER,
    appointment_type VARCHAR(20) NOT NULL CHECK (appointment_type IN ('First_Consultation', 'Follow_up', 'Emergency')),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    time_slot VARCHAR(20),
    token_number VARCHAR(10),
    status VARCHAR(20) DEFAULT 'Pending_Approval' CHECK (status IN ('Pending_Approval', 'Confirmed', 'Visited', 'In_Progress', 'Completed', 'Cancelled', 'No_Show')),
    reason_for_visit TEXT,
    consultation_mode VARCHAR(20) DEFAULT 'In-person' CHECK (consultation_mode IN ('In-person', 'Teleconsultation')),
    special_requirements TEXT,
    booked_by VARCHAR(20),
    booking_date TIMESTAMP DEFAULT now(),
    booking_source VARCHAR(20) DEFAULT 'Online' CHECK (booking_source IN ('Online', 'Walk-in', 'Phone')),
    approved_by VARCHAR(20),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    consultation_fee DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Waived')),
    payment_mode VARCHAR(20),
    payment_transaction_id VARCHAR(50),
    mobile_number VARCHAR(15),
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON staff(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
