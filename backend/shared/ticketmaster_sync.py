"""Bounded one-shot catalogue sync inside the existing event container."""
import json
import os
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from backend.shared.ticketmaster import TM_BASE_URL, normalize_event


def request_json(url, *, payload=None, headers=None):
    request = Request(url, data=None if payload is None else json.dumps(payload).encode(),
                      headers=headers or {})
    try:
        with urlopen(request, timeout=20) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        # Provider URLs contain an API key: never print exceptions or request URLs.
        return error.code, None
    except (URLError, ValueError, TimeoutError):
        return 503, None


def sync(key, cities, *, fetch=request_json, pause=time.sleep, pages=2):
    if not key:
        raise RuntimeError('Ticketmaster API key is required')
    internal_key = os.environ.get('INTERNAL_API_KEY', '')
    if not internal_key:
        raise RuntimeError('Private ingestion credential is missing')
    result = {'provider': 'ticketmaster', 'fetched': 0, 'imported': 0, 'skipped': 0, 'failed': 0}
    seen = set()
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    base = 'http://127.0.0.1:' + os.environ.get('APP_PORT', '8003') + '/events/ingest'
    for city, country in cities:
        for page in range(min(max(pages, 1), 5)):
            params = {'apikey': key, 'city': city, 'countryCode': country, 'source': 'ticketmaster',
                      'size': 100, 'page': page, 'sort': 'date,asc', 'startDateTime': now, 'locale': '*'}
            status, body = fetch(TM_BASE_URL + '?' + urlencode(params))
            if status != 200:
                raise RuntimeError(f'Ticketmaster returned HTTP {status}; sync stopped')
            events = (body.get('_embedded') or {}).get('events') or []
            for event in events:
                result['fetched'] += 1
                identifier = event.get('id')
                if not identifier or identifier in seen:
                    result['skipped'] += 1
                    continue
                seen.add(identifier)
                payload = normalize_event(event)
                if payload is None:
                    result['skipped'] += 1
                    continue
                status, _ = fetch(base, payload=payload, headers={
                    'Content-Type': 'application/json', 'X-Internal-Key': internal_key,
                })
                if status in (200, 201):
                    result['imported'] += 1
                else:
                    result['failed'] += 1
            pause(0.6)  # Below even the stricter public 2-request/second quota.
            if not events or page + 1 >= int((body.get('page') or {}).get('totalPages', 0)):
                break
    return result


if __name__ == '__main__':
    try:
        config = json.load(sys.stdin)
        print(json.dumps(sync(config['key'], config['cities'])), flush=True)
    except (KeyError, ValueError, RuntimeError) as error:
        # RuntimeError text above contains only fixed messages and status codes.
        print(str(error) if isinstance(error, RuntimeError) else 'Invalid sync configuration', file=sys.stderr)
        raise SystemExit(1)
