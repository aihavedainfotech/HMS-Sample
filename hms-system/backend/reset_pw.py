import os
import psycopg2
from dotenv import load_dotenv
from flask import Flask
from flask_bcrypt import Bcrypt

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
app = Flask(__name__)
bcrypt = Bcrypt(app)

def reset_passwords():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    password = 'password123'
    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    staff_ids = ['ADM001', 'DOC001', 'REC001', 'FRONT001']
    for sid in staff_ids:
        cursor.execute("UPDATE staff SET password_hash = %s, is_active = TRUE WHERE staff_id = %s", (pw_hash, sid))
        print(f"Reset password for {sid}")
        
    conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    reset_passwords()
