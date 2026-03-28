import subprocess
import os
import sys
import time

# Service Registry (Name: (Relative Path, Port))
SERVICES = {
    "gateway": ("gateway", 8000),
    "auth": ("services/auth", 8001),
    "user": ("services/user", 8002),
    "event": ("services/event", 8003),
    "ticketing": ("services/ticketing", 8004),
    "agents": ("agents", 8010),
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
    
    # 2. Iterate and Start Services
    for name, (rel_path, port) in SERVICES.items():
        print(f"🚀 Launching {name.upper()} on port {port}...")
        service_cwd = os.path.join(BASE_DIR, rel_path)
        
        # Inject Mock Env Vars
        env = os.environ.copy()
        env["DATABASE_URL"] = db_url
        env["MOCK_KAFKA"] = "TRUE"
        env["REDIS_HOST"] = "MOCK" # Services should check this for local in-memory redis
        env["PYTHONPATH"] = BASE_DIR # Ensure 'shared' is importable
        
        # Build Command (using the detected py/python executable)
        if name == "agents":
            cmd = [sys.executable, "app/services/event_consumer.py"]
        else:
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
