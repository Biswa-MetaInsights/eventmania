"""Ticketmaster ingestion — the single Ticketmaster pipeline for EventMind.

This is the one place Ticketmaster events are fetched and normalised. The
on-demand entrypoint `ingest(city, lat, lng, radius)` is called by the
recommendation service's POST /recommendations/ingest-city endpoint (the city
picker in the frontend triggers it). The standalone launcher
`backend/scripts/sync_ticketmaster.py` does not re-implement any of this — it
simply calls that endpoint for each launch city.

Design notes:
- Idempotent: events are upserted via the event service's POST /events/ingest
  endpoint, keyed on (source, external_id). Re-running never duplicates, so we
  do not pre-fetch existing ids to dedup.
- Beats the 1,000-result ceiling: a single Discovery query exposes at most
  1,000 results (200 x 5 pages), so we slice by classification segment and
  paginate within each segment.
- Stores provenance + image: source="ticketmaster", external_id=<TM id>, and
  the event banner in image_url (via the new event schema columns).
- Categories are mapped from Ticketmaster segments onto EventMind's taxonomy so
  aggregated events sit consistently alongside native organiser events.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Synthetic organiser that owns every aggregated Ticketmaster event.
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
    "Sports": "Networking",
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
    if start < datetime.utcnow():
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
        "event_website": ev.get("url"),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "capacity": 0,
        "price": price,
        "status": "published",
        "source": SOURCE,
        "external_id": external_id,
        "image_url": _best_image(ev.get("images")),
    }


class TicketmasterIngestion:
    def __init__(self):
        self.api_key = settings.TICKETMASTER_API_KEY
        self.ingest_url = f"{settings.EVENT_SERVICE_URL}/events/ingest"

    async def _upsert(self, http: httpx.AsyncClient, payload: dict) -> bool:
        try:
            r = await http.post(self.ingest_url, json=payload, timeout=15)
            if r.status_code in (200, 201):
                return True
            logger.warning("Ingest %d for '%s': %s", r.status_code, payload["title"][:50], r.text[:120])
        except Exception as e:  # noqa: BLE001 — best-effort per event
            logger.warning("Ingest error for '%s': %s", payload["title"][:50], e)
        return False

    async def ingest(self, city: str, lat: float, lng: float, radius: int = 100) -> dict[str, Any]:
        """Fetch Ticketmaster events near a location and upsert them.

        Slices by segment and paginates so a single city pulls well beyond the
        50-per-call the old implementation managed. Idempotent via /events/ingest.
        """
        if not self.api_key:
            return {"error": "TICKETMASTER_API_KEY not configured", "created": 0}

        logger.info("Ticketmaster ingest for %s (%s,%s) r=%dkm", city, lat, lng, radius)
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        seen: set[str] = set()
        upserted = failed = 0

        async with httpx.AsyncClient(timeout=20.0) as http:
            for segment in SEGMENTS:
                for page in range(MAX_PAGES):
                    params = {
                        "apikey": self.api_key,
                        "latlong": f"{lat},{lng}",
                        "radius": radius,
                        "unit": "km",
                        "classificationName": segment,
                        "size": PAGE_SIZE,
                        "page": page,
                        "sort": "date,asc",
                        "startDateTime": now,
                    }
                    try:
                        r = await http.get(TM_BASE_URL, params=params)
                    except Exception as e:  # noqa: BLE001
                        logger.warning("TM request failed (%s/%s p%d): %s", city, segment, page, e)
                        break

                    if r.status_code == 429:
                        logger.warning("TM rate limited — backing off")
                        await asyncio.sleep(5)
                        continue
                    if r.status_code != 200:
                        logger.warning("TM HTTP %d (%s/%s): %s", r.status_code, city, segment, r.text[:120])
                        break

                    data = r.json()
                    events = (data.get("_embedded") or {}).get("events") or []
                    if not events:
                        break

                    for raw in events:
                        ext_id = raw.get("id")
                        if not ext_id or ext_id in seen:
                            continue
                        seen.add(ext_id)
                        payload = normalize_event(raw, segment_hint=segment)
                        if payload is None:
                            continue
                        if await self._upsert(http, payload):
                            upserted += 1
                        else:
                            failed += 1

                    total_pages = (data.get("page") or {}).get("totalPages", 0)
                    if page + 1 >= min(total_pages, MAX_PAGES):
                        break
                    await asyncio.sleep(0.25)  # stay under 5 req/s

        logger.info("Ticketmaster ingest done for %s: %d upserted, %d failed", city, upserted, failed)
        # 'created' kept for backward compatibility with the endpoint message.
        return {"city": city, "created": upserted, "upserted": upserted, "failed": failed}


ticketmaster_ingestion = TicketmasterIngestion()
