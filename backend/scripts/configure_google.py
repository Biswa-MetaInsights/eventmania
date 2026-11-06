"""Collect Google credentials privately on the host; never echo or accept secrets as CLI args."""
import getpass
import os
from pathlib import Path
import re
import shutil
import tempfile
from datetime import datetime, timezone
from operations_config import ROOT, private_file

ORIGIN = 'https://newfind-khaki.vercel.app'


def save(client_id, secret, root=ROOT):
    if not re.fullmatch(r'[A-Za-z0-9_-]{10,200}\.apps\.googleusercontent\.com', client_id):
        raise ValueError('Use the Web application OAuth Client ID, ending in .apps.googleusercontent.com')
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,256}', secret):
        raise ValueError('The client secret has an unexpected format; nothing was changed')
    root = Path(root)
    env = private_file(root / '.env')
    lines = env.read_text().splitlines()
    configured = [line.split('=', 1)[1].strip().strip('\"\'') for line in lines if line.startswith('APP_PUBLIC_URL=')]
    if configured and any(value.rstrip('/') != ORIGIN for value in configured):
        raise ValueError('The application origin differs; review the deployment before changing credentials')
    directory = root / '.releases' / ('google-config-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    directory.mkdir(mode=0o700, parents=True)
    backup = directory / 'env.before'
    shutil.copyfile(env, backup)
    backup.chmod(0o600)
    kept = [line for line in lines if not line.startswith(('GOOGLE_CLIENT_ID=', 'GOOGLE_CLIENT_SECRET=', 'APP_PUBLIC_URL='))]
    values = {'APP_PUBLIC_URL': ORIGIN, 'GOOGLE_CLIENT_ID': client_id, 'GOOGLE_CLIENT_SECRET': secret}
    content = '\n'.join(kept + [key + '=' + value for key, value in values.items()]) + '\n'
    descriptor, temporary = tempfile.mkstemp(prefix='.env.google-', dir=root)
    try:
        with os.fdopen(descriptor, 'w') as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, env)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)
    return backup


def main():
    os.umask(0o077)
    print('Use a Web application OAuth client from the NewFind Google Cloud project.')
    print('Authorized JavaScript origin: ' + ORIGIN)
    print('Authorized redirect URI: ' + ORIGIN + '/auth/google/callback')
    client_id = input('Google Client ID: ').strip()
    secret = getpass.getpass('Google Client Secret (hidden): ').strip()
    backup = save(client_id, secret)
    print('Google credentials saved privately. Rollback configuration: ' + str(backup))
    print('No services were restarted. A real Google sign-in must still be verified.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        print('Configuration not completed: ' + str(error))
        raise SystemExit(1)
