import os
import subprocess
import sys

# Packages to exclude for local "Easy-Run" on Windows/3.14
EXCLUDE = ["crewai", "pydantic-ai", "langchain", "psycopg2", "psycopg2-binary", "openai", "google-generativeai"]

# Basic essentials that always work
ESSENTIALS = ["fastapi==0.111.0", "uvicorn==0.30.1", "pydantic==2.7.4", "sqlalchemy==2.0.30", "web-socket-channel", "slowapi", "httpx"]

def prepare_slim_env():
    print("🪄 Preparing Slim-Mode Environment (Python 3.14 optimized)...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    for root, dirs, files in os.walk(root_dir):
        if "requirements.txt" in files:
            req_path = os.path.join(root, "requirements.txt")
            with open(req_path, 'r') as f:
                lines = f.readlines()
            
            # Filter and add essentials
            cleaned = [l.strip() for l in lines if not any(e in l.lower() for e in EXCLUDE)]
            
            # Write to 'requirements-slim.txt'
            slim_path = os.path.join(root, "requirements-slim.txt")
            with open(slim_path, 'w') as f:
                f.write("\n".join(cleaned + (ESSENTIALS if "gateway" not in root else [])))
            
            print(f"📦 Slim requirements ready for: {os.path.basename(root)}")

if __name__ == "__main__":
    prepare_slim_env()
