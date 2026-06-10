import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import httpx
from openai import OpenAI

from app.db.session import get_db
from app.models.event import Event
from app.core.config import settings

router = APIRouter(prefix="/events", tags=["Event Chat"])
logger = logging.getLogger(__name__)


# ── Request / Response schemas ─────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    user_id: UUID
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    role: str = "assistant"


# ── Access check ───────────────────────────────────────────────────────────────

async def _user_has_ticket(event_id: str, user_id: str) -> bool:
    """Return True if the user holds a valid ticket for this event."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"{settings.TICKETING_SERVICE_URL}/tickets/user/{user_id}"
            )
            if r.status_code != 200:
                return False
            tickets = r.json()
            return any(str(t.get("event_id")) == event_id for t in tickets)
    except Exception as e:
        logger.warning(f"Ticket check failed for user {user_id}: {e}")
        return False


# ── System prompt builder ──────────────────────────────────────────────────────

def _build_system_prompt(event: Event, is_organizer: bool) -> str:
    loc = event.location or {}
    address = loc.get("address") or loc.get("name") or "Online"
    event_type = getattr(event, "event_type", None) or loc.get("event_type", "In-Person")
    tags = getattr(event, "tags", None) or []
    target_audience = getattr(event, "target_audience", None) or ""
    event_website = getattr(event, "event_website", None) or ""
    language = getattr(event, "language", None) or "English"

    role_note = (
        "You are speaking with the EVENT ORGANISER. You can share internal details if asked."
        if is_organizer
        else "You are speaking with a REGISTERED ATTENDEE."
    )

    return f"""You are the official AI event assistant for "{event.title}".

{role_note}

EVENT DETAILS:
- Title: {event.title}
- Category: {event.category}
- Format: {event_type}
- Language: {language}
- Date: {event.start_date.strftime('%A, %B %d %Y at %H:%M')} — {event.end_date.strftime('%H:%M')}
- Location: {address}
- Price: {"Free" if float(event.price) == 0 else f"${float(event.price):.2f}"}
- Capacity: {event.capacity} attendees
- Target audience: {target_audience or "General public"}
- Tags: {", ".join(tags) if tags else "N/A"}
- Event website: {event_website or "N/A"}
- Description: {event.description or "No description provided."}

YOUR ROLE:
- Answer questions about this event clearly and helpfully.
- Help attendees know what to bring, where to go, what to expect.
- If you don't know a specific detail not in the event data, say so honestly.
- Keep replies concise — 2–4 sentences unless a longer answer is clearly needed.
- Do not answer questions unrelated to this event or the EventMind platform.
- Always be warm, professional, and on-brand for EventMind."""


# ── Chat endpoint ──────────────────────────────────────────────────────────────

@router.post("/{event_id}/chat", response_model=ChatResponse)
async def event_chat(
    event_id: UUID,
    body: ChatRequest,
    db: Session = Depends(get_db),
):
    # 1. Load event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. Access control: must be organizer OR have a valid ticket
    is_organizer = str(event.organizer_id) == str(body.user_id)
    if not is_organizer:
        has_ticket = await _user_has_ticket(str(event_id), str(body.user_id))
        if not has_ticket:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You must be registered for this event to use the chat."
            )

    # 3. Guard: OpenAI key must be present
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI chat is not configured. OPENAI_API_KEY is missing."
        )

    # 4. Build messages for OpenAI
    system_prompt = _build_system_prompt(event, is_organizer)
    messages = [{"role": "system", "content": system_prompt}]

    # Append conversation history (cap at last 20 turns to stay within context)
    for msg in (body.history or [])[-20:]:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": body.message})

    # 5. Call OpenAI (run sync client in thread to avoid event loop issues on Windows)
    def call_openai() -> str:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.6,
            max_tokens=400,
        )
        return response.choices[0].message.content or ""

    try:
        reply = await asyncio.to_thread(call_openai)
    except Exception as e:
        logger.error(f"OpenAI call failed for event {event_id}: {e}")
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable. Please try again.")

    return ChatResponse(reply=reply)
