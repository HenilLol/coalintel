import sqlite3
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

workspace_root = os.path.dirname(backend_dir)
db_paths = [
    os.path.join(workspace_root, "storage", "coalintel_db.sqlite"),
    os.path.join(backend_dir, "storage", "coalintel_db.sqlite")
]

db_path = None
for p in db_paths:
    if os.path.exists(p):
        db_path = p
        break

if not db_path:
    print("Database file not found!")
    sys.exit(1)

print(f"Checking schema sync for: {db_path}")

from database import Base, engine
import app.models

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
existing_tables = set(r[0] for r in cursor.fetchall())

# Map SQLAlchemy types to SQLite types
def sqlite_type_for_column(col):
    t = str(col.type).upper()
    if "INT" in t:
        return "INTEGER"
    elif "NUMERIC" in t or "DECIMAL" in t or "FLOAT" in t or "REAL" in t:
        return "NUMERIC"
    elif "BOOL" in t:
        return "BOOLEAN"
    elif "DATE" in t or "TIME" in t:
        return "TIMESTAMP"
    else:
        return "TEXT"

for table_name, table in Base.metadata.tables.items():
    if table_name not in existing_tables:
        print(f"Table '{table_name}' does not exist yet (create_all will handle it).")
        continue

    cursor.execute(f"PRAGMA table_info({table_name});")
    existing_cols = set(r[1] for r in cursor.fetchall())

    for col in table.columns:
        if col.name not in existing_cols:
            col_type = sqlite_type_for_column(col)
            print(f"Adding column '{col.name}' ({col_type}) to table '{table_name}'...")
            try:
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type};")
            except Exception as e:
                print(f"Failed to add {col.name} to {table_name}: {e}")

conn.commit()
conn.close()
print("Schema synchronization completed successfully.")
