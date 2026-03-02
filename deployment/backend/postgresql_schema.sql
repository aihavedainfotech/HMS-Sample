-- Hospital Management System - PostgreSQL Database Schema
-- Converted from SQLite for Supabase deployment

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    dept_code VARCHAR(20) UNIQUE NOT NULL,
    dept_name VARCHAR(255) NOT NULL,
    description TEXT,
    floor_number INTEGER,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(10) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    marital_status VARCHAR(50),
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_number VARCHAR(20),
    emergency_contact_relation VARCHAR(100),
    current_address_street TEXT,
    current_address_area VARCHAR(255),
    current_city VARCHAR(100),
    current_state VARCHAR(100),
    current_pincode VARCHAR(20),
    permanent_address_same_as_current BOOLEAN DEFAULT false,
    permanent_address_street TEXT,
    permanent_address_area VARCHAR(255),
    permanent_city VARCHAR(100),
    permanent_state VARCHAR(100),
    permanent_pincode VARCHAR(20),
    id_proof_type VARCHAR(100),
    id_proof_number VARCHAR(100),
    id_proof_file_path TEXT,
    known_allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    previous_surgeries TEXT,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_coverage_amount DECIMAL(12,2),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    registered_by VARCHAR(100),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_fee_paid BOOLEAN DEFAULT false,
    registration_fee_receipt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Doctor', 'Receptionist', 'Pharmacist', 'Lab_Technician', 'Admission', 'Nurse', 'Admin', 'Billing', 'IT_Support', 'Housekeeping')),
    department_id INTEGER REFERENCES departments(id),
    sub_department VARCHAR(100),
    designation VARCHAR(255),
    date_of_joining DATE,
    employment_type VARCHAR(50) DEFAULT 'Full-time',
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) UNIQUE REFERENCES staff(staff_id),
    qualifications TEXT,
    specialization VARCHAR(255),
    years_of_experience INTEGER,
    registration_number VARCHAR(100),
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
    is_available_for_teleconsultation BOOLEAN DEFAULT false,
    max_patients_per_day INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor Unavailability Table
CREATE TABLE IF NOT EXISTS doctor_unavailability (
    id SERIAL PRIMARY KEY,
    doctor_id VARCHAR(50) NOT NULL REFERENCES staff(staff_id),
    unavailable_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, unavailable_date)
);

-- Beds Table
CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    bed_id VARCHAR(50) UNIQUE NOT NULL,
    bed_type VARCHAR(100) NOT NULL CHECK (bed_type IN ('General_Male', 'General_Female', 'General_Pediatric', 'General_Maternity', 'Private_AC', 'Private_Non_AC', 'Deluxe', 'Suite', 'ICU', 'NICU', 'PICU', 'CCU', 'HDU', 'Isolation', 'Dialysis', 'Recovery', 'Labor')),
    ward_name VARCHAR(100),
    floor_number INTEGER,
    room_number VARCHAR(50),
    has_oxygen BOOLEAN DEFAULT false,
    has_monitor BOOLEAN DEFAULT false,
    has_ventilator BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Vacant' CHECK (status IN ('Vacant', 'Occupied', 'Reserved', 'Under_Maintenance', 'Blocked')),
    daily_charge DECIMAL(10,2),
    current_patient_id VARCHAR(50) REFERENCES patients(patient_id),
    admission_date TIMESTAMP,
    expected_discharge_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES staff(staff_id),
    department_id INTEGER REFERENCES departments(id),
    appointment_type VARCHAR(50) NOT NULL CHECK (appointment_type IN ('First_Consultation', 'Follow_up', 'Emergency')),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    time_slot VARCHAR(50),
    token_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending_Approval' CHECK (status IN ('Pending_Approval', 'Confirmed', 'Visited', 'In_Progress', 'Completed', 'Cancelled', 'No_Show')),
    reason_for_visit TEXT,
    consultation_mode VARCHAR(50) DEFAULT 'In-person' CHECK (consultation_mode IN ('In-person', 'Teleconsultation')),
    special_requirements TEXT,
    booked_by VARCHAR(100),
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    booking_source VARCHAR(50) DEFAULT 'Online' CHECK (booking_source IN ('Online', 'Walk-in', 'Phone')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    consultation_fee DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Waived')),
    payment_mode VARCHAR(50),
    payment_transaction_id VARCHAR(100),
    mobile_number VARCHAR(20),
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admissions Table
CREATE TABLE IF NOT EXISTS admissions (
    id SERIAL PRIMARY KEY,
    admission_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    admitting_doctor_id VARCHAR(50) REFERENCES staff(staff_id),
    department_id INTEGER REFERENCES departments(id),
    bed_id VARCHAR(50) REFERENCES beds(bed_id),
    admission_date TIMESTAMP NOT NULL,
    expected_discharge_date TIMESTAMP,
    actual_discharge_date TIMESTAMP,
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    admission_reason TEXT,
    admission_type VARCHAR(50) CHECK (admission_type IN ('Emergency', 'Elective', 'Maternity', 'Day_Care')),
    guardian_name VARCHAR(255),
    guardian_relation VARCHAR(100),
    guardian_contact VARCHAR(20),
    payment_type VARCHAR(50) CHECK (payment_type IN ('Cash', 'Insurance', 'Corporate', 'Government')),
    insurance_provider VARCHAR(255),
    policy_number VARCHAR(100),
    tpa_name VARCHAR(255),
    pre_authorization_number VARCHAR(100),
    coverage_amount DECIMAL(12,2),
    advance_payment DECIMAL(10,2),
    total_bill_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged', 'DAMA', 'Transferred')),
    discharge_summary TEXT,
    discharge_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    prescription_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES staff(staff_id),
    appointment_id VARCHAR(50) REFERENCES appointments(appointment_id),
    admission_id VARCHAR(50) REFERENCES admissions(admission_id),
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
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Dispensed', 'Cancelled')),
    doctor_digital_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription Medicines Table
CREATE TABLE IF NOT EXISTS prescription_medicines (
    id SERIAL PRIMARY KEY,
    prescription_id VARCHAR(50) REFERENCES prescriptions(prescription_id),
    medicine_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    strength VARCHAR(100),
    dosage_form VARCHAR(100),
    quantity INTEGER,
    frequency VARCHAR(100),
    timing VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    quantity_dispensed INTEGER DEFAULT 0,
    dispensed_by VARCHAR(50) REFERENCES staff(staff_id),
    dispensed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine Inventory Table
CREATE TABLE IF NOT EXISTS medicine_inventory (
    id SERIAL PRIMARY KEY,
    medicine_id VARCHAR(100) UNIQUE,
    generic_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    manufacturer VARCHAR(255),
    category VARCHAR(100),
    dosage_form VARCHAR(100),
    strength VARCHAR(100),
    pack_size VARCHAR(100),
    unit_price DECIMAL(10,2),
    mrp DECIMAL(10,2),
    current_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    batch_number VARCHAR(100),
    expiry_date DATE,
    storage_location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Orders Table
CREATE TABLE IF NOT EXISTS lab_orders (
    id SERIAL PRIMARY KEY,
    lab_order_id SERIAL UNIQUE,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    ordered_by VARCHAR(50) REFERENCES staff(staff_id),
    appointment_id VARCHAR(50) REFERENCES appointments(appointment_id),
    admission_id VARCHAR(50) REFERENCES admissions(admission_id),
    test_category VARCHAR(255),
    test_name VARCHAR(255),
    test_code VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'Routine',
    sample_type VARCHAR(100),
    fasting_required BOOLEAN DEFAULT false,
    clinical_notes TEXT,
    special_instructions TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sample_collection_date TIMESTAMP,
    result_entry_date TIMESTAMP,
    verification_date TIMESTAMP,
    report_generated_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sample_Collected', 'In_Progress', 'Results_Entered', 'Verified', 'Delivered', 'Cancelled')),
    actual_completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab Results Table
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    lab_order_id INTEGER REFERENCES lab_orders(id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    parameter_name VARCHAR(255) NOT NULL,
    result_value TEXT,
    unit VARCHAR(100),
    reference_range TEXT,
    status VARCHAR(50) CHECK (status IN ('Normal', 'Abnormal', 'Critical')),
    is_critical BOOLEAN DEFAULT false,
    entered_by VARCHAR(50) REFERENCES staff(staff_id),
    verified_by VARCHAR(50) REFERENCES staff(staff_id),
    notes TEXT,
    technician_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    recorded_by VARCHAR(50) REFERENCES staff(staff_id),
    admission_id VARCHAR(50) REFERENCES admissions(admission_id),
    appointment_id VARCHAR(50) REFERENCES appointments(appointment_id),
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
    consciousness_level VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue Management Table
CREATE TABLE IF NOT EXISTS queue_management (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(50) REFERENCES appointments(appointment_id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    doctor_id VARCHAR(50) REFERENCES staff(staff_id),
    token_number VARCHAR(50) NOT NULL,
    queue_date DATE NOT NULL,
    arrival_time TIMESTAMP,
    called_in_time TIMESTAMP,
    consultation_start_time TIMESTAMP,
    consultation_end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Visited', 'In_Progress', 'Completed', 'No_Show')),
    waiting_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pending Payments Table
CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(50),
    description TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Waived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES pending_payments(id),
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(50),
    transaction_id VARCHAR(100),
    collected_by VARCHAR(50) REFERENCES staff(staff_id),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_type VARCHAR(50),
    reference_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bed Occupancy Summary View
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile_number);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON staff(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admissions_updated_at BEFORE UPDATE ON admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicine_inventory_updated_at BEFORE UPDATE ON medicine_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_orders_updated_at BEFORE UPDATE ON lab_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON lab_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vital_signs_updated_at BEFORE UPDATE ON vital_signs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queue_management_updated_at BEFORE UPDATE ON queue_management FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pending_payments_updated_at BEFORE UPDATE ON pending_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
