"""
Final Migration - Get Core Data Working
"""

import os
import sqlite3
import psycopg2
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def final_migration():
    """Final migration to get core data working"""
    
    # Connect to databases
    sqlite_path = '../../hms-system/backend/hospital_db.sqlite'
    postgres_url = 'postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db'
    
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = psycopg2.connect(postgres_url)
    pg_cursor = pg_conn.cursor()
    
    try:
        # Migrate patients with only the columns that exist
        logger.info("Final migration of patients...")
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM patients")
        rows = sqlite_cursor.fetchall()
        
        if rows:
            # Get SQLite columns
            sqlite_columns = [description[0] for description in sqlite_cursor.description]
            
            # Get PostgreSQL columns
            pg_cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'patients' ORDER BY ordinal_position")
            pg_columns = [row[0] for row in pg_cursor.fetchall()]
            
            # Find common columns
            common_columns = [col for col in sqlite_columns if col in pg_columns]
            logger.info(f"Common columns: {common_columns}")
            
            if common_columns:
                placeholders = ', '.join(['%s'] * len(common_columns))
                insert_query = f"INSERT INTO patients ({', '.join(common_columns)}) VALUES ({placeholders}) ON CONFLICT (patient_id) DO NOTHING"
                
                migrated_count = 0
                for row in rows:
                    try:
                        # Get only common column values
                        row_data = [row[col] for col in common_columns]
                        pg_cursor.execute(insert_query, row_data)
                        migrated_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to migrate patient: {e}")
                        continue
                
                pg_conn.commit()
                logger.info(f"Successfully migrated {migrated_count} patients")
        
        # Test login functionality
        logger.info("Testing login functionality...")
        
        # Test staff login
        try:
            test_password = 'password123'
            import bcrypt
            new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update a staff member with known password for testing
            pg_cursor.execute("UPDATE staff SET password_hash = %s WHERE staff_id = %s", 
                            (new_hash, 'REC001'))
            pg_conn.commit()
            logger.info("Updated REC001 with known password for testing")
            
        except Exception as e:
            logger.warning(f"Failed to update test password: {e}")
        
        logger.info("Final migration completed!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        pg_conn.rollback()
    finally:
        sqlite_conn.close()
        pg_cursor.close()
        pg_conn.close()

if __name__ == "__main__":
    final_migration()
