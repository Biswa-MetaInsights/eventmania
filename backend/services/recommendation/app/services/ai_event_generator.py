import asyncio
import json
import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

ORGANIZER_ID = "00000000-0000-0000-0000-000000000099"  # AI-generated events marker

SYSTEM_PROMPT = """You are an event data generator for a global event discovery platform.
Generate realistic, varied local events for the given city.
Return ONLY valid JSON — no markdown, no extra text."""

USER_PROMPT_TEMPLATE = """Generate 12 realistic upcoming events happening in or near {city}.

Rules:
- Mix of small community meetups, workshops, networking events, talks, and social gatherings
- Include both free (price: 0) and paid events (price: 10–150)
- Small to medium capacity (20–300 people)
- Spread across the next 30 days
- Use realistic venue names and neighbourhoods for {city}
- Lat/lng must be accurate coordinates within {city} (vary slightly per venue)
- Categories must be one of: Technology, Business, Creative, Networking, Gaming, Education

Return this exact JSON structure:
{{
  "events": [
    {{
      "title": "...",
      "description": "2-3 sentence description of what happens at this event",
      "category": "...",
      "venue_name": "...",
      "latitude": 0.0,
      "longitude": 0.0,
      "price": 0.0,
      "capacity": 0,
      "days_from_now": 1
    }}
  ]
}}"""


class AIEventGenerator:
    def __init__(self):
        self.event_service_url = f"{settings.EVENT_SERVICE_URL}/events/"

    async def generate_and_save(self, city: str, lat: float, lng: float) -> Dict[str, Any]:
        if not settings.OPENAI_API_KEY:
            return {"error": "OPENAI_API_KEY not configured", "created": 0}

        logger.info(f"Generating AI events for {city}...")

        try:
            # Run sync OpenAI client in a thread pool to avoid SSL/event-loop conflicts on Windows
            def call_openai() -> str:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": USER_PROMPT_TEMPLATE.format(city=city)},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.8,
                )
                return response.choices[0].message.content

            raw = await asyncio.to_thread(call_openai)
            data = json.loads(raw)
            ai_events: List[Dict[str, Any]] = data.get("events", [])

        except Exception as e:
            logger.error(f"OpenAI call failed: {type(e).__name__}: {e}")
            return {"error": f"{type(e).__name__}: {e}", "created": 0}

        created = 0
        now = datetime.utcnow()

        async with httpx.AsyncClient(timeout=10.0) as http:
            for ev in ai_events:
                days = max(1, int(ev.get("days_from_now", 1)))
                start = now + timedelta(days=days)
                end = start + timedelta(hours=3)

                payload = {
                    "organizer_id": ORGANIZER_ID,
                    "title": ev.get("title", ""),
                    "description": ev.get("description", ""),
                    "category": ev.get("category", "Networking"),
                    "location": {
                        "name": ev.get("venue_name", city),
                        "latitude": float(ev.get("latitude", lat)),
                        "longitude": float(ev.get("longitude", lng)),
                        "ai_generated": True,
                    },
                    "start_date": start.isoformat() + "Z",
                    "end_date": end.isoformat() + "Z",
                    "capacity": int(ev.get("capacity", 50)),
                    "price": float(ev.get("price", 0)),
                    "status": "published",
                }

                try:
                    r = await http.post(self.event_service_url, json=payload)
                    if r.status_code == 201:
                        created += 1
                except Exception as e:
                    logger.warning(f"Failed to save event '{ev.get('title')}': {e}")

        logger.info(f"AI generated {created} events for {city}")
        return {"city": city, "created": created}


ai_event_generator = AIEventGenerator()
