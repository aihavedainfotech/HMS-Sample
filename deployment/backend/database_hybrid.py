"""
Hospital Management System - Hybrid Database Connection
======================================================
Supports both SQLite (for local development) and PostgreSQL (for production)
"""

import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HybridDatabase:
    """Hybrid Database Manager supporting SQLite and PostgreSQL"""
    
    def __init__(self):
        self.use_postgresql = bool(os.environ.get('DATABASE_URL'))
        self.pool = None
        self._initialize()
    
    def _initialize(self):
        """Initialize database connection"""
        if self.use_postgresql:
            self._initialize_postgresql()
        else:
            self._initialize_sqlite()
    
    def _initialize_sqlite(self):
        """Initialize SQLite connection"""
        self.sqlite_path = os.environ.get('DB_PATH', 'hospital_db.sqlite')
        logger.info(f"Using SQLite database: {self.sqlite_path}")
    
    def _initialize_postgresql(self):
        """Initialize PostgreSQL connection pool"""
        try:
            database_url = os.environ.get('DATABASE_URL')
            self.pool = SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=database_url
            )
            logger.info("PostgreSQL connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL connection pool: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get a database connection"""
        if self.use_postgresql:
            if not self.pool:
                self._initialize_postgresql()
            
            conn = None
            try:
                conn = self.pool.getconn()
                yield conn
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"PostgreSQL error: {e}")
                raise
            finally:
                if conn:
                    self.pool.putconn(conn)
        else:
            # SQLite
            conn = sqlite3.connect(self.sqlite_path)
            conn.row_factory = sqlite3.Row  # Dict-like rows
            conn.execute("PRAGMA foreign_keys = ON")
            try:
                yield conn
            except Exception as e:
                conn.rollback()
                logger.error(f"SQLite error: {e}")
                raise
            finally:
                conn.close()
    
    @contextmanager
    def get_cursor(self, dict_cursor=True):
        """Get a database cursor with automatic connection management"""
        conn = None
        try:
            if self.use_postgresql:
                if not self.pool:
                    self._initialize_postgresql()
                conn = self.pool.getconn()
                cursor_type = RealDictCursor if dict_cursor else None
                cursor = conn.cursor(cursor_factory=cursor_type)
            else:
                # SQLite
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row  # Dict-like rows
                conn.execute("PRAGMA foreign_keys = ON")
                cursor = conn.cursor()
            
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
                if self.use_postgresql:
                    self.pool.putconn(conn)
                else:
                    conn.close()
    
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
                if self.use_postgresql:
                    if cursor.description and cursor.description[0].name == 'id':
                        return cursor.fetchone()[0]
                    else:
                        cursor.execute("SELECT lastval()")
                        return cursor.fetchone()[0]
                else:
                    # SQLite
                    return cursor.lastrowid
            
            return cursor.rowcount
    
    def test_connection(self):
        """Test database connection"""
        try:
            with self.get_cursor() as (cursor, conn):
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                return result[0] == 1 if isinstance(result, (tuple, list)) else result['?column?'] == 1
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False

# Global database instance
db = HybridDatabase()

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
