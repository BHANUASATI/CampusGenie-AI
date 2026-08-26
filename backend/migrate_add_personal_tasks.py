"""
Migration script to add personal tasks functionality
"""
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import create_engine, text, inspect
from config import settings

def column_exists(conn, table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def table_exists(conn, table_name):
    """Check if a table exists"""
    inspector = inspect(conn)
    return table_name in inspector.get_table_names()

def migrate():
    """Run the migration to add personal tasks functionality"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Create personal_tasks table first (since calendar_events will reference it)
            if not table_exists(conn, 'personal_tasks'):
                print("Creating personal_tasks table...")
                conn.execute(text("""
                    CREATE TABLE personal_tasks (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        category VARCHAR(20) NOT NULL DEFAULT 'other',
                        status VARCHAR(20) NOT NULL DEFAULT 'todo',
                        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                        due_date DATETIME,
                        start_date DATETIME,
                        completed_date DATETIME,
                        parent_task_id INT NULL,
                        position INT DEFAULT 0,
                        tags JSON,
                        reminder_enabled BOOLEAN DEFAULT FALSE,
                        reminder_date DATETIME,
                        reminder_sent BOOLEAN DEFAULT FALSE,
                        progress INT DEFAULT 0,
                        estimated_hours INT,
                        actual_hours INT,
                        is_recurring BOOLEAN DEFAULT FALSE,
                        recurrence_pattern VARCHAR(50),
                        recurrence_end_date DATETIME,
                        user_id INT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (parent_task_id) REFERENCES personal_tasks(id),
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        INDEX idx_user_id (user_id),
                        INDEX idx_status (status),
                        INDEX idx_due_date (due_date),
                        INDEX idx_category (category)
                    )
                """))
            else:
                print("personal_tasks table already exists")
            
            # Add new columns to calendar_events table
            print("Adding new columns to calendar_events table...")
            
            if not column_exists(conn, 'calendar_events', 'task_id'):
                conn.execute(text("ALTER TABLE calendar_events ADD COLUMN task_id INT NULL"))
                print("  - Added task_id column")
            
            if not column_exists(conn, 'calendar_events', 'event_type'):
                conn.execute(text("ALTER TABLE calendar_events ADD COLUMN event_type VARCHAR(20) NOT NULL DEFAULT 'personal'"))
                print("  - Added event_type column")
            
            if not column_exists(conn, 'calendar_events', 'status'):
                conn.execute(text("ALTER TABLE calendar_events ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'"))
                print("  - Added status column")
            
            if not column_exists(conn, 'calendar_events', 'priority'):
                conn.execute(text("ALTER TABLE calendar_events ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'medium'"))
                print("  - Added priority column")
            
            if not column_exists(conn, 'calendar_events', 'risk_level'):
                conn.execute(text("ALTER TABLE calendar_events ADD COLUMN risk_level VARCHAR(20) NOT NULL DEFAULT 'low'"))
                print("  - Added risk_level column")
            
            # Add foreign key constraint if it doesn't exist
            try:
                conn.execute(text("ALTER TABLE calendar_events ADD FOREIGN KEY (task_id) REFERENCES personal_tasks(id)"))
                print("  - Added foreign key constraint")
            except Exception as e:
                if "Duplicate foreign key constraint" in str(e) or "foreign key constraint" in str(e).lower():
                    print("  - Foreign key constraint already exists")
                else:
                    print(f"  - Foreign key constraint skipped: {e}")
                    # Continue anyway - the table structure is what matters
            
            # Update existing calendar_events to have proper event_type
            print("Updating existing calendar_events...")
            conn.execute(text("""
                UPDATE calendar_events 
                SET event_type = 'personal' 
                WHERE event_type IS NULL OR event_type = ''
            """))
            
            # Commit the transaction
            trans.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()