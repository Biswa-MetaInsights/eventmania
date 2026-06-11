"""Run all backend services against PostgreSQL (one database per service).

The Postgres twin of shadow_runner.py. Whereas shadow mode points every service
at a single shared SQLite file, this points each stateful service at its own
Postgres database (auth_db, user_db, event_db, ...), matching the production
topology in docker-compose.yml. Kafka and Redis stay mocked, so the only
infrastructure you need running is Postgres:

    docker compose up -d postgres        # creates the per-service DBs on first init
    python backend/scripts/postgres_runner.py

Override the connection with PG_DSN_BASE, e.g.
    PG_DSN_BASE=postgresql://user:password@localhost:5432  (default)

Press Ctrl+C to shut everything down.
"""
import os
import subprocess
import sys
import time

# Service Registry (Name: (Relative Path, Port)) — mirrors shadow_runner.py.
SERVICES = {
    "gateway":        ("gateway",                 8000),
    "auth":           ("services/auth",           8001),
    "community":      ("services/community",      8011),
    "user":           ("services/user",           8002),
    "event":          ("services/event",          8003),
    "ticketing":      ("services/ticketing",      8004),
    "payment":        ("services/payment",        8005),
    "notification":   ("services/notification",   8006),
    "chat":           ("services/chat",           8007),
    "recommendation": ("services/recommendation", 8008),
    "review":         ("services/review",         8009),
    "agents":         ("agents",                  8010),
}

# Only these services declare DATABASE_URL in their config — each gets its own
# Postgres database. The rest (gateway, agents, recommendation, notification)
# are stateless and receive no DATABASE_URL.
SERVICE_DB = {
    "auth":      "auth_db",
    "user":      "user_db",
    "event":     "event_db",
    "ticketing": "ticketing_db",
    "payment":   "payment_db",
    "chat":      "chat_db",
    "review":    "review_db",
    "community": "community_db",
}

# Host port 55432 (see docker-compose.yml) avoids clashing with a native
# Postgres that may already own 5432.
PG_DSN_BASE = os.environ.get("PG_DSN_BASE", "postgresql://user:password@localhost:55432")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _load_dotenv(path: str) -> dict:
    """Parse a .env file into a dict, skipping comments and blanks."""
    result = {}
    if not os.path.exists(path):
        return result
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            result[key.strip()] = value.strip()
    return result


def run_postgres_mode():
    print("Biswa Platform | POSTGRES MODE")
    print("-" * 60)
    print(f"DSN base: {PG_DSN_BASE}  (Kafka + Redis mocked)")

    processes = []
    project_root = os.path.dirname(os.path.abspath(BASE_DIR))
    dotenv_vars = _load_dotenv(os.path.join(project_root, ".env"))
    if dotenv_vars:
        print(f"Loaded {len(dotenv_vars)} vars from project-root .env")

    for name, (rel_path, port) in SERVICES.items():
        service_cwd = os.path.join(BASE_DIR, rel_path)
        if not os.path.isdir(service_cwd):
            print(f"!  Skipping {name}: {service_cwd} not found")
            continue

        env = os.environ.copy()
        env.update(dotenv_vars)

        # Per-service Postgres DB, or no DATABASE_URL for stateless services.
        if name in SERVICE_DB:
            env["DATABASE_URL"] = f"{PG_DSN_BASE}/{SERVICE_DB[name]}"
        else:
            env.pop("DATABASE_URL", None)

        # Mock the rest of the infrastructure (same as shadow mode).
        env["MOCK_KAFKA"] = "TRUE"
        env["REDIS_HOST"] = "MOCK"
        env.setdefault("JWT_SECRET", "dev_secret_key_64_bits_long_minimum_integrity")
        env.setdefault("STRIPE_PUBLISHABLE_KEY", "pk_test_mock")
        env.setdefault("STRIPE_SECRET_KEY", "sk_test_mock")
        env.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_mock")

        sep = ";" if os.name == "nt" else ":"
        env["PYTHONPATH"] = f"{project_root}{sep}{service_cwd}"

        db_note = SERVICE_DB.get(name, "—")
        print(f"Launching {name.upper():14} :{port}  db={db_note}")

        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)]
        try:
            p = subprocess.Popen(
                cmd, cwd=service_cwd, env=env,
                stdout=None, stderr=None,
                shell=True if os.name == "nt" else False,
            )
            processes.append(p)
            time.sleep(2)  # avoid port-collision racing
        except Exception as e:
            print(f"Failed to start {name}: {e}")

    print("-" * 60)
    print("All services active (Postgres mode).")
    print("Gateway: http://localhost:8000")
    print("Press Ctrl+C to terminate.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down system...")
        for p in processes:
            p.terminate()


if __name__ == "__main__":
    run_postgres_mode()
