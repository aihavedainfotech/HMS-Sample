"""
Migrate Missing Staff Accounts to PostgreSQL
"""

import os
import sqlite3
import psycopg2
import bcrypt
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_missing_staff():
    """Migrate missing staff from SQLite to PostgreSQL"""
    
    # Missing staff from SQLite
    missing_staff = [
        {
            'staff_id': 'ADMIN001',
            'first_name': 'System',
            'last_name': 'Administrator',
            'role': 'Admin',
            'department_id': 17,  # Administration
            'email': 'admin@hospital.com',
            'phone': '555-1000',
            'designation': 'System Administrator',
            'date_of_joining': '2020-01-01',
            'employment_type': 'Full-time'
        },
        {
            'staff_id': 'DOC002',
            'first_name': 'Susan',
            'last_name': 'Smith',
            'role': 'Doctor',
            'department_id': 2,  # General Medicine
            'email': 'susan.smith@hospital.com',
            'phone': '555-2002',
            'designation': 'General Physician',
            'date_of_joining': '2021-06-15',
            'employment_type': 'Full-time'
        },
        {
            'staff_id': 'NUR001',
            'first_name': 'Nancy',
            'last_name': 'Nurse',
            'role': 'Nurse',
            'department_id': 3,  # Nursing
            'email': 'nancy.nurse@hospital.com',
            'phone': '555-3001',
            'designation': 'Senior Nurse',
            'date_of_joining': '2021-03-10',
            'employment_type': 'Full-time'
        },
        {
            'staff_id': 'LAB001',
            'first_name': 'Larry',
            'last_name': 'Lab',
            'role': 'Lab_Technician',
            'department_id': 5,  # Laboratory
            'email': 'larry.lab@hospital.com',
            'phone': '555-4001',
            'designation': 'Lab Technician',
            'date_of_joining': '2021-04-20',
            'employment_type': 'Full-time'
        },
        {
            'staff_id': 'ADM002',
            'first_name': 'Rahul',
            'last_name': 'Sharma',
            'role': 'Admission',
            'department_id': 4,  # Admissions
            'email': 'rahul.sharma@hospital.com',
            'phone': '555-5001',
            'designation': 'Admission Officer',
            'date_of_joining': '2021-05-15',
            'employment_type': 'Full-time'
        }
    ]
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect('postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db')
        cursor = conn.cursor()
        
        # Generate password hash for all staff
        password = 'password123'
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        logger.info(f"🔄 Migrating {len(missing_staff)} missing staff accounts...")
        
        migrated_count = 0
        for staff in missing_staff:
            try:
                # Check if staff already exists
                cursor.execute("SELECT staff_id FROM staff WHERE staff_id = %s", (staff['staff_id'],))
                if cursor.fetchone():
                    logger.info(f"⚠️  Staff {staff['staff_id']} already exists, skipping...")
                    continue
                
                # Insert staff record
                cursor.execute("""
                    INSERT INTO staff (
                        staff_id, first_name, last_name, role, department_id,
                        email, phone, designation, date_of_joining, employment_type,
                        password_hash, is_active, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    staff['staff_id'],
                    staff['first_name'],
                    staff['last_name'],
                    staff['role'],
                    staff['department_id'],
                    staff['email'],
                    staff['phone'],
                    staff['designation'],
                    staff['date_of_joining'],
                    staff['employment_type'],
                    password_hash,
                    True,  # is_active
                    datetime.now(),
                    datetime.now()
                ))
                
                logger.info(f"✅ Migrated: {staff['staff_id']} - {staff['first_name']} {staff['last_name']} ({staff['role']})")
                migrated_count += 1
                
            except Exception as e:
                logger.error(f"❌ Failed to migrate {staff['staff_id']}: {e}")
                continue
        
        # Commit the transaction
        conn.commit()
        
        # Verify the migration
        cursor.execute("SELECT staff_id, first_name, last_name, role FROM staff ORDER BY staff_id")
        all_staff = cursor.fetchall()
        
        logger.info(f"\n📊 FINAL STAFF ROSTER ({len(all_staff)} total):")
        for staff in all_staff:
            logger.info(f"  - {staff[0]}: {staff[1]} {staff[2]} - {staff[3]}")
        
        cursor.close()
        conn.close()
        
        logger.info(f"\n🎉 Migration completed! Successfully migrated {migrated_count} staff accounts.")
        return migrated_count
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return 0

if __name__ == "__main__":
    migrate_missing_staff()
