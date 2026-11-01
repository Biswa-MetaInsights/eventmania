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
               INTERNAL_API_KEY=secrets.token_hex(32), KAFKA_ENABLED="false", DEBUG="false",
               USER_SERVICE_URL=urls["user"], EVENT_SERVICE_URL=urls["event"],
               TICKETING_SERVICE_URL=urls["ticketing"], CORS_ALLOWED_ORIGINS="https://newfind.example")
    env = {key: value for key, value in env.items() if key.lower() not in {"all_proxy", "http_proxy", "https_proxy"}}
    for name, prefix in [("auth", "auth"), ("user", "users"), ("event", "events"),
                         ("ticket", "tickets"), ("ticketing", "tickets")]:
        env[f"BACKEND_{name.upper()}_URL"] = urls["ticketing" if name == "ticket" else name] + "/" + prefix
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
    assert client.post("/auth/social-login", json={}).status_code in (401, 403)
    assert client.post("/auth/register", json={"email":"admin@example.org", "password":"longpassword", "full_name":"admin", "role":"admin"}).status_code == 403
    data = {"full_name":"Test Organizer", "company_name":"QA", "company_address":"QA address",
            "company_email":"qa@example.org", "country":"Belgium", "registration_number":"TEST",
            "bank_name":"TEST ONLY", "bank_account_number":"TEST ONLY"}
    r = client.post(f"/user/{organizer}/organizer", headers=organizer_headers, json=data)
    assert r.status_code == 201, r.text
    event = {"organizer_id":organizer, "title":"Integration QA Event", "description":"Automated isolated test",
             "start_date":"2030-12-01T12:00:00", "end_date":"2030-12-01T14:00:00",
             "capacity":2, "price":0, "currency":"EUR", "status":"published"}
    assert client.post("/event/", json=event).status_code == 401
    r = client.post("/event/", json=event, headers=organizer_headers)
    assert r.status_code == 201, r.text
    event_id = r.json()["id"]
    assert client.get("/event/search", params={"q":"Integration QA"}).json()[0]["id"] == event_id
    assert client.get(f"/event/{event_id}").status_code == 200
    assert client.patch(f"/event/{event_id}", json={"title":"Hijack"}, headers=attendee_headers).status_code == 403
    assert client.patch(f"/event/{event_id}", json={"title":"Integration QA Updated"}, headers=organizer_headers).status_code == 200
    booking = {"event_id":event_id, "user_id":attendee, "quantity":2, "request_id":str(uuid4())}
    r = client.post("/ticket/book", json=booking, headers=attendee_headers)
    assert r.status_code == 201, r.text
    ticket_ids = [t["id"] for t in r.json()]
    assert len(ticket_ids) == 2
    assert client.get(f"/event/{event_id}").json()["tickets_sold"] == 2
    assert client.get("/event/search").json()[0]["tickets_sold"] == 2
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
