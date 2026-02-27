-- Hospital Management System - SQLite Database Schema

-- Enable Foreign Keys
PRAGMA foreign_keys = ON;

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dept_code TEXT UNIQUE NOT NULL,
    dept_name TEXT NOT NULL,
    description TEXT,
    floor_number INTEGER,
    contact_number TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    marital_status TEXT,
    mobile_number TEXT NOT NULL,
    email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_number TEXT,
    emergency_contact_relation TEXT,
    current_address_street TEXT,
    current_address_area TEXT,
    current_city TEXT,
    current_state TEXT,
    current_pincode TEXT,
    permanent_address_same_as_current BOOLEAN DEFAULT 0,
    permanent_address_street TEXT,
    permanent_address_area TEXT,
    permanent_city TEXT,
    permanent_state TEXT,
    permanent_pincode TEXT,
    id_proof_type TEXT,
    id_proof_number TEXT,
    id_proof_file_path TEXT,
    known_allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    previous_surgeries TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    insurance_coverage_amount DECIMAL(12,2),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0,
    phone_verified BOOLEAN DEFAULT 0,
    last_login TIMESTAMP,
    registered_by TEXT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_fee_paid BOOLEAN DEFAULT 0,
    registration_fee_receipt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Doctor', 'Receptionist', 'Pharmacist', 'Lab_Technician', 'Admission', 'Nurse', 'Admin', 'Billing', 'IT_Support', 'Housekeeping')),
    department_id INTEGER REFERENCES departments(id),
    sub_department TEXT,
    designation TEXT,
    date_of_joining DATE,
    employment_type TEXT DEFAULT 'Full-time',
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT 0,
    mfa_secret TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT UNIQUE REFERENCES staff(staff_id),
    qualifications TEXT,
    specialization TEXT,
    years_of_experience INTEGER,
    registration_number TEXT,
    consultation_fee DECIMAL(10,2),
    follow_up_fee DECIMAL(10,2),
    availability_schedule TEXT DEFAULT '{}',
    education TEXT,
    certifications TEXT,
    awards TEXT,
    publications TEXT,
    bio TEXT,
    profile_image_path TEXT,
    rating DECIMAL(2,1) DEFAULT 5.0,
    total_reviews INTEGER DEFAULT 0,
    is_available_for_teleconsultation BOOLEAN DEFAULT 0,
    max_patients_per_day INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beds Table
CREATE TABLE IF NOT EXISTS beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bed_id TEXT UNIQUE NOT NULL,
    bed_type TEXT NOT NULL CHECK (bed_type IN ('General_Male', 'General_Female', 'General_Pediatric', 'General_Maternity', 'Private_AC', 'Private_Non_AC', 'Deluxe', 'Suite', 'ICU', 'NICU', 'PICU', 'CCU', 'HDU', 'Isolation', 'Dialysis', 'Recovery', 'Labor')),
    ward_name TEXT,
    floor_number INTEGER,
    room_number TEXT,
    has_oxygen BOOLEAN DEFAULT 0,
    has_monitor BOOLEAN DEFAULT 0,
    has_ventilator BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'Vacant' CHECK (status IN ('Vacant', 'Occupied', 'Reserved', 'Under_Maintenance', 'Blocked')),
    daily_charge DECIMAL(10,2),
    current_patient_id TEXT REFERENCES patients(patient_id),
    admission_date TIMESTAMP,
    expected_discharge_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    doctor_id TEXT NOT NULL REFERENCES staff(staff_id),
    department_id INTEGER REFERENCES departments(id),
    appointment_type TEXT NOT NULL CHECK (appointment_type IN ('First_Consultation', 'Follow_up', 'Emergency')),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    time_slot TEXT,
    token_number TEXT,
    status TEXT DEFAULT 'Pending_Approval' CHECK (status IN ('Pending_Approval', 'Confirmed', 'Visited', 'In_Progress', 'Completed', 'Cancelled', 'No_Show')),
    reason_for_visit TEXT,
    consultation_mode TEXT DEFAULT 'In-person' CHECK (consultation_mode IN ('In-person', 'Teleconsultation')),
    special_requirements TEXT,
    booked_by TEXT,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    booking_source TEXT DEFAULT 'Online' CHECK (booking_source IN ('Online', 'Walk-in', 'Phone')),
    approved_by TEXT,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    consultation_fee DECIMAL(10,2),
    payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Waived')),
    payment_mode TEXT,
    payment_transaction_id TEXT,
    mobile_number TEXT,
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admissions Table
CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admission_id TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    admitting_doctor_id TEXT REFERENCES staff(staff_id),
    department_id INTEGER REFERENCES departments(id),
    bed_id TEXT REFERENCES beds(bed_id),
    admission_date TIMESTAMP NOT NULL,
    expected_discharge_date TIMESTAMP,
    actual_discharge_date TIMESTAMP,
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    admission_reason TEXT,
    admission_type TEXT CHECK (admission_type IN ('Emergency', 'Elective', 'Maternity', 'Day_Care')),
    guardian_name TEXT,
    guardian_relation TEXT,
    guardian_contact TEXT,
    payment_type TEXT CHECK (payment_type IN ('Cash', 'Insurance', 'Corporate', 'Government')),
    insurance_provider TEXT,
    policy_number TEXT,
    tpa_name TEXT,
    pre_authorization_number TEXT,
    coverage_amount DECIMAL(12,2),
    advance_payment DECIMAL(10,2),
    total_bill_amount DECIMAL(12,2),
    status TEXT DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged', 'DAMA', 'Transferred')),
    discharge_summary TEXT,
    discharge_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    doctor_id TEXT NOT NULL REFERENCES staff(staff_id),
    appointment_id TEXT REFERENCES appointments(appointment_id),
    admission_id TEXT REFERENCES admissions(admission_id),
    prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT,
    chief_complaint TEXT,
    examination_findings TEXT,
    vital_signs TEXT,
    general_instructions TEXT,
    diet_advice TEXT,
    activity_restrictions TEXT,
    warning_signs TEXT,
    follow_up_date DATE,
    follow_up_instructions TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Dispensed', 'Cancelled')),
    doctor_digital_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription Medicines Table
CREATE TABLE IF NOT EXISTS prescription_medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id TEXT REFERENCES prescriptions(prescription_id),
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    strength TEXT,
    dosage_form TEXT,
    quantity INTEGER,
    frequency TEXT,
    timing TEXT,
    duration TEXT,
    instructions TEXT,
    quantity_dispensed INTEGER DEFAULT 0,
    dispensed_by TEXT REFERENCES staff(staff_id),
    dispensed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine Inventory Table
CREATE TABLE IF NOT EXISTS medicine_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT UNIQUE,
    generic_name TEXT NOT NULL,
    brand_name TEXT,
    manufacturer TEXT,
    category TEXT,
    dosage_form TEXT,
    strength TEXT,
    pack_size TEXT,
    unit_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    current_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    batch_number TEXT,
    expiry_date DATE,
    storage_location TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Orders Table
CREATE TABLE IF NOT EXISTS lab_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_order_id INTEGER, -- Allowing AUTOINCREMENT integer as logic seems to use lastrowid or serial in PG
    patient_id TEXT REFERENCES patients(patient_id),
    ordered_by TEXT REFERENCES staff(staff_id),
    appointment_id TEXT REFERENCES appointments(appointment_id),
    admission_id TEXT REFERENCES admissions(admission_id),
    test_category TEXT,
    test_name TEXT,
    test_code TEXT,
    priority TEXT DEFAULT 'Routine',
    sample_type TEXT,
    fasting_required BOOLEAN DEFAULT 0,
    clinical_notes TEXT,
    special_instructions TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sample_collection_date TIMESTAMP,
    result_entry_date TIMESTAMP,
    verification_date TIMESTAMP,
    report_generated_date TIMESTAMP,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sample_Collected', 'In_Progress', 'Results_Entered', 'Verified', 'Delivered', 'Cancelled')),
    actual_completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Results Table
CREATE TABLE IF NOT EXISTS lab_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_order_id INTEGER REFERENCES lab_orders(id),
    patient_id TEXT REFERENCES patients(patient_id),
    parameter_name TEXT NOT NULL,
    result_value TEXT,
    unit TEXT,
    reference_range TEXT,
    status TEXT CHECK (status IN ('Normal', 'Abnormal', 'Critical')),
    is_critical BOOLEAN DEFAULT 0,
    entered_by TEXT REFERENCES staff(staff_id),
    verified_by TEXT REFERENCES staff(staff_id),
    notes TEXT,
    technician_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT REFERENCES patients(patient_id),
    recorded_by TEXT REFERENCES staff(staff_id),
    admission_id TEXT REFERENCES admissions(admission_id),
    appointment_id TEXT REFERENCES appointments(appointment_id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    temperature DECIMAL(4,1),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    spo2 INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,1),
    blood_sugar DECIMAL(5,2),
    pain_score INTEGER,
    consciousness_level TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue Management Table
CREATE TABLE IF NOT EXISTS queue_management (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id TEXT REFERENCES appointments(appointment_id),
    patient_id TEXT REFERENCES patients(patient_id),
    doctor_id TEXT REFERENCES staff(staff_id),
    token_number TEXT NOT NULL,
    queue_date DATE NOT NULL,
    arrival_time TIMESTAMP,
    called_in_time TIMESTAMP,
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    status TEXT DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Visited', 'In_Progress', 'Completed', 'No_Show')),
    waiting_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bed Occupancy Summary View (SQLite doesn't support sophisticated filtered aggregates in views easily with FILTER clause in older versions, using CASE)
DROP VIEW IF EXISTS bed_occupancy_summary;
CREATE VIEW bed_occupancy_summary AS
SELECT 
    bed_type,
    COUNT(*) as total_beds,
    SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_beds,
    SUM(CASE WHEN status = 'Vacant' THEN 1 ELSE 0 END) as vacant_beds,
    SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved_beds,
    SUM(CASE WHEN status = 'Under_Maintenance' THEN 1 ELSE 0 END) as maintenance_beds,
    ROUND(CAST(SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / COUNT(*), 2) as occupancy_percentage
FROM beds
GROUP BY bed_type;

-- Seed Data (Departments) - Same as before
INSERT OR IGNORE INTO departments (dept_code, dept_name, description, floor_number, contact_number) VALUES
('CARD', 'Cardiology', 'Heart and cardiovascular system care', 2, '555-0101'),
('NEUR', 'Neurology', 'Brain, spine and nervous system', 3, '555-0102'),
('ORTH', 'Orthopedics', 'Bone, joint and muscle care', 2, '555-0103'),
('PEDS', 'Pediatrics', 'Children and adolescent healthcare', 1, '555-0104'),
('GYN', 'Gynecology & Obstetrics', 'Women health and maternity', 1, '555-0105'),
('GENM', 'General Medicine', 'Primary healthcare services', 1, '555-0106'),
('GENS', 'General Surgery', 'Surgical procedures', 3, '555-0107'),
('ENT', 'ENT', 'Ear, Nose and Throat', 2, '555-0108'),
('OPTH', 'Ophthalmology', 'Eye care services', 2, '555-0109'),
('DERM', 'Dermatology', 'Skin care', 2, '555-0110'),
('PSY', 'Psychiatry', 'Mental health', 4, '555-0111'),
('RADIO', 'Radiology', 'Diagnostic imaging', 1, '555-0112'),
('ANES', 'Anesthesiology', 'Pain management', 3, '555-0113'),
('EMER', 'Emergency Medicine', '24/7 emergency care', 0, '555-0114'),
('PATH', 'Pathology', 'Laboratory diagnostics', 1, '555-0115'),
('PHAR', 'Pharmacy', 'Medicine dispensing', 0, '555-0116'),
('ADMIN', 'Administration', 'Hospital management', 5, '555-0117'),
('BILL', 'Billing', 'Financial services', 0, '555-0118'),
('RECP', 'Reception', 'Patient services', 0, '555-0119'),
('NURS', 'Nursing', 'Patient care', 1, '555-0120');

-- Seed Data (Staff)
INSERT OR IGNORE INTO staff (staff_id, first_name, last_name, email, phone, role, department_id, designation, date_of_joining, password_hash, is_active) VALUES
('ADM001', 'System', 'Administrator', 'admin@hospital.com', '555-1000', 'Admin', 17, 'System Administrator', '2020-01-01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', 1),
('REC001', 'Priya', 'Sharma', 'priya.sharma@hospital.com', '555-1001', 'Receptionist', 19, 'Senior Receptionist', '2021-03-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', 1),
('DOC001', 'Dr. Rajiv', 'Menon', 'rajiv.menon@hospital.com', '555-2001', 'Doctor', 1, 'Senior Cardiologist', '2019-05-10', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', 1),
('PHR001', 'Anil', 'Sharma', 'anil.sharma@hospital.com', '555-3001', 'Pharmacist', 16, 'Chief Pharmacist', '2018-05-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', 1);

-- Seed Data (Doctors)
INSERT OR IGNORE INTO doctors (staff_id, qualifications, specialization, years_of_experience, registration_number, consultation_fee, follow_up_fee, availability_schedule, education, bio, rating) VALUES
('DOC001', 'MD (Cardiology), DM (Interventional Cardiology)', 'Interventional Cardiology', 15, 'MCI-12345', 800, 400, 
 '{"monday": ["09:00-12:00", "16:00-19:00"], "tuesday": ["09:00-12:00"], "wednesday": ["09:00-12:00", "16:00-19:00"], "thursday": ["09:00-12:00"], "friday": ["09:00-12:00", "16:00-19:00"], "saturday": ["09:00-13:00"]}',
 'MBBS from AIIMS Delhi, MD from CMC Vellore, DM from SGPGI Lucknow',
 'Dr. Rajiv Menon is a renowned interventional cardiologist with expertise in complex angioplasties and cardiac catheterization.', 4.8);
