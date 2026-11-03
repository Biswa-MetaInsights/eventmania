"""Encrypted restic copies of complete NewFind DB snapshots; never restores production.

Requires an existing, approved S3 repository and owner-only encryption-password file.
Initialization is explicit. No bucket creation, remote deletion, or automatic pruning.
"""
import argparse
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit
from operations_config import ROOT,load,private_file,write_state
from database_backup import BACKUPS,DATABASES


def configuration(local_test=False):
    repository=os.getenv('RESTIC_REPOSITORY','')
    if not local_test:
        if not repository.startswith('s3:https://'):
            raise RuntimeError('Configure an approved HTTPS S3 backup repository')
        url=urlsplit(repository[3:])
        if not url.hostname or url.username or url.password or url.query or url.fragment or not url.path.strip('/'):
            raise RuntimeError('Use a repository endpoint/path with credentials in protected environment settings')
        if not os.getenv('AWS_ACCESS_KEY_ID') or not os.getenv('AWS_SECRET_ACCESS_KEY'):
            raise RuntimeError('Dedicated backup storage credentials are required')
    if not repository: raise RuntimeError('Backup repository is not configured')
    password=private_file(os.getenv('RESTIC_PASSWORD_FILE',''))
    if len(password.read_bytes().strip())<20:raise RuntimeError('Use a strong repository encryption password')
    # Do not pass JWT, database or SMTP secrets to the backup process.
    env={key:os.environ[key] for key in ('PATH','HOME','TMPDIR','SSL_CERT_FILE','SSL_CERT_DIR') if key in os.environ}
    for key in ('RESTIC_REPOSITORY','RESTIC_PASSWORD_FILE','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_DEFAULT_REGION'):
        if key in os.environ:env[key]=os.environ[key]
    env.update(GOMAXPROCS='1',GOGC='50')
    return env


def run(arguments,env,binary='restic'):
    result=subprocess.run([binary,'--limit-upload','2048',*arguments],env=env,stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=1800)
    if result.returncode:raise RuntimeError('Encrypted backup operation failed; inspect credentials/connectivity privately')
    return result.stdout


def validate(snapshot):
    manifest=json.loads((snapshot/'manifest.json').read_text())
    if set(manifest['databases'])!=set(DATABASES):raise RuntimeError('Snapshot must contain the four NewFind databases')
    created=datetime.fromisoformat(manifest['created_at'])
    if (datetime.now(timezone.utc)-created).total_seconds()>36*3600:raise RuntimeError('Local snapshot is stale')
    for database in DATABASES:
        path=snapshot/(database+'.dump')
        if path.is_symlink() or not path.is_file():raise RuntimeError('Snapshot dump is invalid')
        with path.open('rb') as content: digest=hashlib.file_digest(content,'sha256').hexdigest()
        if digest!=manifest['databases'][database]['sha256']:raise RuntimeError('Local dump checksum mismatch')
    return manifest


def upload(snapshot,env,binary='restic',verify_database=False,state_path=None):
    snapshot=Path(snapshot).resolve();manifest=validate(snapshot)
    required=sum(p.stat().st_size for p in snapshot.iterdir() if p.is_file())
    if required>1024**3:raise RuntimeError('Snapshot exceeds the 1 GiB approved transfer guard')
    statistics=json.loads(run(['stats','--mode','raw-data','--json'],env,binary))
    if statistics.get('total_size',0)+required>20*1024**3:raise RuntimeError('Repository exceeds the 20 GiB cost guard; review retention before continuing')
    if shutil.disk_usage(ROOT).free<required+1024**3:raise RuntimeError('Insufficient room for isolated restore verification')
    lines=run(['backup','--json','--host','newfind','--tag','newfind',str(snapshot)],env,binary).decode().splitlines()
    summaries=[json.loads(line) for line in lines if line.startswith('{')]
    snapshot_id=next((row.get('snapshot_id') for row in reversed(summaries) if row.get('snapshot_id')),None)
    if not snapshot_id:raise RuntimeError('Backup snapshot identifier missing')
    run(['check','--read-data-subset=5%'],env,binary)
    # Read back the exact new snapshot; success is never inferred from an upload alone.
    with tempfile.TemporaryDirectory(prefix='newfind-offsite-restore-',dir=ROOT) as temporary:
        os.chmod(temporary,0o700)
        run(['restore',snapshot_id,'--target',temporary],env,binary)
        matches=list(Path(temporary).rglob('manifest.json'))
        if len(matches)!=1:raise RuntimeError('Restored manifest is ambiguous')
        restored=matches[0].parent
        if json.loads(matches[0].read_text())!=manifest:raise RuntimeError('Restored manifest differs')
        validate(restored)
        if verify_database:
            from database_backup import verify
            verify(restored)
    state={'verified_at':datetime.now(timezone.utc).isoformat(),'snapshot_created_at':manifest['created_at'],
           'snapshot_id':snapshot_id,'database_restore_verified':verify_database}
    write_state(state_path or ROOT/'.ops-state'/'offsite.json',state)
    print('PASS encrypted backup and exact-snapshot restore/checksums',flush=True)
    return state


def install():
    configuration()
    if not shutil.which('restic'):raise RuntimeError('Install restic from its official distribution first')
    if os.geteuid()!=0:raise RuntimeError('Root required to install the NewFind backup timer')
    bodies={'service':f'[Unit]\nDescription=Encrypted off-server NewFind database backup\nAfter=docker.service network-online.target\n[Service]\nType=oneshot\nWorkingDirectory={ROOT}\nExecStart=/usr/bin/python3 {Path(__file__).resolve()}\nUMask=0077\nMemoryMax=384M\nCPUQuota=25%\nTimeoutStartSec=3600\n',
            'timer':'[Unit]\nDescription=Daily NewFind off-server backup\n[Timer]\nOnCalendar=*-*-* 04:00:00 UTC\nPersistent=true\nRandomizedDelaySec=600\n[Install]\nWantedBy=timers.target\n'}
    for suffix,body in bodies.items():
        path=Path('/etc/systemd/system/newfind-offsite-backup.'+suffix)
        if path.exists() and path.read_text()!=body:raise RuntimeError('Refusing to replace an unrelated unit')
        path.write_text(body)
    subprocess.run(['systemctl','daemon-reload'],check=True)
    subprocess.run(['systemctl','enable','--now','newfind-offsite-backup.timer'],check=True)


if __name__=='__main__':
    os.umask(0o077);load()
    parser=argparse.ArgumentParser();parser.add_argument('--init',action='store_true');parser.add_argument('--install',action='store_true');parser.add_argument('--verify-database',action='store_true');args=parser.parse_args()
    try:
        env=configuration()
        if args.init:run(['init'],env)
        snapshots=sorted(p.parent for p in BACKUPS.glob('*/manifest.json'))
        if not snapshots:raise RuntimeError('No complete local NewFind snapshot exists')
        upload(snapshots[-1],env,verify_database=args.verify_database)
        if args.install:install()
    except (RuntimeError,OSError,ValueError,subprocess.SubprocessError) as error:
        raise SystemExit('FAIL encrypted backup; configuration, connectivity or verification requires attention') from None
