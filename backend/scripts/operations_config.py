"""Read only allow-listed operational settings from NewFind's private env file."""
import json
import os
from pathlib import Path
import stat

ROOT = Path(__file__).resolve().parents[2]
ALLOWED = {'APP_PUBLIC_URL','SMTP_HOST','SMTP_PORT','SMTP_FROM','SMTP_USERNAME','SMTP_PASSWORD',
           'RESTIC_REPOSITORY','RESTIC_PASSWORD_FILE','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY',
           'AWS_DEFAULT_REGION','ALERT_WEBHOOK_URL','ALERT_WEBHOOK_TOKEN','ALERT_EMAIL_TO'}


def private_file(path):
    path = Path(path)
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode) or metadata.st_mode & 0o077:
        raise RuntimeError('Operational secret files must be regular owner-only files')
    if metadata.st_uid != os.geteuid():
        raise RuntimeError('Operational secret files must belong to the running user')
    return path


def load(path=None):
    path = Path(path) if path else ROOT / '.env'
    if not path.exists(): return
    for line in private_file(path).read_text().splitlines():
        key, separator, value = line.strip().partition('=')
        if not separator or key not in ALLOWED: continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"): value=value[1:-1]
        os.environ.setdefault(key, value)


def write_state(path, data):
    path=Path(path);path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp')
    descriptor=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o600)
    with os.fdopen(descriptor,'w') as output: json.dump(data,output)
    os.replace(temporary,path)
