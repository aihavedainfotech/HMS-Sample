"""
Migrate Critical Data Manually
"""

import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_critical_data():
    """Migrate critical data manually"""
    
    # Connect to databases
    sqlite_path = '../../hms-system/backend/hospital_db.sqlite'
    postgres_url = 'postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db'
    
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = psycopg2.connect(postgres_url)
    pg_cursor = pg_conn.cursor()
    
    try:
        # Create missing tables first
        logger.info("Creating missing tables...")
        
        # Create registration_otps table
        try:
            pg_cursor.execute("""
                CREATE TABLE IF NOT EXISTS registration_otps (
                    mobile_number VARCHAR(20) PRIMARY KEY,
                    otp VARCHAR(6) NOT NULL,
                    expiry TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            pg_conn.commit()
            logger.info("Created registration_otps table")
        except Exception as e:
            logger.warning(f"registration_otps table already exists: {e}")
        
        # Migrate patients
        logger.info("Migrating patients...")
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM patients")
        rows = sqlite_cursor.fetchall()
        
        if rows:
            columns = [description[0] for description in sqlite_cursor.description]
            placeholders = ', '.join(['%s'] * len(columns))
            insert_query = f"INSERT INTO patients ({', '.join(columns)}) VALUES ({placeholders}) ON CONFLICT (patient_id) DO NOTHING"
            
            for row in rows:
                try:
                    row_data = list(row)
                    pg_cursor.execute(insert_query, row_data)
                except Exception as e:
                    logger.warning(f"Failed to migrate patient row: {e}")
            
            pg_conn.commit()
            logger.info(f"Migrated {len(rows)} patients")
        
        # Migrate appointments
        logger.info("Migrating appointments...")
        sqlite_cursor.execute("SELECT * FROM appointments")
        rows = sqlite_cursor.fetchall()
        
        if rows:
            columns = [description[0] for description in sqlite_cursor.description]
            placeholders = ', '.join(['%s'] * len(columns))
            insert_query = f"INSERT INTO appointments ({', '.join(columns)}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
            
            for row in rows:
                try:
                    row_data = list(row)
                    pg_cursor.execute(insert_query, row_data)
                except Exception as e:
                    logger.warning(f"Failed to migrate appointment row: {e}")
            
            pg_conn.commit()
            logger.info(f"Migrated {len(rows)} appointments")
        
        # Migrate prescriptions
        logger.info("Migrating prescriptions...")
        sqlite_cursor.execute("SELECT * FROM prescriptions")
        rows = sqlite_cursor.fetchall()
        
        if rows:
            columns = [description[0] for description in sqlite_cursor.description]
            placeholders = ', '.join(['%s'] * len(columns))
            insert_query = f"INSERT INTO prescriptions ({', '.join(columns)}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
            
            for row in rows:
                try:
                    row_data = list(row)
                    pg_cursor.execute(insert_query, row_data)
                except Exception as e:
                    logger.warning(f"Failed to migrate prescription row: {e}")
            
            pg_conn.commit()
            logger.info(f"Migrated {len(rows)} prescriptions")
        
        # Update staff passwords to use the migrated ones
        logger.info("Updating staff passwords...")
        sqlite_cursor.execute("SELECT staff_id, password_hash FROM staff")
        staff_passwords = sqlite_cursor.fetchall()
        
        for staff in staff_passwords:
            try:
                pg_cursor.execute("UPDATE staff SET password_hash = %s WHERE staff_id = %s", 
                                (staff['password_hash'], staff['staff_id']))
            except Exception as e:
                logger.warning(f"Failed to update password for {staff['staff_id']}: {e}")
        
        pg_conn.commit()
        logger.info("Updated staff passwords")
        
        logger.info("Critical data migration completed!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        pg_conn.rollback()
    finally:
        sqlite_conn.close()
        pg_cursor.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate_critical_data()
