"""Use the existing event container for a lightweight Ticketmaster sync.

Credentials stay in the private deployment .env and are sent over stdin, never
command arguments or logs. No recommendation/AI/Kafka service is started.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CITIES = [('Brussels', 'BE'), ('Amsterdam', 'NL'), ('Luxembourg', 'LU')]


def configured_key():
    key = os.environ.get('TICKETMASTER_API_KEY', '')
    path = ROOT / '.env'
    if not key and path.exists():
        for line in path.read_text().splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and name == 'TICKETMASTER_API_KEY':
                key = value.strip().strip('\"').strip("'")
    if key.lower().startswith(('your_', 'replace_', 'example')):
        return ''
    return key


def run_sync(key, cities):
    command = ['docker', 'compose', '-p', 'newfind', 'exec', '-T', 'event',
               'python', '-m', 'backend.shared.ticketmaster_sync']
    result = subprocess.run(command, cwd=ROOT, input=json.dumps({'key': key, 'cities': cities}).encode(),
                            capture_output=True, timeout=600)
    if result.returncode:
        # Docker error messages can include sensitive configuration; don't relay them.
        raise RuntimeError('External event sync failed; inspect provider status and private deployment logs')
    summary = json.loads(result.stdout)
    print(json.dumps(summary), flush=True)
    if summary.get('failed'):
        raise RuntimeError('Some provider events failed to save; schedule not enabled')
    return summary


def install_timer():
    service = f'[Unit]\nDescription=Sync NewFind Ticketmaster listings\nAfter=docker.service\n[Service]\nType=oneshot\nWorkingDirectory={ROOT}\nExecStart=/usr/bin/python3 {Path(__file__).resolve()}\nUMask=0077\nTimeoutStartSec=650\n'
    timer = '[Unit]\nDescription=Refresh NewFind external listings\n[Timer]\nOnCalendar=*-*-* 06,14,22:00:00 UTC\nPersistent=true\nRandomizedDelaySec=600\n[Install]\nWantedBy=timers.target\n'
    for suffix, content in [('service', service), ('timer', timer)]:
        path = Path('/etc/systemd/system/newfind-external-events.' + suffix)
        if path.exists() and path.read_text() != content:
            raise RuntimeError('Refusing to overwrite an unrecognized sync unit')
        path.write_text(content)
    subprocess.run(['systemctl', 'daemon-reload'], check=True, capture_output=True)
    subprocess.run(['systemctl', 'enable', '--now', 'newfind-external-events.timer'], check=True, capture_output=True)
    print('PASS external event sync timer enabled', flush=True)


if __name__ == '__main__':
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-config', action='store_true')
    parser.add_argument('--install-timer', action='store_true')
    parser.add_argument('--city', help='Optional city name; requires --country')
    parser.add_argument('--country', help='Two-letter country code')
    args = parser.parse_args()
    key = configured_key()
    if args.check_config:
        print('TICKETMASTER_API_KEY: ' + ('configured' if key else 'missing'))
        raise SystemExit(0 if key else 2)
    if not key:
        raise SystemExit('Ticketmaster API key is missing; no import or schedule was activated')
    if bool(args.city) != bool(args.country):
        raise SystemExit('--city and --country must be supplied together')
    try:
        summary = run_sync(key, [(args.city, args.country.upper())] if args.city else DEFAULT_CITIES)
        if args.install_timer:
            if args.city or not summary['imported']:
                raise RuntimeError('Verify a successful default-city import before installing its timer')
            install_timer()
    except (RuntimeError, subprocess.SubprocessError, ValueError) as error:
        raise SystemExit(str(error) if isinstance(error, RuntimeError) else 'External sync operation failed')
