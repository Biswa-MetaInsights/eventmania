from copy import deepcopy
from backend.shared.ticketmaster import normalize_event, safe_ticket_url
from backend.shared.ticketmaster_sync import sync


def fixture():
    return {'id': 'QA-LOCAL', 'name': 'Provider QA event', 'url': 'https://www.ticketmaster.be/event/qa-local',
            'dates': {'start': {'dateTime': '2035-11-09T12:00:00Z'}, 'status': {'code': 'onsale'}},
            '_embedded': {'venues': [{'name': 'QA Venue', 'city': {'name': 'Brussels'},
                                      'location': {'latitude': '50.85', 'longitude': '4.35'}}]},
            'priceRanges': [{'min': 12.5, 'currency': 'EUR'}]}


def test_provider_normalization_and_link_validation():
    raw = fixture()
    event = normalize_event(raw)
    assert event['source'] == 'ticketmaster' and event['external_id'] == 'QA-LOCAL'
    assert event['price'] == 12.5 and event['currency'] == 'EUR'
    assert event['location']['latitude'] == 50.85
    missing = deepcopy(raw)
    missing['_embedded']['venues'][0].pop('location')
    assert 'latitude' not in normalize_event(missing)['location']
    missing['dates']['status']['code'] = 'cancelled'
    assert normalize_event(missing)['status'] == 'cancelled'
    for url in ['javascript:alert(1)', 'https://ticketmaster.com.evil.example/', 'http://ticketmaster.be/',
                'https://user:password@ticketmaster.be/', 'https://ticketmaster.be:8000/']:
        assert safe_ticket_url(url) is None
        assert normalize_event({**raw, 'url': url}) is None


def test_bounded_sync_deduplicates_and_sends_private_ingest_header(monkeypatch):
    monkeypatch.setenv('INTERNAL_API_KEY', 'local-only-test-key')
    saved = []
    def fetch(url, *, payload=None, headers=None):
        if payload is None:
            assert 'source=ticketmaster' in url and 'countryCode=BE' in url
            return 200, {'_embedded': {'events': [fixture(), fixture()]}, 'page': {'totalPages': 1}}
        assert headers['X-Internal-Key'] == 'local-only-test-key'
        saved.append(payload)
        return 200, {'id': 'local-test'}
    result = sync('local-test-provider-key', [('Brussels', 'BE')], fetch=fetch, pause=lambda _: None)
    assert result['fetched'] == 2 and result['imported'] == 1 and result['skipped'] == 1
    assert len(saved) == 1
