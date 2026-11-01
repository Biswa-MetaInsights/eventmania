"""Exercise a deployed core stack using disposable QA accounts and free events.

Uses only the standard library. Never prints passwords or tokens. Keep the state
file private; --verify repeats login and verifies bookings after a service restart.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import secrets
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="http://127.0.0.1:18000")
parser.add_argument("--state", type=Path, default=Path(".qa-state.json"))
parser.add_argument("--verify", action="store_true")
args = parser.parse_args()


def api(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request(args.base.rstrip("/") + path,
                      data=None if body is None else json.dumps(body).encode(),
                      headers=headers, method=method)
    try:
        response = urlopen(request, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        raw = response.read()
        try:
            value = json.loads(raw)
        except ValueError:
            value = None
        return response.status, value


def expect(result, code, label):
    status, value = result
    if status != code:
        raise RuntimeError(f"FAIL {label}: HTTP {status}, expected {code}")
    print("PASS", label, flush=True)
    return value


def login(account):
    return expect(api("POST", "/auth/login", account), 200, "login")["access_token"]


if args.verify:
    state = json.loads(args.state.read_text())
    token = login(state["attendee"])
    tickets = expect(api("GET", "/ticket/user/" + state["attendee_id"], token=token),
                     200, "bookings after service restart")
    assert {item["id"] for item in tickets} == set(state["tickets"])
    print("PASS persisted ticket identities", flush=True)
    raise SystemExit(0)


def account(label):
    payload = {"email":f"newfind-qa-{label}-{uuid4().hex[:12]}@example.org",
               "password":secrets.token_urlsafe(24), "full_name":"NewFind QA " + label}
    expect(api("POST", "/auth/register", payload), 201, "registration " + label)
    token = login(payload)
    me = expect(api("GET", "/auth/me", token=token), 200, "authenticated identity")
    expect(api("GET", "/user/" + me["id"], token=token), 200, "profile creation")
    return payload, token, me["id"]


organizer, organizer_token, organizer_id = account("organizer")
attendee, attendee_token, attendee_id = account("attendee")
expect(api("PATCH", "/user/" + attendee_id, {"bio":"Disposable QA profile"}, attendee_token), 200, "profile update")
expect(api("GET", "/user/" + organizer_id, token=attendee_token), 403, "cross-user profile denied")
profile = {"full_name":"NewFind QA", "company_name":"QA TEST ONLY",
           "company_address":"QA TEST ONLY", "company_email":"qa@example.org",
           "country":"Belgium", "registration_number":"QA-TEST",
           "bank_name":"TEST ONLY", "bank_account_number":"TEST ONLY"}
expect(api("POST", f"/user/{organizer_id}/organizer", profile, organizer_token), 201, "organizer onboarding")
start = datetime.utcnow() + timedelta(days=7)
event = {"organizer_id":organizer_id, "title":"[QA] NewFind deployment " + uuid4().hex[:8],
         "description":"Disposable deployment test; no real attendance or payment.",
         "start_date":start.isoformat(), "end_date":(start+timedelta(hours=2)).isoformat(),
         "capacity":3, "price":0, "currency":"EUR", "status":"published"}
created = expect(api("POST", "/event/", event, organizer_token), 201, "event creation")
event_id = created["id"]
found = expect(api("GET", "/event/search?q=" + event["title"].split()[-1]), 200, "event discovery")
assert any(item["id"] == event_id for item in found)
expect(api("GET", "/event/" + event_id), 200, "event details")
expect(api("PATCH", "/event/" + event_id, {"title":"Unauthorized change"}, attendee_token), 403, "event ownership enforced")

def book(_):
    body = {"event_id":event_id, "user_id":attendee_id, "quantity":1, "request_id":str(uuid4())}
    return body, api("POST", "/ticket/book", body, attendee_token)

with ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(book, range(8)))
assert sum(result[1][0] == 201 for result in results) == 3, "Concurrency: expected exactly three bookings"
assert sum(result[1][0] == 409 for result in results) == 5, "Concurrency: expected five sold-out rejections"
print("PASS PostgreSQL concurrent capacity enforcement", flush=True)
successful = next(item for item in results if item[1][0] == 201)
retried = expect(api("POST", "/ticket/book", successful[0], attendee_token), 201, "idempotent booking retry")
assert retried[0]["id"] == successful[1][1][0]["id"]
tickets = expect(api("GET", "/ticket/user/" + attendee_id, token=attendee_token), 200, "saved bookings")
assert len(tickets) == 3
details = expect(api("GET", "/event/" + event_id), 200, "live inventory")
assert details["tickets_sold"] == 3
expect(api("GET", "/event/" + str(uuid4())), 404, "missing event error")
state = {"attendee":attendee, "attendee_id":attendee_id,
         "tickets":[item["id"] for item in tickets], "event_id":event_id}
fd = os.open(args.state, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as file:
    json.dump(state, file)
print("PASS live core journeys; private state saved for restart verification", flush=True)
