# NewFind (NewFind)

**AI-powered event discovery platform** — Eventbrite meets Meetup with a personalisation layer.

Users discover events by city, buy tickets, join communities, and chat with other attendees. Organisers create and manage events with a guided onboarding flow. Real events are pulled live from Ticketmaster; AI agents enrich content and match attendees.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4, Zustand |
| Backend | Python 3.10+, FastAPI microservices |
| Database | SQLite (dev) / PostgreSQL (prod via Supabase) |
| Auth | JWT (HS256) |
| Payments | Stripe |
| External data | Ticketmaster Discovery API v2 |
| AI | Gemini + CrewAI agents |

---

## Quick start

**Requirements:** Python 3.10+, Node.js 20+, pnpm

```powershell
# 1. Backend (first time)
python -m venv .venv
.venv\Scripts\Activate.ps1
python backend\scripts\install_all.py

# 2. Start backend (Windows)
start.bat
# OR cross-platform:
python backend\scripts\shadow_runner.py

# 3. Seed database (first time)
python backend\scripts\seed_events.py

# 4. Frontend
cd frontend_react
pnpm install
pnpm --filter @newfind/web dev:webpack
# → http://localhost:3000
```

Create `frontend_react/apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Services

| Service | Port | Purpose |
|---|---|---|
| API Gateway | 8000 | Unified entry point, request proxy |
| Auth | 8001 | JWT registration, login |
| User | 8002 | Profiles, wishlist |
| Event | 8003 | Event CRUD, search, Ticketmaster ingest |
| Ticketing | 8004 | Ticket reservation, QR codes |
| Payment | 8005 | Stripe payment intents |
| Notification | 8006 | Email/push (mocked in dev) |
| Chat | 8007 | WebSocket rooms |
| Recommendation | 8008 | Ticketmaster ingestion, AI generation |
| Review | 8009 | Star ratings |
| Agents | 8010 | CrewAI autonomous agents |
| Community | 8011 | Groups, membership, linked events |

> Community (8011) must start before User (8002). `start.bat` and `shadow_runner.py` handle this automatically.

---

## Documentation

- **[DOCUMENTATION.md](DOCUMENTATION.md)** — full end-to-end reference (architecture, APIs, deployment, Ticketmaster sync)
- **[CLAUDE.md](CLAUDE.md)** — handover guide for Claude AI sessions

---

*A MetaInsights product.*
