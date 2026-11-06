"""Credential file safety and preservation of the already configured sender."""
import importlib.util
from pathlib import Path
import sys
import pytest

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('configure_google', SCRIPTS / 'configure_google.py')
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)
CLIENT = '1234567890-testclient.apps.googleusercontent.com'
SECRET = 'test-only-provider-secret-no-live-access'


def test_google_config_preserves_mail_and_creates_private_rollback(tmp_path):
    env = tmp_path / '.env'
    before = 'SMTP_HOST=smtp.gmail.com\nSMTP_PASSWORD=test-only-smtp-value\nJWT_SECRET=test-only-signing-value\n'
    env.write_text(before)
    env.chmod(0o600)
    backup = config.save(CLIENT, SECRET, tmp_path)
    assert backup.read_text() == before
    assert env.stat().st_mode & 0o777 == 0o600
    assert backup.stat().st_mode & 0o777 == 0o600
    assert 'SMTP_PASSWORD=test-only-smtp-value' in env.read_text()
    assert env.read_text().count('GOOGLE_CLIENT_ID=') == 1
    config.save(CLIENT, SECRET, tmp_path)
    assert env.read_text().count('GOOGLE_CLIENT_SECRET=') == 1


@pytest.mark.parametrize('client,secret', [('invalid', SECRET), (CLIENT, 'short'), (CLIENT, 'secret\nINJECT=bad-value'), (CLIENT, 'bad value with spaces')])
def test_bad_credentials_do_not_change_environment(tmp_path, client, secret):
    env = tmp_path / '.env'
    env.write_text('SMTP_HOST=smtp.gmail.com\n')
    env.chmod(0o600)
    with pytest.raises(ValueError): config.save(client, secret, tmp_path)
    assert env.read_text() == 'SMTP_HOST=smtp.gmail.com\n'


def test_unsafe_file_permissions_and_wrong_origin_are_rejected(tmp_path):
    env = tmp_path / '.env'
    env.write_text('APP_PUBLIC_URL=https://other.example\n')
    env.chmod(0o644)
    with pytest.raises(RuntimeError): config.save(CLIENT, SECRET, tmp_path)
    env.chmod(0o600)
    with pytest.raises(ValueError): config.save(CLIENT, SECRET, tmp_path)
