import subprocess
import os
import time
import sys

# Define the service topography (Service Name: Relative Path from /backend)
SERVICES = {
    "gateway": ("gateway", 8000),
    "auth": ("services/auth", 8001),
    "user": ("services/user", 8002),
    "event": ("services/event", 8003),
    "ticketing": ("services/ticketing", 8004),
    "payment": ("services/payment", 8005),
    "notification": ("services/notification", 8006),
    "chat": ("services/chat", 8007),
    "recommendation": ("services/recommendation", 8008),
    "review": ("services/review", 8009),
}

processes = []

def start_services():
    print("🚀 Biswa Event Platform | Local Service Orchestrator")
    print("-" * 60)
    
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    for name, (path, port) in SERVICES.items():
        print(f"📦 Starting {name.upper()} on port {port}...")
        service_dir = os.path.join(root_dir, path)
        
        # Start uvicorn in a separate shell process
        # Using sys.executable (py/python) to ensure compatibility
        cmd = f"py -m uvicorn main:app --port {port} --host 127.0.0.1"
        
        try:
            p = subprocess.Popen(
                cmd,
                shell=True,
                cwd=service_dir,
                stdout=None, # Keep output in terminal for logs
                stderr=None
            )
            processes.append(p)
            time.sleep(1) # Stagger starts to avoid CPU spikes
        except Exception as e:
            print(f"❌ Failed to start {name}: {e}")

    print("-" * 60)
    print("✅ All services initiated. Press Ctrl+C to terminate the ecosystem.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down all services...")
        for p in processes:
            p.terminate()
        print("Done.")

if __name__ == "__main__":
    start_services()
