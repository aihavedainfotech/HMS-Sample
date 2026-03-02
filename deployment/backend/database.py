"""
Hospital Management System - PostgreSQL Database Connection
=========================================================
Handles PostgreSQL database connections using psycopg2
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from flask import current_app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    """PostgreSQL Database Manager"""
    
    def __init__(self):
        self.pool = None
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize connection pool"""
        try:
            database_url = os.environ.get('DATABASE_URL')
            if database_url:
                # Use DATABASE_URL if available (Supabase provides this)
                self.pool = SimpleConnectionPool(
                    minconn=1,
                    maxconn=10,
                    dsn=database_url
                )
            else:
                # Use individual connection parameters
                self.pool = SimpleConnectionPool(
                    minconn=1,
                    maxconn=10,
                    host=os.environ.get('DB_HOST', 'localhost'),
                    port=os.environ.get('DB_PORT', '5432'),
                    database=os.environ.get('DB_NAME', 'hospital_db'),
                    user=os.environ.get('DB_USER', 'postgres'),
                    password=os.environ.get('DB_PASSWORD', '')
                )
            logger.info("PostgreSQL connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database connection pool: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get a database connection from the pool"""
        if not self.pool:
            self._initialize_pool()
        
        conn = None
        try:
            conn = self.pool.getconn()
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                self.pool.putconn(conn)
    
    @contextmanager
    def get_cursor(self, dict_cursor=False):
        """Get a database cursor with automatic connection management"""
        with self.get_connection() as conn:
            cursor_type = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_type)
            try:
                yield cursor, conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Cursor error: {e}")
                raise
            finally:
                cursor.close()
    
    def execute_query(self, query, params=None, fetch_one=False, fetch_all=True, dict_cursor=False):
        """Execute a SELECT query"""
        with self.get_cursor(dict_cursor=dict_cursor) as (cursor, conn):
            cursor.execute(query, params)
            
            if fetch_one:
                return cursor.fetchone()
            elif fetch_all:
                return cursor.fetchall()
            else:
                return None
    
    def execute_update(self, query, params=None, return_id=False):
        """Execute an INSERT/UPDATE/DELETE query"""
        with self.get_cursor() as (cursor, conn):
            cursor.execute(query, params)
            
            if return_id:
                if cursor.description and cursor.description[0].name == 'id':
                    return cursor.fetchone()[0]
                else:
                    # For tables without explicit id return, use RETURNING clause
                    cursor.execute("SELECT lastval()")
                    return cursor.fetchone()[0]
            
            return cursor.rowcount
    
    def execute_many(self, query, params_list):
        """Execute multiple INSERT/UPDATE/DELETE operations"""
        with self.get_cursor() as (cursor, conn):
            cursor.executemany(query, params_list)
            return cursor.rowcount
    
    def test_connection(self):
        """Test database connection"""
        try:
            with self.get_cursor() as (cursor, conn):
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                return result[0] == 1
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        if self.pool:
            self.pool.closeall()
            self.pool = None

# Global database instance
db = Database()

# Helper functions for common operations
def get_db():
    """Get database instance"""
    return db

def init_database():
    """Initialize database with schema"""
    try:
        schema_file = os.path.join(os.path.dirname(__file__), 'postgresql_schema.sql')
        seed_file = os.path.join(os.path.dirname(__file__), 'postgresql_seed_data.sql')
        
        # Execute schema
        if os.path.exists(schema_file):
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(schema_sql)
                conn.commit()
                logger.info("Database schema initialized successfully")
        
        # Execute seed data
        if os.path.exists(seed_file):
            with open(seed_file, 'r') as f:
                seed_sql = f.read()
            
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(seed_sql)
                conn.commit()
                logger.info("Seed data loaded successfully")
        
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

# Flask integration
def get_db_connection():
    """Get database connection for Flask app"""
    return db.get_connection()

def query_db(query, args=(), one=False):
    """Query database and return results"""
    return db.execute_query(query, args, fetch_one=one, fetch_all=not one, dict_cursor=True)

def update_db(query, args=()):
    """Update database and return affected rows"""
    return db.execute_update(query, args)
