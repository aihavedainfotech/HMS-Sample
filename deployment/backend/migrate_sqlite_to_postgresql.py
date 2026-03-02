"""
Hospital Management System - SQLite to PostgreSQL Migration Script
================================================================
This script migrates data from SQLite to PostgreSQL database
"""

import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import sys
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SQLiteToPostgreSQLMigrator:
    """Migrates data from SQLite to PostgreSQL"""
    
    def __init__(self, sqlite_path, postgres_url):
        self.sqlite_path = sqlite_path
        self.postgres_url = postgres_url
        self.sqlite_conn = None
        self.postgres_conn = None
    
    def connect(self):
        """Establish database connections"""
        try:
            # Connect to SQLite
            self.sqlite_conn = sqlite3.connect(self.sqlite_path)
            self.sqlite_conn.row_factory = sqlite3.Row
            logger.info(f"Connected to SQLite database: {self.sqlite_path}")
            
            # Connect to PostgreSQL
            self.postgres_conn = psycopg2.connect(self.postgres_url)
            self.postgres_conn.autocommit = False
            logger.info("Connected to PostgreSQL database")
            
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            raise
    
    def close(self):
        """Close database connections"""
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.postgres_conn:
            self.postgres_conn.close()
    
    def get_table_data(self, table_name):
        """Get all data from a SQLite table"""
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            logger.info(f"Retrieved {len(rows)} rows from {table_name}")
            return rows
        except Exception as e:
            logger.error(f"Error reading from {table_name}: {e}")
            return []
    
    def migrate_table(self, table_name, column_mapping=None):
        """Migrate a single table from SQLite to PostgreSQL"""
        try:
            # Get data from SQLite
            sqlite_data = self.get_table_data(table_name)
            
            if not sqlite_data:
                logger.info(f"No data to migrate for table: {table_name}")
                return 0
            
            # Get column names
            columns = [description[0] for description in self.sqlite_conn.execute(f"SELECT * FROM {table_name} LIMIT 1").description]
            
            # Apply column mapping if provided
            if column_mapping:
                mapped_columns = [column_mapping.get(col, col) for col in columns]
            else:
                mapped_columns = columns
            
            # Prepare INSERT query
            placeholders = ', '.join(['%s'] * len(mapped_columns))
            columns_str = ', '.join(mapped_columns)
            insert_query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
            
            # Insert data into PostgreSQL
            pg_cursor = self.postgres_conn.cursor()
            
            migrated_count = 0
            for row in sqlite_data:
                try:
                    # Convert row to dictionary and handle data type conversions
                    row_data = []
                    for col in columns:
                        value = row[col]
                        
                        # Handle boolean conversion
                        if isinstance(value, int) and col in ['is_active', 'email_verified', 'phone_verified', 
                                                             'permanent_address_same_as_current', 'registration_fee_paid',
                                                             'has_oxygen', 'has_monitor', 'has_ventilator', 
                                                             'is_available_for_teleconsultation', 'mfa_enabled',
                                                             'fasting_required', 'is_critical']:
                            value = bool(value)
                        
                        # Handle None values
                        if value is None:
                            row_data.append(None)
                        else:
                            row_data.append(value)
                    
                    pg_cursor.execute(insert_query, row_data)
                    migrated_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to migrate row in {table_name}: {e}")
                    continue
            
            self.postgres_conn.commit()
            logger.info(f"Successfully migrated {migrated_count} rows to {table_name}")
            return migrated_count
            
        except Exception as e:
            logger.error(f"Error migrating table {table_name}: {e}")
            self.postgres_conn.rollback()
            return 0
    
    def reset_sequences(self):
        """Reset PostgreSQL sequences to match max IDs"""
        try:
            pg_cursor = self.postgres_conn.cursor()
            
            tables_with_sequences = [
                'departments', 'patients', 'staff', 'doctors', 'doctor_unavailability',
                'beds', 'appointments', 'admissions', 'prescriptions', 'prescription_medicines',
                'medicine_inventory', 'lab_orders', 'lab_results', 'vital_signs',
                'queue_management', 'pending_payments', 'collections'
            ]
            
            for table in tables_with_sequences:
                try:
                    # Get max ID from table
                    pg_cursor.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
                    max_id = pg_cursor.fetchone()[0]
                    
                    # Reset sequence
                    sequence_name = f"{table}_id_seq"
                    pg_cursor.execute(f"SELECT setval('{sequence_name}', {max_id + 1}, true)")
                    logger.info(f"Reset sequence for {table} to {max_id + 1}")
                    
                except Exception as e:
                    logger.warning(f"Could not reset sequence for {table}: {e}")
            
            self.postgres_conn.commit()
            
        except Exception as e:
            logger.error(f"Error resetting sequences: {e}")
    
    def migrate_all(self):
        """Migrate all tables"""
        tables = [
            'departments',
            'patients', 
            'staff',
            'doctors',
            'doctor_unavailability',
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
            'collections'
        ]
        
        total_migrated = 0
        
        for table in tables:
            logger.info(f"Migrating table: {table}")
            count = self.migrate_table(table)
            total_migrated += count
        
        # Reset sequences
        self.reset_sequences()
        
        logger.info(f"Migration completed. Total records migrated: {total_migrated}")
        return total_migrated

def main():
    """Main migration function"""
    # Configuration
    sqlite_path = os.path.join(os.path.dirname(__file__), '../../hms-system/backend/hospital_db.sqlite')
    postgres_url = os.environ.get('DATABASE_URL', 'postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db')
    
    if not os.path.exists(sqlite_path):
        logger.error(f"SQLite database not found: {sqlite_path}")
        sys.exit(1)
    
    # Create migrator
    migrator = SQLiteToPostgreSQLMigrator(sqlite_path, postgres_url)
    
    try:
        # Connect to databases
        migrator.connect()
        
        # Perform migration
        logger.info("Starting SQLite to PostgreSQL migration...")
        total_records = migrator.migrate_all()
        
        logger.info(f"Migration completed successfully! Total records migrated: {total_records}")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        migrator.close()

if __name__ == "__main__":
    main()
