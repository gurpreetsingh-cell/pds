#!/usr/bin/env python3
"""
Script to initialize the database and create a default admin user.
Run this after setting up your database connection in .env
"""

import os
from app import app, db, User, bcrypt

def create_admin_user():
    """Create a default admin user for testing"""
    with app.app_context():
        # Create all tables
        db.create_all()

        # Check if admin user already exists
        if User.query.filter_by(username='admin').first():
            print("Admin user already exists!")
            return

        # Create admin user
        password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin = User(username='admin', password_hash=password_hash, role='admin')
        db.session.add(admin)
        db.session.commit()

        print("✅ Admin user created!")
        print("Username: admin")
        print("Password: admin123")
        print("⚠️  Please change the password after first login!")

if __name__ == '__main__':
    create_admin_user()