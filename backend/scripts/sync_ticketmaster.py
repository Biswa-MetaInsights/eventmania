"""Bulk-trigger Ticketmaster ingestion for EventMind's launch cities.

This is a thin launcher. It does NOT fetch or normalise events itself — that
logic lives in one place: the recommendation service
(backend/services/recommendation/app/services/ticketmaster_ingestion.py),
exposed as POST /recommendation/ingest-city through the gateway. This script
just calls that endpoint once per launch city so the catalogue is populated in
one command. Cron it (e.g. every 30-60 min) for continuous refresh.

PREREQUISITES
    - Backend running (gateway on :8000, recommendation service on :8008).
    - TICKETMASTER_API_KEY set in the project-root .env (the recommendation
      service reads it; see .env.example).
    - Provenance columns present: python backend/scripts/migrate_add_source_columns.py

USAGE
    python backend/scripts/sync_ticketmaster.py                 # all launch cities
    python backend/scripts/sync_ticketmaster.py --city London   # one city
    python backend/scripts/sync_ticketmaster.py --radius 150    # widen the search

Get a free key at https://developer.ticketmaster.com (instant).
"""
import argparse
import logging
import os
import sys
import time

import requests

GATEWAY_URL = os.environ.get("EVENTMIND_GATEWAY_URL", "http://localhost:8000")
INGEST_CITY_URL = f"{GATEWAY_URL}/recommendation/ingest-city"

# Launch cities with centroid coordinates (mirrors the native seed clusters).
CITIES = [
    {"city": "New York", "lat": 40.7549, "lng": -73.9840},
    {"city": "San Francisco", "lat": 37.7785, "lng": -122.4056},
    {"city": "London", "lat": 51.5074, "lng": -0.1278},
    {"city": "Berlin", "lat": 52.5200, "lng": 13.4050},
    {"city": "Amsterdam", "lat": 52.3676, "lng": 4.9041},
    {"city": "Brussels", "lat": 50.8503, "lng": 4.3517},
]

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("sync_ticketmaster")


def run(cities: list[dict], radius: int) -> None:
    session = requests.Session()
    total = 0
    started = time.time()

    logger.info("Ticketmaster sync via %s  (radius %dkm)", INGEST_CITY_URL, radius)
    logger.info("Cities: %s", ", ".join(c["city"] for c in cities))
    logger.info("-" * 60)

    for c in cities:
        params = {"city": c["city"], "lat": c["lat"], "lng": c["lng"], "radius": radius}
        try:
            r = session.post(INGEST_CITY_URL, params=params, timeout=300)
        except requests.RequestException as e:
            logger.warning("  ! %s - request failed: %s", c["city"], e)
            continue

        if r.status_code != 202:
            logger.warning("  x %s - HTTP %d: %s", c["city"], r.status_code, r.text[:120])
            continue

        created = r.json().get("created", 0)
        total += created
        logger.info("  + %-16s %d events", c["city"], created)

    logger.info("-" * 60)
    logger.info("Done in %.1fs. %d events upserted across %d cities.", time.time() - started, total, len(cities))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Bulk-trigger Ticketmaster ingestion for launch cities.")
    p.add_argument("--city", help="Only sync this configured city (e.g. 'London').")
    p.add_argument("--radius", type=int, default=100, help="Search radius in km (default 100).")
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
    run(cities, radius=args.radius)
    return 0


if __name__ == "__main__":
    sys.exit(main())
