import os

def clean_requirements():
    print("🧹 Cleaning requirements.txt for SQLite-only Shadow Mode...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    for root, dirs, files in os.walk(root_dir):
        if "requirements.txt" in files:
            req_path = os.path.join(root, "requirements.txt")
            with open(req_path, 'r') as f:
                lines = f.readlines()
            
            # Remove psycopg2 and other binary drivers that fail on 3.14 without PG
            cleaned_lines = [l for l in lines if "psycopg2" not in l and "pg_config" not in l]
            
            if len(cleaned_lines) != len(lines):
                print(f"✅ Cleaned {req_path}")
                with open(req_path, 'w') as f:
                    f.writelines(cleaned_lines)

if __name__ == "__main__":
    clean_requirements()
