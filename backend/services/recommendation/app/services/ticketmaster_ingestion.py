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
from backend.shared.ticketmaster import (
    TM_ORGANIZER_ID, TM_BASE_URL, SOURCE, PAGE_SIZE, MAX_PAGES, SEGMENTS, normalize_event,
)


class TicketmasterIngestion:
    def __init__(self):
        self.api_key = settings.TICKETMASTER_API_KEY
        self.ingest_url = f"{settings.EVENT_SERVICE_URL}/events/ingest"

    async def _upsert(self, http: httpx.AsyncClient, payload: dict) -> bool:
        try:
            r = await http.post(self.ingest_url, json=payload, headers={"X-Internal-Key": settings.INTERNAL_API_KEY}, timeout=15)
            if r.status_code in (200, 201):
                return True
            logger.warning("Ingest %d for '%s': %s", r.status_code, payload["title"][:50], r.text[:120])
        except Exception as e:  # noqa: BLE001 — best-effort per event
            logger.warning("Ingest failed for provider event")
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
                        logger.warning("TM request failed (%s/%s p%d)", city, segment, page)
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
