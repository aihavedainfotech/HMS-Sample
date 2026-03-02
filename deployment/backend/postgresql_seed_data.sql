-- Hospital Management System - PostgreSQL Seed Data
-- Converted from SQLite for Supabase deployment

-- Seed Data (Departments)
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
('NURS', 'Nursing', 'Patient care', 1, '555-0120')
ON CONFLICT (dept_code) DO NOTHING;

-- Seed Data (Staff)
INSERT INTO staff (staff_id, first_name, last_name, email, phone, role, department_id, designation, date_of_joining, password_hash, is_active) VALUES
('ADM001', 'System', 'Administrator', 'admin@hospital.com', '555-1000', 'Admin', 17, 'System Administrator', '2020-01-01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', true),
('REC001', 'Priya', 'Sharma', 'priya.sharma@hospital.com', '555-1001', 'Receptionist', 19, 'Senior Receptionist', '2021-03-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', true),
('DOC001', 'Dr. Rajiv', 'Menon', 'rajiv.menon@hospital.com', '555-2001', 'Doctor', 1, 'Senior Cardiologist', '2019-05-10', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', true),
('PHR001', 'Anil', 'Sharma', 'anil.sharma@hospital.com', '555-3001', 'Pharmacist', 16, 'Chief Pharmacist', '2018-05-15', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', true),
('BIL001', 'Kiran', 'Shah', 'kiran.shah@hospital.com', '555-7001', 'Billing', 18, 'Billing Manager', '2018-08-12', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', true),
('BIL002', 'Geeta', 'Nair', 'geeta.nair@hospital.com', '555-7002', 'Billing', 18, 'Billing Executive', '2020-11-05', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', true)
ON CONFLICT (staff_id) DO NOTHING;

-- Seed Data (Doctors)
INSERT INTO doctors (staff_id, qualifications, specialization, years_of_experience, registration_number, consultation_fee, follow_up_fee, availability_schedule, education, bio, rating) VALUES
('DOC001', 'MD (Cardiology), DM (Interventional Cardiology)', 'Interventional Cardiology', 15, 'MCI-12345', 800, 400, 
 '{"monday": ["09:00-12:00", "16:00-19:00"], "tuesday": ["09:00-12:00"], "wednesday": ["09:00-12:00", "16:00-19:00"], "thursday": ["09:00-12:00"], "friday": ["09:00-12:00", "16:00-19:00"], "saturday": ["09:00-13:00"]}',
 'MBBS from AIIMS Delhi, MD from CMC Vellore, DM from SGPGI Lucknow',
 'Dr. Rajiv Menon is a renowned interventional cardiologist with expertise in complex angioplasties and cardiac catheterization.', 4.8)
ON CONFLICT (staff_id) DO NOTHING;

-- Sample Medicine Inventory Data
INSERT INTO medicine_inventory (medicine_id, generic_name, brand_name, manufacturer, category, dosage_form, strength, pack_size, unit_price, mrp, current_stock, reorder_level, is_active) VALUES
('MED001', 'Paracetamol', 'Crocin', 'GSK', 'Analgesic', 'Tablet', '500mg', '10 strips', 15.50, 20.00, 500, 100, true),
('MED002', 'Ibuprofen', 'Brufen', 'Abbott', 'Analgesic', 'Tablet', '400mg', '10 strips', 25.00, 35.00, 300, 50, true),
('MED003', 'Amoxicillin', 'Moxikind', 'Mankind', 'Antibiotic', 'Capsule', '500mg', '10 capsules', 45.00, 60.00, 200, 50, true),
('MED004', 'Omeprazole', 'Omez', 'Dr. Reddy', 'Antacid', 'Capsule', '20mg', '10 capsules', 35.00, 45.00, 150, 30, true),
('MED005', 'Metformin', 'Glycomet', 'USV', 'Antidiabetic', 'Tablet', '500mg', '10 strips', 55.00, 75.00, 400, 80, true)
ON CONFLICT (medicine_id) DO NOTHING;

-- Sample Bed Data
INSERT INTO beds (bed_id, bed_type, ward_name, floor_number, room_number, has_oxygen, has_monitor, has_ventilator, status, daily_charge) VALUES
('BED001', 'General_Male', 'Ward A', 1, '101', false, false, false, 'Vacant', 500.00),
('BED002', 'General_Male', 'Ward A', 1, '101', false, false, false, 'Vacant', 500.00),
('BED003', 'General_Female', 'Ward B', 1, '102', false, false, false, 'Vacant', 500.00),
('BED004', 'Private_AC', 'Wing C', 2, '201', true, true, false, 'Vacant', 1500.00),
('BED005', 'ICU', 'ICU Ward', 2, 'ICU01', true, true, true, 'Vacant', 3000.00),
('BED006', 'NICU', 'NICU Ward', 2, 'NICU01', true, true, true, 'Vacant', 3500.00)
ON CONFLICT (bed_id) DO NOTHING;
