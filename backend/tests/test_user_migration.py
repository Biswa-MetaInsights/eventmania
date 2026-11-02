"""Existing organizer rows survive the additive contact-email migration."""
import importlib.util
from pathlib import Path
from sqlalchemy import create_engine, inspect, text


def test_existing_organizers_are_backfilled_without_losing_data(tmp_path):
    path = Path(__file__).resolve().parents[1] / 'services/user/app/db/migrations.py'
    spec = importlib.util.spec_from_file_location('user_migrations', path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as conn:
        conn.execute(text('CREATE TABLE organizer_profiles (id INTEGER PRIMARY KEY, company_email VARCHAR(255), bank_account_number VARCHAR(64))'))
        conn.execute(text("INSERT INTO organizer_profiles VALUES (1, 'legacy@example.org', 'UNCHANGED')"))
    migration.migrate_organizer_contact_email(engine)
    migration.migrate_organizer_contact_email(engine)
    with engine.begin() as conn:
        assert conn.execute(text('SELECT contact_email, bank_account_number FROM organizer_profiles')).one() == ('legacy@example.org', 'UNCHANGED')
        conn.execute(text("UPDATE organizer_profiles SET contact_email='person@example.org'"))
    migration.migrate_organizer_contact_email(engine)
    with engine.connect() as conn:
        assert conn.execute(text('SELECT contact_email FROM organizer_profiles')).scalar_one() == 'person@example.org'
    assert 'contact_email' in {c['name'] for c in inspect(engine).get_columns('organizer_profiles')}
