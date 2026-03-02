-- Hospital Management System - PostgreSQL Database Schema
-- Comprehensive schema for Patient Portal and Staff Portal

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS medication_administration CASCADE;
DROP TABLE IF EXISTS nurse_notes CASCADE;
DROP TABLE IF EXISTS vital_signs CASCADE;
DROP TABLE IF EXISTS prescription_medicines CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS lab_orders CASCADE;
DROP TABLE IF EXISTS medicine_dispensing CASCADE;
DROP TABLE IF EXISTS medicine_inventory CASCADE;
DROP TABLE IF EXISTS queue_management CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS admissions CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS billing CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS emr_records CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- ============================================
-- CORE TABLES
-- ============================================

-- Departments Table
CREATE TABLE departments (
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

-- Patients Table (Master Patient Registry)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    age INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))
    ) STORED,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    marital_status VARCHAR(20),
    
    -- Contact Information
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    emergency_contact_name VARCHAR(100),
    emergency_contact_number VARCHAR(15),
    emergency_contact_relation VARCHAR(50),
    
    -- Address Details
    current_address_street TEXT,
    current_address_area VARCHAR(100),
    current_city VARCHAR(50),
    current_state VARCHAR(50),
    current_pincode VARCHAR(10),
    permanent_address_same_as_current BOOLEAN DEFAULT FALSE,
    permanent_address_street TEXT,
    permanent_address_area VARCHAR(100),
    permanent_city VARCHAR(50),
    permanent_state VARCHAR(50),
    permanent_pincode VARCHAR(10),
    
    -- Identification
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(50),
    id_proof_file_path VARCHAR(255),
    
    -- Medical Information
    known_allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    previous_surgeries TEXT,
    
    -- Insurance Details
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    insurance_coverage_amount DECIMAL(12,2),
    
    -- Login Credentials
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    
    -- Registration Info
    registered_by VARCHAR(20), -- 'ONLINE' or staff_id
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_fee_paid BOOLEAN DEFAULT FALSE,
    registration_fee_receipt VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table (All hospital staff)
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    
    -- Role Information
    role VARCHAR(30) NOT NULL CHECK (role IN (
        'Doctor', 'Receptionist', 'Pharmacist', 'Lab_Technician', 
        'Admission', 'Nurse', 'Admin', 'Billing', 'IT_Support', 'Housekeeping'
    )),
    department_id INTEGER REFERENCES departments(id),
    sub_department VARCHAR(50), -- For doctors - specialization
    
    -- Employment Details
    designation VARCHAR(50),
    date_of_joining DATE,
    employment_type VARCHAR(20) DEFAULT 'Full-time',
    
    -- Authentication
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    
    -- Audit
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table (Extended details for doctors)
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(10) UNIQUE REFERENCES staff(staff_id),
    qualifications TEXT,
    specialization VARCHAR(100),
    years_of_experience INTEGER,
    registration_number VARCHAR(50),
    consultation_fee DECIMAL(10,2),
    follow_up_fee DECIMAL(10,2),
    
    -- Availability Schedule (JSON for flexibility)
    availability_schedule JSONB DEFAULT '{}',
    
    -- Professional Details
    education TEXT,
    certifications TEXT,
    awards TEXT,
    publications TEXT,
    
    -- Profile
    bio TEXT,
    profile_image_path VARCHAR(255),
    
    -- Ratings
    rating DECIMAL(2,1) DEFAULT 5.0,
    total_reviews INTEGER DEFAULT 0,
    
    is_available_for_teleconsultation BOOLEAN DEFAULT FALSE,
    max_patients_per_day INTEGER DEFAULT 30,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beds Table (Bed Inventory)
CREATE TABLE beds (
    id SERIAL PRIMARY KEY,
    bed_id VARCHAR(20) UNIQUE NOT NULL,
    bed_type VARCHAR(30) NOT NULL CHECK (bed_type IN (
        'General_Male', 'General_Female', 'General_Pediatric', 'General_Maternity',
        'Private_AC', 'Private_Non_AC', 'Deluxe', 'Suite',
        'ICU', 'NICU', 'PICU', 'CCU', 'HDU',
        'Isolation', 'Dialysis', 'Recovery', 'Labor'
    )),
    ward_name VARCHAR(50),
    floor_number INTEGER,
    room_number VARCHAR(20),
    
    -- Equipment
    has_oxygen BOOLEAN DEFAULT FALSE,
    has_monitor BOOLEAN DEFAULT FALSE,
    has_ventilator BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Vacant' CHECK (status IN ('Vacant', 'Occupied', 'Reserved', 'Under_Maintenance', 'Blocked')),
    
    -- Pricing
    daily_charge DECIMAL(10,2),
    
    -- Current Occupancy
    current_patient_id VARCHAR(10) REFERENCES patients(patient_id),
    admission_date TIMESTAMP,
    expected_discharge_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(15) UNIQUE NOT NULL,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    doctor_id VARCHAR(10) NOT NULL REFERENCES staff(staff_id),
    department_id INTEGER REFERENCES departments(id),
    
    -- Appointment Details
    appointment_type VARCHAR(20) NOT NULL CHECK (appointment_type IN ('First_Consultation', 'Follow_up', 'Emergency')),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    time_slot VARCHAR(20), -- Morning/Afternoon/Evening
    
    -- Token System
    token_number VARCHAR(20),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending_Approval' CHECK (status IN (
        'Pending_Approval', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled', 'No_Show'
    )),
    
    -- Consultation Details
    reason_for_visit TEXT,
    consultation_mode VARCHAR(20) DEFAULT 'In-person' CHECK (consultation_mode IN ('In-person', 'Teleconsultation')),
    special_requirements TEXT,
    
    -- Booking Info
    booked_by VARCHAR(20), -- Patient ID for online, Staff ID for walk-in
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    booking_source VARCHAR(20) DEFAULT 'Online' CHECK (booking_source IN ('Online', 'Walk-in', 'Phone')),
    
    -- Approval
    approved_by VARCHAR(10),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Consultation
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    
    -- Payment
    consultation_fee DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Waived')),
    payment_mode VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue Management Table
CREATE TABLE queue_management (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(15) REFERENCES appointments(appointment_id),
    patient_id VARCHAR(10) REFERENCES patients(patient_id),
    doctor_id VARCHAR(10) REFERENCES staff(staff_id),
    
    token_number VARCHAR(30) NOT NULL,
    queue_date DATE NOT NULL,
    
    -- Timing
    arrival_time TIMESTAMP,
    called_in_time TIMESTAMP,
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'In_Progress', 'Completed', 'No_Show')),
    
    -- Waiting Time Calculation
    waiting_time_minutes INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admissions Table
CREATE TABLE admissions (
    id SERIAL PRIMARY KEY,
    admission_id VARCHAR(15) UNIQUE NOT NULL,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    
    -- Admission Details
    admitting_doctor_id VARCHAR(10) REFERENCES staff(staff_id),
    department_id INTEGER REFERENCES departments(id),
    bed_id VARCHAR(20) REFERENCES beds(bed_id),
    
    -- Dates
    admission_date TIMESTAMP NOT NULL,
    expected_discharge_date TIMESTAMP,
    actual_discharge_date TIMESTAMP,
    
    -- Clinical Info
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    admission_reason TEXT,
    admission_type VARCHAR(20) CHECK (admission_type IN ('Emergency', 'Elective', 'Maternity', 'Day_Care')),
    
    -- Guardian Info
    guardian_name VARCHAR(100),
    guardian_relation VARCHAR(50),
    guardian_contact VARCHAR(15),
    
    -- Insurance
    payment_type VARCHAR(20) CHECK (payment_type IN ('Cash', 'Insurance', 'Corporate', 'Government')),
    insurance_provider VARCHAR(100),
    policy_number VARCHAR(100),
    tpa_name VARCHAR(100),
    pre_authorization_number VARCHAR(100),
    coverage_amount DECIMAL(12,2),
    
    -- Financial
    advance_payment DECIMAL(10,2),
    total_bill_amount DECIMAL(12,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged', 'DAMA', 'Transferred')),
    
    -- Discharge
    discharge_summary TEXT,
    discharge_type VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions Table
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    prescription_id VARCHAR(15) UNIQUE NOT NULL,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    doctor_id VARCHAR(10) NOT NULL REFERENCES staff(staff_id),
    appointment_id VARCHAR(15) REFERENCES appointments(appointment_id),
    admission_id VARCHAR(15) REFERENCES admissions(admission_id),
    
    -- Prescription Details
    prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT,
    chief_complaint TEXT,
    examination_findings TEXT,
    
    -- Vitals at time of prescription
    vital_signs JSONB,
    
    -- Instructions
    general_instructions TEXT,
    diet_advice TEXT,
    activity_restrictions TEXT,
    warning_signs TEXT,
    
    -- Follow-up
    follow_up_date DATE,
    follow_up_instructions TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Dispensed', 'Cancelled')),
    
    -- Digital Signature
    doctor_digital_signature TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription Medicines Table
CREATE TABLE prescription_medicines (
    id SERIAL PRIMARY KEY,
    prescription_id VARCHAR(15) REFERENCES prescriptions(prescription_id),
    
    -- Medicine Details
    medicine_name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    brand_name VARCHAR(100),
    strength VARCHAR(50),
    dosage_form VARCHAR(30),
    
    -- Dosage
    quantity VARCHAR(20),
    frequency VARCHAR(20) CHECK (frequency IN ('OD', 'BD', 'TDS', 'QID', 'SOS', 'Custom')),
    timing VARCHAR(50), -- Before/After food, Morning/Evening
    duration VARCHAR(20),
    instructions TEXT,
    
    -- Dispensing
    quantity_dispensed INTEGER,
    dispensed_by VARCHAR(10),
    dispensed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine Inventory Table
CREATE TABLE medicine_inventory (
    id SERIAL PRIMARY KEY,
    medicine_id VARCHAR(20) UNIQUE NOT NULL,
    
    -- Medicine Details
    generic_name VARCHAR(100) NOT NULL,
    brand_name VARCHAR(100),
    manufacturer VARCHAR(100),
    category VARCHAR(50),
    dosage_form VARCHAR(30),
    strength VARCHAR(50),
    pack_size VARCHAR(20),
    
    -- Pricing
    unit_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    
    -- Stock
    current_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    max_stock_level INTEGER,
    
    -- Supplier
    supplier_name VARCHAR(100),
    supplier_contact VARCHAR(15),
    
    -- Batch Info
    batch_number VARCHAR(50),
    expiry_date DATE,
    manufacturing_date DATE,
    
    -- Storage
    storage_location VARCHAR(50),
    storage_temperature VARCHAR(20),
    
    -- Status
    prescription_required BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Discontinued', 'Out_of_Stock')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine Dispensing Table
CREATE TABLE medicine_dispensing (
    id SERIAL PRIMARY KEY,
    dispensing_id VARCHAR(20) UNIQUE NOT NULL,
    prescription_id VARCHAR(15) REFERENCES prescriptions(prescription_id),
    patient_id VARCHAR(10) REFERENCES patients(patient_id),
    
    -- Dispensing Details
    dispensed_by VARCHAR(10) REFERENCES staff(staff_id),
    dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Financial
    total_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    grand_total DECIMAL(10,2),
    
    payment_mode VARCHAR(20),
    payment_status VARCHAR(20),
    
    -- Insurance
    insurance_claimed BOOLEAN DEFAULT FALSE,
    insurance_claim_amount DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Orders Table
CREATE TABLE lab_orders (
    id SERIAL PRIMARY KEY,
    lab_order_id VARCHAR(15) UNIQUE NOT NULL,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    ordered_by VARCHAR(10) NOT NULL REFERENCES staff(staff_id),
    appointment_id VARCHAR(15) REFERENCES appointments(appointment_id),
    admission_id VARCHAR(15) REFERENCES admissions(admission_id),
    
    -- Test Details
    test_category VARCHAR(50) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    test_code VARCHAR(20),
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'Routine' CHECK (priority IN ('Routine', 'Urgent', 'STAT')),
    
    -- Sample Details
    sample_type VARCHAR(30),
    fasting_required BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN (
        'Pending', 'Sample_Collected', 'In_Progress', 'QC_Pending', 
        'Results_Entered', 'Verified', 'Report_Generated', 'Delivered'
    )),
    
    -- Clinical Notes
    clinical_notes TEXT,
    special_instructions TEXT,
    
    -- Timing
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sample_collection_date TIMESTAMP,
    expected_completion_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    
    -- Sample
    sample_id VARCHAR(20),
    collected_by VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Results Table
CREATE TABLE lab_results (
    id SERIAL PRIMARY KEY,
    lab_order_id VARCHAR(15) REFERENCES lab_orders(lab_order_id),
    patient_id VARCHAR(10) REFERENCES patients(patient_id),
    
    -- Result Details
    parameter_name VARCHAR(100),
    result_value VARCHAR(50),
    unit VARCHAR(20),
    reference_range VARCHAR(50),
    
    -- Interpretation
    status VARCHAR(20) CHECK (status IN ('Normal', 'High', 'Low', 'Critical')),
    is_critical BOOLEAN DEFAULT FALSE,
    
    -- Technician
    entered_by VARCHAR(10),
    entered_at TIMESTAMP,
    verified_by VARCHAR(10),
    verified_at TIMESTAMP,
    
    -- Notes
    technician_notes TEXT,
    interpretation TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vital Signs Table
CREATE TABLE vital_signs (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    recorded_by VARCHAR(10) NOT NULL REFERENCES staff(staff_id),
    admission_id VARCHAR(15) REFERENCES admissions(admission_id),
    appointment_id VARCHAR(15) REFERENCES appointments(appointment_id),
    
    -- Vital Signs
    temperature DECIMAL(4,1),
    temperature_unit VARCHAR(5) DEFAULT 'F',
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    spo2 INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,1),
    blood_sugar DECIMAL(5,1),
    pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),
    
    -- Additional
    consciousness_level VARCHAR(20),
    skin_condition TEXT,
    
    -- Recording Info
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medication Administration Table (MAR)
CREATE TABLE medication_administration (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    prescription_medicine_id INTEGER REFERENCES prescription_medicines(id),
    admission_id VARCHAR(15) REFERENCES admissions(admission_id),
    
    -- Medicine Details
    medicine_name VARCHAR(100),
    dose VARCHAR(50),
    route VARCHAR(20) CHECK (route IN ('Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Rectal')),
    
    -- Administration
    scheduled_time TIMESTAMP,
    administered_time TIMESTAMP,
    administered_by VARCHAR(10) REFERENCES staff(staff_id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Administered', 'Missed', 'Refused', 'Held')),
    
    -- Documentation
    patient_response TEXT,
    adverse_reaction TEXT,
    doctor_notified BOOLEAN DEFAULT FALSE,
    
    -- Verification
    verified_by VARCHAR(10),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nurse Notes Table
CREATE TABLE nurse_notes (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    admission_id VARCHAR(15) REFERENCES admissions(admission_id),
    nurse_id VARCHAR(10) NOT NULL REFERENCES staff(staff_id),
    
    -- Note Details
    note_type VARCHAR(30) CHECK (note_type IN ('Shift_Note', 'Progress_Note', 'Incident_Report', 'Procedure_Note')),
    shift VARCHAR(20) CHECK (shift IN ('Morning', 'Evening', 'Night')),
    
    -- Content
    patient_condition TEXT,
    vital_signs_summary TEXT,
    intake_output TEXT,
    medications_administered TEXT,
    procedures_performed TEXT,
    patient_complaints TEXT,
    nursing_interventions TEXT,
    plan_for_next_shift TEXT,
    
    -- General
    notes TEXT,
    
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing Table
CREATE TABLE billing (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    admission_id VARCHAR(15) REFERENCES admissions(admission_id),
    appointment_id VARCHAR(15) REFERENCES appointments(appointment_id),
    
    -- Bill Details
    bill_type VARCHAR(30) NOT NULL,
    bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Charges
    item_description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Partially_Paid', 'Waived', 'Cancelled')),
    
    -- Generated By
    generated_by VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(20) UNIQUE NOT NULL,
    bill_id VARCHAR(20) REFERENCES billing(bill_id),
    patient_id VARCHAR(10) REFERENCES patients(patient_id),
    
    -- Payment Details
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('Cash', 'Card', 'UPI', 'Insurance', 'Bank_Transfer', 'Cheque')),
    amount DECIMAL(10,2) NOT NULL,
    
    -- Transaction Details
    transaction_id VARCHAR(100),
    bank_name VARCHAR(50),
    cheque_number VARCHAR(50),
    
    -- Insurance
    insurance_provider VARCHAR(100),
    claim_number VARCHAR(100),
    claim_status VARCHAR(20),
    
    -- Receipt
    receipt_number VARCHAR(20),
    
    -- Collected By
    collected_by VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EMR Records Table (Electronic Medical Records)
CREATE TABLE emr_records (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(10) NOT NULL REFERENCES patients(patient_id),
    record_type VARCHAR(30) NOT NULL CHECK (record_type IN (
        'Visit', 'Prescription', 'Lab_Result', 'Imaging', 'Surgery', 
        'Admission', 'Discharge', 'Vaccination', 'Allergy', 'Problem'
    )),
    
    -- Reference IDs
    reference_id VARCHAR(20),
    reference_table VARCHAR(30),
    
    -- Content
    title VARCHAR(100),
    description TEXT,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    
    -- Provider
    provider_id VARCHAR(10),
    provider_name VARCHAR(100),
    department VARCHAR(50),
    
    -- Date
    record_date TIMESTAMP,
    
    -- Attachments
    attachment_paths TEXT[],
    
    -- Visibility
    is_confidential BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20),
    user_type VARCHAR(20) CHECK (user_type IN ('Patient', 'Staff')),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(20),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Patient Indexes
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_mobile ON patients(mobile_number);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);

-- Staff Indexes
CREATE INDEX idx_staff_staff_id ON staff(staff_id);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_department ON staff(department_id);

-- Appointment Indexes
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Admission Indexes
CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_bed ON admissions(bed_id);

-- Prescription Indexes
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);

-- Lab Indexes
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_status ON lab_orders(status);
CREATE INDEX idx_lab_results_order ON lab_results(lab_order_id);

-- Billing Indexes
CREATE INDEX idx_billing_patient ON billing(patient_id);
CREATE INDEX idx_billing_status ON billing(status);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert Departments
INSERT INTO departments (dept_code, dept_name, description, floor_number, contact_number) VALUES
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

-- Insert Beds
INSERT INTO beds (bed_id, bed_type, ward_name, floor_number, room_number, daily_charge, has_oxygen, has_monitor) VALUES
('ICU-001', 'ICU', 'ICU Ward', 3, 'ICU-1', 5000, TRUE, TRUE),
('ICU-002', 'ICU', 'ICU Ward', 3, 'ICU-2', 5000, TRUE, TRUE),
('ICU-003', 'ICU', 'ICU Ward', 3, 'ICU-3', 5000, TRUE, TRUE),
('PVT-201', 'Private_AC', 'Private Ward', 2, '201', 2000, TRUE, FALSE),
('PVT-202', 'Private_AC', 'Private Ward', 2, '202', 2000, TRUE, FALSE),
('PVT-203', 'Private_AC', 'Private Ward', 2, '203', 2000, TRUE, FALSE),
('PVT-204', 'Private_Non_AC', 'Private Ward', 2, '204', 1500, TRUE, FALSE),
('DLX-301', 'Deluxe', 'Deluxe Suite', 3, '301', 3500, TRUE, TRUE),
('DLX-302', 'Deluxe', 'Deluxe Suite', 3, '302', 3500, TRUE, TRUE),
('GW-M-01', 'General_Male', 'General Male Ward', 1, 'M-01', 800, FALSE, FALSE),
('GW-M-02', 'General_Male', 'General Male Ward', 1, 'M-02', 800, FALSE, FALSE),
('GW-F-01', 'General_Female', 'General Female Ward', 1, 'F-01', 800, FALSE, FALSE),
('GW-F-02', 'General_Female', 'General Female Ward', 1, 'F-02', 800, FALSE, FALSE),
('CCU-001', 'CCU', 'Cardiac Care Unit', 2, 'CCU-1', 6000, TRUE, TRUE),
('CCU-002', 'CCU', 'Cardiac Care Unit', 2, 'CCU-2', 6000, TRUE, TRUE),
('NICU-001', 'NICU', 'Neonatal ICU', 1, 'NICU-1', 4500, TRUE, TRUE),
('PICU-001', 'PICU', 'Pediatric ICU', 1, 'PICU-1', 4500, TRUE, TRUE);

-- Insert Sample Staff (with password: password123)
-- Password hash for 'password123': pbkdf2:sha256:600000$...
INSERT INTO staff (staff_id, first_name, last_name, email, phone, role, department_id, designation, date_of_joining, password_hash, is_active) VALUES
-- Admin
('ADM001', 'System', 'Administrator', 'admin@hospital.com', '555-1000', 'Admin', 17, 'System Administrator', '2020-01-01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Receptionists
('REC001', 'Priya', 'Sharma', 'priya.sharma@hospital.com', '555-1001', 'Receptionist', 19, 'Senior Receptionist', '2021-03-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('REC002', 'Rajesh', 'Kumar', 'rajesh.kumar@hospital.com', '555-1002', 'Receptionist', 19, 'Receptionist', '2022-06-01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - Cardiology
('DOC001', 'Dr. Rajiv', 'Menon', 'rajiv.menon@hospital.com', '555-2001', 'Doctor', 1, 'Senior Cardiologist', '2019-05-10', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('DOC002', 'Dr. Sunita', 'Patel', 'sunita.patel@hospital.com', '555-2002', 'Doctor', 1, 'Cardiologist', '2020-08-20', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - Neurology
('DOC003', 'Dr. Amit', 'Verma', 'amit.verma@hospital.com', '555-2003', 'Doctor', 2, 'Neurologist', '2018-03-12', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('DOC004', 'Dr. Neha', 'Gupta', 'neha.gupta@hospital.com', '555-2004', 'Doctor', 2, 'Neurosurgeon', '2019-11-05', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - Orthopedics
('DOC005', 'Dr. Sanjay', 'Rao', 'sanjay.rao@hospital.com', '555-2005', 'Doctor', 3, 'Orthopedic Surgeon', '2017-07-18', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('DOC006', 'Dr. Ananya', 'Reddy', 'ananya.reddy@hospital.com', '555-2006', 'Doctor', 3, 'Orthopedist', '2021-01-10', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - Pediatrics
('DOC007', 'Dr. Vikram', 'Shah', 'vikram.shah@hospital.com', '555-2007', 'Doctor', 4, 'Pediatrician', '2016-04-22', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('DOC008', 'Dr. Meera', 'Iyer', 'meera.iyer@hospital.com', '555-2008', 'Doctor', 4, 'Pediatrician', '2020-09-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - Gynecology
('DOC009', 'Dr. Lakshmi', 'Nair', 'lakshmi.nair@hospital.com', '555-2009', 'Doctor', 5, 'Gynecologist', '2015-06-08', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('DOC010', 'Dr. Deepak', 'Joshi', 'deepak.joshi@hospital.com', '555-2010', 'Doctor', 5, 'Obstetrician', '2018-12-01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - General Medicine
('DOC011', 'Dr. Arun', 'Desai', 'arun.desai@hospital.com', '555-2011', 'Doctor', 6, 'General Physician', '2014-02-14', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('DOC012', 'Dr. Kavita', 'Malhotra', 'kavita.malhotra@hospital.com', '555-2012', 'Doctor', 6, 'General Physician', '2019-08-30', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Doctors - Emergency
('DOC013', 'Dr. Rahul', 'Khanna', 'rahul.khanna@hospital.com', '555-2013', 'Doctor', 14, 'Emergency Medicine Specialist', '2017-11-20', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Pharmacists
('PHR001', 'Anil', 'Sharma', 'anil.sharma@hospital.com', '555-3001', 'Pharmacist', 16, 'Chief Pharmacist', '2018-05-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('PHR002', 'Sunita', 'Verma', 'sunita.verma@hospital.com', '555-3002', 'Pharmacist', 16, 'Pharmacist', '2020-07-10', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Lab Technicians
('LAB001', 'Ravi', 'Patel', 'ravi.patel@hospital.com', '555-4001', 'Lab_Technician', 15, 'Senior Lab Technician', '2019-04-20', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('LAB002', 'Pooja', 'Gupta', 'pooja.gupta@hospital.com', '555-4002', 'Lab_Technician', 15, 'Lab Technician', '2021-09-01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Admission Staff
('ADM002', 'Suresh', 'Rao', 'suresh.rao@hospital.com', '555-5001', 'Admission', 17, 'Admission Officer', '2020-02-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Nurses
('NUR001', 'Lakshmi', 'Devi', 'lakshmi.devi@hospital.com', '555-6001', 'Nurse', 20, 'Head Nurse', '2016-06-10', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('NUR002', 'Mary', 'Thomas', 'mary.thomas@hospital.com', '555-6002', 'Nurse', 20, 'Staff Nurse', '2019-03-22', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('NUR003', 'Fatima', 'Khan', 'fatima.khan@hospital.com', '555-6003', 'Nurse', 20, 'Staff Nurse', '2021-05-18', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),

-- Billing Staff
('BIL001', 'Kiran', 'Shah', 'kiran.shah@hospital.com', '555-7001', 'Billing', 18, 'Billing Manager', '2018-08-12', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE),
('BIL002', 'Geeta', 'Nair', 'geeta.nair@hospital.com', '555-7002', 'Billing', 18, 'Billing Executive', '2020-11-05', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE);

-- Insert Doctor Details
INSERT INTO doctors (staff_id, qualifications, specialization, years_of_experience, registration_number, consultation_fee, follow_up_fee, availability_schedule, education, bio, rating) VALUES
('DOC001', 'MD (Cardiology), DM (Interventional Cardiology)', 'Interventional Cardiology', 15, 'MCI-12345', 800, 400, 
 '{"monday": ["09:00-12:00", "16:00-19:00"], "tuesday": ["09:00-12:00"], "wednesday": ["09:00-12:00", "16:00-19:00"], "thursday": ["09:00-12:00"], "friday": ["09:00-12:00", "16:00-19:00"], "saturday": ["09:00-13:00"]}',
 'MBBS from AIIMS Delhi, MD from CMC Vellore, DM from SGPGI Lucknow',
 'Dr. Rajiv Menon is a renowned interventional cardiologist with expertise in complex angioplasties and cardiac catheterization.', 4.8),

('DOC002', 'MD (Cardiology)', 'Clinical Cardiology', 10, 'MCI-12346', 600, 300,
 '{"monday": ["10:00-13:00"], "tuesday": ["10:00-13:00", "17:00-20:00"], "wednesday": ["10:00-13:00"], "thursday": ["10:00-13:00", "17:00-20:00"], "friday": ["10:00-13:00"], "saturday": ["10:00-14:00"]}',
 'MBBS from KMC Manipal, MD from NIMHANS Bangalore',
 'Dr. Sunita Patel specializes in preventive cardiology and heart failure management.', 4.7),

('DOC003', 'MD (Medicine), DM (Neurology)', 'Neurology', 12, 'MCI-12347', 700, 350,
 '{"monday": ["09:00-12:00", "15:00-18:00"], "tuesday": ["09:00-12:00"], "wednesday": ["09:00-12:00", "15:00-18:00"], "thursday": ["09:00-12:00"], "friday": ["09:00-12:00", "15:00-18:00"]}',
 'MBBS from BHU Varanasi, MD from PGIMER Chandigarh, DM from NIMHANS Bangalore',
 'Dr. Amit Verma is an expert in stroke management and epilepsy treatment.', 4.9),

('DOC004', 'MCh (Neurosurgery)', 'Neurosurgery', 14, 'MCI-12348', 1000, 500,
 '{"monday": ["10:00-14:00"], "tuesday": ["10:00-14:00"], "wednesday": ["10:00-14:00"], "thursday": ["10:00-14:00"], "friday": ["10:00-14:00"]}',
 'MBBS from JIPMER Pondicherry, MS from AIIMS Delhi, MCh from Tata Memorial Mumbai',
 'Dr. Neha Gupta specializes in brain tumor surgery and minimally invasive spine surgery.', 4.8),

('DOC005', 'MS (Orthopedics)', 'Joint Replacement', 18, 'MCI-12349', 800, 400,
 '{"monday": ["09:00-13:00"], "tuesday": ["09:00-13:00"], "wednesday": ["09:00-13:00", "17:00-19:00"], "thursday": ["09:00-13:00"], "friday": ["09:00-13:00", "17:00-19:00"], "saturday": ["09:00-12:00"]}',
 'MBBS from GMC Mumbai, MS from KEM Hospital Mumbai',
 'Dr. Sanjay Rao is a pioneer in knee and hip replacement surgeries with over 5000 successful procedures.', 4.9),

('DOC006', 'MS (Orthopedics)', 'Sports Medicine', 8, 'MCI-12350', 600, 300,
 '{"monday": ["11:00-15:00"], "tuesday": ["11:00-15:00"], "wednesday": ["11:00-15:00"], "thursday": ["11:00-15:00"], "friday": ["11:00-15:00"]}',
 'MBBS from St. John''s Bangalore, MS from CMC Vellore',
 'Dr. Ananya Reddy specializes in sports injuries and arthroscopic surgery.', 4.6),

('DOC007', 'MD (Pediatrics)', 'Pediatrics', 20, 'MCI-12351', 500, 250,
 '{"monday": ["09:00-13:00", "16:00-19:00"], "tuesday": ["09:00-13:00"], "wednesday": ["09:00-13:00", "16:00-19:00"], "thursday": ["09:00-13:00"], "friday": ["09:00-13:00", "16:00-19:00"], "saturday": ["09:00-13:00"]}',
 'MBBS from MMC Chennai, MD from Institute of Child Health Kolkata',
 'Dr. Vikram Shah has extensive experience in neonatal care and pediatric intensive care.', 4.9),

('DOC008', 'MD (Pediatrics)', 'Pediatric Nutrition', 6, 'MCI-12352', 400, 200,
 '{"monday": ["10:00-14:00"], "tuesday": ["10:00-14:00"], "wednesday": ["10:00-14:00"], "thursday": ["10:00-14:00"], "friday": ["10:00-14:00"]}',
 'MBBS from Kasturba Medical College, MD from JIPMER Pondicherry',
 'Dr. Meera Iyer specializes in pediatric nutrition and developmental disorders.', 4.7),

('DOC009', 'MD (OBGYN)', 'High-Risk Pregnancy', 16, 'MCI-12353', 700, 350,
 '{"monday": ["09:00-12:00", "16:00-19:00"], "tuesday": ["09:00-12:00"], "wednesday": ["09:00-12:00", "16:00-19:00"], "thursday": ["09:00-12:00"], "friday": ["09:00-12:00", "16:00-19:00"]}',
 'MBBS from Trivandrum Medical College, MD from CMC Vellore',
 'Dr. Lakshmi Nair is an expert in high-risk pregnancies and minimally invasive gynecological surgery.', 4.8),

('DOC010', 'MD (OBGYN)', 'Obstetrics', 12, 'MCI-12354', 600, 300,
 '{"monday": ["10:00-14:00"], "tuesday": ["10:00-14:00", "17:00-20:00"], "wednesday": ["10:00-14:00"], "thursday": ["10:00-14:00", "17:00-20:00"], "friday": ["10:00-14:00"], "saturday": ["10:00-13:00"]}',
 'MBBS from BJ Medical College Ahmedabad, MD from Seth GS Mumbai',
 'Dr. Deepak Joshi specializes in normal deliveries and fertility treatments.', 4.7),

('DOC011', 'MD (General Medicine)', 'Internal Medicine', 22, 'MCI-12355', 500, 250,
 '{"monday": ["09:00-13:00", "17:00-20:00"], "tuesday": ["09:00-13:00"], "wednesday": ["09:00-13:00", "17:00-20:00"], "thursday": ["09:00-13:00"], "friday": ["09:00-13:00", "17:00-20:00"], "saturday": ["09:00-13:00"]}',
 'MBBS from Grant Medical College Mumbai, MD from KEM Hospital',
 'Dr. Arun Desai is a senior physician with expertise in diabetes and hypertension management.', 4.9),

('DOC012', 'MD (General Medicine)', 'Internal Medicine', 8, 'MCI-12356', 400, 200,
 '{"monday": ["10:00-14:00"], "tuesday": ["10:00-14:00"], "wednesday": ["10:00-14:00"], "thursday": ["10:00-14:00"], "friday": ["10:00-14:00"]}',
 'MBBS from GMC Nagpur, MD from PGIMER Chandigarh',
 'Dr. Kavita Malhotra specializes in infectious diseases and geriatric care.', 4.6),

('DOC013', 'MD (Emergency Medicine)', 'Emergency Medicine', 10, 'MCI-12357', 600, 300,
 '{"monday": ["00:00-23:59"], "tuesday": ["00:00-23:59"], "wednesday": ["00:00-23:59"], "thursday": ["00:00-23:59"], "friday": ["00:00-23:59"], "saturday": ["00:00-23:59"], "sunday": ["00:00-23:59"]}',
 'MBBS from AIIMS Delhi, MD from Apollo Hospitals Chennai',
 'Dr. Rahul Khanna is available 24/7 for emergency cases and trauma management.', 4.8);

-- Insert Sample Medicine Inventory
INSERT INTO medicine_inventory (medicine_id, generic_name, brand_name, manufacturer, category, dosage_form, strength, pack_size, unit_price, mrp, current_stock, reorder_level, batch_number, expiry_date, storage_location) VALUES
('MED001', 'Paracetamol', 'Crocin', 'GSK', 'Analgesic', 'Tablet', '500mg', '10 tablets', 25.00, 35.00, 500, 50, 'B001', '2026-12-31', 'Rack A1'),
('MED002', 'Ibuprofen', 'Brufen', 'Abbott', 'Analgesic', 'Tablet', '400mg', '10 tablets', 30.00, 42.00, 450, 50, 'B002', '2026-11-30', 'Rack A1'),
('MED003', 'Amoxicillin', 'Augmentin', 'GSK', 'Antibiotic', 'Tablet', '625mg', '6 tablets', 120.00, 165.00, 300, 30, 'B003', '2026-10-31', 'Rack B1'),
('MED004', 'Azithromycin', 'Zithromax', 'Pfizer', 'Antibiotic', 'Tablet', '500mg', '3 tablets', 150.00, 210.00, 250, 25, 'B004', '2026-09-30', 'Rack B1'),
('MED005', 'Metformin', 'Glycomet', 'USV', 'Antidiabetic', 'Tablet', '500mg', '10 tablets', 45.00, 62.00, 400, 40, 'B005', '2027-01-31', 'Rack C1'),
('MED006', 'Amlodipine', 'Amlong', 'Micro Labs', 'Antihypertensive', 'Tablet', '5mg', '10 tablets', 55.00, 78.00, 350, 35, 'B006', '2027-02-28', 'Rack C2'),
('MED007', 'Atorvastatin', 'Atorva', 'Zydus', 'Antihyperlipidemic', 'Tablet', '10mg', '10 tablets', 85.00, 120.00, 280, 28, 'B007', '2027-03-31', 'Rack C3'),
('MED008', 'Omeprazole', 'Omez', 'Dr. Reddy''s', 'Antacid', 'Capsule', '20mg', '15 capsules', 95.00, 135.00, 320, 32, 'B008', '2026-12-31', 'Rack D1'),
('MED009', 'Salbutamol', 'Asthalin', 'Cipla', 'Bronchodilator', 'Inhaler', '100mcg', '1 inhaler', 120.00, 170.00, 150, 15, 'B009', '2027-04-30', 'Rack E1'),
('MED010', 'Insulin Glargine', 'Lantus', 'Sanofi', 'Antidiabetic', 'Injection', '100IU/ml', '1 vial', 450.00, 650.00, 80, 10, 'B010', '2026-08-31', 'Refrigerator');

-- Create function to generate Patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.patient_id := 'P' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Patient ID generation
DROP TRIGGER IF EXISTS trigger_generate_patient_id ON patients;
CREATE TRIGGER trigger_generate_patient_id
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION generate_patient_id();

-- Create function to generate Appointment ID
CREATE OR REPLACE FUNCTION generate_appointment_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.appointment_id := 'APT' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_appointment_id ON appointments;
CREATE TRIGGER trigger_generate_appointment_id
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_appointment_id();

-- Create function to generate Prescription ID
CREATE OR REPLACE FUNCTION generate_prescription_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.prescription_id := 'RX' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_prescription_id ON prescriptions;
CREATE TRIGGER trigger_generate_prescription_id
    BEFORE INSERT ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION generate_prescription_id();

-- Create function to generate Admission ID
CREATE OR REPLACE FUNCTION generate_admission_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.admission_id := 'ADM' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_admission_id ON admissions;
CREATE TRIGGER trigger_generate_admission_id
    BEFORE INSERT ON admissions
    FOR EACH ROW
    EXECUTE FUNCTION generate_admission_id();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admissions_updated_at BEFORE UPDATE ON admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicine_inventory_updated_at BEFORE UPDATE ON medicine_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_orders_updated_at BEFORE UPDATE ON lab_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit log function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, timestamp)
        VALUES (CURRENT_USER, 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, timestamp)
        VALUES (CURRENT_USER, 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, timestamp)
        VALUES (CURRENT_USER, 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_staff AFTER INSERT OR UPDATE OR DELETE ON staff FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_admissions AFTER INSERT OR UPDATE OR DELETE ON admissions FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_prescriptions AFTER INSERT OR UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_billing AFTER INSERT OR UPDATE OR DELETE ON billing FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ============================================
-- PHARMACY SALES TABLES
-- ============================================

-- Pharmacy Sales Table
CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id VARCHAR(20) PRIMARY KEY,
    prescription_id VARCHAR(15) REFERENCES prescriptions(prescription_id),
    patient_id VARCHAR(10) REFERENCES patients(patient_id),
    patient_name VARCHAR(100) NOT NULL,
    
    -- Financial
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(20) NOT NULL DEFAULT 'Cash',
    payment_status VARCHAR(20) DEFAULT 'Completed',
    
    -- Status
    status VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Sale Medicines Table
CREATE TABLE IF NOT EXISTS pharmacy_sale_medicines (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(20) REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
    medicine_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pharmacy sales
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_patient ON pharmacy_sales(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_prescription ON pharmacy_sales(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_created ON pharmacy_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sale_medicines_sale ON pharmacy_sale_medicines(sale_id);

-- Create view for today's pharmacy sales
CREATE OR REPLACE VIEW today_pharmacy_sales AS
SELECT 
    ps.*,
    COUNT(psm.id) as medicine_count,
    SUM(psm.subtotal) as total_medicines_value
FROM pharmacy_sales ps
LEFT JOIN pharmacy_sale_medicines psm ON ps.id = psm.sale_id
WHERE DATE(ps.created_at) = CURRENT_DATE
GROUP BY ps.id;

-- Create view for pharmacy revenue
CREATE OR REPLACE VIEW pharmacy_revenue_summary AS
SELECT 
    DATE(created_at) as sales_date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'Completed') as completed_transactions,
    SUM(grand_total) as total_revenue,
    SUM(grand_total) FILTER (WHERE status = 'Completed') as completed_revenue,
    AVG(grand_total) as average_sale_amount
FROM pharmacy_sales
GROUP BY DATE(created_at)
ORDER BY sales_date DESC;

-- Create view for low stock medicines
CREATE OR REPLACE VIEW low_stock_medicines AS
SELECT 
    id,
    medicine_id,
    generic_name,
    brand_name,
    category,
    current_stock,
    reorder_level,
    (reorder_level - current_stock) as shortage_quantity,
    unit_price,
    expiry_date,
    status
FROM medicine_inventory
WHERE current_stock <= reorder_level AND status = 'Active'
ORDER BY current_stock ASC;

-- Create view for expiring medicines
CREATE OR REPLACE VIEW expiring_medicines AS
SELECT 
    id,
    medicine_id,
    generic_name,
    brand_name,
    category,
    current_stock,
    unit_price,
    expiry_date,
    EXTRACT(DAY FROM expiry_date - CURRENT_DATE) as days_to_expiry,
    status
FROM medicine_inventory
WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'Active'
ORDER BY expiry_date ASC;

-- Create trigger to update pharmacy_sales timestamp
CREATE OR REPLACE FUNCTION update_pharmacy_sales_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pharmacy_sales_updated_at
BEFORE UPDATE ON pharmacy_sales
FOR EACH ROW
EXECUTE FUNCTION update_pharmacy_sales_updated_at_column();

-- Create view for today's appointments
CREATE OR REPLACE VIEW today_appointments AS
SELECT 
    a.*,
    p.first_name || ' ' || p.last_name as patient_name,
    p.mobile_number as patient_phone,
    p.age as patient_age,
    p.gender as patient_gender,
    s.first_name || ' ' || s.last_name as doctor_name,
    d.dept_name as department_name
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN staff s ON a.doctor_id = s.staff_id
JOIN departments d ON a.department_id = d.id
WHERE a.appointment_date = CURRENT_DATE;

-- Create view for bed occupancy
CREATE OR REPLACE VIEW bed_occupancy_summary AS
SELECT 
    bed_type,
    COUNT(*) as total_beds,
    COUNT(*) FILTER (WHERE status = 'Occupied') as occupied_beds,
    COUNT(*) FILTER (WHERE status = 'Vacant') as vacant_beds,
    COUNT(*) FILTER (WHERE status = 'Reserved') as reserved_beds,
    COUNT(*) FILTER (WHERE status = 'Under_Maintenance') as maintenance_beds,
    ROUND(COUNT(*) FILTER (WHERE status = 'Occupied') * 100.0 / COUNT(*), 2) as occupancy_percentage
FROM beds
GROUP BY bed_type;

-- Create view for patient medical summary
CREATE OR REPLACE VIEW patient_medical_summary AS
SELECT 
    p.patient_id,
    p.first_name || ' ' || p.last_name as patient_name,
    p.age,
    p.gender,
    p.blood_group,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT adm.id) as total_admissions,
    COUNT(DISTINCT pr.id) as total_prescriptions,
    COUNT(DISTINCT lo.id) as total_lab_tests,
    MAX(a.appointment_date) as last_visit_date
FROM patients p
LEFT JOIN appointments a ON p.patient_id = a.patient_id
LEFT JOIN admissions adm ON p.patient_id = adm.patient_id
LEFT JOIN prescriptions pr ON p.patient_id = pr.patient_id
LEFT JOIN lab_orders lo ON p.patient_id = lo.patient_id
GROUP BY p.patient_id, p.first_name, p.last_name, p.age, p.gender, p.blood_group;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hms_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hms_user;

-- Print completion message
SELECT 'Hospital Management System Database Schema Created Successfully!' as status;
