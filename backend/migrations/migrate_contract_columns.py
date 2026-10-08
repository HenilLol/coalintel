import sqlite3
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
    print(f"Database file not found in {db_paths}")
    sys.exit(0)

print(f"Migrating database at: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def get_columns(table_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

# Columns to ensure in mine_master
mine_master_cols = {
    "block_name": "VARCHAR(150)",
    "commodity": "VARCHAR(50) DEFAULT 'coal'",
    "updated_at": "TIMESTAMP"
}

existing_mm = get_columns("mine_master")
for col, col_type in mine_master_cols.items():
    if col not in existing_mm:
        print(f"Adding {col} to mine_master...")
        cursor.execute(f"ALTER TABLE mine_master ADD COLUMN {col} {col_type}")

# Columns to ensure in mine_yearly_metrics
mym_cols = {
    "coal_grade": "VARCHAR(50)",
    "mine_type": "VARCHAR(50)",
    "mining_method": "VARCHAR(100)",
    "operational_status": "VARCHAR(50)",
    "production_status": "VARCHAR(50)",
    "mine_opening_permission": "BOOLEAN",
    "captive_or_commercial": "VARCHAR(50)",
    "star_rating_category": "VARCHAR(50)",
    "employment": "INTEGER",
    "as_of_date": "VARCHAR(30)",
    "updated_at": "TIMESTAMP"
}

existing_mym = get_columns("mine_yearly_metrics")
for col, col_type in mym_cols.items():
    if col not in existing_mym:
        print(f"Adding {col} to mine_yearly_metrics...")
        cursor.execute(f"ALTER TABLE mine_yearly_metrics ADD COLUMN {col} {col_type}")

# Columns to ensure in coal_blocks
cb_cols = {
    "normalized_name": "VARCHAR(150)",
    "mine_name": "VARCHAR(150)",
    "mine_id": "VARCHAR(100)",
    "company": "VARCHAR(150)",
    "company_name": "VARCHAR(150)",
    "operational_status": "VARCHAR(50) DEFAULT 'operational'",
    "captive_or_commercial": "VARCHAR(50)",
    "target_production_mt": "NUMERIC(18, 6)",
    "peak_rated_capacity_mtpa": "NUMERIC(18, 6)",
    "data_origin": "VARCHAR(30) DEFAULT 'government'",
    "verification_status": "VARCHAR(30) DEFAULT 'verified'",
    "updated_at": "TIMESTAMP"
}

existing_cb = get_columns("coal_blocks")
for col, col_type in cb_cols.items():
    if col not in existing_cb:
        print(f"Adding {col} to coal_blocks...")
        cursor.execute(f"ALTER TABLE coal_blocks ADD COLUMN {col} {col_type}")

conn.commit()
conn.close()
print("Migration completed successfully.")
