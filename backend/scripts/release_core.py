"""Guarded in-place NewFind release. Never touches other Compose projects.

Run from the reviewed checkout on the host. Creates rollback image tags, records
existing application container starts, backs up all core DBs, validates Compose,
builds one service at a time, then rolls out only the five API services.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[2]
SERVICES=('user','auth','event','ticketing','gateway')
COMPOSE=['docker','compose','-p','newfind']

def run(args, **kwargs):
    return subprocess.run(args,stdin=subprocess.DEVNULL,check=True,timeout=900,**kwargs)

def output(args):
    return subprocess.check_output(args,stdin=subprocess.DEVNULL,timeout=60).decode().strip()

def main():
    os.chdir(ROOT);os.umask(0o077)
    available=int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))
    if available<1500000:raise RuntimeError('Less than 1.5 GB available; release deferred')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    state=ROOT/'.releases'/stamp;state.mkdir(parents=True,mode=0o700)
    run(COMPOSE+['config','--quiet'])
    watched=['talktofile-backend-1','talktofile-web-1']
    starts={name:output(['docker','inspect','-f','{{.State.StartedAt}}',name]) for name in watched}
    images={}
    for service in SERVICES:
        name='newfind-'+service+'-1'
        image=output(['docker','inspect','-f','{{.Image}}',name])
        tag='newfind-'+service+':rollback-'+stamp
        run(['docker','tag',image,tag]);images[service]=tag
    (state/'rollback.json').write_text(json.dumps({'images':images,'starts':starts,'commit':output(['git','rev-parse','HEAD'])}))
    rollback=['services:']
    for service,tag in images.items():rollback += ['  '+service+':','    image: '+tag]
    (state/'rollback.yaml').write_text('\n'.join(rollback)+'\n')
    run([sys.executable,'backend/scripts/database_backup.py'])
    run([sys.executable,'backend/scripts/database_backup.py','--verify-latest'])
    for service in SERVICES:
        run(COMPOSE+['build',service])
    # Import/schema checks happen on the private network before replacing live APIs.
    for service in ('user','auth','event','ticketing'):
        extra={'user':'import PIL, email_validator;','auth':'import bcrypt, email_validator;','event':'import openai;','ticketing':'import qrcode, qrcode.image.svg;'}[service]
        run(COMPOSE+['run','--rm','--no-deps',service,'python','-c',extra+' import main; print("PASS schema/startup preflight")'])
    run(COMPOSE+['up','-d','--no-deps','--wait','--wait-timeout','180',*SERVICES])
    for name,start in starts.items():
        if output(['docker','inspect','-f','{{.State.StartedAt}}',name])!=start:
            raise RuntimeError('Existing application container start changed; investigate immediately')
    print('PASS NewFind APIs healthy; existing application start times unchanged',flush=True)
    print('Rollback manifest: '+str(state),flush=True)

if __name__=='__main__':main()
