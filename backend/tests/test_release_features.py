"""Release checks on isolated services; no production users or real mail providers."""
import base64
from email import message_from_string
from email.policy import default
from io import BytesIO
import re
import secrets
import socketserver
import threading
import time
from PIL import Image
import pytest
from test_core_integration import core

class Mailbox(socketserver.StreamRequestHandler):
    messages=[]
    def handle(self):
        self.wfile.write(b'220 QA mailbox\r\n')
        while True:
            line=self.rfile.readline()
            if not line: break
            command=line.split(b' ',1)[0].strip().upper()
            if command in (b'EHLO',b'HELO'): self.wfile.write(b'250 localhost\r\n')
            elif command==b'DATA':
                self.wfile.write(b'354 End with dot\r\n'); body=[]
                while True:
                    line=self.rfile.readline()
                    if line in (b'.\r\n',b''): break
                    body.append(line)
                self.messages.append(b''.join(body).decode());self.wfile.write(b'250 Accepted\r\n')
            elif command==b'QUIT': self.wfile.write(b'221 Bye\r\n');break
            else: self.wfile.write(b'250 OK\r\n')

@pytest.fixture(scope='module', autouse=True)
def mail_env():
    server=socketserver.ThreadingTCPServer(('127.0.0.1',0),Mailbox)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    from unittest.mock import patch
    with patch.dict('os.environ',{'SMTP_HOST':'127.0.0.1','SMTP_PORT':str(server.server_address[1]),'SMTP_FROM':'qa@example.org','SMTP_LOCAL_TEST':'true','APP_PUBLIC_URL':'https://newfind.example'}):
        yield
    server.shutdown();server.server_close()


def account(client,name):
    email=f'{name.replace(" ","-")}-{secrets.token_hex(4)}@example.org';password=secrets.token_urlsafe(20)
    r=client.post('/auth/register',json={'email':email,'password':password,'full_name':name});assert r.status_code==201,r.text
    token=client.post('/auth/login',json={'email':email.upper(),'password':password});assert token.status_code==200,token.text
    headers={'Authorization':'Bearer '+token.json()['access_token']}
    return r.json()['user_id'],headers,email,password


def test_persistent_images_communities_and_recovery(mail_env,core):
    client,restart=core
    owner,oh,email,password=account(client,'Release owner')
    member,mh,_,_=account(client,'Release member')
    stranger,sh,_,_=account(client,'Release stranger')
    output=BytesIO();Image.new('RGB',(64,64),'green').save(output,format='PNG')
    image='data:image/png;base64,'+base64.b64encode(output.getvalue()).decode()
    r=client.post(f'/user/{owner}/assets',headers=oh,json={'kind':'avatar','data_url':image});assert r.status_code==201,r.text
    avatar=r.json()['url'].removeprefix('/api')
    assert client.get(avatar).status_code==401
    assert client.get(avatar,headers=mh).status_code==404
    assert client.get(avatar,headers=oh).headers['content-type']=='image/jpeg'
    assert client.post(f'/user/{owner}/assets',headers=mh,json={'kind':'event','data_url':image}).status_code==403
    assert client.post(f'/user/{owner}/assets',headers=oh,json={'kind':'event','data_url':'data:image/png;base64,invalid'}).status_code==422
    cover=client.post(f'/user/{owner}/assets',headers=oh,json={'kind':'event','data_url':image}).json()['url'].removeprefix('/api')
    assert client.get(cover).status_code==200
    restart('user');assert client.get(avatar,headers=oh).status_code==200
    profile={'full_name':'QA organizer','company_name':'QA Team','company_address':'QA','company_email':email,'contact_email':email,'country':'Belgium','registration_number':'QA','bank_name':'TEST','bank_account_number':'TEST'}
    r=client.post(f'/user/{owner}/organizer',headers=oh,json=profile);assert r.status_code==201,r.text
    r=client.post('/community/',headers=oh,json={'name':'Professional QA community','description':'Persistent community'});assert r.status_code==201,r.text
    group=r.json();gid=group['id'];assert group['member_count']==1
    assert client.get('/community/'+group['slug']).json()['id']==gid
    assert client.patch('/community/'+gid,headers=mh,json={'name':'Hijack'}).status_code==403
    assert client.post(f'/community/{gid}/reviews',headers=sh,json={'rating':5,'comment':'Unjoined review'}).status_code==403
    assert client.post(f'/community/{gid}/members',headers=mh).json()['member_count']==2
    assert client.post(f'/community/{gid}/members',headers=mh).json()['member_count']==2
    assert client.post(f'/community/{gid}/reviews',headers=mh,json={'rating':4,'comment':'Useful and well organised.'}).status_code==201
    assert client.post(f'/community/{gid}/reviews',headers=mh,json={'rating':5,'comment':'Duplicate review.'}).status_code==409
    restart('user');assert client.get(f'/community/{gid}/members/me',headers=mh).json()['joined']
    reviews=client.get(f'/community/{gid}/reviews').json();assert reviews['count']==1 and reviews['average_rating']==4
    assert client.delete(f'/community/{gid}/members',headers=oh).status_code==409
    assert client.delete(f'/community/{gid}/members',headers=mh).json()['joined'] is False
    assert client.post(f'/community/{gid}/members',headers=mh).status_code==200
    event={'organizer_id':owner,'title':'Community launch release QA','description':'Real event content','community_id':gid,'category':'Music','location':{'latitude':50.85,'longitude':4.35},'start_date':'2031-01-01T10:00:00Z','end_date':'2031-01-01T12:00:00Z','timezone':'Europe/Brussels','status':'published','capacity':10,'price':0,'currency':'EUR'}
    created=client.post('/event',headers=oh,json=event);assert created.status_code==201,created.text
    event_id=created.json()['id'];assert created.json()['start_date'].endswith('Z')
    notices=client.get('/event/notifications',headers=mh).json();assert any(n['kind']=='community_event' for n in notices['items'])
    assert client.patch(f'/user/{member}',headers=mh,json={'interests':['Music']}).status_code==200
    recommendations=client.get('/event/recommendations',headers=mh,params={'lat':50.85,'lng':4.35})
    assert recommendations.status_code==200,recommendations.text
    assert recommendations.json()[0]['id']==event_id
    assert recommendations.json()[0]['recommendation_reason']=='Matches your saved interests'
    assert client.get('/event/recommendations',params={'lat':50.85,'lng':4.35}).status_code==401
    assert client.post(f'/event/{event_id}/announcements',headers=oh,json={'title':'Doors open','body':'Please arrive ten minutes early.'}).status_code==201
    assert client.get('/auth/capabilities').json()['email_recovery'] is True
    assert client.post('/auth/request-verification',headers=oh).status_code==202
    for _ in range(50):
        if Mailbox.messages: break
        time.sleep(.1)
    verify=re.search(r'#token=([A-Za-z0-9_-]+)',message_from_string(Mailbox.messages[-1],policy=default).get_content()).group(1)
    assert client.post('/auth/verify-email',json={'token':verify}).status_code==200
    assert client.post('/auth/verify-email',json={'token':verify}).status_code==400
    assert client.post('/auth/forgot-password',json={'email':email}).status_code==202
    for _ in range(50):
        if len(Mailbox.messages)>=2: break
        time.sleep(.1)
    reset=re.search(r'#token=([A-Za-z0-9_-]+)',message_from_string(Mailbox.messages[-1],policy=default).get_content()).group(1)
    count=len(Mailbox.messages)
    assert client.post('/auth/forgot-password',json={'email':'nobody-qa@example.org'}).status_code==202
    assert len(Mailbox.messages)==count
    replacement=secrets.token_urlsafe(20)
    assert client.post('/auth/reset-password',json={'token':reset,'password':replacement}).status_code==200
    assert client.post('/auth/reset-password',json={'token':reset,'password':replacement}).status_code==400
    assert client.get('/auth/me',headers=oh).status_code==401
    assert client.get(f'/user/{owner}',headers=oh).status_code==401
    assert client.post('/auth/login',json={'email':email,'password':password}).status_code==401
    restart('auth')
    assert client.post('/auth/login',json={'email':email,'password':replacement}).status_code==200
