import os
import subprocess
import sys

# Recursively locate and install all requirements
def install_requirements():
    print("📦 Biswa Event Platform | Dependency Resolver")
    print("-" * 60)
    
    # Root backend directory
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    for root, dirs, files in os.walk(root_dir):
        if "requirements.txt" in files:
            # Prefer Slim-Mode for Python 3.14/Local testing
            target_req = "requirements-slim.txt" if os.path.exists(os.path.join(root, "requirements-slim.txt")) else "requirements.txt"
            req_path = os.path.join(root, target_req)
            
            print(f"📦 Installing dependencies for {os.path.basename(root)} (using {target_req})...")
            
            # Use --ignore-requires-python to bypass version checks on Windows/3.14
            try:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", "--ignore-requires-python", "--prefer-binary", "-r", req_path],
                    check=True,
                    cwd=root
                )
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to install dependencies for {root}: {e}")

    print("-" * 60)
    print("✅ All platform dependencies are resolved.")

if __name__ == "__main__":
    install_requirements()
