"""Pure Ticketmaster normalization shared by the importer and legacy service."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import urlsplit

PROVIDER_DOMAINS = frozenset({
    "ticketmaster.com", "ticketmaster.be", "ticketmaster.nl", "ticketmaster.lu",
    "ticketmaster.de", "ticketmaster.fr", "ticketmaster.co.uk", "ticketmaster.ie",
    "ticketmaster.es", "ticketmaster.at", "ticketmaster.ch", "ticketmaster.se",
    "ticketmaster.dk", "ticketmaster.no", "ticketmaster.fi", "ticketmaster.it",
    "ticketmaster.pl", "ticketmaster.cz", "ticketmaster.co.nz", "ticketmaster.com.au",
    "ticketmaster.ca", "ticketmaster.com.mx", "ticketmaster.sg",
})


def safe_ticket_url(value):
    if not isinstance(value, str):
        return None
    try:
        url = urlsplit(value)
        host = (url.hostname or "").lower()
        if url.scheme != "https" or url.username or url.password or url.port not in (None, 443):
            return None
        if not any(host == domain or host.endswith("." + domain) for domain in PROVIDER_DOMAINS):
            return None
        return value
    except ValueError:
        return None

TM_ORGANIZER_ID = "00000000-0000-0000-0000-000000000098"
TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
SOURCE = "ticketmaster"

PAGE_SIZE = 200            # max page size the Discovery API allows
MAX_PAGES = 5             # 200 * 5 = the 1,000-result-per-query ceiling
DEFAULT_DURATION_HOURS = 3  # fallback when an event has no end time

# Ticketmaster top-level segments, sliced to multiply reachable inventory while
# keeping each query under the ceiling.
SEGMENTS = ["Music", "Sports", "Arts & Theatre", "Film", "Miscellaneous"]

# Ticketmaster segment -> EventMind category (keeps aggregated events consistent
# with the native taxonomy used by organiser-created events).
SEGMENT_CATEGORY_MAP = {
    "Music": "Creative",
    "Sports": "Sports",
    "Arts & Theatre": "Creative",
    "Film": "Creative",
    "Miscellaneous": "Networking",
}


# ── Normalisation: Ticketmaster event -> EventMind /events/ingest payload ──────
def _first(seq: Optional[list]) -> Optional[dict]:
    return seq[0] if seq else None


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _best_image(images: Optional[list]) -> Optional[str]:
    """Pick the widest 16:9 image, else the widest available."""
    if not images:
        return None
    pool = [i for i in images if i.get("ratio") == "16_9" and i.get("url")] \
        or [i for i in images if i.get("url")]
    if not pool:
        return None
    return max(pool, key=lambda i: i.get("width", 0)).get("url")


def normalize_event(ev: dict, segment_hint: Optional[str] = None) -> Optional[dict]:
    """Convert a Discovery event object into an /events/ingest payload.

    Returns None for events that cannot be placed in time or are in the past.
    """
    ticket_url = safe_ticket_url(ev.get("url"))
    if not ticket_url:
        return None
    external_id = ev.get("id")
    title = (ev.get("name") or "").strip()
    if not external_id or not title:
        return None

    dates = ev.get("dates", {}) or {}
    start_block = dates.get("start") or {}
    start = _parse_dt(start_block.get("dateTime"))
    if start is None and start_block.get("localDate"):
        local_time = start_block.get("localTime", "19:00:00")
        start = _parse_dt(f"{start_block['localDate']}T{local_time}")
    if start is None:
        return None
    if start < datetime.now(timezone.utc).replace(tzinfo=None):
        return None  # skip past events
    end = _parse_dt((dates.get("end") or {}).get("dateTime")) \
        or (start + timedelta(hours=DEFAULT_DURATION_HOURS))

    classification = _first(ev.get("classifications")) or {}
    segment = (classification.get("segment") or {}).get("name") or segment_hint or "Miscellaneous"
    genre = (classification.get("genre") or {}).get("name")
    sub_genre = (classification.get("subGenre") or {}).get("name")
    category = SEGMENT_CATEGORY_MAP.get(segment, "Networking")
    tags = [t for t in {segment, genre, sub_genre} if t and t not in ("Undefined", "")]

    venue = _first((ev.get("_embedded") or {}).get("venues")) or {}
    location: dict[str, Any] = {"name": venue.get("name")}
    if (city := venue.get("city")):
        location["city"] = city.get("name")
    if (country := venue.get("country")):
        location["country"] = country.get("name")
    if (address := venue.get("address")):
        location["address"] = address.get("line1")
    if (loc := venue.get("location")):
        if loc.get("latitude") and loc.get("longitude"):
            location["latitude"] = float(loc["latitude"])
            location["longitude"] = float(loc["longitude"])

    price_ranges = ev.get("priceRanges") or []
    price = float(min((p.get("min", 0) for p in price_ranges), default=0) or 0)
    # Ticketmaster quotes in the venue's local currency, NOT rupees. Take the
    # provider's own code and fall back to USD (its dominant market) rather than
    # the platform default — an INR fallback would relabel a $45 ticket as ₹45.
    currency = next(
        (p["currency"] for p in price_ranges if p.get("currency")),
        "USD",
    )

    description = ev.get("info") or ev.get("pleaseNote") \
        or f"{title} — tickets and details available on Ticketmaster."

    return {
        "organizer_id": TM_ORGANIZER_ID,
        "title": title[:200],
        "description": description,
        "category": category,
        "event_type": "In-Person",
        "location": location,
        "tags": tags,
        "language": (ev.get("locale") or "en").split("-")[0],
        "event_website": ticket_url,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "capacity": 0,
        "price": price,
        "currency": currency,
        "status": "cancelled" if (dates.get("status") or {}).get("code") in {"cancelled", "canceled"} else "published",
        "source": SOURCE,
        "external_id": external_id,
        "image_url": _best_image(ev.get("images")),
    }

