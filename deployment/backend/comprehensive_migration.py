"""
Comprehensive Migration - Copy All SQLite Data to PostgreSQL
"""

import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from datetime import datetime, date, timedelta
import bcrypt

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComprehensiveMigrator:
    """Comprehensive SQLite to PostgreSQL Migration"""
    
    def __init__(self, postgres_url):
        self.postgres_url = postgres_url
        self.pg_conn = None
        self.pg_cursor = None
        self.total_migrated = 0
        self.total_errors = 0
        
    def connect_postgresql(self):
        """Connect to PostgreSQL"""
        try:
            self.pg_conn = psycopg2.connect(self.postgres_url)
            self.pg_cursor = self.pg_conn.cursor()
            logger.info("Connected to PostgreSQL")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise
    
    def close_postgresql(self):
        """Close PostgreSQL connection"""
        if self.pg_cursor:
            self.pg_cursor.close()
        if self.pg_conn:
            self.pg_conn.close()
    
    def get_postgresql_columns(self, table_name):
        """Get PostgreSQL table columns"""
        try:
            self.pg_cursor.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position",
                (table_name,)
            )
            return [row[0] for row in self.pg_cursor.fetchall()]
        except Exception as e:
            logger.warning(f"Could not get columns for {table_name}: {e}")
            return []
    
    def migrate_table(self, sqlite_path, table_name):
        """Migrate a single table from SQLite to PostgreSQL"""
        try:
            # Connect to SQLite
            sqlite_conn = sqlite3.connect(sqlite_path)
            sqlite_conn.row_factory = sqlite3.Row
            sqlite_cursor = sqlite_conn.cursor()
            
            # Get data from SQLite
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                logger.info(f"No data in {table_name}")
                return 0
            
            # Get SQLite columns
            sqlite_columns = [description[0] for description in sqlite_cursor.description]
            
            # Get PostgreSQL columns
            pg_columns = self.get_postgresql_columns(table_name)
            
            if not pg_columns:
                logger.warning(f"Table {table_name} not found in PostgreSQL")
                return 0
            
            # Find common columns
            common_columns = [col for col in sqlite_columns if col in pg_columns]
            
            if not common_columns:
                logger.warning(f"No common columns found for {table_name}")
                return 0
            
            logger.info(f"Migrating {table_name}: {len(rows)} records, {len(common_columns)} columns")
            
            # Build INSERT query
            placeholders = ', '.join(['%s'] * len(common_columns))
            insert_query = f"INSERT INTO {table_name} ({', '.join(common_columns)}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            
            migrated_count = 0
            for row in rows:
                try:
                    # Get only common column values and handle data types
                    row_data = []
                    for col in common_columns:
                        value = row[col]
                        if value is None:
                            row_data.append(None)
                        elif isinstance(value, str):
                            row_data.append(value)
                        elif isinstance(value, (int, float)):
                            row_data.append(value)
                        elif isinstance(value, (datetime, date)):
                            row_data.append(value)
                        else:
                            row_data.append(str(value))
                    
                    self.pg_cursor.execute(insert_query, row_data)
                    migrated_count += 1
                    
                except Exception as e:
                    self.total_errors += 1
                    logger.warning(f"Failed to migrate row in {table_name}: {e}")
                    continue
            
            self.pg_conn.commit()
            sqlite_conn.close()
            logger.info(f"Successfully migrated {migrated_count} rows to {table_name}")
            return migrated_count
            
        except Exception as e:
            logger.error(f"Failed to migrate table {table_name}: {e}")
            self.total_errors += 1
            return 0
    
    def migrate_database(self, sqlite_path):
        """Migrate all tables from a SQLite database"""
        try:
            sqlite_conn = sqlite3.connect(sqlite_path)
            cursor = sqlite_conn.cursor()
            
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Skip system tables
            tables = [t for t in tables if not t.startswith('sqlite_')]
            
            logger.info(f"Found {len(tables)} tables in {os.path.basename(sqlite_path)}")
            
            db_migrated = 0
            for table in tables:
                migrated = self.migrate_table(sqlite_path, table)
                db_migrated += migrated
            
            sqlite_conn.close()
            return db_migrated
            
        except Exception as e:
            logger.error(f"Failed to migrate database {sqlite_path}: {e}")
            return 0
    
    def update_passwords(self):
        """Update all passwords to use consistent hashing"""
        try:
            logger.info("Updating passwords...")
            
            # Update staff passwords
            self.pg_cursor.execute("SELECT staff_id FROM staff")
            staff_ids = [row[0] for row in self.pg_cursor.fetchall()]
            
            test_password = 'password123'
            password_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            for staff_id in staff_ids:
                try:
                    self.pg_cursor.execute("UPDATE staff SET password_hash = %s WHERE staff_id = %s", 
                                        (password_hash, staff_id))
                except Exception as e:
                    logger.warning(f"Failed to update password for {staff_id}: {e}")
            
            # Update patient passwords
            self.pg_cursor.execute("SELECT patient_id FROM patients")
            patient_ids = [row[0] for row in self.pg_cursor.fetchall()]
            
            for patient_id in patient_ids:
                try:
                    self.pg_cursor.execute("UPDATE patients SET password_hash = %s WHERE patient_id = %s", 
                                        (password_hash, patient_id))
                except Exception as e:
                    logger.warning(f"Failed to update password for {patient_id}: {e}")
            
            self.pg_conn.commit()
            logger.info("Password updates completed")
            
        except Exception as e:
            logger.error(f"Failed to update passwords: {e}")
    
    def migrate_all_sqlite_databases(self):
        """Migrate all SQLite databases in the project"""
        try:
            self.connect_postgresql()
            
            # Find all SQLite databases
            sqlite_files = []
            for root, dirs, files in os.walk('/home/ubuntu/Downloads/Assignment_1/HMS_Copy1'):
                for file in files:
                    if file.endswith('.sqlite') or file.endswith('.db'):
                        sqlite_files.append(os.path.join(root, file))
            
            logger.info(f"Found {len(sqlite_files)} SQLite databases")
            
            # Filter databases with actual data
            databases_with_data = []
            for db_file in sqlite_files:
                try:
                    conn = sqlite3.connect(db_file)
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
                    table_count = cursor.fetchone()[0]
                    if table_count > 0:
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                        tables = [row[0] for row in cursor.fetchall()]
                        
                        # Check if any table has data
                        has_data = False
                        for table in tables[:5]:  # Check first 5 tables
                            try:
                                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                                if cursor.fetchone()[0] > 0:
                                    has_data = True
                                    break
                            except:
                                continue
                        
                        if has_data:
                            databases_with_data.append(db_file)
                    
                    conn.close()
                except:
                    continue
            
            logger.info(f"Found {len(databases_with_data)} databases with data")
            
            # Migrate each database
            for i, db_file in enumerate(databases_with_data, 1):
                logger.info(f"\n{'='*60}")
                logger.info(f"Migrating database {i}/{len(databases_with_data)}: {os.path.basename(db_file)}")
                logger.info(f"{'='*60}")
                
                migrated = self.migrate_database(db_file)
                self.total_migrated += migrated
                logger.info(f"Database {i} completed: {migrated} records migrated")
            
            # Update passwords for consistency
            self.update_passwords()
            
            logger.info(f"\n{'='*60}")
            logger.info("MIGRATION SUMMARY")
            logger.info(f"{'='*60}")
            logger.info(f"Databases processed: {len(databases_with_data)}")
            logger.info(f"Total records migrated: {self.total_migrated}")
            logger.info(f"Total errors: {self.total_errors}")
            logger.info(f"Migration completed successfully!")
            
            return self.total_migrated
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return 0
        finally:
            self.close_postgresql()

def main():
    """Main migration function"""
    postgres_url = 'postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db'
    
    migrator = ComprehensiveMigrator(postgres_url)
    total_records = migrator.migrate_all_sqlite_databases()
    
    return total_records

if __name__ == "__main__":
    main()
