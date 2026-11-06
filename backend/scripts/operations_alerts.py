"""Sanitised, rate-limited operational alerts; no URL or credential is logged."""
from datetime import datetime,timezone
import hashlib
import json
import os
import ssl
from urllib.parse import urlsplit
import urllib.request
from operations_config import ROOT,write_state


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None


def webhook(report,context=None):
    url=os.getenv('ALERT_WEBHOOK_URL','')
    parts=urlsplit(url)
    if parts.scheme!='https' or not parts.hostname or parts.username or parts.password:
        raise RuntimeError('An approved HTTPS alert endpoint is required')
    headers={'Content-Type':'application/json'}
    if os.getenv('ALERT_WEBHOOK_TOKEN'):headers['Authorization']='Bearer '+os.environ['ALERT_WEBHOOK_TOKEN']
    opener=urllib.request.build_opener(NoRedirect(),urllib.request.HTTPSHandler(context=context or ssl.create_default_context()))
    request=urllib.request.Request(url,data=json.dumps(report).encode(),headers=headers,method='POST')
    with opener.open(request,timeout=10) as response:
        if not 200<=response.status<300:raise RuntimeError('Alert delivery failed')


def deliver(issues,state_path=None,now=None,webhook_sender=webhook,mail_sender=None):
    """Return delivery state; retry failed channels without duplicating successful ones."""
    path=state_path or ROOT/'.ops-state'/'alerts.json'
    now=now or datetime.now(timezone.utc)
    try:state=json.loads(path.read_text())
    except (FileNotFoundError,ValueError):state={'channels':{}}
    issues=sorted(set(issues))
    fingerprint=hashlib.sha256(json.dumps(issues).encode()).hexdigest()
    channels=state.get('channels',{})
    configured=[]
    if os.getenv('ALERT_WEBHOOK_URL'):configured.append('webhook')
    if os.getenv('ALERT_EMAIL_TO'):configured.append('email')
    if not issues and not any(v.get('failed') for v in channels.values()):
        return {'configured':bool(configured),'delivered':False,'errors':[]}
    report={'application':'NewFind','status':'failure' if issues else 'recovered','issues':issues,'checked_at':now.isoformat()}
    errors=[];delivered=False
    for channel in configured:
        previous=channels.get(channel,{})
        if not issues and not previous.get('failed'):continue
        try:last=datetime.fromisoformat(previous['sent_at'])
        except (KeyError,ValueError):last=None
        if previous.get('fingerprint')==fingerprint and last and (now-last).total_seconds()<1800:continue
        try:
            if channel=='webhook':webhook_sender(report)
            else:
                if mail_sender is None:
                    import sys
                    sys.path.insert(0,str(ROOT))
                    from backend.shared.mail import send
                    sender=send
                else:sender=mail_sender
                sender(os.environ['ALERT_EMAIL_TO'],'NewFind operations: '+report['status'],json.dumps(report,indent=2))
            channels[channel]={'fingerprint':fingerprint,'sent_at':now.isoformat(),'failed':bool(issues)}
            delivered=True
        except Exception:
            errors.append(channel+' delivery failed')
    write_state(path,{'channels':channels})
    return {'configured':bool(configured),'delivered':delivered,'errors':errors}


if __name__=='__main__':
    import argparse
    from operations_config import load
    load();parser=argparse.ArgumentParser();parser.add_argument('--test',action='store_true',required=True);parser.parse_args()
    report={'application':'NewFind','status':'test','issues':[],'checked_at':datetime.now(timezone.utc).isoformat()}
    try:
        configured=False
        if os.getenv('ALERT_WEBHOOK_URL'):webhook(report);configured=True
        if os.getenv('ALERT_EMAIL_TO'):
            import sys
            sys.path.insert(0,str(ROOT))
            from backend.shared.mail import send
            send(os.environ['ALERT_EMAIL_TO'],'NewFind operations delivery test','This is a requested delivery test, not a production outage.');configured=True
        if not configured:raise RuntimeError('No approved alert destination configured')
        print('PASS test alert accepted by configured transports; recipient receipt still requires confirmation')
    except Exception:raise SystemExit('FAIL test alert; inspect destination and transport settings privately') from None
