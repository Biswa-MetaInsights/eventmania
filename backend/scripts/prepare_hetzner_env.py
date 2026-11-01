"""Generate a new deployment's secrets on the target host. Never overwrite .env."""
import argparse
import os
from pathlib import Path
import secrets
from urllib.parse import urlparse

parser = argparse.ArgumentParser()
parser.add_argument("--frontend-origin", action="append", required=True)
parser.add_argument("--directory", type=Path, default=Path("/opt/newfind"))
args = parser.parse_args()
for origin in args.frontend_origin:
    url = urlparse(origin)
    if (url.scheme != "https" or not url.hostname or url.path not in ("", "/")
            or url.query or url.fragment or url.username or url.password
            or any(c in origin for c in "\n\r,$")):
        parser.error("Use exact HTTPS frontend origins without paths or credentials")
env = {
    "POSTGRES_USER": "newfind",
    "POSTGRES_PASSWORD": secrets.token_hex(32),
    "JWT_SECRET": secrets.token_hex(48),
    "INTERNAL_API_KEY": secrets.token_hex(48),
    "CORS_ALLOWED_ORIGINS": ",".join(origin.rstrip("/") for origin in args.frontend_origin),
    "NEWFIND_API_PORT": "18000",
}
path = args.directory / ".env"
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as handle:
    handle.write("".join(f"{key}={value}\n" for key, value in env.items()))
print("Created protected deployment environment; values were not printed.")
