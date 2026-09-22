"""Idempotent migration: add the payout columns to `organizer_profiles`.

`Base.metadata.create_all` only creates missing tables — it does not alter an
existing one. A dev database that already holds organiser profiles (the SQLite
`platform_dev.db`, or a Postgres `user_db`) therefore needs these added by hand:

    bank_name            VARCHAR(200)  NOT NULL DEFAULT ''
    bank_account_number  VARCHAR(64)   NOT NULL DEFAULT ''

Run once after pulling the schema change:

    python backend/scripts/migrate_add_bank_columns.py

Safe to run repeatedly — an existing column is skipped.

Backfill: '' for every existing row. There is nothing to infer a bank account
from, so a profile verified before this shipped simply has no payout details
until its organiser re-submits the form, which `/organizer/onboarding` allows.
"""
import os
import sys

from sqlalchemy import create_engine, inspect, text

# name -> the column definition it is added with.
COLUMNS = {
    "bank_name": "VARCHAR(200) NOT NULL DEFAULT ''",
    "bank_account_number": "VARCHAR(64) NOT NULL DEFAULT ''",
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
    if "organizer_profiles" not in inspector.get_table_names():
        print(
            "organizer_profiles table does not exist yet — nothing to migrate. "
            "Start the user service once to create it, then re-run."
        )
        return 0

    existing = {col["name"] for col in inspector.get_columns("organizer_profiles")}

    with engine.begin() as conn:
        for name, definition in COLUMNS.items():
            if name in existing:
                print(f"  = column already present: {name}")
                continue
            conn.execute(
                text(f"ALTER TABLE organizer_profiles ADD COLUMN {name} {definition}")
            )
            print(f"  + added column: {name} (default '')")

        # A row inserted by an older client can still carry NULL even where the
        # ALTER backfilled its default.
        for name in COLUMNS:
            conn.execute(
                text(
                    f"UPDATE organizer_profiles SET {name} = '' WHERE {name} IS NULL"
                )
            )

    print(f"Database: {database_url}  (dialect: {dialect})")
    print("Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
