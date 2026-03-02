-- Hospital Management System - PostgreSQL Database Schema

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    dept_code TEXT UNIQUE NOT NULL,
    dept_name TEXT NOT NULL,
    description TEXT,
    floor_number INTEGER,
    contact_number TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
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
    permanent_address_same_as_current BOOLEAN DEFAULT FALSE,
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
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    current_otp TEXT,
    otp_expiry TIMESTAMP,
    registered_by TEXT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_fee_paid BOOLEAN DEFAULT FALSE,
    registration_fee_receipt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
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
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
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
    is_available_for_teleconsultation BOOLEAN DEFAULT FALSE,
    max_patients_per_day INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor Unavailability
CREATE TABLE IF NOT EXISTS doctor_unavailability (
    id SERIAL PRIMARY KEY,
    doctor_id TEXT NOT NULL REFERENCES staff(staff_id),
    unavailable_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, unavailable_date)
);

-- Beds Table
CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    bed_id TEXT UNIQUE NOT NULL,
    bed_type TEXT NOT NULL CHECK (bed_type IN ('General_Male', 'General_Female', 'General_Pediatric', 'General_Maternity', 'Private_AC', 'Private_Non_AC', 'Deluxe', 'Suite', 'ICU', 'NICU', 'PICU', 'CCU', 'HDU', 'Isolation', 'Dialysis', 'Recovery', 'Labor')),
    ward_name TEXT,
    floor_number INTEGER,
    room_number TEXT,
    has_oxygen BOOLEAN DEFAULT FALSE,
    has_monitor BOOLEAN DEFAULT FALSE,
    has_ventilator BOOLEAN DEFAULT FALSE,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Orders Table
CREATE TABLE IF NOT EXISTS lab_orders (
    id SERIAL PRIMARY KEY,
    lab_order_id TEXT, -- Keep as text consistent with some logic
    patient_id TEXT REFERENCES patients(patient_id),
    ordered_by TEXT REFERENCES staff(staff_id),
    appointment_id TEXT REFERENCES appointments(appointment_id),
    admission_id TEXT REFERENCES admissions(admission_id),
    test_category TEXT,
    test_name TEXT,
    test_code TEXT,
    priority TEXT DEFAULT 'Routine',
    sample_type TEXT,
    fasting_required BOOLEAN DEFAULT FALSE,
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
    id SERIAL PRIMARY KEY,
    lab_order_id INTEGER REFERENCES lab_orders(id),
    patient_id TEXT REFERENCES patients(patient_id),
    parameter_name TEXT NOT NULL,
    result_value TEXT,
    unit TEXT,
    reference_range TEXT,
    status TEXT CHECK (status IN ('Normal', 'Abnormal', 'Critical')),
    is_critical BOOLEAN DEFAULT FALSE,
    entered_by TEXT REFERENCES staff(staff_id),
    verified_by TEXT REFERENCES staff(staff_id),
    notes TEXT,
    technician_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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

-- Pending Payments Table
CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    reference_type TEXT NOT NULL,
    reference_id TEXT,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Waived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES pending_payments(id),
    patient_id TEXT REFERENCES patients(patient_id),
    amount DECIMAL(10,2) NOT NULL,
    method TEXT,
    transaction_id TEXT,
    collected_by TEXT REFERENCES staff(staff_id),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registration OTPs
CREATE TABLE IF NOT EXISTS registration_otps (
    mobile_number TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expiry TIMESTAMP NOT NULL
);

-- Lab Reports (for lab workflow)
CREATE TABLE IF NOT EXISTS lab_reports (
    id SERIAL PRIMARY KEY,
    lab_order_id INTEGER NOT NULL,
    patient_id VARCHAR(20) NOT NULL,
    doctor_id VARCHAR(20),
    test_name VARCHAR(100),
    report_data TEXT,
    findings TEXT,
    recommendations TEXT,
    generated_by VARCHAR(20),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Sales
CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id SERIAL PRIMARY KEY,
    sale_id TEXT UNIQUE,
    patient_id TEXT REFERENCES patients(patient_id),
    prescription_id TEXT REFERENCES prescriptions(prescription_id),
    sold_by TEXT REFERENCES staff(staff_id),
    total_amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Cancelled', 'Returned')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Sale Medicines
CREATE TABLE IF NOT EXISTS pharmacy_sale_medicines (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES pharmacy_sales(id),
    medicine_name TEXT NOT NULL,
    batch_number TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    claim_id TEXT UNIQUE,
    patient_id TEXT REFERENCES patients(patient_id),
    admission_id TEXT,
    insurance_provider TEXT,
    policy_number TEXT,
    claim_amount DECIMAL(12,2),
    approved_amount DECIMAL(12,2),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Under_Review', 'Settled')),
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bed Occupancy Summary View
DROP VIEW IF EXISTS bed_occupancy_summary;
CREATE VIEW bed_occupancy_summary AS
SELECT 
    bed_type,
    COUNT(*) as total_beds,
    SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_beds,
    SUM(CASE WHEN status = 'Vacant' THEN 1 ELSE 0 END) as vacant_beds,
    SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved_beds,
    SUM(CASE WHEN status = 'Under_Maintenance' THEN 1 ELSE 0 END) as maintenance_beds,
    ROUND(CAST(CAST(SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / NULLIF(COUNT(*), 0) AS NUMERIC), 2) as occupancy_percentage
FROM beds
GROUP BY bed_type;
