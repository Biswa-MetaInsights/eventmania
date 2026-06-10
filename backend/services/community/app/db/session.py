from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_options = {"pool_pre_ping": True}

if is_sqlite:
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update({"pool_size": 10, "max_overflow": 20})

engine = create_engine(settings.DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
