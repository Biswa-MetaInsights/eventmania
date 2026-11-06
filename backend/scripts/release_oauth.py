"""Guarded auth/gateway-only rollout; additive tables preserve old-image rollback."""
import json
import os
from pathlib import Path
import shutil
from datetime import datetime, timezone
from release_core import ROOT, COMPOSE, run, output

SERVICES = ('auth', 'gateway')
WATCHED = ('talktofile-backend-1', 'talktofile-web-1')


def main():
    os.chdir(ROOT)
    os.umask(0o077)
    available = int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))
    if available < 1500000:
        raise RuntimeError('Less than 1.5 GB available; release deferred')
    run(COMPOSE + ['config', '--quiet'])
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    state = ROOT / '.releases' / ('oauth-' + stamp)
    state.mkdir(mode=0o700, parents=True)
    shutil.copyfile(ROOT / '.env', state / 'env.before')
    starts = {name: output(['docker', 'inspect', '-f', '{{.State.StartedAt}}', name]) for name in WATCHED}
    images = {}
    for service in SERVICES:
        image = output(['docker', 'inspect', '-f', '{{.Image}}', 'newfind-' + service + '-1'])
        tag = 'newfind-' + service + ':rollback-oauth-' + stamp
        run(['docker', 'tag', image, tag])
        images[service] = tag
    (state / 'rollback.json').write_text(json.dumps({'images': images, 'starts': starts, 'commit': output(['git', 'rev-parse', 'HEAD'])}))
    (state / 'rollback.yaml').write_text('services:\n' + ''.join('  ' + service + ':\n    image: ' + tag + '\n' for service, tag in images.items()))
    run(['python3', 'backend/scripts/database_backup.py'])
    run(['python3', 'backend/scripts/database_backup.py', '--verify-latest'])
    for service in SERVICES:
        run(COMPOSE + ['build', service])
    run(COMPOSE + ['run', '--rm', '--no-deps', 'auth', 'python', '-c', 'import cryptography, main; print("PASS additive OAuth schema and startup")'])
    run(COMPOSE + ['up', '-d', '--no-deps', '--no-build', '--wait', '--wait-timeout', '180', *SERVICES])
    for name, start in starts.items():
        if output(['docker', 'inspect', '-f', '{{.State.StartedAt}}', name]) != start:
            raise RuntimeError('Existing application start changed; investigate immediately')
    print('PASS NewFind auth/gateway healthy; TalktoFile starts unchanged')
    print('Rollback manifest: ' + str(state))


if __name__ == '__main__':
    main()
