"""Live, labelled free-event QA. Standard library only; no real payments or emails.

State file is private and contains test credentials. --verify checks persistent
records after the operator has restarted only the relevant NewFind APIs.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import secrets
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from uuid import uuid4
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:18000');parser.add_argument('--state',type=Path,default=Path('.qa-professional.json'));parser.add_argument('--verify',action='store_true');args=parser.parse_args()

def api(method,path,body=None,token=None,expected=200):
    path=path.rstrip('/') if path!='/' else path
    request=Request(args.base.rstrip('/')+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},method=method)
    try:response=urlopen(request,timeout=30)
    except HTTPError as error:response=error
    with response:
        raw=response.read()
        if response.status!=expected:raise RuntimeError(f'{method} {path.split("?")[0]}: HTTP {response.status}, expected {expected}')
        try:return json.loads(raw)
        except ValueError:return raw

def login(account):return api('POST','/auth/login',{'email':account['email'],'password':account['password']})['access_token']
def account(label):
    data={'email':f'newfind-qa-{label}-{uuid4().hex[:10]}@example.org','password':secrets.token_urlsafe(24),'full_name':'SYNTHETIC QA '+label}
    data['id']=api('POST','/auth/register',data,expected=201)['user_id'];data['token']=login(data);return data

def verify(state):
    owner,guest=state['owner'],state['guest'];oh,gh=login(owner),login(guest);eid=state['event']
    assert api('GET','/user/'+guest['id'],token=gh)['bio']=='Professional QA persistence'
    assert any(t['id']==state['ticket'] and t['checked_in_at'] for t in api('GET','/ticket/user/'+guest['id'],token=gh))
    assert len(api('GET',f'/event/{eid}/messages',token=gh))==2
    assert api('GET',f"/community/{state['community']}/members/me",token=gh)['joined']
    assert api('GET',f"/community/{state['community']}/reviews")['count']==1
    assert any(n['kind']=='rescheduled' for n in api('GET','/event/notifications',token=gh)['items'])
    assert api('GET',f'/event/{eid}')['agenda'][0]['title']=='Welcome'
    print('PASS persisted profile, booking/check-in, content, chat, membership, review and notification',flush=True)

if args.verify:
    verify(json.loads(args.state.read_text()))
else:
    owner,guest,outsider=account('organizer'),account('attendee'),account('outsider');oh,gh,sh=owner['token'],guest['token'],outsider['token']
    api('POST',f"/user/{owner['id']}/organizer",{'full_name':'Synthetic QA','company_name':'SYNTHETIC QA ONLY','company_address':'QA ONLY','company_email':owner['email'],'contact_email':owner['email'],'country':'Belgium','registration_number':'TEST ONLY','bank_name':'TEST ONLY','bank_account_number':'TEST ONLY'},oh,201)
    api('PATCH','/user/'+guest['id'],{'bio':'Professional QA persistence','interests':['Music']},gh)
    api('GET','/user/'+owner['id'],token=gh,expected=403)
    group=api('POST','/community/',{'name':'SYNTHETIC QA community '+uuid4().hex[:6],'description':'Automated test fixture, not an actual event organization.'},oh,201)
    gid=group['id'];api('POST',f'/community/{gid}/members',{},gh);api('POST',f'/community/{gid}/members',{},gh)
    api('POST',f'/community/{gid}/reviews',{'rating':4,'comment':'Synthetic QA verification only.'},gh,201)
    start=datetime.now(timezone.utc)+timedelta(days=35);end=start+timedelta(hours=2)
    event={'organizer_id':owner['id'],'title':'SYNTHETIC QA event '+uuid4().hex[:6],'description':'Automated free-event test fixture. Not a real public event.','community_id':gid,'start_date':start.isoformat(),'end_date':end.isoformat(),'capacity':5,'price':0,'currency':'EUR','timezone':'Europe/Brussels','category':'Music','status':'published','agenda':[{'id':'welcome','title':'Welcome','time':'10:00'}],'location':{'latitude':50.85,'longitude':4.35,'name':'QA Brussels'}}
    created=api('POST','/event',event,oh,201);eid=created['id'];assert created['start_date'].endswith('Z')
    matches=api('GET','/event/search?'+urlencode({'lat':50.85,'lng':5.69,'radius':200,'q':event['title']}));assert any(e['id']==eid for e in matches)
    assert not api('GET','/event/search?'+urlencode({'lat':52.52,'lng':13.4,'radius':200,'q':event['title']}))
    api('GET','/event/search?price_min=10',expected=422)
    booking={'event_id':eid,'user_id':guest['id'],'quantity':1,'request_id':str(uuid4())}
    ticket=api('POST','/ticket/book',booking,gh,201)[0];assert api('POST','/ticket/book',booking,gh,201)[0]['id']==ticket['id']
    api('GET',f'/ticket/organizer/{owner["id"]}/attendees',token=sh,expected=403)
    assert any(a['id']==ticket['id'] for a in api('GET',f'/ticket/organizer/{owner["id"]}/attendees',token=oh))
    api('POST',f'/event/{eid}/messages',{'content':'Synthetic attendee QA message','request_id':str(uuid4())},gh,201)
    api('POST',f'/event/{eid}/messages',{'content':'Synthetic organizer QA answer','request_id':str(uuid4())},oh,201)
    api('GET',f'/event/{eid}/messages',token=sh,expected=403)
    api('POST',f'/ticket/check-in/{eid}',{'qr_code_hash':ticket['qr_code_hash']},oh)
    assert api('POST',f'/ticket/check-in/{eid}',{'qr_code_hash':ticket['qr_code_hash']},oh)['already_checked_in']
    assert b'<svg' in api('GET','/ticket/qr/'+ticket['id'],token=gh)
    api('GET','/ticket/qr/'+ticket['id'],token=sh,expected=404)
    api('PATCH',f'/event/{eid}',{'status':'registration_closed'},oh)
    api('POST','/ticket/book',{**booking,'request_id':str(uuid4())},gh,409)
    api('PATCH',f'/event/{eid}',{'start_date':(start+timedelta(days=1)).isoformat(),'end_date':(end+timedelta(days=1)).isoformat(),'visibility':'unlisted'},oh)
    state={'owner':owner,'guest':guest,'event':eid,'ticket':ticket['id'],'community':gid}
    args.state.write_text(json.dumps(state));os.chmod(args.state,0o600)
    verify(state)
    print('PASS PostgreSQL event operations, cross-border discovery, currency guard, private QR and access control',flush=True)
