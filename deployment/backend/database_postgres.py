"""
Hospital Management System - PostgreSQL Database Connection
=========================================================
Pure PostgreSQL database module for production deployment
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PostgreSQLDatabase:
    """PostgreSQL Database Manager"""
    
    def __init__(self):
        self.pool = None
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize connection pool"""
        try:
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL environment variable is required")
            
            self.pool = SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=database_url
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
    def get_cursor(self, dict_cursor=True):
        """Get a database cursor with automatic connection management"""
        conn = None
        try:
            if not self.pool:
                self._initialize_pool()
            conn = self.pool.getconn()
            cursor_type = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_type)
            
            yield cursor, conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Cursor error: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conn:
                self.pool.putconn(conn)
    
    def execute_query(self, query, params=None, fetch_one=False, fetch_all=True):
        """Execute a SELECT query"""
        with self.get_cursor() as (cursor, conn):
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
                # Handle both tuple and dict results
                if isinstance(result, (tuple, list)):
                    return result[0] == 1
                elif hasattr(result, 'get'):
                    return result.get('?column?', 0) == 1
                else:
                    return False
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        if self.pool:
            self.pool.closeall()
            self.pool = None

# Global database instance
db = PostgreSQLDatabase()

# Helper functions for Flask app
def get_db():
    """Get database instance"""
    return db

def query_db(query, args=(), one=False):
    """Query database and return results"""
    return db.execute_query(query, args, fetch_one=one, fetch_all=not one)

def update_db(query, args=()):
    """Update database and return affected rows"""
    return db.execute_update(query, args)

# Flask integration functions
def get_db_connection():
    """Get database connection for Flask app"""
    return db.get_connection()

def close_db_connection(conn):
    """Close database connection (handled by pool)"""
    pass

def get_dict_cursor(conn):
    """Get dictionary cursor for PostgreSQL"""
    return conn.cursor(cursor_factory=RealDictCursor)

def execute_query(conn, query, params=None):
    """Execute a query and return cursor"""
    cursor = get_dict_cursor(conn)
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)
    return cursor

def fetchall_as_dicts(cursor):
    """Convert query results to list of dicts"""
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

def fetchone_as_dict(cursor):
    """Convert single row to dict"""
    row = cursor.fetchone()
    return dict(row) if row else None
