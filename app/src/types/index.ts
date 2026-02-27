// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Patient' | 'Doctor' | 'Staff';
}

export interface Patient {
  patient_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  blood_group?: string;
  marital_status?: string;
  mobile_number: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  emergency_contact_relation?: string;
  current_address_street?: string;
  current_address_area?: string;
  current_city?: string;
  current_state?: string;
  current_pincode?: string;
  known_allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  previous_surgeries?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_coverage_amount?: number;
  registration_date: string;
  last_login?: string;
}

export interface Doctor {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  qualifications: string;
  specialization: string;
  years_of_experience: number;
  registration_number: string;
  consultation_fee: number;
  follow_up_fee: number;
  availability_schedule: Record<string, string[]>;
  education: string;
  bio: string;
  rating: number;
  total_reviews: number;
  profile_image_path?: string;
  dept_name: string;
  is_available_for_teleconsultation: boolean;
  max_patients_per_day: number;
  certifications?: string;
  awards?: string;
}

export interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
  description: string;
  floor_number?: number;
  contact_number?: string;
  email?: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  icon: string;
  departments: string[];
  equipment: string[];
  timings: string;
}

export interface Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  department_id?: number;
  appointment_type: 'First_Consultation' | 'Follow_up' | 'Emergency';
  appointment_date: string;
  appointment_time: string;
  time_slot?: string;
  token_number: string;
  status: 'Pending_Approval' | 'Confirmed' | 'In_Progress' | 'Completed' | 'Cancelled' | 'No_Show';
  reason_for_visit?: string;
  consultation_mode: 'In-person' | 'Teleconsultation';
  special_requirements?: string;
  consultation_fee: number;
  payment_status: string;
  patient_name?: string;
  patient_phone?: string;
  patient_age?: number;
  doctor_name?: string;
  department_name?: string;
  booking_source?: string;
}

export interface Prescription {
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  prescription_date: string;
  diagnosis: string;
  chief_complaint?: string;
  examination_findings?: string;
  vital_signs?: Record<string, unknown>;
  general_instructions?: string;
  diet_advice?: string;
  activity_restrictions?: string;
  warning_signs?: string;
  follow_up_date?: string;
  follow_up_instructions?: string;
  status: string;
  patient_name?: string;
  doctor_name?: string;
  medicines?: PrescriptionMedicine[];
}

export interface PrescriptionMedicine {
  id: number;
  medicine_name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  dosage_form?: string;
  quantity: string;
  frequency: string;
  timing?: string;
  duration: string;
  instructions?: string;
  quantity_dispensed?: number;
}

export interface LabOrder {
  lab_order_id: string;
  patient_id: string;
  ordered_by: string;
  test_category: string;
  test_name: string;
  test_code?: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  sample_type?: string;
  fasting_required: boolean;
  status: string;
  clinical_notes?: string;
  order_date: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface LabResult {
  id: number;
  lab_order_id: string;
  parameter_name: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical';
  is_critical: boolean;
  technician_notes?: string;
}

export interface Bed {
  bed_id: string;
  bed_type: string;
  ward_name?: string;
  floor_number?: number;
  room_number?: string;
  has_oxygen: boolean;
  has_monitor: boolean;
  has_ventilator: boolean;
  status: 'Vacant' | 'Occupied' | 'Reserved' | 'Under_Maintenance' | 'Blocked';
  daily_charge: number;
  current_patient_id?: string;
  patient_name?: string;
}

export interface Admission {
  admission_id: string;
  patient_id: string;
  admitting_doctor_id: string;
  bed_id: string;
  admission_date: string;
  expected_discharge_date?: string;
  actual_discharge_date?: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  admission_reason: string;
  admission_type: string;
  status: string;
  patient_name?: string;
  doctor_name?: string;
  bed_type?: string;
  ward_name?: string;
  room_number?: string;
}

export interface VitalSigns {
  id: number;
  patient_id: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  blood_sugar?: number;
  pain_score?: number;
  recorded_at: string;
  recorded_by_name?: string;
}

export interface Bill {
  bill_id: string;
  patient_id: string;
  bill_type: string;
  bill_date: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  status: string;
}

export interface DashboardStats {
  today_appointments: number;
  pending_consultations: number;
  completed_today: number;
  pending_lab_results: number;
}

export interface TimeSlot {
  time: string;
  period: 'Morning' | 'Afternoon' | 'Evening';
  available: boolean;
}
