"""
Dashboard API Server - Provides all endpoints needed for staff dashboards
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import bcrypt

load_dotenv()

app = Flask(__name__)
CORS(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'hms-jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

# PostgreSQL connection
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='hospital_db',
            user='hms_user',
            password='Sravan.9010'
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise e

def get_dict_cursor(conn):
    return conn.cursor(cursor_factory=RealDictCursor)

# Authentication endpoint
@app.route('/api/auth/staff/login', methods=['POST'])
def staff_login():
    """Staff login endpoint for dashboards"""
    data = request.get_json()
    staff_id = data.get('staff_id', '').strip().upper()
    password = data.get('password', '')
    
    if not staff_id or not password:
        return jsonify({'error': 'Staff ID and password are required'}), 400
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT s.*, d.dept_name 
            FROM staff s 
            LEFT JOIN departments d ON s.department_id = d.id 
            WHERE s.staff_id = %s AND s.is_active = TRUE
        """, (staff_id,))
        staff = cursor.fetchone()
        
        if not staff:
            return jsonify({'error': 'Invalid staff ID or password'}), 401
        
        # Verify password
        try:
            if not bcrypt.checkpw(password.encode('utf-8'), staff['password_hash'].encode('utf-8')):
                return jsonify({'error': 'Invalid staff ID or password'}), 401
        except:
            return jsonify({'error': 'Invalid staff ID or password'}), 401
        
        # Generate JWT token
        access_token = create_access_token(identity=staff['staff_id'])
        
        # Update last login
        cursor.execute("UPDATE staff SET last_login = NOW() WHERE staff_id = %s", (staff['staff_id'],))
        conn.commit()
        
        staff_dict = dict(staff)
        staff_dict.pop('password_hash', None)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'staff': staff_dict
        })
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()

# Dashboard data endpoints
@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM departments ORDER BY id")
        departments = cursor.fetchall()
        return jsonify([dict(dept) for dept in departments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/staff', methods=['GET'])
@jwt_required()
def get_staff():
    """Get all staff"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT s.*, d.dept_name 
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

@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    """Get all doctors"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("""
            SELECT d.*, s.first_name, s.last_name, s.email, s.phone, 
                   dept.dept_name, s.sub_department as department_specialization
            FROM doctors d
            JOIN staff s ON d.staff_id = s.staff_id
            LEFT JOIN departments dept ON s.department_id = dept.id
            WHERE s.is_active = TRUE
            ORDER BY d.rating DESC
        """)
        doctors = cursor.fetchall()
        return jsonify([dict(d) for d in doctors])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_patients():
    """Get all patients"""
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
def get_medicine_inventory():
    """Get medicine inventory"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM medicine_inventory WHERE is_active = TRUE ORDER BY brand_name")
        inventory = cursor.fetchall()
        return jsonify([dict(item) for item in inventory])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/beds', methods=['GET'])
@jwt_required()
def get_beds():
    """Get all beds"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM beds ORDER BY bed_id")
        beds = cursor.fetchall()
        return jsonify([dict(bed) for bed in beds])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pending_payments', methods=['GET'])
@jwt_required()
def get_pending_payments():
    """Get pending payments"""
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
def get_collections():
    """Get collections"""
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
def get_lab_orders():
    """Get lab orders"""
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
def get_lab_results():
    """Get lab results"""
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
def get_admissions():
    """Get admissions"""
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
def get_prescriptions():
    """Get prescriptions"""
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

# Real-time updates endpoint
@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        stats = {}
        
        # Staff count
        cursor.execute("SELECT COUNT(*) as count FROM staff WHERE is_active = TRUE")
        stats['staff_count'] = cursor.fetchone()['count']
        
        # Patients count
        cursor.execute("SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE")
        stats['patients_count'] = cursor.fetchone()['count']
        
        # Departments count
        cursor.execute("SELECT COUNT(*) as count FROM departments")
        stats['departments_count'] = cursor.fetchone()['count']
        
        # Beds status
        cursor.execute("SELECT COUNT(*) as total FROM beds")
        total_beds = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) as occupied FROM beds WHERE status = 'Occupied'")
        occupied_beds = cursor.fetchone()['occupied']
        stats['beds'] = {
            'total': total_beds,
            'occupied': occupied_beds,
            'available': total_beds - occupied_beds
        }
        
        # Today's collections
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE DATE(collected_at) = CURRENT_DATE")
        stats['today_collections'] = float(cursor.fetchone()['total'])
        
        # Pending payments
        cursor.execute("SELECT COUNT(*) as count FROM pending_payments")
        stats['pending_payments'] = cursor.fetchone()['count']
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }), 503

# Admin dashboard endpoint
@app.route('/api/admin/dashboard', methods=['GET'])
@jwt_required()
def get_admin_dashboard():
    """Get admin dashboard data"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get dashboard metrics
        cursor.execute("SELECT COUNT(*) as count FROM staff WHERE is_active = TRUE")
        total_staff = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE")
        active_patients = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM beds WHERE status = 'Occupied'")
        occupied_beds = cursor.fetchone()['count']
        
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE DATE(collected_at) = CURRENT_DATE")
        today_revenue = float(cursor.fetchone()['total'])
        
        # Get today's appointments
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM appointments 
            WHERE DATE(created_at) = CURRENT_DATE
        """)
        appt_data = cursor.fetchone()
        
        # Get department occupancy
        cursor.execute("""
            SELECT d.dept_name, 0 as patients, COUNT(s.staff_id) as staff
            FROM departments d
            LEFT JOIN staff s ON s.department_id = d.id AND s.is_active = TRUE
            GROUP BY d.dept_name
            ORDER BY staff DESC
            LIMIT 5
        """)
        dept_occupancy = cursor.fetchall()
        
        # Get recent activity (mock data for now)
        recent_activity = [
            {"id": 1, "action": "New patient registered", "user": "REC001", "time": "2 mins ago", "type": "patient"},
            {"id": 2, "action": "Payment collected", "user": "BIL001", "time": "5 mins ago", "type": "payment"},
            {"id": 3, "action": "Doctor appointment scheduled", "user": "REC001", "time": "10 mins ago", "type": "appointment"},
        ]
        
        return jsonify({
            "metrics": {
                "total_staff": total_staff,
                "active_patients": active_patients,
                "occupied_beds": str(occupied_beds),
                "monthly_revenue": str(today_revenue)
            },
            "today_appointments": {
                "total": appt_data['total'] or 0,
                "completed": appt_data['completed'] or 0,
                "pending": appt_data['pending'] or 0
            },
            "department_occupancy": [dict(d) for d in dept_occupancy],
            "recent_activity": recent_activity
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Admin departments endpoint  
@app.route('/api/admin/departments', methods=['GET'])
@jwt_required()
def get_admin_departments():
    """Get departments for admin management"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM departments ORDER BY id")
        departments = cursor.fetchall()
        return jsonify([dict(dept) for dept in departments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor appointments endpoint
@app.route('/api/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    """Get appointments with optional filters"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        doctor_id = request.args.get('doctor_id')
        status = request.args.get('status')
        patient_id = request.args.get('patient_id')
        limit = request.args.get('limit', 10, type=int)
        
        query = """
            SELECT a.*, p.first_name || ' ' || p.last_name as patient_name,
                   p.patient_id, p.mobile_number as patient_phone,
                   s.first_name || ' ' || s.last_name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN staff s ON a.doctor_id = s.staff_id
            WHERE 1=1
        """
        params = []
        
        if doctor_id:
            query += " AND a.doctor_id = %s"
            params.append(doctor_id)
        
        if status:
            query += " AND a.status = %s"
            params.append(status)
            
        if patient_id:
            query += " AND a.patient_id = %s"
            params.append(patient_id)
        
        query += " ORDER BY a.appointment_date DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        appointments = cursor.fetchall()
        return jsonify([dict(apt) for apt in appointments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor today's queue endpoint
@app.route('/api/doctor/queue/today', methods=['GET'])
@jwt_required()
def get_doctor_queue_today():
    """Get today's queue for a specific doctor"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        doctor_id = request.args.get('doctor_id')
        if not doctor_id:
            return jsonify({'error': 'doctor_id required'}), 400
        
        # Check if queue table exists and has data
        cursor.execute("""
            SELECT q.*, p.first_name || ' ' || p.last_name as patient_name,
                   p.patient_id, p.mobile_number, p.date_of_birth, p.gender,
                   a.appointment_time, a.reason_for_visit, a.appointment_type,
                   d.dept_name as department_name
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.appointment_id
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN staff s ON a.doctor_id = s.staff_id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE a.doctor_id = %s 
            AND DATE(a.appointment_date) = CURRENT_DATE
            AND q.status NOT IN ('Completed', 'Cancelled')
            ORDER BY q.token_number, q.created_at
        """, (doctor_id,))
        
        queue = cursor.fetchall()
        return jsonify([dict(item) for item in queue])
    except Exception as e:
        # Return empty array if table doesn't exist or other error
        print(f"Queue fetch error: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# Doctor next patient endpoint
@app.route('/api/doctor/next-patient', methods=['POST'])
@jwt_required()
def call_next_patient():
    """Call the next patient in queue"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        data = request.get_json()
        doctor_id = data.get('doctor_id')
        queue_id = data.get('queue_id')
        
        if not doctor_id or not queue_id:
            return jsonify({'error': 'doctor_id and queue_id required'}), 400
        
        # Update queue status
        cursor.execute("""
            UPDATE queue 
            SET status = 'In_Progress', called_at = NOW() 
            WHERE id = %s AND doctor_id = %s
            RETURNING *
        """, (queue_id, doctor_id))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result:
            return jsonify({'success': True, 'queue_item': dict(result)})
        else:
            return jsonify({'error': 'Queue item not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor profile endpoint
@app.route('/api/doctors/<staff_id>', methods=['GET'])
@jwt_required()
def get_doctor_profile(staff_id):
    """Get doctor profile with staff and doctor details"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get doctor details joined with staff
        cursor.execute("""
            SELECT s.*, d.*, dept.dept_name as department_name
            FROM staff s
            JOIN doctors d ON s.staff_id = d.staff_id
            LEFT JOIN departments dept ON s.department_id = dept.id
            WHERE s.staff_id = %s AND s.is_active = TRUE
        """, (staff_id,))
        
        doctor = cursor.fetchone()
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
            
        return jsonify(dict(doctor))
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor unavailability endpoints
@app.route('/api/doctors/<staff_id>/unavailability', methods=['GET'])
@jwt_required()
def get_doctor_unavailability(staff_id):
    """Get doctor unavailability dates"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check if unavailability table exists
        cursor.execute("""
            SELECT id, doctor_id, unavailable_date, reason, created_at
            FROM doctor_unavailability 
            WHERE doctor_id = %s AND unavailable_date >= CURRENT_DATE
            ORDER BY unavailable_date
        """, (staff_id,))
        
        unavailability = cursor.fetchall()
        
        # Format dates as ISO strings for frontend
        result = []
        for item in unavailability:
            row = dict(item)
            if row.get('unavailable_date'):
                # Convert to ISO format string
                if hasattr(row['unavailable_date'], 'isoformat'):
                    row['unavailable_date'] = row['unavailable_date'].isoformat()
                elif isinstance(row['unavailable_date'], str):
                    # Already a string, keep as is
                    pass
            result.append(row)
        
        return jsonify(result)
        
    except Exception as e:
        # Return empty array if table doesn't exist
        print(f"Unavailability fetch error: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctors/<staff_id>/unavailability', methods=['POST'])
@jwt_required()
def add_doctor_unavailability(staff_id):
    """Add doctor unavailability date"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        data = request.get_json()
        date = data.get('date')
        reason = data.get('reason', 'Vacation/Leave')
        
        if not date:
            return jsonify({'error': 'date required'}), 400
        
        cursor.execute("""
            INSERT INTO doctor_unavailability (doctor_id, unavailable_date, reason, created_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (doctor_id, unavailable_date) DO UPDATE SET reason = EXCLUDED.reason
            RETURNING *
        """, (staff_id, date, reason))
        
        result = cursor.fetchone()
        conn.commit()
        
        return jsonify(dict(result))
        
    except Exception as e:
        # Create table if doesn't exist
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS doctor_unavailability (
                    id SERIAL PRIMARY KEY,
                    doctor_id VARCHAR(50) REFERENCES staff(staff_id),
                    unavailable_date DATE NOT NULL,
                    reason VARCHAR(255),
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(doctor_id, unavailable_date)
                )
            """)
            conn.commit()
            return jsonify({'message': 'Table created, please try again'})
        except:
            return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/doctors/<staff_id>/unavailability', methods=['DELETE'])
@jwt_required()
def remove_doctor_unavailability(staff_id):
    """Remove doctor unavailability date"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        date = request.args.get('date')
        if not date:
            return jsonify({'error': 'date parameter required'}), 400
        
        cursor.execute("""
            DELETE FROM doctor_unavailability 
            WHERE doctor_id = %s AND unavailable_date = %s
            RETURNING *
        """, (staff_id, date))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Entry not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor profile update endpoint
@app.route('/api/doctor/profile', methods=['PATCH'])
@jwt_required()
def update_doctor_profile():
    """Update doctor profile"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        data = request.get_json()
        # Get current user from JWT token
        current_user = get_jwt_identity()
        staff_id = current_user.get('staff_id') if isinstance(current_user, dict) else current_user
        
        if not staff_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Update doctors table
        allowed_fields = ['qualifications', 'specialization', 'years_of_experience', 
                         'consultation_fee', 'follow_up_fee', 'bio', 'availability_schedule']
        
        updates = []
        params = []
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if updates:
            query = f"UPDATE doctors SET {', '.join(updates)}, updated_at = NOW() WHERE staff_id = %s RETURNING *"
            params.append(staff_id)
            cursor.execute(query, params)
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                return jsonify({'success': True, 'doctor': dict(result)})
            else:
                return jsonify({'error': 'Doctor not found'}), 404
        else:
            return jsonify({'message': 'No fields to update'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor schedule update endpoint
@app.route('/api/doctor/schedule', methods=['PATCH'])
@jwt_required()
def update_doctor_schedule():
    """Update doctor availability schedule"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        data = request.get_json()
        schedule = data.get('schedule')
        
        # Get current user from JWT token
        current_user = get_jwt_identity()
        staff_id = current_user.get('staff_id') if isinstance(current_user, dict) else current_user
        
        if not staff_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        if not schedule:
            return jsonify({'error': 'Schedule data required'}), 400
        
        # Store schedule as JSON string
        import json
        schedule_json = json.dumps(schedule)
        
        cursor.execute("""
            UPDATE doctors 
            SET availability_schedule = %s, updated_at = NOW() 
            WHERE staff_id = %s 
            RETURNING *
        """, (schedule_json, staff_id))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result:
            return jsonify({'success': True, 'schedule': schedule})
        else:
            return jsonify({'error': 'Doctor not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Doctor change password endpoint
@app.route('/api/doctor/change-password', methods=['PATCH'])
@jwt_required()
def change_doctor_password():
    """Change doctor password"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        # Get current user from JWT token
        current_user = get_jwt_identity()
        staff_id = current_user.get('staff_id') if isinstance(current_user, dict) else current_user
        
        if not staff_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new password required'}), 400
        
        # Verify current password
        cursor.execute("SELECT password_hash FROM staff WHERE staff_id = %s", (staff_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        stored_hash = user['password_hash']
        if not stored_hash or not bcrypt.checkpw(current_password.encode('utf-8'), stored_hash.encode('utf-8')):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Hash new password
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute("""
            UPDATE staff SET password_hash = %s, updated_at = NOW() 
            WHERE staff_id = %s
        """, (new_hash, staff_id))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Password changed successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Unified Patient Registration + Appointment Booking Endpoint
@app.route('/api/receptionist/register-and-book', methods=['POST'])
@jwt_required()
def register_and_book_appointment():
    """Register new patient and book appointment in one step"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        data = request.get_json()
        
        # Extract patient data
        full_name = data.get('full_name', '').strip()
        age = data.get('age')
        gender = data.get('gender')
        mobile_number = data.get('mobile_number', '')
        # Remove non-digit characters from mobile number
        mobile_number = re.sub(r'\D', '', mobile_number)
        
        # Extract appointment data
        department_id = data.get('department_id')
        specialization = data.get('specialization')
        doctor_id = data.get('doctor_id')
        appointment_date = data.get('appointment_date')
        time_slot = data.get('time_slot')
        reason = data.get('reason', '')
        allergies = data.get('allergies', '')
        registered_by = data.get('registered_by', 'Receptionist')
        
        # Validation
        if not full_name or len(full_name) < 3:
            return jsonify({'error': 'Full name is required (min 3 characters)'}), 400
        if not age or age < 1 or age > 120:
            return jsonify({'error': 'Valid age is required (1-120)'}), 400
        if not gender:
            return jsonify({'error': 'Gender is required'}), 400
        if not mobile_number or len(mobile_number) < 10:
            return jsonify({'error': 'Valid mobile number is required (min 10 digits)'}), 400
        if not doctor_id:
            return jsonify({'error': 'Doctor is required'}), 400
        if not appointment_date or not time_slot:
            return jsonify({'error': 'Appointment date and time slot are required'}), 400
        
        # Generate unique patient ID
        cursor.execute("SELECT MAX(CAST(SUBSTRING(patient_id FROM 2) AS INTEGER)) as max_id FROM patients WHERE patient_id LIKE 'P%'")
        result = cursor.fetchone()
        next_id = (result['max_id'] or 0) + 1
        patient_id = f"P{next_id:04d}"
        
        # Split full name into first and last
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Calculate date of birth from age
        from datetime import datetime, timedelta
        current_year = datetime.now().year
        birth_year = current_year - age
        date_of_birth = f"{birth_year}-01-01"
        
        # Get doctor's department
        cursor.execute("SELECT dept_id FROM staff WHERE staff_id = %s", (doctor_id,))
        doc_result = cursor.fetchone()
        doctor_dept_id = doc_result['dept_id'] if doc_result else None
        
        # Insert patient
        cursor.execute("""
            INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, 
                                phone, email, address, blood_group, allergies, emergency_contact_name,
                                emergency_contact_phone, emergency_contact_relation, registered_by, 
                                created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (patient_id, first_name, last_name, date_of_birth, gender, mobile_number, 
              None, None, None, allergies, None, mobile_number, 'Self', registered_by))
        
        # Create appointment
        cursor.execute("""
            INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, 
                                  appointment_time, status, type, reason, symptoms, 
                                  created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (patient_id, doctor_id, doctor_dept_id, appointment_date, time_slot, 
              'scheduled', 'OPD', reason, reason))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'patient_id': patient_id,
            'message': 'Patient registered and appointment booked successfully'
        })
        
    except Exception as e:
        conn.rollback()
        print(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Public endpoint for doctors with availability (no auth required)
@app.route('/api/public/doctors/with-availability', methods=['GET'])
def get_doctors_with_availability_public():
    """Get all doctors with their availability schedule (public endpoint)"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get all active doctors with their schedule
        cursor.execute("""
            SELECT s.staff_id, s.first_name, s.last_name, s.specialization, 
                   s.availability_schedule
            FROM staff s
            WHERE s.role = 'Doctor' AND s.status = 'Active'
            ORDER BY s.specialization, s.first_name
        """)
        
        doctors = cursor.fetchall()
        result = []
        
        for doc in doctors:
            # Parse availability schedule
            schedule = {}
            if doc['availability_schedule']:
                try:
                    import json
                    schedule = json.loads(doc['availability_schedule']) if isinstance(doc['availability_schedule'], str) else doc['availability_schedule']
                except:
                    schedule = {}
            
            # Get unavailable dates for this doctor
            cursor.execute("""
                SELECT unavailable_date 
                FROM doctor_unavailability 
                WHERE doctor_id = %s AND unavailable_date >= CURRENT_DATE
            """, (doc['staff_id'],))
            
            unavailable = [row['unavailable_date'].isoformat() if hasattr(row['unavailable_date'], 'isoformat') else str(row['unavailable_date']) for row in cursor.fetchall()]
            
            result.append({
                'staff_id': doc['staff_id'],
                'first_name': doc['first_name'],
                'last_name': doc['last_name'],
                'specialization': doc['specialization'],
                'schedule': schedule,
                'unavailable_dates': unavailable
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error fetching doctors with availability: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Get doctors with availability schedule
@app.route('/api/doctors/with-availability', methods=['GET'])
@jwt_required()
def get_doctors_with_availability():
    """Get all doctors with their availability schedule and unavailable dates"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get all active doctors with their schedule
        cursor.execute("""
            SELECT s.staff_id, s.first_name, s.last_name, s.specialization, 
                   s.availability_schedule
            FROM staff s
            WHERE s.role = 'Doctor' AND s.status = 'Active'
            ORDER BY s.specialization, s.first_name
        """)
        
        doctors = cursor.fetchall()
        result = []
        
        for doc in doctors:
            # Parse availability schedule
            schedule = {}
            if doc['availability_schedule']:
                try:
                    import json
                    schedule = json.loads(doc['availability_schedule']) if isinstance(doc['availability_schedule'], str) else doc['availability_schedule']
                except:
                    schedule = {}
            
            # Get unavailable dates for this doctor
            cursor.execute("""
                SELECT unavailable_date 
                FROM doctor_unavailability 
                WHERE doctor_id = %s AND unavailable_date >= CURRENT_DATE
            """, (doc['staff_id'],))
            
            unavailable = [row['unavailable_date'].isoformat() if hasattr(row['unavailable_date'], 'isoformat') else str(row['unavailable_date']) for row in cursor.fetchall()]
            
            result.append({
                'staff_id': doc['staff_id'],
                'first_name': doc['first_name'],
                'last_name': doc['last_name'],
                'specialization': doc['specialization'],
                'schedule': schedule,
                'unavailable_dates': unavailable
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error fetching doctors with availability: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    print("🚀 Starting Dashboard API Server on port 5002...")
    print("📊 Providing all endpoints for staff dashboards")
    print("🔐 Authentication: JWT-based")
    print("🗄️  Database: PostgreSQL")
    app.run(host='0.0.0.0', port=5002, debug=True)
