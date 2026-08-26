#!/usr/bin/env python3
"""
Migration script to add email notification fields to calendar_events table
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import create_engine, text
from config import settings

def migrate():
    """Add email notification columns to calendar_events table"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if columns exist
            result = conn.execute(text('DESCRIBE calendar_events'))
            columns = [row[0] for row in result]
            
            # Add notification_email column if it doesn't exist
            if 'notification_email' not in columns:
                conn.execute(text('ALTER TABLE calendar_events ADD COLUMN notification_email VARCHAR(255)'))
                print('✅ Added notification_email column')
            else:
                print('ℹ️  notification_email column already exists')
                
            # Add notification_time column if it doesn't exist
            if 'notification_time' not in columns:
                conn.execute(text('ALTER TABLE calendar_events ADD COLUMN notification_time VARCHAR(10)'))
                print('✅ Added notification_time column')
            else:
                print('ℹ️  notification_time column already exists')
                
            # Add email_notification_enabled column if it doesn't exist
            if 'email_notification_enabled' not in columns:
                conn.execute(text('ALTER TABLE calendar_events ADD COLUMN email_notification_enabled BOOLEAN DEFAULT FALSE'))
                print('✅ Added email_notification_enabled column')
            else:
                print('ℹ️  email_notification_enabled column already exists')
            
            conn.commit()
            print('✅ Database migration completed successfully')
            
    except Exception as e:
        print(f'❌ Migration failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    migrate()