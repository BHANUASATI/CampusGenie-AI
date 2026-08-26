#!/usr/bin/env python3

"""
Add profile_image column to students table
"""

import sys
sys.path.append('.')

from sqlalchemy import create_engine, text
from config import settings

def add_profile_image_column():
    """Add profile_image column to students table"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'students' 
                AND COLUMN_NAME = 'profile_image'
            """))
            
            if result.fetchone():
                print("✅ profile_image column already exists in students table")
                return
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE students 
                ADD COLUMN profile_image VARCHAR(500) NULL 
                AFTER verified_at
            """))
            
            conn.commit()
            print("✅ Successfully added profile_image column to students table")
            
        except Exception as e:
            print(f"❌ Error adding column: {e}")
            conn.rollback()

if __name__ == "__main__":
    add_profile_image_column()