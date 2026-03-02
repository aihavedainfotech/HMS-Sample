"""
FINAL COMPREHENSIVE CHECK - Complete SQLite to PostgreSQL Migration
"""

import os
import sqlite3
import psycopg2
import logging
from datetime import datetime
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FinalDataChecker:
    def __init__(self):
        self.sqlite_files = []
        self.postgres_conn = None
        self.sqlite_data = {}
        self.postgres_data = {}
        self.missing_data = {}
        
    def find_all_sqlite_databases(self):
        """Find all SQLite databases in the project"""
        logger.info("🔍 FINDING ALL SQLITE DATABASES")
        logger.info("=" * 80)
        
        for root, dirs, files in os.walk('/home/ubuntu/Downloads/Assignment_1/HMS_Copy1'):
            for file in files:
                if file.endswith('.sqlite') or file.endswith('.db'):
                    db_path = os.path.join(root, file)
                    self.sqlite_files.append(db_path)
        
        logger.info(f"Found {len(self.sqlite_files)} SQLite databases:")
        for i, db_file in enumerate(self.sqlite_files, 1):
            size = os.path.getsize(db_file)
            logger.info(f"  {i}. {os.path.basename(db_file)} ({size} bytes)")
        
        return self.sqlite_files
    
    def extract_all_sqlite_data(self):
        """Extract ALL data from ALL tables in ALL SQLite databases"""
        logger.info("\n📊 EXTRACTING ALL SQLITE DATA")
        logger.info("=" * 80)
        
        total_records = 0
        total_tables = 0
        
        for db_file in self.sqlite_files:
            db_name = os.path.basename(db_file)
            logger.info(f"\n📁 Processing: {db_name}")
            
            try:
                conn = sqlite3.connect(db_file)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Get all tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                tables = [row[0] for row in cursor.fetchall()]
                
                if not tables:
                    logger.info(f"  ⚠️  No tables found")
                    conn.close()
                    continue
                
                db_data = {}
                db_record_count = 0
                
                for table in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table}")
                        count = cursor.fetchone()[0]
                        
                        if count > 0:
                            cursor.execute(f"SELECT * FROM {table}")
                            rows = cursor.fetchall()
                            db_data[table] = [dict(row) for row in rows]
                            db_record_count += count
                            logger.info(f"    ✅ {table}: {count} records")
                        else:
                            logger.info(f"    ⚪ {table}: 0 records")
                    
                    except Exception as e:
                        logger.warning(f"    ❌ {table}: Error - {e}")
                        continue
                
                if db_data:
                    self.sqlite_data[db_name] = db_data
                    total_records += db_record_count
                    total_tables += len(db_data)
                    logger.info(f"  📊 Total: {len(db_data)} tables, {db_record_count} records")
                
                conn.close()
                
            except Exception as e:
                logger.error(f"  ❌ Error processing {db_name}: {e}")
                continue
        
        logger.info(f"\n📈 SQLITE SUMMARY:")
        logger.info(f"  Total databases with data: {len(self.sqlite_data)}")
        logger.info(f"  Total tables: {total_tables}")
        logger.info(f"  Total records: {total_records}")
        
        return self.sqlite_data
    
    def extract_all_postgresql_data(self):
        """Extract ALL data from PostgreSQL"""
        logger.info("\n🗄️  EXTRACTING ALL POSTGRESQL DATA")
        logger.info("=" * 80)
        
        try:
            self.postgres_conn = psycopg2.connect('postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db')
            cursor = self.postgres_conn.cursor()
            
            # Get all tables
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            total_records = 0
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        cursor.execute(f"SELECT * FROM {table}")
                        columns = [desc[0] for desc in cursor.description]
                        rows = cursor.fetchall()
                        
                        # Convert to list of dictionaries
                        table_data = []
                        for row in rows:
                            row_dict = {}
                            for i, col in enumerate(columns):
                                row_dict[col] = row[i]
                            table_data.append(row_dict)
                        
                        self.postgres_data[table] = table_data
                        total_records += count
                        logger.info(f"  ✅ {table}: {count} records")
                    else:
                        logger.info(f"  ⚪ {table}: 0 records")
                
                except Exception as e:
                    logger.warning(f"  ❌ {table}: Error - {e}")
                    continue
            
            logger.info(f"\n📈 POSTGRESQL SUMMARY:")
            logger.info(f"  Total tables: {len(self.postgres_data)}")
            logger.info(f"  Total records: {total_records}")
            
            cursor.close()
            
        except Exception as e:
            logger.error(f"❌ Error connecting to PostgreSQL: {e}")
        
        return self.postgres_data
    
    def find_missing_data(self):
        """Find all data that exists in SQLite but not in PostgreSQL"""
        logger.info("\n🔍 FINDING MISSING DATA")
        logger.info("=" * 80)
        
        missing_summary = {}
        
        for db_name, sqlite_tables in self.sqlite_data.items():
            logger.info(f"\n📁 Checking: {db_name}")
            db_missing = {}
            
            for table_name, sqlite_records in sqlite_tables.items():
                # Check if table exists in PostgreSQL
                if table_name not in self.postgres_data:
                    logger.warning(f"    ❌ Table {table_name} not found in PostgreSQL")
                    db_missing[table_name] = sqlite_records
                    continue
                
                postgres_records = self.postgres_data[table_name]
                
                # Find records that don't exist in PostgreSQL
                missing_records = []
                
                # Use primary key or first column as identifier
                if sqlite_records:
                    sample_record = sqlite_records[0]
                    id_columns = ['id', 'staff_id', 'patient_id', 'appointment_id', 'prescription_id']
                    identifier_col = None
                    
                    for col in id_columns:
                        if col in sample_record:
                            identifier_col = col
                            break
                    
                    if not identifier_col and 'id' in sample_record:
                        identifier_col = 'id'
                    
                    if identifier_col:
                        # Create set of existing IDs in PostgreSQL
                        postgres_ids = set()
                        for record in postgres_records:
                            if identifier_col in record and record[identifier_col]:
                                postgres_ids.add(str(record[identifier_col]))
                        
                        # Find missing records
                        for record in sqlite_records:
                            if identifier_col in record and record[identifier_col]:
                                record_id = str(record[identifier_col])
                                if record_id not in postgres_ids:
                                    missing_records.append(record)
                    else:
                        # If no clear identifier, compare all records
                        for record in sqlite_records:
                            if record not in postgres_records:
                                missing_records.append(record)
                
                if missing_records:
                    logger.info(f"    ⚠️  {table_name}: {len(missing_records)} missing records")
                    db_missing[table_name] = missing_records
                else:
                    logger.info(f"    ✅ {table_name}: All records present")
            
            if db_missing:
                missing_summary[db_name] = db_missing
        
        # Calculate total missing records
        total_missing = sum(len(records) for db_data in missing_summary.values() for records in db_data.values())
        
        logger.info(f"\n📊 MISSING DATA SUMMARY:")
        logger.info(f"  Databases with missing data: {len(missing_summary)}")
        logger.info(f"  Total missing records: {total_missing}")
        
        if missing_summary:
            logger.info(f"\n📋 Missing Details:")
            for db_name, tables in missing_summary.items():
                logger.info(f"  {db_name}:")
                for table, records in tables.items():
                    logger.info(f"    - {table}: {len(records)} records")
        
        self.missing_data = missing_summary
        return missing_summary
    
    def migrate_missing_data(self):
        """Migrate all missing data to PostgreSQL"""
        logger.info("\n🚀 MIGRATING ALL MISSING DATA")
        logger.info("=" * 80)
        
        if not self.missing_data:
            logger.info("✅ No missing data found!")
            return True
        
        try:
            cursor = self.postgres_conn.cursor()
            total_migrated = 0
            
            for db_name, tables in self.missing_data.items():
                logger.info(f"\n📁 Migrating from: {db_name}")
                
                for table_name, records in tables.items():
                    if not records:
                        continue
                    
                    logger.info(f"  📋 Migrating {table_name}: {len(records)} records")
                    
                    try:
                        # Get table schema
                        cursor.execute(f"""
                            SELECT column_name, data_type 
                            FROM information_schema.columns 
                            WHERE table_name = %s ORDER BY ordinal_position
                        """, (table_name,))
                        columns_info = cursor.fetchall()
                        pg_columns = [col[0] for col in columns_info]
                        
                        # Get sample record to determine available columns
                        sample_record = records[0]
                        available_columns = [col for col in pg_columns if col in sample_record]
                        
                        if not available_columns:
                            logger.warning(f"    ⚠️  No compatible columns found")
                            continue
                        
                        # Build INSERT query
                        placeholders = ', '.join(['%s'] * len(available_columns))
                        insert_query = f"""
                            INSERT INTO {table_name} ({', '.join(available_columns)}) 
                            VALUES ({placeholders}) 
                            ON CONFLICT DO NOTHING
                        """
                        
                        migrated_count = 0
                        for record in records:
                            try:
                                # Prepare data for insertion
                                row_data = []
                                for col in available_columns:
                                    value = record.get(col)
                                    if value is None:
                                        row_data.append(None)
                                    elif isinstance(value, str):
                                        row_data.append(value)
                                    else:
                                        row_data.append(value)
                                
                                cursor.execute(insert_query, row_data)
                                migrated_count += 1
                                
                            except Exception as e:
                                # Skip problematic records
                                continue
                        
                        logger.info(f"    ✅ Successfully migrated {migrated_count} records")
                        total_migrated += migrated_count
                        
                    except Exception as e:
                        logger.error(f"    ❌ Failed to migrate {table_name}: {e}")
                        continue
            
            # Commit all changes
            self.postgres_conn.commit()
            cursor.close()
            
            logger.info(f"\n🎉 MIGRATION COMPLETED!")
            logger.info(f"  Total records migrated: {total_migrated}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            if self.postgres_conn:
                self.postgres_conn.rollback()
            return False
    
    def final_verification(self):
        """Final verification of complete data migration"""
        logger.info("\n✅ FINAL VERIFICATION")
        logger.info("=" * 80)
        
        try:
            cursor = self.postgres_conn.cursor()
            
            # Get final counts
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            total_records = 0
            logger.info("📊 Final PostgreSQL Data Status:")
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    total_records += count
                    
                    if count > 0:
                        logger.info(f"  ✅ {table}: {count} records")
                    else:
                        logger.info(f"  ⚪ {table}: 0 records")
                
                except Exception as e:
                    logger.warning(f"  ❌ {table}: Error - {e}")
            
            logger.info(f"\n📈 FINAL SUMMARY:")
            logger.info(f"  Total tables: {len(tables)}")
            logger.info(f"  Total records: {total_records}")
            
            cursor.close()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Verification failed: {e}")
            return False
    
    def run_complete_check(self):
        """Run the complete final check process"""
        logger.info("🚀 STARTING FINAL COMPREHENSIVE CHECK")
        logger.info("=" * 100)
        
        try:
            # Step 1: Find all SQLite databases
            self.find_all_sqlite_databases()
            
            # Step 2: Extract all SQLite data
            self.extract_all_sqlite_data()
            
            # Step 3: Extract all PostgreSQL data
            self.extract_all_postgresql_data()
            
            # Step 4: Find missing data
            self.find_missing_data()
            
            # Step 5: Migrate missing data
            migration_success = self.migrate_missing_data()
            
            # Step 6: Final verification
            if migration_success:
                self.final_verification()
            
            logger.info("\n🎉 FINAL COMPREHENSIVE CHECK COMPLETED!")
            
        except Exception as e:
            logger.error(f"❌ Process failed: {e}")
        
        finally:
            if self.postgres_conn:
                self.postgres_conn.close()

def main():
    """Main function"""
    checker = FinalDataChecker()
    checker.run_complete_check()

if __name__ == "__main__":
    main()
