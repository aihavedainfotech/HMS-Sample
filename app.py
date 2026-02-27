"""
Hospital Management System - Flask Backend API
===============================================
Comprehensive backend API for Patient Portal and Staff Portal
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO, join_room, leave_room
from datetime import datetime, timedelta, date
from decimal import Decimal
import sqlite3
import json
import os
import sys
import uuid
import re
from functools import wraps
import traceback

DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), 'hospital_db.sqlite'))

from flask.json.provider import DefaultJSONProvider

# Custom JSON Provider for Flask 2.3+
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, sqlite3.Row):
            return dict(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

# Initialize Flask App
app = Flask(__name__)
app.json = CustomJSONProvider(app)

# Production configuration
if os.getenv('RENDER'):
    # Render-specific configuration
    app.config['DEBUG'] = False
    # Don't initialize SocketIO for production with gunicorn
    socketio = None
else:
    # Local development with SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Initialize Extensions
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["10000 per day", "2000 per hour"],
    storage_uri="memory://"
)

# Helper function for safe SocketIO emission
def safe_emit(event, data, namespace=None, room=None):
    """Safely emit SocketIO events - works in both dev and production"""
    if socketio is not None:
        try:
            if namespace and room:
                socketio.emit(event, data, namespace=namespace, room=room)
            elif namespace:
                socketio.emit(event, data, namespace=namespace)
            else:
                socketio.emit(event, data)
        except Exception as e:
            print(f"SocketIO emit error: {e}")
    # In production, silently skip SocketIO emissions

# Database Connection Helper
def get_db_connection():
    """Create and return a database connection"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Allow accessing columns by name
    return conn

def get_dict_cursor(conn):
    """Return a cursor - sqlite3 with row_factory acts like dict cursor"""
    return conn.cursor()

def init_db():
    """Initialize the database with schema"""
    if not os.path.exists(DB_FILE):
        conn = get_db_connection()
        schema_path = os.path.join(os.path.dirname(__file__), '../database/sqlite_schema.sql')
        with open(schema_path, 'r') as f:
            conn.executescript(f.read())
        conn.close()
        print("Initialized SQLite database.")

# Initialize DB on start
init_db()
print(f"DEBUG: Database absolute path: {os.path.abspath(DB_FILE)}")

# Role-based Access Control Decorator
def role_required(allowed_roles):
    """Decorator to check if user has required role"""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role', '')
            if user_role not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone):
    pattern = r'^[0-9]{10}$'
    return re.match(pattern, phone) is not None

def validate_pincode(pincode):
    pattern = r'^[0-9]{6}$'
    return re.match(pattern, pincode) is not None

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.route('/api/auth/patient/login', methods=['POST'])
@limiter.limit("5 per minute")
def patient_login():
    """Patient login endpoint"""
    try:
        data = request.get_json()
        patient_id = data.get('patientId', '').upper()
        password = data.get('password', '')
        
        if not patient_id or not password:
            return jsonify({'message': 'Patient ID and password are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT patient_id, first_name, last_name, email, mobile_number, 
                   date_of_birth, gender, password_hash
            FROM patients 
            WHERE patient_id = ? AND is_active = 1
        """, (patient_id,))
        
        patient = cursor.fetchone()
        
        if not patient or not bcrypt.check_password_hash(patient['password_hash'], password):
            return jsonify({'message': 'Invalid Patient ID or password'}), 401
        
        # Update last login
        cursor.execute("UPDATE patients SET last_login = ? WHERE patient_id = ?", 
                      (datetime.now(), patient_id))
        conn.commit()
        
        # Create access token
        access_token = create_access_token(
            identity=patient['patient_id'],
            additional_claims={'role': 'Patient'}
        )
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'access_token': access_token,
            'patient': {
                'patient_id': patient['patient_id'],
                'first_name': patient['first_name'],
                'last_name': patient['last_name'],
                'email': patient['email'],
                'mobile_number': patient['mobile_number'],
                'date_of_birth': patient['date_of_birth'],
                'gender': patient['gender']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500

@app.route('/api/auth/staff/login', methods=['POST'])
@limiter.limit("100 per minute")
def staff_login():
    """Staff login endpoint"""
    data = request.get_json()
    staff_id = data.get('staff_id', '').upper()
    password = data.get('password', '')
    department = data.get('department', '')
    
    if not staff_id or not password:
        return jsonify({'error': 'Staff ID and password are required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute(
            """SELECT s.*, d.dept_name 
               FROM staff s 
               LEFT JOIN departments d ON s.department_id = d.id 
               WHERE s.staff_id = ? AND s.is_active = 1""",
            (staff_id,)
        )
        staff = cursor.fetchone()
        
        if not staff:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if account is locked
        if staff['locked_until']:
            locked_until = datetime.strptime(staff['locked_until'], '%Y-%m-%d %H:%M:%S')
            if locked_until > datetime.now():
                return jsonify({'error': 'Account is temporarily locked. Please try again later.'}), 403
        
        if not bcrypt.check_password_hash(staff['password_hash'], password):
            # Increment failed login attempts
            cursor.execute(
                """UPDATE staff 
                   SET failed_login_attempts = failed_login_attempts + 1,
                       locked_until = CASE WHEN failed_login_attempts >= 2 THEN datetime('now', '+30 minutes') ELSE NULL END
                   WHERE staff_id = ?""",
                (staff_id,)
            )
            conn.commit()
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Reset failed attempts and update last login
        cursor.execute(
            """UPDATE staff 
               SET failed_login_attempts = 0, 
                   locked_until = NULL,
                   last_login = CURRENT_TIMESTAMP 
               WHERE staff_id = ?""",
            (staff_id,)
        )
        conn.commit()
        
        # Create access token
        access_token = create_access_token(
            identity=staff_id,
            additional_claims={
                'role': staff['role'],
                'department': staff['dept_name'],
                'sub_department': staff['sub_department'],
                'name': f"{staff['first_name']} {staff['last_name']}"
            }
        )
        
        return jsonify({
            'access_token': access_token,
            'staff_id': staff_id,
            'name': f"{staff['first_name']} {staff['last_name']}",
            'role': staff['role'],
            'department': staff['dept_name'],
            'sub_department': staff['sub_department']
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token"""
    identity = get_jwt_identity()
    claims = get_jwt()
    new_token = create_access_token(
        identity=identity,
        additional_claims={
            'role': claims.get('role'),
            'department': claims.get('department'),
            'name': claims.get('name')
        }
    )
    return jsonify({'access_token': new_token}), 200

# ============================================
# PATIENT REGISTRATION ENDPOINTS
# ============================================

@app.route('/api/auth/patient/register', methods=['POST'])
def register_patient():
    """Register a new patient"""
    data = request.get_json()
    
    # Map camelCase to snake_case for frontend compatibility
    mapping = {
        'firstName': 'first_name',
        'lastName': 'last_name',
        'dateOfBirth': 'date_of_birth',
        'mobileNumber': 'mobile_number',
        'emergencyContactName': 'emergency_contact_name',
        'emergencyContactNumber': 'emergency_contact_number',
        'emergencyContactRelation': 'emergency_contact_relation',
        'currentAddressStreet': 'current_address_street',
        'currentAddressCity': 'current_city',
        'currentAddressState': 'current_state',
        'currentAddressPincode': 'current_pincode',
        'permanentAddressSameAsCurrent': 'permanent_address_same_as_current',
        'bloodGroup': 'blood_group',
        'password': 'password'
    }
    for camel, snake in mapping.items():
        if camel in data:
            data[snake] = data[camel]

    # Validate required fields
    required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'mobile_number']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate phone
    if not validate_phone(data.get('mobile_number', '')):
        return jsonify({'error': 'Invalid mobile number. Must be 10 digits.'}), 400
    
    # Validate email if provided
    if data.get('email') and not validate_email(data.get('email')):
        return jsonify({'error': 'Invalid email format'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check if phone already exists
        cursor.execute(
            "SELECT patient_id FROM patients WHERE mobile_number = ?",
            (data.get('mobile_number'),)
        )
        if cursor.fetchone():
            return jsonify({'error': 'Mobile number already registered'}), 409
        
        # Generate password hash
        password = data.get('password', 'Patient@123')  # Default password
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Generate patient_id
        cursor.execute("SELECT patient_id FROM patients ORDER BY id DESC LIMIT 1")
        last_patient = cursor.fetchone()
        
        if last_patient and last_patient['patient_id'].startswith('P'):
            try:
                last_id_num = int(last_patient['patient_id'][1:])
                patient_id = f"P{last_id_num + 1:04d}"
            except ValueError:
                patient_id = "P0001"
        else:
            patient_id = "P0001"

        # Insert patient
        cursor.execute("""
            INSERT INTO patients (
                patient_id, first_name, middle_name, last_name, date_of_birth, gender, blood_group, marital_status,
                mobile_number, email, emergency_contact_name, emergency_contact_number, emergency_contact_relation,
                current_address_street, current_address_area, current_city, current_state, current_pincode,
                permanent_address_same_as_current, permanent_address_street, permanent_address_area, 
                permanent_city, permanent_state, permanent_pincode,
                id_proof_type, id_proof_number,
                known_allergies, chronic_conditions, current_medications, previous_surgeries,
                insurance_provider, insurance_policy_number, insurance_coverage_amount,
                password_hash, registered_by, registration_fee_paid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            patient_id, data.get('first_name'), data.get('middle_name'), data.get('last_name'),
            data.get('date_of_birth'), data.get('gender'), data.get('blood_group'), data.get('marital_status'),
            data.get('mobile_number'), data.get('email'), data.get('emergency_contact_name'),
            data.get('emergency_contact_number'), data.get('emergency_contact_relation'),
            data.get('current_address_street'), data.get('current_address_area'),
            data.get('current_city'), data.get('current_state'), data.get('current_pincode'),
            data.get('permanent_address_same_as_current', False),
            data.get('permanent_address_street'), data.get('permanent_address_area'),
            data.get('permanent_city'), data.get('permanent_state'), data.get('permanent_pincode'),
            data.get('id_proof_type'), data.get('id_proof_number'),
            data.get('known_allergies'), data.get('chronic_conditions'),
            data.get('current_medications'), data.get('previous_surgeries'),
            data.get('insurance_provider'), data.get('insurance_policy_number'), data.get('insurance_coverage_amount'),
            password_hash, data.get('registered_by', 'ONLINE'), data.get('registration_fee_paid', False)
        ))
        
        pk_id = cursor.lastrowid
        conn.commit()

        # Emit real-time event for new appointment (receptionists should listen)
        # try:
        #     socketio.emit('new_appointment', {
        #         'appointment_id': appointment_id,
        #         'patient_id': patient_id,
        #         'doctor_id': data.get('doctor_id'),
        #         'appointment_date': data.get('appointment_date'),
        #         'appointment_time': data.get('appointment_time'),
        #         'status': status,
        #         'booking_source': booking_source,
        #         'token_number': token_number
        #     }, namespace='/appointments')
        # except Exception:
        #     # Non-fatal: continue even if emit fails
        #     pass
        
        return jsonify({
            'message': 'Patient registered successfully',
            'patient_id': patient_id,
            'id': pk_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/patients/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    """Get patient details"""
    claims = get_jwt()
    current_user = get_jwt_identity()
    user_role = claims.get('role', '')
    
    # Patients can only view their own data
    if user_role == 'Patient' and current_user != patient_id:
        return jsonify({'error': 'Access denied'}), 403
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT patient_id, first_name, middle_name, last_name, date_of_birth, 
                   (strftime('%Y', 'now') - strftime('%Y', date_of_birth)) as age, 
                   gender, blood_group, marital_status,
                   mobile_number, email, emergency_contact_name, emergency_contact_number, emergency_contact_relation,
                   current_address_street, current_address_area, current_city, current_state, current_pincode,
                   known_allergies, chronic_conditions, current_medications, previous_surgeries,
                   insurance_provider, insurance_policy_number, insurance_coverage_amount,
                   registration_date, last_login
            FROM patients WHERE patient_id = ? AND is_active = 1
        """, (patient_id,))
        
        patient = cursor.fetchone()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        return jsonify(patient), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/patients/<patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    """Update patient details"""
    claims = get_jwt()
    current_user = get_jwt_identity()
    user_role = claims.get('role', '')
    
    if user_role == 'Patient' and current_user != patient_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Build update query dynamically
        allowed_fields = [
            'mobile_number', 'email', 'emergency_contact_name', 'emergency_contact_number',
            'emergency_contact_relation', 'current_address_street', 'current_address_area',
            'current_city', 'current_state', 'current_pincode', 'known_allergies',
            'chronic_conditions', 'current_medications', 'previous_surgeries',
            'insurance_provider', 'insurance_policy_number', 'insurance_coverage_amount'
        ]
        
        updates = []
        values = []
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = ?")
                values.append(data[field])
        
        if not updates:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(patient_id)
        query = f"UPDATE patients SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE patient_id = ?"
        
        cursor.execute(query, values)
        conn.commit()
        
        return jsonify({'message': 'Patient updated successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# DOCTOR ENDPOINTS
# ============================================

@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    """Get all doctors with optional filters"""
    department = request.args.get('department', '')
    specialization = request.args.get('specialization', '')
    search = request.args.get('search', '')
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT d.*, s.first_name, s.last_name, s.email, s.phone, 
                   dept.dept_name, s.sub_department as department_specialization
            FROM doctors d
            JOIN staff s ON d.staff_id = s.staff_id
            LEFT JOIN departments dept ON s.department_id = dept.id
            WHERE s.is_active = 1
        """
        params = []
        
        if department:
            query += " AND dept.dept_code = ?"
            params.append(department)
        
        if specialization:
            query += " AND d.specialization LIKE ?"
            params.append(f'%{specialization}%')
        
        if search:
            query += " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR d.specialization LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY d.rating DESC"
        
        cursor.execute(query, params)
        doctors = cursor.fetchall()
        
        return jsonify(doctors), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctors/<staff_id>', methods=['GET'])
def get_doctor_detail(staff_id):
    """Get detailed doctor information"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT d.*, s.first_name, s.last_name, s.email, s.phone, 
                   dept.dept_name, dept.id as department_id
            FROM doctors d
            JOIN staff s ON d.staff_id = s.staff_id
            LEFT JOIN departments dept ON s.department_id = dept.id
            WHERE d.staff_id = ? AND s.is_active = 1
        """, (staff_id,))
        
        doctor = cursor.fetchone()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        return jsonify(doctor), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctors/<staff_id>/availability', methods=['GET'])
def get_doctor_availability(staff_id):
    """Get doctor's available time slots for a date"""
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get doctor's schedule
        cursor.execute(
            "SELECT availability_schedule FROM doctors WHERE staff_id = ?",
            (staff_id,)
        )
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': 'Doctor not found'}), 404
        
        schedule = result['availability_schedule'] or {}
        
        # Parse date and get day of week
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        day_name = date_obj.strftime('%A').lower()
        
        # Get available slots for that day
        day_schedule = schedule.get(day_name, [])
        
        # Get already booked slots
        cursor.execute("""
            SELECT appointment_time as time
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ?
            AND status IN ('Confirmed', 'Pending_Approval', 'In_Progress')
        """, (staff_id, date_str))
        
        booked_slots = [row['time'] for row in cursor.fetchall()]
        
        # Generate available time slots
        available_slots = []
        for time_range in day_schedule:
            start, end = time_range.split('-')
            start_hour = int(start.split(':')[0])
            end_hour = int(end.split(':')[0])
            
            for hour in range(start_hour, end_hour):
                for minute in [0, 30]:
                    slot_time = f"{hour:02d}:{minute:02d}:00"
                    if slot_time not in booked_slots:
                        period = 'Morning' if hour < 12 else ('Afternoon' if hour < 17 else 'Evening')
                        available_slots.append({
                            'time': slot_time,
                            'period': period,
                            'available': True
                        })
        
        return jsonify({
            'date': date_str,
            'day': day_name.capitalize(),
            'available_slots': available_slots,
            'booked_slots': booked_slots
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# APPOINTMENT ENDPOINTS
# ============================================

@app.route('/api/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    """Create a new appointment"""
    claims = get_jwt()
    data = request.get_json()
    
    # Validate required fields
    required = ['doctor_id', 'appointment_date', 'appointment_time', 'appointment_type']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    patient_id = data.get('patient_id')
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get doctor's department
        cursor.execute(
            "SELECT department_id FROM staff WHERE staff_id = ?",
            (data.get('doctor_id'),)
        )
        dept_result = cursor.fetchone()
        department_id = dept_result['department_id'] if dept_result else None
        
        # Get consultation fee
        cursor.execute(
            "SELECT consultation_fee FROM doctors WHERE staff_id = ?",
            (data.get('doctor_id'),)
        )
        fee_result = cursor.fetchone()
        consultation_fee = fee_result['consultation_fee'] if fee_result else 0
        
        # Determine booking source and status
        booking_source = 'Online' if claims.get('role') == 'Patient' else 'Walk-in'
        status = 'Pending_Approval' if booking_source == 'Online' else 'Confirmed'
        
        # Generate token number
        cursor.execute("""
            SELECT token_number
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ?
            ORDER BY id DESC LIMIT 1
        """, (data.get('doctor_id'), data.get('appointment_date')))
        last_token_row = cursor.fetchone()
        
        next_token_num = 1
        if last_token_row and last_token_row['token_number']:
            try:
                next_token_num = int(last_token_row['token_number'].split('-')[-1]) + 1
            except:
                pass
        
        token_number = f"TKN-{next_token_num:03d}"
        
        # Generate appointment_id
        appointment_id = f"APT{uuid.uuid4().hex[:8].upper()}"

        cursor.execute("""
            INSERT INTO appointments (
                appointment_id, patient_id, doctor_id, department_id, appointment_type, appointment_date, appointment_time,
                time_slot, token_number, status, reason_for_visit, consultation_mode, special_requirements,
                booked_by, consultation_fee, booking_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            appointment_id, patient_id, data.get('doctor_id'), department_id, data.get('appointment_type'),
            data.get('appointment_date'), data.get('appointment_time'), data.get('time_slot'),
            token_number, status, data.get('reason_for_visit'), data.get('consultation_mode', 'In-person'),
            data.get('special_requirements'), get_jwt_identity(), consultation_fee, booking_source
        ))
        
        pk_id = cursor.lastrowid
        conn.commit()
        
        # Emit real-time event: new appointment (receptionists should listen)
        try:
            safe_emit('new_appointment', {
                'appointment_id': appointment_id,
                'patient_id': patient_id,
                'doctor_id': data.get('doctor_id'),
                'appointment_date': data.get('appointment_date'),
                'appointment_time': data.get('appointment_time'),
                'status': status,
                'booking_source': booking_source,
                'token_number': token_number
            }, namespace='/appointments')
        except Exception:
            pass

        return jsonify({
            'message': 'Appointment created successfully',
            'appointment_id': appointment_id,
            'token_number': token_number,
            'status': status
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/appointments', methods=['GET'])
@jwt_required()
@limiter.limit("100 per minute")
def get_appointments():
    """Get appointments with filters"""
    claims = get_jwt()
    patient_id = request.args.get('patient_id', '')
    doctor_id = request.args.get('doctor_id', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    status = request.args.get('status', '')
    limit = request.args.get('limit', '')
    
    # Role-based filtering
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    elif claims.get('role') == 'Doctor':
        doctor_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT a.*, 
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.mobile_number as patient_phone,
                   p.date_of_birth as patient_dob,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE 1=1
        """
        params = []
        
        if patient_id:
            query += " AND a.patient_id = ?"
            params.append(patient_id)
        
        if doctor_id:
            query += " AND a.doctor_id = ?"
            params.append(doctor_id)
        
        if date_from:
            query += " AND a.appointment_date >= ?"
            params.append(date_from)
        
        if date_to:
            query += " AND a.appointment_date <= ?"
            params.append(date_to)
        
        if status:
            query += " AND a.status = ?"
            params.append(status)
        
        query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC"
        
        if limit:
            try:
                limit_int = int(limit)
                query += f" LIMIT {limit_int}"
            except ValueError:
                pass
        
        cursor.execute(query, params)
        appointments = cursor.fetchall()
        
        return jsonify(appointments), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
@app.route('/api/appointments/<appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    """Get a single appointment by appointment_id (returns appointment row and metadata).
    This endpoint does not require the patient record to exist (useful for fallback lookups).
    """
    claims = get_jwt()
    # Simple role check: allow doctors and staff to view appointments
    user_role = claims.get('role', '')

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("SELECT * FROM appointments WHERE appointment_id = ?", (appointment_id,))
        appt = cursor.fetchone()
        if not appt:
            return jsonify({'error': 'Appointment not found'}), 404
        return jsonify(appt), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/appointments/<appointment_id>/approve', methods=['POST'])
@jwt_required()
@role_required(['Receptionist', 'Admin'])
def approve_appointment(appointment_id):
    """Approve a pending appointment"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Get appointment details
        cursor.execute("SELECT patient_id, doctor_id, appointment_date FROM appointments WHERE appointment_id = ?", (appointment_id,))
        appt = cursor.fetchone()
        
        if not appt:
            return jsonify({'error': 'Appointment not found'}), 404
            
        patient_id, doctor_id, appt_date = appt
        
        # 2. Update appointment status
        cursor.execute("""
            UPDATE appointments 
            SET status = 'Confirmed', 
                approved_by = ?, 
                approved_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ? AND status = 'Pending_Approval'
        """, (get_jwt_identity(), appointment_id))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Appointment not found or already processed'}), 404
            
        # 3. Add to Queue if appointment is for today (or future? usually queue is for today)
        # For now, let's add to queue regardless, but typically queue is day-specific.
        # Let's generate a token number for that day.
        
        # Get current queue count for the doctor on that date to generate token
        cursor.execute("""
            SELECT COUNT(*) FROM queue_management 
            WHERE doctor_id = ? AND queue_date = ?
        """, (doctor_id, appt_date))
        
        count = cursor.fetchone()[0]
        token_number = f"TKN-{count + 1:03d}"
        
        cursor.execute("""
            INSERT INTO queue_management (
                appointment_id, patient_id, doctor_id, token_number, 
                queue_date, status, arrival_time
            ) VALUES (?, ?, ?, ?, ?, 'Waiting', CURRENT_TIMESTAMP)
        """, (appointment_id, patient_id, doctor_id, token_number, appt_date))
        
        # 4. Update token in appointments table too
        cursor.execute("UPDATE appointments SET token_number = ? WHERE appointment_id = ?", (token_number, appointment_id))
        
        # 5. Fetch the complete queue item with patient and doctor details
        dict_cursor = get_dict_cursor(conn)
        dict_cursor.execute("""
            SELECT q.*, 
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth as patient_dob, p.gender as patient_gender,
                   a.appointment_type, a.reason_for_visit, a.appointment_time,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM queue_management q
            JOIN patients p ON q.patient_id = p.patient_id
            JOIN appointments a ON q.appointment_id = a.appointment_id
            JOIN staff s ON q.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE q.appointment_id = ?
        """, (appointment_id,))
        
        queue_item = dict_cursor.fetchone()
        
        conn.commit()
        
        # Emit real-time event: appointment approved and added to queue with complete data
        try:
            queue_data = dict(queue_item) if queue_item else {
                'appointment_id': appointment_id,
                'token_number': token_number,
                'doctor_id': doctor_id,
                'appointment_date': appt_date,
                'status': 'Waiting'
            }
            
            socketio.emit('appointment_approved', {
                'queue_item': queue_data,
                'timestamp': datetime.now().isoformat()
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting appointment_approved: {e}")

        return jsonify({'message': 'Appointment approved and added to queue', 'token': token_number}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/appointments/<appointment_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_appointment(appointment_id):
    """Cancel an appointment"""
    claims = get_jwt()
    data = request.get_json()
    reason = data.get('reason', '')
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check if user has permission
        cursor.execute("SELECT patient_id, doctor_id FROM appointments WHERE appointment_id = ?", (appointment_id,))
        appt = cursor.fetchone()
        
        if not appt:
            return jsonify({'error': 'Appointment not found'}), 404
        
        if claims.get('role') == 'Patient' and appt['patient_id'] != get_jwt_identity():
            return jsonify({'error': 'Access denied'}), 403
        
        cursor.execute("""
            UPDATE appointments 
            SET status = 'Cancelled', rejection_reason = ?
            WHERE appointment_id = ?
        """, (reason, appointment_id))
        
        conn.commit()
        return jsonify({'message': 'Appointment cancelled successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# QUEUE MANAGEMENT ENDPOINTS
# ============================================

@app.route('/api/queue/today', methods=['GET'])
@jwt_required()
@role_required(['Receptionist', 'Doctor', 'Nurse', 'Admin'])
def get_today_queue():
    """Get today's queue"""
    doctor_id = request.args.get('doctor_id', '')
    department_id = request.args.get('department_id', '')
    status = request.args.get('status', '')
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT q.*, 
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth as patient_dob, p.gender as patient_gender,
                   a.appointment_type, a.reason_for_visit,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM queue_management q
            JOIN patients p ON q.patient_id = p.patient_id
            JOIN appointments a ON q.appointment_id = a.appointment_id
            JOIN staff s ON q.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE q.queue_date = ?
        """
        params = [datetime.now().strftime('%Y-%m-%d')]
        
        if doctor_id:
            query += " AND q.doctor_id = ?"
            params.append(doctor_id)
        
        if department_id:
            query += " AND a.department_id = ?"
            params.append(department_id)
        
        if status:
            query += " AND q.status = ?"
            params.append(status)
        
        query += " ORDER BY q.token_number"
        
        cursor.execute(query, params)
        queue = cursor.fetchall()
        
        return jsonify(queue), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/queue/<queue_id>/update-status', methods=['POST'])
@jwt_required()
@role_required(['Receptionist', 'Doctor', 'Nurse'])
def update_queue_status(queue_id):
    """Update queue item status"""
    data = request.get_json()
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'error': 'Status is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    dict_cursor = get_dict_cursor(conn)
    
    try:
        # Get appointment_id and doctor_id associated with this queue item
        cursor.execute("""
            SELECT appointment_id, doctor_id, patient_id FROM queue_management WHERE id = ?
        """, (queue_id,))
        queue_item = cursor.fetchone()
        
        if not queue_item:
             return jsonify({'error': 'Queue item not found'}), 404
             
        appointment_id, doctor_id, patient_id = queue_item
        
        if new_status == 'In_Progress':
            cursor.execute("""
                UPDATE queue_management 
                SET status = ?, called_in_time = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_status, queue_id))
            
            cursor.execute("UPDATE appointments SET status = 'In_Progress', consultation_start_time = CURRENT_TIMESTAMP WHERE appointment_id = ?", (appointment_id,))
            
        elif new_status == 'Completed':
            cursor.execute("""
                UPDATE queue_management 
                SET status = ?, consultation_end_time = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_status, queue_id))
            
            cursor.execute("UPDATE appointments SET status = 'Completed', consultation_end_time = CURRENT_TIMESTAMP WHERE appointment_id = ?", (appointment_id,))

        elif new_status == 'Visited':
            cursor.execute("""
                UPDATE queue_management 
                SET status = ?
                WHERE id = ?
            """, (new_status, queue_id))
            
            cursor.execute("UPDATE appointments SET status = 'Visited' WHERE appointment_id = ?", (appointment_id,))
            
        else:
            cursor.execute("""
                UPDATE queue_management 
                SET status = ?
                WHERE id = ?
            """, (new_status, queue_id))
            
            # Map other statuses if necessary, e.g. Waiting -> Confirmed? 
            # If No_Show, update appointments too
            if new_status == 'No_Show':
                cursor.execute("UPDATE appointments SET status = 'No_Show' WHERE appointment_id = ?", (appointment_id,))

        
        conn.commit()

        # Get updated queue item with full details for emission
        dict_cursor.execute("""
            SELECT q.*, p.patient_id, p.first_name || ' ' || p.last_name as patient_name,
                   a.appointment_id, s.staff_id as doctor_id
            FROM queue_management q
            JOIN patients p ON q.patient_id = p.patient_id
            JOIN appointments a ON q.appointment_id = a.appointment_id
            JOIN staff s ON q.doctor_id = s.staff_id
            WHERE q.id = ?
        """, (queue_id,))
        
        updated_item = dict_cursor.fetchone()

        # Emit queue update for real-time clients (receptionist/doctor)
        try:
            payload = {
                'queue_id': queue_id,
                'appointment_id': appointment_id,
                'doctor_id': doctor_id,
                'patient_id': patient_id,
                'new_status': new_status,
                'queue_item': dict(updated_item) if updated_item else None,
                'timestamp': datetime.now().isoformat()
            }
            # Emit to all clients on the appointments namespace (receptionists and others)
            socketio.emit('queue_status_updated', payload, namespace='/appointments')
            # Also emit directly to the doctor's room if we know the doctor_id (reduces noise)
            try:
                if doctor_id:
                    room_name = f"doctor_{doctor_id}"
                    socketio.emit('queue_status_updated', payload, namespace='/appointments', room=room_name)
            except Exception:
                # Non-fatal: continue if room emit fails
                pass
        except Exception as e:
            print(f"Error emitting queue_status_updated: {e}")

        return jsonify({'message': 'Queue status updated'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# PRESCRIPTION ENDPOINTS
# ============================================

@app.route('/api/prescriptions', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def create_prescription():
    """Create a new prescription"""
    data = request.get_json()
    
    required = ['patient_id', 'diagnosis', 'medicines']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Create prescription
        prescription_id = f"RX{uuid.uuid4().hex[:8].upper()}"
        
        cursor.execute("""
            INSERT INTO prescriptions (
                prescription_id, patient_id, doctor_id, appointment_id, admission_id,
                diagnosis, chief_complaint, examination_findings, vital_signs,
                general_instructions, diet_advice, activity_restrictions, warning_signs,
                follow_up_date, follow_up_instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            prescription_id, data.get('patient_id'), get_jwt_identity(), data.get('appointment_id'),
            data.get('admission_id'), data.get('diagnosis'), data.get('chief_complaint'),
            data.get('examination_findings'), json.dumps(data.get('vital_signs', {})),
            data.get('general_instructions'), data.get('diet_advice'),
            data.get('activity_restrictions'), data.get('warning_signs'),
            data.get('follow_up_date'), data.get('follow_up_instructions')
        ))
        
        cursor.lastrowid # Just to consume if needed
        
        # Add medicines
        for med in data.get('medicines', []):
            cursor.execute("""
                INSERT INTO prescription_medicines (
                    prescription_id, medicine_name, generic_name, brand_name,
                    strength, dosage_form, quantity, frequency, timing, duration, instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                prescription_id, med.get('medicine_name'), med.get('generic_name'),
                med.get('brand_name'), med.get('strength'), med.get('dosage_form'),
                med.get('quantity'), med.get('frequency'), med.get('timing'),
                med.get('duration'), med.get('instructions')
            ))
        
        conn.commit()
        
        # Emit real-time event for new prescription
        try:
            payload = {
                'prescription_id': prescription_id,
                'patient_id': data.get('patient_id'),
                'doctor_id': get_jwt_identity(),
                'prescription_date': datetime.now().isoformat()
            }
            socketio.emit('prescription_created', payload, namespace='/appointments')
            # also emit to doctor's room
            try:
                room_name = f"doctor_{get_jwt_identity()}"
                socketio.emit('prescription_created', payload, namespace='/appointments', room=room_name)
            except Exception:
                pass
        except Exception as e:
            print(f"Error emitting prescription_created: {e}")

        return jsonify({
            'message': 'Prescription created successfully',
            'prescription_id': prescription_id
        }), 201
        
    except Exception as e:
        traceback.print_exc()
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/prescriptions', methods=['GET'])
@jwt_required()
def get_prescriptions():
    """Get prescriptions"""
    claims = get_jwt()
    patient_id = request.args.get('patient_id', '')
    doctor_id = request.args.get('doctor_id', '')
    
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    elif claims.get('role') == 'Doctor' and not patient_id:
        doctor_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT p.*,
                   pat.first_name || ' ' || pat.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM prescriptions p
            JOIN patients pat ON p.patient_id = pat.patient_id
            JOIN staff s ON p.doctor_id = s.staff_id
            WHERE 1=1
        """
        params = []
        
        if patient_id:
            query += " AND p.patient_id = ?"
            params.append(patient_id)
        
        if doctor_id:
            query += " AND p.doctor_id = ?"
            params.append(doctor_id)
        
        query += " ORDER BY p.prescription_date DESC"

        # Optional limit
        limit = request.args.get('limit', '')
        if limit:
            try:
                limit_int = int(limit)
                query += f" LIMIT {limit_int}"
            except ValueError:
                pass

        cursor.execute(query, params)
        prescriptions = cursor.fetchall()
        
        # Get medicines for each prescription
        for pres in prescriptions:
            cursor.execute("""
                SELECT * FROM prescription_medicines WHERE prescription_id = ?
            """, (pres['prescription_id'],))
            pres['medicines'] = cursor.fetchall()
        
        return jsonify(prescriptions), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# LAB ENDPOINTS
# ============================================

@app.route('/api/lab/orders', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def create_lab_order():
    """Create a lab test order"""
    data = request.get_json()
    
    required = ['patient_id', 'test_category', 'test_name']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            INSERT INTO lab_orders (
                patient_id, ordered_by, appointment_id, admission_id,
                test_category, test_name, test_code, priority,
                sample_type, fasting_required, clinical_notes, special_instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('patient_id'), get_jwt_identity(), data.get('appointment_id'),
            data.get('admission_id'), data.get('test_category'), data.get('test_name'),
            data.get('test_code'), data.get('priority', 'Routine'),
            data.get('sample_type'), data.get('fasting_required', False),
            data.get('clinical_notes'), data.get('special_instructions')
        ))
        
        lab_order_id = cursor.lastrowid
        conn.commit()
        # Emit lab order created event
        try:
            payload = {
                'lab_order_id': lab_order_id,
                'patient_id': data.get('patient_id'),
                'doctor_id': get_jwt_identity(),
                'test_name': data.get('test_name'),
                'timestamp': datetime.now().isoformat()
            }
            socketio.emit('lab_order_created', payload, namespace='/appointments')
            try:
                room_name = f"doctor_{get_jwt_identity()}"
                socketio.emit('lab_order_created', payload, namespace='/appointments', room=room_name)
            except Exception:
                pass
        except Exception as e:
            print(f"Error emitting lab_order_created: {e}")

        return jsonify({
            'message': 'Lab order created successfully',
            'lab_order_id': lab_order_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lab/orders', methods=['GET'])
@jwt_required()
def get_lab_orders():
    """Get lab orders"""
    claims = get_jwt()
    patient_id = request.args.get('patient_id', '')
    doctor_id = request.args.get('doctor_id', '')
    status = request.args.get('status', '')
    
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    elif claims.get('role') == 'Doctor' and not patient_id:
        # If doctor, show their own specific orders by default
        # Unless they are viewing a specific patient
        doctor_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT lo.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE 1=1
        """
        params = []
        
        if patient_id:
            query += " AND lo.patient_id = ?"
            params.append(patient_id)
        
        if status:
            query += " AND lo.status = ?"
            params.append(status)
        
        if doctor_id:
            query += " AND lo.ordered_by = ?"
            params.append(doctor_id)
        
        query += " ORDER BY lo.order_date DESC"

        # Optional limit
        limit = request.args.get('limit', '')
        if limit:
            try:
                limit_int = int(limit)
                query += f" LIMIT {limit_int}"
            except ValueError:
                pass

        cursor.execute(query, params)
        orders = cursor.fetchall()

        # Attach lab results for each order
        for o in orders:
            try:
                cursor.execute("SELECT * FROM lab_results WHERE lab_order_id = ?", (o['lab_order_id'],))
                o['results'] = cursor.fetchall()
            except Exception:
                o['results'] = []

        return jsonify(orders), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lab/results/<lab_order_id>', methods=['POST'])
@jwt_required()
@role_required(['Lab_Technician'])
def add_lab_results(lab_order_id):
    """Add lab test results"""
    data = request.get_json()
    results = data.get('results', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        for result in results:
            cursor.execute("""
                INSERT INTO lab_results (
                    lab_order_id, patient_id, parameter_name, result_value,
                    unit, reference_range, status, is_critical, entered_by, technician_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                lab_order_id, data.get('patient_id'), result.get('parameter_name'),
                result.get('result_value'), result.get('unit'), result.get('reference_range'),
                result.get('status'), result.get('is_critical', False),
                get_jwt_identity(), result.get('notes')
            ))
        
        # Update order status (match by lab_order_id)
        cursor.execute("""
            UPDATE lab_orders 
            SET status = 'Results_Entered', actual_completion_date = CURRENT_TIMESTAMP
            WHERE lab_order_id = ?
        """, (lab_order_id,))
        
        conn.commit()

        # Emit lab result event
        try:
            payload = {
                'lab_order_id': lab_order_id,
                'patient_id': data.get('patient_id'),
                'timestamp': datetime.now().isoformat()
            }
            socketio.emit('lab_result_posted', payload, namespace='/appointments')
            try:
                # also emit to lab room or doctor room if needed
                room_name = f"doctor_{get_jwt_identity()}"
                socketio.emit('lab_result_posted', payload, namespace='/appointments', room=room_name)
            except Exception:
                pass
        except Exception as e:
            print(f"Error emitting lab_result_posted: {e}")

        return jsonify({'message': 'Lab results added successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# BED & ADMISSION ENDPOINTS
# ============================================

@app.route('/api/beds', methods=['GET'])
@jwt_required()
def get_beds():
    """Get all beds with optional filters"""
    bed_type = request.args.get('type', '')
    status = request.args.get('status', '')
    floor = request.args.get('floor', '')
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT b.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.patient_id
            FROM beds b
            LEFT JOIN patients p ON b.current_patient_id = p.patient_id
            WHERE 1=1
        """
        params = []
        
        if bed_type:
            query += " AND b.bed_type = ?"
            params.append(bed_type)
        
        if status:
            query += " AND b.status = ?"
            params.append(status)
        
        if floor:
            query += " AND b.floor_number = ?"
            params.append(floor)
        
        query += " ORDER BY b.floor_number, b.bed_id"
        
        cursor.execute(query, params)
        beds = cursor.fetchall()
        
        return jsonify(beds), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/beds/availability', methods=['GET'])
def get_bed_availability():
    """Get bed availability summary"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM bed_occupancy_summary")
        summary = cursor.fetchall()
        
        return jsonify(summary), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admissions', methods=['POST'])
@jwt_required()
@role_required(['Doctor', 'Admission'])
def create_admission():
    """Create a new admission"""
    data = request.get_json()
    
    required = ['patient_id', 'admitting_doctor_id', 'bed_id', 'admission_reason']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check bed availability
        cursor.execute(
            "SELECT status FROM beds WHERE bed_id = ?",
            (data.get('bed_id'),)
        )
        bed = cursor.fetchone()
        
        if not bed or bed['status'] != 'Vacant':
            return jsonify({'error': 'Bed is not available'}), 400
        
        # Get doctor's department
        cursor.execute(
            "SELECT department_id FROM staff WHERE staff_id = ?",
            (data.get('admitting_doctor_id'),)
        )
        dept = cursor.fetchone()
        department_id = dept['department_id'] if dept else None
        
        # Create admission
        admission_id = f"ADM{uuid.uuid4().hex[:8].upper()}"

        cursor.execute("""
            INSERT INTO admissions (
                admission_id, patient_id, admitting_doctor_id, department_id, bed_id,
                admission_date, expected_discharge_date, provisional_diagnosis,
                admission_reason, admission_type, guardian_name, guardian_relation,
                guardian_contact, payment_type, insurance_provider, policy_number,
                advance_payment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            admission_id, data.get('patient_id'), data.get('admitting_doctor_id'), department_id,
            data.get('bed_id'), data.get('admission_date', datetime.now()),
            data.get('expected_discharge_date'), data.get('provisional_diagnosis'),
            data.get('admission_reason'), data.get('admission_type', 'Elective'),
            data.get('guardian_name'), data.get('guardian_relation'),
            data.get('guardian_contact'), data.get('payment_type', 'Cash'),
            data.get('insurance_provider'), data.get('policy_number'),
            data.get('advance_payment', 0)
        ))
        
        # Update bed status
        cursor.execute("""
            UPDATE beds 
            SET status = 'Occupied', 
                current_patient_id = ?,
                admission_date = ?,
                expected_discharge_date = ?
            WHERE bed_id = ?
        """, (data.get('patient_id'), data.get('admission_date', datetime.now()),
              data.get('expected_discharge_date'), data.get('bed_id')))
        
        conn.commit()
        
        return jsonify({
            'message': 'Admission created successfully',
            'admission_id': admission_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admissions', methods=['GET'])
@jwt_required()
def get_admissions():
    """Get admissions"""
    claims = get_jwt()
    patient_id = request.args.get('patient_id', '')
    status = request.args.get('status', '')
    
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT a.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name,
                   b.bed_type, b.ward_name, b.room_number
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.admitting_doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE 1=1
        """
        params = []
        
        if patient_id:
            query += " AND a.patient_id = ?"
            params.append(patient_id)
        
        if status:
            query += " AND a.status = ?"
            params.append(status)
        
        query += " ORDER BY a.admission_date DESC"
        
        cursor.execute(query, params)
        admissions = cursor.fetchall()
        
        return jsonify(admissions), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# PHARMACY ENDPOINTS
# ============================================

@app.route('/api/pharmacy/inventory', methods=['GET'])
@jwt_required()
@role_required(['Pharmacist', 'Admin'])
def get_medicine_inventory():
    """Get medicine inventory"""
    category = request.args.get('category', '')
    status = request.args.get('status', '')
    low_stock = request.args.get('low_stock', 'false').lower() == 'true'
    expiring = request.args.get('expiring', 'false').lower() == 'true'
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = "SELECT * FROM medicine_inventory WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if low_stock:
            query += " AND current_stock <= reorder_level"
        
        if expiring:
            query += " AND expiry_date <= date('now', '+90 days')"
        
        query += " ORDER BY generic_name"
        
        cursor.execute(query, params)
        inventory = cursor.fetchall()
        
        return jsonify(inventory), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pharmacy/inventory', methods=['POST'])
@jwt_required()
@role_required(['Pharmacist', 'Admin'])
def add_medicine():
    """Add new medicine to inventory"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO medicine_inventory (
                medicine_id, generic_name, brand_name, manufacturer, category,
                dosage_form, strength, pack_size, unit_price, mrp, current_stock,
                reorder_level, batch_number, expiry_date, storage_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('medicine_id'), data.get('generic_name'), data.get('brand_name'),
            data.get('manufacturer'), data.get('category'), data.get('dosage_form'),
            data.get('strength'), data.get('pack_size'), data.get('unit_price'),
            data.get('mrp'), data.get('current_stock', 0), data.get('reorder_level', 10),
            data.get('batch_number'), data.get('expiry_date'), data.get('storage_location')
        ))
        
        conn.commit()
        return jsonify({'message': 'Medicine added successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pharmacy/dispense', methods=['POST'])
@jwt_required()
@role_required(['Pharmacist'])
def dispense_medicine():
    """Dispense medicine against prescription"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update prescription medicine status
        for item in data.get('items', []):
            cursor.execute("""
                UPDATE prescription_medicines
                SET quantity_dispensed = ?, dispensed_by = ?, dispensed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (item.get('quantity'), get_jwt_identity(), item.get('id')))
            
            # Update inventory
            cursor.execute("""
                UPDATE medicine_inventory
                SET current_stock = current_stock - ?
                WHERE medicine_id = ?
            """, (item.get('quantity'), item.get('medicine_id')))
        
        # Update prescription status
        cursor.execute("""
            UPDATE prescriptions
            SET status = 'Dispensed'
            WHERE prescription_id = ?
        """, (data.get('prescription_id'),))
        
        conn.commit()
        return jsonify({'message': 'Medicine dispensed successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# VITAL SIGNS ENDPOINTS
# ============================================

@app.route('/api/vitals', methods=['POST'])
@jwt_required()
@role_required(['Nurse', 'Doctor'])
def add_vital_signs():
    """Add vital signs for a patient"""
    data = request.get_json()
    
    required = ['patient_id']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO vital_signs (
                patient_id, recorded_by, admission_id, appointment_id,
                temperature, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, respiratory_rate, spo2, weight, height, bmi,
                blood_sugar, pain_score, consciousness_level, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('patient_id'), get_jwt_identity(), data.get('admission_id'),
            data.get('appointment_id'), data.get('temperature'),
            data.get('blood_pressure_systolic'), data.get('blood_pressure_diastolic'),
            data.get('pulse_rate'), data.get('respiratory_rate'), data.get('spo2'),
            data.get('weight'), data.get('height'), data.get('bmi'),
            data.get('blood_sugar'), data.get('pain_score'),
            data.get('consciousness_level'), data.get('notes')
        ))
        
        conn.commit()
        return jsonify({'message': 'Vital signs recorded successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/vitals', methods=['GET'])
@jwt_required()
def get_vital_signs():
    """Get vital signs for a patient"""
    claims = get_jwt()
    patient_id = request.args.get('patient_id', '')
    
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    
    if not patient_id:
        return jsonify({'error': 'Patient ID is required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT v.*,
                   s.first_name || ' ' || s.last_name as recorded_by_name
            FROM vital_signs v
            JOIN staff s ON v.recorded_by = s.staff_id
            WHERE v.patient_id = ?
            ORDER BY v.recorded_at DESC
            LIMIT 100
        """, (patient_id,))
        
        vitals = cursor.fetchall()
        return jsonify(vitals), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# DASHBOARD & STATISTICS ENDPOINTS
# ============================================

@app.route('/api/dashboard/patient', methods=['GET'])
@jwt_required()
def get_patient_dashboard():
    """Get patient dashboard data"""
    claims = get_jwt()
    patient_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get upcoming appointments
        cursor.execute("""
            SELECT * FROM appointments
            WHERE patient_id = ? AND appointment_date >= CURRENT_DATE
            AND status IN ('Confirmed', 'Pending_Approval')
            ORDER BY appointment_date, appointment_time
            LIMIT 5
        """, (patient_id,))
        upcoming_appointments = cursor.fetchall()
        
        # Get recent prescriptions
        cursor.execute("""
            SELECT p.*, s.first_name || ' ' || s.last_name as doctor_name
            FROM prescriptions p
            JOIN staff s ON p.doctor_id = s.staff_id
            WHERE p.patient_id = ?
            ORDER BY p.prescription_date DESC
            LIMIT 5
        """, (patient_id,))
        recent_prescriptions = cursor.fetchall()
        
        # Get pending lab results
        cursor.execute("""
            SELECT * FROM lab_orders
            WHERE patient_id = ? AND status NOT IN ('Delivered', 'Cancelled')
            ORDER BY order_date DESC
            LIMIT 5
        """, (patient_id,))
        pending_labs = cursor.fetchall()
        
        # Get active admission if any
        cursor.execute("""
            SELECT a.*, b.bed_type, b.ward_name
            FROM admissions a
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE a.patient_id = ? AND a.status = 'Admitted'
        """, (patient_id,))
        active_admission = cursor.fetchone()
        
        return jsonify({
            'upcoming_appointments': upcoming_appointments,
            'recent_prescriptions': recent_prescriptions,
            'pending_lab_orders': pending_labs,
            'active_admission': active_admission
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/dashboard/doctor', methods=['GET'])
@jwt_required()
@role_required(['Doctor'])
def get_doctor_dashboard():
    """Get doctor dashboard data"""
    doctor_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Today's appointments
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE doctor_id = ? AND appointment_date = CURRENT_DATE
        """, (doctor_id,))
        today_count = cursor.fetchone()['count']
        
        # Pending consultations
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE doctor_id = ? AND appointment_date = CURRENT_DATE
            AND status = 'Confirmed'
        """, (doctor_id,))
        pending_count = cursor.fetchone()['count']
        
        # Completed today
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE doctor_id = ? AND appointment_date = CURRENT_DATE
            AND status = 'Completed'
        """, (doctor_id,))
        completed_count = cursor.fetchone()['count']
        
        # Pending lab results
        cursor.execute("""
            SELECT COUNT(*) as count FROM lab_orders
            WHERE ordered_by = ? AND status IN ('Pending', 'In_Progress')
        """, (doctor_id,))
        pending_labs = cursor.fetchone()['count']
        
        # Today's appointment list
        cursor.execute("""
            SELECT a.*, p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.appointment_date = CURRENT_DATE
            ORDER BY a.appointment_time
        """, (doctor_id,))
        today_appointments = cursor.fetchall()
        
        return jsonify({
            'statistics': {
                'today_appointments': today_count,
                'pending_consultations': pending_count,
                'completed_today': completed_count,
                'pending_lab_results': pending_labs
            },
            'today_appointments': today_appointments
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/dashboard/receptionist', methods=['GET'])
@jwt_required()
@role_required(['Receptionist', 'Admin'])
def get_receptionist_dashboard():
    """Get receptionist dashboard data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Today's registrations
        cursor.execute("""
            SELECT COUNT(*) as count FROM patients
            WHERE DATE(registration_date) = CURRENT_DATE
        """)
        today_registrations = cursor.fetchone()['count']
        
        # Today's appointments
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE appointment_date = CURRENT_DATE
        """)
        today_appointments = cursor.fetchone()['count']
        
        # Pending approvals
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE status = 'Pending_Approval'
        """)
        pending_approvals = cursor.fetchone()['count']
        
        # Current queue
        cursor.execute("""
            SELECT COUNT(*) as count FROM queue_management
            WHERE queue_date = CURRENT_DATE AND status = 'Waiting'
        """)
        waiting_queue = cursor.fetchone()['count']
        
        # Recent appointments
        cursor.execute("""
            SELECT a.*, p.first_name || ' ' || p.last_name as patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.appointment_date = CURRENT_DATE
            ORDER BY a.appointment_time
            LIMIT 20
        """)
        recent_appointments = cursor.fetchall()
        
        return jsonify({
            'statistics': {
                'today_registrations': today_registrations,
                'today_appointments': today_appointments,
                'pending_approvals': pending_approvals,
                'waiting_queue': waiting_queue
            },
            'recent_appointments': recent_appointments
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# DEPARTMENT & MASTER DATA ENDPOINTS
# ============================================

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM departments WHERE is_active = 1 ORDER BY dept_name")
        departments = cursor.fetchall()
        return jsonify(departments), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/services', methods=['GET'])
def get_services():
    """Get hospital services"""
    services = [
        {
            'id': 1,
            'name': 'Cardiology',
            'description': 'Comprehensive heart care including diagnostics, interventions, and rehabilitation',
            'icon': 'heart',
            'departments': ['Non-invasive Cardiology', 'Interventional Cardiology', 'Cardiac Surgery'],
            'equipment': ['ECG', 'Echo', 'TMT', 'Cath Lab'],
            'timings': '24/7 Emergency, OPD: Mon-Sat 9AM-6PM'
        },
        {
            'id': 2,
            'name': 'Neurology',
            'description': 'Brain, spine and nervous system care with advanced diagnostic and treatment facilities',
            'icon': 'brain',
            'departments': ['Neurology', 'Neurosurgery', 'Stroke Unit'],
            'equipment': ['EEG', 'EMG', 'MRI', 'CT Scan'],
            'timings': '24/7 Emergency, OPD: Mon-Sat 9AM-6PM'
        },
        {
            'id': 3,
            'name': 'Orthopedics',
            'description': 'Bone, joint and muscle care including joint replacement and sports medicine',
            'icon': 'bone',
            'departments': ['Joint Replacement', 'Sports Medicine', 'Spine Surgery', 'Trauma'],
            'equipment': ['Arthroscopy', 'C-Arm', 'X-Ray', 'Physiotherapy'],
            'timings': '24/7 Emergency, OPD: Mon-Sat 9AM-6PM'
        },
        {
            'id': 4,
            'name': 'Pediatrics',
            'description': 'Complete child healthcare from newborn to adolescence',
            'icon': 'baby',
            'departments': ['General Pediatrics', 'Neonatology', 'Pediatric ICU'],
            'equipment': ['Incubators', 'Phototherapy', 'Ventilators'],
            'timings': '24/7 Emergency, OPD: Mon-Sat 9AM-8PM'
        },
        {
            'id': 5,
            'name': 'Gynecology & Obstetrics',
            'description': 'Women healthcare including maternity and reproductive health',
            'icon': 'female',
            'departments': ['Obstetrics', 'Gynecology', 'Fertility Clinic'],
            'equipment': ['Ultrasound', 'Fetal Monitor', 'Labor Room'],
            'timings': '24/7 Emergency, OPD: Mon-Sat 9AM-6PM'
        },
        {
            'id': 6,
            'name': 'Emergency & Trauma',
            'description': '24/7 emergency care with rapid response team',
            'icon': 'ambulance',
            'departments': ['Emergency Medicine', 'Trauma Center'],
            'equipment': ['Defibrillators', 'Ventilators', 'Monitor'],
            'timings': '24/7'
        },
        {
            'id': 7,
            'name': 'Diagnostic Services',
            'description': 'Comprehensive diagnostic and imaging services',
            'icon': 'microscope',
            'departments': ['Radiology', 'Pathology', 'Laboratory'],
            'equipment': ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'Lab Analyzers'],
            'timings': '24/7'
        },
        {
            'id': 8,
            'name': 'Intensive Care',
            'description': 'Multi-specialty intensive care units',
            'icon': 'icu',
            'departments': ['ICU', 'CCU', 'NICU', 'PICU'],
            'equipment': ['Ventilators', 'Monitors', 'Dialysis', 'ECMO'],
            'timings': '24/7'
        }
    ]
    return jsonify(services), 200

# ============================================
# PATIENT AUTHENTICATION ENDPOINTS
# ============================================

def generate_patient_id():
    """Generate next patient ID in format P0001, P0002, etc."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT patient_id FROM patients WHERE patient_id LIKE 'P%' ORDER BY patient_id DESC LIMIT 1")
    last_patient = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if last_patient:
        last_id = last_patient['patient_id']
        # Extract numeric part from patient ID
        import re
        match = re.search(r'(\d+)', last_id)
        if match:
            number = int(match.group(1)) + 1
        else:
            number = 1
    else:
        number = 1
    
    return f"P{number:04d}"


@app.route('/api/patient/appointments', methods=['GET'])
@jwt_required()
def get_patient_appointments():
    """Get patient's appointments"""
    try:
        current_user = get_jwt_identity()
        patient_id = current_user['patient_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id, a.appointment_id, a.appointment_date, a.appointment_time,
                   a.status, a.consultation_mode, a.reason_for_visit,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department
            FROM appointments a
            JOIN staff s ON a.doctor_id = s.staff_id
            JOIN departments d ON a.department_id = d.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """, (patient_id,))
        
        appointments = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'appointments': appointments}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch appointments: {str(e)}'}), 500

@app.route('/api/patient/appointments', methods=['POST'])
@jwt_required()
@role_required('Patient')
def book_patient_appointment():
    """Book a new appointment for patient"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity() # This is patient_id like P0001
        
        # Validate required fields
        required_fields = ['doctor_id', 'appointment_date', 'appointment_type', 'reason']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'Missing required field: {field}'}), 400
                
        # Generate Appointment ID
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get count for ID generation
        cursor.execute("SELECT COUNT(*) FROM appointments")
        count = cursor.fetchone()[0]
        appointment_id = f"APT{str(count + 1).zfill(6)}"
        
        # Payment details
        payment_details = data.get('payment_details', {})
        payment_status = 'Pending'
        if payment_details:
             payment_status = 'Paid'
        
        payment_method = payment_details.get('method')
        payment_amount = payment_details.get('amount')
        payment_transaction_id = payment_details.get('transactionId')
        
        # Insert appointment
        cursor.execute("""
            INSERT INTO appointments (
                appointment_id, patient_id, doctor_id, appointment_date, 
                appointment_time, status, reason_for_visit, symptoms, appointment_type,
                payment_status, payment_mode, consultation_fee, payment_transaction_id,
                mobile_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            appointment_id,
            current_user_id,
            data['doctor_id'],
            data['appointment_date'],
            data.get('appointment_time', '10:00 AM'), # Default if not provided
            'Pending_Approval', # Initial status
            data['reason'],
            data.get('symptoms', ''),
            data['appointment_type'],
            payment_status,
            payment_method,
            payment_amount,
            payment_transaction_id,
            data.get('mobile_number', '')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Appointment booked successfully',
            'appointment_id': appointment_id,
            'status': 'Pending_Approval'
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Failed to book appointment: {str(e)}'}), 500

@app.route('/api/patient/medical-records', methods=['GET'])
@jwt_required()
def get_patient_medical_records():
    """Get patient's medical records"""
    try:
        current_user = get_jwt_identity()
        patient_id = current_user['patient_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id, a.appointment_date as record_date, a.status,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department, a.reason_for_visit as diagnosis
            FROM appointments a
            JOIN staff s ON a.doctor_id = s.staff_id
            JOIN departments d ON a.department_id = d.id
            WHERE a.patient_id = ? AND a.status = 'Completed'
            ORDER BY a.appointment_date DESC
        """, (patient_id,))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'records': records}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch medical records: {str(e)}'}), 500

@app.route('/api/patient/prescriptions', methods=['GET'])
@jwt_required()
def get_patient_prescriptions():
    """Get patient's prescriptions"""
    try:
        current_user = get_jwt_identity()
        patient_id = current_user['patient_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.prescription_id, p.prescription_date, p.diagnosis,
                   p.general_instructions as instructions, p.status,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM prescriptions p
            JOIN staff s ON p.doctor_id = s.staff_id
            WHERE p.patient_id = ?
            ORDER BY p.prescription_date DESC
        """, (patient_id,))
        
        prescriptions = []
        for row in cursor.fetchall():
            # Get medicines for this prescription
            cursor.execute("""
                SELECT medicine_name as name, dosage, frequency, duration
                FROM prescription_medicines
                WHERE prescription_id = ?
            """, (row['prescription_id'],))
            medicines = cursor.fetchall()
            
            prescriptions.append({
                **row,
                'medicines': medicines
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({'prescriptions': prescriptions}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch prescriptions: {str(e)}'}), 500

@app.route('/api/patient/lab-results', methods=['GET'])
@jwt_required()
def get_patient_lab_results():
    """Get patient's lab results"""
    try:
        current_user = get_jwt_identity()
        patient_id = current_user['patient_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT lo.id, lo.test_name, lo.order_date as test_date,
                   lo.status, lo.is_critical,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM lab_orders lo
            JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE lo.patient_id = ?
            ORDER BY lo.order_date DESC
        """, (patient_id,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'results': results}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch lab results: {str(e)}'}), 500

@app.route('/api/public/doctors', methods=['GET'])
def get_public_doctors():
    """Get list of doctors for public viewing"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.staff_id, s.first_name, s.last_name, d.specialization,
                   d.consultation_fee, d.rating, d.bio,
                   dept.dept_name as department
            FROM staff s
            JOIN doctors d ON s.staff_id = d.staff_id
            JOIN departments dept ON s.department_id = dept.id
            WHERE s.role = 'Doctor' AND s.is_active = 1
            ORDER BY d.rating DESC
        """)
        
        doctors = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'doctors': doctors}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch doctors: {str(e)}'}), 500

# ============================================
# DOCTOR DASHBOARD ENDPOINTS
# ============================================

@app.route('/api/public/departments', methods=['GET'])
def get_public_departments():
    """Get list of departments for public viewing"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, dept_name, dept_code, description, 
                   head_of_department, contact_number, location
            FROM departments
            WHERE is_active = 1
            ORDER BY dept_name
        """)
        
        departments = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(departments), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch departments: {str(e)}'}), 500


@app.route('/api/doctor/stats', methods=['GET'])
@jwt_required()
@role_required(['Doctor', 'Admin'])
def get_doctor_stats():
    """Get doctor dashboard statistics"""
    claims = get_jwt()
    doctor_id = get_jwt_identity() # valid as identity is staff_id
    
    # If admin, might need to pass doctor_id, but usually dashboard is for logged in user
    # For simplicity, we assume logged in doctor
    
    today = date.today().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor() # using default cursor for now, or ensure dict factory
    # Note: get_db_connection sets row_factory to sqlite3.Row which behaves like dict
    
    try:
        stats = {
            'today_appointments': 0,
            'pending_consultations': 0,
            'completed_consultations': 0,
            'emergency_consultations': 0,
            'pending_lab_results': 0, # Mocked for now
            'follow_up_due': 0 # Mocked for now
        }
        
        # Today's Appointments Stats
        cursor.execute("""
            SELECT status, appointment_type, count(*) as count
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ?
            GROUP BY status, appointment_type
        """, (doctor_id, today))
        
        rows = cursor.fetchall()
        for row in rows:
            # array access if row factory or dict access
            status = row['status']
            atype = row['appointment_type']
            count = row['count']
            
            stats['today_appointments'] += count
            
            if status == 'Completed':
                stats['completed_consultations'] += count
            elif status in ['Confirmed', 'Waiting', 'Visited', 'In_Progress']:
                stats['pending_consultations'] += count
                
            if atype == 'Emergency':
                stats['emergency_consultations'] += count

        # Quick Metrics (Mocked for MVP)
        metrics = {
            'avg_consultation_time': '15 min',
            'patient_satisfaction': '4.8/5.0',
            'pending_approvals': 2,
            'critical_lab_values': 1
        }
        
        return jsonify({'stats': stats, 'metrics': metrics}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctor/notifications', methods=['GET'])
@jwt_required()
@role_required(['Doctor', 'Admin'])
def get_doctor_notifications():
    """Get real-time notifications for doctor"""
    doctor_id = get_jwt_identity()
    today = date.today().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    notifications = []
    
    try:
        # Check for waiting patients
        cursor.execute("""
            SELECT p.first_name, p.last_name, a.token_number, a.appointment_time
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status = 'Waiting'
        """, (doctor_id, today))
        
        waiting_patients = cursor.fetchall()
        for p in waiting_patients:
            notifications.append({
                'id': f"notif_{uuid.uuid4().hex[:8]}",
                'type': 'patient_waiting',
                'message': f"Patient {p['first_name']} {p['last_name']} ({p['token_number']}) is waiting.",
                'priority': 'high',
                'timestamp': datetime.now().isoformat() # In real app, check 'updated_at' of appointment
            })
            
        # Add mock critical alerts
        notifications.append({
             'id': 'crit_001',
             'type': 'critical_lab',
             'message': 'Critical Lab Result: Hemoglobin 6.5 g/dL for Patient P0042',
             'priority': 'critical',
             'timestamp': (datetime.now() - timedelta(minutes=10)).isoformat()
        })
        
        return jsonify(notifications), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# CLINICAL ENDPOINTS (Prescriptions & Lab Orders)
# ============================================

@app.route('/api/patients/<patient_id>/prescriptions', methods=['GET'])
@jwt_required()
def get_prescriptions_by_patient_id(patient_id):
    """Get prescriptions for a patient"""
    # Verify access rights (Patient themselves, or Staff)
    claims = get_jwt()
    if claims.get('role') == 'Patient' and get_jwt_identity() != patient_id:
        return jsonify({'error': 'Access denied'}), 403
        
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT p.*, 
                   d.first_name || ' ' || d.last_name as doctor_name,
                   dept.dept_name
            FROM prescriptions p
            JOIN staff d ON p.doctor_id = d.staff_id
            LEFT JOIN departments dept ON d.department_id = dept.id
            WHERE p.patient_id = ?
            ORDER BY p.prescription_date DESC
        """, (patient_id,))
        
        prescriptions = cursor.fetchall()
        
        # For each prescription, fetch medicines (N+1 query but acceptable for individual patient view)
        result = []
        for p in prescriptions:
            p_dict = dict(p)
            cursor.execute("""
                SELECT * FROM prescription_medicines WHERE prescription_id = ?
            """, (p['prescription_id'],))
            p_dict['medicines'] = [dict(m) for m in cursor.fetchall()]
            result.append(p_dict)
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lab-orders', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def create_lab_order_bulk():
    """Create a new lab order"""
    data = request.get_json()
    doctor_id = get_jwt_identity()
    
    if not data.get('patient_id') or not data.get('tests'):
        return jsonify({'error': 'Patient ID and Tests are required'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # We can group tests under one 'Order' conceptually, or insert individual rows per test
        # The schema seems to have 'lab_orders' as one row per test (based on `test_name` column)
        # OR `lab_orders` is the header and `lab_results` are the details?
        # Schema: `lab_orders` has `test_name` (singular). So one row per test.
        
        created_ids = []
        for test in data['tests']:
            cursor.execute("""
                INSERT INTO lab_orders (
                    patient_id, ordered_by, appointment_id,
                    test_category, test_name, priority, 
                    clinical_notes, status, order_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)
            """, (
                data['patient_id'], doctor_id, data.get('appointment_id'),
                test.get('category'), test['name'], test.get('priority', 'Routine'),
                data.get('clinical_notes')
            ))
            created_ids.append(cursor.lastrowid)
            
        conn.commit()
        # Emit events for created orders
        try:
            for oid in created_ids:
                payload = {
                    'lab_order_id': oid,
                    'patient_id': data.get('patient_id'),
                    'doctor_id': doctor_id,
                    'timestamp': datetime.now().isoformat()
                }
                socketio.emit('lab_order_created', payload, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting lab_order_created bulk: {e}")

        return jsonify({'message': 'Lab orders created successfully', 'order_ids': created_ids}), 201
        
    except Exception as e:
        traceback.print_exc()
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/patients/<patient_id>/lab-orders', methods=['GET'])
@jwt_required()
def get_patient_lab_orders(patient_id):
    """Get lab orders for a patient"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT lo.*, 
                   s.first_name || ' ' || s.last_name as doctor_name,
                   lr.result_value, lr.unit, lr.reference_range, lr.is_critical
            FROM lab_orders lo
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN lab_results lr ON lo.id = lr.lab_order_id
            WHERE lo.patient_id = ?
            ORDER BY lo.order_date DESC
        """, (patient_id,)) if False else None  # Placeholder - using corrected query below
        
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by, lo.test_type, lo.order_date,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   lr.result_value, lr.unit, lr.reference_range, lr.is_critical
            FROM lab_orders lo
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN lab_results lr ON lo.id = lr.lab_order_id
            WHERE lo.patient_id = ?
            ORDER BY lo.order_date DESC
        """, (patient_id,))
        
        orders = cursor.fetchall()
        return jsonify([dict(row) for row in orders]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# DOCTOR CONSULTATION WORKFLOW ENDPOINTS
# ============================================

@app.route('/api/doctor/queue/today', methods=['GET'])
@jwt_required()
@role_required(['Doctor'])
def get_doctor_queue_today():
    """Get today's queue for a specific doctor"""
    doctor_id = request.args.get('doctor_id')
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT q.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.patient_id, p.mobile_number, p.email, 
                   p.date_of_birth as patient_dob, p.gender as patient_gender,
                   a.appointment_type, a.reason_for_visit, a.appointment_time,
                   a.symptoms, a.appointment_id,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM queue_management q
            JOIN patients p ON q.patient_id = p.patient_id
            JOIN appointments a ON q.appointment_id = a.appointment_id
            JOIN staff s ON q.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE q.queue_date = ? AND q.doctor_id = ?
            ORDER BY q.token_number
        """, (datetime.now().strftime('%Y-%m-%d'), doctor_id))
        
        queue = cursor.fetchall()
        return jsonify([dict(row) for row in queue]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctor/next-patient', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def call_next_patient():
    """Call next patient from queue - transitions from Waiting to In_Progress"""
    data = request.get_json()
    queue_id = data.get('queue_id')
    doctor_id = data.get('doctor_id')
    
    if not queue_id or not doctor_id:
        return jsonify({'error': 'queue_id and doctor_id required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    dict_cursor = get_dict_cursor(conn)
    
    try:
        # Get queue item and appointment info
        dict_cursor.execute("""
            SELECT q.*, a.appointment_id
            FROM queue_management q
            JOIN appointments a ON q.appointment_id = a.appointment_id
            WHERE q.id = ? AND q.doctor_id = ?
        """, (queue_id, doctor_id))
        
        queue_item = dict_cursor.fetchone()
        if not queue_item:
            return jsonify({'error': 'Queue item not found'}), 404
        
        appointment_id = queue_item['appointment_id']
        
        # Update queue status to In_Progress
        cursor.execute("""
            UPDATE queue_management
            SET status = 'In_Progress', called_in_time = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (queue_id,))
        
        # Update appointment status
        cursor.execute("""
            UPDATE appointments
            SET status = 'In_Progress', consultation_start_time = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
        """, (appointment_id,))
        
        conn.commit()
        
        # Emit real-time event
        try:
            socketio.emit('patient_called', {
                'queue_id': queue_id,
                'appointment_id': appointment_id,
                'doctor_id': doctor_id,
                'status': 'In_Progress',
                'timestamp': datetime.now().isoformat()
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting patient_called: {e}")
        
        return jsonify({'message': 'Patient called successfully', 'queue_id': queue_id}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctor/complete-consultation', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def complete_consultation():
    """Mark consultation as complete - transitions from In_Progress to Completed"""
    data = request.get_json()
    queue_id = data.get('queue_id')
    appointment_id = data.get('appointment_id')
    doctor_id = data.get('doctor_id')
    diagnosis = data.get('diagnosis', '')
    
    if not queue_id or not appointment_id:
        return jsonify({'error': 'queue_id and appointment_id required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update queue status to Completed
        cursor.execute("""
            UPDATE queue_management
            SET status = 'Completed', consultation_end_time = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (queue_id,))
        
        # Update appointment status to Completed
        cursor.execute("""
            UPDATE appointments
            SET status = 'Completed', consultation_end_time = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
        """, (appointment_id,))
        
        conn.commit()
        
        # Emit real-time event
        try:
            socketio.emit('consultation_completed', {
                'queue_id': queue_id,
                'appointment_id': appointment_id,
                'doctor_id': doctor_id,
                'status': 'Completed',
                'diagnosis': diagnosis,
                'timestamp': datetime.now().isoformat()
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting consultation_completed: {e}")
        
        return jsonify({'message': 'Consultation completed', 'queue_id': queue_id}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctor/consultation/<appointment_id>', methods=['GET'])
@jwt_required()
@role_required(['Doctor'])
def get_consultation_details(appointment_id):
    """Get patient and consultation details for active appointment"""
    conn = get_db_connection()
    dict_cursor = get_dict_cursor(conn)
    
    try:
        # Get appointment and patient details
        dict_cursor.execute("""
            SELECT a.*,
                   p.patient_id, p.first_name || ' ' || p.last_name as patient_name,
                   p.mobile_number, p.email, p.date_of_birth, p.gender,
                   p.blood_group, p.known_allergies, p.chronic_conditions,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.appointment_id = ?
        """, (appointment_id,))
        
        appointment = dict_cursor.fetchone()
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        appointment_data = dict(appointment)
        
        # Get previous prescriptions
        dict_cursor.execute("""
            SELECT * FROM prescriptions
            WHERE patient_id = ? AND status = 'Active'
            ORDER BY prescription_date DESC
            LIMIT 5
        """, (appointment_data['patient_id'],))
        
        appointment_data['previous_prescriptions'] = [dict(row) for row in dict_cursor.fetchall()]
        
        # Get lab orders for this appointment
        dict_cursor.execute("""
            SELECT * FROM lab_orders
            WHERE appointment_id = ?
            ORDER BY order_date DESC
        """, (appointment_id,))
        
        appointment_data['lab_orders'] = [dict(row) for row in dict_cursor.fetchall()]
        
        return jsonify(appointment_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        dict_cursor.close()
        conn.close()

@app.route('/api/doctor/write-diagnosis', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def write_diagnosis():
    """Write diagnosis for a consultation"""
    data = request.get_json()
    appointment_id = data.get('appointment_id')
    patient_id = data.get('patient_id')
    diagnosis = data.get('diagnosis', '')
    chief_complaint = data.get('chief_complaint', '')
    examination_findings = data.get('examination_findings', '')
    vital_signs = data.get('vital_signs', '')
    
    if not appointment_id and not patient_id:
        return jsonify({'error': 'appointment_id or patient_id required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if appointment_id:
            # Get patient_id and doctor_id from appointment
            cursor.execute("""
                SELECT patient_id, doctor_id FROM appointments
                WHERE appointment_id = ?
            """, (appointment_id,))
            
            result = cursor.fetchone()
            if not result:
                return jsonify({'error': 'Appointment not found'}), 404
            
            patient_id, doctor_id = result
        else:
            # Use provided patient_id and logged in doctor
            doctor_id = get_jwt_identity()
        
        # Check if prescription exists for this context
        if appointment_id:
            cursor.execute("""
                SELECT prescription_id FROM prescriptions
                WHERE appointment_id = ? AND status = 'Active'
            """, (appointment_id,))
        else:
            cursor.execute("""
                SELECT prescription_id FROM prescriptions
                WHERE patient_id = ? AND appointment_id IS NULL AND status = 'Active'
                ORDER BY created_at DESC LIMIT 1
            """, (patient_id,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing prescription
            prescription_id = existing[0]
            cursor.execute("""
                UPDATE prescriptions
                SET diagnosis = ?, chief_complaint = ?, 
                    examination_findings = ?, vital_signs = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE prescription_id = ?
            """, (diagnosis, chief_complaint, examination_findings, vital_signs, prescription_id))
        else:
            # Create new prescription
            import uuid
            prescription_id = f"RX-{uuid.uuid4().hex[:12].upper()}"
            cursor.execute("""
                INSERT INTO prescriptions (
                    prescription_id, patient_id, doctor_id, appointment_id,
                    diagnosis, chief_complaint, examination_findings, vital_signs,
                    status, prescription_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURRENT_TIMESTAMP)
            """, (prescription_id, patient_id, doctor_id, appointment_id,
                  diagnosis, chief_complaint, examination_findings, vital_signs))
        
        conn.commit()
        
        # Emit event
        try:
            socketio.emit('diagnosis_written', {
                'appointment_id': appointment_id,
                'prescription_id': prescription_id if not existing else existing[0],
                'timestamp': datetime.now().isoformat()
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting diagnosis_written: {e}")
        
        return jsonify({
            'message': 'Diagnosis saved successfully',
            'prescription_id': prescription_id if not existing else existing[0]
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================
# WEBSOCKET HANDLERS FOR REAL-TIME UPDATES
# ============================================

# Only define SocketIO handlers if SocketIO is available (development)
if socketio is not None:
    
    @socketio.on('connect', namespace='/appointments')
    def handle_connect():
        """Handle client connection to appointments namespace"""
        print(f"Client connected to /appointments namespace")
        return True


    @socketio.on('join_doctor_room', namespace='/appointments')
    def handle_join_doctor_room(data):
        """Allow a doctor client to join a room for targeted updates.
        Expected payload: { 'doctor_id': '<staff_id>' }
        """
        try:
            doctor_id = data.get('doctor_id') if data else None
            if doctor_id:
                room_name = f"doctor_{doctor_id}"
                join_room(room_name)
                print(f"Socket joined room: {room_name}")
                safe_emit('room_joined', {'room': room_name}, namespace='/appointments')
        except Exception as e:
            print(f"Error in join_doctor_room: {e}")


    @socketio.on('leave_doctor_room', namespace='/appointments')
    def handle_leave_doctor_room(data):
        try:
            doctor_id = data.get('doctor_id') if data else None
            if doctor_id:
                room_name = f"doctor_{doctor_id}"
                leave_room(room_name)
                print(f"Socket left room: {room_name}")
                safe_emit('room_left', {'room': room_name}, namespace='/appointments')
        except Exception as e:
            print(f"Error in leave_doctor_room: {e}")

    @socketio.on('disconnect', namespace='/appointments')
    def handle_disconnect():
        """Handle client disconnection from appointments namespace"""
        print(f"Client disconnected from /appointments namespace")

    @socketio.on('request_queue_update', namespace='/appointments')
    def handle_queue_update_request(data):
        """Handle request for current queue update"""
        doctor_id = data.get('doctor_id', '') if data else ''
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT q.*, 
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth as patient_dob, p.gender as patient_gender,
                   a.appointment_type, a.reason_for_visit,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM queue_management q
            JOIN patients p ON q.patient_id = p.patient_id
            JOIN appointments a ON q.appointment_id = a.appointment_id
            JOIN staff s ON q.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE q.queue_date = ?
        """
        params = [datetime.now().strftime('%Y-%m-%d')]
        
        if doctor_id:
            query += " AND q.doctor_id = ?"
            params.append(doctor_id)
        
        query += " ORDER BY q.token_number"
        
        cursor.execute(query, params)
        queue = cursor.fetchall()
        
        # Emit the queue data back to the requesting client
        socketio.emit('queue_update', {
            'queue': [dict(row) for row in queue],
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error in handle_queue_update_request: {e}")
        socketio.emit('queue_update_error', {'error': str(e)})
    finally:
        cursor.close()
        conn.close()

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(429)
def ratelimit_handler(error):
    return jsonify({'error': 'Rate limit exceeded'}), 429

# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        cursor.close()
        conn.close()
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }), 503

# ============================================
# MAIN ENTRY POINT
# ============================================

if __name__ == "__main__":
    app.run()
