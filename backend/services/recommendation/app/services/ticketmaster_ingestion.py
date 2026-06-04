import asyncio
import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

TM_ORGANIZER_ID = "00000000-0000-0000-0000-000000000098"  # Reserved for Ticketmaster events
TM_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
EVENTS_PER_PAGE = 50

# Map Ticketmaster segments to our categories
SEGMENT_MAP = {
    "Music":          "Creative",
    "Sports":         "Networking",
    "Arts & Theatre": "Creative",
    "Film":           "Creative",
    "Miscellaneous":  "Networking",
    "undefined":      "Networking",
}


def _parse_event(ev: Dict[str, Any]) -> Dict[str, Any] | None:
    """Normalise a Ticketmaster event into our EventCreate schema."""
    try:
        name = ev.get("name", "").strip()
        if not name:
            return None

        # Dates
        start_info = ev.get("dates", {}).get("start", {})
        local_date = start_info.get("localDate")
        local_time = start_info.get("localTime", "19:00:00")
        if not local_date:
            return None
        start_dt = datetime.fromisoformat(f"{local_date}T{local_time}")
        end_dt = start_dt + timedelta(hours=3)

        # Skip past events
        if start_dt < datetime.utcnow():
            return None

        # Venue / location
        venues = ev.get("_embedded", {}).get("venues", [{}])
        venue = venues[0] if venues else {}
        venue_name = venue.get("name", "")
        city = venue.get("city", {}).get("name", "")
        country = venue.get("country", {}).get("name", "")
        address = venue.get("address", {}).get("line1", "")
        loc = venue.get("location", {})
        lat = float(loc.get("latitude", 0)) if loc.get("latitude") else None
        lng = float(loc.get("longitude", 0)) if loc.get("longitude") else None

        if not lat or not lng:
            return None

        # Category
        classifications = ev.get("classifications", [{}])
        segment = classifications[0].get("segment", {}).get("name", "undefined") if classifications else "undefined"
        category = SEGMENT_MAP.get(segment, "Networking")

        # Price
        price_ranges = ev.get("priceRanges", [])
        price = float(price_ranges[0].get("min", 0)) if price_ranges else 0.0

        # Event URL and TM ID
        tm_id = ev.get("id", "")
        url = ev.get("url", "")

        full_address = ", ".join(filter(None, [address, city, country]))

        return {
            "organizer_id": TM_ORGANIZER_ID,
            "title": name,
            "description": f"{name} at {venue_name}. {full_address}.",
            "category": category,
            "location": {
                "name": venue_name or city,
                "address": full_address,
                "latitude": lat,
                "longitude": lng,
                "source": "ticketmaster",
                "tm_id": tm_id,
                "url": url,
            },
            "start_date": start_dt.isoformat() + "Z",
            "end_date": end_dt.isoformat() + "Z",
            "capacity": 0,
            "price": price,
            "status": "published",
        }
    except Exception as e:
        logger.debug(f"Skipping event parse error: {e}")
        return None


class TicketmasterIngestion:
    def __init__(self):
        self.api_key = settings.TICKETMASTER_API_KEY
        self.event_service_url = f"{settings.EVENT_SERVICE_URL}/events/"

    async def _fetch_existing_tm_ids(self, http: httpx.AsyncClient) -> set:
        """Fetch all tm_ids already in the DB to avoid duplicates."""
        try:
            r = await http.get(
                f"{settings.EVENT_SERVICE_URL}/events/search",
                params={"organizer_id": TM_ORGANIZER_ID, "status": "published", "limit": 2000},
                timeout=15,
            )
            if r.status_code == 200:
                events = r.json()
                return {
                    e.get("location", {}).get("tm_id")
                    for e in events
                    if isinstance(e.get("location"), dict) and e["location"].get("tm_id")
                }
        except Exception:
            pass
        return set()

    async def ingest(self, city: str, lat: float, lng: float, radius: int = 100) -> Dict[str, Any]:
        if not self.api_key:
            return {"error": "TICKETMASTER_API_KEY not configured", "created": 0}

        logger.info(f"Fetching Ticketmaster events for {city} ({lat},{lng})...")

        params = {
            "apikey": self.api_key,
            "latlong": f"{lat},{lng}",
            "radius": radius,
            "unit": "km",
            "size": EVENTS_PER_PAGE,
            "sort": "date,asc",
            "startDateTime": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        async with httpx.AsyncClient(timeout=15.0) as http:
            # Fetch existing IDs to skip duplicates
            existing_ids = await self._fetch_existing_tm_ids(http)

            try:
                r = await http.get(TM_BASE_URL, params=params)
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                logger.error(f"Ticketmaster API error: {e}")
                return {"error": str(e), "created": 0}

            raw_events: List[Dict] = data.get("_embedded", {}).get("events", [])
            total_available = data.get("page", {}).get("totalElements", 0)
            logger.info(f"Ticketmaster returned {len(raw_events)} events ({total_available} total available)")

            created = 0
            skipped_dup = 0

            for raw in raw_events:
                payload = _parse_event(raw)
                if not payload:
                    continue

                tm_id = payload["location"].get("tm_id")
                if tm_id and tm_id in existing_ids:
                    skipped_dup += 1
                    continue

                try:
                    resp = await http.post(self.event_service_url, json=payload)
                    if resp.status_code == 201:
                        created += 1
                        if tm_id:
                            existing_ids.add(tm_id)
                except Exception as e:
                    logger.warning(f"Failed to save TM event: {e}")

        logger.info(f"Ticketmaster ingestion done: {created} created, {skipped_dup} duplicates skipped")
        return {"city": city, "created": created, "skipped_duplicates": skipped_dup, "total_available": total_available}


ticketmaster_ingestion = TicketmasterIngestion()
