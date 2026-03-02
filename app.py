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
CORS(app)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
socketio = SocketIO(app, cors_allowed_origins="*")

# Database configuration
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

def get_db_connection():
    """Get database connection"""
    try:
        print(f"DEBUG: Attempting to connect to: {DATABASE_URL[:50]}...")
        conn = pg8000.connect(DATABASE_URL)
        print("DEBUG: Database connection successful!")
        return conn
    except Exception as e:
        print(f"DEBUG: Database connection error: {e}")
        print(f"DEBUG: Error type: {type(e)}")
        raise

def init_database():
    """Initialize database tables"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create tables if they don't exist
        with open('hms-system/database/schema.sql', 'r') as f:
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

if __name__ == '__main__':
    # Run the app
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
