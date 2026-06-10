"""Sync events from the Ticketmaster Discovery API into the EventMind database.

WHY THIS EXISTS
    EventMind's marketplace starts empty (cold-start problem). The Ticketmaster
    Discovery API gives us a large inventory of real, ticketed events worldwide
    that we surface for discovery and redirect out to Ticketmaster to purchase.
    These aggregated events live alongside native organiser events, tagged with
    source="ticketmaster" so the frontend can render a "Buy on Ticketmaster"
    link instead of the native checkout flow.

THE 1,000-RESULT CEILING (important)
    A single Discovery query exposes at most the first 1,000 results
    (max page size 200 x 5 pages). You therefore cannot "fetch everything" in
    one call. We slice the catalogue into (city x segment) buckets so each
    bucket stays under the ceiling, then upsert by Ticketmaster event id —
    re-running the sync updates rows rather than duplicating them.

QUOTA
    Default Discovery quota is ~5,000 calls/day at 5 req/sec. We throttle to
    stay well under the rate limit and back off on HTTP 429.

USAGE
    # 1. Put your key in the project-root .env (same file shadow_runner reads):
    #        TICKETMASTER_API_KEY=xxxxxxxxxxxxxxxxxxxx
    # 2. Make sure the backend is running (gateway on :8000) and migrated:
    #        python backend/scripts/migrate_add_source_columns.py
    # 3. Run:
    python backend/scripts/sync_ticketmaster.py                 # all configured cities
    python backend/scripts/sync_ticketmaster.py --city London   # one city
    python backend/scripts/sync_ticketmaster.py --dry-run       # fetch only, no writes
    python backend/scripts/sync_ticketmaster.py --max-pages 2   # shallower crawl

Get a free key at https://developer.ticketmaster.com (instant).
"""
import argparse
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Any, Iterable, Optional

import requests

# ── Configuration ─────────────────────────────────────────────────────────────
DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
INGEST_URL = os.environ.get("EVENTMIND_INGEST_URL", "http://localhost:8000/event/ingest")

# Fixed synthetic organiser that owns all aggregated Ticketmaster events.
TICKETMASTER_ORGANIZER_ID = "00000000-0000-0000-0000-0000000000aa"
SOURCE = "ticketmaster"

# Discovery hard limits.
PAGE_SIZE = 200          # max allowed by the API
MAX_PAGES = 5            # 200 * 5 = 1,000 result ceiling per query
REQUEST_INTERVAL = 0.25  # seconds between calls -> 4 req/s, under the 5 req/s cap
DEFAULT_DURATION_HOURS = 3  # fallback when the event has no end time

# Launch cities to crawl. countryCode keeps the city query unambiguous.
# Mirrors the cluster of cities EventMind already seeds for native events.
CITIES = [
    {"city": "New York", "countryCode": "US"},
    {"city": "San Francisco", "countryCode": "US"},
    {"city": "London", "countryCode": "GB"},
    {"city": "Berlin", "countryCode": "DE"},
    {"city": "Amsterdam", "countryCode": "NL"},
    {"city": "Brussels", "countryCode": "BE"},
]

# Ticketmaster top-level segments. Slicing by segment multiplies the reachable
# inventory per city while keeping each query under the 1,000-result ceiling.
SEGMENTS = ["Music", "Sports", "Arts & Theatre", "Film", "Miscellaneous"]

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("sync_ticketmaster")


# ── .env loading (same approach as shadow_runner.py) ───────────────────────────
def _project_root() -> str:
    # backend/scripts/ -> backend/ -> <project root>
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _load_api_key() -> str:
    """Read TICKETMASTER_API_KEY from the environment, falling back to .env."""
    key = os.environ.get("TICKETMASTER_API_KEY")
    if key:
        return key.strip()

    dotenv_path = os.path.join(_project_root(), ".env")
    if os.path.exists(dotenv_path):
        with open(dotenv_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                name, _, value = line.partition("=")
                if name.strip() == "TICKETMASTER_API_KEY":
                    return value.strip().strip('"').strip("'")

    logger.error(
        "TICKETMASTER_API_KEY not found.\n"
        "  Add it to %s:\n"
        "      TICKETMASTER_API_KEY=your_key_here\n"
        "  Get a free key at https://developer.ticketmaster.com",
        dotenv_path,
    )
    sys.exit(1)


# ── Ticketmaster -> EventMind normalisation ────────────────────────────────────
def _first(seq: Optional[list]) -> Optional[dict]:
    return seq[0] if seq else None


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        # Discovery returns ISO 8601, often with a trailing Z.
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _best_image(images: Optional[list]) -> Optional[str]:
    """Pick the widest 16:9 image, else the widest available."""
    if not images:
        return None
    ratio_16_9 = [i for i in images if i.get("ratio") == "16_9" and i.get("url")]
    pool = ratio_16_9 or [i for i in images if i.get("url")]
    if not pool:
        return None
    return max(pool, key=lambda i: i.get("width", 0)).get("url")


def normalize_event(ev: dict, segment_hint: Optional[str]) -> Optional[dict]:
    """Convert a Discovery event object into an EventMind ingest payload.

    Returns None for events that cannot be placed in time (no usable start).
    """
    external_id = ev.get("id")
    title = (ev.get("name") or "").strip()
    if not external_id or not title:
        return None

    dates = ev.get("dates", {}) or {}
    start = _parse_dt((dates.get("start") or {}).get("dateTime")) \
        or _parse_dt((dates.get("start") or {}).get("localDate"))
    if start is None:
        return None  # undated event — skip, it cannot be discovered by date
    end = _parse_dt((dates.get("end") or {}).get("dateTime")) \
        or (start + timedelta(hours=DEFAULT_DURATION_HOURS))

    classification = _first(ev.get("classifications")) or {}
    segment = (classification.get("segment") or {}).get("name") or segment_hint or "General"
    genre = (classification.get("genre") or {}).get("name")
    sub_genre = (classification.get("subGenre") or {}).get("name")
    tags = [t for t in {segment, genre, sub_genre} if t and t not in ("Undefined", "")]

    venue = _first((ev.get("_embedded") or {}).get("venues")) or {}
    location: dict[str, Any] = {"name": venue.get("name")}
    if (city := venue.get("city")):
        location["city"] = city.get("name")
    if (country := venue.get("country")):
        location["country"] = country.get("name")
    if (loc := venue.get("location")):
        if loc.get("latitude") and loc.get("longitude"):
            location["latitude"] = float(loc["latitude"])
            location["longitude"] = float(loc["longitude"])

    price_ranges = ev.get("priceRanges") or []
    price = float(min((p.get("min", 0) for p in price_ranges), default=0) or 0)

    description = ev.get("info") or ev.get("pleaseNote") \
        or f"{title} — tickets and details available on Ticketmaster."

    return {
        "organizer_id": TICKETMASTER_ORGANIZER_ID,
        "title": title[:200],
        "description": description,
        "category": segment,
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


# ── Discovery API crawl ────────────────────────────────────────────────────────
def fetch_slice(
    session: requests.Session,
    api_key: str,
    city: str,
    country_code: str,
    segment: str,
    max_pages: int,
) -> Iterable[dict]:
    """Yield raw Discovery event objects for one (city, segment) bucket."""
    for page in range(max_pages):
        params = {
            "apikey": api_key,
            "city": city,
            "countryCode": country_code,
            "classificationName": segment,
            "size": PAGE_SIZE,
            "page": page,
            "sort": "date,asc",
        }
        try:
            resp = session.get(DISCOVERY_URL, params=params, timeout=30)
        except requests.RequestException as e:
            logger.warning("    ! request failed (%s / %s p%d): %s", city, segment, page, e)
            return

        if resp.status_code == 429:
            logger.warning("    ... rate limited, backing off 5s")
            time.sleep(5)
            continue
        if resp.status_code != 200:
            logger.warning(
                "    ! HTTP %d (%s / %s p%d): %s",
                resp.status_code, city, segment, page, resp.text[:120],
            )
            return

        data = resp.json()
        events = (data.get("_embedded") or {}).get("events") or []
        if not events:
            return
        yield from events

        total_pages = (data.get("page") or {}).get("totalPages", 0)
        if page + 1 >= min(total_pages, max_pages):
            return
        time.sleep(REQUEST_INTERVAL)


def upsert(session: requests.Session, payload: dict) -> str:
    """POST a normalised event to the ingest endpoint. Returns 'ok' or 'fail'."""
    try:
        r = session.post(INGEST_URL, json=payload, timeout=15)
        if r.status_code in (200, 201):
            return "ok"
        logger.warning("    x ingest %d: %s (%s)", r.status_code, payload["title"][:50], r.text[:100])
        return "fail"
    except requests.RequestException as e:
        logger.warning("    ! ingest error: %s — %s", payload["title"][:50], e)
        return "fail"


# ── Orchestration ──────────────────────────────────────────────────────────────
def run(cities: list[dict], max_pages: int, dry_run: bool) -> None:
    api_key = _load_api_key()
    session = requests.Session()

    seen: set[str] = set()  # de-dupe across overlapping buckets within this run
    fetched = ingested = failed = 0
    started = time.time()

    mode = "DRY RUN (no writes)" if dry_run else f"writing to {INGEST_URL}"
    logger.info("Ticketmaster sync - %s", mode)
    logger.info("Cities: %s | segments: %d | max pages/bucket: %d",
                ", ".join(c["city"] for c in cities), len(SEGMENTS), max_pages)
    logger.info("-" * 60)

    for c in cities:
        logger.info("%s (%s)", c["city"], c["countryCode"])
        for segment in SEGMENTS:
            bucket_count = 0
            for raw in fetch_slice(session, api_key, c["city"], c["countryCode"], segment, max_pages):
                ext_id = raw.get("id")
                if not ext_id or ext_id in seen:
                    continue
                seen.add(ext_id)

                payload = normalize_event(raw, segment_hint=segment)
                if payload is None:
                    continue
                fetched += 1
                bucket_count += 1

                if dry_run:
                    continue
                result = upsert(session, payload)
                if result == "ok":
                    ingested += 1
                else:
                    failed += 1
            if bucket_count:
                logger.info("    %-16s %d events", segment, bucket_count)
            time.sleep(REQUEST_INTERVAL)

    elapsed = time.time() - started
    logger.info("-" * 60)
    if dry_run:
        logger.info("Done in %.1fs. %d unique events fetched (dry run - nothing written).",
                    elapsed, fetched)
    else:
        logger.info("Done in %.1fs. %d fetched, %d upserted, %d failed.",
                    elapsed, fetched, ingested, failed)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Sync Ticketmaster events into EventMind.")
    p.add_argument("--city", help="Only sync this configured city (e.g. 'London').")
    p.add_argument("--max-pages", type=int, default=MAX_PAGES,
                   help=f"Pages per (city, segment) bucket, 1-{MAX_PAGES} (default {MAX_PAGES}).")
    p.add_argument("--dry-run", action="store_true", help="Fetch and normalise only; do not write.")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    cities = CITIES
    if args.city:
        cities = [c for c in CITIES if c["city"].lower() == args.city.lower()]
        if not cities:
            logger.error("Unknown city '%s'. Configured: %s",
                         args.city, ", ".join(c["city"] for c in CITIES))
            return 1
    max_pages = max(1, min(args.max_pages, MAX_PAGES))
    run(cities, max_pages=max_pages, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
