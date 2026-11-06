"""Additive, idempotent JSON metadata migrations for SQLite and PostgreSQL."""
from sqlalchemy import inspect, text


def add_columns(engine, table, columns):
    present = {column['name'] for column in inspect(engine).get_columns(table)}
    with engine.begin() as connection:
        for name, definition in columns.items():
            if name not in present:
                # All identifiers/definitions are constants from application code.
                connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {definition}'))

