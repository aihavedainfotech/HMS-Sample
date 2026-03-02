"""
Simple PostgreSQL test endpoint
"""

from flask import Flask, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/api/test-departments')
def test_departments():
    """Test PostgreSQL departments endpoint"""
    database_url = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT * FROM departments ORDER BY dept_name")
        departments = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(departments),
            'data': [dict(dept) for dept in departments]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test-health')
def test_health():
    """Test health endpoint"""
    database_url = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'postgresql_version': version[0]
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Simple PostgreSQL Test Server...")
    print("📊 Test endpoints:")
    print("  - http://localhost:5001/api/test-health")
    print("  - http://localhost:5001/api/test-departments")
    app.run(host='0.0.0.0', port=5001, debug=True)
