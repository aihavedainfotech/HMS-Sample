import os
import sqlite3
from flask_bcrypt import Bcrypt
from flask import Flask

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'backend', 'hospital_db.sqlite')

app = Flask(__name__)
bcrypt = Bcrypt(app)

def check_passwords():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT staff_id, password_hash FROM staff LIMIT 3")
    rows = cursor.fetchall()
    
    for row in rows:
        staff_id = row['staff_id']
        pw_hash = row['password_hash']
        try:
            is_correct = bcrypt.check_password_hash(pw_hash, 'password123')
            print(f"Staff: {staff_id}, Hash: {pw_hash[:10]}..., Valid: {is_correct}")
        except Exception as e:
            print(f"Staff: {staff_id}, Error: {e}")
            
    conn.close()

if __name__ == '__main__':
    check_passwords()
