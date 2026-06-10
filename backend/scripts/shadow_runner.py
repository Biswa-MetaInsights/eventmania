import subprocess
import os
import sys
import time


def _load_dotenv(path: str) -> dict:
    """Parse a .env file and return a dict of key=value pairs, skipping comments and blanks."""
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

# Service Registry (Name: (Relative Path, Port))
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

# Base Directory (backend/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_shadow_mode():
    print("💠 Biswa Platform | SHADOW MODE ENGINE")
    print("-" * 60)
    print("⚠️  Warning: Using Python 3.14 + Mock Infrastructure (No Docker/Kafka/PG required)")
    
    processes = []

    # 1. Prepare shared SQLite DB for all services
    db_path = os.path.abspath(os.path.join(BASE_DIR, "platform_dev.db"))
    db_url = f"sqlite:///{db_path}"

    # Project Root (absolute parent of backend/)
    PROJECT_ROOT = os.path.dirname(os.path.abspath(BASE_DIR))

    # Load .env from project root so secrets (OPENAI_API_KEY etc.) are available to all services
    dotenv_path = os.path.join(PROJECT_ROOT, ".env")
    dotenv_vars = _load_dotenv(dotenv_path)
    if dotenv_vars:
        print(f"📄 Loaded {len(dotenv_vars)} vars from {dotenv_path}")

    # 2. Iterate and Start Services
    for name, (rel_path, port) in SERVICES.items():
        print(f"🚀 Launching {name.upper()} on port {port}...")
        service_cwd = os.path.join(BASE_DIR, rel_path)

        # Start with current process env, then overlay .env, then enforce shadow-mode overrides
        env = os.environ.copy()
        env.update(dotenv_vars)

        # Shadow-mode overrides (always win over .env)
        env["DATABASE_URL"] = db_url
        env["MOCK_KAFKA"] = "TRUE"
        env["REDIS_HOST"] = "MOCK"

        # Inject required Pydantic fields (Satisfy validation in Shadow Mode)
        env.setdefault("JWT_SECRET", "dev_secret_key_64_bits_long_minimum_integrity")
        env.setdefault("STRIPE_PUBLISHABLE_KEY", "pk_test_mock")
        env.setdefault("STRIPE_SECRET_KEY", "sk_test_mock")
        env.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_mock")
        
        # PYTHONPATH: project root (for backend.shared) + service dir (for app module)
        sep = ";" if os.name == "nt" else ":"
        env["PYTHONPATH"] = f"{PROJECT_ROOT}{sep}{service_cwd}"
        
        # Log injection for debugging
        print(f"🚀 Starting {name} on port {port}...")
        
        # Build Command (using the detected py/python executable)
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)]
        
        try:
            p = subprocess.Popen(
                cmd,
                cwd=service_cwd,
                env=env,
                stdout=None, # Show logs in the master terminal
                stderr=None,
                shell=True if os.name == 'nt' else False
            )
            processes.append(p)
            time.sleep(2) # Prevent port collision racing
        except Exception as e:
            print(f"❌ Failed to start {name}: {e}")

    print("-" * 60)
    print(f"✅ All services active through Shadow-Mode Runner.")
    print(f"🔗 Gateway: http://localhost:8000")
    print(f"📁 Local DB: {db_path}")
    print("Press Ctrl+C to terminate.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down system...")
        for p in processes:
            p.terminate()

if __name__ == "__main__":
    run_shadow_mode()
