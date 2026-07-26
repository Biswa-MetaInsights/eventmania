"""Bulk-trigger Ticketmaster ingestion for NewFind's global city catalogue.

This is a thin launcher. It does NOT fetch or normalise events itself — that
logic lives in one place: the recommendation service
(backend/services/recommendation/app/services/ticketmaster_ingestion.py),
exposed as POST /recommendation/ingest-city through the gateway. This script
calls that endpoint for each configured city so the catalogue is populated in
one command. Cron it for continuous refresh (see DOCUMENTATION.md §13).

PREREQUISITES
    - Backend running (gateway on :8000, recommendation service on :8008).
    - TICKETMASTER_API_KEY set in the project-root .env.
    - Provenance columns present: python backend/scripts/migrate_add_source_columns.py

USAGE
    python backend/scripts/sync_ticketmaster.py                  # all cities
    python backend/scripts/sync_ticketmaster.py --city London    # one city
    python backend/scripts/sync_ticketmaster.py --tier 1         # tier-1 only
    python backend/scripts/sync_ticketmaster.py --radius 150     # wider search

Get a free key at https://developer.ticketmaster.com (instant).
Rate limits: 5 req/s, 5,000 req/day on the free tier.
Full 60-city sweep: ~1,500 API calls, ~45-60 minutes.
"""
import argparse
import logging
import os
import sys
import time

import requests

GATEWAY_URL = os.environ.get("NEWFIND_GATEWAY_URL", "http://localhost:8000")
INGEST_CITY_URL = f"{GATEWAY_URL}/recommendation/ingest-city"

# ── City catalogue ──────────────────────────────────────────────────────────
# tier=1: high event velocity — sync every 2 hours in production
# tier=2: moderate velocity — sync every 6 hours
#
# Coordinates are city centroids. Radius (default 100 km) is set at runtime.
# ────────────────────────────────────────────────────────────────────────────
CITIES = [
    # ── USA ──────────────────────────────────────────────────────────────────
    {"city": "New York",           "lat":  40.7549,  "lng":  -73.9840,  "tier": 1},
    {"city": "Los Angeles",        "lat":  34.0522,  "lng": -118.2437,  "tier": 1},
    {"city": "Chicago",            "lat":  41.8781,  "lng":  -87.6298,  "tier": 1},
    {"city": "Houston",            "lat":  29.7604,  "lng":  -95.3698,  "tier": 2},
    {"city": "Miami",              "lat":  25.7617,  "lng":  -80.1918,  "tier": 2},
    {"city": "San Francisco",      "lat":  37.7785,  "lng": -122.4056,  "tier": 1},
    {"city": "Seattle",            "lat":  47.6062,  "lng": -122.3321,  "tier": 2},
    {"city": "Boston",             "lat":  42.3601,  "lng":  -71.0589,  "tier": 2},
    {"city": "Las Vegas",          "lat":  36.1699,  "lng": -115.1398,  "tier": 2},
    {"city": "Atlanta",            "lat":  33.7490,  "lng":  -84.3880,  "tier": 2},
    {"city": "Dallas",             "lat":  32.7767,  "lng":  -96.7970,  "tier": 2},
    {"city": "Denver",             "lat":  39.7392,  "lng": -104.9903,  "tier": 2},

    # ── UAE ───────────────────────────────────────────────────────────────────
    {"city": "Dubai",              "lat":  25.2048,  "lng":   55.2708,  "tier": 1},
    {"city": "Abu Dhabi",          "lat":  24.4539,  "lng":   54.3773,  "tier": 2},
    {"city": "Sharjah",            "lat":  25.3462,  "lng":   55.4209,  "tier": 2},

    # ── Europe ────────────────────────────────────────────────────────────────
    {"city": "London",             "lat":  51.5074,  "lng":   -0.1278,  "tier": 1},
    {"city": "Paris",              "lat":  48.8566,  "lng":    2.3522,  "tier": 1},
    {"city": "Berlin",             "lat":  52.5200,  "lng":   13.4050,  "tier": 1},
    {"city": "Madrid",             "lat":  40.4168,  "lng":   -3.7038,  "tier": 2},
    {"city": "Rome",               "lat":  41.9028,  "lng":   12.4964,  "tier": 2},
    {"city": "Amsterdam",          "lat":  52.3676,  "lng":    4.9041,  "tier": 2},
    {"city": "Vienna",             "lat":  48.2082,  "lng":   16.3738,  "tier": 2},
    {"city": "Brussels",           "lat":  50.8503,  "lng":    4.3517,  "tier": 2},
    {"city": "Zurich",             "lat":  47.3769,  "lng":    8.5417,  "tier": 2},
    {"city": "Barcelona",          "lat":  41.3851,  "lng":    2.1734,  "tier": 2},
    {"city": "Stockholm",          "lat":  59.3293,  "lng":   18.0686,  "tier": 2},
    {"city": "Munich",             "lat":  48.1351,  "lng":   11.5820,  "tier": 2},
    {"city": "Warsaw",             "lat":  52.2297,  "lng":   21.0122,  "tier": 2},
    {"city": "Prague",             "lat":  50.0755,  "lng":   14.4378,  "tier": 2},
    {"city": "Lisbon",             "lat":  38.7169,  "lng":   -9.1399,  "tier": 2},
    {"city": "Copenhagen",         "lat":  55.6761,  "lng":   12.5683,  "tier": 2},
    {"city": "Oslo",               "lat":  59.9139,  "lng":   10.7522,  "tier": 2},
    {"city": "Helsinki",           "lat":  60.1699,  "lng":   24.9384,  "tier": 2},
    {"city": "Dublin",             "lat":  53.3498,  "lng":   -6.2603,  "tier": 2},
    {"city": "Bucharest",          "lat":  44.4268,  "lng":   26.1025,  "tier": 2},

    # ── Asia ──────────────────────────────────────────────────────────────────
    {"city": "Tokyo",              "lat":  35.6762,  "lng":  139.6503,  "tier": 1},
    {"city": "Seoul",              "lat":  37.5665,  "lng":  126.9780,  "tier": 1},
    {"city": "Singapore",          "lat":   1.3521,  "lng":  103.8198,  "tier": 1},
    {"city": "Mumbai",             "lat":  19.0760,  "lng":   72.8777,  "tier": 1},
    {"city": "Delhi",              "lat":  28.6139,  "lng":   77.2090,  "tier": 1},
    {"city": "Bangalore",          "lat":  12.9716,  "lng":   77.5946,  "tier": 2},
    {"city": "Chennai",            "lat":  13.0827,  "lng":   80.2707,  "tier": 2},
    {"city": "Hyderabad",          "lat":  17.3850,  "lng":   78.4867,  "tier": 2},
    {"city": "Kolkata",            "lat":  22.5726,  "lng":   88.3639,  "tier": 2},
    {"city": "Bangkok",            "lat":  13.7563,  "lng":  100.5018,  "tier": 2},
    {"city": "Kuala Lumpur",       "lat":   3.1390,  "lng":  101.6869,  "tier": 2},
    {"city": "Jakarta",            "lat":  -6.2088,  "lng":  106.8456,  "tier": 2},
    {"city": "Hong Kong",          "lat":  22.3193,  "lng":  114.1694,  "tier": 2},
    {"city": "Beijing",            "lat":  39.9042,  "lng":  116.4074,  "tier": 2},
    {"city": "Shanghai",           "lat":  31.2304,  "lng":  121.4737,  "tier": 2},
    {"city": "Taipei",             "lat":  25.0330,  "lng":  121.5654,  "tier": 2},
    {"city": "Osaka",              "lat":  34.6937,  "lng":  135.5023,  "tier": 2},
    {"city": "Istanbul",           "lat":  41.0082,  "lng":   28.9784,  "tier": 2},
    {"city": "Riyadh",             "lat":  24.7136,  "lng":   46.6753,  "tier": 2},
    {"city": "Doha",               "lat":  25.2854,  "lng":   51.5310,  "tier": 2},
    {"city": "Karachi",            "lat":  24.8607,  "lng":   67.0011,  "tier": 2},
    {"city": "Dhaka",              "lat":  23.8103,  "lng":   90.4125,  "tier": 2},
    {"city": "Colombo",            "lat":   6.9271,  "lng":   79.8612,  "tier": 2},
    {"city": "Kathmandu",          "lat":  27.7172,  "lng":   85.3240,  "tier": 2},
    {"city": "Thiruvananthapuram", "lat":   8.5241,  "lng":   76.9366,  "tier": 2},
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

        if r.status_code not in (200, 202):
            logger.warning("  x %s - HTTP %d: %s", c["city"], r.status_code, r.text[:120])
            continue

        created = r.json().get("created", 0)
        total += created
        logger.info("  + %-20s %d events", c["city"], created)

        # Respect TM rate limit (5 req/s). Each city already sleeps 250ms
        # internally between pages; add a city-level gap to be safe.
        time.sleep(1)

    logger.info("-" * 60)
    logger.info(
        "Done in %.1fs. %d events upserted across %d cities.",
        time.time() - started, total, len(cities),
    )


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Bulk-trigger Ticketmaster ingestion for the global city catalogue."
    )
    p.add_argument("--city", help="Only sync this configured city (e.g. 'London').")
    p.add_argument("--tier", type=int, choices=[1, 2], help="Only sync cities of this tier.")
    p.add_argument("--radius", type=int, default=100, help="Search radius in km (default 100).")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    cities = CITIES

    if args.city:
        cities = [c for c in CITIES if c["city"].lower() == args.city.lower()]
        if not cities:
            logger.error(
                "Unknown city '%s'. Configured: %s",
                args.city, ", ".join(c["city"] for c in CITIES),
            )
            return 1

    if args.tier:
        cities = [c for c in cities if c.get("tier") == args.tier]
        if not cities:
            logger.error("No cities found for tier %d.", args.tier)
            return 1

    run(cities, radius=args.radius)
    return 0


if __name__ == "__main__":
    sys.exit(main())
