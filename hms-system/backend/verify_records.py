
import sqlite3
import json

db_path = '/home/ubuntu/Downloads/kimi_clone/hms-system/database/hms.db'

def check_patient_records(patient_id):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"--- Records for Patient: {patient_id} ---")
    
    # Check Prescriptions
    cursor.execute("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5", (patient_id,))
    rows = cursor.fetchall()
    print(f"\n[Prescriptions Found: {len(rows)}]")
    for row in rows:
        print(dict(row))
        
    # Check Lab Orders
    cursor.execute("SELECT * FROM lab_orders WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5", (patient_id,))
    rows = cursor.fetchall()
    print(f"\n[Lab Orders Found: {len(rows)}]")
    for row in rows:
        print(dict(row))
        
    conn.close()

if __name__ == "__main__":
    check_patient_records('P0099')
