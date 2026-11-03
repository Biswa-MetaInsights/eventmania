"""Operational safeguards; real restic encryption is exercised only on synthetic data."""
from datetime import datetime,timedelta,timezone
import hashlib
import json
import os
from pathlib import Path
import secrets
import sys
from unittest.mock import patch
import pytest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import operations_config as config
import operations_alerts as alerts
import offsite_backup as remote
import mail_readiness as mail


def test_secret_config_is_private_and_allowlisted(tmp_path,monkeypatch):
    source=tmp_path/'env';source.write_text("SMTP_HOST='smtp.example.org'\nJWT_SECRET=never-export\nRESTIC_REPOSITORY=s3:https://store.example.org/bucket/newfind\n");source.chmod(0o600)
    monkeypatch.delenv('SMTP_HOST',raising=False)
    monkeypatch.delenv('JWT_SECRET',raising=False)
    config.load(source)
    assert os.environ['SMTP_HOST']=='smtp.example.org'
    assert 'JWT_SECRET' not in os.environ
    source.chmod(0o644)
    with pytest.raises(RuntimeError):config.load(source)
    source.chmod(0o600)
    alias=tmp_path/'alias';alias.symlink_to(source)
    with pytest.raises(RuntimeError):config.private_file(alias)


def test_alerts_retry_failed_channel_suppress_duplicates_and_recover(tmp_path,monkeypatch):
    monkeypatch.setenv('ALERT_WEBHOOK_URL','https://alerts.example.org/hook')
    monkeypatch.setenv('ALERT_EMAIL_TO','operator@example.org')
    state=tmp_path/'state.json';posted=[];mailed=[]
    def fail(report):raise OSError('private-credential-must-not-be-logged')
    now=datetime.now(timezone.utc)
    first=alerts.deliver(['gateway: unhealthy'],state,now,fail,lambda *a:mailed.append(a))
    assert first['errors']==['webhook delivery failed'] and len(mailed)==1
    second=alerts.deliver(['gateway: unhealthy'],state,now+timedelta(minutes=1),lambda r:posted.append(r),lambda *a:mailed.append(a))
    assert not second['errors'] and len(posted)==1 and len(mailed)==1
    alerts.deliver(['gateway: unhealthy'],state,now+timedelta(minutes=2),lambda r:posted.append(r),lambda *a:mailed.append(a))
    assert len(posted)==1 and len(mailed)==1
    alerts.deliver([],state,now+timedelta(minutes=3),lambda r:posted.append(r),lambda *a:mailed.append(a))
    assert posted[-1]['status']=='recovered' and len(mailed)==2
    assert 'private-credential' not in state.read_text()
    assert state.stat().st_mode&0o077==0


def test_webhook_rejects_plaintext_and_does_not_follow_redirects(monkeypatch):
    monkeypatch.setenv('ALERT_WEBHOOK_URL','http://example.org')
    with pytest.raises(RuntimeError):alerts.webhook({})
    assert alerts.NoRedirect().redirect_request(None,None,307,'',{},'https://other.example.org') is None


def test_smtp_readiness_never_sends_and_redacts_failure(monkeypatch):
    for key in ('SMTP_HOST','SMTP_USERNAME','SMTP_PASSWORD','SMTP_FROM'):monkeypatch.delenv(key,raising=False)
    assert mail.check()['ready'] is False
    for key,value in {'SMTP_HOST':'smtp.example.org','SMTP_USERNAME':'sender','SMTP_PASSWORD':'synthetic-secret','SMTP_FROM':'newfind@example.org','SMTP_PORT':'587'}.items():monkeypatch.setenv(key,value)
    with patch.object(mail.smtplib,'SMTP') as smtp:
        result=mail.check();connection=smtp.return_value.__enter__.return_value
        assert result['ready']
        connection.starttls.assert_called_once();connection.login.assert_called_once_with('sender','synthetic-secret')
        connection.send_message.assert_not_called()
    with patch.object(mail.smtplib,'SMTP',side_effect=OSError('synthetic-secret')):
        assert 'synthetic-secret' not in json.dumps(mail.check())


def test_real_encrypted_backup_restore_and_wrong_password(tmp_path,monkeypatch):
    binary=os.getenv('NEWFIND_TEST_RESTIC')
    if not binary:pytest.skip('Set NEWFIND_TEST_RESTIC to a verified official restic executable')
    source=tmp_path/'snapshot';source.mkdir()
    manifest={'created_at':datetime.now(timezone.utc).isoformat(),'databases':{}}
    sentinel=b'SYNTHETIC PRIVATE NEWFIND CONTENT '+secrets.token_bytes(32)
    for database in remote.DATABASES:
        data=sentinel+database.encode();(source/(database+'.dump')).write_bytes(data)
        manifest['databases'][database]={'sha256':hashlib.sha256(data).hexdigest(),'rows':{'synthetic':1}}
    (source/'manifest.json').write_text(json.dumps(manifest))
    password=tmp_path/'password';password.write_text(secrets.token_urlsafe(48));password.chmod(0o600)
    repository=tmp_path/'encrypted'
    monkeypatch.setenv('RESTIC_REPOSITORY',str(repository));monkeypatch.setenv('RESTIC_PASSWORD_FILE',str(password))
    monkeypatch.setenv('SMTP_PASSWORD','do-not-forward');monkeypatch.setenv('JWT_SECRET','do-not-forward')
    with pytest.raises(RuntimeError):remote.configuration()  # local cannot masquerade as off-server
    env=remote.configuration(local_test=True)
    assert 'SMTP_PASSWORD' not in env and 'JWT_SECRET' not in env
    remote.run(['init'],env,binary)
    result=remote.upload(source,env,binary,state_path=tmp_path/'remote-state.json')
    assert result['snapshot_id'] and result['database_restore_verified'] is False
    assert not any(sentinel in p.read_bytes() for p in repository.rglob('*') if p.is_file())
    wrong=tmp_path/'wrong';wrong.write_text(secrets.token_urlsafe(48));wrong.chmod(0o600)
    with pytest.raises(RuntimeError):remote.run(['snapshots'],{**env,'RESTIC_PASSWORD_FILE':str(wrong)},binary)
    (source/'event_db.dump').write_bytes(b'corrupt')
    with pytest.raises(RuntimeError):remote.upload(source,env,binary,state_path=tmp_path/'remote-state.json')


def test_production_mail_suppresses_reserved_qa_addresses(monkeypatch):
    sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
    from backend.shared.mail import deliverable,send
    monkeypatch.setenv('SMTP_HOST','smtp.production.example')
    monkeypatch.setenv('SMTP_LOCAL_TEST','true')  # cannot enable test delivery to a public server
    assert not deliverable('synthetic@example.org')
    assert not deliverable('synthetic@host.invalid')
    with pytest.raises(ValueError):send('synthetic@example.org','test','no outbound delivery')
    monkeypatch.setenv('SMTP_HOST','127.0.0.1')
    assert deliverable('synthetic@example.org')


def test_monitor_still_alerts_when_docker_and_api_are_unavailable(tmp_path,monkeypatch):
    import monitor_core as monitor
    import subprocess
    monkeypatch.setattr(monitor,'ROOT',tmp_path)
    monkeypatch.delenv('SMTP_HOST',raising=False);monkeypatch.delenv('RESTIC_REPOSITORY',raising=False)
    folder=tmp_path/'.backups'/'snapshot';folder.mkdir(parents=True);(folder/'manifest.json').write_text('{}')
    sent=[]
    monkeypatch.setattr(monitor.subprocess,'run',lambda *a,**k: (_ for _ in ()).throw(subprocess.TimeoutExpired('docker',3)))
    monkeypatch.setattr(monitor.urllib.request,'urlopen',lambda *a,**k: (_ for _ in ()).throw(OSError('unavailable')))
    monkeypatch.setattr(monitor,'deliver',lambda issues: sent.append(issues) or {'configured':True,'delivered':True,'errors':[]})
    assert monitor.check()==1
    assert len(sent)==1 and len(sent[0])==8
