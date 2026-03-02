"""
Fixed Migration Script - Handle Dependencies Correctly
"""

import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_data_fixed():
    """Migrate data with proper dependency handling"""
    
    # Connect to databases
    sqlite_path = '../../hms-system/backend/hospital_db.sqlite'
    postgres_url = 'postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db'
    
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = psycopg2.connect(postgres_url)
    pg_cursor = pg_conn.cursor()
    
    try:
        # Migration order based on dependencies
        migration_order = [
            'departments',
            'staff', 
            'doctors',
            'patients',
            'beds',
            'appointments',
            'admissions',
            'prescriptions',
            'prescription_medicines',
            'medicine_inventory',
            'lab_orders',
            'lab_results',
            'vital_signs',
            'queue_management',
            'pending_payments',
            'collections',
            'pharmacy_sales',
            'pharmacy_sale_medicines',
            'lab_reports',
            'insurance_claims',
            'advance_payments',
            'registration_otps',
            'doctor_unavailability'
        ]
        
        total_migrated = 0
        
        for table in migration_order:
            logger.info(f"Migrating table: {table}")
            
            # Get data from SQLite
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT * FROM {table}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                logger.info(f"No data in {table}")
                continue
            
            # Get column names
            columns = [description[0] for description in sqlite_cursor.description]
            
            # Build INSERT query
            placeholders = ', '.join(['%s'] * len(columns))
            insert_query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
            
            migrated_count = 0
            for row in rows:
                try:
                    # Convert row to list and handle data types
                    row_data = []
                    for value in row:
                        if value is None:
                            row_data.append(None)
                        elif isinstance(value, str):
                            row_data.append(value)
                        else:
                            row_data.append(value)
                    
                    pg_cursor.execute(insert_query, row_data)
                    migrated_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to migrate row in {table}: {e}")
                    # Continue with next row
                    continue
            
            pg_conn.commit()
            logger.info(f"Successfully migrated {migrated_count} rows to {table}")
            total_migrated += migrated_count
        
        logger.info(f"Migration completed. Total records migrated: {total_migrated}")
        return total_migrated
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        pg_conn.rollback()
        return 0
    finally:
        sqlite_conn.close()
        pg_cursor.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate_data_fixed()
