"""Large isolated catalogue: correct geo paging without per-catalogue inventory fanout."""
import json
import secrets
import sqlite3
import time
from uuid import uuid4
from test_core_integration import core


def test_ten_thousand_listing_geo_pages(core):
    client,_=core
    email='scale-'+uuid4().hex[:8]+'@example.org';password=secrets.token_urlsafe(24)
    owner=client.post('/auth/register',json={'email':email,'password':password,'full_name':'Synthetic scale owner'}).json()['user_id']
    headers={'Authorization':'Bearer '+client.post('/auth/login',json={'email':email,'password':password}).json()['access_token']}
    profile={'full_name':'Synthetic scale owner','company_name':'QA','company_address':'QA','company_email':email,'contact_email':email,'country':'Belgium','registration_number':'QA','bank_name':'TEST','bank_account_number':'TEST'}
    assert client.post(f'/user/{owner}/organizer',headers=headers,json=profile).status_code==201
    event={'organizer_id':owner,'title':'Scale catalogue seed','start_date':'2031-04-01T10:00:00Z','end_date':'2031-04-01T12:00:00Z','status':'published','price':0,'capacity':100,'currency':'EUR','location':{'latitude':50.88,'longitude':4.7}}
    response=client.post('/event',headers=headers,json=event);assert response.status_code==201,response.text
    seed=response.json()['id'].replace('-','')
    with sqlite3.connect(client.qa_database_root/'event.db') as db:
        columns=[r[1] for r in db.execute('PRAGMA table_info(events)')]
        source=db.execute('SELECT * FROM events WHERE id=?',(seed,)).fetchone()
        rows=[]
        for index in range(10000):
            row=list(source)
            row[columns.index('id')]=uuid4().hex
            row[columns.index('slug')]='scale-'+str(index)
            row[columns.index('title')]='Scale listing '+str(index).zfill(5)
            row[columns.index('location')]=json.dumps({'latitude':50.88,'longitude':4.7} if index%2==0 else {'latitude':52.52,'longitude':13.4})
            rows.append(row)
        db.executemany('INSERT INTO events VALUES ('+','.join('?' for _ in columns)+')',rows)
    logs=client.qa_database_root/'ticketing.log'
    before=logs.read_text().count('GET /tickets/counts?')
    durations=[];pages=[]
    for offset in (0,25,50):
        started=time.monotonic()
        response=client.get('/event/search',params={'q':'Scale listing','lat':50.88,'lng':4.7,'radius':200,'offset':offset,'limit':25,'sort':'distance'})
        durations.append(time.monotonic()-started)
        assert response.status_code==200,response.text
        items=response.json();assert len(items)==25
        assert all(e['location']['longitude']==4.7 for e in items)
        pages.append({e['id'] for e in items})
    assert len(set.union(*pages))==75
    assert logs.read_text().count('GET /tickets/counts?')-before==3
    assert max(durations)<8, 'Isolated paged geographic search exceeded the 8-second regression ceiling'
    print('Isolated 10k-catalogue page seconds:',[round(d,3) for d in durations])
