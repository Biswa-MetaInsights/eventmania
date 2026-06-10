"""Idempotent migration: add provenance columns to the `events` table.

`Base.metadata.create_all` only creates missing tables — it does not alter an
existing one. Pre-existing dev databases (the SQLite `platform_dev.db`, or a
Postgres `event_db`) therefore need these columns added manually:

    source       VARCHAR(50)   NOT NULL DEFAULT 'native'
    external_id  VARCHAR(255)
    image_url    VARCHAR(1000)

Run once after pulling the schema change, before running sync_ticketmaster.py:

    python backend/scripts/migrate_add_source_columns.py

The script is safe to run repeatedly — existing columns are skipped. It reads
DATABASE_URL the same way the services do (falling back to the shared
SQLite dev DB used by shadow_runner.py).
"""
import os
import sys

from sqlalchemy import create_engine, inspect, text

# Columns to ensure exist, with their per-dialect DDL type + default clause.
COLUMNS = {
    "source": {
        "sqlite": "VARCHAR(50) NOT NULL DEFAULT 'native'",
        "default": "VARCHAR(50) NOT NULL DEFAULT 'native'",
    },
    "external_id": {
        "sqlite": "VARCHAR(255)",
        "default": "VARCHAR(255)",
    },
    "image_url": {
        "sqlite": "VARCHAR(1000)",
        "default": "VARCHAR(1000)",
    },
}


def _resolve_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    # Mirror shadow_runner.py: shared SQLite db at the backend/ root.
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    db_path = os.path.join(backend_dir, "platform_dev.db")
    return f"sqlite:///{db_path}"


def main() -> int:
    database_url = _resolve_database_url()
    engine = create_engine(database_url)
    dialect = engine.dialect.name  # "sqlite" | "postgresql" | ...

    inspector = inspect(engine)
    if "events" not in inspector.get_table_names():
        print(
            "events table does not exist yet — nothing to migrate. "
            "Start the event service once to create it, then re-run."
        )
        return 0

    existing = {col["name"] for col in inspector.get_columns("events")}
    added, skipped = [], []

    with engine.begin() as conn:
        for name, ddl in COLUMNS.items():
            if name in existing:
                skipped.append(name)
                continue
            col_type = ddl.get(dialect, ddl["default"])
            conn.execute(text(f"ALTER TABLE events ADD COLUMN {name} {col_type}"))
            added.append(name)

    print(f"Database: {database_url}  (dialect: {dialect})")
    if added:
        print(f"  + added columns: {', '.join(added)}")
    if skipped:
        print(f"  = already present: {', '.join(skipped)}")
    print("Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
