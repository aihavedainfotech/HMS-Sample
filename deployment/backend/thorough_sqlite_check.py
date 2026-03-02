"""
Thorough SQLite Database Check - Find All Staff Data
"""

import os
import sqlite3
import psycopg2
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_sqlite_staff_data(db_path):
    """Check staff data in a SQLite database"""
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if staff table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='staff'")
        if not cursor.fetchone():
            return []
        
        # Get all staff records
        cursor.execute("SELECT * FROM staff")
        staff_records = cursor.fetchall()
        
        if staff_records:
            logger.info(f"Found {len(staff_records)} staff records in {os.path.basename(db_path)}")
            return [dict(row) for row in staff_records]
        else:
            logger.info(f"No staff records found in {os.path.basename(db_path)}")
            return []
            
    except Exception as e:
        logger.error(f"Error checking {db_path}: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()

def get_postgresql_staff():
    """Get current PostgreSQL staff data"""
    try:
        conn = psycopg2.connect('postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT staff_id, first_name, last_name, role FROM staff ORDER BY staff_id")
        pg_staff = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return pg_staff
        
    except Exception as e:
        logger.error(f"Error getting PostgreSQL staff: {e}")
        return []

def main():
    """Main function to check all SQLite databases"""
    logger.info("🔍 THOROUGH SQLITE DATABASE CHECK FOR STAFF DATA")
    logger.info("=" * 80)
    
    # Find all SQLite databases
    sqlite_files = []
    for root, dirs, files in os.walk('/home/ubuntu/Downloads/Assignment_1/HMS_Copy1'):
        for file in files:
            if file.endswith('.sqlite') or file.endswith('.db'):
                sqlite_files.append(os.path.join(root, file))
    
    logger.info(f"Found {len(sqlite_files)} SQLite databases")
    
    # Collect all staff data from all SQLite databases
    all_sqlite_staff = []
    staff_by_db = {}
    
    for db_file in sqlite_files:
        staff_data = check_sqlite_staff_data(db_file)
        if staff_data:
            staff_by_db[os.path.basename(db_file)] = staff_data
            all_sqlite_staff.extend(staff_data)
    
    # Remove duplicates by staff_id
    unique_sqlite_staff = {}
    for staff in all_sqlite_staff:
        staff_id = staff.get('staff_id')
        if staff_id and staff_id not in unique_sqlite_staff:
            unique_sqlite_staff[staff_id] = staff
    
    logger.info(f"\n📊 STAFF DATA SUMMARY:")
    logger.info(f"Total unique staff records in SQLite: {len(unique_sqlite_staff)}")
    
    # Get PostgreSQL staff
    pg_staff = get_postgresql_staff()
    pg_staff_dict = {row[0]: row for row in pg_staff}
    
    logger.info(f"Total staff records in PostgreSQL: {len(pg_staff_dict)}")
    
    # Find missing staff in PostgreSQL
    missing_staff = []
    for staff_id, staff_data in unique_sqlite_staff.items():
        if staff_id not in pg_staff_dict:
            missing_staff.append(staff_data)
    
    logger.info(f"\n❌ MISSING STAFF IN POSTGRESQL: {len(missing_staff)}")
    
    if missing_staff:
        logger.info("\nMissing Staff Details:")
        for staff in missing_staff:
            logger.info(f"  - {staff.get('staff_id')}: {staff.get('first_name', '')} {staff.get('last_name', '')} - {staff.get('role', 'Unknown')}")
    
    # Find all unique roles in SQLite
    sqlite_roles = set()
    for staff in unique_sqlite_staff.values():
        role = staff.get('role')
        if role:
            sqlite_roles.add(role)
    
    # Find all unique roles in PostgreSQL
    pg_roles = set()
    for staff_id, (sid, fname, lname, role) in pg_staff_dict.items():
        if role:
            pg_roles.add(role)
    
    logger.info(f"\n🎭 ROLE COMPARISON:")
    logger.info(f"SQLite roles: {sorted(sqlite_roles)}")
    logger.info(f"PostgreSQL roles: {sorted(pg_roles)}")
    
    missing_roles = sqlite_roles - pg_roles
    if missing_roles:
        logger.info(f"Missing roles in PostgreSQL: {sorted(missing_roles)}")
    
    # Show staff by database
    logger.info(f"\n📁 STAFF BY DATABASE:")
    for db_name, staff_list in staff_by_db.items():
        logger.info(f"\n{db_name}:")
        for staff in staff_list:
            logger.info(f"  - {staff.get('staff_id')}: {staff.get('first_name', '')} {staff.get('last_name', '')} - {staff.get('role', 'Unknown')}")
    
    return unique_sqlite_staff, missing_staff, missing_roles

if __name__ == "__main__":
    main()
