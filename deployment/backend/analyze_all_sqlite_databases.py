"""
Analyze All SQLite Databases in the Project
"""

import os
import sqlite3
from pathlib import Path

def analyze_sqlite_database(db_path):
    """Analyze a single SQLite database"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        # Get database size
        db_size = os.path.getsize(db_path)
        
        analysis = {
            'path': db_path,
            'size_bytes': db_size,
            'size_mb': round(db_size / (1024 * 1024), 2),
            'tables': [],
            'total_records': 0
        }
        
        for table in tables:
            table_name = table[0]
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                
                # Get sample data for important tables
                sample_data = None
                if table_name in ['patients', 'staff', 'appointments', 'prescriptions', 'doctors'] and count > 0:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 2")
                    rows = cursor.fetchall()
                    sample_data = [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
                
                analysis['tables'].append({
                    'name': table_name,
                    'records': count,
                    'sample_data': sample_data
                })
                analysis['total_records'] += count
                
            except Exception as e:
                analysis['tables'].append({
                    'name': table_name,
                    'records': 0,
                    'error': str(e)
                })
        
        conn.close()
        return analysis
        
    except Exception as e:
        return {
            'path': db_path,
            'error': str(e),
            'size_bytes': 0,
            'size_mb': 0,
            'tables': [],
            'total_records': 0
        }

def analyze_all_sqlite_databases():
    """Analyze all SQLite databases in the project"""
    
    # Find all SQLite databases
    sqlite_files = []
    
    # Search for .sqlite files
    for root, dirs, files in os.walk('/home/ubuntu/Downloads/Assignment_1/HMS_Copy1'):
        for file in files:
            if file.endswith('.sqlite') or file.endswith('.db'):
                sqlite_files.append(os.path.join(root, file))
    
    print(f"🔍 Found {len(sqlite_files)} SQLite databases:")
    print("=" * 80)
    
    all_analyses = []
    total_records = 0
    total_size = 0
    
    for db_file in sqlite_files:
        print(f"\n📁 Analyzing: {db_file}")
        analysis = analyze_sqlite_database(db_file)
        all_analyses.append(analysis)
        
        if 'error' in analysis:
            print(f"  ❌ Error: {analysis['error']}")
        else:
            print(f"  📊 Size: {analysis['size_mb']} MB")
            print(f"  📋 Tables: {len(analysis['tables'])}")
            print(f"  🔢 Total Records: {analysis['total_records']}")
            
            # Show important tables
            important_tables = [t for t in analysis['tables'] if t['name'] in ['patients', 'staff', 'appointments', 'prescriptions', 'doctors']]
            if important_tables:
                print(f"  🌟 Important Tables:")
                for table in important_tables:
                    print(f"    - {table['name']}: {table['records']} records")
                    if table.get('sample_data'):
                        print(f"      Sample: {table['sample_data'][0] if table['sample_data'] else 'None'}")
            
            total_records += analysis['total_records']
            total_size += analysis['size_bytes']
    
    print("\n" + "=" * 80)
    print(f"📊 SUMMARY:")
    print(f"  Total Databases: {len(sqlite_files)}")
    print(f"  Total Size: {round(total_size / (1024 * 1024), 2)} MB")
    print(f"  Total Records: {total_records}")
    
    # Find databases with most data
    databases_with_data = [a for a in all_analyses if a.get('total_records', 0) > 0]
    if databases_with_data:
        print(f"\n🎯 Databases with Data (sorted by records):")
        databases_with_data.sort(key=lambda x: x['total_records'], reverse=True)
        for i, db in enumerate(databases_with_data[:5], 1):
            print(f"  {i}. {os.path.basename(db['path'])}: {db['total_records']} records ({db['size_mb']} MB)")
    
    return all_analyses

if __name__ == "__main__":
    analyze_all_sqlite_databases()
