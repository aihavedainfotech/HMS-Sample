"""
Fix Critical API Endpoints for Staff Dashboards
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# PostgreSQL connection
def get_db_connection():
    return psycopg2.connect('postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db')

def get_dict_cursor(conn):
    return conn.cursor(cursor_factory=RealDictCursor)

# Fix critical endpoints that staff dashboards need
@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute("SELECT * FROM departments ORDER BY name")
        departments = cursor.fetchall()
        return jsonify([dict(dept) for dept in departments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/staff', methods=['GET'])
def get_staff():
    """Get all staff"""
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
def get_medicine_inventory():
    """Get medicine inventory"""
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
def get_beds():
    """Get all beds"""
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

if __name__ == '__main__':
    print("🚀 Starting fixed API endpoints server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
