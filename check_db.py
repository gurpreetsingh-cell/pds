#!/usr/bin/env python3
"""
Quick database connection test.
Run this after updating your .env file with database credentials.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

def test_connection():
    """Test database connection using DATABASE_URL from .env"""
    load_dotenv()

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        return False

    try:
        print(f"🔗 Connecting to: {database_url.split('@')[1] if '@' in database_url else 'database'}")
        engine = create_engine(database_url)

        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            if row and row[0] == 1:
                print("✅ Database connection successful!")
                return True
            else:
                print("❌ Connection test failed")
                return False

    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

if __name__ == '__main__':
    print("Testing database connection...")
    if test_connection():
        print("\n🎉 Database is ready! Run 'python init_db.py' to create tables.")
    else:
        print("\n💥 Check your .env DATABASE_URL configuration.")