"""NewFind-only local PostgreSQL backup and isolated restore verification.

No production restores, exposed ports, or third-party storage. Run --install-timer
once for daily backups; --verify-latest restores into a disposable, private,
resource-limited PostgreSQL container and compares table row counts.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
BACKUPS = ROOT / '.backups'
DATABASES = ('auth_db', 'user_db', 'event_db', 'ticketing_db')
COMPOSE = ['docker', 'compose', '-p', 'newfind', 'exec', '-T', 'postgres']


def run(command, **kwargs):
    if "input" not in kwargs:
        kwargs.setdefault("stdin", subprocess.DEVNULL)
    return subprocess.run(command, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, timeout=180, **kwargs).stdout


def source_command(program, *args):
    # The password never leaves the existing container's environment.
    return COMPOSE + ['sh', '-c', f'exec {program} -U "$POSTGRES_USER" "$@"', 'sh', *args]


def counts(prefix, database):
    tables = run(prefix + ['psql', '-U', 'postgres', '-d', database, '-Atc',
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"]).decode().splitlines()
    result = {}
    for table in tables:
        quoted = '"' + table.replace('"', '""') + '"'
        result[table] = int(run(prefix + ['psql', '-U', 'postgres', '-d', database, '-Atc',
                                         f'SELECT count(*) FROM public.{quoted}']).decode().strip())
    return result


def source_counts(database):
    tables = run(source_command('psql', '-d', database, '-Atc',
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).decode().splitlines()
    result = {}
    for table in tables:
        quoted = '"' + table.replace('"', '""') + '"'
        result[table] = int(run(source_command('psql', '-d', database, '-Atc',
                                             f'SELECT count(*) FROM public.{quoted}')).decode().strip())
    return result


def backup():
    if shutil.disk_usage(ROOT).free < 1024 ** 3:
        raise RuntimeError('Less than 1 GiB free; backup refused')
    BACKUPS.mkdir(mode=0o700, exist_ok=True)
    os.chmod(BACKUPS, 0o700)
    destination = BACKUPS / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid4().hex[:6])
    destination.mkdir(mode=0o700)
    manifest = {'created_at': datetime.now(timezone.utc).isoformat(), 'databases': {}}
    for database in DATABASES:
        before = source_counts(database)
        output = destination / (database + '.dump')
        with output.open('xb') as handle:
            subprocess.run(source_command('pg_dump', '-Fc', '--no-owner', '--no-acl', database),
                           stdin=subprocess.DEVNULL, stdout=handle, stderr=subprocess.PIPE, check=True, timeout=180)
        os.chmod(output, 0o600)
        after = source_counts(database)
        if before != after:
            raise RuntimeError('Data changed during backup; rerun for a verified row-count manifest')
        manifest['databases'][database] = {'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'rows': after}
    (destination / 'manifest.json').write_text(json.dumps(manifest))
    os.chmod(destination / 'manifest.json', 0o600)
    print('PASS protected backup of four NewFind core databases', flush=True)
    return destination


def verify(destination):
    manifest = json.loads((destination / 'manifest.json').read_text())
    name = 'newfind-restore-check-' + uuid4().hex[:10]
    run(['docker', 'run', '-d', '--name', name, '--network', 'none', '--memory', '192m',
         '--cpus', '0.25', '--tmpfs', '/var/lib/postgresql/data:rw,size=256m',
         '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:15-alpine'])
    prefix = ['docker', 'exec', name]
    try:
        for attempt in range(60):
            probe = subprocess.run(prefix + ['pg_isready', '-U', 'postgres'], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL)
            if probe.returncode == 0:
                break
            time.sleep(0.5)
        else:
            raise RuntimeError('Isolated restore database did not become ready')
        for database in DATABASES:
            dump = (destination / (database + '.dump')).read_bytes()
            if hashlib.sha256(dump).hexdigest() != manifest['databases'][database]['sha256']:
                raise RuntimeError('Backup checksum mismatch')
            run(prefix + ['createdb', '-U', 'postgres', database])
            run(['docker', 'exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', database,
                 '--exit-on-error', '--no-owner', '--no-privileges'], input=dump)
            if counts(prefix, database) != manifest['databases'][database]['rows']:
                raise RuntimeError('Restored table row counts differ')
        print('PASS isolated restore, checksums and all public-table row counts for four databases', flush=True)
    finally:
        # Only the freshly created disposable verification container is removed.
        run(['docker', 'rm', '-f', name])


def install_timer():
    if os.geteuid() != 0:
        raise RuntimeError('Installing the backup timer requires root')
    units = {
        'service': f'[Unit]\nDescription=Back up NewFind core databases\nAfter=docker.service\n[Service]\nType=oneshot\nWorkingDirectory={ROOT}\nExecStart=/usr/bin/python3 {Path(__file__).resolve()}\nUMask=0077\nTimeoutStartSec=900\n',
        'timer': '[Unit]\nDescription=Daily NewFind database backup\n[Timer]\nOnCalendar=*-*-* 03:15:00 UTC\nPersistent=true\nRandomizedDelaySec=600\n[Install]\nWantedBy=timers.target\n',
    }
    for suffix, content in units.items():
        path = Path('/etc/systemd/system/newfind-database-backup.' + suffix)
        if path.exists() and path.read_text() != content:
            raise RuntimeError('Refusing to overwrite an unrelated backup unit')
        path.write_text(content)
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'enable', '--now', 'newfind-database-backup.timer'])
    print('PASS daily local backup timer installed; off-server storage still required', flush=True)


if __name__ == '__main__':
    os.umask(0o077)
    os.chdir(ROOT)
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-latest', action='store_true')
    parser.add_argument('--install-timer', action='store_true')
    args = parser.parse_args()
    try:
        if args.verify_latest:
            snapshots = sorted(p.parent for p in BACKUPS.glob('*/manifest.json'))
            if not snapshots:
                raise RuntimeError('No complete NewFind backup exists')
            verify(snapshots[-1])
        else:
            backup()
        if args.install_timer:
            install_timer()
    except subprocess.CalledProcessError:
        # Raw tool errors can contain private database values; keep logs generic.
        raise SystemExit('FAIL database operation; inspect privately before retrying')
