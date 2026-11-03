"""Run the real gateway and four services against isolated persistent SQLite DBs.

No production endpoints, accounts, payment providers, Redis or Kafka are used.
PostgreSQL locking, Docker and browser verification require a separate live run.
"""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
from uuid import uuid4

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def core(tmp_path_factory):
    state = tmp_path_factory.mktemp("newfind")
    names = ["user", "event", "ticketing", "auth", "gateway"]
    ports = {}
    for name in names:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            ports[name] = sock.getsockname()[1]
    urls = {name: f"http://127.0.0.1:{port}" for name, port in ports.items()}
    env = dict(os.environ, PYTHONPATH=str(ROOT), JWT_SECRET=secrets.token_hex(32),
               API_RATE_LIMIT="10000/minute", INTERNAL_API_KEY=secrets.token_hex(32), KAFKA_ENABLED="false", DEBUG="false",
               USER_SERVICE_URL=urls["user"], AUTH_SERVICE_URL=urls["auth"], EVENT_SERVICE_URL=urls["event"],
               TICKETING_SERVICE_URL=urls["ticketing"], CORS_ALLOWED_ORIGINS="https://newfind.example")
    env = {key: value for key, value in env.items() if key.lower() not in {"all_proxy", "http_proxy", "https_proxy"}}
    for name, prefix in [("auth", "auth"), ("user", "users"), ("event", "events"),
                         ("ticket", "tickets"), ("ticketing", "tickets")]:
        env[f"BACKEND_{name.upper()}_URL"] = urls["ticketing" if name == "ticket" else name] + "/" + prefix
    env['BACKEND_COMMUNITY_URL'] = urls['user'] + '/users/communities'
    processes, logs = {}, {}

    def start(name):
        folder = ROOT / "backend" / ("gateway" if name == "gateway" else f"services/{name}")
        log = open(state / f"{name}.log", "a")
        logs[name] = log
        child_env = dict(env, DATABASE_URL=f"sqlite:///{state / (name + '.db')}")
        processes[name] = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host",
                                           "127.0.0.1", "--port", str(ports[name])],
                                          cwd=folder, env=child_env, stdout=log, stderr=log)
        for _ in range(100):
            if processes[name].poll() is not None:
                pytest.fail((state / f"{name}.log").read_text())
            try:
                if httpx.get(urls[name], timeout=.3, trust_env=False).status_code == 200:
                    return
            except httpx.HTTPError:
                pass
            time.sleep(.1)
        pytest.fail(f"{name} did not become healthy")

    def restart(name):
        processes[name].terminate()
        processes[name].wait(timeout=10)
        logs[name].close()
        start(name)

    try:
        for name in names:
            start(name)
        with httpx.Client(base_url=urls["gateway"], timeout=10, trust_env=False) as client:
            client.event_internal_url = urls["event"]
            client.internal_api_key = env["INTERNAL_API_KEY"]
            yield client, restart
    finally:
        for process in processes.values():
            process.terminate()
        for process in processes.values():
            process.wait(timeout=10)
        for log in logs.values():
            log.close()


def test_core_user_journeys_and_security(core):
    client, restart = core
    def account(label):
        payload = {"email": f"{label}@example.org", "password": secrets.token_urlsafe(20), "full_name": label}
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 201, response.text
        assert client.post("/auth/register", json=payload).status_code == 400
        response = client.post("/auth/login", json=payload)
        assert response.status_code == 200, response.text
        tokens = response.json()
        headers = {"Authorization": "Bearer " + tokens["access_token"]}
        me = client.get("/auth/me", headers=headers)
        assert me.status_code == 200, me.text
        user_id = me.json()["id"]
        profile = client.get(f"/user/{user_id}", headers=headers)
        assert profile.status_code == 200 and profile.json()["full_name"] == label
        assert client.patch(f"/user/{user_id}", headers=headers, json={"bio":"Persistent QA profile"}).status_code == 200
        assert client.get(f"/user/{user_id}", headers=headers).json()["bio"] == "Persistent QA profile"
        assert client.post("/auth/login", json={"email":payload["email"],"password":"wrongpassword"}).status_code == 401
        assert client.get("/auth/me", headers={"Authorization": "Bearer " + tokens["refresh_token"]}).status_code == 401
        return user_id, headers

    organizer, organizer_headers = account("organizer")
    attendee, attendee_headers = account("attendee")
    assert client.get(f"/user/{organizer}", headers=attendee_headers).status_code == 403
    assert client.get(f"/user/{organizer}").status_code == 401
    assert client.post("/auth/social-login", json={"email":"attendee@example.org", "provider":"google", "provider_id":"untrusted", "id_token":"invalid"}).status_code == 503
    assert client.post("/auth/register", json={"email":"admin@example.org", "password":"longpassword", "full_name":"admin", "role":"admin"}).status_code == 403
    data = {"full_name":"Test Organizer", "company_name":"QA", "company_address":"QA address",
            "company_email":"qa@example.org", "contact_email":"contact@example.org", "country":"Belgium", "registration_number":"TEST",
            "bank_name":"TEST ONLY", "bank_account_number":"TEST ONLY"}
    r = client.post(f"/user/{organizer}/organizer", headers=organizer_headers, json=data)
    assert r.status_code == 201, r.text
    assert r.json()["contact_email"] == "contact@example.org"
    restart("user")
    assert client.get(f"/user/{organizer}/organizer", headers=organizer_headers).json()["contact_email"] == "contact@example.org"
    public = client.get(f"/user/{organizer}/organizer/public")
    assert public.status_code == 200, public.text
    assert public.json() == {"user_id": organizer, "name": "QA", "verification_status": "pending"}
    assert client.get(f"/user/{organizer}/organizer", headers=attendee_headers).status_code == 403
    assert client.post(f"/user/{organizer}/organizer/public", json={}, headers=attendee_headers).status_code == 403
    event = {"organizer_id":organizer, "title":"Integration QA Event", "description":"Automated isolated test",
             "start_date":"2030-12-01T12:00:00", "end_date":"2030-12-01T14:00:00",
             "capacity":2, "price":0, "currency":"EUR", "status":"published"}
    assert client.post("/event/", json=event).status_code == 401
    assert client.post("/event", json=event).status_code == 401
    r = client.post("/event", json=event, headers=organizer_headers)
    assert r.status_code == 201, r.text
    event_id = r.json()["id"]
    assert client.get("/event/search", params={"q":"Integration QA"}).json()[0]["id"] == event_id
    assert client.get(f"/event/{event_id}").status_code == 200
    assert client.patch(f"/event/{event_id}", json={"title":"Hijack"}, headers=attendee_headers).status_code == 403
    assert client.patch(f"/event/{event_id}", json={"title":"Integration QA Updated"}, headers=organizer_headers).status_code == 200
    draft = client.post("/event", json={**event, "title": "Draft lifecycle QA", "status": "draft"}, headers=organizer_headers)
    assert draft.status_code == 201, draft.text
    draft_id = draft.json()["id"]
    params = {"organizer_id": organizer, "status": "draft"}
    assert any(row["id"] == draft_id for row in client.get("/event/search", params=params, headers=organizer_headers).json())
    assert client.get("/event/search", params=params).status_code == 401
    assert client.get("/event/search", params=params, headers=attendee_headers).status_code == 403
    assert client.get(f"/event/{draft_id}").status_code == 401
    assert client.get(f"/event/{draft_id}", headers=organizer_headers).status_code == 200
    assert client.patch(f"/event/{draft_id}", json={"status": "published"}, headers=organizer_headers).status_code == 200
    assert client.get(f"/event/{draft_id}").status_code == 200
    booking = {"event_id":event_id, "user_id":attendee, "quantity":2, "request_id":str(uuid4())}
    r = client.post("/ticket/book", json=booking, headers=attendee_headers)
    assert r.status_code == 201, r.text
    ticket_ids = [t["id"] for t in r.json()]
    assert len(ticket_ids) == 2
    assert client.get(f"/event/{event_id}").json()["tickets_sold"] == 2
    assert next(row for row in client.get("/event/search").json() if row["id"] == event_id)["tickets_sold"] == 2
    assert [t["id"] for t in client.post("/ticket/book", json=booking, headers=attendee_headers).json()] == ticket_ids
    booking["request_id"] = str(uuid4())
    assert client.post("/ticket/book", json=booking, headers=attendee_headers).status_code == 409
    assert client.get(f"/ticket/user/{attendee}", headers=organizer_headers).status_code == 403
    restart("ticketing")
    r = client.get(f"/ticket/user/{attendee}", headers=attendee_headers)
    assert r.status_code == 200 and {t["id"] for t in r.json()} == set(ticket_ids)
    assert client.get("/event/" + str(uuid4())).status_code == 404
    assert client.post("/event/", headers=organizer_headers, content="broken").status_code == 400
    assert client.post("/ticket/book", headers=attendee_headers, json={**booking,"quantity":-1}).status_code == 422
    event.update(title="Paid QA Event", price=10)
    paid_id = client.post("/event/", json=event, headers=organizer_headers).json()["id"]
    assert client.post("/ticket/book", headers=attendee_headers, json={**booking,"event_id":paid_id}).status_code == 503
    assert client.post("/payment/intent", headers=attendee_headers, json={}).status_code == 403
    preflight = client.options("/event/search", headers={"Origin":"https://newfind.example", "Access-Control-Request-Method":"GET"})
    assert preflight.headers["access-control-allow-origin"] == "https://newfind.example"
    denied = client.options("/event/search", headers={"Origin":"https://evil.example", "Access-Control-Request-Method":"GET"})
    assert "access-control-allow-origin" not in denied.headers


def test_external_listings_are_private_to_import_and_cannot_issue_tickets(core):
    client, _ = core
    payload = {"email": "external-check@example.org", "password": secrets.token_urlsafe(20), "full_name": "QA"}
    assert client.post("/auth/register", json=payload).status_code == 201
    token = client.post("/auth/login", json=payload).json()["access_token"]
    headers = {"Authorization": "Bearer " + token}
    user = client.get("/auth/me", headers=headers).json()["id"]
    listing = {"organizer_id": str(uuid4()), "title": "External Provider QA Listing", "start_date": "2031-12-01T12:00:00",
               "end_date": "2031-12-01T14:00:00", "capacity": 100, "price": 0, "status": "published",
               "source": "ticketmaster", "external_id": "QA-LOCAL-ONLY", "event_website": "https://www.ticketmaster.be/event/qa-local-only"}
    endpoint = client.event_internal_url + "/events/ingest"
    assert httpx.post(endpoint, json=listing, trust_env=False).status_code == 403
    internal = {"X-Internal-Key": client.internal_api_key}
    response = httpx.post(endpoint, json=listing, headers=internal, trust_env=False)
    assert response.status_code == 200, response.text
    event_id = response.json()["id"]
    again = httpx.post(endpoint, json={**listing, "title": "External Provider QA Updated"}, headers=internal, trust_env=False)
    assert again.json()["id"] == event_id
    assert client.post("/event/ingest", json=listing, headers=headers).status_code == 403
    bad = httpx.post(endpoint, json={**listing, "event_website": "https://ticketmaster.com.evil.example/fake"}, headers=internal, trust_env=False)
    assert bad.status_code == 422
    booking = {"event_id": event_id, "user_id": user, "quantity": 1, "request_id": str(uuid4())}
    assert client.post("/ticket/book", json=booking, headers=headers).status_code == 409
    assert client.get(f"/ticket/user/{user}", headers=headers).json() == []
    free = client.get("/event/search", params={"price_max": 0}).json()
    assert all(e["id"] != event_id for e in free)


def test_professional_event_operations_and_cross_border_discovery(core):
    client, restart = core
    def new_account(label):
        payload = {'email': f'{label}@example.org', 'password': secrets.token_urlsafe(20), 'full_name': label}
        assert client.post('/auth/register', json=payload).status_code == 201
        token = client.post('/auth/login', json=payload).json()['access_token']
        headers = {'Authorization': 'Bearer ' + token}
        return client.get('/auth/me', headers=headers).json()['id'], headers
    owner, oh = new_account('professional-organizer')
    guest, gh = new_account('professional-attendee')
    stranger, sh = new_account('professional-outsider')
    profile = {'full_name': 'Professional QA', 'company_name': 'SYNTHETIC QA ONLY', 'company_address': 'QA ONLY',
               'company_email': 'qa@example.org', 'contact_email': 'qa@example.org', 'country': 'Belgium',
               'registration_number': 'TEST', 'bank_name': 'TEST', 'bank_account_number': 'TEST'}
    assert client.post(f'/user/{owner}/organizer', headers=oh, json=profile).status_code == 201
    base = {'organizer_id': owner, 'title': 'Cross-border operations QA', 'description': 'Isolated professional QA fixture',
            'start_date': '2031-05-01T12:00:00Z', 'end_date': '2031-05-01T15:00:00Z', 'price': 0,
            'currency': 'EUR', 'capacity': 20, 'status': 'published', 'timezone': 'Europe/Brussels',
            'agenda': [{'id': 'one', 'title': 'Welcome', 'time': '14:00'}],
            'faq': [{'id': 'one', 'question': 'Is this a test?', 'answer': 'Yes'}],
            'organization_name': 'SYNTHETIC QA ONLY'}
    events = []
    for name, location in [('Brussels', {'latitude': 50.85, 'longitude': 4.35}),
                           ('Maastricht', {'latitude': 50.85, 'longitude': 5.69}),
                           ('Berlin', {'latitude': 52.52, 'longitude': 13.40}), ('Unknown', {})]:
        response = client.post('/event', headers=oh, json={**base, 'title': base['title'] + ' ' + name, 'location': location})
        assert response.status_code == 201, response.text
        events.append(response.json())
    eid = events[0]['id']
    nearby = client.get('/event/search', params={'q': 'Cross-border operations QA', 'lat': 50.85, 'lng': 4.35, 'radius': 200})
    assert nearby.status_code == 200, nearby.text
    assert {e['id'] for e in nearby.json()} == {events[0]['id'], events[1]['id']}
    assert all(e['distance_km'] <= 200 for e in nearby.json())
    assert client.get('/event/search', params={'lat': 91, 'lng': 4}).status_code == 422
    assert client.get('/event/search', params={'price_max': 100}).status_code == 422
    assert client.get('/event/search', params={'price_max': 100, 'currency': 'EUR'}).status_code == 200
    edited = client.patch(f'/event/{eid}', headers=oh, json={'faq': [{'id': 'two', 'question': 'Saved?', 'answer': 'Yes'}], 'offer_name': 'QA admission'})
    assert edited.status_code == 200, edited.text
    restart('event')
    persisted = client.get(f'/event/{eid}').json()
    assert persisted['agenda'][0]['title'] == 'Welcome' and persisted['faq'][0]['question'] == 'Saved?'
    assert client.patch(f'/event/{eid}', headers=oh, json={'end_date': '2020-01-01T00:00:00'}).status_code == 422
    assert client.patch(f'/event/{eid}', headers=oh, json={'currency': 'USD'}).status_code == 409
    ticket = client.post('/ticket/book', headers=gh, json={'event_id': eid, 'user_id': guest, 'quantity': 1, 'request_id': str(uuid4())})
    assert ticket.status_code == 201, ticket.text
    ticket = ticket.json()[0]
    assert client.get(f'/ticket/organizer/{owner}/attendees', headers=sh).status_code == 403
    people = client.get(f'/ticket/organizer/{owner}/attendees', headers=oh)
    assert people.status_code == 200, people.text
    assert people.json()[0]['email'] == 'professional-attendee@example.org'
    assert client.get(f'/event/{eid}/messages', headers=sh).status_code == 403
    assert client.post(f'/event/{eid}/messages', headers=gh, json={'content': 'Participant question'}).status_code == 201
    assert client.post(f'/event/{eid}/messages', headers=oh, json={'content': 'Organizer answer'}).status_code == 201
    restart('event')
    messages = client.get(f'/event/{eid}/messages', headers=gh)
    assert len(messages.json()) == 2 and messages.json()[1]['is_organizer'] is True
    assert messages.json()[0]['name'] == 'professional-attendee'
    rooms = client.get('/event/rooms', headers=gh)
    assert rooms.status_code == 200 and rooms.json()[0]['unread_count'] == 1
    assert client.post(f'/event/{eid}/messages/read', headers=gh).status_code == 200
    assert client.get('/event/rooms', headers=gh).json()[0]['unread_count'] == 0
    assert client.post(f'/ticket/check-in/{eid}', headers=sh, json={'qr_code_hash': ticket['qr_code_hash']}).status_code == 403
    checked = client.post(f'/ticket/check-in/{eid}', headers=oh, json={'qr_code_hash': ticket['qr_code_hash']})
    assert checked.status_code == 200 and checked.json()['already_checked_in'] is False
    assert client.post(f'/ticket/check-in/{eid}', headers=oh, json={'qr_code_hash': ticket['qr_code_hash']}).json()['already_checked_in'] is True
    restart('ticketing')
    assert client.get(f'/event/{eid}').json()['tickets_sold'] == 1
    assert client.get(f'/ticket/user/{guest}', headers=gh).json()[0]['checked_in_at'] is not None
    closed = client.patch(f'/event/{eid}', headers=oh, json={'status': 'registration_closed'})
    assert closed.status_code == 200, closed.text
    assert any(e['id'] == eid for e in client.get('/event/search').json())
    assert client.post('/ticket/book', headers=gh, json={'event_id': eid, 'user_id': guest, 'quantity': 1, 'request_id': str(uuid4())}).status_code == 409
    moved = client.patch(f'/event/{eid}', headers=oh, json={'start_date': '2031-05-02T12:00:00Z', 'end_date': '2031-05-02T15:00:00Z'})
    assert moved.status_code == 200, moved.text
    notices = client.get('/event/notifications', headers=gh)
    assert notices.status_code == 200, notices.text
    assert notices.json()['unread_count'] == 2
    assert {n['kind'] for n in notices.json()['items']} == {'ticket_issued','rescheduled'}
    notice = next(n['id'] for n in notices.json()['items'] if n['kind']=='rescheduled')
    assert client.post(f'/event/notifications/{notice}/read', headers=sh).status_code == 404
    assert client.post(f'/event/notifications/{notice}/read', headers=gh).status_code == 200
    restart('event')
    assert client.get('/event/notifications', headers=gh).json()['unread_count'] == 1
    assert client.post('/event/notifications/read',headers=gh).status_code==200
    assert client.get('/event/notifications',headers=gh).json()['unread_count']==0
    stats = client.get(f'/ticket/organizer/{owner}/overview', headers=oh)
    assert stats.status_code == 200, stats.text
    assert stats.json()['portfolio']['ticketsSold'] == 1 and stats.json()['portfolio']['checkedIn'] == 1
    assert client.get(f'/ticket/qr/{ticket["id"]}', headers=sh).status_code == 404
    assert client.get(f'/ticket/qr/{ticket["id"]}', headers=gh).status_code == 200
