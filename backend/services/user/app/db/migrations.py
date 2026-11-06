"""Additive, repeatable schema upgrades for existing user databases."""
from sqlalchemy import inspect, text


def migrate_organizer_contact_email(engine):
    if "organizer_profiles" not in inspect(engine).get_table_names():
        return
    with engine.begin() as connection:
        # Serializes concurrent PostgreSQL startup migrations, without locking other apps.
        if engine.dialect.name == "postgresql":
            connection.execute(text("SELECT pg_advisory_xact_lock(718340026)"))
        columns = {column["name"] for column in inspect(connection).get_columns("organizer_profiles")}
        if "contact_email" not in columns:
            connection.execute(text(
                "ALTER TABLE organizer_profiles ADD COLUMN contact_email VARCHAR(255) NOT NULL DEFAULT ''"
            ))
        # Historic contact emails were discarded; use the existing company address as fallback.
        connection.execute(text(
            "UPDATE organizer_profiles SET contact_email = company_email "
            "WHERE contact_email IS NULL OR contact_email = ''"
        ))
