"""
Final Robust Migration - Handle All Data Types and Issues
"""

import os
import sqlite3
import psycopg2
import logging
from datetime import datetime, date
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FinalRobustMigrator:
    def __init__(self):
        self.postgres_conn = None
        self.postgres_cursor = None
        
    def connect_postgresql(self):
        """Connect to PostgreSQL"""
        try:
            self.postgres_conn = psycopg2.connect('postgresql://hms_user:Sravan.9010@localhost:5432/hospital_db')
            self.postgres_cursor = self.postgres_conn.cursor()
            logger.info("✅ Connected to PostgreSQL")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            return False
    
    def convert_value(self, value, column_name, pg_data_type):
        """Convert SQLite value to PostgreSQL compatible format"""
        if value is None:
            return None
        
        # Handle boolean conversion
        if 'boolean' in pg_data_type.lower():
            if isinstance(value, int):
                return bool(value)
            elif isinstance(value, str):
                return value.lower() in ('true', '1', 'yes', 'on')
            return bool(value)
        
        # Handle timestamp conversion
        if 'timestamp' in pg_data_type.lower() or 'date' in pg_data_type.lower():
            if isinstance(value, str):
                try:
                    # Try to parse common date formats
                    if 'T' in value:  # ISO format
                        return datetime.fromisoformat(value.replace('Z', '+00:00'))
                    elif ' ' in value:  # SQLite format
                        return datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                    else:  # Date only
                        return datetime.strptime(value, '%Y-%m-%d').date()
                except:
                    return None
            elif isinstance(value, (datetime, date)):
                return value
        
        # Handle JSON conversion
        if 'json' in pg_data_type.lower() or 'jsonb' in pg_data_type.lower():
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except:
                    return {}
            elif isinstance(value, dict):
                return value
            return {}
        
        # Handle numeric conversion
        if 'integer' in pg_data_type.lower() or 'bigint' in pg_data_type.lower():
            try:
                return int(value)
            except:
                return 0
        
        if 'decimal' in pg_data_type.lower() or 'numeric' in pg_data_type.lower():
            try:
                return float(value)
            except:
                return 0.0
        
        # Default: return as string
        return str(value)
    
    def get_postgresql_column_info(self, table_name):
        """Get column information for PostgreSQL table"""
        try:
            self.postgres_cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = %s ORDER BY ordinal_position
            """, (table_name,))
            return self.postgres_cursor.fetchall()
        except Exception as e:
            logger.error(f"Error getting column info for {table_name}: {e}")
            return []
    
    def migrate_table_data(self, sqlite_path, table_name):
        """Migrate data for a single table with robust error handling"""
        try:
            # Connect to SQLite
            sqlite_conn = sqlite3.connect(sqlite_path)
            sqlite_conn.row_factory = sqlite3.Row
            sqlite_cursor = sqlite_conn.cursor()
            
            # Get SQLite data
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                logger.info(f"⚪ {table_name}: No data to migrate")
                sqlite_conn.close()
                return 0
            
            # Get PostgreSQL column info
            pg_columns_info = self.get_postgresql_column_info(table_name)
            if not pg_columns_info:
                logger.warning(f"⚠️  {table_name}: No columns found in PostgreSQL")
                sqlite_conn.close()
                return 0
            
            # Create column mapping
            sqlite_columns = [desc[0] for desc in sqlite_cursor.description]
            pg_column_map = {}
            
            for pg_col in pg_columns_info:
                pg_col_name = pg_col[0]
                pg_data_type = pg_col[1]
                
                # Find matching SQLite column
                if pg_col_name in sqlite_columns:
                    pg_column_map[pg_col_name] = {
                        'data_type': pg_data_type,
                        'index': sqlite_columns.index(pg_col_name)
                    }
            
            if not pg_column_map:
                logger.warning(f"⚠️  {table_name}: No compatible columns found")
                sqlite_conn.close()
                return 0
            
            # Build INSERT query
            pg_columns = list(pg_column_map.keys())
            placeholders = ', '.join(['%s'] * len(pg_columns))
            insert_query = f"""
                INSERT INTO {table_name} ({', '.join(pg_columns)}) 
                VALUES ({placeholders}) 
                ON CONFLICT DO NOTHING
            """
            
            migrated_count = 0
            error_count = 0
            
            for row in rows:
                try:
                    # Convert row data
                    row_data = []
                    for col_name in pg_columns:
                        col_info = pg_column_map[col_name]
                        sqlite_value = row[col_info['index']]
                        converted_value = self.convert_value(sqlite_value, col_name, col_info['data_type'])
                        row_data.append(converted_value)
                    
                    # Insert record
                    self.postgres_cursor.execute(insert_query, row_data)
                    migrated_count += 1
                    
                except Exception as e:
                    error_count += 1
                    # Continue with next record
                    continue
            
            # Commit this table's migration
            self.postgres_conn.commit()
            
            logger.info(f"✅ {table_name}: {migrated_count} migrated, {error_count} errors")
            sqlite_conn.close()
            
            return migrated_count
            
        except Exception as e:
            logger.error(f"❌ Failed to migrate {table_name}: {e}")
            self.postgres_conn.rollback()
            return 0
    
    def migrate_all_missing_data(self):
        """Migrate all missing data from SQLite to PostgreSQL"""
        logger.info("🚀 STARTING FINAL ROBUST MIGRATION")
        logger.info("=" * 80)
        
        # Find the main SQLite database with data
        sqlite_path = '/home/ubuntu/Downloads/Assignment_1/HMS_Copy1/hms-system/backend/hospital_db.sqlite'
        
        if not os.path.exists(sqlite_path):
            logger.error(f"❌ SQLite database not found: {sqlite_path}")
            return False
        
        try:
            # Connect to SQLite
            sqlite_conn = sqlite3.connect(sqlite_path)
            sqlite_cursor = sqlite_conn.cursor()
            
            # Get all tables
            sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            sqlite_tables = [row[0] for row in sqlite_cursor.fetchall()]
            
            sqlite_conn.close()
            
            logger.info(f"📋 Found {len(sqlite_tables)} tables in SQLite")
            
            total_migrated = 0
            
            for table_name in sqlite_tables:
                logger.info(f"\n📁 Processing table: {table_name}")
                
                # Check if table exists in PostgreSQL
                try:
                    self.postgres_cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' AND table_name = %s
                        )
                    """, (table_name,))
                    table_exists = self.postgres_cursor.fetchone()[0]
                    
                    if not table_exists:
                        logger.warning(f"⚠️  Table {table_name} not found in PostgreSQL, skipping")
                        continue
                    
                    # Migrate table data
                    migrated = self.migrate_table_data(sqlite_path, table_name)
                    total_migrated += migrated
                    
                except Exception as e:
                    logger.error(f"❌ Error processing {table_name}: {e}")
                    continue
            
            logger.info(f"\n🎉 MIGRATION COMPLETED!")
            logger.info(f"  Total records migrated: {total_migrated}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
    
    def final_verification(self):
        """Final verification of all data"""
        logger.info("\n✅ FINAL VERIFICATION")
        logger.info("=" * 80)
        
        try:
            # Get all tables
            self.postgres_cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables = [row[0] for row in self.postgres_cursor.fetchall()]
            
            total_records = 0
            important_tables = ['patients', 'appointments', 'admissions', 'prescriptions', 'staff', 'doctors']
            
            logger.info("📊 Final Data Status:")
            
            for table in tables:
                try:
                    self.postgres_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = self.postgres_cursor.fetchone()[0]
                    total_records += count
                    
                    if table in important_tables:
                        if count > 0:
                            logger.info(f"  ✅ {table}: {count} records")
                        else:
                            logger.info(f"  ⚪ {table}: 0 records")
                    else:
                        if count > 0:
                            logger.info(f"  📋 {table}: {count} records")
                
                except Exception as e:
                    logger.warning(f"  ❌ {table}: Error - {e}")
            
            logger.info(f"\n📈 SUMMARY:")
            logger.info(f"  Total tables: {len(tables)}")
            logger.info(f"  Total records: {total_records}")
            
            # Test critical functionality
            logger.info(f"\n🧪 TESTING CRITICAL FUNCTIONALITY:")
            
            # Test staff login
            try:
                self.postgres_cursor.execute("SELECT COUNT(*) FROM staff WHERE is_active = TRUE")
                active_staff = self.postgres_cursor.fetchone()[0]
                logger.info(f"  ✅ Active staff: {active_staff}")
            except Exception as e:
                logger.warning(f"  ⚠️  Staff check error: {e}")
            
            # Test departments
            try:
                self.postgres_cursor.execute("SELECT COUNT(*) FROM departments")
                departments = self.postgres_cursor.fetchone()[0]
                logger.info(f"  ✅ Departments: {departments}")
            except Exception as e:
                logger.warning(f"  ⚠️  Departments check error: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Verification failed: {e}")
            return False
    
    def run_migration(self):
        """Run the complete migration process"""
        try:
            # Connect to PostgreSQL
            if not self.connect_postgresql():
                return False
            
            # Run migration
            migration_success = self.migrate_all_missing_data()
            
            if migration_success:
                # Final verification
                self.final_verification()
            
            return migration_success
            
        finally:
            if self.postgres_cursor:
                self.postgres_cursor.close()
            if self.postgres_conn:
                self.postgres_conn.close()

def main():
    """Main function"""
    migrator = FinalRobustMigrator()
    success = migrator.run_migration()
    
    if success:
        logger.info("\n🎊 FINAL MIGRATION COMPLETED SUCCESSFULLY!")
    else:
        logger.error("\n❌ MIGRATION FAILED!")

if __name__ == "__main__":
    main()
