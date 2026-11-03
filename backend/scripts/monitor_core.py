"""Read-only NewFind health and backup-age checks; local journal, no external telemetry."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import urllib.request
ROOT=Path(__file__).resolve().parents[2]

def check():
    failures=[]
    for service in ('gateway','auth','user','event','ticketing','postgres','redis'):
        result=subprocess.run(['docker','inspect','-f','{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}','newfind-'+service+'-1'],capture_output=True,text=True,timeout=15)
        if result.returncode or result.stdout.strip()!='running healthy':failures.append(service+': unhealthy')
    try:
        with urllib.request.urlopen('http://127.0.0.1:18000/',timeout=5) as response:
            if response.status!=200:failures.append('API probe failed')
    except OSError:failures.append('API probe failed')
    snapshots=sorted((ROOT/'.backups').glob('*/manifest.json'))
    if not snapshots or (datetime.now(timezone.utc)-datetime.fromtimestamp(snapshots[-1].stat().st_mtime,timezone.utc)).total_seconds()>36*3600:failures.append('Backup is missing or older than 36 hours')
    print(json.dumps({'checked_at':datetime.now(timezone.utc).isoformat(),'status':'fail' if failures else 'pass','issues':failures}),flush=True)
    return 1 if failures else 0

def install():
    if os.geteuid()!=0:raise RuntimeError('Root required to install the NewFind timer')
    for suffix,body in {
      'service':f'[Unit]\nDescription=Check NewFind health and backup freshness\nAfter=docker.service\n[Service]\nType=oneshot\nWorkingDirectory={ROOT}\nExecStart=/usr/bin/python3 {Path(__file__).resolve()}\nUMask=0077\n',
      'timer':'[Unit]\nDescription=Monitor NewFind every five minutes\n[Timer]\nOnBootSec=2min\nOnUnitActiveSec=5min\n[Install]\nWantedBy=timers.target\n'}.items():
        path=Path('/etc/systemd/system/newfind-health.'+suffix)
        if path.exists() and path.read_text()!=body:raise RuntimeError('Refusing to overwrite an existing unrelated unit')
        path.write_text(body)
    subprocess.run(['systemctl','daemon-reload'],check=True)
    subprocess.run(['systemctl','enable','--now','newfind-health.timer'],check=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--install',action='store_true');args=parser.parse_args()
    if args.install:install()
    raise SystemExit(check())
