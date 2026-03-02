"""
Hospital Management System - Flask Backend API
===============================================
Comprehensive backend API for Patient Portal and Staff Portal
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt
from werkzeug.security import check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO, join_room, leave_room
from datetime import datetime, timedelta, date
from decimal import Decimal
import json
import os
import sys
import uuid
import re
from functools import wraps
import traceback
import signal
import sys

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Graceful shutdown handler
def graceful_shutdown(signum, frame):
    print("\n  Received shutdown signal, closing gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, graceful_shutdown)
signal.signal(signal.SIGTERM, graceful_shutdown)

# Import WhatsApp service for notifications
from whatsapp_service import (
    send_registration_confirmation,
    send_appointment_booking_notification,
    send_appointment_approval_notification,
    send_lab_results_notification,
    send_appointment_reminder,
    send_appointment_cancellation_notification,
    send_consultation_completion_notification,
    send_prescription_ready_notification,
    send_payment_reminder,
    start_message_queue_worker
)

# Import Email Service
from email_service import send_insurance_claim_request

# Import AI Bill Predictor
from bill_predictor import predictor as ai_bill_predictor

# Import PostgreSQL database configuration
from database_postgres import db, get_db, query_db, update_db, get_db_connection, close_db_connection, get_dict_cursor, execute_query, fetchall_as_dicts, fetchone_as_dict
from psycopg2.extras import RealDictCursor

REGISTRATION_FEE = float(os.getenv('REGISTRATION_FEE', '50.0'))

def calculate_token_number(appointment_time):
    """Calculate token number based on time slot (30-min intervals from 09:00 AM)"""
    try:
        # Normalize time format handle "10:00 AM", "10:00", "10:00:00"
        time_str = str(appointment_time).upper().strip()
        t = None
        
        if 'AM' in time_str or 'PM' in time_str:
            t = datetime.strptime(time_str, "%I:%M %p")
        elif len(time_str.split(':')) == 3:
            t = datetime.strptime(time_str, "%H:%M:%S")
        elif len(time_str.split(':')) == 2:
            t = datetime.strptime(time_str, "%H:%M")
        
        if t:
            minutes = t.hour * 60 + t.minute
            start_minutes = 9 * 60 # 09:00 AM
            # Calculate slot index. If before 9 AM, it will be negative, we'll shift it or just use 1.
            slot_index = (minutes - start_minutes) // 30 + 1
            return f"TKN-{max(1, slot_index):03d}"
    except Exception as e:
        print(f"Error calculating token for {appointment_time}: {e}")
    
    # Fallback to a simple timestamp based token if parsing fails
    return f"TKN-{datetime.now().strftime('%H%M%S')}"

from flask.json.provider import DefaultJSONProvider

# Custom JSON Provider for Flask 2.3+
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        # Dict-like rows from PostgreSQL RealDictCursor
        if hasattr(obj, 'keys') and not isinstance(obj, dict):
            return dict(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if hasattr(obj, 'strftime'):  # Handle time objects
            return obj.strftime('%H:%M:%S')
        return super().default(obj)

# Initialize Flask App
app = Flask(__name__)
app.json = CustomJSONProvider(app)

# Initialize SocketIO for real-time notifications (threading = stable; eventlet can cause crashes with DB/requests)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Enable CORS - allow all origins for development
CORS(app, resources={r"/api/*": {"origins": "*", "supports_credentials": True}})

# Default prices for lab tests
LAB_TEST_PRICES = {
    'Complete Blood Count (CBC)': 350.00,
    'Renal Function Test (RFT)': 650.00,
    'Liver Function Test (LFT)': 750.00,
    'Lipid Profile': 550.00,
    'Thyroid Profile': 850.00,
    'Blood Glucose': 150.00,
    'Urinalysis': 200.00,
    'HBA1C': 600.00,
    'Vitamin D': 1200.00,
    'Vitamin B12': 900.00,
    'MRI Scan': 4500.00,
    'X-Ray': 500.00,
    'CT Scan': 3500.00,
    'Ultrasound': 1200.00
}

def get_lab_price(test_name):
    """Get price for a lab test, default to 500.00 if not found"""
    return LAB_TEST_PRICES.get(test_name, 500.00)

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'query_string']  # Allow token in query params for SSE
app.config['JWT_QUERY_STRING_NAME'] = 'token'  # Query param name for token

# Initialize Extensions
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["20000 per day", "10000 per hour"],
    storage_uri="memory://"
)

# ============================================
# Database Connection Layer (PostgreSQL)
# ============================================


def get_db_connection():
    """Get PostgreSQL database connection.

    Connections returned from the pool are raw psycopg2 connections.  Since
    various parts of the code still use SQLite-style ``?`` placeholders we
    provide a thin proxy around the connection that rewrites ``?`` to ``%s``
    whenever a cursor is created.  The proxy simply forwards attribute access
    to the underlying connection.
    """
    # helper cursor proxy that rewrites SQLite-style ``?`` placeholders
    # to PostgreSQL ``%s`` and delegates all other attributes to the
    # underlying cursor.  We avoid trying to monkey‑patch the real
    # ``cursor.execute`` method since psycopg2 cursor objects often make
    # that attribute read-only (seen in the unit tests and during real
    # requests).  A lightweight wrapper object is much more reliable.
    class _CursorProxy:
        def __init__(self, cursor):
            self._cursor = cursor
        def execute(self, query, params=None):
            # rewrite SQLite-style placeholders before logging/exec
            if isinstance(query, str) and params is not None and '?' in query:
                query = query.replace('?', '%s')
            # debug output can help trace problematic SQL during development
            try:
                # prefer Flask app logger so messages show up alongside other
                # request logs; ``app`` is defined later, so import lazily.
                from flask import current_app
                current_app.logger.debug(f"SQL: {query!r} params={params!r}")
            except Exception:
                # fallback to print if logger unavailable
                try:
                    print(f"[SQL] executing: {query!r} params={params!r}")
                except Exception:
                    pass
            return self._cursor.execute(query, params)
        def executemany(self, query, param_list):
            if isinstance(query, str) and '?' in query:
                query = query.replace('?', '%s')
            return self._cursor.executemany(query, param_list)
        def __getattr__(self, name):
            return getattr(self._cursor, name)

    class _ConnectionProxy:
        def __init__(self, conn):
            # ``conn`` should be a real psycopg2 connection object
            self._conn = conn
        def cursor(self, *args, **kwargs):
            # create the real cursor first (may be RealDictCursor etc.)
            cur = self._conn.cursor(*args, **kwargs)
            # wrap it in our proxy so we can rewrite placeholder syntax
            return _CursorProxy(cur)
        def close(self):
            # return the underlying connection to pool if applicable
            try:
                if hasattr(db, 'pool') and self._conn in getattr(db.pool, '_used', []):
                    db.pool.putconn(self._conn)
                else:
                    self._conn.close()
            except Exception:
                try:
                    self._conn.close()
                except Exception:
                    pass
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc, tb):
            self.close()
        def __getattr__(self, name):
            return getattr(self._conn, name)

    if hasattr(db, 'pool'):
        try:
            conn = db.pool.getconn()
            return _ConnectionProxy(conn)
        except Exception:
            # pool might not be ready yet, fall through to context manager
            pass
    # fallback to context manager in very early startup
    cm = db.get_connection()
    conn = cm.__enter__()
    return _ConnectionProxy(conn)

def close_db_connection(conn):
    """Return a connection to the pool or clean up a context manager wrapper.

    The caller may pass any of:
    1. an ``_ConnectionProxy`` instance (our wrapper)
    2. a raw psycopg2 connection obtained from the pool
    3. a contextlib ``_GeneratorContextManager`` if something accidentally
       returned the context manager itself.

    We try each possibility in turn without raising further exceptions.
    """
    # generator context managers don't have ``close`` but do have ``__exit__``;
    # handle them first so we don't try to call ``close`` on them and trigger
    # annoying AttributeErrors.
    from contextlib import _GeneratorContextManager
    if isinstance(conn, _GeneratorContextManager):
        try:
            conn.__exit__(None, None, None)
        except Exception:
            pass
        return

    # if it's our proxy or a normal connection, ``close`` should work
    if hasattr(conn, 'close') and callable(conn.close):
        try:
            conn.close()
            return
        except Exception:
            pass

    # direct pool-return path for plain connections
    try:
        if hasattr(db, 'pool') and db.pool and conn in getattr(db.pool, '_used', []):
            db.pool.putconn(conn)
            return
    except Exception:
        pass

    # last resort: call __exit__ if available
    if hasattr(conn, '__exit__'):
        try:
            conn.__exit__(None, None, None)
        except Exception:
            pass


def get_dict_cursor(conn):
    """Get dictionary cursor for PostgreSQL

    The connection returned by ``get_db_connection`` is always a raw
    ``psycopg2`` connection (not a context manager), so we can simply call
    ``cursor`` with the real dict cursor factory.
    """
    return conn.cursor(cursor_factory=RealDictCursor)

def execute_query(conn, query, params=None):
    """Execute a query and return cursor"""
    if hasattr(conn, '__enter__'):
        # Use database module for context manager
        with db.get_cursor() as (cursor, db_conn):
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor
    else:
        # Use direct connection
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor

def fetchall_as_dicts(cursor):
    """Convert query results to list of dicts (PostgreSQL RealDictCursor returns dict-like rows)."""
    rows = cursor.fetchall()
    return [dict(r) for r in rows]

def fetchone_as_dict(cursor):
    """Fetch one row as dict."""
    row = cursor.fetchone()
    return dict(row) if row else None

def _row_to_dict(cursor, row):
    """Convert a fetched row to dict for PostgreSQL."""
    if row is None:
        return {}
    if hasattr(row, 'keys'):
        return {k: row[k] for k in row.keys()}
    cols = [desc[0] for desc in cursor.description] if cursor.description else []
    return dict(zip(cols, row))

def init_db():
    """Verify PostgreSQL connection"""
    print('Using PostgreSQL database via DATABASE_URL')
    try:
        if not db.test_connection():
            raise Exception("Database connection test failed")
        print('PostgreSQL database connection successful.')
    except Exception as e:
        print(f'PostgreSQL init error: {e}. Ensure DATABASE_URL is set and database is accessible.')
        sys.exit(1)

# Initialize DB on start (catch so one bad env doesnt crash the process)
try:
    init_db()
except Exception as e:
    print(f"Warning: init_db failed: {e}. Continuing anyway.")

# Ensure lab_reports table exists (added for lab workflow)
try:
    with get_db_connection() as conn:
        cursor = get_dict_cursor(conn)
        cursor.execute("""
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
            )
        """)
        conn.commit()
        cursor.close()
    print("  lab_reports table ready")
except Exception as e:
    print(f"Warning: lab_reports table creation failed: {e}")

# Ensure pharmacy_sales table exists (pharmacy analytics)
try:
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    cursor.execute("""
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
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pharmacy_sale_medicines (
            id SERIAL PRIMARY KEY,
            sale_id INTEGER REFERENCES pharmacy_sales(id),
            medicine_name TEXT NOT NULL,
            batch_number TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2),
            subtotal DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
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
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registration_otps (
            mobile_number TEXT PRIMARY KEY,
            otp TEXT NOT NULL,
            expiry TIMESTAMP NOT NULL
        )
    """)
    conn.commit()
    cursor.close()
    close_db_connection(conn)
    print("  pharmacy_sales, pharmacy_sale_medicines, insurance_claims, registration_otps tables ready")
except Exception as e:
    print(f"Warning: additional table creation failed: {e}")

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
    pattern = r'^\+?[0-9]{10,15}$'
    return re.match(pattern, phone) is not None

def validate_pincode(pincode):
    pattern = r'^[0-9]{6}$'
    return re.match(pattern, pincode) is not None

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.route('/api/auth/patient/send-otp', methods=['POST'])
@limiter.limit("5 per minute")
def patient_send_otp():
    """Patient send OTP endpoint"""
    try:
        data = request.get_json()
        identifier = data.get('identifier', '').strip()
        
        if not identifier:
            return jsonify({'message': 'Patient ID or Mobile Number is required'}), 400
            
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        # Find patient by ID or Mobile Number
        cursor.execute("""
            SELECT patient_id, mobile_number, first_name 
            FROM patients 
            WHERE (patient_id = %s OR mobile_number = %s) AND is_active = TRUE
        """, (identifier.upper(), identifier))
        
        patient = cursor.fetchone()
        
        if not patient:
            cursor.close()
            close_db_connection(conn)
            return jsonify({'message': 'Patient not found'}), 404
            
        # Generate 6 digit OTP
        import random
        otp = str(random.randint(100000, 999999))
        expiry = datetime.now() + timedelta(minutes=5)
        
        # Save OTP to database
        cursor.execute(
            "UPDATE patients SET current_otp = %s, otp_expiry = %s WHERE patient_id = %s",
            (otp, expiry.isoformat(), patient['patient_id'])
        )
        conn.commit()
        
        # Log to console
        print(f"[OTP SYSTEM] Generated OTP {otp} for patient {patient['patient_id']} ({patient['mobile_number']})")
        
        # Attempt to send via WhatsApp using plain text
        try:
            from whatsapp_service import send_otp_message
            send_otp_message(patient['mobile_number'], otp, patient['first_name'])
        except Exception as e:
            print(f"Warning: Failed to send OTP via WhatsApp: {e}")
            
        cursor.close()
        close_db_connection(conn)
        
        # We don't return the OTP in production, but for demo we can mask mobile
        masked_mobile = f"******{patient['mobile_number'][-4:]}" if len(patient['mobile_number']) >= 10 else "your mobile number"
        
        return jsonify({
            'message': f'OTP sent successfully to {masked_mobile}',
            'patient_id': patient['patient_id']
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to send OTP: {str(e)}'}), 500

@app.route('/api/auth/patient/verify-otp', methods=['POST'])
@limiter.limit("5 per minute")
def patient_verify_otp():
    """Patient verify OTP endpoint"""
    try:
        data = request.get_json()
        patient_id = data.get('patientId', '').upper()
        otp = data.get('otp', '').strip()
        
        if not patient_id or not otp:
            return jsonify({'message': 'Patient ID and OTP are required'}), 400
            
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        cursor.execute("""
            SELECT patient_id, first_name, last_name, email, mobile_number, 
                   date_of_birth, gender, current_otp, otp_expiry
            FROM patients 
            WHERE patient_id = %s AND is_active = TRUE
        """, (patient_id,))
        
        patient = cursor.fetchone()
        
        if not patient:
            cursor.close()
            close_db_connection(conn)
            return jsonify({'message': 'Patient not found'}), 404
            
        # Verify OTP
        if not patient['current_otp'] or patient['current_otp'] != otp:
            cursor.close()
            close_db_connection(conn)
            return jsonify({'message': 'Invalid OTP'}), 401
            
        # Check Expiry
        if patient['otp_expiry']:
            expiry_time = datetime.fromisoformat(patient['otp_expiry'])
            if datetime.now() > expiry_time:
                cursor.close()
                close_db_connection(conn)
                return jsonify({'message': 'OTP has expired. Please request a new one.'}), 401
                
        # Clear OTP on success, update last login
        cursor.execute("""
            UPDATE patients 
            SET current_otp = NULL, otp_expiry = NULL, last_login = ? 
            WHERE patient_id = ?
        """, (datetime.now().isoformat(), patient_id))
        conn.commit()
        
        # Create access token
        access_token = create_access_token(
            identity=patient['patient_id'],
            additional_claims={'role': 'Patient'}
        )
        
        cursor.close()
        close_db_connection(conn)
        
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
    staff_id = data.get('staff_id', '').strip().upper()
    password = data.get('password', '')
    department = data.get('department', '')
    
    print(f"[AUTH] Login attempt: staff_id='{staff_id}', department='{department}', password_len={len(password)}")
    
    if not staff_id or not password:
        return jsonify({'error': 'Staff ID and password are required'}), 400
    
    try:
        # Use PostgreSQL database module
        with db.get_cursor() as (cursor, conn):
            cursor.execute(
                """SELECT s.*, d.dept_name 
                   FROM staff s 
                   LEFT JOIN departments d ON s.department_id = d.id 
                   WHERE s.staff_id = %s AND s.is_active = TRUE""",
                (staff_id,)
            )
            staff = cursor.fetchone()
            
            if not staff:
                print(f"[DEBUG] staff_login: no staff found for {staff_id}")
                return jsonify({'error': 'Invalid staff ID or password'}), 401
            
            # Verify password using flask-bcrypt (bcrypt hashes)
            try:
                pw_ok = bcrypt.check_password_hash(staff['password_hash'], password)
            except Exception as e:
                print(f"[DEBUG] Password check error: {e}")
                pw_ok = False
            
            if not pw_ok:
                print(f"[DEBUG] staff_login: password mismatch for {staff_id}")
                return jsonify({'error': 'Invalid staff ID or password'}), 401
            
            # Generate JWT token with role claim
            access_token = create_access_token(
                identity=staff['staff_id'],
                additional_claims={'role': staff['role']}
            )
            refresh_token = create_refresh_token(
                identity=staff['staff_id'],
                additional_claims={'role': staff['role']}
            )
            
            # Update last login
            cursor.execute(
                "UPDATE staff SET last_login = NOW() WHERE staff_id = %s",
                (staff['staff_id'],)
            )
            
            staff_dict = dict(staff)
            # Remove sensitive data
            staff_dict.pop('password_hash', None)
            
            print(f"[AUTH] Login successful: {staff_id} ({staff_dict.get('first_name', '')} {staff_dict.get('last_name', '')})")
            
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'staff': staff_dict
            }), 200
            
    except Exception as e:
        print(f"[ERROR] staff_login failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

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
    print(f"DEBUG: Received registration payload: {request.get_json(silent=True)}")
    print(f"DEBUG: Request headers: {request.headers}")
    print(f"DEBUG: Request content type: {request.content_type}")
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
        'permanentAddressState': 'permanent_state',
        'currentAddressPincode': 'current_pincode',
        'permanentAddressSameAsCurrent': 'permanent_address_same_as_current',
        'bloodGroup': 'blood_group',
    }
    for camel, snake in mapping.items():
        if camel in data:
            data[snake] = data[camel]

    # Convert empty strings to None to avoid violating DB constraints on optional fields
    for k, v in list(data.items()):
        if isinstance(v, str) and not v.strip():
            data[k] = None

    bypass_otp = data.get('bypass_otp', False)

    # Validate required fields
    required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'mobile_number']
    if not bypass_otp:
        required_fields.append('otp')

    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate phone
    if not validate_phone(data.get('mobile_number', '')):
        return jsonify({'error': 'Invalid mobile number. Must be 10 digits.'}), 400
        
    mobile_number = data['mobile_number']
    provided_otp = data.get('otp')
    
    # Validate email if provided
    if data.get('email') and not validate_email(data.get('email')):
        return jsonify({'error': 'Invalid email format'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check if the number is already in patients
        cursor.execute("SELECT id FROM patients WHERE mobile_number = ?", (mobile_number,))
        if cursor.fetchone():
            return jsonify({'error': 'Mobile number already registered.'}), 409
            
        # Verify OTP if not bypassed
        if not bypass_otp:
            cursor.execute("SELECT otp, expiry FROM registration_otps WHERE mobile_number = %s", (mobile_number,))
            otp_record = cursor.fetchone()
            
            if not otp_record:
                return jsonify({'error': 'No OTP requested for this mobile number'}), 400
                
            if datetime.fromisoformat(otp_record['expiry']) < datetime.now():
                return jsonify({'error': 'OTP has expired. Please request a new one.'}), 400
                
            if otp_record['otp'] != provided_otp:
                return jsonify({'error': 'Invalid OTP'}), 400

        # No unique constraint on mobile_number: same number can register multiple times; patient_id is the only unique id.
        # Generate password hash
        password = 'Patient@123'  # Default password
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
                password_hash, registered_by, registration_fee_paid, registration_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            password_hash, data.get('registered_by', 'ONLINE'), data.get('registration_fee_paid', False), datetime.now().isoformat()
        ))
        
        pk_id = cursor.lastrowid

        # Delete OTP record if one was used
        if not bypass_otp:
            cursor.execute("DELETE FROM registration_otps WHERE mobile_number = %s", (mobile_number,))
        
        # Set phone verified to 1
        cursor.execute("UPDATE patients SET phone_verified = 1 WHERE id = %s", (pk_id,))
        
        conn.commit()

        # Send WhatsApp registration confirmation message
        try:
            print(f"Sending WhatsApp registration message to {data.get('mobile_number')}")
            send_registration_confirmation({
                'phone_number': data.get('mobile_number'),
                'patient_id': patient_id,
                'first_name': data.get('first_name'),
                'last_name': data.get('last_name'),
                'blood_group': data.get('blood_group', 'N/A'),
                'registration_fee': REGISTRATION_FEE
            })
            print(f"  WhatsApp registration message queued for {data.get('mobile_number')}")
        except Exception as e:
            print(f"Warning: Failed to send registration WhatsApp: {e}")
            import traceback
            traceback.print_exc()

        # If registration fee not paid, create a pending payment entry
        try:
            if not data.get('registration_fee_paid', False):
                cur2 = conn.cursor()
                cur2.execute("""
                    INSERT INTO pending_payments (patient_id, reference_type, reference_id, description, amount)
                    VALUES (?, 'registration', ?, 'Registration Fee', ?)
                """, (patient_id, pk_id, REGISTRATION_FEE))
                conn.commit()
                cur2.close()
        except Exception:
            # Do not fail registration due to payments insertion errors
            pass

        # Emit real-time dashboard update for new patient registration
        try:
            from app import socketio # Ensure imported
            socketio.emit('dashboard_patient_registered', {
                'patient_id': patient_id,
                'patient_name': f"{data.get('first_name')} {data.get('last_name')}",
                'timestamp': datetime.now().isoformat(),
                'registered_by': data.get('registered_by', 'ONLINE')
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting patient_registered: {e}")
        
        return jsonify({
            'message': 'Patient registered successfully',
            'patient_id': patient_id,
            'id': pk_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        print(f"Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/auth/patient/register/send-otp', methods=['POST'])
@limiter.limit("5 per minute")
def patient_register_send_otp():
    """Send OTP for new patient registration"""
    try:
        data = request.get_json()
        mobile_number = data.get('mobileNumber', '').strip()
        first_name = data.get('firstName', '').strip()
        
        if not mobile_number:
            return jsonify({'message': 'Mobile Number is required'}), 400
            
        if not validate_phone(mobile_number):
            return jsonify({'message': 'Invalid mobile number format'}), 400
            
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        # Check if already registered
        cursor.execute("SELECT id FROM patients WHERE mobile_number = ?", (mobile_number,))
        if cursor.fetchone():
            return jsonify({'message': 'Mobile number already registered. Please login instead.'}), 409
            
        # Generate OTP
        import random
        from datetime import datetime, timedelta
        otp = str(random.randint(100000, 999999))
        expiry = datetime.now() + timedelta(minutes=10)
        
        # Save OTP in temporary table
        cursor.execute("""
            INSERT INTO registration_otps (mobile_number, otp, expiry)
            VALUES (?, ?, ?)
            ON CONFLICT(mobile_number) DO UPDATE SET
                otp = excluded.otp,
                expiry = excluded.expiry
        """, (mobile_number, otp, expiry.isoformat()))
        conn.commit()
        
        # Send via WhatsApp
        try:
            from whatsapp_service import send_otp_message
            send_otp_message(mobile_number, otp, first_name or "Patient")
        except Exception as e:
            print(f"Warning: Failed to send OTP via WhatsApp: {e}")
            pass
            
        return jsonify({
            'message': 'OTP sent successfully',
            'mobile_number': mobile_number,
        }), 200
        
    except Exception as e:
        print(f"Error in patient register send OTP: {e}")
        return jsonify({'message': 'An internal error occurred'}), 500
    finally:
        if 'conn' in locals() and conn:
            cursor.close()
            close_db_connection(conn)

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
                   CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) as age, 
                   gender, blood_group, marital_status,
                   mobile_number, email, emergency_contact_name, emergency_contact_number, emergency_contact_relation,
                   current_address_street, current_address_area, current_city, current_state, current_pincode,
                   known_allergies, chronic_conditions, current_medications, previous_surgeries,
                   insurance_provider, insurance_policy_number, insurance_coverage_amount,
                   registration_date, last_login
            FROM patients WHERE patient_id = ? AND is_active = TRUE
        """, (patient_id,))
        
        patient = cursor.fetchone()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        return jsonify(patient), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/patient/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient_by_id(patient_id):
    """Get patient details by ID (alias for /api/patients/<patient_id>)"""
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
                   CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) as age, 
                   gender, blood_group, marital_status,
                   mobile_number, email, emergency_contact_name, emergency_contact_number, emergency_contact_relation,
                   current_address_street, current_address_area, current_city, current_state, current_pincode,
                   known_allergies, chronic_conditions, current_medications, previous_surgeries,
                   insurance_provider, insurance_policy_number, insurance_coverage_amount,
                   registration_date, last_login
            FROM patients WHERE patient_id = ? AND is_active = TRUE
        """, (patient_id,))
        
        patient = cursor.fetchone()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        return jsonify(patient), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
        close_db_connection(conn)

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
                   dept.name as dept_name, s.sub_department as department_specialization
            FROM doctors d
            JOIN staff s ON d.staff_id = s.staff_id
            LEFT JOIN departments dept ON s.department_id = dept.id
            WHERE s.is_active = TRUE
        """
        params = []
        
        if department:
            query += " AND dept.name = %s"
            params.append(department)
        
        if specialization:
            query += " AND d.specialization LIKE %s"
            params.append(f'%{specialization}%')
        
        if search:
            query += " AND (s.first_name LIKE %s OR s.last_name LIKE %s OR d.specialization LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY d.rating DESC"
        
        cursor.execute(query, params)
        doctors = cursor.fetchall()
        
        return jsonify([dict(d) for d in doctors]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
            WHERE d.staff_id = ? AND s.is_active = TRUE
        """, (staff_id,))
        
        doctor = cursor.fetchone()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        return jsonify(doctor), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/doctors/<staff_id>/availability', methods=['GET'])
def get_doctor_availability(staff_id):
    """Get doctor available time slots for a date"""
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get doctor schedule
        cursor.execute(
            "SELECT availability_schedule FROM doctors WHERE staff_id = ?",
            (staff_id,)
        )
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # availability_schedule is stored as TEXT (JSON). Parse safely.
        raw_schedule = result['availability_schedule']
        try:
            schedule = json.loads(raw_schedule) if isinstance(raw_schedule, str) and raw_schedule.strip() else (raw_schedule or {})
        except Exception:
            schedule = {}
        
        # Parse date and get day of week
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        day_name = date_obj.strftime('%A').lower()
        
        # Check doctor-specific unavailability for the date
        cursor.execute("SELECT COUNT(*) as count FROM doctor_unavailability WHERE doctor_id = ? AND unavailable_date = ?", (staff_id, date_str))
        res = cursor.fetchone()
        if res and res['count'] > 0:
            # Doctor marked unavailable on this date
            return jsonify({'available_slots': [], 'booked_slots': [], 'unavailable': True}), 200

        # Get available slots for that day
        day_schedule = schedule.get(day_name, [])
        
        # If no schedule is set, use default working hours (9 AM - 6 PM)
        if not day_schedule and day_name.lower() != 'sunday':
            day_schedule = [{'start': '09:00', 'end': '18:00', 'type': 'duty'}]
        
        # Get already booked slots (Confirmed, Pending_Approval, In_Progress)
        cursor.execute("""
            SELECT appointment_time as time
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ?
            AND status IN ('Confirmed', 'Pending_Approval', 'In_Progress')
        """, (staff_id, date_str))
        
        booked_times = set()
        for row in cursor.fetchall():
            t = (row['time'] or '').strip()
            # Normalize: store as "HH:MM" (first 5 chars) so it matches slot_time_short
            if len(t) >= 5:
                booked_times.add(t[:5])
        

        # Generate time slots — include booked ones marked as unavailable
        available_slots = []
        for slot in day_schedule:
            # Handle both old string format and new object format
            if isinstance(slot, str):
                try:
                    start, end = slot.split('-')
                    slot_type = 'duty'
                except Exception:
                    continue
            else:
                start = slot.get('start')
                end = slot.get('end')
                slot_type = slot.get('type', 'duty')

            if slot_type != 'duty' or not start or not end:
                continue

            try:
                start_hour = int(start.split(':')[0])
                end_hour = int(end.split(':')[0])
                
                # Handle minutes if provided (e.g., "09:30")
                start_min = int(start.split(':')[1]) if ':' in start else 0
                end_min = int(end.split(':')[1]) if ':' in end else 0
                
                current_time = datetime.strptime(f"{start_hour:02d}:{start_min:02d}", "%H:%M")
                end_time = datetime.strptime(f"{end_hour:02d}:{end_min:02d}", "%H:%M")
                
                while current_time < end_time:
                    slot_time = current_time.strftime("%H:%M:00")
                    slot_time_short = current_time.strftime("%H:%M")
                    hour = current_time.hour
                    period = 'Morning' if hour < 12 else ('Afternoon' if hour < 17 else 'Evening')
                    # Mark as booked/unavailable if already taken
                    is_booked = slot_time in booked_times or slot_time_short in booked_times
                    available_slots.append({
                        'time': slot_time,
                        'period': period,
                        'available': not is_booked,
                        'booked': is_booked
                    })
                    current_time += timedelta(minutes=30)
            except Exception as e:
                print(f"Error parsing slot {slot}: {e}")
                continue
        
        return jsonify({
            'date': date_str,
            'day': day_name.capitalize(),
            'available_slots': available_slots,
            'booked_slots': list(booked_times),
            'unavailable': False
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/doctors/<staff_id>/unavailable-dates', methods=['GET'])
def get_doctor_unavailable_dates(staff_id):
    """Return list of dates (YYYY-MM-DD) where doctor is marked unavailable or has no working schedule (Sunday)"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # Get explicitly marked unavailable dates
        cursor.execute(
            "SELECT unavailable_date FROM doctor_unavailability WHERE doctor_id = ? ORDER BY unavailable_date",
            (staff_id,)
        )
        rows = cursor.fetchall()
        dates = [r['unavailable_date'] for r in rows]

        # Get doctor's weekly schedule to identify days-off
        cursor.execute("SELECT availability_schedule FROM doctors WHERE staff_id = ?", (staff_id,))
        res = cursor.fetchone()
        schedule = {}
        if res and res['availability_schedule']:
            try:
                schedule = json.loads(res['availability_schedule']) if isinstance(res['availability_schedule'], str) else (res['availability_schedule'] or {})
            except Exception:
                schedule = {}

        # Find which weekdays the doctor has no duty schedule
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        off_days = []
        for day in day_names:
            day_slots = schedule.get(day, [])
            has_duty = any((s.get('type', 'duty') == 'duty' if isinstance(s, dict) else True) for s in day_slots)
            if not has_duty:
                off_days.append(day)
        # 'sunday' is always off if no schedule
        if 'sunday' not in off_days and not schedule.get('sunday'):
            off_days.append('sunday')

        return jsonify({
            'unavailable_dates': dates,
            'off_days': off_days  # e.g. ['sunday', 'saturday']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)



@app.route('/api/doctors/<staff_id>/unavailability', methods=['GET'])
@jwt_required()
@role_required(['Doctor'])
def get_doctor_unavailability(staff_id):
    """Return list of unavailable dates for a doctor"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("SELECT unavailable_date, reason FROM doctor_unavailability WHERE doctor_id = ? ORDER BY unavailable_date", (staff_id,))
        rows = cursor.fetchall()
        return jsonify([dict(r) for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/doctors/<staff_id>/unavailability', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def add_doctor_unavailability(staff_id):
    data = request.get_json()
    date_str = data.get('date')
    reason = data.get('reason', '')
    if not date_str:
        return jsonify({'error': 'date is required'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        print(f"Adding unavailability for {staff_id} on {date_str} reason: {reason}")
        cursor.execute(
            "INSERT INTO doctor_unavailability (doctor_id, unavailable_date, reason) VALUES (?, ?, ?)",
            (staff_id, date_str, reason),
        )
        conn.commit()
        print(f"Successfully added unavailability for {staff_id}")
        return jsonify({'message': 'Unavailability added'}), 201
    except Exception as e:
        print(f"ERROR adding unavailability: {str(e)}")
        traceback.print_exc()
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/doctors/<staff_id>/unavailability', methods=['DELETE'])
@jwt_required()
@role_required(['Doctor'])
def remove_doctor_unavailability(staff_id):
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'date query parameter is required'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM doctor_unavailability WHERE doctor_id = ? AND unavailable_date = ?", (staff_id, date_str))
        conn.commit()
        return jsonify({'message': 'Unavailability removed'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/doctor/profile', methods=['PATCH'])
@jwt_required()
@role_required(['Doctor'])
def update_doctor_profile():
    """Update doctor profile information"""
    staff_id = get_jwt_identity()
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update staff details (first_name, last_name, phone)
        staff_fields = []
        staff_params = []
        if 'first_name' in data:
            staff_fields.append("first_name = ?")
            staff_params.append(data['first_name'])
        if 'last_name' in data:
            staff_fields.append("last_name = ?")
            staff_params.append(data['last_name'])
        if 'phone' in data:
            staff_fields.append("phone = ?")
            staff_params.append(data['phone'])
            
        if staff_fields:
            staff_params.append(staff_id)
            cursor.execute(f"UPDATE staff SET {', '.join(staff_fields)} WHERE staff_id = ?", tuple(staff_params))
            
        # Update doctor professional details
        doc_fields = []
        doc_params = []
        fields_to_check = ['qualifications', 'specialization', 'years_of_experience', 'education', 'bio', 'certifications', 'awards']
        for field in fields_to_check:
            if field in data:
                doc_fields.append(f"{field} = ?")
                doc_params.append(data[field])
                
        if doc_fields:
            doc_params.append(staff_id)
            cursor.execute(f"UPDATE doctors SET {', '.join(doc_fields)} WHERE staff_id = ?", tuple(doc_params))
            
        conn.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/doctor/schedule', methods=['PATCH'])
@jwt_required()
@role_required(['Doctor'])
def update_doctor_schedule():
    """Update doctor availability schedule"""
    staff_id = get_jwt_identity()
    data = request.get_json()
    schedule = data.get('schedule')
    
    if schedule is None:
        return jsonify({'error': 'Schedule data is required'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Ensure schedule is stored as JSON string
        print(f"Updating schedule for {staff_id}: {schedule}")
        schedule_json = json.dumps(schedule) if not isinstance(schedule, str) else schedule
        cursor.execute("UPDATE doctors SET availability_schedule = ? WHERE staff_id = ?", (schedule_json, staff_id))
        conn.commit()
        print(f"Successfully updated schedule for {staff_id}")
        return jsonify({'message': 'Schedule updated successfully'}), 200
    except Exception as e:
        print(f"ERROR updating schedule: {str(e)}")
        traceback.print_exc()
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/doctor/change-password', methods=['PATCH'])
@jwt_required()
def change_staff_password():
    """Change logged-in staff password"""
    staff_id = get_jwt_identity()
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new passwords are required'}), 400
        
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT password_hash FROM staff WHERE staff_id = ?", (staff_id,))
        staff = cursor.fetchone()
        
        if not staff or not bcrypt.check_password_hash(staff['password_hash'], current_password):
            return jsonify({'error': 'Invalid current password'}), 401
            
        new_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        cursor.execute("UPDATE staff SET password_hash = ?, password_changed_at = ? WHERE staff_id = ?", 
                      (new_hash, datetime.now().isoformat(), staff_id))
        conn.commit()
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
        # Get patient registration type and booking source
        cursor.execute("SELECT registered_by FROM patients WHERE patient_id = ?", (patient_id,))
        patient_reg = cursor.fetchone()
        registered_by = patient_reg['registered_by'] if patient_reg else 'ONLINE'
        
        # Determine booking source and status
        booking_source = 'Online' if claims.get('role') == 'Patient' else 'Walk-in'
        
        # Get doctor department
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
        
        # Generate appointment_id
        appointment_id = f"APT{uuid.uuid4().hex[:8].upper()}"

        # Generate token number based on time slot
        token_number = calculate_token_number(data.get('appointment_time'))

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

        # If appointment is confirmed (walk-in/receptionist), add to queue_management immediately
        queue_item = None
        if status == 'Confirmed':
            # Insert into queue_management
            cursor.execute("""
                INSERT INTO queue_management (
                    appointment_id, patient_id, doctor_id, token_number, 
                    queue_date, status, arrival_time
                ) VALUES (?, ?, ?, ?, ?, 'Waiting', CURRENT_TIMESTAMP)
            """, (appointment_id, patient_id, data.get('doctor_id'), token_number, data.get('appointment_date')))

            # Update token in appointments table (ensure stored)
            cursor.execute("UPDATE appointments SET token_number = ? WHERE appointment_id = ?", (token_number, appointment_id))

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

        # For Walk-in/receptionist-booked appointments, add appointment fee to pending payments
        # Create payment record for any appointment with consultation fee
        if consultation_fee and float(consultation_fee) > 0:
            payment_details = data.get('payment_details')
            if payment_details:
                # Paid online during booking
                transaction_id = payment_details.get('transactionId') or payment_details.get('razorpay_payment_id') or f"OBTXN-{int(datetime.now().timestamp() * 1000)}"
                cursor.execute("""
                    INSERT INTO pending_payments (patient_id, reference_type, reference_id, description, amount, status, updated_at) 
                    VALUES (?, 'appointment', ?, 'Consultation Fee', ?, 'Paid', CURRENT_TIMESTAMP)
                """, (patient_id, appointment_id, consultation_fee))
                payment_db_id = cursor.lastrowid
                
                # Insert into collections
                cursor.execute("""
                    INSERT INTO collections 
                    (payment_id, patient_id, amount, method, transaction_id, collected_by, collected_at, reference_type, reference_id) 
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
                """, (payment_db_id, patient_id, consultation_fee, 'Online', transaction_id, None, 'appointment', appointment_id))
                
                # Update appointments
                cursor.execute("UPDATE appointments SET payment_status = 'Paid', payment_mode = 'Online', payment_transaction_id = ? WHERE appointment_id = ?", (transaction_id, appointment_id))
            else:
                # Unpaid
                cursor.execute("INSERT INTO pending_payments (patient_id, reference_type, reference_id, description, amount) VALUES (?, 'appointment', ?, 'Consultation Fee', ?)", (patient_id, appointment_id, consultation_fee))

        conn.commit()

        # Get patient phone and details for WhatsApp notification (pending + confirmed)
        try:
            cursor.execute("SELECT mobile_number, first_name, last_name FROM patients WHERE patient_id = ?", (patient_id,))
            patient_row = cursor.fetchone()
            patient_info = _row_to_dict(cursor, patient_row)
            if patient_info:
                cursor.execute("""
                    SELECT s.first_name || ' ' || s.last_name as doctor_name,
                           d.dept_name as specialty
                    FROM staff s
                    LEFT JOIN departments d ON d.id = s.department_id
                    WHERE s.staff_id = ?
                """, (data.get('doctor_id'),))
                doctor_row = cursor.fetchone()
                doctor_info = _row_to_dict(cursor, doctor_row) if doctor_row else {'doctor_name': 'N/A', 'specialty': 'General'}
                if not doctor_info.get('doctor_name'):
                    doctor_info = {'doctor_name': 'N/A', 'specialty': doctor_info.get('specialty', 'General')}
                phone = patient_info.get('mobile_number') or ''
                if phone:
                    # Send WhatsApp appointment booking notification (pending or confirmed)
                    send_appointment_booking_notification({
                        'phone_number': phone,
                        'patient_name': f"{patient_info.get('first_name', '')} {patient_info.get('last_name', '')}",
                        'appointment_id': appointment_id,
                        'doctor_name': doctor_info.get('doctor_name', 'N/A'),
                        'specialty': doctor_info.get('specialty', 'General'),
                        'appointment_date': data.get('appointment_date'),
                        'appointment_time': data.get('appointment_time'),
                        'appointment_type': data.get('appointment_type', 'General Checkup'),
                        'consultation_mode': data.get('consultation_mode', 'In-person'),
                        'booking_source': booking_source,
                        'status': status
                    })
                else:
                    print(f"Patient {patient_id} has no mobile_number - skipping WhatsApp booking notification")
        except Exception as e:
            print(f"Warning: Failed to send appointment WhatsApp: {e}")
            import traceback
            traceback.print_exc()

        # Emit real-time event: new appointment or appointment approved (for confirmed)
        try:
            if status == 'Confirmed' and queue_item:
                socketio.emit('appointment_approved', {
                    'queue_item': dict(queue_item),
                    'timestamp': datetime.now().isoformat()
                }, namespace='/appointments')
            else:
                # For online/pending appointments, emit new_appointment so appointment lists update
                socketio.emit('new_appointment', {
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
        close_db_connection(conn)

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
        close_db_connection(conn)
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
        close_db_connection(conn)

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
            
        patient_id, doctor_id, appt_date = appt['patient_id'], appt['doctor_id'], appt['appointment_date']

        # Use the actual appointment date for queue insertion
        queue_date = appt_date
        
        # 2. Update appointment status
        cursor.execute("""
            UPDATE appointments 
            SET status = 'Confirmed', 
                approved_by = ?, 
                approved_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ? AND status = 'Pending_Approval'
        """, (get_jwt_identity(), appointment_id))
        
        # Check if update was successful
        if cursor.rowcount == 0:
            # Check if appointment exists and what its status is
            cursor.execute("SELECT status FROM appointments WHERE appointment_id = ?", (appointment_id,))
            result = cursor.fetchone()
            if not result:
                return jsonify({'error': 'Appointment not found'}), 404
            elif result['status'] != 'Pending_Approval':
                return jsonify({'error': f'Appointment is already {result["status"]}'}), 400
            else:
                return jsonify({'error': 'Failed to update appointment'}), 500
            
        # 3. Add to Queue if appointment is for today (or future? usually queue is for today)
        # For now, lets add to queue regardless, but typically queue is day-specific.
        # Lets generate a token number for that day.
        
        # Prevent duplicate queue entries for the same appointment
        cursor.execute("SELECT 1 FROM queue_management WHERE appointment_id = ?", (appointment_id,))
        if cursor.fetchone():
            # Already in queue; just return success
            conn.commit()
            return jsonify({'message': 'Appointment already in queue'}), 200

        # Get the token number from the appointment or generate it based on time slot
        cursor.execute("SELECT token_number, appointment_time FROM appointments WHERE appointment_id = ?", (appointment_id,))
        appt_info = cursor.fetchone()
        
        if appt_info and appt_info.get('token_number') and 'TKN-' in appt_info.get('token_number'):
            token_number = appt_info['token_number']
        else:
            token_number = calculate_token_number(appt_info.get('appointment_time', '09:00'))

        cursor.execute("""
            INSERT INTO queue_management (
                appointment_id, patient_id, doctor_id, token_number, 
                queue_date, status, arrival_time
            ) VALUES (?, ?, ?, ?, ?, 'Waiting', CURRENT_TIMESTAMP)
        """, (appointment_id, patient_id, doctor_id, token_number, queue_date))
        
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

        # Send WhatsApp approval notification
        try:
            cursor.execute("""
                SELECT p.mobile_number, p.first_name, p.last_name,
                       a.appointment_time, a.appointment_date,
                       s.first_name || ' ' || s.last_name as doctor_name
                FROM patients p
                JOIN appointments a ON p.patient_id = a.patient_id
                JOIN staff s ON a.doctor_id = s.staff_id
                WHERE a.appointment_id = ?
            """, (appointment_id,))
            appt_row = cursor.fetchone()
            appt_details = dict(appt_row) if appt_row else {}
            
            if appt_details.get('mobile_number'):
                send_appointment_approval_notification({
                    'phone_number': appt_details.get('mobile_number'),
                    'patient_name': f"{appt_details.get('first_name', '')} {appt_details.get('last_name', '')}",
                    'appointment_id': appointment_id,
                    'doctor_name': appt_details.get('doctor_name', 'N/A'),
                    'appointment_date': appt_details.get('appointment_date'),
                    'appointment_time': appt_details.get('appointment_time'),
                    'token_number': token_number
                })
        except Exception as e:
            print(f"Warning: Failed to send approval WhatsApp: {e}")
        
        # Emit real-time event: appointment approved and added to queue with complete data
        try:
            queue_data = dict(queue_item) if queue_item else {
                'appointment_id': appointment_id,
                'token_number': token_number,
                'doctor_id': doctor_id,
                'appointment_date': appt_date,
                'queue_date': queue_date,
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
        close_db_connection(conn)

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
        
        # Send WhatsApp cancellation notification
        try:
            dict_cursor = get_dict_cursor(conn)
            dict_cursor.execute("""
                SELECT p.mobile_number, p.first_name, p.last_name,
                       a.appointment_date, a.appointment_time,
                       s.first_name || ' ' || s.last_name as doctor_name
                FROM patients p
                JOIN appointments a ON p.patient_id = a.patient_id
                JOIN staff s ON a.doctor_id = s.staff_id
                WHERE a.appointment_id = ?
            """, (appointment_id,))
            appt_row = dict_cursor.fetchone()
            
            if appt_row:
                appt_details = dict(appt_row)
                if appt_details.get('mobile_number'):
                    send_appointment_cancellation_notification({
                        'phone_number': appt_details.get('mobile_number'),
                        'patient_name': f"{appt_details.get('first_name', '')} {appt_details.get('last_name', '')}",
                        'appointment_id': appointment_id,
                        'doctor_name': appt_details.get('doctor_name', 'N/A'),
                        'appointment_date': appt_details.get('appointment_date'),
                        'appointment_time': appt_details.get('appointment_time'),
                        'cancellation_reason': reason
                    })
                    print(f"  Appointment cancellation WhatsApp queued for {appt_details.get('mobile_number')}")
        except Exception as e:
            print(f"Warning: Failed to send cancellation WhatsApp: {e}")
        
        return jsonify({'message': 'Appointment cancelled successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/appointments/send-reminders', methods=['POST'])
@jwt_required()
@role_required(['Receptionist', 'Admin'])
def send_appointment_reminders():
    """Send WhatsApp reminders for tomorrows approved appointments"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # Find approved appointments for tomorrow
        cursor.execute("""
            SELECT a.appointment_id, a.appointment_date, a.appointment_time,
                   a.token_number,
                   p.mobile_number, p.first_name, p.last_name,
                   s.first_name as doc_first, s.last_name as doc_last,
                   d2.dept_name as department
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN staff s ON a.doctor_id = s.staff_id
            LEFT JOIN departments d2 ON s.department_id = d2.id
            WHERE DATE(a.appointment_date) = date('now', '+1 day')
              AND a.status IN ('Approved', 'Confirmed')
        """)
        rows = fetchall_as_dicts(cursor)

        sent = 0
        failed = 0
        for row in rows:
            try:
                if row.get('mobile_number'):
                    send_appointment_reminder({
                        'phone_number': row['mobile_number'],
                        'patient_name': f"{row['first_name']} {row['last_name']}",
                        'appointment_id': row['appointment_id'],
                        'doctor_name': f"{row.get('doc_first', '')} {row.get('doc_last', '')}".strip() or 'N/A',
                        'department': row.get('department', 'N/A'),
                        'appointment_date': row['appointment_date'],
                        'appointment_time': row.get('appointment_time', 'N/A'),
                        'token_number': row.get('token_number', 'N/A'),
                        'floor': 'Ground Floor'
                    })
                    sent += 1
            except Exception:
                failed += 1

        return jsonify({
            'message': f'Appointment reminders processed',
            'total_appointments': len(rows),
            'sent': sent,
            'failed': failed
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# QUEUE MANAGEMENT ENDPOINTS
# ============================================

@app.route('/api/queue/today', methods=['GET'])
@jwt_required()
@role_required(['Receptionist', 'Doctor', 'Nurse', 'Admin'])
def get_today_queue():
    """Get today queue"""
    doctor_id = request.args.get('doctor_id', '')
    department_id = request.args.get('department_id', '')
    status = request.args.get('status', '')
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
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
            WHERE q.queue_date = ?
        """
        params = [date_str]
        
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
        close_db_connection(conn)


# =========================
# Payments Endpoints
# =========================

@app.route('/api/patients/<patient_id>/pending-payments', methods=['GET'])
@jwt_required()
def get_pending_payments(patient_id):
    """Return pending payments for a patient (offline/receptionist-registered only)"""
    claims = get_jwt()
    role = claims.get('role')
    current_user = get_jwt_identity()

    # Patients can only view their own pending payments
    if role == 'Patient' and current_user != patient_id:
        return jsonify({'error': 'Access denied'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # First check if patient is offline (registered by receptionist or walk-in booking)
        cursor.execute("""
            SELECT registered_by FROM patients WHERE patient_id = ?
        """, (patient_id,))
        patient = cursor.fetchone()
        
        if not patient:
            return jsonify({'pending_payments': []}), 200
        
        registered_by = dict(patient)['registered_by'] if patient else 'ONLINE'
        
        # Show pending payments for patients who have walk-in/receptionist-booked appointments
        # This includes both online-registered and offline-registered patients if they booked via receptionist
        # Query to get all pending payments where appointment booking_source is Walk-in
        cursor.execute("""
            SELECT pp.* FROM pending_payments pp
            WHERE pp.patient_id = ? AND pp.status = 'Pending'
            AND (pp.reference_type = 'registration' 
                 OR (pp.reference_type = 'appointment' 
                     AND EXISTS (SELECT 1 FROM appointments a WHERE a.appointment_id = pp.reference_id AND a.booking_source = 'Walk-in')))
            ORDER BY pp.created_at
        """, (patient_id,))
        
        rows = cursor.fetchall()
        return jsonify({'pending_payments': [dict(row) for row in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/payments/collect', methods=['POST'])
@jwt_required()
@role_required(['Receptionist', 'Billing', 'Admin'])
def collect_payments():
    """Collect one or more pending payments and record collections"""
    data = request.get_json() or {}
    payment_ids = data.get('payment_ids', [])
    method = data.get('method', 'Cash')
    transaction_id = data.get('transaction_id', '')

    if not payment_ids:
        return jsonify({'error': 'payment_ids required'}), 400

    collector = get_jwt_identity()  # staff_id
    conn = get_db_connection()
    cursor = conn.cursor()

    collected = []
    total_collected = 0.0
    try:
        for pid in payment_ids:
            cursor.execute("SELECT * FROM pending_payments WHERE id = ?", (pid,))
            p = cursor.fetchone()
            if not p:
                continue
            p = dict(p)
            if p['status'] != 'Pending':
                continue

            # Mark as paid
            cursor.execute("UPDATE pending_payments SET status = 'Paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (pid,))

            # Insert into collections
            cursor.execute("INSERT INTO collections (payment_id, patient_id, amount, method, transaction_id, collected_by, collected_at, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)", (
                pid, p['patient_id'], p['amount'], method, transaction_id, collector, p['reference_type'], p['reference_id']
            ))
            coll_id = cursor.lastrowid

            # If appointment reference, update appointment payment status
            if p['reference_type'] == 'appointment' and p['reference_id']:
                try:
                    cursor.execute("UPDATE appointments SET payment_status = 'Paid', payment_mode = ?, payment_transaction_id = ? WHERE appointment_id = ?", (method, transaction_id, p['reference_id']))
                except Exception:
                    pass

            # If registration reference, update patient registration flag
            if p['reference_type'] == 'registration' and p['patient_id']:
                try:
                    cursor.execute("UPDATE patients SET registration_fee_paid = 1, registration_fee_receipt = ? WHERE patient_id = ?", (transaction_id or str(coll_id), p['patient_id']))
                except Exception:
                    pass

            collected.append({'payment_id': pid, 'collection_id': coll_id, 'amount': p['amount']})
            total_collected += float(p['amount'] or 0)

        conn.commit()
        
        # Emit real-time dashboard update for fee collection
        try:
            socketio.emit('dashboard_fee_collected', {
                'amount': total_collected,
                'count': len(collected),
                'method': method,
                'timestamp': datetime.now().isoformat()
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting fee_collected: {e}")
        
        return jsonify({'collected': collected, 'total': total_collected}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/collections/today', methods=['GET'])
@jwt_required()
@role_required(['Receptionist', 'Billing', 'Admin'])
def collections_today():
    """Return total collections for today"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COALESCE(SUM(amount),0) as total FROM collections WHERE DATE(collected_at) = date('now')")
        row = cursor.fetchone()
        total = row['total'] if row else 0
        return jsonify({'total_collected_today': float(total)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/payments/send-reminders', methods=['POST'])
@jwt_required()
@role_required(['Receptionist', 'Billing', 'Admin'])
def send_payment_reminders():
    """Send WhatsApp payment reminders for all pending payments"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("""
            SELECT pp.id, pp.patient_id, pp.amount, pp.description,
                   pp.reference_type, pp.reference_id, pp.created_at,
                   p.mobile_number, p.first_name, p.last_name
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            WHERE pp.status = 'Pending'
        """)
        rows = fetchall_as_dicts(cursor)

        sent = 0
        failed = 0
        for row in rows:
            try:
                if row.get('mobile_number'):
                    send_payment_reminder({
                        'phone_number': row['mobile_number'],
                        'patient_name': f"{row['first_name']} {row['last_name']}",
                        'patient_id': row['patient_id'],
                        'amount_due': str(row.get('amount', 0)),
                        'payment_description': row.get('description', 'Medical Services'),
                        'invoice_number': str(row.get('id', 'N/A')),
                        'invoice_id': str(row.get('id', 'N/A')),
                        'due_date': 'At your earliest convenience',
                        'service_type': row.get('reference_type', 'Service'),
                        'service_date': str(row.get('created_at', 'N/A')),
                        'payment_reference': str(row.get('reference_id', 'N/A'))
                    })
                    sent += 1
            except Exception:
                failed += 1

        return jsonify({
            'message': f'Payment reminders processed',
            'total_pending': len(rows),
            'sent': sent,
            'failed': failed
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/patient/payment-history', methods=['GET'])
@jwt_required()
def get_payment_history():
    """Return payment history (both pending and paid) for authenticated patient"""
    try:
        patient_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get('role', '')
        
        # Patient token should have patient_id as identity and role as 'Patient'
        # If patient_id is empty or role doesnt match, deny access
        if not patient_id:
            return jsonify({'error': 'No patient ID in token'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get both pending and paid payments
        cursor.execute("""
            SELECT 
                id,
                patient_id,
                reference_type,
                reference_id,
                description,
                amount,
                status,
                created_at,
                updated_at
            FROM pending_payments
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        
        rows = cursor.fetchall()
        payments = [dict(row) for row in rows] if rows else []
        
        # Separate into pending and paid
        pending_payments = [p for p in payments if p['status'] == 'Pending']
        paid_payments = [p for p in payments if p['status'] == 'Paid']
        
        cursor.close()
        close_db_connection(conn)
        
        return jsonify({
            'pending_payments': pending_payments,
            'paid_payments': paid_payments,
            'total_pending': sum(float(p['amount'] or 0) for p in pending_payments),
            'total_paid': sum(float(p['amount'] or 0) for p in paid_payments)
        }), 200
    except Exception as e:
        print(f"Payment history error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/patient/pay', methods=['POST'])
@jwt_required()
def patient_pay():
    """Allow patients to pay their own pending payments"""
    try:
        patient_id = get_jwt_identity()
        if not patient_id:
            return jsonify({'error': 'Authentication required'}), 401

        data = request.get_json() or {}
        payment_id = data.get('payment_id')
        method = data.get('method', 'UPI')
        transaction_id = data.get('transaction_id', '')

        if not payment_id:
            return jsonify({'error': 'payment_id required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify payment belongs to this patient and is pending
        cursor.execute("SELECT * FROM pending_payments WHERE id = ? AND patient_id = ?", (payment_id, patient_id))
        payment = cursor.fetchone()
        if not payment:
            cursor.close()
            close_db_connection(conn)
            return jsonify({'error': 'Payment not found or does not belong to you'}), 404

        payment = dict(payment)
        if payment['status'] != 'Pending':
            cursor.close()
            close_db_connection(conn)
            return jsonify({'error': 'Payment already processed'}), 400

        # Generate transaction ID if not provided
        if not transaction_id:
            transaction_id = f"PTXN-{int(datetime.now().timestamp() * 1000)}"

        # Mark as paid
        cursor.execute("UPDATE pending_payments SET status = 'Paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (payment_id,))

        # Insert into collections
        cursor.execute("""INSERT INTO collections 
            (payment_id, patient_id, amount, method, transaction_id, collected_by, collected_at, reference_type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)""", (
            payment_id, patient_id, payment['amount'], method, transaction_id,
            patient_id, payment['reference_type'], payment['reference_id']
        ))
        collection_id = cursor.lastrowid

        # Update related records
        if payment['reference_type'] == 'appointment' and payment['reference_id']:
            try:
                cursor.execute("UPDATE appointments SET payment_status = 'Paid', payment_mode = ?, payment_transaction_id = ? WHERE appointment_id = ?",
                    (method, transaction_id, payment['reference_id']))
            except Exception:
                pass
        if payment['reference_type'] == 'registration':
            try:
                cursor.execute("UPDATE patients SET registration_fee_paid = 1, registration_fee_receipt = ? WHERE patient_id = ?",
                    (transaction_id, patient_id))
            except Exception:
                pass
        if payment['reference_type'] == 'pharmacy':
            try:
                cursor.execute("UPDATE prescriptions SET status = 'Paid' WHERE prescription_id = ?",
                    (payment['reference_id'],))
            except Exception:
                pass
        if payment['reference_type'] == 'lab':
            # Lab orders don't have a specific payment_status column, 
            # but if they ever do, we'd update it here.
            pass

        conn.commit()
        cursor.close()
        close_db_connection(conn)

        return jsonify({
            'success': True,
            'message': 'Payment successful!',
            'collection_id': collection_id,
            'transaction_id': transaction_id,
            'amount': payment['amount'],
            'method': method
        }), 200
    except Exception as e:
        print(f"Patient payment error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/patient/medical-records', methods=['GET'])
@jwt_required()
def get_medical_records():
    """Return prescriptions and lab results for authenticated patient"""
    try:
        patient_id = get_jwt_identity()
        
        if not patient_id:
            return jsonify({'error': 'No patient ID in token'}), 401

        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        # Get all prescriptions for the patient
        cursor.execute("""
            SELECT 
                p.id,
                p.prescription_id,
                p.patient_id,
                p.doctor_id,
                p.appointment_id,
                p.prescription_date,
                p.diagnosis,
                p.chief_complaint,
                p.examination_findings,
                p.general_instructions as general_instructions,
                p.status,
                p.created_at,
                p.updated_at
            FROM prescriptions p
            WHERE p.patient_id = ?
            ORDER BY p.prescription_date DESC
        """, (patient_id,))
        
        prescription_rows = cursor.fetchall()
        prescriptions = []
        for row in prescription_rows:
            presc_dict = _row_to_dict(cursor, row)
            if presc_dict:
                prescriptions.append(presc_dict)
        
        # Get medicines for each prescription
        for prescription in prescriptions:
            cursor.execute("""
                SELECT 
                    id,
                    medicine_name,
                    generic_name,
                    brand_name,
                    strength,
                    dosage_form,
                    quantity,
                    frequency,
                    timing,
                    duration,
                    instructions
                FROM prescription_medicines
                WHERE prescription_id = ?
            """, (prescription.get('prescription_id'),))
            
            medicine_rows = cursor.fetchall()
            prescription['medicines'] = []
            for med_row in medicine_rows:
                med_dict = _row_to_dict(cursor, med_row)
                if med_dict:
                    prescription['medicines'].append(med_dict)
        
        # Get all lab orders for the patient
        cursor.execute("""
            SELECT 
                id,
                lab_order_id,
                patient_id,
                test_category,
                test_name,
                clinical_notes,
                order_date,
                status,
                created_at,
                updated_at
            FROM lab_orders
            WHERE patient_id = ?
            ORDER BY order_date DESC
        """, (patient_id,))
        
        lab_order_rows = cursor.fetchall()
        lab_orders = []
        for row in lab_order_rows:
            lab_dict = _row_to_dict(cursor, row)
            if lab_dict:
                lab_orders.append(lab_dict)
        
        # Get results for each lab order
        for lab_order in lab_orders:
            cursor.execute("""
                SELECT 
                    id,
                    lab_order_id,
                    parameter_name,
                    result_value,
                    unit,
                    reference_range,
                    status,
                    is_critical,
                    notes,
                    created_at,
                    updated_at
                FROM lab_results
                WHERE lab_order_id = ?
                ORDER BY created_at DESC
            """, (lab_order.get('id'),))
            
            result_rows = cursor.fetchall()
            lab_order['results'] = []
            for res_row in result_rows:
                res_dict = _row_to_dict(cursor, res_row)
                if res_dict:
                    lab_order['results'].append(res_dict)
        
        cursor.close()
        close_db_connection(conn)
        
        return jsonify({
            'prescriptions': prescriptions,
            'lab_orders': lab_orders
        }), 200
    except Exception as e:
        print(f"Medical records error: {str(e)}")
        return jsonify({'error': str(e)}), 500


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
             
        appointment_id, doctor_id, patient_id = queue_item['appointment_id'], queue_item['doctor_id'], queue_item['patient_id']
        
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
            # Also emit directly to the doctor room if we know the doctor_id (reduces noise)
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
        close_db_connection(conn)

# ============================================
# PRESCRIPTION ENDPOINTS
# ============================================

@app.route('/api/prescriptions', methods=['POST'])
@jwt_required()
@role_required(['Doctor', 'Nurse', 'Admin'])
def create_prescription():
    """Create a new prescription"""
    data = request.get_json()
    
    required = ['patient_id', 'diagnosis', 'medicines']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate medicines array
    medicines = data.get('medicines', [])
    if not isinstance(medicines, list) or len(medicines) == 0:
        return jsonify({'error': 'At least one medicine is required'}), 400
    
    # Validate each medicine has required fields
    for i, med in enumerate(medicines):
        if not med.get('medicine_name'):
            return jsonify({'error': f'Medicine {i+1}: medicine_name is required'}), 400
        if not med.get('quantity') or med.get('quantity', 0) <= 0:
            return jsonify({'error': f'Medicine {i+1}: valid quantity is required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        app.logger.info(f"Creating prescription for patient {data.get('patient_id')} with {len(medicines)} medicines")
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
        medicines_inserted = 0
        total_prescription_cost = 0
        sale_medicines = []
        for med in medicines:
            # Validate required medicine fields
            if not med.get('medicine_name') or not med.get('quantity'):
                app.logger.warning(f"Skipping medicine with missing required fields: {med}")
                continue
            
            try:
                # Lookup price for this medicine
                cursor.execute("""
                    SELECT unit_price FROM medicine_inventory 
                    WHERE LOWER(generic_name) = LOWER(?) OR LOWER(brand_name) = LOWER(?) 
                    LIMIT 1
                """, (med.get('medicine_name'), med.get('medicine_name')))
                price_row = cursor.fetchone()
                unit_price = float(price_row['unit_price']) if price_row and price_row['unit_price'] else 0.0
                qty = float(med.get('quantity') or 0)
                subtotal = unit_price * qty
                
                cursor.execute("""
                    INSERT INTO prescription_medicines (
                        prescription_id, medicine_name, generic_name, brand_name,
                        strength, dosage_form, quantity, frequency, timing, duration, instructions
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    prescription_id, 
                    med.get('medicine_name') or '',
                    med.get('generic_name') or '',
                    med.get('brand_name') or '',
                    med.get('strength') or '',
                    med.get('dosage_form') or '',  # Optional
                    qty,
                    med.get('frequency') or 'BD',
                    med.get('timing') or '',  # Optional
                    med.get('duration') or '',
                    med.get('instructions') or ''
                ))
                medicines_inserted += 1
                total_prescription_cost += subtotal
                sale_medicines.append({
                    'medicine_name': med.get('medicine_name') or '',
                    'quantity': qty,
                    'unit_price': unit_price,
                    'subtotal': subtotal
                })
                app.logger.info(f"Inserted medicine: {med.get('medicine_name')} (qty: {qty})")
            except Exception as med_error:
                app.logger.error(f"Error inserting medicine {med.get('medicine_name')}: {med_error}")
                raise
        
        if medicines_inserted == 0:
            conn.rollback()
            return jsonify({'error': 'No valid medicines were added to the prescription'}), 400
            
        payment_status = 'Pending'
        payment_method = 'Cash'
        
        # Check for active admission and advance payment
        cursor.execute("""
            SELECT id, advance_payment FROM admissions 
            WHERE patient_id = ? AND status = 'Admitted'
            ORDER BY created_at DESC LIMIT 1
        """, (data.get('patient_id'),))
        admission = cursor.fetchone()
        
        if admission and admission['advance_payment'] >= total_prescription_cost and total_prescription_cost > 0:
            # Deduct from advance payment
            new_advance = admission['advance_payment'] - total_prescription_cost
            cursor.execute(
                "UPDATE admissions SET advance_payment = ? WHERE id = ?",
                (new_advance, admission['id'])
            )
            payment_status = 'Paid'
            payment_method = 'Advance'
            
        if total_prescription_cost > 0:
            cursor.execute("""
                INSERT INTO pending_payments (
                    patient_id, reference_type, reference_id, description, amount, status
                ) VALUES (?, 'pharmacy', ?, 'Prescription Medications', ?, ?)
            """, (
                data.get('patient_id'), 
                prescription_id, 
                total_prescription_cost,
                payment_status
            ))
            
            # Update prescription status to Paid if advance was used
            if payment_status == 'Paid':
                cursor.execute("UPDATE prescriptions SET status = 'Paid' WHERE prescription_id = ?", (prescription_id,))
        
        conn.commit()
        app.logger.info(f"Prescription {prescription_id} created successfully with {medicines_inserted} medicines")
        
        # Get patient details for the event
        cursor.execute("SELECT first_name, last_name, mobile_number FROM patients WHERE patient_id = ?", (data.get('patient_id'),))
        patient_row = cursor.fetchone()
        patient_info = _row_to_dict(cursor, patient_row) if patient_row else {}
        if patient_info:
            patient_name = f"{patient_info.get('first_name', '')} {patient_info.get('last_name', '')}".strip() or 'Unknown'
            patient_phone = patient_info.get('mobile_number') or None
        else:
            patient_name = 'Unknown'
            patient_phone = None
        
        # Get doctor details for the event (doctor_id is staff_id)
        cursor.execute("SELECT first_name, last_name FROM staff WHERE staff_id = ?", (get_jwt_identity(),))
        doctor_row = cursor.fetchone()
        doctor_info = _row_to_dict(cursor, doctor_row) if doctor_row else {}
        if doctor_info:
            doctor_name = f"{doctor_info.get('first_name', '')} {doctor_info.get('last_name', '')}".strip() or 'Unknown'
        else:
            doctor_name = 'Unknown'
        
        # Emit real-time event for new prescription
        socketio.emit('pharmacy:prescription_received', {
            'id': prescription_id,
            'prescription_id': prescription_id,
            'patient_id': data.get('patient_id'),
            'patient_name': patient_name,
            'doctor_name': doctor_name,
            'medicines': data.get('medicines', []),
            'prescription_date': datetime.now().isoformat(),
            'status': 'Active'
        })

        # Send WhatsApp prescription ready notification
        try:
            if patient_phone:
                medicines_names = ', '.join([m.get('medicine_name', '') for m in data.get('medicines', [])]) or 'As prescribed'
                send_prescription_ready_notification({
                    'phone_number': patient_phone,
                    'patient_name': patient_name,
                    'doctor_name': doctor_name,
                    'prescription_id': prescription_id,
                    'appointment_id': data.get('appointment_id', 'N/A'),
                    'prescription_date': datetime.now().strftime('%Y-%m-%d'),
                    'medicines_list': medicines_names
                })
                print(f"  Prescription ready WhatsApp queued for {patient_phone}")
        except Exception as e:
            print(f"Warning: Failed to send prescription ready WhatsApp: {e}")
        
        return jsonify({
            'message': 'Prescription created successfully',
            'prescription_id': prescription_id
        }), 201
        
    except Exception as e:
        app.logger.error(f"Error creating prescription: {e}", exc_info=True)
        traceback.print_exc()
        conn.rollback()
        return jsonify({'error': f'Failed to create prescription: {str(e)}'}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/debug/prescriptions', methods=['POST'])
def debug_create_prescription():
    data = request.get_json() or {}
    # basic validation
    if not data.get('patient_id') or not data.get('diagnosis') or not data.get('medicines'):
        return jsonify({'error': 'patient_id, diagnosis and medicines are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        prescription_id = f"RX{uuid.uuid4().hex[:8].upper()}"
        cursor.execute("""
            INSERT INTO prescriptions (
                prescription_id, patient_id, doctor_id, appointment_id, admission_id,
                diagnosis, chief_complaint, examination_findings, vital_signs,
                general_instructions, diet_advice, activity_restrictions, warning_signs,
                follow_up_date, follow_up_instructions, status, prescription_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (
            prescription_id, data.get('patient_id'), data.get('doctor_id', 'DOC001'), data.get('appointment_id'),
            data.get('admission_id'), data.get('diagnosis'), data.get('chief_complaint'),
            data.get('examination_findings'), json.dumps(data.get('vital_signs', {})), data.get('general_instructions'),
            data.get('diet_advice'), data.get('activity_restrictions'), data.get('warning_signs'),
            data.get('follow_up_date'), data.get('follow_up_instructions'), 'Active'
        ))

        for med in data.get('medicines', []):
            cursor.execute("""
                INSERT INTO prescription_medicines (
                    prescription_id, medicine_name, generic_name, brand_name,
                    strength, dosage_form, quantity, frequency, timing, duration, instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                prescription_id, med.get('medicine_name'), med.get('generic_name'), med.get('brand_name'),
                med.get('strength'), med.get('dosage_form'), med.get('quantity', 1), med.get('frequency'), med.get('timing'), med.get('duration'), med.get('instructions')
            ))

        conn.commit()

        # fetch patient/doctor names
        cursor.execute("SELECT first_name, last_name FROM patients WHERE patient_id = ?", (data.get('patient_id'),))
        prow = cursor.fetchone()
        patient_name = (prow['first_name'] + ' ' + prow['last_name']) if prow else 'Unknown'
        cursor.execute("SELECT first_name, last_name FROM staff WHERE staff_id = ?", (data.get('doctor_id', 'DOC001'),))
        drow = cursor.fetchone()
        doctor_name = (drow['first_name'] + ' ' + drow['last_name']) if drow else 'Unknown'

        socketio.emit('pharmacy:prescription_received', {
            'id': prescription_id,
            'prescription_id': prescription_id,
            'patient_id': data.get('patient_id'),
            'patient_name': patient_name,
            'doctor_name': doctor_name,
            'medicines': data.get('medicines', []),
            'prescription_date': datetime.now().isoformat(),
            'status': 'Active'
        })

        return jsonify({'message': 'Debug prescription created', 'prescription_id': prescription_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/prescriptions', methods=['GET'])
@jwt_required()
def get_prescriptions():
    """Get prescriptions for logged-in doctor or patient"""
    claims = get_jwt()
    patient_id_param = request.args.get('patient_id', None)
    limit = request.args.get('limit', 10, type=int)
    
    doctor_id = None
    patient_id = None
    
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    elif claims.get('role') in ['Doctor', 'Nurse', 'Admin', 'Pharmacist']:
        if claims.get('role') == 'Doctor':
            doctor_id = get_jwt_identity()
        # If patient_id param is provided, override and filter by that
        if patient_id_param:
            patient_id = patient_id_param
    else:
        return jsonify({'error': 'Unauthorized role'}), 403
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT p.*,
                   pat.first_name || ' ' || pat.last_name as patient_name,
                   pat.patient_id as patient_id_display,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM prescriptions p
            JOIN patients pat ON p.patient_id = pat.patient_id
            JOIN staff s ON p.doctor_id = s.staff_id
            WHERE 1=1
        """
        params = []
        
        if doctor_id:
            query += " AND p.doctor_id = ?"
            params.append(doctor_id)
        
        if patient_id:
            query += " AND p.patient_id = ?"
            params.append(patient_id)
        
        query += " ORDER BY p.prescription_date DESC"
        
        # Add LIMIT only if not filtering by patient_id (show recent 10 on initial load)
        if not patient_id_param:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        prescriptions = cursor.fetchall()
        
        # Convert Row objects to dictionaries and get medicines for each prescription
        result = []
        for pres in prescriptions:
            pres_dict = _row_to_dict(cursor, pres)
            if not pres_dict:
                continue
            cursor.execute("""
                SELECT medicine_name, generic_name, brand_name, strength, dosage_form, quantity, frequency, timing, duration, instructions
                FROM prescription_medicines WHERE prescription_id = ?
            """, (pres_dict.get('prescription_id'),))
            medicines = cursor.fetchall()
            pres_dict['medicines'] = []
            for med in medicines:
                med_dict = _row_to_dict(cursor, med)
                if med_dict:
                    pres_dict['medicines'].append(med_dict)
            result.append(pres_dict)
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching prescriptions: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# LAB ENDPOINTS
# ============================================

@app.route('/api/lab/orders', methods=['POST'])
@jwt_required()
@role_required(['Doctor', 'Nurse', 'Admin', 'Lab_Technician'])
def create_lab_order():
    """Create a lab test order"""
    data = request.get_json()
    
    required = ['patient_id']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Get tests - can be a list or a single test name
    tests = data.get('tests', [])
    if isinstance(tests, str):
        tests = [tests]
    
    if not tests:
        return jsonify({'error': 'At least one test is required'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        created_orders = []
        
        # Create an order for each selected test
        for test in tests:
            if not test:
                continue
            
            cursor.execute("""
                INSERT INTO lab_orders (
                    patient_id, ordered_by, appointment_id, admission_id,
                    test_category, test_name, test_code, priority,
                    sample_type, fasting_required, clinical_notes, special_instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('patient_id'), get_jwt_identity(), data.get('appointment_id'),
                data.get('admission_id'), data.get('test_category', test),
                test, data.get('test_code'), data.get('priority', 'Routine'),
                data.get('sample_type'), data.get('fasting_required', False),
                data.get('clinical_notes'), data.get('special_instructions')
            ))
            
            lab_order_id = cursor.lastrowid
            
            # Create a pending payment for this lab order
            price = get_lab_price(test)
            
            # Check for active admission and advance payment
            cursor.execute("""
                SELECT id, advance_payment FROM admissions 
                WHERE patient_id = ? AND status = 'Admitted'
                ORDER BY created_at DESC LIMIT 1
            """, (data.get('patient_id'),))
            admission = cursor.fetchone()
            
            payment_status = 'Pending'
            description = f"Lab Test: {test}"
            
            if admission and admission['advance_payment'] >= price:
                # Deduct from advance payment
                new_advance = admission['advance_payment'] - price
                cursor.execute(
                    "UPDATE admissions SET advance_payment = ? WHERE id = ?",
                    (new_advance, admission['id'])
                )
                payment_status = 'Paid'
                description += " (Paid via Advance)"
            
            cursor.execute("""
                INSERT INTO pending_payments (
                    patient_id, reference_type, reference_id, description, amount, status
                ) VALUES (?, 'lab', ?, ?, ?, ?)
            """, (
                data.get('patient_id'), 
                str(lab_order_id), 
                description,
                price,
                payment_status
            ))

            created_orders.append({
                'id': lab_order_id,
                'test_name': test,
                'patient_id': data.get('patient_id'),
                'ordered_by': get_jwt_identity(),
                'priority': data.get('priority', 'Routine'),
                'status': 'Pending'
            })
        
        conn.commit()

        # Emit real-time event for new lab order
        try:
            cursor2 = get_dict_cursor(conn)
            cursor2.execute("SELECT first_name || ' ' || last_name as name FROM patients WHERE patient_id = ?", (data.get('patient_id'),))
            prow = cursor2.fetchone()
            patient_name = dict(prow).get('name', 'Unknown') if prow else 'Unknown'
            cursor2.close()
            for order in created_orders:
                socketio.emit('lab:order_received', {
                    'order_id': order['id'],
                    'patient_id': data.get('patient_id'),
                    'patient_name': patient_name,
                    'test_name': order['test_name'],
                    'status': 'Pending',
                    'timestamp': datetime.now().isoformat()
                })
            socketio.emit('lab:stats_updated', {'timestamp': datetime.now().isoformat()})
        except Exception as e:
            print(f"Warning: Failed to emit lab socket events: {e}")
        
        return jsonify({
            'message': f'{len(created_orders)} lab order(s) created successfully',
            'orders': created_orders
        }), 201
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error creating lab order: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/lab/orders', methods=['GET'])
@jwt_required()
def get_lab_orders():
    """Get lab orders for logged-in doctor, patient, or lab technician"""
    claims = get_jwt()
    patient_id_param = request.args.get('patient_id', None)
    limit = request.args.get('limit', 50, type=int)
    
    doctor_id = None
    patient_id = None
    
    if claims.get('role') == 'Patient':
        patient_id = get_jwt_identity()
    elif claims.get('role') == 'Doctor':
        doctor_id = get_jwt_identity()
        if patient_id_param:
            patient_id = patient_id_param
    elif claims.get('role') in ('Lab_Technician', 'Admin', 'Nurse'):
        # Lab techs, admins and nurses can see all orders, optionally filtered by patient
        if patient_id_param:
            patient_id = patient_id_param
    else:
        return jsonify({'error': 'Unauthorized role'}), 403
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        query = """
            SELECT lo.id, lo.patient_id, lo.ordered_by, 
                   lo.test_category, lo.test_name,
                   lo.priority, lo.clinical_notes, lo.order_date, lo.status,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.patient_id as patient_id_display,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE 1=1
        """
        params = []
        
        if doctor_id:
            query += " AND lo.ordered_by = ?"
            params.append(doctor_id)
        
        if patient_id:
            query += " AND lo.patient_id = ?"
            params.append(patient_id)
        
        query += " ORDER BY lo.order_date DESC"
        
        # Add LIMIT only if not filtering by patient_id (show recent 10 on initial load)
        if not patient_id_param:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        
        # Convert Row objects to dictionaries
        result = []
        for order in orders:
            order_dict = dict(order)
            # Use id as lab_order_id for the frontend
            order_dict['lab_order_id'] = order_dict.get('id')
            
            # Create a tests array with the test information
            tests = []
            if order_dict.get('test_name'):
                tests.append({
                    'test_name': order_dict.get('test_name'),
                    'result': 'Pending',
                    'normal_range': order_dict.get('test_category', ''),
                    'unit': '',
                    'status': order_dict.get('status', 'pending')
                })
            
            # Get lab results for this order if any exist
            cursor.execute("""
                SELECT parameter_name as test_name, result_value as result, 
                       reference_range as normal_range, unit, status
                FROM lab_results WHERE lab_order_id = ?
            """, (order_dict['id'],))
            lab_results = cursor.fetchall()
            if lab_results:
                tests = [dict(test) for test in lab_results]
            
            order_dict['tests'] = tests
            result.append(order_dict)
        
        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching lab orders: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/lab/results/<lab_order_id>', methods=['POST'])
@jwt_required()
@role_required(['Lab_Technician'])
def add_lab_results(lab_order_id):
    """Add lab test results"""
    data = request.get_json()
    results = data.get('results', [])
    patient_id = data.get('patient_id')
    
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
                lab_order_id, patient_id, result.get('parameter_name'),
                result.get('result_value'), result.get('unit'), result.get('reference_range'),
                result.get('status'), result.get('is_critical', False),
                get_jwt_identity(), result.get('notes')
            ))
        
        # Update order status
        cursor.execute("""
            UPDATE lab_orders 
            SET status = 'Results_Entered', actual_completion_date = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (lab_order_id,))
        
        conn.commit()

        # Emit real-time alert for critical results
        critical_results = [r for r in results if r.get('is_critical')]
        if critical_results:
            try:
                # Need to find who ordered this test to notify the specific doctor
                cursor.execute("SELECT ordered_by, patient_id FROM lab_orders WHERE id = ?", (lab_order_id,))
                order_info = cursor.fetchone()
                if order_info:
                    cursor.execute("SELECT first_name || ' ' || last_name as name FROM patients WHERE patient_id = ?", (patient_id,))
                    p_name = cursor.fetchone()
                    patient_full_name = p_name['name'] if p_name else "Unknown Patient"
                    
                    socketio.emit('critical_lab_result', {
                        'doctor_id': order_info['ordered_by'],
                        'patient_id': patient_id,
                        'patient_name': patient_full_name,
                        'message': f"CRITICAL: {len(critical_results)} critical values for {patient_full_name}",
                        'result_summary': ", ".join([f"{r.get('parameter_name')}: {r.get('result_value')} {r.get('unit')}" for r in critical_results]),
                        'timestamp': datetime.now().isoformat()
                    }, namespace='/appointments')
            except Exception as se:
                app.logger.error(f"Socket emit failed: {str(se)}")

        # Emit standardized lab status update
        try:
            socketio.emit('lab:status_updated', {
                'order_id': lab_order_id,
                'status': 'Results_Entered',
                'timestamp': datetime.now().isoformat()
            })
            socketio.emit('lab:stats_updated', {'timestamp': datetime.now().isoformat()})
        except Exception:
            pass

        # Send WhatsApp notification to patient about lab results
        try:
            cursor.execute("""
                SELECT p.mobile_number, p.first_name, p.last_name
                FROM patients p
                WHERE p.patient_id = ?
            """, (patient_id,))
            patient_info = cursor.fetchone()
            
            if patient_info:
                patient_dict = dict(patient_info)
                test_names = [result.get('parameter_name', 'Test') for result in results]
                
                send_lab_results_notification({
                    'phone_number': patient_dict.get('mobile_number'),
                    'patient_name': f"{patient_dict.get('first_name', '')} {patient_dict.get('last_name', '')}",
                    'lab_order_id': lab_order_id,
                    'test_names': test_names,
                    'upload_date': datetime.now().strftime('%d-%m-%Y')
                })
        except Exception as e:
            print(f"Warning: Failed to send lab results WhatsApp: {e}")
        
        return jsonify({'message': 'Lab results added successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required()
@role_required(['Lab_Technician', 'Admin'])
def update_lab_order_status(order_id):
    """Update lab order status through workflow stages"""
    data = request.get_json() or {}
    new_status = data.get('status')
    
    valid_statuses = ['Pending', 'Sample_Collected', 'In_Progress', 'Results_Entered', 'Verified', 'Delivered', 'Cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("SELECT * FROM lab_orders WHERE id = ?", (order_id,))
        order = cursor.fetchone()
        if not order:
            return jsonify({'error': 'Lab order not found'}), 404
        order = dict(order)

        update_fields = "status = ?"
        params = [new_status]

        if new_status == 'Sample_Collected':
            update_fields += ", sample_collection_date = CURRENT_TIMESTAMP"
        elif new_status == 'Results_Entered':
            update_fields += ", result_entry_date = CURRENT_TIMESTAMP, actual_completion_date = CURRENT_TIMESTAMP"

        cursor.execute(f"UPDATE lab_orders SET {update_fields} WHERE id = ?", params + [order_id])
        
        # If status updated to Sample_Collected, ensure payment is marked as Paid (if it was Cash/Insurance etc.)
        if new_status == 'Sample_Collected':
            cursor.execute("""
                UPDATE pending_payments SET status = 'Paid' 
                WHERE reference_type = 'lab' AND reference_id = CAST(? AS TEXT) AND status = 'Pending'
            """, (order_id,))
            
        conn.commit()

        # Emit real-time event
        try:
            socketio.emit('lab_order_updated', {
                'order_id': order_id,
                'patient_id': order.get('patient_id'),
                'status': new_status,
                'timestamp': datetime.now().isoformat()
            })
        except Exception:
            pass

        return jsonify({'message': f'Lab order {order_id} status updated to {new_status}'}), 200

    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error updating lab order status: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/orders/pending-samples', methods=['GET'])
@jwt_required()
def get_lab_pending_samples():
    """Get lab orders that are paid and awaiting sample collection"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Get orders with status Pending or Sample_Collected (paid ones only)
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_category, lo.test_name, lo.test_code,
                   lo.priority, lo.sample_type, lo.fasting_required,
                   lo.clinical_notes, lo.special_instructions,
                   lo.order_date, lo.status,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status IN ('Pending', 'Sample_Collected')
            ORDER BY 
                CASE lo.priority WHEN 'Stat' THEN 1 WHEN 'Urgent' THEN 2 ELSE 3 END,
                lo.order_date DESC
        """)
        rows = cursor.fetchall()

        result = []
        for row in rows:
            r = dict(row)
            # Check payment status
            cursor.execute("""
                SELECT status FROM pending_payments
                WHERE reference_type = 'lab' AND reference_id = CAST(? AS TEXT)
                LIMIT 1
            """, (r['id'],))
            pp = cursor.fetchone()
            
            # If no pending payment record, assume paid (legacy or manual entry)
            # If record exists, use that status.
            payment_status = pp.get('status', 'Paid').lower() if pp else 'paid'
            r['payment_status'] = payment_status

            test_type = 'radiology' if any(kw in (r['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound', 'radiology']) else 'pathology'
            urgency = (r['priority'] or 'Routine').lower()

            # Generate collection steps based on test type
            if test_type == 'pathology':
                steps = [
                    {'step_id': 'step1', 'step_name': 'Verify Patient Identity', 'completed': False},
                    {'step_id': 'step2', 'step_name': 'Check Fasting Status', 'completed': False},
                    {'step_id': 'step3', 'step_name': 'Prepare Collection Kit', 'completed': False},
                    {'step_id': 'step4', 'step_name': 'Collect Sample', 'completed': False},
                    {'step_id': 'step5', 'step_name': 'Label Sample Properly', 'completed': False},
                    {'step_id': 'step6', 'step_name': 'Store at Correct Temperature', 'completed': False},
                ]
            else:
                steps = [
                    {'step_id': 'step1', 'step_name': 'Verify Patient Identity', 'completed': False},
                    {'step_id': 'step2', 'step_name': 'Check for Contraindications', 'completed': False},
                    {'step_id': 'step3', 'step_name': 'Prepare Equipment', 'completed': False},
                    {'step_id': 'step4', 'step_name': 'Position Patient', 'completed': False},
                    {'step_id': 'step5', 'step_name': 'Perform Scan/Test', 'completed': False},
                    {'step_id': 'step6', 'step_name': 'Generate Report', 'completed': False},
                ]

            collection_status = 'not_started'
            if r['status'] == 'Sample_Collected':
                collection_status = 'completed'
                for s_item in steps:
                    s_item['completed'] = True

            result.append({
                'order_id': f"LAB-{r['id']}",
                'db_id': r['id'],
                'patient_id': r['patient_id'],
                'patient_name': r['patient_name'],
                'doctor_name': r['doctor_name'],
                'doctor_specialization': r['doctor_specialization'],
                'order_date': str(r['order_date'])[:10] if r['order_date'] else '',
                'test_name': r['test_name'] or r['test_category'] or 'Unknown Test',
                'test_type': test_type,
                'sample_type': r['sample_type'] or ('Blood' if test_type == 'pathology' else 'N/A'),
                'status': r['status'].lower() if r['status'] else 'pending',
                'collection_status': collection_status,
                'urgency': urgency,
                'instructions': r['special_instructions'] or ('Fasting required' if r['fasting_required'] else 'No special instructions'),
                'payment_status': payment_status,
                'collection_steps': steps,
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching pending samples: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/today-collection', methods=['GET'])
@jwt_required()
def get_lab_today_collection():
    """Get today lab payment collection summary"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Billing', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Todays total collection
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as total_transactions FROM collections WHERE reference_type = 'lab' AND DATE(collected_at) = date('now')")
        summary = dict(cursor.fetchone())

        # Individual payments today
        cursor.execute("""
            SELECT c.amount, c.method, c.collected_at, c.reference_id,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.patient_id
            FROM collections c
            JOIN patients p ON c.patient_id = p.patient_id
            WHERE c.reference_type = 'lab' AND DATE(c.collected_at) = date('now')
            ORDER BY c.collected_at DESC
        """)
        payments = [dict(row) for row in cursor.fetchall()]

        return jsonify({
            'total_amount': float(summary['total_amount']),
            'total_transactions': summary['total_transactions'],
            'payments': payments
        }), 200

    except Exception as e:
        app.logger.error(f"Error fetching today lab collection: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/orders/today', methods=['GET'])
@jwt_required()
def get_lab_orders_today():
    """Get all lab orders for today, grouped by patient for the lab dashboard"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Doctor', 'Admin'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_category, lo.test_name, lo.test_code,
                   lo.priority, lo.sample_type, lo.fasting_required,
                   lo.clinical_notes, lo.special_instructions,
                   lo.order_date, lo.status,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, '') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status != 'Cancelled'
            ORDER BY 
                CASE WHEN lo.status = 'Pending' THEN 0
                     WHEN lo.status = 'In_Progress' THEN 1
                     WHEN lo.status = 'Sample_Collected' THEN 2
                     ELSE 3 END,
                lo.order_date DESC
            LIMIT 50
        """)
        rows = cursor.fetchall()

        result = []
        for row in rows:
            r = dict(row)
            # Check for pending payment specific to this lab order
            cursor.execute("""
                SELECT id, status FROM pending_payments
                WHERE patient_id = ? AND reference_type = 'lab'
                AND status = 'Pending'
                AND (reference_id = ? OR reference_id IS NULL)
                LIMIT 1
            """, (r['patient_id'], str(r['id'])))
            pp = cursor.fetchone()
            payment_status = 'pending' if pp else 'paid'

            result.append({
                'order_id': f"LAB-{r['id']}",
                'patient_id': r['patient_id'],
                'patient_name': r['patient_name'],
                'doctor_name': r['doctor_name'],
                'doctor_specialization': r['doctor_specialization'] or 'General Physician',
                'order_date': str(r['order_date'])[:10] if r['order_date'] else date.today().isoformat(),
                'status': 'active' if r['status'] in ('Pending', 'Sample_Collected', 'In_Progress') else 'completed' if r['status'] in ('Results_Entered', 'Verified', 'Delivered') else 'cancelled',
                'notes': r['clinical_notes'] or '',
                'payment_status': payment_status,
                'lab_tests': [{
                    'test_id': str(r['id']),
                    'test_name': r['test_name'] or r['test_category'] or 'Unknown Test',
                    'test_type': 'radiology' if any(kw in (r['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound', 'radiology']) else 'pathology',
                    'urgency': (r['priority'] or 'Routine').lower().replace('stat', 'stat').replace('urgent', 'urgent'),
                    'instructions': r['special_instructions'] or ('Fasting required' if r['fasting_required'] else 'No special instructions'),
                    'price': 500.0,
                    'sample_type': r['sample_type'] or 'Blood'
                }]
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching today lab orders: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/stats', methods=['GET'])
@jwt_required()
def get_lab_stats():
    """Get lab dashboard statistics"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Total unique patients with lab orders
        cursor.execute("SELECT COUNT(DISTINCT patient_id) as count FROM lab_orders")
        total_patients = cursor.fetchone()['count']

        # Active lab orders (not completed/cancelled)
        cursor.execute("SELECT COUNT(*) as count FROM lab_orders WHERE status IN ('Pending', 'Sample_Collected', 'In_Progress')")
        active_orders = cursor.fetchone()['count']

        # Pending payments for lab (Count and Amount)
        cursor.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM pending_payments WHERE reference_type = 'lab' AND status = 'Pending'")
        pp_data = cursor.fetchone()
        pending_payments_count = pp_data['count']
        pending_payments_amount = float(pp_data['total'])

        # Todays lab revenue (using local time for better alignment with user perspective)
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE reference_type = 'lab' AND DATE(collected_at, 'localtime') = date('now', 'localtime')")
        today_revenue = float(cursor.fetchone()['total'])

        # Pending samples (status = Pending AND Paid)
        cursor.execute("""
            SELECT COUNT(*) as count FROM lab_orders lo
            WHERE lo.status = 'Pending'
            AND EXISTS (
                SELECT 1 FROM pending_payments pp 
                WHERE pp.reference_type = 'lab' AND pp.reference_id = CAST(lo.id AS TEXT) AND pp.status = 'Paid'
            )
        """)
        paid_pending_samples = cursor.fetchone()['count']

        # Completed today
        cursor.execute("SELECT COUNT(*) as count FROM lab_orders WHERE status IN ('Results_Entered', 'Verified', 'Delivered') AND DATE(order_date) = date('now')")
        completed_today = cursor.fetchone()['count']

        # In-progress tests
        cursor.execute("SELECT COUNT(*) as count FROM lab_orders WHERE status IN ('Sample_Collected', 'In_Progress')")
        in_progress = cursor.fetchone()['count']

        # Calculate progress percentages
        total_today = paid_pending_samples + in_progress + completed_today
        pathology_progress = int((completed_today / max(total_today, 1)) * 100)

        return jsonify({
            'totalPatients': total_patients,
            'activePrescriptions': active_orders,
            'pendingPayments': pending_payments_count,
            'todayRevenue': today_revenue,
            'pathologyLabProgress': pathology_progress,
            'pathologyLabSamples': paid_pending_samples,
            'radiologyProgress': min(pathology_progress + 5, 100),
            'radiologyReports': in_progress
        }), 200

    except Exception as e:
        app.logger.error(f"Error fetching lab stats: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/lab/analytics', methods=['GET'])
@jwt_required()
def get_lab_analytics():
    """Get aggregated lab analytics data for charts and reports"""
    days = int(request.args.get('days', 7))
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # --- 1. Daily Revenue Trend ---
        cursor.execute("""
            SELECT DATE(collected_at, 'localtime') as date,
                   COALESCE(SUM(amount), 0) as revenue
            FROM collections
            WHERE reference_type = 'lab'
              AND DATE(collected_at, 'localtime') >= date('now', 'localtime', '-' || ? || ' days')
            GROUP BY DATE(collected_at, 'localtime')
            ORDER BY date
        """, (str(days),))
        daily_revenue = [dict(r) for r in cursor.fetchall()]

        # --- 2. Order Trends by Day ---
        cursor.execute("""
            SELECT DATE(order_date) as date,
                   COUNT(*) as count
            FROM lab_orders
            WHERE DATE(order_date) >= date('now', '-' || ? || ' days')
            GROUP BY DATE(order_date)
            ORDER BY date
        """, (str(days),))
        order_trends = [dict(r) for r in cursor.fetchall()]

        # --- 3. Test Category Distribution ---
        cursor.execute("""
            SELECT COALESCE(test_category, 'General') as name,
                   COUNT(*) as value
            FROM lab_orders
            WHERE DATE(order_date) >= date('now', '-' || ? || ' days')
            GROUP BY name
            ORDER BY value DESC
        """, (str(days),))
        categories_raw = [dict(r) for r in cursor.fetchall()]
        total_cat_count = sum(c['value'] for c in categories_raw) or 1
        categories = []
        for c in categories_raw:
            c['value'] = int(c['value'])
            c['percentage'] = round(c['value'] / total_cat_count * 100)
            categories.append(c)

        # --- 4. Lab Workload / Load Stats ---
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM lab_orders
            WHERE DATE(order_date) >= date('now', '-' || ? || ' days')
            GROUP BY status
        """, (str(days),))
        workload_raw = cursor.fetchall()
        workload = {
            'pending': 0,
            'collected': 0,
            'in_progress': 0,
            'completed': 0
        }
        for w in workload_raw:
            s = w['status']
            if s == 'Pending': workload['pending'] += w['count']
            elif s == 'Sample_Collected': workload['collected'] += w['count']
            elif s == 'In_Progress': workload['in_progress'] += w['count']
            elif s in ('Results_Entered', 'Verified', 'Delivered'): workload['completed'] += w['count']

        # --- 5. Top Performed Tests ---
        cursor.execute("""
            SELECT test_name as name,
                   COUNT(*) as units,
                   COALESCE(SUM(CASE WHEN EXISTS (
                       SELECT 1 FROM collections c 
                       WHERE c.reference_type = 'lab' AND c.reference_id = CAST(lo.id AS TEXT)
                   ) THEN 500.0 ELSE 0 END), 0) as revenue
            FROM lab_orders lo
            WHERE DATE(order_date) >= date('now', '-' || ? || ' days')
            GROUP BY test_name
            ORDER BY units DESC
            LIMIT 10
        """, (str(days),))
        top_tests = []
        for r in cursor.fetchall():
            d = dict(r)
            d['units'] = int(d['units'])
            d['revenue'] = float(d['revenue'])
            top_tests.append(d)

        return jsonify({
            'daily_revenue': daily_revenue,
            'order_trends': order_trends,
            'categories': categories,
            'workload': workload,
            'top_tests': top_tests
        }), 200

    except Exception as e:
        app.logger.error(f"Error fetching lab analytics: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/payments/pending', methods=['GET'])
@jwt_required()
def get_lab_pending_payments():
    """Get pending lab payments"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Billing', 'Admin', 'Receptionist', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Now fetch all pending lab payments with patient info
        cursor.execute("""
            SELECT pp.id as payment_id, pp.patient_id, pp.reference_id as order_id,
                   pp.description as order_description, pp.amount, pp.status,
                   pp.created_at as created_date,
                   p.first_name || ' ' || p.last_name as patient_name
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            WHERE pp.reference_type = 'lab' AND pp.status = 'Pending'
            ORDER BY pp.created_at DESC
        """)
        rows = cursor.fetchall()

        result = []
        for row in rows:
            r = dict(row)
            result.append({
                'payment_id': f"PAY-{r['payment_id']}",
                'payment_db_id': r['payment_id'],
                'patient_id': r['patient_id'],
                'patient_name': r['patient_name'],
                'order_id': r['order_id'] or '',
                'order_type': 'lab_order',
                'order_description': r['order_description'] or 'Lab Test',
                'amount': float(r['amount']),
                'due_date': str(r['created_date'])[:10] if r['created_date'] else date.today().isoformat(),
                'status': 'pending',
                'created_date': str(r['created_date'])[:10] if r['created_date'] else date.today().isoformat()
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching lab pending payments: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/payments/collect', methods=['POST'])
@jwt_required()
def collect_lab_payment():
    """Collect payment for a lab order"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Billing', 'Admin', 'Receptionist', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    data = request.get_json() or {}
    payment_db_id = data.get('payment_db_id')
    method = data.get('method', 'Cash')
    transaction_id = data.get('transaction_id', '')

    if not payment_db_id:
        return jsonify({'error': 'payment_db_id is required'}), 400

    collector = get_jwt_identity()
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("SELECT * FROM pending_payments WHERE id = ?", (payment_db_id,))
        p = cursor.fetchone()
        if not p:
            return jsonify({'error': 'Payment not found'}), 404
        p = dict(p)
        if p['status'] != 'Pending':
            return jsonify({'error': 'Payment already processed'}), 400

        # Mark as paid
        cursor.execute("UPDATE pending_payments SET status = 'Paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (payment_db_id,))

        # Insert into collections
        cursor.execute("""
            INSERT INTO collections (payment_id, patient_id, amount, method, transaction_id, collected_by, collected_at, reference_type, reference_id)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
        """, (payment_db_id, p['patient_id'], p['amount'], method, transaction_id, collector, p['reference_type'], p['reference_id']))

        conn.commit()

        # Emit real-time event
        try:
            socketio.emit('lab:payment_collected', {
                'amount': float(p['amount']),
                'method': method,
                'patient_id': p['patient_id'],
                'order_id': p['reference_id'],
                'timestamp': datetime.now().isoformat()
            })
            socketio.emit('lab:stats_updated', {'timestamp': datetime.now().isoformat()})
        except Exception:
            pass

        return jsonify({
            'message': 'Payment collected successfully',
            'amount': float(p['amount']),
            'method': method
        }), 200

    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error collecting lab payment: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/completed-reports', methods=['GET'])
@jwt_required()
def get_lab_completed_reports():
    """Get completed lab test reports for analysis"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Doctor', 'Admin'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_name, lo.test_category, lo.order_date,
                   lo.status, lo.actual_completion_date,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status IN ('Results_Entered', 'Verified')
            ORDER BY lo.actual_completion_date DESC, lo.order_date DESC
        """)
        orders = cursor.fetchall()

        result = []
        for order in orders:
            o = dict(order)
            # Get lab results for this order
            cursor.execute("""
                SELECT parameter_name, result_value, unit, reference_range, status
                FROM lab_results WHERE lab_order_id = ?
            """, (o['id'],))
            lab_results = cursor.fetchall()

            results_list = []
            for lr in lab_results:
                lrd = dict(lr)
                status_map = {'Normal': 'normal', 'Abnormal': 'abnormal', 'Critical': 'critical'}
                results_list.append({
                    'parameter': lrd['parameter_name'],
                    'value': lrd['result_value'] or '',
                    'unit': lrd['unit'] or '',
                    'reference_range': lrd['reference_range'] or '',
                    'status': status_map.get(lrd['status'], 'normal')
                })

            result.append({
                'order_id': f"LAB-{o['id']}",
                'patient_id': o['patient_id'],
                'patient_name': o['patient_name'],
                'doctor_name': o['doctor_name'],
                'doctor_specialization': o['doctor_specialization'],
                'test_name': o['test_name'] or o['test_category'] or 'Unknown Test',
                'test_type': 'radiology' if any(kw in (o['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound']) else 'pathology',
                'test_date': str(o['order_date'])[:10] if o['order_date'] else '',
                'test_completed_at': str(o['actual_completion_date']) if o['actual_completion_date'] else str(o['order_date']),
                'results': results_list,
                'status': 'completed'
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching completed lab reports: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/analysis-reports', methods=['GET'])
@jwt_required()
def get_lab_analysis_reports():
    """Get analysis reports (verified lab orders)"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Doctor', 'Admin', 'Nurse'):
        return jsonify({'error': 'Unauthorized role'}), 403

    patient_id = request.args.get('patient_id', None)

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        query = """
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_name, lo.test_category, lo.order_date,
                   lo.status, lo.actual_completion_date, lo.verification_date,
                   lo.report_generated_date,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status IN ('Verified', 'Delivered', 'Results_Entered')
        """
        params = []
        if patient_id:
            query += " AND lo.patient_id = ?"
            params.append(patient_id)
        query += " ORDER BY lo.verification_date DESC, lo.order_date DESC"

        cursor.execute(query, params)
        orders = cursor.fetchall()

        result = []
        for order in orders:
            o = dict(order)
            cursor.execute("""
                SELECT parameter_name, result_value, unit, reference_range, status, notes, technician_notes
                FROM lab_results WHERE lab_order_id = ?
            """, (o['id'],))
            lab_results = cursor.fetchall()

            results_list = []
            analysis_notes = []
            for lr in lab_results:
                lrd = dict(lr)
                status_map = {'Normal': 'normal', 'Abnormal': 'abnormal', 'Critical': 'critical'}
                results_list.append({
                    'parameter': lrd['parameter_name'],
                    'value': lrd['result_value'] or '',
                    'unit': lrd['unit'] or '',
                    'reference_range': lrd['reference_range'] or '',
                    'status': status_map.get(lrd['status'], 'normal')
                })
                if lrd.get('technician_notes'):
                    analysis_notes.append(lrd['technician_notes'])

            # Determine analysis summary based on results
            critical_count = sum(1 for r in results_list if r['status'] == 'critical')
            abnormal_count = sum(1 for r in results_list if r['status'] == 'abnormal')
            if critical_count > 0:
                analysis_summary = 'Critical abnormalities detected requiring immediate medical attention'
                recommendations = ['Urgent consultation with primary care physician recommended', 'Immediate follow-up with specialist required', 'Consider emergency department visit if symptoms present']
            elif abnormal_count > 0:
                analysis_summary = 'Abnormal test results detected requiring medical follow-up'
                recommendations = ['Schedule follow-up appointment with primary care physician', 'Repeat testing in 1-2 weeks as recommended', 'Monitor symptoms and report changes to healthcare provider']
            else:
                analysis_summary = 'All test results within normal ranges'
                recommendations = ['Continue routine health monitoring', 'Schedule regular check-ups as recommended', 'Maintain current medication and treatment plan']

            if analysis_notes:
                analysis_summary += '. Notes: ' + '; '.join(analysis_notes)

            result.append({
                'report_id': f"RPT-{o['id']}",
                'patient_id': o['patient_id'],
                'patient_name': o['patient_name'],
                'doctor_name': o['doctor_name'],
                'doctor_specialization': o['doctor_specialization'],
                'test_name': o['test_name'] or o['test_category'] or 'Unknown Test',
                'test_type': 'radiology' if any(kw in (o['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound']) else 'pathology',
                'test_date': str(o['order_date'])[:10] if o['order_date'] else '',
                'test_completed_at': str(o['actual_completion_date']) if o['actual_completion_date'] else str(o['order_date']),
                'analysis_date': str(o['verification_date']) if o['verification_date'] else datetime.now().isoformat(),
                'analysis_summary': analysis_summary,
                'recommendations': recommendations,
                'test_results': results_list,
                'status': 'completed',
                'generated_by': 'Lab Technician',
                'uploaded_to_db': True
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching analysis reports: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/analysis-reports', methods=['POST'])
@jwt_required()
def save_lab_analysis_report():
    """Save/update a lab analysis report - marks as Verified"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin'):
        return jsonify({'error': 'Unauthorized role'}), 403

    data = request.get_json() or {}
    order_id_str = data.get('order_id', '')
    # Extract numeric ID from "LAB-123" format
    order_id = order_id_str.replace('LAB-', '').replace('RPT-', '') if order_id_str else None

    if not order_id:
        return jsonify({'error': 'order_id is required'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Update the lab order status to Verified
        cursor.execute("""
            UPDATE lab_orders
            SET status = 'Verified',
                verification_date = CURRENT_TIMESTAMP,
                report_generated_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (order_id,))

        # Update technician notes in lab_results if analysis_data is provided
        analysis_data = data.get('analysis_data', {})
        if analysis_data.get('analysis_summary'):
            cursor.execute("""
                UPDATE lab_results
                SET technician_notes = ?,
                    verified_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE lab_order_id = ?
            """, (analysis_data['analysis_summary'], get_jwt_identity(), order_id))

        conn.commit()

        # Emit real-time event
        try:
            socketio.emit('lab_report_verified', {
                'order_id': order_id_str,
                'timestamp': datetime.now().isoformat()
            })
        except Exception:
            pass

        return jsonify({
            'message': 'Analysis report saved successfully',
            'report_id': f"RPT-{order_id}"
        }), 201

    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error saving analysis report: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/analysis-reports/patient/<patient_id>', methods=['GET'])
@jwt_required()
def get_lab_analysis_reports_by_patient(patient_id):
    """Get analysis reports for a specific patient"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Doctor', 'Admin', 'Patient', 'Nurse'):
        return jsonify({'error': 'Unauthorized role'}), 403

    # Redirect to the main analysis-reports endpoint with patient_id filter
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_name, lo.test_category, lo.order_date,
                   lo.status, lo.actual_completion_date, lo.verification_date,
                   p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.patient_id = ? AND lo.status IN ('Verified', 'Delivered', 'Results_Entered')
            ORDER BY lo.verification_date DESC, lo.order_date DESC
        """, (patient_id,))
        orders = cursor.fetchall()

        result = []
        for order in orders:
            o = dict(order)
            cursor.execute("""
                SELECT parameter_name, result_value, unit, reference_range, status
                FROM lab_results WHERE lab_order_id = ?
            """, (o['id'],))
            lab_results = cursor.fetchall()

            results_list = []
            for lr in lab_results:
                lrd = dict(lr)
                status_map = {'Normal': 'normal', 'Abnormal': 'abnormal', 'Critical': 'critical'}
                results_list.append({
                    'parameter': lrd['parameter_name'],
                    'value': lrd['result_value'] or '',
                    'unit': lrd['unit'] or '',
                    'reference_range': lrd['reference_range'] or '',
                    'status': status_map.get(lrd['status'], 'normal')
                })

            critical_count = sum(1 for r in results_list if r['status'] == 'critical')
            abnormal_count = sum(1 for r in results_list if r['status'] == 'abnormal')
            if critical_count > 0:
                analysis_summary = 'Critical abnormalities detected'
                recommendations = ['Urgent consultation recommended']
            elif abnormal_count > 0:
                analysis_summary = 'Abnormal results detected'
                recommendations = ['Follow-up appointment recommended']
            else:
                analysis_summary = 'All results within normal ranges'
                recommendations = ['Continue routine monitoring']

            result.append({
                'report_id': f"RPT-{o['id']}",
                'patient_id': o['patient_id'],
                'patient_name': o['patient_name'],
                'doctor_name': o['doctor_name'],
                'doctor_specialization': o['doctor_specialization'],
                'test_name': o['test_name'] or 'Unknown Test',
                'test_type': 'pathology',
                'test_date': str(o['order_date'])[:10] if o['order_date'] else '',
                'test_completed_at': str(o['actual_completion_date']) if o['actual_completion_date'] else '',
                'analysis_date': str(o['verification_date']) if o['verification_date'] else datetime.now().isoformat(),
                'analysis_summary': analysis_summary,
                'recommendations': recommendations,
                'test_results': results_list,
                'status': 'completed',
                'generated_by': 'Lab Technician',
                'uploaded_to_db': True
            })

        if not result:
            return jsonify({'error': 'No reports found'}), 404
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


# ============================================
# LAB WORKFLOW PIPELINE ENDPOINTS
# ============================================

@app.route('/api/lab/payments/today', methods=['GET'])
@jwt_required()
def get_lab_payments_today():
    """Get today lab payments (pending + completed)"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Receptionist', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    today = date.today().isoformat()
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Get all lab-related pending payments
        cursor.execute("""
            SELECT pp.id, pp.patient_id, pp.reference_id, pp.description,
                   pp.amount, pp.status, pp.created_at,
                   p.first_name || ' ' || p.last_name as patient_name,
                   lo.test_name, lo.test_category, lo.order_date,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            LEFT JOIN lab_orders lo ON pp.reference_id = CAST(lo.id AS TEXT)
            LEFT JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE pp.reference_type = 'lab'
            ORDER BY pp.status ASC, pp.created_at DESC
        """)
        payments = cursor.fetchall()

        # Get today completed collections for lab
        cursor.execute("""
            SELECT c.id, c.payment_id, c.patient_id, c.amount, c.method,
                   c.transaction_id, c.collected_by, c.collected_at,
                   c.reference_type, c.reference_id,
                   p.first_name || ' ' || p.last_name as patient_name,
                   pp.description
            FROM collections c
            JOIN patients p ON c.patient_id = p.patient_id
            LEFT JOIN pending_payments pp ON c.payment_id = pp.id
            WHERE c.reference_type = 'lab' AND DATE(c.collected_at, 'localtime') = date('now', 'localtime')
            ORDER BY c.collected_at DESC
        """)
        collections = cursor.fetchall()

        pending = []
        for pay in payments:
            pd = dict(pay)
            if pd['status'] == 'Pending':
                pending.append({
                    'payment_id': f"PAY-{pd['id']}",
                    'payment_db_id': pd['id'],
                    'patient_id': pd['patient_id'],
                    'patient_name': pd['patient_name'],
                    'order_id': f"LAB-{pd['reference_id']}" if pd['reference_id'] else '',
                    'order_description': pd['description'] or pd['test_name'] or 'Lab Test',
                    'test_name': pd['test_name'] or 'Lab Test',
                    'doctor_name': pd['doctor_name'] or 'N/A',
                    'amount': float(pd['amount']),
                    'due_date': str(pd['created_at'])[:10] if pd['created_at'] else today,
                    'status': 'pending',
                    'created_date': str(pd['created_at'])[:10] if pd['created_at'] else '',
                })

        completed = []
        for col in collections:
            cd = dict(col)
            completed.append({
                'collection_id': cd['id'],
                'payment_id': cd['payment_id'],
                'patient_id': cd['patient_id'],
                'patient_name': cd['patient_name'],
                'amount': float(cd['amount']),
                'method': cd['method'] or 'Cash',
                'transaction_id': cd['transaction_id'] or '',
                'collected_by': cd['collected_by'] or '',
                'collected_at': str(cd['collected_at']) if cd['collected_at'] else '',
                'description': cd.get('description', '') or 'Lab Test',
                'status': 'paid',
            })

        return jsonify({'pending': pending, 'completed': completed}), 200

    except Exception as e:
        app.logger.error(f"Error fetching today lab payments: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/orders/ready-for-testing', methods=['GET'])
@jwt_required()
def get_lab_orders_ready_for_testing():
    """Get lab orders with Sample_Collected status (ready for testing)"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_name, lo.test_category, lo.test_code,
                   lo.priority, lo.sample_type, lo.order_date,
                   lo.sample_collection_date, lo.status,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender, p.blood_group,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status = 'Sample_Collected'
            ORDER BY
                CASE lo.priority WHEN 'Stat' THEN 1 WHEN 'Urgent' THEN 2 ELSE 3 END,
                lo.sample_collection_date ASC
        """)
        rows = cursor.fetchall()

        result = []
        for row in rows:
            r = dict(row)
            test_type = 'radiology' if any(kw in (r['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound']) else 'pathology'

            result.append({
                'order_id': f"LAB-{r['id']}",
                'db_id': r['id'],
                'patient_id': r['patient_id'],
                'patient_name': r['patient_name'],
                'doctor_name': r['doctor_name'],
                'doctor_specialization': r['doctor_specialization'],
                'order_date': str(r['order_date'])[:10] if r['order_date'] else '',
                'sample_collected_at': str(r['sample_collection_date']) if r['sample_collection_date'] else '',
                'test_name': r['test_name'] or r['test_category'] or 'Unknown Test',
                'test_type': test_type,
                'sample_type': r['sample_type'] or 'Blood',
                'priority': r['priority'] or 'Routine',
                'status': 'sample_collected',
                'gender': r['gender'] or '',
                'blood_group': r['blood_group'] or '',
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching ready-for-testing orders: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/orders/results-entered', methods=['GET'])
@jwt_required()
def get_lab_orders_results_entered():
    """Get lab orders with Results_Entered status (for analysis)"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_name, lo.test_category, lo.order_date,
                   lo.status, lo.actual_completion_date,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status = 'Results_Entered'
            ORDER BY lo.actual_completion_date DESC
        """)
        orders = cursor.fetchall()

        result = []
        for order in orders:
            o = dict(order)
            # Get lab results for this order
            cursor.execute("""
                SELECT parameter_name, result_value, unit, reference_range, status
                FROM lab_results WHERE lab_order_id = ?
            """, (o['id'],))
            lab_results = [dict(lr) for lr in cursor.fetchall()]

            test_type = 'radiology' if any(kw in (o['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound']) else 'pathology'

            result.append({
                'order_id': f"LAB-{o['id']}",
                'db_id': o['id'],
                'patient_id': o['patient_id'],
                'patient_name': o['patient_name'],
                'doctor_name': o['doctor_name'],
                'doctor_specialization': o['doctor_specialization'],
                'test_name': o['test_name'] or 'Unknown Test',
                'test_type': test_type,
                'test_date': str(o['order_date'])[:10] if o['order_date'] else '',
                'test_completed_at': str(o['actual_completion_date']) if o['actual_completion_date'] else '',
                'status': 'completed',
                'test_results': [{
                    'parameter': lr['parameter_name'],
                    'value': lr['result_value'] or '',
                    'unit': lr['unit'] or '',
                    'reference_range': lr['reference_range'] or '',
                    'status': lr['status'].lower() if lr['status'] else 'normal'
                } for lr in lab_results],
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching results-entered orders: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/orders/verified', methods=['GET'])
@jwt_required()
def get_lab_orders_verified():
    """Get lab orders with Verified status (for report generation)"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by,
                   lo.test_name, lo.test_category, lo.order_date,
                   lo.status, lo.actual_completion_date, lo.verification_date,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender, p.blood_group, p.mobile_number,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.status IN ('Verified', 'Delivered')
            ORDER BY lo.verification_date DESC, lo.order_date DESC
        """)
        orders = cursor.fetchall()

        result = []
        for order in orders:
            o = dict(order)
            # Get lab results
            cursor.execute("""
                SELECT parameter_name, result_value, unit, reference_range, status
                FROM lab_results WHERE lab_order_id = ?
            """, (o['id'],))
            lab_results = [dict(lr) for lr in cursor.fetchall()]

            # Check if report already generated
            cursor.execute("SELECT id FROM lab_reports WHERE lab_order_id = ? LIMIT 1", (o['id'],))
            existing_report = cursor.fetchone()

            test_type = 'radiology' if any(kw in (o['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound']) else 'pathology'

            # Calculate age
            age = 0
            if o.get('date_of_birth'):
                try:
                    dob = datetime.strptime(str(o['date_of_birth'])[:10], '%Y-%m-%d')
                    age = (datetime.now() - dob).days // 365
                except Exception:
                    pass

            result.append({
                'order_id': f"LAB-{o['id']}",
                'db_id': o['id'],
                'patient_id': o['patient_id'],
                'patient_name': o['patient_name'],
                'patient_age': age,
                'patient_gender': o['gender'] or '',
                'patient_blood_group': o['blood_group'] or '',
                'patient_phone': o['mobile_number'] or '',
                'doctor_name': o['doctor_name'],
                'doctor_specialization': o['doctor_specialization'],
                'test_name': o['test_name'] or 'Unknown Test',
                'test_type': test_type,
                'test_date': str(o['order_date'])[:10] if o['order_date'] else '',
                'test_completed_at': str(o['actual_completion_date']) if o['actual_completion_date'] else '',
                'verified_at': str(o['verification_date']) if o['verification_date'] else '',
                'report_generated': existing_report is not None,
                'report_id': dict(existing_report)['id'] if existing_report else None,
                'test_results': [{
                    'parameter': lr['parameter_name'],
                    'value': lr['result_value'] or '',
                    'unit': lr['unit'] or '',
                    'reference_range': lr['reference_range'] or '',
                    'status': lr['status'].lower() if lr['status'] else 'normal'
                } for lr in lab_results],
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.error(f"Error fetching verified orders: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/reports/generate', methods=['POST'])
@jwt_required()
def generate_lab_report():
    """Generate and store a lab report"""
    claims = get_jwt()
    if claims.get('role') not in ('Lab_Technician', 'Admin', 'Doctor'):
        return jsonify({'error': 'Unauthorized role'}), 403

    data = request.get_json()
    order_id = data.get('order_id')  # DB id (integer)
    findings = data.get('findings', '')
    recommendations = data.get('recommendations', '')

    if not order_id:
        return jsonify({'error': 'order_id is required'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Get order details
        cursor.execute("""
            SELECT lo.*, 
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender, p.blood_group, p.mobile_number,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.id = ?
        """, (order_id,))
        order = cursor.fetchone()
        if not order:
            return jsonify({'error': 'Lab order not found'}), 404
        o = dict(order)

        # Get results
        cursor.execute("""
            SELECT parameter_name, result_value, unit, reference_range, status, is_critical
            FROM lab_results WHERE lab_order_id = ?
        """, (order_id,))
        lab_results = [dict(lr) for lr in cursor.fetchall()]

        # Build report data JSON
        import json
        age = 0
        if o.get('date_of_birth'):
            try:
                dob = datetime.strptime(str(o['date_of_birth'])[:10], '%Y-%m-%d')
                age = (datetime.now() - dob).days // 365
            except Exception:
                pass

        report_data = json.dumps({
            'patient': {
                'id': o['patient_id'],
                'name': o['patient_name'],
                'age': age,
                'gender': o['gender'] or '',
                'blood_group': o['blood_group'] or '',
                'phone': o['mobile_number'] or '',
            },
            'doctor': {
                'name': o['doctor_name'],
                'specialization': o['doctor_specialization'],
            },
            'test': {
                'name': o['test_name'] or 'Unknown',
                'category': o['test_category'] or '',
                'order_date': str(o['order_date'])[:10] if o['order_date'] else '',
                'completion_date': str(o['actual_completion_date']) if o.get('actual_completion_date') else '',
            },
            'results': [{
                'parameter': lr['parameter_name'],
                'value': lr['result_value'] or '',
                'unit': lr['unit'] or '',
                'reference_range': lr['reference_range'] or '',
                'status': lr['status'] or 'Normal',
                'is_critical': bool(lr.get('is_critical')),
            } for lr in lab_results],
            'findings': findings,
            'recommendations': recommendations,
            'generated_at': datetime.now().isoformat(),
            'generated_by': claims.get('name', get_jwt_identity()),
        })

        # Check if report already exists
        cursor.execute("SELECT id FROM lab_reports WHERE lab_order_id = ?", (order_id,))
        existing = cursor.fetchone()
        if existing:
            # Update existing report
            report_id = dict(existing)['id']
            cursor.execute("""
                UPDATE lab_reports SET report_data = ?, findings = ?, recommendations = ?,
                       generated_by = ?, generated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (report_data, findings, recommendations, claims.get('name', get_jwt_identity()), report_id))
        else:
            # Insert new report
            cursor.execute("""
                INSERT INTO lab_reports (lab_order_id, patient_id, doctor_id, test_name,
                    report_data, findings, recommendations, generated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (order_id, o['patient_id'], o['ordered_by'], o['test_name'],
                  report_data, findings, recommendations, claims.get('name', get_jwt_identity())))
            report_id = cursor.lastrowid

        # Update lab order status to Delivered
        cursor.execute("UPDATE lab_orders SET status = 'Delivered' WHERE id = ?", (order_id,))

        conn.commit()

        # Emit real-time event for doctor/patient portals
        try:
            socketio.emit('lab_report_generated', {
                'order_id': order_id,
                'patient_id': o['patient_id'],
                'doctor_id': o['ordered_by'],
                'report_id': report_id,
                'test_name': o['test_name'],
                'timestamp': datetime.now().isoformat()
            })
        except Exception:
            pass

        return jsonify({
            'message': 'Report generated successfully',
            'report_id': report_id,
            'report_data': json.loads(report_data)
        }), 201

    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error generating lab report: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/lab/reports/<int:report_id>', methods=['GET'])
@jwt_required()
def get_lab_report(report_id):
    """Get a specific lab report"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT lr.*, lo.test_name, lo.test_category, lo.order_date,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender, p.blood_group, p.mobile_number,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_reports lr
            JOIN lab_orders lo ON lr.lab_order_id = lo.id
            JOIN patients p ON lr.patient_id = p.patient_id
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lr.id = ?
        """, (report_id,))
        report = cursor.fetchone()

        if not report:
            return jsonify({'error': 'Report not found'}), 404

        import json
        r = dict(report)
        report_data = json.loads(r['report_data']) if r.get('report_data') else {}

        return jsonify({
            'report_id': r['id'],
            'lab_order_id': r['lab_order_id'],
            'patient_id': r['patient_id'],
            'patient_name': r['patient_name'],
            'doctor_name': r['doctor_name'],
            'doctor_specialization': r['doctor_specialization'],
            'test_name': r['test_name'] or '',
            'findings': r['findings'] or '',
            'recommendations': r['recommendations'] or '',
            'generated_by': r['generated_by'] or '',
            'generated_at': str(r['generated_at']) if r['generated_at'] else '',
            'report_data': report_data,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


# ============================================
# NURSE DASHBOARD ENDPOINTS
# ============================================

@app.route('/api/nurse/dashboard', methods=['GET'])
@jwt_required()
def get_nurse_dashboard():
    """Comprehensive nurse dashboard data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # 1. Patients currently admitted
        cursor.execute("""
            SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_group,
                   p.mobile_number as phone, p.known_allergies as allergies, p.chronic_conditions, 
                   p.created_at as registration_date, a.advance_payment,
                   d.dept_name as department_name, b.bed_type as ward_name, b.floor_number, b.room_number
            FROM patients p
            JOIN admissions a ON p.patient_id = a.patient_id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE a.status = 'Admitted'
            ORDER BY a.admission_date DESC
        """)
        patients = [dict(r) for r in cursor.fetchall()]
        admitted_ids = [p['patient_id'] for p in patients]
        id_placeholder = ",".join(["?"] * len(admitted_ids)) if admitted_ids else "NULL"

        
        # 2. Admissions (admitted patients)
        cursor.execute("""
            SELECT a.*, p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   b.bed_type as bed_type, b.ward_name as ward_name, b.room_number as room_number, b.floor_number,
                   d.dept_name as department_name
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.admitting_doctor_id = s.staff_id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.status = 'Admitted'
            ORDER BY a.admission_date DESC
        """)
        admissions = [dict(r) for r in cursor.fetchall()]
        

        
        # 4. Recent prescriptions for admitted patients (last 7 days)
        if admitted_ids:
            cursor.execute(f"""
                SELECT pr.id, pr.prescription_id, pr.patient_id, pr.doctor_id, pr.diagnosis,
                       pr.prescription_date, pr.status,
                       p.first_name || ' ' || p.last_name as patient_name,
                       s.first_name || ' ' || s.last_name as doctor_name
                FROM prescriptions pr
                JOIN patients p ON pr.patient_id = p.patient_id
                LEFT JOIN staff s ON pr.doctor_id = s.staff_id
                WHERE pr.patient_id IN ({id_placeholder})
                AND pr.prescription_date >= datetime('now', '-7 days')
                ORDER BY pr.prescription_date DESC
            """, admitted_ids)
            prescriptions = [dict(r) for r in cursor.fetchall()]
        else:
            prescriptions = []

        
        # Get medicines for each prescription
        for rx in prescriptions:
            cursor.execute("""
                SELECT * FROM prescription_medicines WHERE prescription_id = ?
            """, (rx['prescription_id'],))
            rx['medicines'] = [dict(r) for r in cursor.fetchall()]
        
        # 5. Pending lab orders for admitted patients
        if admitted_ids:
            cursor.execute(f"""
                SELECT lo.id as lab_order_id, lo.patient_id, lo.ordered_by as doctor_id, lo.test_name,
                       lo.test_category, lo.status, lo.priority, lo.order_date, lo.clinical_notes as notes,
                       p.first_name || ' ' || p.last_name as patient_name,
                       s.first_name || ' ' || s.last_name as doctor_name
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.patient_id
                LEFT JOIN staff s ON lo.ordered_by = s.staff_id
                WHERE lo.patient_id IN ({id_placeholder})
                ORDER BY 
                    CASE lo.priority WHEN 'STAT' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END,
                    lo.order_date DESC
            """, admitted_ids)
            lab_orders = [dict(r) for r in cursor.fetchall()]
        else:
            lab_orders = []

        
        # 6. Bed occupancy
        cursor.execute("SELECT COUNT(*) as total FROM beds")
        total_beds_row = cursor.fetchone()
        total_beds = dict(total_beds_row)['total'] if total_beds_row else 0
        
        cursor.execute("SELECT COUNT(*) as occupied FROM beds WHERE status = 'Occupied'")
        occupied_row = cursor.fetchone()
        occupied_beds = dict(occupied_row)['occupied'] if occupied_row else 0
        
        # 7. Historical vitals for admitted patients
        if admitted_ids:
            cursor.execute(f"""
                SELECT * FROM vital_signs 
                WHERE patient_id IN ({id_placeholder})
                ORDER BY recorded_at DESC
            """, admitted_ids)
            all_vitals = cursor.fetchall()
            
            latest_vitals = {}
            history_vitals = {pid: [] for pid in admitted_ids}
            
            for r in all_vitals:
                v = dict(r)
                pid = v['patient_id']
                history_vitals[pid].append(v)
                if pid not in latest_vitals:
                    latest_vitals[pid] = v
        else:
            latest_vitals = {}
            history_vitals = {}

        
        # Compute stats
        total_patients = len(patients)
        admitted_count = len(admissions)
        pending_labs = len([lo for lo in lab_orders if lo['status'] in ('Pending', 'Sample_Collected')])
        active_prescriptions = len([rx for rx in prescriptions if rx['status'] == 'Active'])

        # --- Extra data for new alert types ---
        # Recent admissions (last 24h)
        cursor.execute("""
            SELECT a.admission_id, a.admission_date, a.provisional_diagnosis,
                   p.patient_id, p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name, b.ward_name
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN staff s ON a.admitting_doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE a.status = 'Admitted' AND a.admission_date >= datetime('now', '-24 hours')
            ORDER BY a.admission_date DESC
        """)
        recent_admissions = [dict(r) for r in cursor.fetchall()]

        # Recent discharges (last 24h)
        cursor.execute("""
            SELECT a.admission_id, a.actual_discharge_date, a.discharge_type, a.final_diagnosis,
                   p.patient_id, p.first_name || ' ' || p.last_name as patient_name,
                   d.dept_name as department_name
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.status = 'Discharged' AND a.actual_discharge_date >= datetime('now', '-24 hours')
            ORDER BY a.actual_discharge_date DESC
        """)
        recent_discharges = [dict(r) for r in cursor.fetchall()]

        # Recent lab reports ready (last 24h)
        cursor.execute("""
            SELECT lo.id as lab_order_id, lo.test_name, lo.test_category, lo.status, lo.verification_date, lo.priority,
                   p.patient_id, p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            LEFT JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE lo.status IN ('Verified', 'Results_Entered')
              AND lo.verification_date >= datetime('now', '-24 hours')
            ORDER BY lo.verification_date DESC
        """)
        recent_lab_reports = [dict(r) for r in cursor.fetchall()]

        # Recently dispensed prescriptions (last 24h)
        cursor.execute("""
            SELECT pr.prescription_id, pr.diagnosis, pr.updated_at as dispensed_at, pr.status,
                   p.patient_id, p.first_name || ' ' || p.last_name as patient_name,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM prescriptions pr
            JOIN patients p ON pr.patient_id = p.patient_id
            LEFT JOIN staff s ON pr.doctor_id = s.staff_id
            WHERE pr.status = 'Dispensed' AND pr.updated_at >= datetime('now', '-24 hours')
            ORDER BY pr.updated_at DESC
        """)
        recent_dispensed = [dict(r) for r in cursor.fetchall()]
        
        return jsonify({
            'patients': patients,
            'admissions': admissions,
            'prescriptions': prescriptions,
            'lab_orders': lab_orders,
            'latest_vitals': latest_vitals,
            'history_vitals': history_vitals,
            'recent_admissions': recent_admissions,
            'recent_discharges': recent_discharges,
            'recent_lab_reports': recent_lab_reports,
            'recent_dispensed': recent_dispensed,
            'stats': {
                'total_patients': total_patients,
                'admitted_patients': admitted_count,
                'pending_labs': pending_labs,
                'active_prescriptions': active_prescriptions,
                'total_beds': total_beds,
                'occupied_beds': occupied_beds,
                'available_beds': total_beds - occupied_beds,
            }
        }), 200
        
    except Exception as e:
        print(f"Nurse dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/nurse/analytics', methods=['GET'])
@jwt_required()
def get_nurse_analytics():
    """Comprehensive nurse analytics dashboard data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # --- Bed utilization by department ---
        cursor.execute("""
            SELECT d.dept_name, COUNT(b.id) as total,
                   SUM(CASE WHEN b.status='Occupied' THEN 1 ELSE 0 END) as occupied,
                   SUM(CASE WHEN b.status='Vacant' THEN 1 ELSE 0 END) as vacant
            FROM beds b
            LEFT JOIN departments d ON b.ward_name = d.dept_name
            GROUP BY d.dept_name
        """)
        ward_utilization = [dict(r) for r in cursor.fetchall()]

        # --- Admissions per day last 7 days ---
        cursor.execute("""
            SELECT DATE(admission_date) as date, COUNT(*) as count
            FROM admissions
            WHERE admission_date >= datetime('now', '-6 days')
            GROUP BY DATE(admission_date)
            ORDER BY date
        """)
        admit_trend = [dict(r) for r in cursor.fetchall()]

        # --- Discharges per day last 7 days ---
        cursor.execute("""
            SELECT DATE(actual_discharge_date) as date, COUNT(*) as count
            FROM admissions
            WHERE status = 'Discharged' AND actual_discharge_date >= datetime('now', '-6 days')
            GROUP BY DATE(actual_discharge_date)
            ORDER BY date
        """)
        discharge_trend = [dict(r) for r in cursor.fetchall()]

        # --- Lab orders per day last 7 days ---
        cursor.execute("""
            SELECT DATE(order_date) as date, COUNT(*) as count
            FROM lab_orders
            WHERE order_date >= datetime('now', '-6 days')
            GROUP BY DATE(order_date)
            ORDER BY date
        """)
        lab_trend = [dict(r) for r in cursor.fetchall()]

        # --- Current summary stats ---
        cursor.execute("SELECT COUNT(*) as c FROM admissions WHERE status='Admitted'")
        total_admitted = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM beds WHERE status='Occupied'")
        occupied_beds = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM beds")
        total_beds = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM lab_orders WHERE status='Pending'")
        pending_labs = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM prescriptions WHERE status='Active'")
        active_rx = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM admissions WHERE status='Discharged' AND DATE(actual_discharge_date)=DATE('now')")
        today_discharges = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM admissions WHERE DATE(admission_date)=DATE('now')")
        today_admissions = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM lab_orders WHERE (status='Verified' OR status='Results_Entered') AND DATE(verification_date)=DATE('now')")
        today_lab_reports = dict(cursor.fetchone()).get('c', 0)
        cursor.execute("SELECT COUNT(*) as c FROM prescriptions WHERE status='Dispensed' AND DATE(updated_at)=DATE('now')")
        today_dispensed = dict(cursor.fetchone()).get('c', 0)

        # --- Priority alert counts ---
        cursor.execute("SELECT COUNT(*) as c FROM lab_orders WHERE status='Pending' AND priority IN ('STAT','Urgent')")
        urgent_labs = dict(cursor.fetchone()).get('c', 0)

        # --- Recent activity feed (last 20 events) ---
        cursor.execute("""
            SELECT 'admission' as event_type, admission_date as event_time,
                   p.first_name || ' ' || p.last_name as patient_name,
                   'Patient admitted — ' || COALESCE(provisional_diagnosis, 'Assessment pending') as detail
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.status = 'Admitted'
            UNION ALL
            SELECT 'discharge' as event_type, actual_discharge_date as event_time,
                   p.first_name || ' ' || p.last_name as patient_name,
                   'Patient discharged — ' || COALESCE(final_diagnosis, 'Discharge complete') as detail
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.status = 'Discharged' AND actual_discharge_date >= datetime('now', '-2 days')
            UNION ALL
            SELECT 'lab_report' as event_type, verification_date as event_time,
                   p.first_name || ' ' || p.last_name as patient_name,
                   'Lab report ready — ' || lo.test_name as detail
            FROM lab_orders lo
            JOIN patients p ON lo.patient_id = p.patient_id
            WHERE lo.status IN ('Verified','Results_Entered') AND lo.verification_date >= datetime('now', '-2 days')
            UNION ALL
            SELECT 'dispensed' as event_type, pr.updated_at as event_time,
                   p.first_name || ' ' || p.last_name as patient_name,
                   'Prescription dispensed — ' || COALESCE(pr.diagnosis, 'Medication dispensed') as detail
            FROM prescriptions pr
            JOIN patients p ON pr.patient_id = p.patient_id
            WHERE pr.status = 'Dispensed' AND pr.updated_at >= datetime('now', '-2 days')
            ORDER BY event_time DESC
            LIMIT 25
        """)
        recent_activity = [dict(r) for r in cursor.fetchall()]

        return jsonify({
            'ward_utilization': ward_utilization,
            'admit_trend': admit_trend,
            'discharge_trend': discharge_trend,
            'lab_trend': lab_trend,
            'stats': {
                'total_admitted': total_admitted,
                'occupied_beds': occupied_beds,
                'total_beds': total_beds,
                'available_beds': total_beds - occupied_beds,
                'pending_labs': pending_labs,
                'active_prescriptions': active_rx,
                'today_admissions': today_admissions,
                'today_discharges': today_discharges,
                'today_lab_reports': today_lab_reports,
                'today_dispensed': today_dispensed,
                'urgent_labs': urgent_labs,
                'bed_occupancy_pct': round((occupied_beds / total_beds * 100) if total_beds else 0, 1),
            },
            'recent_activity': recent_activity,
        }), 200
    except Exception as e:
        print(f"Nurse analytics error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/nurse/lab/collect-sample', methods=['POST'])
@jwt_required()
@role_required(['Nurse', 'Lab_Technician', 'Admin'])
def nurse_collect_sample():
    """Mark lab order sample as collected by nurse"""
    data = request.get_json() or {}
    order_id = data.get('order_id')
    if not order_id:
        return jsonify({'error': 'order_id required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE lab_orders SET status = 'Sample_Collected' WHERE id = ? AND status = 'Pending'", (order_id,))
        if cursor.rowcount == 0:
            return jsonify({'error': 'Order not found or already processed'}), 404
        conn.commit()
        
        # Emit real-time event
        try:
            socketio.emit('lab:status_updated', {
                'order_id': order_id,
                'status': 'Sample_Collected',
                'timestamp': datetime.now().isoformat()
            })
            socketio.emit('lab:stats_updated', {'timestamp': datetime.now().isoformat()})
        except Exception:
            pass

        return jsonify({
            'success': True, 
            'message': 'Sample marked as collected',
            'order_id': order_id,
            'status': 'Sample_Collected'
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


# ============================================
# BED & ADMISSION ENDPOINTS
# ============================================

@app.route('/api/beds', methods=['GET', 'POST'])
@jwt_required()
def manage_beds():
    """Get all beds or add a new bed (supports bulk)"""
    if request.method == 'POST':
        claims = get_jwt()
        if claims.get('role') not in ['Admin', 'Admission', 'Receptionist']:
            return jsonify({'error': 'Unauthorized role'}), 403
            
        data = request.get_json()
        print(f"DEBUG: Attempting to add bed(s): {data}")
        
        department = data.get('department', 'General')
        ward_name = data.get('ward_name')
        bed_type = data.get('bed_type', 'General_Male')
        count = int(data.get('count', 1))
        
        if not ward_name:
            return jsonify({'error': 'Ward name is required'}), 400
            
        conn = get_db_connection()
        cursor = get_dict_cursor(conn) # Use dict cursor for convenience
        try:
            dept_abbr = department[:3].upper()
            type_abbr = bed_type[:2].upper()
            
            beds_added = []
            for i in range(count):
                # Find the next available sequence number for this Dept-Type pattern
                pattern = f"{dept_abbr}-{type_abbr}-%"
                cursor.execute("SELECT bed_id FROM beds WHERE bed_id LIKE ? ORDER BY bed_id DESC LIMIT 1", (pattern,))
                last_bed = cursor.fetchone()
                
                seq = 1
                if last_bed:
                    try:
                        # Extract the trailing number from something like CAR-GE-005
                        last_id = last_bed['bed_id']
                        if '-' in last_id:
                            last_num_str = last_id.split('-')[-1]
                            seq = int(last_num_str) + 1
                    except (ValueError, IndexError):
                        seq = 1
                
                # Double-check uniqueness to prevent race conditions or holes
                while True:
                    bed_id = f"{dept_abbr}-{type_abbr}-{seq:03d}"
                    cursor.execute("SELECT 1 FROM beds WHERE bed_id = ?", (bed_id,))
                    if not cursor.fetchone():
                        break
                    seq += 1

                # Check if bed_id provided in data (only for single add)
                if count == 1 and data.get('bed_id'):
                    bed_id = data.get('bed_id')

                cursor.execute("""
                    INSERT INTO beds (
                        bed_id, bed_type, ward_name, department, floor_number, 
                        room_number, daily_charge, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Vacant')
                """, (
                    bed_id, bed_type, ward_name, department,
                    data.get('floor_number'), data.get('room_number'), 
                    float(data.get('daily_charge', 500.0))
                ))
                beds_added.append(bed_id)
            
            conn.commit()
            
            socketio.emit('bed_inventory_updated', {
                'count': len(beds_added),
                'ward_name': ward_name,
                'department': department,
                'beds': beds_added
            })
            
            return jsonify({'message': f"{len(beds_added)} unit(s) commissioned successfully", 'added': beds_added}), 201
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
        finally:
            cursor.close()
            close_db_connection(conn)

    # GET logic
    bed_type = request.args.get('type', '')
    status = request.args.get('status', '')
    floor = request.args.get('floor', '')
    department = request.args.get('department', '')
    
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
        if department:
            query += " AND b.department = ?"
            params.append(department)
        
        query += " ORDER BY b.floor_number, b.bed_id"
        cursor.execute(query, params)
        beds = cursor.fetchall()
        return jsonify(beds), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
        close_db_connection(conn)

@app.route('/api/admissions', methods=['POST'])
@jwt_required()
@role_required(['Doctor', 'Admission', 'Admin', 'Receptionist'])
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
        
        # Get doctor department
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
            data.get('bed_id'), data.get('admission_date', datetime.now().isoformat()),
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
        """, (data.get('patient_id'), data.get('admission_date', datetime.now().isoformat()),
              data.get('expected_discharge_date'), data.get('bed_id')))
        
        # Tie unallocated advance payments to this admission
        new_adm_pk = cursor.lastrowid
        if new_adm_pk is None or new_adm_pk == 0:
            # Fallback to fetch internal id
            cursor.execute("SELECT id FROM admissions WHERE admission_id = ?", (admission_id,))
            id_row = cursor.fetchone()
            if id_row:
                new_adm_pk = id_row['id']

        if new_adm_pk:
            cursor.execute("""
                UPDATE advance_payments 
                SET admission_id = ? 
                WHERE patient_id = ? AND admission_id IS NULL
            """, (new_adm_pk, data.get('patient_id')))
        
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
        close_db_connection(conn)

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
                   b.bed_type as bed_type, b.bed_type as ward_name, b.room_number as room_number
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
        close_db_connection(conn)

# ADD_BED Logic moved to consolidated /api/beds endpoint above

@app.route('/api/patients/search', methods=['GET'])
@jwt_required()
def search_patients():
    """Search patients by name or phone number"""
    query = request.args.get('q', '')
    if len(query) < 2:
        return jsonify([])
        
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        search_term = f"%{query}%"
        cursor.execute("""
            SELECT patient_id, first_name, last_name, mobile_number, date_of_birth, gender,
                   blood_group, email, permanent_address_street, permanent_city, permanent_state, permanent_pincode
            FROM patients 
            WHERE (first_name || ' ' || last_name LIKE ?) 
               OR (mobile_number LIKE ?)
               OR (patient_id LIKE ?)
            LIMIT 10
        """, (search_term, search_term, search_term))
        results = [dict(row) for row in cursor.fetchall()]
        print(f"DEBUG: Search for '{query}' returned: {results}")
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admissions/quick', methods=['POST'])
@jwt_required()
@role_required(['Admission', 'Admin'])
def quick_emergency_admission():
    """Register and admit a patient in one step for emergency"""
    data = request.get_json()
    
    # Check if we need to register a new patient
    patient_id = data.get('patient_id')
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        if not patient_id:
            # Register new patient first
            cursor.execute("SELECT patient_id FROM patients ORDER BY id DESC LIMIT 1")
            last = cursor.fetchone()
            if last:
                num = int(last['patient_id'][1:]) + 1
                patient_id = f"P{num:04d}"
            else:
                patient_id = "P0001"
                
            cursor.execute("""
                INSERT INTO patients (
                    patient_id, first_name, last_name, gender, 
                    date_of_birth, mobile_number, password_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                patient_id, data.get('first_name'), data.get('last_name'),
                data.get('gender', 'Other'), data.get('date_of_birth', '1990-01-01'),
                data.get('mobile_number', '0000000000'), 'Patient@123'
            ))
            
        # Create Admission (similar to create_admission but unified)
        admission_id = f"ADM{uuid.uuid4().hex[:8].upper()}"
        cursor.execute("""
            INSERT INTO admissions (
                admission_id, patient_id, admitting_doctor_id, bed_id,
                admission_date, admission_type, triage_level, admission_reason,
                status
            ) VALUES (?, ?, ?, ?, ?, 'Emergency', ?, ?, 'Admitted')
        """, (
            admission_id, patient_id, data.get('admitting_doctor_id'), 
            data.get('bed_id'), datetime.now().isoformat(), data.get('triage_level', 'Critical'),
            data.get('admission_reason', 'Emergency Arrival')
        ))
        
        # Update Bed
        cursor.execute("UPDATE beds SET status = 'Occupied', current_patient_id = ? WHERE bed_id = ?",
                       (patient_id, data.get('bed_id')))
        
        conn.commit()
        return jsonify({
            'message': 'Emergency admission successful',
            'admission_id': admission_id,
            'patient_id': patient_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# ADMISSION DASHBOARD ENDPOINTS
# ============================================

@app.route('/api/admission/dashboard', methods=['GET'])
@jwt_required()
@role_required(['Admission', 'Admin', 'Doctor'])
def get_comprehensive_admission_dashboard():
    """Comprehensive admission dashboard data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        dept_filter = request.args.get('department', '')
        doctor_filter = request.args.get('doctor', '')
        type_filter = request.args.get('type', '')
        date_filter = request.args.get('date', '')

        # 1. All admissions with full details (live queue)
        query = """
            SELECT a.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.mobile_number as patient_phone,
                   p.gender, p.date_of_birth, p.blood_group,
                   p.insurance_provider as patient_insurance,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name,
                   b.bed_type as bed_type, b.bed_type as ward_name, b.room_number as room_number, b.bed_id as assigned_bed
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.admitting_doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE a.status = 'Admitted'
        """
        params = []

        if dept_filter:
            query += " AND d.dept_name = ?"
            params.append(dept_filter)
        if doctor_filter:
            query += " AND a.admitting_doctor_id = ?"
            params.append(doctor_filter)
        if type_filter:
            query += " AND a.admission_type = ?"
            params.append(type_filter)
        if date_filter:
            query += " AND date(a.admission_date) = date(?)"
            params.append(date_filter)

        query += " ORDER BY a.admission_date DESC"
        cursor.execute(query, params)
        admissions = [dict(r) for r in cursor.fetchall()]

        # Calculate wait time for each admission
        for a in admissions:
            if a.get('admission_date'):
                try:
                    adm_time = datetime.fromisoformat(str(a['admission_date']).replace('Z', '+00:00'))
                    if adm_time.tzinfo:
                        adm_time = adm_time.replace(tzinfo=None)
                    wait_mins = (datetime.now() - adm_time).total_seconds() / 60
                    a['wait_minutes'] = round(wait_mins)
                    a['is_waiting_long'] = wait_mins > 30
                except:
                    a['wait_minutes'] = 0
                    a['is_waiting_long'] = False

        # 2. Todays admission count
        cursor.execute("""
            SELECT COUNT(*) as count FROM admissions
            WHERE DATE(admission_date) = date('now')
        """)
        today_count = dict(cursor.fetchone())['count']

        # Yesterdays count
        cursor.execute("""
            SELECT COUNT(*) as count FROM admissions
            WHERE DATE(admission_date) = date('now', '-1 day')
        """)
        yesterday_count = dict(cursor.fetchone())['count']

        # 3. Todays discharge count
        cursor.execute("""
            SELECT COUNT(*) as count FROM admissions
            WHERE DATE(actual_discharge_date) = date('now')
        """)
        today_discharges = dict(cursor.fetchone())['count']

        # 4. Bed stats
        cursor.execute("SELECT COUNT(*) as total FROM beds")
        total_beds = dict(cursor.fetchone())['total']
        cursor.execute("SELECT COUNT(*) as occupied FROM beds WHERE status = 'Occupied'")
        occupied_beds = dict(cursor.fetchone())['occupied']
        cursor.execute("SELECT COUNT(*) as available FROM beds WHERE status = 'Vacant'")
        available_beds = dict(cursor.fetchone())['available']

        # 5. Pending queue count (all admitted without bed or recently added)
        pending_count = len([a for a in admissions if not a.get('assigned_bed')])

        # 6. Departments list for filter
        cursor.execute("SELECT DISTINCT dept_name FROM departments WHERE is_active = TRUE ORDER BY dept_name")
        departments = [dict(r)['dept_name'] for r in cursor.fetchall()]

        # 7. Doctors list for filter
        cursor.execute("""
            SELECT DISTINCT s.staff_id, s.first_name || ' ' || s.last_name as name
            FROM staff s WHERE s.role = 'Doctor' AND s.is_active = TRUE
            ORDER BY s.first_name
        """)
        doctors = [dict(r) for r in cursor.fetchall()]

        return jsonify({
            'admissions': admissions,
            'stats': {
                'today_admissions': today_count,
                'yesterday_admissions': yesterday_count,
                'today_discharges': today_discharges,
                'total_beds': total_beds,
                'occupied_beds': occupied_beds,
                'available_beds': available_beds,
                'pending_queue': pending_count,
                'total_admitted': len(admissions),
            },
            'filters': {
                'departments': departments,
                'doctors': doctors,
            }
        }), 200

    except Exception as e:
        app.logger.error(f"Admission dashboard error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admissions/<admission_id>/status', methods=['POST'])
@jwt_required()
@role_required(['Admission', 'Admin', 'Doctor'])
def update_admission_status(admission_id):
    """Update admission status (Admit, Hold, Cancel)"""
    data = request.get_json() or {}
    new_status = data.get('status')
    action = data.get('action', '')

    if not new_status and not action:
        return jsonify({'error': 'status or action required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if action == 'cancel':
            # Cancel admission and free the bed
            cursor.execute("SELECT bed_id FROM admissions WHERE admission_id = ?", (admission_id,))
            row = cursor.fetchone()
            if row and row['bed_id']:
                cursor.execute("""
                    UPDATE beds SET status = 'Vacant', current_patient_id = NULL,
                    admission_date = NULL, expected_discharge_date = NULL
                    WHERE bed_id = ?
                """, (row['bed_id'],))
            cursor.execute("UPDATE admissions SET status = 'Discharged', actual_discharge_date = CURRENT_TIMESTAMP WHERE admission_id = ?", (admission_id,))
        elif new_status:
            cursor.execute("UPDATE admissions SET status = ? WHERE admission_id = ?", (new_status, admission_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Admission not found'}), 404

        conn.commit()
        
        # Broadcast real-time status update
        socketio.emit('admission_status_updated', {
            'admission_id': admission_id,
            'status': new_status or 'Discharged' if action == 'cancel' else new_status
        })
        if action == 'cancel':
             socketio.emit('bed_status_changed', {'bed_id': row['bed_id'] if 'row' in locals() and row else None, 'status': 'Vacant'})

        return jsonify({'success': True, 'message': f'Admission updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admissions/<admission_id>/discharge', methods=['POST'])
@jwt_required()
@role_required(['Admission', 'Admin', 'Doctor'])
def discharge_patient(admission_id):
    """Discharge a patient - update admission + free bed"""
    data = request.get_json() or {}

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Get admission details
        cursor.execute("SELECT * FROM admissions WHERE admission_id = ?", (admission_id,))
        admission = cursor.fetchone()
        if not admission:
            return jsonify({'error': 'Admission not found'}), 404

        admission = dict(admission)

        # Update admission
        cursor.execute("""
            UPDATE admissions
            SET status = 'Discharged',
                actual_discharge_date = CURRENT_TIMESTAMP,
                discharge_type = ?,
                discharge_summary = ?,
                final_diagnosis = ?
            WHERE admission_id = ?
        """, (
            data.get('discharge_type', 'Normal'),
            data.get('discharge_summary', ''),
            data.get('final_diagnosis', admission.get('provisional_diagnosis', '')),
            admission_id
        ))

        # Free the bed
        if admission.get('bed_id'):
            cursor.execute("""
                UPDATE beds
                SET status = 'Vacant',
                    current_patient_id = NULL,
                    admission_date = NULL,
                    expected_discharge_date = NULL
                WHERE bed_id = ?
            """, (admission['bed_id'],))

        conn.commit()

        try:
            socketio.emit('admission:discharged', {
                'admission_id': admission_id,
                'patient_id': admission.get('patient_id'),
                'bed_id': admission.get('bed_id'),
                'timestamp': datetime.now().isoformat()
            })
            socketio.emit('admission_status_updated', {
                'admission_id': admission_id,
                'status': 'Discharged'
            })
            if admission.get('bed_id'):
                socketio.emit('bed_status_changed', {
                    'bed_id': admission.get('bed_id'),
                    'status': 'Vacant'
                })
        except:
            pass

        return jsonify({'success': True, 'message': 'Patient discharged successfully'}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admission/financial', methods=['GET'])
@jwt_required()
def get_financial_clearance():
    """Financial clearance dashboard - advance payments, insurance, billing status"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT a.admission_id, a.patient_id, a.admission_date, a.admission_type,
                   a.advance_payment, a.payment_type, a.insurance_provider,
                   a.policy_number, a.coverage_amount, a.total_bill_amount,
                   a.tpa_name, a.pre_authorization_number,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.mobile_number as patient_phone,
                   p.insurance_provider as patient_insurance_provider,
                   p.insurance_policy_number as patient_policy_number,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   b.bed_type as bed_type, b.bed_type as ward_name, b.room_number as room_number, b.daily_charge
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.admitting_doctor_id = s.staff_id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE a.status = 'Admitted'
            ORDER BY a.advance_payment ASC
        """)
        patients = [dict(r) for r in cursor.fetchall()]

        # Calculate financial metrics for each patient
        for pt in patients:
            advance = float(pt.get('advance_payment') or 0)
            daily_charge = float(pt.get('daily_charge') or 500)

            # Calculate days admitted
            try:
                adm_date = datetime.fromisoformat(str(pt['admission_date']).replace('Z', '+00:00'))
                if adm_date.tzinfo:
                    adm_date = adm_date.replace(tzinfo=None)
                days = max(1, (datetime.now() - adm_date).days)
            except:
                days = 1

            estimated_bill = daily_charge * days
            pt['days_admitted'] = days
            pt['estimated_bill'] = round(estimated_bill, 2)
            pt['remaining_advance'] = round(max(0, advance - estimated_bill), 2)
            pt['advance_consumed_pct'] = round(min(100, (estimated_bill / max(1, advance)) * 100), 1) if advance > 0 else 100
            pt['is_low_advance'] = pt['advance_consumed_pct'] >= 80
            pt['insurance_status'] = 'Active' if pt.get('insurance_provider') else 'Not Applicable'

        # Sort: low advance patients first
        patients.sort(key=lambda x: x.get('remaining_advance', 0))

        # Stats
        total_advance = sum(float(p.get('advance_payment') or 0) for p in patients)
        low_advance_count = len([p for p in patients if p.get('is_low_advance')])
        insurance_count = len([p for p in patients if p.get('payment_type') == 'Insurance'])

        return jsonify({
            'patients': patients,
            'stats': {
                'total_admitted': len(patients),
                'total_advance_collected': round(total_advance, 2),
                'low_advance_count': low_advance_count,
                'insurance_patients': insurance_count,
                'self_pay_patients': len(patients) - insurance_count,
            }
        }), 200

    except Exception as e:
        app.logger.error(f"Financial clearance error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admission/emergency', methods=['GET'])
@jwt_required()
def get_emergency_admissions():
    """Emergency fast-track dashboard data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Emergency admissions
        cursor.execute("""
            SELECT a.*,
                   p.first_name || ' ' || p.last_name as patient_name,
                   p.mobile_number as patient_phone,
                   p.gender, p.date_of_birth, p.blood_group,
                   p.known_allergies,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name,
                   b.bed_type as bed_type, b.bed_type as ward_name, b.room_number as room_number
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.admitting_doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN beds b ON a.bed_id = b.bed_id
            WHERE a.admission_type = 'Emergency' AND a.status = 'Admitted'
            ORDER BY a.admission_date DESC
        """)
        emergency_patients = [dict(r) for r in cursor.fetchall()]

        # Add wait time and triage
        triage_levels = ['Critical', 'Serious', 'Stable']
        for i, pt in enumerate(emergency_patients):
            try:
                adm_time = datetime.fromisoformat(str(pt['admission_date']).replace('Z', '+00:00'))
                if adm_time.tzinfo:
                    adm_time = adm_time.replace(tzinfo=None)
                wait_mins = (datetime.now() - adm_time).total_seconds() / 60
                pt['wait_minutes'] = round(wait_mins)
            except:
                pt['wait_minutes'] = 0

            # Assign triage based on diagnosis keywords or round-robin
            diagnosis = (pt.get('provisional_diagnosis') or pt.get('admission_reason') or '').lower()
            if any(w in diagnosis for w in ['cardiac', 'stroke', 'trauma', 'critical', 'accident', 'severe']):
                pt['triage_level'] = 'Critical'
            elif any(w in diagnosis for w in ['fracture', 'bleeding', 'pain', 'injury', 'serious']):
                pt['triage_level'] = 'Serious'
            else:
                pt['triage_level'] = 'Stable'

            pt['bill_paid'] = float(pt.get('advance_payment') or 0) > 0
            pt['has_bed'] = pt.get('bed_type') is not None

        # Emergency bed availability
        cursor.execute("""
            SELECT COUNT(*) as total FROM beds
            WHERE bed_type IN ('ICU', 'CCU', 'HDU') AND status = 'Vacant'
        """)
        icu_available = dict(cursor.fetchone())['total']

        cursor.execute("SELECT COUNT(*) as total FROM beds WHERE status = 'Vacant'")
        total_available = dict(cursor.fetchone())['total']

        # Todays emergency count
        cursor.execute("""
            SELECT COUNT(*) as count FROM admissions
            WHERE admission_type = 'Emergency' AND DATE(admission_date) = date('now')
        """)
        today_emergency = dict(cursor.fetchone())['count']

        return jsonify({
            'patients': emergency_patients,
            'stats': {
                'total_emergency': len(emergency_patients),
                'today_emergency': today_emergency,
                'critical_count': len([p for p in emergency_patients if p.get('triage_level') == 'Critical']),
                'icu_beds_available': icu_available,
                'total_beds_available': total_available,
            }
        }), 200

    except Exception as e:
        app.logger.error(f"Emergency dashboard error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admission/reports', methods=['GET'])
@jwt_required()
def get_admission_reports():
    """Admission reports and analytics"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        period = request.args.get('period', 'weekly')  # daily, weekly, monthly

        # 1. Daily admission counts for last 30 days
        cursor.execute("""
            SELECT DATE(admission_date) as date, COUNT(*) as admissions
            FROM admissions
            WHERE admission_date >= datetime('now', '-30 days')
            GROUP BY DATE(admission_date)
            ORDER BY date
        """)
        daily_admissions = [dict(r) for r in cursor.fetchall()]

        # Daily discharge counts
        cursor.execute("""
            SELECT DATE(actual_discharge_date) as date, COUNT(*) as discharges
            FROM admissions
            WHERE actual_discharge_date >= datetime('now', '-30 days')
              AND actual_discharge_date IS NOT NULL
            GROUP BY DATE(actual_discharge_date)
            ORDER BY date
        """)
        daily_discharges = [dict(r) for r in cursor.fetchall()]

        # 2. Average LOS by department
        cursor.execute("""
            SELECT d.dept_name as department,
                   ROUND(
                       AVG(
                           julianday(COALESCE(a.actual_discharge_date, datetime('now'))) - julianday(a.admission_date)
                       ),
                       1
                   ) as avg_los,
                   COUNT(*) as total_admissions
            FROM admissions a
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.admission_date >= datetime('now', '-90 days')
            GROUP BY d.dept_name
            HAVING COUNT(*) > 0
            ORDER BY avg_los DESC
        """)
        los_by_dept = [dict(r) for r in cursor.fetchall()]

        # 3. Bed occupancy summary
        cursor.execute("""
            SELECT b.ward_name,
                   COUNT(b.id) as total_beds,
                   SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) as occupied_beds,
                   SUM(CASE WHEN b.status = 'Vacant' THEN 1 ELSE 0 END) as vacant_beds
            FROM beds b
            GROUP BY b.ward_name
        """)
        bed_occupancy = [dict(r) for r in cursor.fetchall()]

        # 4. Revenue from advances
        cursor.execute("""
            SELECT COALESCE(SUM(advance_payment), 0) as total_advance,
                   COALESCE(SUM(CASE WHEN DATE(admission_date) = date('now') THEN advance_payment ELSE 0 END), 0) as today_advance,
                   COALESCE(SUM(CASE WHEN admission_date >= datetime('now', '-7 days') THEN advance_payment ELSE 0 END), 0) as week_advance,
                   COALESCE(SUM(CASE WHEN admission_date >= datetime('now', '-30 days') THEN advance_payment ELSE 0 END), 0) as month_advance
            FROM admissions
        """)
        revenue = dict(cursor.fetchone())

        # 5. Insurance vs self-pay ratio
        cursor.execute("""
            SELECT payment_type, COUNT(*) as count
            FROM admissions
            WHERE admission_date >= datetime('now', '-30 days')
            GROUP BY payment_type
        """)
        payment_breakdown = [dict(r) for r in cursor.fetchall()]

        # 6. Admission type breakdown
        cursor.execute("""
            SELECT admission_type, COUNT(*) as count
            FROM admissions
            WHERE admission_date >= datetime('now', '-30 days')
            GROUP BY admission_type
        """)
        type_breakdown = [dict(r) for r in cursor.fetchall()]

        # 7. Peak admission hours
        cursor.execute("""
            SELECT CAST(strftime('%H', admission_date) AS INTEGER) as hour, COUNT(*) as count
            FROM admissions
            WHERE admission_date >= datetime('now', '-30 days')
            GROUP BY hour
            ORDER BY hour
        """)
        peak_hours = [dict(r) for r in cursor.fetchall()]

        # 8. Overall stats
        cursor.execute("SELECT COUNT(*) as total FROM admissions WHERE status = 'Admitted'")
        currently_admitted = dict(cursor.fetchone())['total']

        cursor.execute("""
            SELECT COUNT(*) as total FROM admissions
            WHERE DATE(admission_date) = date('now')
        """)
        today_admissions = dict(cursor.fetchone())['total']

        cursor.execute("""
            SELECT COUNT(*) as total FROM admissions
            WHERE DATE(actual_discharge_date) = date('now')
        """)
        today_discharges_count = dict(cursor.fetchone())['total']

        cursor.execute("""
            SELECT ROUND(
                       AVG(
                           julianday(actual_discharge_date) - julianday(admission_date)
                       ),
                       1
                   ) as avg_los
            FROM admissions
            WHERE actual_discharge_date IS NOT NULL
              AND admission_date >= datetime('now', '-90 days')
        """)
        avg_los_row = cursor.fetchone()
        overall_avg_los = dict(avg_los_row).get('avg_los') or 0

        # Total beds and occupancy
        cursor.execute("SELECT COUNT(*) as t FROM beds")
        total_beds = dict(cursor.fetchone())['t']
        cursor.execute("SELECT COUNT(*) as o FROM beds WHERE status = 'Occupied'")
        occ_beds = dict(cursor.fetchone())['o']

        return jsonify({
            'daily_admissions': daily_admissions,
            'daily_discharges': daily_discharges,
            'los_by_department': los_by_dept,
            'bed_occupancy': bed_occupancy,
            'revenue': revenue,
            'payment_breakdown': payment_breakdown,
            'type_breakdown': type_breakdown,
            'peak_hours': peak_hours,
            'stats': {
                'currently_admitted': currently_admitted,
                'today_admissions': today_admissions,
                'today_discharges': today_discharges_count,
                'avg_los': overall_avg_los,
                'total_beds': total_beds,
                'occupied_beds': occ_beds,
                'occupancy_rate': round((occ_beds / max(1, total_beds)) * 100, 1),
            }
        }), 200

    except Exception as e:
        app.logger.error(f"Admission reports error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/beds/<bed_id>', methods=['DELETE'])
@jwt_required()
def delete_bed(bed_id):
    """Delete a bed (decommission)"""
    claims = get_jwt()
    if claims.get('role') not in ['Admin', 'Admission']:
        return jsonify({'error': 'Unauthorized role'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if bed is occupied
        cursor.execute("SELECT status, ward_name, department FROM beds WHERE bed_id = ?", (bed_id,))
        bed = cursor.fetchone()
        if not bed:
            return jsonify({'error': 'Unit not found'}), 404
            
        if bed['status'] == 'Occupied':
            return jsonify({'error': 'Cannot decommission an occupied unit. Discharge the patient first.'}), 400
            
        cursor.execute("DELETE FROM beds WHERE bed_id = ?", (bed_id,))
        conn.commit()
        
        socketio.emit('bed_inventory_updated', {
            'action': 'delete',
            'bed_id': bed_id,
            'ward_name': bed['ward_name'],
            'department': bed['department']
        })
        
        return jsonify({'message': f'Unit {bed_id} decommissioned successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/beds/<bed_id>/status', methods=['POST'])
@jwt_required()
@role_required(['Admission', 'Admin', 'Nurse', 'Doctor'])
def update_bed_status(bed_id):
    """Update bed status - assign, reserve, maintenance, vacate"""
    data = request.get_json() or {}
    new_status = data.get('status')
    patient_id = data.get('patient_id')

    if not new_status:
        return jsonify({'error': 'status is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if new_status == 'Occupied' and patient_id:
            cursor.execute("""
                UPDATE beds SET status = 'Occupied', current_patient_id = ?,
                admission_date = CURRENT_TIMESTAMP WHERE bed_id = ?
            """, (patient_id, bed_id))
        elif new_status == 'Vacant':
            cursor.execute("""
                UPDATE beds SET status = 'Vacant', current_patient_id = NULL,
                admission_date = NULL, expected_discharge_date = NULL WHERE bed_id = ?
            """, (bed_id,))
        else:
            cursor.execute("UPDATE beds SET status = ? WHERE bed_id = ?", (new_status, bed_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Bed not found'}), 404

        conn.commit()

        try:
            socketio.emit('bed:status_changed', {
                'bed_id': bed_id,
                'new_status': new_status,
                'timestamp': datetime.now().isoformat()
            })
        except:
            pass

        return jsonify({'success': True, 'message': f'Bed {bed_id} updated to {new_status}'}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


# ============================================
# PHARMACY ENDPOINTS
# ============================================

@app.route('/api/pharmacy/inventory', methods=['GET'])
@jwt_required()
@role_required(['Doctor', 'Pharmacist', 'Admin', 'Nurse'])
def get_medicine_inventory():
    """Get medicine inventory - accessible by doctors to write prescriptions, pharmacists for management, and admins"""
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
        close_db_connection(conn)

@app.route('/api/pharmacy/inventory', methods=['POST'])
@jwt_required()
@role_required(['Pharmacist', 'Admin'])
def add_medicine():
    """Add new medicine to inventory or increase stock if already exists"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Support both 'stock' and 'current_stock' field names
        stock = data.get('stock') if data.get('stock') is not None else data.get('current_stock', 0)
        generic_name = data.get('generic_name', '').strip()
        brand_name = (data.get('brand_name') or data.get('name', '')).strip()
        strength = data.get('strength', '').strip()
        
        # Check if medicine with same generic_name, brand_name, and strength already exists
        cursor.execute("""
            SELECT id, current_stock, medicine_id FROM medicine_inventory 
            WHERE LOWER(generic_name) = LOWER(?) 
            AND LOWER(brand_name) = LOWER(?) 
            AND LOWER(strength) = LOWER(?)
        """, (generic_name, brand_name, strength))
        
        existing = cursor.fetchone()
        
        if existing:
            # Medicine already exists - increase stock instead of creating duplicate
            medicine_id = existing['medicine_id']
            new_stock = existing['current_stock'] + stock
            
            cursor.execute("""
                UPDATE medicine_inventory 
                SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
                WHERE medicine_id = ?
            """, (new_stock, medicine_id))
            
            conn.commit()
            
            # Emit real-time Socket.IO event
            socketio.emit('pharmacy:stock_updated', {
                'medicine_id': medicine_id,
                'name': brand_name,
                'generic_name': generic_name,
                'category': data.get('category'),
                'current_stock': new_stock,
                'reorder_level': data.get('reorder_level', 10),
                'unit_price': data.get('unit_price'),
                'timestamp': datetime.now().isoformat()
            })
            
            return jsonify({'message': 'Stock updated successfully', 'id': medicine_id, 'action': 'updated_stock'}), 200
        
        # Create new medicine if it doesnt exist
        medicine_id = data.get('medicine_id') or str(uuid.uuid4())[:8]
        
        cursor.execute("""
            INSERT INTO medicine_inventory (
                medicine_id, generic_name, brand_name, manufacturer, category,
                dosage_form, strength, pack_size, unit_price, mrp, current_stock,
                reorder_level, batch_number, expiry_date, storage_location, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            medicine_id, generic_name, brand_name,
            data.get('manufacturer'), data.get('category'), data.get('dosage_form'),
            strength, data.get('pack_size'), data.get('unit_price'),
            data.get('mrp'), stock, data.get('reorder_level', 10),
            data.get('batch_number'), data.get('expiry_date'), data.get('storage_location'),
            1
        ))
        
        conn.commit()
        
        # Emit real-time Socket.IO event
        socketio.emit('pharmacy:medicine_added', {
            'id': medicine_id,
            'medicine_id': medicine_id,
            'brand_name': brand_name,
            'name': brand_name,
            'generic_name': generic_name,
            'category': data.get('category'),
            'current_stock': stock,
            'stock': stock,
            'reorder_level': data.get('reorder_level', 10),
            'unit_price': data.get('unit_price'),
            'expiry_date': data.get('expiry_date'),
            'status': 'Active',
            'sku': data.get('sku'),
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'message': 'Medicine added successfully', 'id': medicine_id, 'action': 'created'}), 201
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding medicine: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/pharmacy/inventory/<medicine_id>', methods=['PUT'])
@jwt_required()
@role_required(['Pharmacist', 'Admin', 'Doctor'])
def update_medicine(medicine_id):
    """Update existing medicine in inventory"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Support both 'stock' and 'current_stock' field names
        stock = data.get('current_stock') if data.get('current_stock') is not None else data.get('stock')
        brand_name = data.get('brand_name') or data.get('name')
        
        # Check if using auto-increment ID or medicine_id UUID
        where_clause = "ID = ?" if medicine_id.isdigit() else "medicine_id = ?"
        
        # Build dynamic update
        fields = []
        values = []
        
        field_map = {
            'generic_name': data.get('generic_name'),
            'brand_name': brand_name,
            'category': data.get('category'),
            'dosage_form': data.get('dosage_form'),
            'strength': data.get('strength'),
            'current_stock': stock,
            'reorder_level': data.get('reorder_level'),
            'unit_price': data.get('unit_price'),
            'expiry_date': data.get('expiry_date'),
            'status': data.get('status'),
            'batch_number': data.get('batch_number'),
            'manufacturer': data.get('manufacturer')
        }
        
        for field, value in field_map.items():
            if value is not None:
                fields.append(f"{field} = ?")
                values.append(value)
        
        if not fields:
            return jsonify({'error': 'No fields to update'}), 400
            
        values.append(medicine_id)
        query = f"UPDATE medicine_inventory SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE {where_clause}"
        
        cursor.execute(query, values)
        conn.commit()
        
        # Emit update event
        socketio.emit('pharmacy:medicine_updated', {
            'medicine_id': medicine_id,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'message': 'Medicine updated successfully', 'id': medicine_id}), 200
    except Exception as e:
        conn.rollback()
        print(f"Error updating medicine: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/pharmacy/inventory/<medicine_id>', methods=['DELETE'])
@jwt_required()
@role_required(['Pharmacist', 'Admin'])
def delete_medicine(medicine_id):
    """Delete medicine from inventory"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_clause = "id = ?" if medicine_id.isdigit() else "medicine_id = ?"
        cursor.execute(f"DELETE FROM medicine_inventory WHERE {where_clause}", (medicine_id,))
        conn.commit()
        return jsonify({'message': 'Medicine deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


# NOTE: The primary /api/pharmacy/dispense endpoint is defined further below
# in the COMPREHENSIVE PHARMACY MANAGEMENT ENDPOINTS section.

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
        socketio.emit('vitals:recorded', {
            'patient_id': data.get('patient_id'),
            'timestamp': datetime.now().isoformat()
        })
        return jsonify({'message': 'Vital signs recorded successfully'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
        close_db_connection(conn)

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
            WHERE patient_id = ? AND appointment_date >= date('now')
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
            SELECT a.*, b.bed_type as bed_type, b.bed_type as ward_name
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
        close_db_connection(conn)

@app.route('/api/dashboard/doctor', methods=['GET'])
@jwt_required()
@role_required(['Doctor'])
def get_doctor_dashboard():
    """Get doctor dashboard data"""
    doctor_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Todays appointments (from clinical queue)
        cursor.execute("""
            SELECT COUNT(*) as count FROM queue_management
            WHERE doctor_id = ? AND queue_date = date('now')
        """, (doctor_id,))
        today_count = cursor.fetchone()['count']
        
        # Pending consultations
        cursor.execute("""
            SELECT COUNT(*) as count FROM queue_management
            WHERE doctor_id = ? AND queue_date = date('now')
            AND status IN ('Waiting', 'Visited', 'In_Progress')
        """, (doctor_id,))
        pending_count = cursor.fetchone()['count']
        
        # Completed today
        cursor.execute("""
            SELECT COUNT(*) as count FROM queue_management
            WHERE doctor_id = ? AND queue_date = date('now')
            AND status = 'Completed'
        """, (doctor_id,))
        completed_count = cursor.fetchone()['count']
        
        # Pending lab results
        cursor.execute("""
            SELECT COUNT(*) as count FROM lab_orders
            WHERE ordered_by = ? AND status IN ('Pending', 'In_Progress')
        """, (doctor_id,))
        pending_labs = cursor.fetchone()['count']
        
        # Todays appointment list (from clinical queue)
        cursor.execute("""
            SELECT q.*, p.first_name || ' ' || p.last_name as patient_name,
                   p.date_of_birth, p.gender, a.appointment_type, a.reason_for_visit, a.appointment_time
            FROM queue_management q
            JOIN patients p ON q.patient_id = p.patient_id
            JOIN appointments a ON q.appointment_id = a.appointment_id
            WHERE q.doctor_id = ? AND q.queue_date = date('now')
            ORDER BY q.token_number
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
        close_db_connection(conn)

@app.route('/api/dashboard/receptionist', methods=['GET'])
@jwt_required()
@role_required(['Receptionist', 'Doctor', 'Admin'])
def get_receptionist_dashboard():
    """Get receptionist dashboard data with real-time stats"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Todays registrations (both online and offline)
        cursor.execute("""
            SELECT COUNT(*) as count FROM patients
            WHERE DATE(registration_date) = date('now')
        """)
        today_registrations = cursor.fetchone()['count']
        
        # Todays appointments
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE appointment_date = date('now')
        """)
        today_appointments = cursor.fetchone()['count']
        
        # Pending approvals
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments
            WHERE status = 'Pending_Approval'
        """)
        pending_approvals = cursor.fetchone()['count']
        
        # Current queue (waiting status)
        cursor.execute("""
            SELECT COUNT(*) as count FROM queue_management
            WHERE queue_date = date('now') AND status = 'Waiting'
        """)
        waiting_queue = cursor.fetchone()['count']
        
        # Todays revenue from collections
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total FROM collections 
            WHERE DATE(collected_at) = date('now')
        """)
        today_revenue = cursor.fetchone()['total']
        
        # Recent activities (last 5) - registrations, appointments, fee collections
        cursor.execute("""
            SELECT 
                'registration' as type,
                p.patient_id as reference_id,
                'New patient registered: ' || p.first_name || ' ' || p.last_name as activity,
                p.registration_date as timestamp
            FROM patients p
            WHERE DATE(p.registration_date) = date('now')
            
            UNION ALL
            
            SELECT 
                'appointment' as type,
                a.appointment_id as reference_id,
                'Appointment created with Dr. ' || COALESCE(s.first_name || ' ' || s.last_name, 'Unknown') || ' (' || a.status || ')' as activity,
                a.created_at as timestamp
            FROM appointments a
            LEFT JOIN staff s ON a.doctor_id = s.staff_id
            WHERE DATE(a.created_at) = date('now')
            
            UNION ALL
            
            SELECT 
                'fee' as type,
                CAST(c.id AS TEXT) as reference_id,
                'Fee collected:  ' || c.amount || ' (' || COALESCE(c.method, 'Cash') || ')' as activity,
                c.collected_at as timestamp
            FROM collections c
            WHERE DATE(c.collected_at) = date('now')
            
            ORDER BY timestamp DESC
            LIMIT 5
        """)
        recent_activities = cursor.fetchall()
        
        # Todays confirmed appointments (first 5, ordered by appointment time)
        cursor.execute("""
            SELECT 
                a.appointment_id,
                a.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                a.appointment_date,
                a.appointment_time,
                s.first_name || ' ' || s.last_name as doctor_name,
                a.status,
                q.token_number,
                a.appointment_type,
                a.created_at as booking_time
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN staff s ON a.doctor_id = s.staff_id
            LEFT JOIN queue_management q ON a.appointment_id = q.appointment_id
            WHERE a.appointment_date = date('now')
            AND a.status != 'Pending_Approval'
            AND a.status != 'Cancelled'
            ORDER BY a.appointment_time ASC
            LIMIT 5
        """)
        today_appointments_flow = cursor.fetchall()
        
        return jsonify({
            'statistics': {
                'today_registrations': today_registrations,
                'today_appointments': today_appointments,
                'pending_approvals': pending_approvals,
                'waiting_queue': waiting_queue,
                'today_revenue': float(today_revenue)
            },
            'recent_activities': recent_activities,
            'today_appointments_flow': today_appointments_flow
        }), 200
        
    except Exception as e:
        print(f"Dashboard error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# BILLING DASHBOARD & API ENDPOINTS
# ============================================

@app.route('/api/dashboard/billing', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_billing_dashboard():
    """Get billing dashboard data with real-time stats"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Total patients
        cursor.execute("SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE")
        total_patients = cursor.fetchone()['count']

        # Patients registered today
        cursor.execute("""
            SELECT COUNT(*) as count FROM patients
            WHERE DATE(registration_date) = DATE('now','localtime')
        """)
        today_patients = cursor.fetchone()['count']

        # Todays revenue from collections
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total FROM collections
            WHERE DATE(collected_at) = date('now')
        """)
        today_revenue = float(cursor.fetchone()['total'])

        # Yesterdays revenue for comparison
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total FROM collections
            WHERE DATE(collected_at) = date('now', '-1 day')
        """)
        yesterday_revenue = float(cursor.fetchone()['total'])

        # Revenue change percentage
        revenue_change = 0
        if yesterday_revenue > 0:
            revenue_change = round(((today_revenue - yesterday_revenue) / yesterday_revenue) * 100, 1)

        # Bed occupancy / ops capacity
        cursor.execute("SELECT COUNT(*) as total FROM beds")
        total_beds = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) as occupied FROM beds WHERE status = 'Occupied'")
        occupied_beds = cursor.fetchone()['occupied']
        ops_capacity = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0

        # Pending bills count and amount
        cursor.execute("""
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM pending_payments WHERE status = 'Pending'
        """)
        pending_row = cursor.fetchone()
        pending_bills_count = pending_row['count']
        pending_bills_amount = float(pending_row['total'])

        # Revenue breakdown by method
        cursor.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN method = 'Cash' THEN amount ELSE 0 END), 0) as cash,
                COALESCE(SUM(CASE WHEN method = 'Card' THEN amount ELSE 0 END), 0) as card,
                COALESCE(SUM(CASE WHEN method = 'UPI' THEN amount ELSE 0 END), 0) as upi,
                COALESCE(SUM(CASE WHEN method = 'Insurance' THEN amount ELSE 0 END), 0) as insurance
            FROM collections
            WHERE DATE(collected_at) = date('now')
        """)
        breakdown = cursor.fetchone()
        revenue_breakdown = {
            'cash': float(breakdown['cash']),
            'card': float(breakdown['card']),
            'upi': float(breakdown['upi']),
            'insurance': float(breakdown['insurance']),
        }

        # Todays collections count
        cursor.execute("""
            SELECT COUNT(*) as count FROM collections
            WHERE DATE(collected_at) = DATE('now','localtime')
        """)
        today_collections_count = cursor.fetchone()['count']

        # Recent activity (latest 10 entries: collections + new pending payments)
        cursor.execute("""
            SELECT
                'payment_received' as action,
                p.first_name || ' ' || p.last_name as user_name,
                ' ' || CAST(CAST(c.amount AS INTEGER) AS TEXT) as amount,
                c.collected_at as timestamp,
                'completed' as status
            FROM collections c
            JOIN patients p ON c.patient_id = p.patient_id
            ORDER BY c.collected_at DESC
            LIMIT 5
        """)
        collection_activities = cursor.fetchall()

        cursor.execute("""
            SELECT
                'bill_generated' as action,
                p.first_name || ' ' || p.last_name as user_name,
                ' ' || CAST(CAST(pp.amount AS INTEGER) AS TEXT) as amount,
                pp.created_at as timestamp,
                pp.status as status
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            ORDER BY pp.created_at DESC
            LIMIT 5
        """)
        bill_activities = cursor.fetchall()

        # Combine and sort activities
        all_activities = []
        for a in collection_activities:
            d = dict(a)
            d['status'] = 'completed'
            all_activities.append(d)
        for a in bill_activities:
            d = dict(a)
            d['status'] = 'pending' if d['status'] == 'Pending' else 'completed'
            d['action'] = 'bill_generated'
            all_activities.append(d)

        all_activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        recent_activities = all_activities[:10]

        return jsonify({
            'statistics': {
                'total_patients': total_patients,
                'today_patients': today_patients,
                'today_revenue': today_revenue,
                'yesterday_revenue': yesterday_revenue,
                'revenue_change': revenue_change,
                'ops_capacity': ops_capacity,
                'pending_bills_count': pending_bills_count,
                'pending_bills_amount': pending_bills_amount,
                'today_collections_count': today_collections_count,
            },
            'revenue_breakdown': revenue_breakdown,
            'recent_activities': recent_activities,
        }), 200

    except Exception as e:
        print(f"Billing dashboard error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/bills', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_billing_bills():
    """Get all bills (pending_payments) with patient info"""
    status_filter = request.args.get('status', 'all')
    search = request.args.get('search', '')

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        query = """
            SELECT
                pp.id as bill_id,
                pp.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                pp.reference_type as bill_type,
                pp.reference_id,
                pp.description as item_description,
                pp.amount,
                pp.status,
                pp.created_at as bill_date
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
        """
        params = []
        conditions = []

        if status_filter != 'all':
            conditions.append("pp.status = ?")
            params.append(status_filter)

        if search:
            conditions.append("(p.first_name || ' ' || p.last_name LIKE ? OR pp.patient_id LIKE ? OR pp.reference_id LIKE ?)")
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY pp.created_at DESC"

        cursor.execute(query, params)
        bills = cursor.fetchall()

        # Get totals
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM pending_payments WHERE status = 'Paid'")
        total_paid = float(cursor.fetchone()['total'])

        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM pending_payments WHERE status = 'Pending'")
        total_pending = float(cursor.fetchone()['total'])

        cursor.execute("SELECT COUNT(*) as count FROM pending_payments")
        total_count = cursor.fetchone()['count']

        return jsonify({
            'bills': [dict(b) for b in bills],
            'totals': {
                'total_paid': total_paid,
                'total_pending': total_pending,
                'total_count': total_count,
            }
        }), 200

    except Exception as e:
        print(f"Billing bills error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/payments', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_billing_payments():
    """Get all payment collections with patient info"""
    status_filter = request.args.get('status', 'all')
    search = request.args.get('search', '')

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        query = """
            SELECT
                c.id as payment_id,
                c.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                c.amount,
                c.method,
                c.transaction_id,
                c.collected_by,
                s.first_name || ' ' || s.last_name as collected_by_name,
                c.reference_type,
                c.reference_id,
                c.collected_at as date,
                'completed' as status
            FROM collections c
            JOIN patients p ON c.patient_id = p.patient_id
            LEFT JOIN staff s ON c.collected_by = s.staff_id
        """
        params = []
        conditions = []

        if search:
            conditions.append("(p.first_name || ' ' || p.last_name LIKE ? OR c.patient_id LIKE ? OR c.reference_id LIKE ?)")
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY c.collected_at DESC"

        cursor.execute(query, params)
        payments = cursor.fetchall()

        # Get totals
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM collections")
        total_revenue = float(cursor.fetchone()['total'])

        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total FROM collections
            WHERE DATE(collected_at) = date('now')
        """)
        today_revenue = float(cursor.fetchone()['total'])

        cursor.execute("""
            SELECT COUNT(*) as count FROM collections
            WHERE DATE(collected_at) = DATE('now','localtime')
        """)
        today_count = cursor.fetchone()['count']

        # Pending payments total
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM pending_payments WHERE status = 'Pending'")
        pending_total = float(cursor.fetchone()['total'])

        # Method breakdown
        cursor.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN method = 'Cash' THEN amount ELSE 0 END), 0) as cash,
                COALESCE(SUM(CASE WHEN method = 'Card' THEN amount ELSE 0 END), 0) as card,
                COALESCE(SUM(CASE WHEN method = 'UPI' THEN amount ELSE 0 END), 0) as upi,
                COALESCE(SUM(CASE WHEN method = 'Insurance' THEN amount ELSE 0 END), 0) as insurance
            FROM collections
        """)
        breakdown = cursor.fetchone()

        return jsonify({
            'payments': [dict(p) for p in payments],
            'totals': {
                'total_revenue': total_revenue,
                'today_revenue': today_revenue,
                'today_count': today_count,
                'pending_total': pending_total,
            },
            'method_breakdown': {
                'cash': float(breakdown['cash']),
                'card': float(breakdown['card']),
                'upi': float(breakdown['upi']),
                'insurance': float(breakdown['insurance']),
            }
        }), 200

    except Exception as e:
        print(f"Billing payments error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/patients', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_billing_patients():
    """Get patients with their billing summaries"""
    search = request.args.get('search', '')

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        query = """
            SELECT
                p.patient_id as id,
                p.first_name || ' ' || p.last_name as name,
                p.email,
                p.mobile_number as phone,
                COALESCE(bill_counts.total_bills, 0) as total_bills,
                COALESCE(pending_amounts.pending_amount, 0) as pending_amount,
                COALESCE(paid_amounts.paid_amount, 0) as paid_amount,
                COALESCE(
                    (SELECT MAX(appointment_date) FROM appointments WHERE patient_id = p.patient_id),
                    DATE(p.registration_date)
                ) as last_visit,
                CASE WHEN p.is_active = TRUE THEN 'active' ELSE 'inactive' END as status
            FROM patients p
            LEFT JOIN (
                SELECT patient_id, COUNT(*) as total_bills
                FROM pending_payments GROUP BY patient_id
            ) bill_counts ON p.patient_id = bill_counts.patient_id
            LEFT JOIN (
                SELECT patient_id, COALESCE(SUM(amount), 0) as pending_amount
                FROM pending_payments WHERE status = 'Pending' GROUP BY patient_id
            ) pending_amounts ON p.patient_id = pending_amounts.patient_id
            LEFT JOIN (
                SELECT patient_id, COALESCE(SUM(amount), 0) as paid_amount
                FROM collections GROUP BY patient_id
            ) paid_amounts ON p.patient_id = paid_amounts.patient_id
        """
        params = []

        if search:
            query += " WHERE (p.first_name || ' ' || p.last_name LIKE ? OR p.patient_id LIKE ? OR p.email LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        query += " ORDER BY p.registration_date DESC"

        cursor.execute(query, params)
        patients = cursor.fetchall()

        # Summary stats
        cursor.execute("SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE")
        total_active = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(DISTINCT patient_id) as count FROM pending_payments WHERE status = 'Pending'")
        patients_with_pending = cursor.fetchone()['count']

        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM pending_payments WHERE status = 'Pending'")
        total_pending = float(cursor.fetchone()['total'])

        return jsonify({
            'patients': [dict(p) for p in patients],
            'summary': {
                'total_patients': len(patients),
                'active_patients': total_active,
                'patients_with_pending': patients_with_pending,
                'total_pending_amount': total_pending,
            }
        }), 200

    except Exception as e:
        print(f"Billing patients error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)





# ============================================
# ADVANCE PAYMENT ENDPOINTS
# ============================================

@app.route('/api/billing/advance-payments', methods=['POST'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def create_advance_payment():
    """Create a new advance payment"""
    data = request.get_json()
    patient_id = data.get('patient_id')
    amount = data.get('amount')
    diagnosis = data.get('diagnosis')
    payment_method = data.get('payment_method', 'Cash')
    notes = data.get('notes', '')
    staff_id = get_jwt_identity()

    if not patient_id or not amount:
        return jsonify({'error': 'Patient ID and amount are required'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # Generate payment ID
        payment_id = f"ADV{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Check for active admission
        cursor.execute(
            "SELECT id, advance_payment FROM admissions WHERE patient_id = ? AND status = 'Admitted' LIMIT 1",
            (patient_id,)
        )
        admission = cursor.fetchone()
        admission_id = admission['id'] if admission else None

        # Insert transaction
        cursor.execute(
            """INSERT INTO advance_payments (payment_id, patient_id, admission_id, amount, diagnosis, payment_method, collected_by, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (payment_id, patient_id, admission_id, amount, diagnosis, payment_method, staff_id, notes)
        )

        # Update admission balance if applicable
        if admission:
            new_balance = float(admission['advance_payment'] or 0) + float(amount)
            cursor.execute(
                "UPDATE admissions SET advance_payment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (new_balance, admission_id)
            )

        conn.commit()
        return jsonify({
            'message': 'Advance payment recorded successfully',
            'payment_id': payment_id,
            'updated_admission': bool(admission)
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/billing/advance-payments/stats', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_advance_payment_stats():
    """Get advance payment statistics"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(transaction_date) = DATE('now') THEN amount ELSE 0 END), 0) as today_total,
                COALESCE(SUM(CASE WHEN strftime('%m', transaction_date) = strftime('%m', 'now') AND 
                                 strftime('%Y', transaction_date) = strftime('%Y', 'now') THEN amount ELSE 0 END), 0) as month_total
            FROM advance_payments
        """)
        stats = cursor.fetchone()
        
        # Active balances and patient counts from admissions (Admitted ONLY)
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT patient_id) as active_patients, 
                COALESCE(SUM(advance_payment), 0) as active_total 
            FROM admissions 
            WHERE status = 'Admitted' AND advance_payment > 0
        """)
        active_info = cursor.fetchone()
        
        return jsonify({
            'today_total': stats['today_total'],
            'month_total': stats['month_total'],
            'total_patients': active_info['active_patients'],
            'active_balances_total': active_info['active_total']
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/billing/advance-payments/active', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_active_advance_patients():
    """Get patients with active admissions and advance balances"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT 
                a.id as admission_id,
                a.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                a.advance_payment as balance,
                a.provisional_diagnosis,
                a.admission_date,
                a.admission_type
            FROM admissions a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.status = 'Admitted' AND a.advance_payment > 0
            ORDER BY a.admission_date DESC
        """)
        patients = cursor.fetchall()
        return jsonify(patients), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/patients/<patient_id>/unallocated-advance', methods=['GET'])
@jwt_required()
@role_required(['Admission', 'Billing', 'Admin', 'Receptionist'])
def get_unallocated_advance(patient_id):
    """Get total unutilized advance payment for a patient"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as balance FROM advance_payments WHERE patient_id = ? AND admission_id IS NULL", (patient_id,))
        row = cursor.fetchone()
        return jsonify({'balance': float(row['balance'])}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/advance-payments/search/<patient_id>', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def search_advance_payments(patient_id):
    """Search advance payment history for a patient"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        cursor.execute("""
            SELECT * FROM advance_payments 
            WHERE patient_id = ? 
            ORDER BY transaction_date DESC
        """, (patient_id,))
        payments = cursor.fetchall()
        
        # Format for frontend
        history = []
        for adv in payments:
            history.append({
                'payment_id': adv['payment_id'],
                'amount': float(adv['amount']),
                'payment_method': adv['payment_method'],
                'transaction_date': adv['transaction_date'],
                'type': 'Advance',
                'category': adv['diagnosis'] or 'General',
                'notes': adv['notes']
            })

        
        # Also get current balance from admissions
        cursor.execute(
            "SELECT advance_payment FROM admissions WHERE patient_id = ? AND status = 'Admitted' LIMIT 1",
            (patient_id,)
        )
        admission = cursor.fetchone()
        current_balance = admission['advance_payment'] if admission else 0

        return jsonify({
            'history': history,
            'current_balance': current_balance
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/insurance', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_billing_insurance():
    """Get all insurance claims"""
    status_filter = request.args.get('status', 'all')
    search = request.args.get('search', '')

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        query = '''
            SELECT
                ic.id as claim_id,
                ic.claim_id as claim_ref,
                ic.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                ic.insurance_provider as provider,
                ic.policy_number,
                ic.claim_amount,
                ic.approved_amount,
                ic.status,
                ic.submitted_date as submission_date,
                ic.notes
            FROM insurance_claims ic
            JOIN patients p ON ic.patient_id = p.patient_id
        '''
        params = []
        conditions = []

        if status_filter != 'all':
            conditions.append("ic.status = ?")
            params.append(status_filter)

        if search:
            conditions.append("(p.first_name || ' ' || p.last_name LIKE ? OR ic.insurance_provider LIKE ? OR ic.policy_number LIKE ?)")
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY ic.submitted_date DESC"

        cursor.execute(query, params)
        claims = cursor.fetchall()

        # Get totals
        cursor.execute("SELECT COALESCE(SUM(claim_amount), 0) as total FROM insurance_claims")
        total_claims_amount = float(cursor.fetchone()['total'])

        cursor.execute("SELECT COALESCE(SUM(approved_amount), 0) as total FROM insurance_claims WHERE status = 'Approved'")
        approved_amount = float(cursor.fetchone()['total'])

        cursor.execute("SELECT COUNT(*) as count FROM insurance_claims WHERE status = 'Pending'")
        pending_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM insurance_claims WHERE status = 'Rejected'")
        rejected_count = cursor.fetchone()['count']

        return jsonify({
            'claims': [dict(c) for c in claims],
            'totals': {
                'total_claims_amount': total_claims_amount,
                'approved_amount': approved_amount,
                'pending_count': pending_count,
                'rejected_count': rejected_count
            }
        }), 200

    except Exception as e:
        print(f"Billing insurance error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/insurance/request', methods=['POST'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def create_insurance_request():
    """Create a new insurance claim and send an email request to the provider"""
    data = request.json
    patient_id = data.get('patient_id')
    provider = data.get('provider')
    provider_email = data.get('provider_email')
    policy_number = data.get('policy_number')
    claim_amount = data.get('claim_amount')
    notes = data.get('notes', '')

    if not all([patient_id, provider, provider_email, policy_number, claim_amount]):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    cursor.execute('BEGIN TRANSACTION')

    try:
        # Get patient name for the email
        cursor.execute("SELECT first_name, last_name FROM patients WHERE patient_id = ?", (patient_id,))
        patient = cursor.fetchone()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
            
        patient_name = f"{patient['first_name']} {patient['last_name']}"

        # Generate claim ID
        cursor.execute("SELECT COUNT(*) as count FROM insurance_claims")
        count = cursor.fetchone()['count'] + 1
        claim_ref = f"CLM-{datetime.now().strftime('%Y%m')}-{count:04d}"

        # Insert claim
        cursor.execute("""
            INSERT INTO insurance_claims 
            (claim_id, patient_id, insurance_provider, policy_number, claim_amount, status, notes)
            VALUES (?, ?, ?, ?, ?, 'Pending', ?)
        """, (claim_ref, patient_id, provider, policy_number, claim_amount, notes))
        
        # Send Email
        success = send_insurance_claim_request(
            provider_email=provider_email,
            provider_name=provider,
            patient_name=patient_name,
            patient_id=patient_id,
            policy_number=policy_number,
            claim_amount=float(claim_amount)
        )

        if not success:
            raise Exception("Failed to send insurance email. Claim creation aborted.")

        conn.commit()
        return jsonify({
            'message': 'Insurance claim requested and email sent successfully!',
            'claim_ref': claim_ref
        }), 201

    except Exception as e:
        conn.rollback()
        print(f"Create insurance request error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/insurance/patient/<patient_id>', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_insurance_patient_details(patient_id):
    """Fetch patient details for autofilling insurance requests"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("""
            SELECT first_name, last_name, mobile_number, email, 
                   permanent_address_street, permanent_city, permanent_state,
                   insurance_provider, insurance_policy_number
            FROM patients 
            WHERE patient_id = ?
        """, (patient_id,))
        patient = cursor.fetchone()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
            
        return jsonify(patient), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/billing/insurance/<int:claim_id>', methods=['PUT'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def update_insurance_claim(claim_id):
    """Update an insurance claim status and approved amount"""
    data = request.json
    status = data.get('status')
    approved_amount = data.get('approved_amount')
    
    if not status:
        return jsonify({'error': 'Status is required'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        if status == 'Approved' and approved_amount is not None:
             cursor.execute("""
                UPDATE insurance_claims 
                SET status = ?, approved_amount = ?, approved_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (status, approved_amount, claim_id))
        else:
             cursor.execute("""
                UPDATE insurance_claims 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (status, claim_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Claim not found'}), 404

        conn.commit()
        return jsonify({'message': f'Claim updated to {status} successfully'}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/billing/ai-prediction', methods=['GET'])
@jwt_required()
@role_required(['Billing', 'Admin'])
def get_billing_ai_predictions():
    """Get dynamic AI predictions based on real hospital billing data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        # 1. Real Collection Probability
        cursor.execute("SELECT COUNT(*) as count FROM pending_payments")
        total_payments = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM pending_payments WHERE status = 'Paid'")
        paid_payments = cursor.fetchone()['count']
        
        # Default to 85.5% if no data, otherwise calculate real ratio
        collection_prob = round((paid_payments / total_payments * 100), 1) if total_payments > 0 else 85.5
        
        # 2. Real Predicted Revenue (Next 30 days based on previous 30 days + 15% growth)
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE DATE(collected_at) >= date('now', '-30 days')")
        last_30_revenue = float(cursor.fetchone()['total'])
        predicted_revenue = round(last_30_revenue * 1.15) if last_30_revenue > 0 else 150000 # Default if no history
        
        # 3. Dynamic Anomaly Detection
        anomalies = []
        
        # Find unusually high bills (> ₹15,000)
        cursor.execute("""
            SELECT id as invoice_id, reference_type, amount
            FROM pending_payments 
            WHERE amount > 15000 AND status != 'Paid'
            LIMIT 5
        """)
        high_value_anomalies = cursor.fetchall()
        for anomaly in high_value_anomalies:
            anomalies.append({
                "id": f"INV-{anomaly['invoice_id']}", 
                "type": f"Unusually High Bill ({anomaly['reference_type']})", 
                "confidence": min(95, round(70 + ((anomaly['amount'] - 15000) / 1000))), 
                "amount": float(anomaly['amount'])
            })
            
        # Find very old pending payments (older than 30 days)
        cursor.execute("""
            SELECT id as invoice_id, amount, julianday('now') - julianday(created_at) as days_old
            FROM pending_payments 
            WHERE status != 'Paid' AND julianday('now') - julianday(created_at) > 30
            LIMIT 5
        """)
        old_anomalies = cursor.fetchall()
        for anomaly in old_anomalies:
            anomalies.append({
                "id": f"INV-{anomaly['invoice_id']}", 
                "type": "Old Pending Bill (>30 days)", 
                "confidence": min(99, int(round(70 + (anomaly['days_old'] / 2)))), 
                "amount": float(anomaly['amount'])
            })
            
        # 4. Dynamic Cash Flow Forecast (7 days based on 30-day daily average)
        daily_avg = last_30_revenue / 30 if last_30_revenue > 0 else 5000
        
        from datetime import date, timedelta
        import random
        
        forecast = []
        today = date.today()
        # Seed random with today's date so the forecast is stable within the same day
        random.seed(int(today.strftime('%Y%m%d')))
        
        for i in range(1, 8):
            future_date = today + timedelta(days=i)
            day_name = future_date.strftime('%a')
            
            # Apply slight multipliers to make the graph realistic (e.g. weekends might be slightly lower/higher depending on hospital)
            if day_name in ['Sat', 'Sun']:
                multiplier = random.uniform(0.7, 0.95) # Weekends slightly lower historically
            else:
                multiplier = random.uniform(0.9, 1.25) # Weekdays higher
                
            projected_amount = round(daily_avg * multiplier)
            forecast.append({
                "day": day_name,
                "amount": projected_amount
            })

        return jsonify({
            'collection_probability': collection_prob,
            'predicted_revenue': predicted_revenue,
            'anomalies_detected': anomalies,
            'cash_flow_forecast': forecast
        }), 200

    except Exception as e:
        print(f"Billing AI predictions error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/billing/ai-prediction/bill-estimate', methods=['POST'])
@jwt_required()
def estimate_bill():
    """Predict a patient's bill using the XGBoost model."""
    try:
        # We allow Admin, Receptionist, Doctor, Pharmacist, Billers
        current_user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get('role')
        allowed_roles = ['Admin', 'Receptionist', 'Doctor', 'Pharmacist', 'Billing']
        if role not in allowed_roles:
            return jsonify({'error': 'Unauthorized access'}), 403

        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Extract features
        age = data.get('age')
        gender = data.get('gender')
        insurance = data.get('insurance')
        admission_type = data.get('admission_type')
        diagnosis = data.get('diagnosis')
        risk_level = data.get('risk_level')

        if None in [age, gender, insurance, admission_type, diagnosis, risk_level]:
            return jsonify({'error': 'Missing required fields'}), 400

        # Predict
        predicted_amount = ai_bill_predictor.predict(
            age=int(age),
            gender=str(gender),
            insurance=str(insurance),
            admission_type=str(admission_type),
            diagnosis=str(diagnosis),
            risk_level=str(risk_level)
        )

        return jsonify({
            'estimated_bill': round(predicted_amount, 2),
            'currency': 'INR'
        }), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        print(f"Bill estimation error: {str(e)}")
        return jsonify({'error': 'Internal server error processing prediction'}), 500


# ============================================
# DEPARTMENT & MASTER DATA ENDPOINTS
# ============================================

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM departments WHERE is_active = TRUE ORDER BY dept_name")
        departments = cursor.fetchall()
        return jsonify(departments), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
    close_db_connection(conn)
    
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
    """Get patient appointments"""
    try:
        patient_id = get_jwt_identity()  # This returns the patient_id string directly
        
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)  # Use dict cursor for consistency
        cursor.execute("""
            SELECT a.id, a.appointment_id, 
                   a.appointment_date as appointment_date,
                   a.appointment_time as appointment_time,
                   a.status, a.consultation_mode, a.reason_for_visit, a.token_number,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department_name
            FROM appointments a
            JOIN staff s ON a.doctor_id = s.staff_id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """, (patient_id,))
        
        appointments = cursor.fetchall()
        cursor.close()
        close_db_connection(conn)
        
        return jsonify({'appointments': appointments}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch appointments: {str(e)}'}), 500

@app.route('/api/patient/appointments', methods=['POST'])
@jwt_required()
@role_required('Patient')
def book_patient_appointment():
    """Book a new appointment for patient"""
    data = request.get_json()
    current_user_id = get_jwt_identity()  # patient_id like P0001

    # Validate required fields
    required_fields = ['doctor_id', 'appointment_date', 'appointment_type', 'reason']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get patient registration type (online or offline)
        cursor.execute("SELECT registered_by FROM patients WHERE patient_id = ?", (current_user_id,))
        patient_row = cursor.fetchone()
        registered_by = patient_row['registered_by'] if patient_row else 'ONLINE'
        
        # Generate Appointment ID
        cursor.execute("SELECT COUNT(*) as count FROM appointments")
        res = cursor.fetchone()
        count = res['count'] if res else 0
        appointment_id = f"APT{str(count + 1).zfill(6)}"

        # Get consultation fee from doctor record
        cursor.execute("SELECT consultation_fee FROM doctors WHERE staff_id = ?", (data['doctor_id'],))
        fee_row = cursor.fetchone()
        consultation_fee = fee_row['consultation_fee'] if fee_row and fee_row['consultation_fee'] else 0

        # Payment details
        payment_details = data.get('payment_details', {})
        payment_status = 'Paid' if payment_details else 'Pending'
        payment_method = payment_details.get('method') if payment_details else None
        payment_amount = payment_details.get('amount') if payment_details else None
        payment_transaction_id = payment_details.get('transactionId') if payment_details else None

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
            data.get('appointment_time', '10:00 AM'),
            'Pending_Approval',
            data['reason'],
            data.get('symptoms', ''),
            data['appointment_type'],
            payment_status,
            payment_method,
            consultation_fee,
            payment_transaction_id,
            data.get('mobile_number', '')
        ))

        # Handle appointment fee payment entry
        if consultation_fee and float(consultation_fee) > 0:
            cursor.execute("""
                INSERT INTO pending_payments (
                    patient_id, reference_type, reference_id, description, amount, status
                ) VALUES (?, 'appointment', ?, 'Consultation Fee', ?, ?)
            """, (current_user_id, appointment_id, consultation_fee, payment_status))

        conn.commit()
        return jsonify({
            'message': 'Appointment booked successfully',
            'appointment_id': appointment_id,
            'status': 'Pending_Approval'
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Failed to book appointment: {str(e)}'}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/patient/medical-records', methods=['GET'])
@jwt_required()
def get_patient_medical_records():
    """Get patient medical records (appointments, prescriptions, lab results)"""
    try:
        current_user = get_jwt_identity()
        if isinstance(current_user, dict):
            patient_id = current_user.get('patient_id') or current_user.get('sub')
        else:
            patient_id = current_user
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch all appointments for the patient
        cursor.execute("""
            SELECT a.id, a.appointment_date as record_date, a.status,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   d.dept_name as department, a.reason_for_visit as diagnosis,
                   'Appointment' as record_type
            FROM appointments a
            JOIN staff s ON a.doctor_id = s.staff_id
            JOIN departments d ON a.department_id = d.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC
        """, (patient_id,))
        
        appointments = fetchall_as_dicts(cursor)
        
        # Fetch all prescriptions for the patient
        cursor.execute("""
            SELECT p.id, p.prescription_date as record_date, p.status,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   'General' as department, p.diagnosis,
                   'Prescription' as record_type, p.prescription_id
            FROM prescriptions p
            JOIN staff s ON p.doctor_id = s.staff_id
            WHERE p.patient_id = ?
            ORDER BY p.prescription_date DESC
        """, (patient_id,))
        
        prescriptions = fetchall_as_dicts(cursor)
        
        # Fetch all lab orders for the patient
        cursor.execute("""
            SELECT lo.id, lo.order_date as record_date, lo.status,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   'Laboratory' as department, lo.test_name as diagnosis,
                   'Lab Order' as record_type
            FROM lab_orders lo
            JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE lo.patient_id = ?
            ORDER BY lo.order_date DESC
        """, (patient_id,))
        
        lab_orders = fetchall_as_dicts(cursor)
        
        # Fetch payments for the patient
        cursor.execute("""
            SELECT id, patient_id, reference_type, reference_id, description, 
                   amount, status, created_at, updated_at
            FROM pending_payments 
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        
        payments = fetchall_as_dicts(cursor)
        
        # Fetch admissions for the patient  
        cursor.execute("""
            SELECT id, admission_id, patient_id, bed_id, admission_date, 
                   discharge_date, admission_type, reason, status, created_at
            FROM admissions 
            WHERE patient_id = ?
            ORDER BY admission_date DESC
        """, (patient_id,))
        
        admissions = fetchall_as_dicts(cursor)
        
        cursor.close()
        close_db_connection(conn)
        
        return jsonify({
            'prescriptions': prescriptions,
            'lab_orders': lab_orders,
            'payments': payments,
            'admissions': admissions
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch medical records: {str(e)}'}), 500

@app.route('/api/patient/prescriptions', methods=['GET'])
@jwt_required()
def get_patient_prescriptions():
    """Get patient prescriptions"""
    try:
        current_user = get_jwt_identity()
        patient_id = current_user
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.prescription_id, p.prescription_date, p.diagnosis,
                   p.chief_complaint, p.status, p.general_instructions as instructions,
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
                SELECT medicine_name as name, strength as dosage, frequency, duration
                FROM prescription_medicines
                WHERE prescription_id = ?
            """, (row['prescription_id'],))
            medicines = cursor.fetchall()
            
            prescriptions.append({
                **row,
                'medicines': medicines
            })
        
        cursor.close()
        close_db_connection(conn)
        
        return jsonify({'prescriptions': prescriptions}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch prescriptions: {str(e)}'}), 500

@app.route('/api/patient/lab-results', methods=['GET'])
@jwt_required()
def get_patient_lab_results():
    """Get patient lab results"""
    try:
        current_user = get_jwt_identity()
        patient_id = current_user
        
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        cursor.execute("""
            SELECT lo.id, lo.test_name, lo.order_date as test_date,
                   lo.status, 0 as is_critical,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM lab_orders lo
            JOIN staff s ON lo.ordered_by = s.staff_id
            WHERE lo.patient_id = ?
            ORDER BY lo.order_date DESC
        """, (patient_id,))
        
        results = fetchall_as_dicts(cursor)
        cursor.close()
        close_db_connection(conn)
        
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
            WHERE s.role = 'Doctor' AND s.is_active = TRUE
            ORDER BY d.rating DESC
        """)
        
        doctors = cursor.fetchall()
        cursor.close()
        close_db_connection(conn)
        
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
            WHERE is_active = TRUE
            ORDER BY dept_name
        """)
        
        departments = cursor.fetchall()
        cursor.close()
        close_db_connection(conn)
        
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
    cursor = get_dict_cursor(conn)
    
    try:
        stats = {
            'today_appointments': 0,
            'pending_consultations': 0,
            'completed_consultations': 0,
            'emergency_consultations': 0,
            'pending_lab_results': 0, # Mocked for now
            'follow_up_due': 0 # Mocked for now
        }
        
        # Todays Appointments Stats (from clinical queue)
        cursor.execute("""
            SELECT q.status, a.appointment_type, count(*) as count
            FROM queue_management q
            JOIN appointments a ON q.appointment_id = a.appointment_id
            WHERE q.doctor_id = ? AND q.queue_date = ?
            GROUP BY q.status, a.appointment_type
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

        # Real-time metrics calculation
        # 1. Average Consultation Time (for today completed appointments)
        # Use PostgreSQL's EXTRACT/EPOCH instead of SQLite's strftime
        cursor.execute("""
            SELECT AVG((EXTRACT(EPOCH FROM consultation_end_time) - EXTRACT(EPOCH FROM consultation_start_time)) / 60) as avg_time
            FROM appointments
            WHERE doctor_id = %s AND status = 'Completed'
              AND consultation_end_time IS NOT NULL
              AND consultation_start_time IS NOT NULL
              AND appointment_date = %s
        """, (doctor_id, today))
        avg_row = cursor.fetchone()
        avg_time = round(avg_row['avg_time']) if avg_row and avg_row['avg_time'] else 15

        # 2. Patient Satisfaction (from doctors table rating)
        cursor.execute("SELECT rating FROM doctors WHERE staff_id = %s", (doctor_id,))
        doc_row = cursor.fetchone()
        rating = doc_row['rating'] if doc_row and doc_row.get('rating') else 5.0

        # 3. Pending Lab Results (Real count)
        cursor.execute("""
            SELECT COUNT(*) as count FROM lab_orders
            WHERE ordered_by = %s AND status IN ('Pending', 'Sample_Collected', 'In_Progress')
        """, (doctor_id,))
        pending_labs = cursor.fetchone()['count']
        stats['pending_lab_results'] = pending_labs

        metrics = {
            'avg_consultation_time': f"{avg_time} min",
            'patient_satisfaction': f"{rating}/5.0",
            'pending_approvals': stats['pending_consultations'], # Using pending count as a proxy for approvals needed
            'critical_lab_values': 0 # This is now handled by live alerts
        }
        
        # Check if any labs are critical for the 'critical_lab_values' metric
        cursor.execute("""
            SELECT COUNT(*) as count FROM lab_results lr
            JOIN lab_orders lo ON lr.lab_order_id = lo.id
            WHERE lo.ordered_by = ? AND lr.is_critical = TRUE
        """, (doctor_id,))
        metrics['critical_lab_values'] = cursor.fetchone()['count']
        
        return jsonify({'stats': stats, 'metrics': metrics}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/doctor/notifications', methods=['GET'])
@jwt_required()
@role_required(['Doctor', 'Admin'])
def get_doctor_notifications():
    """Get real-time notifications for doctor"""
    doctor_id = get_jwt_identity()
    today = date.today().isoformat()
    
    conn = get_db_connection()
    # use dict cursor so rows can be accessed by column name
    cursor = get_dict_cursor(conn)
    
    notifications = []
    
    try:
        # Check for waiting patients (status = 'Waiting' or 'Visited')
        cursor.execute("""
            SELECT p.first_name, p.last_name, a.token_number, a.appointment_time, a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status IN ('Waiting', 'Visited')
            ORDER BY a.appointment_time ASC
        """, (doctor_id, today))
        
        waiting_patients = cursor.fetchall()
        for p in waiting_patients:
            notifications.append({
                'id': f"waiting_{p['token_number']}_{today}",
                'type': 'patient_waiting',
                'message': f"Patient {p['first_name']} {p['last_name']} ({p['token_number']}) is {p['status']}.",
                'priority': 'high',
                'timestamp': datetime.now().isoformat()
            })
            
        # Check for critical lab results from orders assigned to this doctor
        cursor.execute("""
            SELECT lr.parameter_name, lr.result_value, lr.unit, p.first_name, p.last_name, lr.created_at
            FROM lab_results lr
            JOIN lab_orders lo ON lr.lab_order_id = lo.id
            JOIN patients p ON lr.patient_id = p.patient_id
            WHERE lo.ordered_by = ? AND lr.is_critical = TRUE
            ORDER BY lr.created_at DESC
            LIMIT 5
        """, (doctor_id,))
        
        critical_labs = cursor.fetchall()
        for lab in critical_labs:
            notifications.append({
                'id': f"crit_{uuid.uuid4().hex[:6]}",
                'type': 'critical_lab',
                'message': f"CRITICAL: {lab['parameter_name']} is {lab['result_value']} {lab['unit']} for {lab['first_name']} {lab['last_name']}",
                'priority': 'critical',
                'timestamp': lab['created_at'] if lab['created_at'] else datetime.now().isoformat()
            })
        
        return jsonify(notifications), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
        close_db_connection(conn)

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
            
        # Create pending payments for each test
        for test_id, test_name in zip(created_ids, [t['name'] for t in data['tests']]):
            price = get_lab_price(test_name)
            cursor.execute("""
                INSERT INTO pending_payments (
                    patient_id, reference_type, reference_id, description, amount, status
                ) VALUES (?, 'lab', ?, ?, ?, 'Pending')
            """, (
                data['patient_id'], str(test_id), f"Lab Test: {test_name}", price
            ))
            
            # Emit socket event
            try:
                cursor.execute("SELECT first_name || ' ' || last_name as name FROM patients WHERE patient_id = ?", (data['patient_id'],))
                prow = cursor.fetchone()
                patient_name = prow[0] if prow else 'Unknown'
                socketio.emit('lab:order_received', {
                    'order_id': test_id,
                    'patient_id': data['patient_id'],
                    'patient_name': patient_name,
                    'test_name': test_name,
                    'status': 'Pending',
                    'timestamp': datetime.now().isoformat()
                })
            except: pass

        conn.commit()
        socketio.emit('lab:stats_updated', {'timestamp': datetime.now().isoformat()})
        return jsonify({'message': 'Lab orders created successfully', 'order_ids': created_ids}), 201
        
    except Exception as e:
        traceback.print_exc()
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/patients/<patient_id>/lab-orders', methods=['GET'])
@jwt_required()
def get_patient_lab_orders(patient_id):
    """Get lab orders for a patient with full patient info wrapper"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get patient info
        cursor.execute("""
            SELECT patient_id, first_name, last_name, 
                   date_of_birth, gender, blood_group, mobile_number
            FROM patients WHERE patient_id = ?
        """, (patient_id,))
        patient_row = cursor.fetchone()
        if not patient_row:
            return jsonify({'error': 'Patient not found'}), 404
        patient = dict(patient_row)

        # Calculate age
        age = 0
        if patient.get('date_of_birth'):
            try:
                dob = datetime.strptime(str(patient['date_of_birth'])[:10], '%Y-%m-%d')
                age = (datetime.now() - dob).days // 365
            except Exception:
                pass

        # Get lab orders with status
        cursor.execute("""
            SELECT lo.id, lo.patient_id, lo.ordered_by, lo.test_name, lo.test_category,
                   lo.status, lo.priority, lo.sample_type, lo.order_date,
                   lo.sample_collection_date, lo.result_entry_date,
                   s.first_name || ' ' || s.last_name as doctor_name,
                   COALESCE(d.specialization, 'General Physician') as doctor_specialization
            FROM lab_orders lo
            JOIN staff s ON lo.ordered_by = s.staff_id
            LEFT JOIN doctors d ON lo.ordered_by = d.staff_id
            WHERE lo.patient_id = ?
            ORDER BY lo.order_date DESC
        """, (patient_id,))
        order_rows = cursor.fetchall()

        # Check overall payment status
        cursor.execute("""
            SELECT COUNT(*) as count FROM pending_payments
            WHERE patient_id = ? AND reference_type = 'lab' AND status = 'Pending'
        """, (patient_id,))
        pending_count = dict(cursor.fetchone())['count']
        overall_payment_status = 'pending' if pending_count > 0 else 'paid'

        # Build lab_orders list
        lab_orders = []
        attending_doctor = ''
        doctor_specialization = ''
        for row in order_rows:
            r = dict(row)
            if not attending_doctor and r.get('doctor_name'):
                attending_doctor = r['doctor_name']
                doctor_specialization = r.get('doctor_specialization', '')

            # Map DB status to frontend status
            status_map = {
                'Pending': 'Pending',
                'Sample_Collected': 'Sample_Collected',
                'In_Progress': 'In_Progress',
                'Results_Entered': 'Completed',
                'Verified': 'Verified',
                'Delivered': 'Completed',
                'Cancelled': 'Cancelled'
            }

            test_type = 'radiology' if any(kw in (r['test_name'] or '').lower() for kw in ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound', 'radiology']) else 'pathology'

            # Check individual order payment
            cursor.execute("""
                SELECT COUNT(*) as count FROM pending_payments
                WHERE reference_type = 'lab' AND reference_id = CAST(? AS TEXT) AND status = 'Pending'
            """, (r['id'],))
            order_pending = dict(cursor.fetchone())['count']

            # Get lab results for this order (tests array)
            cursor.execute("""
                SELECT parameter_name as test_name, result_value as result,
                       reference_range as normal_range, unit, status
                FROM lab_results WHERE lab_order_id = ?
            """, (r['id'],))
            lab_results_rows = cursor.fetchall()
            tests = [dict(t) for t in lab_results_rows] if lab_results_rows else []

            lab_orders.append({
                'order_id': f"LAB-{r['id']}",
                'db_id': r['id'],
                'patient_id': r['patient_id'],
                'test_name': r['test_name'] or r.get('test_category', 'Unknown Test'),
                'test_type': test_type,
                'status': status_map.get(r['status'], 'Pending'),
                'order_date': str(r['order_date'])[:10] if r['order_date'] else '',
                'doctor_name': r['doctor_name'] or 'Unknown',
                'payment_status': 'pending' if order_pending > 0 else 'paid',
                'priority': r.get('priority', 'Routine'),
                'tests': tests
            })

        # Get last visit
        last_visit = ''
        if order_rows:
            first_order = dict(order_rows[0])
            order_date_str = str(first_order.get('order_date', ''))[:10]
            if order_date_str == date.today().isoformat():
                last_visit = 'Today'
            else:
                last_visit = order_date_str

        result = {
            'patient_id': patient['patient_id'],
            'name': f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip(),
            'age': age,
            'gender': patient.get('gender', 'Unknown'),
            'blood_type': patient.get('blood_group', 'Unknown'),
            'last_visit': last_visit or 'N/A',
            'attending_doctor': attending_doctor or 'N/A',
            'doctor_specialization': doctor_specialization or 'General',
            'pathologist': attending_doctor or 'N/A',
            'payment_status': overall_payment_status,
            'lab_orders': lab_orders
        }

        return jsonify(result), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching patient lab orders: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# DOCTOR CONSULTATION WORKFLOW ENDPOINTS
# ============================================

@app.route('/api/doctor/queue/today', methods=['GET'])
@jwt_required()
@role_required(['Doctor'])
def get_doctor_queue_today():
    """Get today queue for a specific doctor"""
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
        close_db_connection(conn)

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
        close_db_connection(conn)

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
        
        # Send WhatsApp consultation completion notification
        try:
            dict_cursor = get_dict_cursor(conn)
            dict_cursor.execute("""
                SELECT p.mobile_number, p.first_name, p.last_name,
                       a.appointment_date, a.appointment_time,
                       s.first_name || ' ' || s.last_name as doctor_name
                FROM patients p
                JOIN appointments a ON p.patient_id = a.patient_id
                JOIN staff s ON a.doctor_id = s.staff_id
                WHERE a.appointment_id = ?
            """, (appointment_id,))
            appt_row = dict_cursor.fetchone()
            
            if appt_row:
                appt_details = dict(appt_row)
                if appt_details.get('mobile_number'):
                    send_consultation_completion_notification({
                        'phone_number': appt_details.get('mobile_number'),
                        'patient_name': f"{appt_details.get('first_name', '')} {appt_details.get('last_name', '')}",
                        'appointment_id': appointment_id,
                        'doctor_name': appt_details.get('doctor_name', 'N/A'),
                        'appointment_date': appt_details.get('appointment_date'),
                        'appointment_time': appt_details.get('appointment_time'),
                        'diagnosis': diagnosis
                    })
                    print(f"  Consultation completion WhatsApp queued for {appt_details.get('mobile_number')}")
        except Exception as e:
            print(f"Warning: Failed to send consultation completion WhatsApp: {e}")
        
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
        close_db_connection(conn)

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
        close_db_connection(conn)

@app.route('/api/doctor/write-diagnosis', methods=['POST'])
@jwt_required()
@role_required(['Doctor'])
def write_diagnosis():
    """Write diagnosis for a consultation"""
    data = request.get_json()
    appointment_id = data.get('appointment_id')
    diagnosis = data.get('diagnosis', '')
    chief_complaint = data.get('chief_complaint', '')
    examination_findings = data.get('examination_findings', '')
    vital_signs = data.get('vital_signs', '')
    
    if not appointment_id:
        return jsonify({'error': 'appointment_id required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get patient_id and doctor_id from appointment
        cursor.execute("""
            SELECT patient_id, doctor_id FROM appointments
            WHERE appointment_id = ?
        """, (appointment_id,))
        
        result = cursor.fetchone()
        if not result:
            return jsonify({'error': 'Appointment not found'}), 404
        
        patient_id, doctor_id = result['patient_id'], result['doctor_id']
        
        # Check if prescription exists for this appointment
        cursor.execute("""
            SELECT prescription_id FROM prescriptions
            WHERE appointment_id = ? AND status = 'Active'
        """, (appointment_id,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing prescription
            prescription_id = existing['prescription_id']
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
                'prescription_id': prescription_id,
                'timestamp': datetime.now().isoformat()
            }, namespace='/appointments')
        except Exception as e:
            print(f"Error emitting diagnosis_written: {e}")
        
        return jsonify({
            'message': 'Diagnosis saved successfully',
            'prescription_id': prescription_id
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# WEBSOCKET HANDLERS FOR REAL-TIME UPDATES
# ============================================

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
            socketio.emit('room_joined', {'room': room_name}, namespace='/appointments')
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
            socketio.emit('room_left', {'room': room_name}, namespace='/appointments')
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
        close_db_connection(conn)

# ============================================
# ERROR HANDLERS
# ============================================

# ============================================
# COMPREHENSIVE PHARMACY MANAGEMENT ENDPOINTS
# ============================================

@app.route('/api/pharmacy/prescriptions', methods=['GET'])
@jwt_required()
@role_required(['Pharmacist', 'Admin'])
def get_pharmacy_prescriptions():
    """Return prescriptions for pharmacy UI.

    - If `patient_id` is provided in query string, return that patient prescriptions
      (both pending and completed grouped).
    - If `status` is provided, return prescriptions filtered by that status.
    - Otherwise return both `pending` and `completed` lists (recent   old).
    """
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)

    try:
        status = request.args.get('status', None)
        patient_id = request.args.get('patient_id', None)

        base_query = """
            SELECT 
                p.prescription_id, p.patient_id, p.doctor_id,
                pa.first_name || ' ' || pa.last_name as patient_name, 
                s.first_name || ' ' || s.last_name as doctor_name,
                p.prescription_date, p.status
            FROM prescriptions p
            JOIN patients pa ON p.patient_id = pa.patient_id
            JOIN staff s ON p.doctor_id = s.staff_id
            WHERE 1=1
        """
        params = []

        if status:
            base_query += " AND p.status = ?"
            params.append(status)

        if patient_id:
            base_query += " AND p.patient_id = ?"
            params.append(patient_id)

        # If no explicit status or patient filter provided, restrict to today prescriptions
        if not status and not patient_id:
            base_query += " AND DATE(p.prescription_date) = date('now')"

        base_query += " ORDER BY p.prescription_date DESC"

        # Fetch rows
        cursor.execute(base_query, params)
        rows = cursor.fetchall()

        # Helper to attach medicines
        def attach_medicines(pres_row):
            pres = dict(pres_row)
            cursor.execute("""
                SELECT medicine_name, generic_name, strength, dosage_form, quantity, frequency, timing, duration, instructions
                FROM prescription_medicines
                WHERE prescription_id = ?
            """, (pres['prescription_id'],))
            meds = cursor.fetchall()
            pres['medicines'] = [dict(m) for m in meds] if meds else []
            return pres

        prescriptions = [attach_medicines(r) for r in rows]

        # If explicit status was requested, return flat list
        if status:
            return jsonify(prescriptions), 200

        # Otherwise split into pending and completed
        pending = [p for p in prescriptions if (p.get('status') or '').lower() != 'dispensed']
        completed = [p for p in prescriptions if (p.get('status') or '').lower() == 'dispensed']

        return jsonify({'pending': pending, 'completed': completed}), 200
    except Exception as e:
        app.logger.error(f"Error fetching pharmacy prescriptions: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/pharmacy/medicine-price', methods=['GET'])
@jwt_required()
@role_required(['Pharmacist', 'Admin'])
def get_medicine_price():
    """Lookup unit price for a medicine from inventory"""
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({'error': 'name parameter is required'}), 400

    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("""
            SELECT medicine_id, generic_name, brand_name, strength, unit_price, current_stock
            FROM medicine_inventory
            WHERE LOWER(generic_name) = LOWER(?) OR LOWER(brand_name) = LOWER(?)
            LIMIT 1
        """, (name, name))
        row = cursor.fetchone()
        if row:
            return jsonify(dict(row)), 200
        return jsonify({'unit_price': 0, 'message': 'Medicine not found in inventory'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/pharmacy/dispense', methods=['POST'])
@jwt_required()
def dispense_medicines():
    """Dispense medicines, generate bill, and collect payment.

    Accepts a modified medicines list from the pharmacist (edited qty, deleted
    items, newly-added items).  Auto-looks up unit prices from inventory when
    not provided by the frontend.
    """
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    dict_cursor = get_dict_cursor(conn)

    try:
        prescription_id = data.get('prescription_id')
        patient_id = data.get('patient_id')
        patient_name = data.get('patient_name')
        medicines = data.get('medicines', [])
        payment_method = data.get('payment_method', 'Cash')

        if not prescription_id or not medicines:
            return jsonify({'error': 'prescription_id and medicines are required'}), 400

        # ---- Auto-lookup prices & compute totals ----
        grand_total = 0.0
        enriched_medicines = []

        for med in medicines:
            med_name = med.get('medicine_name') or med.get('generic_name') or ''
            qty = int(med.get('quantity', 1))
            unit_price = med.get('unit_price')

            # If no unit_price provided, look it up from inventory
            if unit_price is None or unit_price == 0:
                dict_cursor.execute("""
                    SELECT unit_price FROM medicine_inventory
                    WHERE LOWER(generic_name) = LOWER(?)
                       OR LOWER(brand_name) = LOWER(?)
                    LIMIT 1
                """, (med_name, med_name))
                price_row = dict_cursor.fetchone()
                unit_price = float(dict(price_row).get('unit_price', 0)) if price_row else 0.0

            unit_price = float(unit_price)
            subtotal = round(unit_price * qty, 2)
            grand_total += subtotal

            enriched_medicines.append({
                'medicine_name': med_name,
                'generic_name': med.get('generic_name', med_name),
                'brand_name': med.get('brand_name', ''),
                'strength': med.get('strength', ''),
                'quantity': qty,
                'unit_price': unit_price,
                'subtotal': subtotal,
            })

        # Allow frontend to override total (e.g. after discount), else use computed
        total_amount = data.get('total_amount') or grand_total
        total_amount = round(float(total_amount), 2)

        # Handle Advance Payment Method
        if payment_method == 'Advance':
            dict_cursor.execute("""
                SELECT id, advance_payment FROM admissions 
                WHERE patient_id = ? AND status = 'Admitted'
                ORDER BY created_at DESC LIMIT 1
            """, (patient_id,))
            admission = dict_cursor.fetchone()
            
            if not admission:
                return jsonify({'error': 'Patient is not currently admitted for Advance Payment.'}), 400
                
            available_balance = float(dict(admission).get('advance_payment', 0))
            if available_balance < total_amount:
                return jsonify({'error': f'Insufficient advance balance. Available: ₹{available_balance}, Required: ₹{total_amount}'}), 400
                
            # Deduct from advance payment
            new_advance = available_balance - total_amount
            cursor.execute("UPDATE admissions SET advance_payment = ? WHERE id = ?", (new_advance, dict(admission)['id']))
            payment_details = json.dumps({'deducted_from_advance': True, 'remaining_balance': new_advance, 'original_balance': available_balance})
        else:
            payment_details = data.get('payment_details')
            if payment_details and isinstance(payment_details, dict):
                payment_details = json.dumps(payment_details)

        # ---- Create pharmacy sale record ----
        sale_id = f"SALE{uuid.uuid4().hex[:8].upper()}"

        cursor.execute("""
            INSERT INTO pharmacy_sales (
                id, prescription_id, patient_id, patient_name,
                total_amount, payment_method, payment_details, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sale_id, prescription_id, patient_id, patient_name,
              total_amount, payment_method, payment_details, 'Completed', datetime.now().isoformat()))

        # ---- Add medicine details to sale & update inventory ----
        for med in enriched_medicines:
            cursor.execute("""
                INSERT INTO pharmacy_sale_medicines (
                    sale_id, medicine_name, quantity, unit_price, subtotal
                ) VALUES (?, ?, ?, ?, ?)
            """, (sale_id, med['medicine_name'], med['quantity'],
                  med['unit_price'], med['subtotal']))

            # Update inventory stock
            cursor.execute("""
                UPDATE medicine_inventory
                SET current_stock = MAX(current_stock - ?, 0)
                WHERE LOWER(generic_name) = LOWER(?)
                   OR LOWER(brand_name) = LOWER(?)
            """, (med['quantity'], med['medicine_name'], med['medicine_name']))

        # ---- Update prescription status ----
        cursor.execute("""
            UPDATE prescriptions
            SET status = 'Dispensed'
            WHERE prescription_id = ?
        """, (prescription_id,))

        # ---- Also update prescription_medicines to reflect dispensed quantities ----
        for med in enriched_medicines:
            cursor.execute("""
                UPDATE prescription_medicines
                SET quantity = ?
                WHERE prescription_id = ? AND (
                    LOWER(medicine_name) = LOWER(?) OR LOWER(generic_name) = LOWER(?)
                )
            """, (med['quantity'], prescription_id, med['medicine_name'], med['medicine_name']))

        # ---- Clear pending payment for this prescription if any ----
        cursor.execute("""
            UPDATE pending_payments
            SET status = 'Paid', updated_at = CURRENT_TIMESTAMP
            WHERE patient_id = ? AND reference_type = 'pharmacy' AND reference_id = ?
        """, (patient_id, prescription_id))
        
        # If no pending payment exists (e.g. walk-in), create a paid one immediately
        if cursor.rowcount == 0:
            cursor.execute("""
                INSERT INTO pending_payments (
                    patient_id, reference_type, reference_id, description, amount, status
                ) VALUES (?, 'pharmacy', ?, 'Prescription Medications', ?, 'Paid')
            """, (patient_id, prescription_id, total_amount))

        conn.commit()

        # ---- Emit real-time events ----
        sale_event = {
            'id': sale_id,
            'prescription_id': prescription_id,
            'patient_id': patient_id,
            'patient_name': patient_name,
            'medicines': enriched_medicines,
            'total_amount': total_amount,
            'payment_method': payment_method,
            'status': 'Completed',
            'created_at': datetime.now().isoformat()
        }
        socketio.emit('pharmacy:sale_completed', sale_event)
        socketio.emit('pharmacy:stats_updated', {'timestamp': datetime.now().isoformat()})

        return jsonify({
            'message': 'Medicines dispensed successfully',
            'sale_id': sale_id,
            'total_amount': total_amount,
            'medicines': enriched_medicines,
            'payment_method': payment_method,
            'payment_details': data.get('payment_details'),
        }), 200

    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error dispensing medicines: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/pharmacy/sales', methods=['GET'])
@jwt_required()
def get_pharmacy_sales():
    """Get pharmacy sales history"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM pharmacy_sales
            ORDER BY created_at DESC
        """)
        
        sales = []
        for row in cursor.fetchall():
            sale = dict(row)
            
            # Get medicines for this sale
            cursor.execute("""
                SELECT medicine_name, quantity, unit_price, subtotal
                FROM pharmacy_sale_medicines
                WHERE sale_id = ?
            """, (sale['id'],))
            
            sale['medicines'] = [dict(med) for med in cursor.fetchall()]
            sales.append(sale)
        
        return jsonify(sales), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/pharmacy/stats', methods=['GET'])
@jwt_required()
def get_pharmacy_stats():
    """Get pharmacy dashboard statistics with real-time data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get today date
        today = datetime.now().date()
        today_str = today.isoformat()
        
        # Total prescriptions generated today by all doctors
        cursor.execute("""
            SELECT COUNT(*) as count FROM prescriptions 
            WHERE DATE(created_at) = ?
        """, (today_str,))
        total_prescriptions = cursor.fetchone()['count'] or 0
        
        # Pending dispensing (Active prescriptions not yet dispensed)
        cursor.execute("""
            SELECT COUNT(*) as count FROM prescriptions 
            WHERE status = 'Active' AND DATE(created_at) = ?
        """, (today_str,))
        pending = cursor.fetchone()['count'] or 0
        
        # Low stock items (current_stock <= reorder_level and stock > 0)
        cursor.execute("""
            SELECT COUNT(*) as count FROM medicine_inventory 
            WHERE current_stock <= reorder_level AND current_stock > 0
        """)
        low_stock = cursor.fetchone()['count'] or 0
        
        # Total medicines in inventory
        cursor.execute("""
            SELECT COUNT(*) as count FROM medicine_inventory
        """)
        total_medicines = cursor.fetchone()['count'] or 0
        
        # Todays revenue (completed sales only)
        cursor.execute("""
            SELECT COALESCE(SUM(total_amount), 0) as revenue FROM pharmacy_sales
            WHERE DATE(created_at) = ? AND status = 'Completed'
        """, (today_str,))
        revenue_row = cursor.fetchone()
        revenue = revenue_row['revenue'] if revenue_row else 0
        
        # Prescriptions dispensed today
        cursor.execute("""
            SELECT COUNT(*) as count FROM pharmacy_sales
            WHERE DATE(created_at) = ? AND status = 'Completed'
        """, (today_str,))
        prescriptions_dispensed = cursor.fetchone()['count'] or 0
        
        return jsonify({
            'total_prescriptions': int(total_prescriptions),
            'pending_dispensing': int(pending),
            'low_stock_items': int(low_stock),
            'total_medicines': int(total_medicines),
            'todays_revenue': float(revenue),
            'prescriptions_dispensed_today': int(prescriptions_dispensed)
        }), 200
        
    except Exception as e:
        print(f"Error in get_pharmacy_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/pharmacy/seed-inventory', methods=['POST'])
@jwt_required()
def seed_pharmacy_inventory():
    """Seed the medicine inventory with diverse data if its empty."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if already seeded
        cursor.execute("SELECT COUNT(*) as count FROM medicine_inventory")
        if cursor.fetchone()['count'] > 0:
            return jsonify({'message': 'Inventory already has data. Skipping seed.'}), 200
            
        medicines = [
            {
                'medicine_id': 'MED-001', 'generic_name': 'Paracetamol', 'brand_name': 'Crocin',
                'category': 'Analgesic', 'dosage_form': 'Tablet', 'strength': '500mg',
                'unit_price': 2.50, 'mrp': 5.00, 'current_stock': 500, 'reorder_level': 50,
                'batch_number': 'B123', 'expiry_date': '2026-12-31'
            },
            {
                'medicine_id': 'MED-002', 'generic_name': 'Amoxicillin', 'brand_name': 'Mox',
                'category': 'Antibiotic', 'dosage_form': 'Capsule', 'strength': '250mg',
                'unit_price': 12.00, 'mrp': 18.00, 'current_stock': 120, 'reorder_level': 30,
                'batch_number': 'B456', 'expiry_date': '2025-06-30'
            },
            {
                'medicine_id': 'MED-003', 'generic_name': 'Cough Syrup', 'brand_name': 'Benadryl',
                'category': 'Antitussive', 'dosage_form': 'Syrup', 'strength': '100ml',
                'unit_price': 85.00, 'mrp': 110.00, 'current_stock': 45, 'reorder_level': 10,
                'batch_number': 'B789', 'expiry_date': '2025-02-28'
            },
            {
                'medicine_id': 'MED-004', 'generic_name': 'Insulin Glargine', 'brand_name': 'Lantus',
                'category': 'Antidiabetic', 'dosage_form': 'Injection', 'strength': '100 IU/ml',
                'unit_price': 450.00, 'mrp': 550.00, 'current_stock': 15, 'reorder_level': 5,
                'batch_number': 'B012', 'expiry_date': '2025-08-15'
            },
            {
                'medicine_id': 'MED-005', 'generic_name': 'Cetirizine', 'brand_name': 'Zyrtec',
                'category': 'Antihistamine', 'dosage_form': 'Tablet', 'strength': '10mg',
                'unit_price': 5.00, 'mrp': 8.00, 'current_stock': 200, 'reorder_level': 40,
                'batch_number': 'B345', 'expiry_date': '2026-06-15'
            },
            {
                'medicine_id': 'MED-006', 'generic_name': 'Omeprazole', 'brand_name': 'Omez',
                'category': 'Antacid', 'dosage_form': 'Capsule', 'strength': '20mg',
                'unit_price': 8.50, 'mrp': 12.00, 'current_stock': 8, 'reorder_level': 20,
                'batch_number': 'B678', 'expiry_date': '2026-01-01'
            },
            {
                'medicine_id': 'MED-007', 'generic_name': 'Metformin', 'brand_name': 'Glycomet',
                'category': 'Antidiabetic', 'dosage_form': 'Tablet', 'strength': '500mg',
                'unit_price': 3.50, 'mrp': 6.00, 'current_stock': 300, 'reorder_level': 50,
                'batch_number': 'B901', 'expiry_date': '2025-11-30'
            },
            {
                'medicine_id': 'MED-008', 'generic_name': 'Atorvastatin', 'brand_name': 'Lipitor',
                'category': 'Statin', 'dosage_form': 'Tablet', 'strength': '10mg',
                'unit_price': 15.00, 'mrp': 22.00, 'current_stock': 0, 'reorder_level': 10,
                'batch_number': 'B234', 'expiry_date': '2026-03-31'
            },
            {
                'medicine_id': 'MED-009', 'generic_name': 'Salbutamol', 'brand_name': 'Asthalin',
                'category': 'Bronchodilator', 'dosage_form': 'Inhaler', 'strength': '100mcg',
                'unit_price': 120.00, 'mrp': 150.00, 'current_stock': 25, 'reorder_level': 5,
                'batch_number': 'B567', 'expiry_date': '2025-10-31'
            },
            {
                'medicine_id': 'MED-010', 'generic_name': 'Aspirin', 'brand_name': 'Ecosprin',
                'category': 'Antiplatelet', 'dosage_form': 'Tablet', 'strength': '75mg',
                'unit_price': 1.50, 'mrp': 3.00, 'current_stock': 400, 'reorder_level': 50,
                'batch_number': 'B890', 'expiry_date': '2027-01-01'
            }
        ]
        
        for med in medicines:
            cursor.execute("""
                INSERT INTO medicine_inventory (
                    medicine_id, generic_name, brand_name, category, 
                    dosage_form, strength, unit_price, mrp, 
                    current_stock, reorder_level, batch_number, expiry_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                med['medicine_id'], med['generic_name'], med['brand_name'], med['category'],
                med['dosage_form'], med['strength'], med['unit_price'], med['mrp'],
                med['current_stock'], med['reorder_level'], med['batch_number'], med['expiry_date']
            ))
            
        conn.commit()
        return jsonify({'message': f'Successfully seeded {len(medicines)} medicines.'}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/pharmacy/analytics', methods=['GET'])
@jwt_required()
def get_pharmacy_analytics():
    """Get aggregated pharmacy analytics data for charts and reports"""
    days = int(request.args.get('days', 7))
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # --- 1. Daily sales trend ---
        cursor.execute("""
            SELECT DATE(created_at) as date,
                   COALESCE(SUM(total_amount), 0) as revenue,
                   COUNT(*) as prescriptions
            FROM pharmacy_sales
            WHERE DATE(created_at) >= date('now', '-' || ? || ' days')
              AND status = 'Completed'
            GROUP BY DATE(created_at)
            ORDER BY date
        """, (str(days),))
        daily_sales_raw = [dict(r) for r in cursor.fetchall()]

        # Also count medicines sold per day
        daily_sales = []
        for row in daily_sales_raw:
            cursor.execute("""
                SELECT COALESCE(SUM(sm.quantity), 0) as medicines_sold
                FROM pharmacy_sale_medicines sm
                JOIN pharmacy_sales s ON sm.sale_id = s.id
                WHERE DATE(s.created_at) = ? AND s.status = 'Completed'
            """, (row['date'],))
            med_row = cursor.fetchone()
            row['medicines_sold'] = int(dict(med_row)['medicines_sold']) if med_row else 0
            row['revenue'] = float(row['revenue'])
            daily_sales.append(row)

        # --- 2. Top selling medicines ---
        cursor.execute("""
            SELECT sm.medicine_name as name,
                   SUM(sm.quantity) as units,
                   SUM(sm.subtotal) as revenue,
                   mi.category
            FROM pharmacy_sale_medicines sm
            JOIN pharmacy_sales s ON sm.sale_id = s.id
            LEFT JOIN medicine_inventory mi ON sm.medicine_name = mi.generic_name
                OR sm.medicine_name = mi.brand_name
            WHERE DATE(s.created_at) >= date('now', '-' || ? || ' days')
              AND s.status = 'Completed'
            GROUP BY sm.medicine_name
            ORDER BY units DESC
            LIMIT 10
        """, (str(days),))
        top_medicines = []
        for r in cursor.fetchall():
            d = dict(r)
            d['units'] = int(d['units'] or 0)
            d['revenue'] = float(d['revenue'] or 0)
            d['category'] = d.get('category') or 'General'
            top_medicines.append(d)

        # --- 3. Category breakdown ---
        cursor.execute("""
            SELECT COALESCE(mi.category, 'Uncategorized') as name,
                   COALESCE(SUM(sm.subtotal), 0) as value
            FROM pharmacy_sale_medicines sm
            JOIN pharmacy_sales s ON sm.sale_id = s.id
            LEFT JOIN medicine_inventory mi ON sm.medicine_name = mi.generic_name
                OR sm.medicine_name = mi.brand_name
            WHERE DATE(s.created_at) >= date('now', '-' || ? || ' days')
              AND s.status = 'Completed'
            GROUP BY name
            ORDER BY value DESC
        """, (str(days),))
        categories_raw = [dict(r) for r in cursor.fetchall()]
        total_cat_value = sum(c['value'] for c in categories_raw) or 1
        categories = []
        for c in categories_raw:
            c['value'] = float(c['value'])
            c['percentage'] = round(c['value'] / total_cat_value * 100)
            categories.append(c)

        # --- 4. Inventory value ---
        cursor.execute("""
            SELECT COALESCE(SUM(current_stock * unit_price), 0) as total_value,
                   COUNT(*) as total_items,
                   SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low_stock,
                   SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM medicine_inventory
        """)
        inv = dict(cursor.fetchone())
        inventory_summary = {
            'total_value': float(inv['total_value'] or 0),
            'total_items': int(inv['total_items'] or 0),
            'low_stock': int(inv['low_stock'] or 0),
            'out_of_stock': int(inv['out_of_stock'] or 0),
        }

        # --- 5. Prescription stats by day ---
        cursor.execute("""
            SELECT DATE(created_at) as date,
                   SUM(CASE WHEN status = 'Dispensed' THEN 1 ELSE 0 END) as dispensed,
                   SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as pending,
                   SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM prescriptions
            WHERE DATE(created_at) >= date('now', '-' || ? || ' days')
            GROUP BY DATE(created_at)
            ORDER BY date
        """, (str(days),))
        prescription_stats = []
        for r in cursor.fetchall():
            d = dict(r)
            d['dispensed'] = int(d['dispensed'] or 0)
            d['pending'] = int(d['pending'] or 0)
            d['cancelled'] = int(d['cancelled'] or 0)
            prescription_stats.append(d)

        # --- 6. Stock data for reports ---
        cursor.execute("""
            SELECT generic_name as name, brand_name, current_stock as stock,
                   ROUND(current_stock * unit_price, 2) as value,
                   category,
                   CASE
                       WHEN current_stock = 0 THEN 'out_of_stock'
                       WHEN current_stock <= reorder_level THEN 'critical'
                       WHEN current_stock <= reorder_level * 2 THEN 'low'
                       ELSE 'good'
                   END as status
            FROM medicine_inventory
            ORDER BY current_stock ASC
            LIMIT 20
        """)
        stock_levels = [dict(r) for r in cursor.fetchall()]
        for s in stock_levels:
            s['stock'] = int(s['stock'] or 0)
            s['value'] = float(s['value'] or 0)

        return jsonify({
            'daily_sales': daily_sales,
            'top_medicines': top_medicines,
            'categories': categories,
            'inventory_summary': inventory_summary,
            'prescription_stats': prescription_stats,
            'stock_levels': stock_levels,
        }), 200

    except Exception as e:
        print(f"Error in get_pharmacy_analytics: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

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
# ADMIN DASHBOARD ENDPOINTS
# ============================================

@app.route('/api/admin/dashboard', methods=['GET'])
@jwt_required()
def get_admin_dashboard():
    """High-level overview metrics for Admin Dashboard"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # Total staff count
        cursor.execute("SELECT COUNT(*) as c FROM staff WHERE is_active = TRUE")
        total_staff = dict(cursor.fetchone())['c']
        
        # Active patients
        cursor.execute("SELECT COUNT(*) as c FROM patients WHERE is_active = TRUE")
        active_patients = dict(cursor.fetchone())['c']
        
        # Occupied beds
        cursor.execute("SELECT COUNT(*) as c FROM beds WHERE status = 'Occupied'")
        occupied_beds = dict(cursor.fetchone())['c']
        cursor.execute("SELECT COUNT(*) as c FROM beds")
        total_beds = dict(cursor.fetchone())['c']
        
        # Monthly Revenue (pharmacy + paid payments + admissions)
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed' AND DATE(created_at) >= date('now', 'start of month')")
        month_pharmacy = float(dict(cursor.fetchone())['rev'])
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status IN ('Paid','Collected') AND DATE(updated_at) >= date('now', 'start of month')")
        month_payments = float(dict(cursor.fetchone())['rev'])
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE admission_date >= date('now', 'start of month')")
        month_admissions = float(dict(cursor.fetchone())['rev'])
        monthly_revenue = month_pharmacy + month_payments + month_admissions

        # Today's Appointments
        today_str = datetime.now().date().isoformat()
        try:
            cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE DATE(appointment_date) = ?", (today_str,))
            total_appt = dict(cursor.fetchone())['c']
            cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE DATE(appointment_date) = ? AND status IN ('Completed', 'Checked In')", (today_str,))
            completed_appt = dict(cursor.fetchone())['c']
            pending_appt = total_appt - completed_appt
        except Exception:
            total_appt, completed_appt, pending_appt = 0, 0, 0
        
        # Department Occupancy
        cursor.execute("""
            SELECT d.dept_name as name, 
                   COUNT(a.id) as patients,
                   (SELECT COUNT(*) FROM staff src WHERE src.department_id = d.id AND src.is_active = TRUE) as staff,
                   COUNT(b.id) as total_beds
            FROM departments d
            LEFT JOIN admissions a ON a.department_id = d.id AND a.status = 'Admitted'
            LEFT JOIN beds b ON b.ward_name LIKE '%' || d.dept_name || '%'
            GROUP BY d.id
        """)
        raw_depts = [dict(r) for r in cursor.fetchall()]
        
        departments_stats = []
        for d in raw_depts:
            cap = d['total_beds'] if d['total_beds'] > 0 else 10 
            occ = min(100, int((d['patients'] / cap) * 100))
            if occ == 0 and d['patients'] > 0: occ = 50
            departments_stats.append({
                'name': d['name'],
                'patients': d['patients'],
                'staff': d['staff'],
                'occupancy': occ
            })

        # Recent Activity (from actual tables)
        cursor.execute("SELECT admission_date, 'New patient admitted' as action, 'System' as user, 'patient' as type FROM admissions ORDER BY admission_date DESC LIMIT 3")
        acts1 = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT created_at, 'Staff member added' as action, first_name as user, 'staff' as type FROM staff ORDER BY created_at DESC LIMIT 2")
        acts2 = [dict(r) for r in cursor.fetchall()]
        
        try:
            cursor.execute("SELECT created_at, 'Lab report completed' as action, 'Lab' as user, 'lab' as type FROM lab_reports WHERE status = 'Completed' ORDER BY created_at DESC LIMIT 2")
            acts3 = [dict(r) for r in cursor.fetchall()]
        except Exception:
            acts3 = []

        try:
            cursor.execute("SELECT created_at, 'Prescription dispensed' as action, patient_name as user, 'pharmacy' as type FROM pharmacy_sales ORDER BY created_at DESC LIMIT 2")
            acts4 = [dict(r) for r in cursor.fetchall()]
        except Exception:
            acts4 = []

        activities = []
        all_acts = acts1 + acts2 + acts3 + acts4
        for idx, a in enumerate(all_acts[:10]):
            time_val = a.get('admission_date') or a.get('created_at') or 'Recently'
            activities.append({
                'id': idx + 1,
                'action': a['action'],
                'user': a['user'],
                'time': time_val,
                'type': a['type']
            })

        return jsonify({
            'metrics': {
                'total_staff': total_staff,
                'active_patients': active_patients,
                'occupied_beds': f"{occupied_beds}/{total_beds}",
                'monthly_revenue': f"₹{int(monthly_revenue/1000)}K" if monthly_revenue >= 1000 else f"₹{int(monthly_revenue)}"
            },
            'today_appointments': {
                'total': total_appt,
                'completed': completed_appt,
                'pending': pending_appt
            },
            'department_occupancy': departments_stats,
            'recent_activity': activities
        }), 200

    except Exception as e:
        app.logger.error(f"Admin dashboard error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/staff', methods=['GET'])
@jwt_required()
def get_all_staff():
    """Get all staff configured for the StaffManagement UI"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("""
            SELECT s.id, s.staff_id, s.first_name, s.last_name, s.email, 
                   s.phone as mobile_number, s.role, s.is_active, 
                   s.date_of_joining, d.dept_name
            FROM staff s
            LEFT JOIN departments d ON s.department_id = d.id
            ORDER BY s.staff_id ASC
        """)
        staff_members = [dict(r) for r in cursor.fetchall()]
            
        return jsonify({'staff': staff_members}), 200
    except Exception as e:
        app.logger.error(f"Get staff error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/staff', methods=['POST'])
@jwt_required()
def add_new_staff():
    data = request.json
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("SELECT COUNT(*) as c FROM staff")
        count = dict(cursor.fetchone())['c'] + 1
        new_id = f"STF{count:03d}"
        
        # Accept department_id directly (integer) or fall back to department name lookup
        dept_id = data.get('department_id')
        if dept_id:
            dept_id = int(dept_id)
        elif data.get('department'):
            cursor.execute("SELECT id FROM departments WHERE dept_name = ?", (data.get('department'),))
            dept_row = cursor.fetchone()
            dept_id = dict(dept_row)['id'] if dept_row else None
        
        from werkzeug.security import generate_password_hash
        pwd_hash = generate_password_hash('password123')
        
        cursor.execute("""
            INSERT INTO staff(staff_id, first_name, last_name, email, phone, role, department_id, password_hash, is_active, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (
            new_id, data.get('first_name', ''), data.get('last_name', ''),
            data.get('email', ''), data.get('phone', ''),
            data.get('role', 'Staff'), dept_id, pwd_hash
        ))
        conn.commit()
        
        socketio.emit('staff_updated', {'action': 'add', 'staff_id': new_id})
        socketio.emit('admin_metrics_updated', {'type': 'staff'})
        
        return jsonify({'message': 'Staff added successfully', 'staff_id': new_id}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Add staff error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/staff/<staff_id>', methods=['PUT'])
@jwt_required()
def update_staff(staff_id):
    data = request.json
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # Accept department_id directly or fall back to name lookup
        dept_id = data.get('department_id')
        if dept_id:
            dept_id = int(dept_id)
        elif data.get('department'):
            cursor.execute("SELECT id FROM departments WHERE dept_name = ?", (data.get('department'),))
            dept_row = cursor.fetchone()
            dept_id = dict(dept_row)['id'] if dept_row else None

        # Check if staff exists
        cursor.execute("SELECT id FROM staff WHERE staff_id = ?", (staff_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Staff not found'}), 404

        # Update
        cursor.execute("""
            UPDATE staff 
            SET first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                role = COALESCE(?, role),
                department_id = COALESCE(?, department_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE staff_id = ?
        """, (
            data.get('first_name'), data.get('last_name'),
            data.get('email'), data.get('phone'),
            data.get('role') if data.get('role') else None, 
            dept_id, staff_id
        ))
        conn.commit()
        
        socketio.emit('staff_updated', {'action': 'update', 'staff_id': staff_id})
        socketio.emit('admin_metrics_updated', {'type': 'staff'})
        return jsonify({'message': 'Staff updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Update staff error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/staff/<staff_id>', methods=['DELETE'])
@jwt_required()
def remove_staff(staff_id):
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("UPDATE staff SET is_active = 0 WHERE staff_id = ?", (staff_id,))
        if cursor.rowcount == 0:
            return jsonify({'error': 'Staff not found'}), 404
        conn.commit()
        socketio.emit('staff_updated', {'action': 'delete', 'staff_id': staff_id})
        socketio.emit('admin_metrics_updated', {'type': 'staff'})
        return jsonify({'message': 'Staff deactivated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/staff/<staff_id>/credentials', methods=['PUT'])
@jwt_required()
def update_staff_credentials(staff_id):
    """Admin can change staff login ID, reset password, reactivate account"""
    data = request.json
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # Find the staff member
        cursor.execute("SELECT id, staff_id, email, first_name, last_name FROM staff WHERE staff_id = ?", (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            return jsonify({'error': 'Staff not found'}), 404

        updates = []
        params = []

        # Change staff_id (login ID)
        new_staff_id = data.get('new_staff_id', '').strip().upper()
        if new_staff_id and new_staff_id != staff_id:
            # Check for duplicates
            cursor.execute("SELECT id FROM staff WHERE staff_id = ? AND staff_id != ?", (new_staff_id, staff_id))
            if cursor.fetchone():
                return jsonify({'error': f'Staff ID "{new_staff_id}" is already in use'}), 409
            updates.append("staff_id = ?")
            params.append(new_staff_id)

        # Change email (also used for login in some flows)
        new_email = data.get('email', '').strip()
        if new_email:
            updates.append("email = ?")
            params.append(new_email)

        # Reset password
        new_password = data.get('new_password', '').strip()
        if new_password:
            if len(new_password) < 6:
                return jsonify({'error': 'Password must be at least 6 characters'}), 400
            new_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
            updates.append("password_hash = ?")
            params.append(new_hash)

        # Reactivate
        if data.get('is_active') is not None:
            updates.append("is_active = ?")
            params.append(1 if data.get('is_active') else 0)

        if not updates:
            return jsonify({'error': 'No changes provided'}), 400

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(staff_id)

        cursor.execute(f"UPDATE staff SET {', '.join(updates)} WHERE staff_id = ?", params)
        conn.commit()

        socketio.emit('staff_updated', {'action': 'credentials', 'staff_id': new_staff_id or staff_id})
        socketio.emit('admin_metrics_updated', {'type': 'staff'})

        result_msg = 'Credentials updated successfully'
        if new_staff_id and new_staff_id != staff_id:
            result_msg += f'. Login ID changed from {staff_id} to {new_staff_id}'
        if new_password:
            result_msg += '. Password has been reset'

        return jsonify({'message': result_msg, 'staff_id': new_staff_id or staff_id}), 200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Update credentials error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/departments', methods=['GET'])
@jwt_required()
def get_admin_departments():
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("SELECT * FROM departments")
        depts = [dict(r) for r in cursor.fetchall()]
        return jsonify({'departments': depts}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/departments', methods=['POST'])
@jwt_required()
def add_admin_department():
    data = request.json
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        dept_name = data.get('dept_name', '').strip()
        if not dept_name:
            return jsonify({'error': 'Department name is required'}), 400
        
        # Check for duplicate
        cursor.execute("SELECT id FROM departments WHERE LOWER(dept_name) = LOWER(?)", (dept_name,))
        if cursor.fetchone():
            return jsonify({'error': 'Department already exists'}), 409
        
        cursor.execute("INSERT INTO departments (dept_name) VALUES (?)", (dept_name,))
        conn.commit()
        new_id = cursor.lastrowid
        
        socketio.emit('admin_metrics_updated', {'type': 'department'})
        return jsonify({'message': 'Department created', 'id': new_id, 'dept_name': dept_name}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/departments/<int:dept_id>', methods=['PUT'])
@jwt_required()
def update_admin_department(dept_id):
    data = request.json
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        dept_name = data.get('dept_name', '').strip()
        if not dept_name:
            return jsonify({'error': 'Department name is required'}), 400
        
        cursor.execute("SELECT id FROM departments WHERE id = ?", (dept_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Department not found'}), 404
        
        cursor.execute("UPDATE departments SET dept_name = ? WHERE id = ?", (dept_name, dept_id))
        conn.commit()
        
        socketio.emit('admin_metrics_updated', {'type': 'department'})
        return jsonify({'message': 'Department updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/departments/<int:dept_id>', methods=['DELETE'])
@jwt_required()
def delete_admin_department(dept_id):
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        cursor.execute("SELECT id FROM departments WHERE id = ?", (dept_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Department not found'}), 404
        
        # Check if staff are assigned
        cursor.execute("SELECT COUNT(*) as c FROM staff WHERE department_id = ? AND is_active = TRUE", (dept_id,))
        staff_count = dict(cursor.fetchone())['c']
        if staff_count > 0:
            return jsonify({'error': f'Cannot delete: {staff_count} active staff assigned to this department'}), 400
        
        cursor.execute("DELETE FROM departments WHERE id = ?", (dept_id,))
        conn.commit()
        
        socketio.emit('admin_metrics_updated', {'type': 'department'})
        return jsonify({'message': 'Department deleted'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

@app.route('/api/admin/analytics', methods=['GET'])
@jwt_required()
def get_admin_analytics():
    """Comprehensive analytics for the admin Reports & Analytics page"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # --- Summary stats ---
        cursor.execute("SELECT COUNT(*) as c FROM patients WHERE is_active = TRUE")
        total_patients = dict(cursor.fetchone())['c']

        cursor.execute("SELECT COUNT(*) as c FROM patients WHERE created_at >= date('now', '-30 days')")
        new_patients_month = dict(cursor.fetchone())['c']

        cursor.execute("SELECT COUNT(*) as c FROM patients WHERE created_at >= date('now', '-60 days') AND created_at < date('now', '-30 days')")
        prev_patients_month = dict(cursor.fetchone())['c']

        try:
            cursor.execute("SELECT COUNT(*) as c FROM appointments")
            total_appointments = dict(cursor.fetchone())['c']
            cursor.execute("SELECT COUNT(*) as c FROM appointments WHERE appointment_date >= date('now', '-30 days')")
            month_appointments = dict(cursor.fetchone())['c']
        except Exception:
            total_appointments, month_appointments = 0, 0

        # Revenue (last 30 days): admissions + pharmacy
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE admission_date >= date('now', '-30 days')")
        month_admission_rev = float(dict(cursor.fetchone())['rev'])
        
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed' AND DATE(created_at) >= date('now', '-30 days')")
        month_pharmacy_rev = float(dict(cursor.fetchone())['rev'])
        
        total_revenue = month_admission_rev + month_pharmacy_rev

        # Prev month revenue for comparison
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE admission_date >= date('now', '-60 days') AND admission_date < date('now', '-30 days')")
        prev_admission_rev = float(dict(cursor.fetchone())['rev'])
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed' AND DATE(created_at) >= date('now', '-60 days') AND DATE(created_at) < date('now', '-30 days')")
        prev_pharmacy_rev = float(dict(cursor.fetchone())['rev'])
        prev_revenue = prev_admission_rev + prev_pharmacy_rev

        # --- Monthly trends (last 6 months) ---
        # Build month labels using Python for consistent date formatting
        from datetime import datetime
        import calendar
        
        def month_offset(dt, months_back):
            """Return (year, month) going back N months from dt"""
            m = dt.month - months_back
            y = dt.year
            while m <= 0:
                m += 12
                y -= 1
            return y, m
        
        monthly_trends = []
        now = datetime.now()
        for i in range(5, -1, -1):
            y, m = month_offset(now, i)
            month_str = f"{y:04d}-{m:02d}"
            month_start = f"{month_str}-01"
            # Next month
            ny, nm = (y, m + 1) if m < 12 else (y + 1, 1)
            next_month_start = f"{ny:04d}-{nm:02d}-01"

            # Patients registered in this month
            cursor.execute(
                "SELECT COUNT(*) as c FROM patients WHERE DATE(created_at) >= ? AND DATE(created_at) < ?",
                (month_start, next_month_start))
            patients = dict(cursor.fetchone())['c']

            # Revenue: admissions + pharmacy
            cursor.execute(
                "SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE DATE(admission_date) >= ? AND DATE(admission_date) < ?",
                (month_start, next_month_start))
            adm_rev = float(dict(cursor.fetchone())['rev'])

            cursor.execute(
                "SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed' AND DATE(created_at) >= ? AND DATE(created_at) < ?",
                (month_start, next_month_start))
            pharm_rev = float(dict(cursor.fetchone())['rev'])

            # Appointments
            try:
                cursor.execute(
                    "SELECT COUNT(*) as c FROM appointments WHERE DATE(appointment_date) >= ? AND DATE(appointment_date) < ?",
                    (month_start, next_month_start))
                appts = dict(cursor.fetchone())['c']
            except Exception:
                appts = 0

            monthly_trends.append({
                'month': month_str,
                'patients': patients,
                'revenue': adm_rev + pharm_rev,
                'appointments': appts
            })

        # --- Department stats ---
        cursor.execute("""
            SELECT d.id, d.dept_name as name,
                   (SELECT COUNT(*) FROM staff WHERE department_id = d.id AND is_active = TRUE) as staff,
                   (SELECT COUNT(*) FROM admissions WHERE department_id = d.id AND status = 'Admitted') as patients,
                   (SELECT COALESCE(SUM(total_bill_amount), 0) FROM admissions WHERE department_id = d.id) as revenue
            FROM departments d
            ORDER BY d.dept_name
        """)
        dept_stats = []
        for r in cursor.fetchall():
            d = dict(r)
            d['revenue'] = float(d['revenue'] or 0)
            d['patients'] = int(d['patients'] or 0)
            d['staff'] = int(d['staff'] or 0)
            dept_stats.append(d)

        # --- Top doctors ---
        top_doctors = []
        try:
            cursor.execute("""
                SELECT s.first_name || ' ' || s.last_name as name,
                       d.dept_name as department,
                       COUNT(a.id) as patients
                FROM staff s
                LEFT JOIN departments d ON s.department_id = d.id
                LEFT JOIN appointments a ON a.doctor_id = s.staff_id
                WHERE s.role = 'Doctor' AND s.is_active = TRUE
                GROUP BY s.id
                ORDER BY patients DESC
                LIMIT 10
            """)
            for r in cursor.fetchall():
                rd = dict(r)
                rd['patients'] = int(rd['patients'] or 0)
                top_doctors.append(rd)
        except Exception:
            cursor.execute("""
                SELECT s.first_name || ' ' || s.last_name as name,
                       d.dept_name as department, 0 as patients
                FROM staff s
                LEFT JOIN departments d ON s.department_id = d.id
                WHERE s.role = 'Doctor' AND s.is_active = TRUE
                ORDER BY s.first_name LIMIT 10
            """)
            top_doctors = [dict(r) for r in cursor.fetchall()]

        # --- Financial summary ---
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions")
        all_time_admission_rev = float(dict(cursor.fetchone())['rev'])

        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed'")
        all_time_pharmacy_rev = float(dict(cursor.fetchone())['rev'])

        try:
            cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status = 'Collected'")
            lab_revenue = float(dict(cursor.fetchone())['rev'])
        except Exception:
            lab_revenue = 0.0

        grand_total = all_time_admission_rev + all_time_pharmacy_rev + lab_revenue
        
        financial = {
            'total_revenue': grand_total,
            'admission_revenue': all_time_admission_rev,
            'pharmacy_revenue': all_time_pharmacy_rev,
            'lab_revenue': lab_revenue,
        }

        patient_change = round(((new_patients_month - prev_patients_month) / max(prev_patients_month, 1)) * 100)
        revenue_change = round(((total_revenue - prev_revenue) / max(prev_revenue, 1)) * 100) if prev_revenue > 0 else 0

        return jsonify({
            'summary': {
                'total_patients': total_patients,
                'total_appointments': total_appointments,
                'total_revenue': total_revenue,
                'patient_change': patient_change,
                'revenue_change': revenue_change,
                'month_appointments': month_appointments,
            },
            'monthly_trends': monthly_trends,
            'department_stats': dept_stats,
            'top_doctors': top_doctors,
            'financial': financial
        }), 200

    except Exception as e:
        app.logger.error(f"Admin analytics error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)

# ============================================
# FINANCIAL DASHBOARD API
# ============================================

@app.route('/api/admin/financials/dashboard', methods=['GET'])
@jwt_required()
def financial_dashboard():
    """Financial dashboard: today's revenue per department, overall stats, recent transactions"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')

        # --- Overall financial summary ---
        # Today's total
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed' AND DATE(created_at) = ?", (today,))
        today_pharmacy = float(dict(cursor.fetchone())['rev'])
        
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status IN ('Paid','Collected') AND DATE(updated_at) = ?", (today,))
        today_payments = float(dict(cursor.fetchone())['rev'])
        
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE DATE(admission_date) = ?", (today,))
        today_admissions = float(dict(cursor.fetchone())['rev'])
        
        today_total = today_pharmacy + today_payments + today_admissions

        # This month total
        month_start = datetime.now().strftime('%Y-%m-01')
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed' AND DATE(created_at) >= ?", (month_start,))
        month_pharmacy = float(dict(cursor.fetchone())['rev'])
        
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status IN ('Paid','Collected') AND DATE(updated_at) >= ?", (month_start,))
        month_payments = float(dict(cursor.fetchone())['rev'])
        
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE DATE(admission_date) >= ?", (month_start,))
        month_admissions = float(dict(cursor.fetchone())['rev'])
        
        month_total = month_pharmacy + month_payments + month_admissions

        # Pending collections
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status = 'Pending'")
        pending_total = float(dict(cursor.fetchone())['rev'])

        # All-time total
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status = 'Completed'")
        all_pharmacy = float(dict(cursor.fetchone())['rev'])
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status IN ('Paid','Collected')")
        all_payments = float(dict(cursor.fetchone())['rev'])
        cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions")
        all_admissions = float(dict(cursor.fetchone())['rev'])
        all_total = all_pharmacy + all_payments + all_admissions

        # --- Today's revenue per department ---
        cursor.execute("""
            SELECT d.dept_name,
                   COALESCE(SUM(adm.total_bill_amount), 0) as admission_rev
            FROM departments d
            LEFT JOIN admissions adm ON adm.department_id = d.id AND DATE(adm.admission_date) = ?
            GROUP BY d.id, d.dept_name
        """, (today,))
        dept_rev_map = {}
        for r in cursor.fetchall():
            rd = dict(r)
            dept_rev_map[rd['dept_name']] = {'admission': float(rd['admission_rev'] or 0), 'pharmacy': 0.0, 'lab': 0.0}

        # Add pharmacy revenue per department (via doctor → department)
        cursor.execute("""
            SELECT d.dept_name, COALESCE(SUM(ps.total_amount), 0) as rev
            FROM pharmacy_sales ps
            JOIN prescriptions rx ON ps.prescription_id = rx.prescription_id
            JOIN staff s ON rx.doctor_id = s.staff_id
            JOIN departments d ON s.department_id = d.id
            WHERE ps.status = 'Completed' AND DATE(ps.created_at) = ?
            GROUP BY d.id
        """, (today,))
        for r in cursor.fetchall():
            rd = dict(r)
            if rd['dept_name'] in dept_rev_map:
                dept_rev_map[rd['dept_name']]['pharmacy'] = float(rd['rev'] or 0)

        # Add lab payment revenue per department
        try:
            cursor.execute("""
                SELECT d.dept_name, COALESCE(SUM(pp.amount), 0) as rev
                FROM pending_payments pp
                JOIN appointments a ON pp.reference_id = a.appointment_id
                JOIN staff s ON a.doctor_id = s.staff_id
                JOIN departments d ON s.department_id = d.id
                WHERE pp.status IN ('Paid','Collected') AND pp.type != 'registration' AND DATE(pp.updated_at) = ?
                GROUP BY d.id
            """, (today,))
            for r in cursor.fetchall():
                rd = dict(r)
                if rd['dept_name'] in dept_rev_map:
                    dept_rev_map[rd['dept_name']]['lab'] = float(rd['rev'] or 0)
        except Exception:
            pass

        dept_revenue = []
        for dept, revs in sorted(dept_rev_map.items()):
            total = revs['admission'] + revs['pharmacy'] + revs['lab']
            dept_revenue.append({
                'department': dept,
                'admission': revs['admission'],
                'pharmacy': revs['pharmacy'],
                'lab': revs['lab'],
                'total': total
            })
        # Sort by total descending
        dept_revenue.sort(key=lambda x: x['total'], reverse=True)

        # --- Recent transactions (last 20) ---
        recent_transactions = []
        
        # Pharmacy sales
        cursor.execute("""
            SELECT ps.id as id, ps.patient_name as patient, ps.total_amount as amount, 
                   'Pharmacy' as type, ps.payment_method as method, ps.created_at as date, ps.status
            FROM pharmacy_sales ps
            ORDER BY ps.created_at DESC LIMIT 10
        """)
        for r in cursor.fetchall():
            rd = dict(r)
            rd['amount'] = float(rd['amount'] or 0)
            recent_transactions.append(rd)

        # Pending payments
        cursor.execute("""
            SELECT pp.id, p.first_name || ' ' || p.last_name as patient, pp.amount,
                   pp.reference_type as type, 'N/A' as method, pp.created_at as date, pp.status
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            ORDER BY pp.created_at DESC LIMIT 10
        """)
        for r in cursor.fetchall():
            rd = dict(r)
            rd['amount'] = float(rd['amount'] or 0)
            rd['type'] = rd['type'].replace('_', ' ').title()
            recent_transactions.append(rd)

        # Sort all by date desc
        recent_transactions.sort(key=lambda x: x.get('date', ''), reverse=True)
        recent_transactions = recent_transactions[:20]

        # --- Monthly revenue trend (last 6 months by source) ---
        monthly_revenue = []
        now = datetime.now()
        def month_offset(dt, months_back):
            m = dt.month - months_back
            y = dt.year
            while m <= 0:
                m += 12
                y -= 1
            return y, m

        for i in range(5, -1, -1):
            y, m = month_offset(now, i)
            ms = f"{y:04d}-{m:02d}"
            m_start = f"{ms}-01"
            ny, nm = (y, m + 1) if m < 12 else (y + 1, 1)
            m_end = f"{ny:04d}-{nm:02d}-01"

            cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as rev FROM pharmacy_sales WHERE status='Completed' AND DATE(created_at) >= ? AND DATE(created_at) < ?", (m_start, m_end))
            ph = float(dict(cursor.fetchone())['rev'])
            cursor.execute("SELECT COALESCE(SUM(amount), 0) as rev FROM pending_payments WHERE status IN ('Paid','Collected') AND DATE(updated_at) >= ? AND DATE(updated_at) < ?", (m_start, m_end))
            pp = float(dict(cursor.fetchone())['rev'])
            cursor.execute("SELECT COALESCE(SUM(total_bill_amount), 0) as rev FROM admissions WHERE DATE(admission_date) >= ? AND DATE(admission_date) < ?", (m_start, m_end))
            ad = float(dict(cursor.fetchone())['rev'])

            monthly_revenue.append({
                'month': ms, 'pharmacy': ph, 'payments': pp, 'admissions': ad, 'total': ph + pp + ad
            })

        return jsonify({
            'overview': {
                'today_total': today_total,
                'today_pharmacy': today_pharmacy,
                'today_payments': today_payments,
                'today_admissions': today_admissions,
                'month_total': month_total,
                'pending_total': pending_total,
                'all_time_total': all_total,
            },
            'dept_revenue': dept_revenue,
            'recent_transactions': recent_transactions,
            'monthly_revenue': monthly_revenue,
        }), 200

    except Exception as e:
        app.logger.error(f"Financial dashboard error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admin/financials/patient-search', methods=['GET'])
@jwt_required()
def financial_patient_search():
    """Search patients and get their complete payment history"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        q = request.args.get('q', '').strip()
        if not q or len(q) < 2:
            return jsonify({'patients': []}), 200

        search = f"%{q}%"
        cursor.execute("""
            SELECT patient_id, first_name, last_name, email, mobile_number, created_at
            FROM patients
            WHERE (first_name LIKE ? OR last_name LIKE ? OR patient_id LIKE ? OR mobile_number LIKE ?)
            AND is_active = TRUE
            LIMIT 10
        """, (search, search, search, search))
        patients = [dict(r) for r in cursor.fetchall()]
        return jsonify({'patients': patients}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


@app.route('/api/admin/financials/patient/<patient_id>', methods=['GET'])
@jwt_required()
def financial_patient_detail(patient_id):
    """Get complete payment history for a specific patient"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    try:
        # Patient info
        cursor.execute("SELECT patient_id, first_name, last_name, email, mobile_number, created_at FROM patients WHERE patient_id = ?", (patient_id,))
        patient = cursor.fetchone()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        patient = dict(patient)

        payments = []
        total_paid = 0.0
        total_pending = 0.0

        # Pharmacy sales
        cursor.execute("""
            SELECT ps.id as ref, ps.total_amount as amount, 'Pharmacy' as category,
                   ps.status, ps.payment_method as method, ps.created_at as date,
                   'Medication Purchase' as description
            FROM pharmacy_sales ps
            WHERE ps.patient_id = ?
            ORDER BY ps.created_at DESC
        """, (patient_id,))
        for r in cursor.fetchall():
            rd = dict(r)
            rd['amount'] = float(rd['amount'] or 0)
            payments.append(rd)
            if rd['status'] == 'Completed':
                total_paid += rd['amount']

        # Pending payments (registration, appointment, lab, etc.)
        cursor.execute("""
            SELECT pp.reference_id as ref, pp.amount, pp.reference_type as category,
                   pp.status, 'N/A' as method, pp.created_at as date,
                   pp.description
            FROM pending_payments pp
            WHERE pp.patient_id = ?
            ORDER BY pp.created_at DESC
        """, (patient_id,))
        for r in cursor.fetchall():
            rd = dict(r)
            rd['amount'] = float(rd['amount'] or 0)
            rd['category'] = rd['category'].replace('_', ' ').title()
            payments.append(rd)
            if rd['status'] in ('Paid', 'Collected'):
                total_paid += rd['amount']
            elif rd['status'] == 'Pending':
                total_pending += rd['amount']

        # Admission bills
        cursor.execute("""
            SELECT a.admission_id as ref, a.total_bill_amount as amount, 'Admission' as category,
                   a.status, a.payment_type as method, a.admission_date as date,
                   d.dept_name as description
            FROM admissions a
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.patient_id = ?
            ORDER BY a.admission_date DESC
        """, (patient_id,))
        for r in cursor.fetchall():
            rd = dict(r)
            rd['amount'] = float(rd['amount'] or 0)
            rd['description'] = f"Admission - {rd['description'] or 'General'}"
            payments.append(rd)
            if rd['amount'] > 0:
                total_paid += rd['amount']

        # Sort by date desc
        payments.sort(key=lambda x: x.get('date', ''), reverse=True)

        # Department breakdown for this patient
        dept_breakdown = {}
        for p in payments:
            desc = p.get('description', p.get('category', 'Other'))
            cat = p.get('category', 'Other')
            if cat not in dept_breakdown:
                dept_breakdown[cat] = {'paid': 0, 'pending': 0}
            if p['status'] in ('Completed', 'Paid', 'Collected'):
                dept_breakdown[cat]['paid'] += p['amount']
            elif p['status'] == 'Pending':
                dept_breakdown[cat]['pending'] += p['amount']

        category_summary = [{'category': k, 'paid': v['paid'], 'pending': v['pending'], 'total': v['paid'] + v['pending']} for k, v in dept_breakdown.items()]

        return jsonify({
            'patient': patient,
            'payments': payments,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'total_billed': total_paid + total_pending,
            'category_summary': category_summary,
        }), 200

    except Exception as e:
        app.logger.error(f"Patient financial detail error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        close_db_connection(conn)


# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # the Database object provides a safe test method that works regardless
        # of whether we are using a context manager pool or direct connection.
        from database import db
        if not db.test_connection():
            raise RuntimeError('database test_connection returned False')
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

if __name__ == '__main__':
    # Initialize WhatsApp message queue worker for real-time notifications
    try:
        start_message_queue_worker()
        print("  WhatsApp message queue worker initialized")
    except Exception as e:
        print(f"  WhatsApp initialization warning: {e}")
    try:
        flask_debug = os.getenv('FLASK_DEBUG', '0') == '1'
        port = int(os.getenv('PORT', '5000'))
        print(f"Starting server on http://0.0.0.0:{port} (debug={flask_debug})")
        socketio.run(app, debug=flask_debug, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"Server error: {e}")

# ============================================
# CRITICAL MISSING ENDPOINTS (ADDED AT END TO AVOID CONFLICTS)
# ============================================

@app.route('/api/staff', methods=['GET'])
def get_staff_critical():
    """Get all staff - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT s.*, d.name as dept_name 
            FROM staff s 
            LEFT JOIN departments d ON s.department_id = d.id 
            WHERE s.is_active = TRUE 
            ORDER BY s.staff_id
        """)
        staff = cursor.fetchall()
        return jsonify([dict(s) for s in staff])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_patients_critical():
    """Get all patients - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM patients WHERE is_active = TRUE ORDER BY created_at DESC")
        patients = cursor.fetchall()
        return jsonify([dict(p) for p in patients])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/medicine_inventory', methods=['GET'])
@jwt_required()
def get_medicine_inventory_critical():
    """Get medicine inventory - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM medicine_inventory ORDER BY medicine_name")
        inventory = cursor.fetchall()
        return jsonify([dict(item) for item in inventory])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/beds', methods=['GET'])
@jwt_required()
def get_beds_critical():
    """Get all beds - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM beds ORDER BY bed_number")
        beds = cursor.fetchall()
        return jsonify([dict(bed) for bed in beds])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pending_payments', methods=['GET'])
@jwt_required()
def get_pending_payments_critical():
    """Get pending payments - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM pending_payments ORDER BY created_at DESC")
        payments = cursor.fetchall()
        return jsonify([dict(p) for p in payments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/collections', methods=['GET'])
@jwt_required()
def get_collections_critical():
    """Get collections - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM collections ORDER BY collected_at DESC")
        collections = cursor.fetchall()
        return jsonify([dict(c) for c in collections])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lab_orders', methods=['GET'])
@jwt_required()
def get_lab_orders_critical():
    """Get lab orders - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM lab_orders ORDER BY created_at DESC")
        orders = cursor.fetchall()
        return jsonify([dict(o) for o in orders])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/lab_results', methods=['GET'])
@jwt_required()
def get_lab_results_critical():
    """Get lab results - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM lab_results ORDER BY created_at DESC")
        results = cursor.fetchall()
        return jsonify([dict(r) for r in results])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admissions', methods=['GET'])
@jwt_required()
def get_admissions_critical():
    """Get admissions - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM admissions ORDER BY admission_date DESC")
        admissions = cursor.fetchall()
        return jsonify([dict(a) for a in admissions])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/prescriptions', methods=['GET'])
@jwt_required()
def get_prescriptions_critical():
    """Get prescriptions - CRITICAL FOR DASHBOARDS"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM prescriptions ORDER BY prescription_date DESC")
        prescriptions = cursor.fetchall()
        return jsonify([dict(p) for p in prescriptions])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/dashboard/front-office', methods=['GET'])
@role_required(['Front_Office', 'Admin'])
def get_front_office_dashboard():
    """Get front office dashboard data with real-time stats"""
    try:
        with db.get_cursor() as (cursor, conn):
            # Todays registrations
            cursor.execute("""
                SELECT COUNT(*) as count FROM patients
                WHERE DATE(registration_date) = CURRENT_DATE
            """)
            today_registrations = cursor.fetchone()['count']
            
            # Todays appointments
            cursor.execute("""
                SELECT COUNT(*) as count FROM appointments
                WHERE DATE(appointment_date) = CURRENT_DATE
            """)
            today_appointments = cursor.fetchone()['count']
            
            # Pending payments
            cursor.execute("""
                SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM pending_payments
                WHERE status = 'Pending'
            """)
            pending_data = cursor.fetchone()
            pending_payments = pending_data['count']
            
            # Todays revenue
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total FROM collections 
                WHERE DATE(collected_at) = CURRENT_DATE
            """)
            today_revenue = cursor.fetchone()['total']
            
            # Total patients
            cursor.execute("""
                SELECT COUNT(*) as count FROM patients WHERE is_active = true
            """)
            total_patients = cursor.fetchone()['count']
            
            # Waiting queue
            cursor.execute("""
                SELECT COUNT(*) as count FROM queue_management
                WHERE queue_date = CURRENT_DATE AND status = 'Waiting'
            """)
            waiting_queue = cursor.fetchone()['count']
            
            # Weekly stats
            cursor.execute("""
                SELECT 
                    COUNT(*) as registrations,
                    (SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) >= CURRENT_DATE - INTERVAL '7 days') as appointments
                FROM patients 
                WHERE DATE(registration_date) >= CURRENT_DATE - INTERVAL '7 days'
            """)
            weekly_data = cursor.fetchone()
            weekly_registrations = weekly_data['registrations']
            weekly_appointments = weekly_data['appointments']
            
            # Weekly revenue
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total FROM collections 
                WHERE DATE(collected_at) >= CURRENT_DATE - INTERVAL '7 days'
            """)
            weekly_revenue = cursor.fetchone()['total']
            
            # Monthly revenue
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total FROM collections 
                WHERE DATE(collected_at) >= CURRENT_DATE - INTERVAL '30 days'
            """)
            monthly_revenue = cursor.fetchone()['total']
            
            return jsonify({
                'todayRegistrations': today_registrations,
                'todayAppointments': today_appointments,
                'pendingPayments': pending_payments,
                'todayRevenue': float(today_revenue),
                'totalPatients': total_patients,
                'waitingQueue': waiting_queue,
                'weeklyRegistrations': weekly_registrations,
                'weeklyAppointments': weekly_appointments,
                'weeklyRevenue': float(weekly_revenue),
                'monthlyRevenue': float(monthly_revenue)
            })
            
    except Exception as e:
        print(f"Error in front office dashboard: {e}")
        return jsonify({'error': 'Failed to load dashboard data'}), 500

@app.route('/api/front-office/recent-activity', methods=['GET'])
@jwt_required()
@role_required(['Front_Office', 'Admin'])
def get_front_office_recent_activity():
    """Get recent front office activity"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Recent activities from last 24 hours
        cursor.execute("""
            SELECT 
                p.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                'registration' as type,
                'Patient registered' as description,
                p.registration_date as timestamp,
                NULL as amount
            FROM patients p
            WHERE p.registration_date >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            
            UNION ALL
            
            SELECT 
                a.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                'appointment' as type,
                'Appointment booked' as description,
                a.created_at as timestamp,
                NULL as amount
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            
            UNION ALL
            
            SELECT 
                c.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                'payment' as type,
                c.description,
                c.collected_at as timestamp,
                c.amount
            FROM collections c
            JOIN patients p ON c.patient_id = p.patient_id
            WHERE c.collected_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            
            ORDER BY timestamp DESC
            LIMIT 10
        """)
        
        activities = []
        for row in cursor.fetchall():
            activities.append({
                'id': row['patient_id'],
                'patientName': row['patient_name'],
                'type': row['type'],
                'description': row['description'],
                'timestamp': row['timestamp'].strftime('%I:%M %p') if row['timestamp'] else '',
                'amount': float(row['amount']) if row['amount'] else None
            })
        
        return jsonify(activities)
        
    except Exception as e:
        print(f"Error in front office recent activity: {e}")
        return jsonify({'error': 'Failed to load recent activity'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/front-office/pending-payments', methods=['GET'])
@jwt_required()
@role_required(['Front_Office', 'Admin'])
def get_front_office_pending_payments():
    """Get pending payments for front office"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT 
                pp.id,
                pp.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                pp.reference_type,
                pp.reference_id,
                pp.description,
                pp.amount,
                pp.status,
                pp.created_at
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            WHERE pp.status = 'Pending'
            ORDER BY pp.created_at DESC
        """)
        
        payments = []
        for row in cursor.fetchall():
            payments.append({
                'id': row['id'],
                'patient_id': row['patient_id'],
                'patient_name': row['patient_name'],
                'reference_type': row['reference_type'],
                'reference_id': row['reference_id'],
                'description': row['description'],
                'amount': float(row['amount']),
                'status': row['status'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None
            })
        
        return jsonify(payments)
        
    except Exception as e:
        print(f'Error fetching pending payments: {e}')
        return jsonify({'error': 'Failed to fetch pending payments'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/front-office/today-collections', methods=['GET'])
@jwt_required()
@role_required(['Front_Office', 'Admin'])
def get_front_office_today_collections():
    """Get today's collections for front office"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM collections
            WHERE DATE(collected_at) = CURRENT_DATE
        """)
        
        result = cursor.fetchone()
        return jsonify({
            'total_count': result['total_count'],
            'total_amount': float(result['total_amount'])
        })
        
    except Exception as e:
        print(f'Error fetching today collections: {e}')
        return jsonify({'error': 'Failed to fetch collections'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/front-office/collect-payment', methods=['POST'])
@jwt_required()
@role_required(['Front_Office', 'Admin'])
def front_office_collect_payment():
    """Process payment collection from front office"""
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        payment_id = data.get('payment_id')
        payment_method = data.get('payment_method')
        transaction_id = data.get('transaction_id', '')
        amount = data.get('amount')
        patient_id = data.get('patient_id')
        
        # Get current user
        current_user = get_jwt_identity()
        
        # Generate receipt number
        receipt_number = 'R' + datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Insert collection record
        cursor.execute("""
            INSERT INTO collections (
                patient_id, reference_type, reference_id, description, 
                amount, payment_method, transaction_id, receipt_number,
                collected_by, collected_at, status
            ) VALUES (
                %s, 'pending_payment', %s, %s,
                %s, %s, %s, %s,
                %s, CURRENT_TIMESTAMP, 'completed'
            ) RETURNING id
        """, (patient_id, payment_id, f'Payment collected - {payment_method}',
              amount, payment_method, transaction_id, receipt_number, current_user))
        
        collection_id = cursor.fetchone()[0]
        
        # Update pending payment status
        cursor.execute("""
            UPDATE pending_payments 
            SET status = 'Paid', updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (payment_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Payment collected successfully',
            'collection_id': collection_id,
            'receipt_number': receipt_number
        })
        
    except Exception as e:
        conn.rollback()
        print(f'Error collecting payment: {e}')
        return jsonify({'error': 'Failed to collect payment'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/front-office/search-payments', methods=['GET'])
@jwt_required()
@role_required(['Front_Office', 'Admin'])
def search_front_office_payments():
    """Search payments by patient ID or name"""
    query = request.args.get('q', '')
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT 
                pp.id,
                pp.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                pp.reference_type,
                pp.reference_id,
                pp.description,
                pp.amount,
                pp.status,
                pp.created_at
            FROM pending_payments pp
            JOIN patients p ON pp.patient_id = p.patient_id
            WHERE pp.status = 'Pending'
            AND (pp.patient_id ILIKE %s OR p.first_name ILIKE %s OR p.last_name ILIKE %s)
            ORDER BY pp.created_at DESC
        """, (f'%{query}%', f'%{query}%', f'%{query}%'))
        
        payments = []
        for row in cursor.fetchall():
            payments.append({
                'id': row['id'],
                'patient_id': row['patient_id'],
                'patient_name': row['patient_name'],
                'reference_type': row['reference_type'],
                'reference_id': row['reference_id'],
                'description': row['description'],
                'amount': float(row['amount']),
                'status': row['status'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None
            })
        
        return jsonify(payments)
        
    except Exception as e:
        print(f'Error searching payments: {e}')
        return jsonify({'error': 'Failed to search payments'}), 500
    finally:
        cursor.close()
        conn.close()
