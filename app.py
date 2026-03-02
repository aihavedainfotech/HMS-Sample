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

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'hms-dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'hms-jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Initialize extensions
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/auth/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/admin/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/doctor/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/receptionist/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/pharmacist/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/lab/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/nurse/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/billing/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/admission/*": {
        "origins": ["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
jwt = JWTManager(app)
bcrypt = Bcrypt(app)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
socketio = SocketIO(app, cors_allowed_origins=["https://hms-sample-self.vercel.app", "http://localhost:5173", "http://localhost:3000"])

# Global CORS handler - must run before JWT checks
@app.before_request
def handle_preflight():
    """Handle CORS preflight requests globally"""
    if request.method == "OPTIONS":
        response = app.make_response('')
        response.headers.add("Access-Control-Allow-Origin", "https://hms-sample-self.vercel.app")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

# Database configuration - Connection Pooling for performance
DATABASE_URL = os.environ.get('DATABASE_URL')
print(f"DEBUG: DATABASE_URL = {DATABASE_URL}")
print(f"DEBUG: All env vars starting with DB_: {[k for k in os.environ.keys() if k.startswith('DB_')]}")
print(f"DEBUG: All env vars containing DATABASE: {[k for k in os.environ.keys() if 'DATABASE' in k]}")

if not DATABASE_URL:
    print("DEBUG: DATABASE_URL is None or empty")
    raise ValueError("DATABASE_URL environment variable is not set")
else:
    print(f"DEBUG: DATABASE_URL found, length: {len(DATABASE_URL)}")

# Import database utilities
import pg8000
from urllib.parse import urlparse

# Connection pool for reuse
_db_pool = []
_pool_lock = False

def get_db_connection():
    """Get database connection from pool or create new"""
    try:
        # Parse DATABASE_URL once
        parsed = urlparse(DATABASE_URL)
        
        # Quick connection without SSL first
        conn = pg8000.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
            ssl_context=False  # Disable SSL for faster connection
        )
        return conn
    except Exception as e:
        # Fallback with SSL
        try:
            conn = pg8000.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path[1:],
                user=parsed.username,
                password=parsed.password,
                ssl_context=True
            )
            return conn
        except Exception as e2:
            raise

def init_database():
    """Initialize database tables"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create tables if they don't exist
        with open('hms-system/database/neon_schema.sql', 'r') as f:
            schema_sql = f.read()
            cur.execute(schema_sql)
        
        conn.commit()
        cur.close()
        conn.close()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")
        raise

# Initialize database on startup
try:
    init_database()
except Exception as e:
    print(f"Warning: Could not initialize database: {e}")

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'version': '2.0'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# Main route
@app.route('/')
def index():
    return jsonify({
        'message': 'HMS Backend API v2.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })

# Staff Authentication
@app.route('/auth/staff/login', methods=['POST'])
def staff_login():
    """Staff login endpoint"""
    try:
        data = request.get_json()
        staff_id = data.get('staff_id')
        password = data.get('password')
        
        if not staff_id or not password:
            return jsonify({'error': 'Staff ID and password required'}), 400
        
        # Connect to database
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query staff member
        cur.execute("""
            SELECT staff_id, first_name, last_name, role, department_id, 
                   password_hash, is_active 
            FROM staff 
            WHERE staff_id = %s
        """, (staff_id,))
        
        staff = cur.fetchone()
        cur.close()
        conn.close()
        
        if not staff:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if staff is active
        if not staff[6]:  # is_active
            return jsonify({'error': 'Account is deactivated'}), 403
        
        # Verify password
        if not bcrypt.check_password_hash(staff[5], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create JWT token
        access_token = create_access_token(identity={
            'staff_id': staff[0],
            'name': f"{staff[1]} {staff[2]}",
            'role': staff[3],
            'department_id': staff[4]
        })
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'staff': {
                'staff_id': staff[0],
                'name': f"{staff[1]} {staff[2]}",
                'role': staff[3],
                'department_id': staff[4]
            }
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Login failed', 'message': str(e)}), 500

# Dashboard API Endpoints
@app.route('/admin/dashboard', methods=['GET'])
@jwt_required()
def admin_dashboard():
    """Admin dashboard data"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get stats
        cur.execute("SELECT COUNT(*) FROM staff WHERE is_active = TRUE")
        staff_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM patients WHERE is_active = TRUE")
        patient_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Confirmed'")
        appointment_count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'staff_count': staff_count,
            'patient_count': patient_count,
            'appointment_count': appointment_count,
            'user': current_user
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/doctor/dashboard', methods=['GET'])
@jwt_required()
def doctor_dashboard():
    """Doctor dashboard data"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Doctor':
            return jsonify({'error': 'Unauthorized'}), 403
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get doctor's appointments
        cur.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE doctor_id = %s AND appointment_date = CURRENT_DATE
        """, (current_user['staff_id'],))
        today_appointments = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'today_appointments': today_appointments,
            'user': current_user
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/doctor/stats', methods=['GET'])
@jwt_required()
def doctor_stats():
    """Doctor stats endpoint"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Doctor':
            return jsonify({'error': 'Unauthorized'}), 403
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get doctor's stats
        cur.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE doctor_id = %s AND appointment_date = CURRENT_DATE
        """, (current_user['staff_id'],))
        today_appointments = cur.fetchone()[0]
        
        cur.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE doctor_id = %s AND status = 'Pending'
        """, (current_user['staff_id'],))
        pending_appointments = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'today_appointments': today_appointments,
            'pending_appointments': pending_appointments,
            'total_patients': 0,
            'user': current_user
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/receptionist/dashboard', methods=['GET'])
@jwt_required()
def receptionist_dashboard():
    """Receptionist dashboard data"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Receptionist':
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify({
            'message': 'Receptionist dashboard',
            'user': current_user
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/pharmacist/dashboard', methods=['GET'])
@jwt_required()
def pharmacist_dashboard():
    """Pharmacist dashboard data"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Pharmacist':
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify({
            'message': 'Pharmacist dashboard',
            'user': current_user
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/lab/dashboard', methods=['GET'])
@jwt_required()
def lab_dashboard():
    """Lab technician dashboard data"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Lab_Technician':
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify({
            'message': 'Lab dashboard',
            'user': current_user
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Patient Authentication
@app.route('/auth/patient/login', methods=['POST'])
def patient_login():
    """Patient login endpoint"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        password = data.get('password')
        
        if not patient_id or not password:
            return jsonify({'error': 'Patient ID and password required'}), 400
        
        # Connect to database
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query patient
        cur.execute("""
            SELECT patient_id, first_name, last_name, email, 
                   password_hash, is_active 
            FROM patients 
            WHERE patient_id = %s
        """, (patient_id,))
        
        patient = cur.fetchone()
        cur.close()
        conn.close()
        
        if not patient:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if patient is active
        if not patient[5]:  # is_active
            return jsonify({'error': 'Account is deactivated'}), 403
        
        # Verify password
        if not bcrypt.check_password_hash(patient[4], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create JWT token
        access_token = create_access_token(identity={
            'patient_id': patient[0],
            'name': f"{patient[1]} {patient[2]}",
            'email': patient[3]
        })
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'patient': {
                'patient_id': patient[0],
                'name': f"{patient[1]} {patient[2]}",
                'email': patient[3]
            }
        })
        
    except Exception as e:
        print(f"Patient login error: {e}")
        return jsonify({'error': 'Login failed', 'message': str(e)}), 500

# ============================================
# COMPREHENSIVE API ENDPOINTS FOR ALL MODULES
# ============================================

# ---------------- PATIENT MANAGEMENT APIs ----------------
@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_patients():
    """Get all patients"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT patient_id, first_name, last_name, date_of_birth, gender, 
                   blood_group, mobile_number, email, is_active
            FROM patients ORDER BY created_at DESC
        """)
        patients = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            'patients': [{
                'patient_id': p[0],
                'first_name': p[1],
                'last_name': p[2],
                'date_of_birth': str(p[3]),
                'gender': p[4],
                'blood_group': p[5],
                'mobile_number': p[6],
                'email': p[7],
                'is_active': p[8]
            } for p in patients]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/patients/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    """Get single patient details"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT patient_id, first_name, last_name, date_of_birth, gender,
                   blood_group, mobile_number, email, is_active
            FROM patients WHERE patient_id = %s
        """, (patient_id,))
        patient = cur.fetchone()
        cur.close()
        conn.close()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
            
        return jsonify({
            'patient': {
                'patient_id': patient[0],
                'first_name': patient[1],
                'last_name': patient[2],
                'date_of_birth': str(patient[3]),
                'gender': patient[4],
                'blood_group': patient[5],
                'mobile_number': patient[6],
                'email': patient[7],
                'is_active': patient[8]
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------------- APPOINTMENT MANAGEMENT APIs ----------------
@app.route('/api/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    """Get all appointments"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT a.appointment_id, a.patient_id, p.first_name, p.last_name,
                   a.doctor_id, s.first_name as doc_first, s.last_name as doc_last,
                   a.appointment_date, a.appointment_time, a.status, a.reason
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.doctor_id = s.staff_id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """)
        appointments = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            'appointments': [{
                'appointment_id': a[0],
                'patient_id': a[1],
                'patient_name': f"{a[2]} {a[3]}",
                'doctor_id': a[4],
                'doctor_name': f"{a[5]} {a[6]}",
                'appointment_date': str(a[7]),
                'appointment_time': str(a[8]),
                'status': a[9],
                'reason': a[10]
            } for a in appointments]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------------- DOCTOR APIs ----------------
@app.route('/api/doctor/appointments/today', methods=['GET'])
@jwt_required()
def get_doctor_today_appointments():
    """Get today's appointments for logged in doctor"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Doctor':
            return jsonify({'error': 'Unauthorized'}), 403
            
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT a.appointment_id, a.patient_id, p.first_name, p.last_name,
                   a.appointment_time, a.status, a.reason
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = %s AND a.appointment_date = CURRENT_DATE
            ORDER BY a.appointment_time
        """, (current_user['staff_id'],))
        appointments = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            'appointments': [{
                'appointment_id': a[0],
                'patient_id': a[1],
                'patient_name': f"{a[2]} {a[3]}",
                'appointment_time': str(a[4]),
                'status': a[5],
                'reason': a[6]
            } for a in appointments]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------------- ADMIN APIs ----------------
@app.route('/api/staff', methods=['GET'])
@jwt_required()
def get_all_staff():
    """Get all staff members"""
    try:
        current_user = get_jwt_identity()
        if current_user.get('role') != 'Admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT staff_id, first_name, last_name, email, phone, role, is_active
            FROM staff ORDER BY created_at DESC
        """)
        staff = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            'staff': [{
                'staff_id': s[0],
                'name': f"{s[1]} {s[2]}",
                'email': s[3],
                'phone': s[4],
                'role': s[5],
                'is_active': s[6]
            } for s in staff]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------------- STATS API ----------------
@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_hospital_stats():
    """Get overall hospital statistics"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM patients WHERE is_active = TRUE")
        total_patients = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM staff WHERE is_active = TRUE")
        total_staff = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE")
        today_appointments = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")
        pending_appointments = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'total_patients': total_patients,
            'total_staff': total_staff,
            'today_appointments': today_appointments,
            'pending_appointments': pending_appointments
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------------- DEPARTMENT APIs ----------------
@app.route('/api/departments', methods=['GET'])
@jwt_required()
def get_departments():
    """Get all departments"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT department_id, name, description FROM departments")
        depts = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            'departments': [{'id': d[0], 'name': d[1], 'description': d[2]} for d in depts]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# END COMPREHENSIVE APIs
# ============================================

if __name__ == '__main__':
    # Run the app
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
