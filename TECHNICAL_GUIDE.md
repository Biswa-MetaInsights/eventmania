# NewFind (NewFind) — Technical Reference

For the full end-to-end documentation including deployment and Ticketmaster sync, see **[DOCUMENTATION.md](DOCUMENTATION.md)**.

---

## Architecture Overview

NewFind is built as a distributed microservices platform. All client traffic enters through a single API gateway that proxies to the appropriate backend service by URL prefix.

| Component | Tech | Purpose |
|---|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 | Web UI |
| Backend | Python 3.10+, FastAPI | 12 microservices |
| Communication | Kafka (mocked in dev) + Redis (mocked in dev) | Async events, caching |
| Identity | JWT (HS256), bcrypt | Stateless auth |
| Database | PostgreSQL (one DB per service) | Strict data isolation |
| Gateway | FastAPI proxy | Unified entry point |

---

## Authentication Flow

```
POST /auth/register → Auth Service → creates User + Profile → 201
POST /auth/login    → Auth Service → returns { access_token, refresh_token }
Frontend stores token in localStorage (key: newfind-auth)
All requests: Authorization: Bearer <token>
Gateway forwards header unchanged to each service
```

JWT payload: `{ sub: <uuid>, email, role, exp }`. `sub` is used as `organizer_id` when creating events.

---

## Ticketing & Concurrent Safety

To prevent overbooking, the Ticketing service uses Redis distributed locking:

1. **Reserve** — Ticketing service sets a Redis key `event:<id>:lock` with a 10-minute TTL
2. **Pay** — Attendee completes Stripe checkout within the window
3. **Confirm** — Payment webhook fires → Redis lock cleared → ticket row set to `issued`

In dev, Stripe is mocked (no real money) and Redis is mocked (`REDIS_HOST=MOCK`).

---

## Agentic Workflows

The Agents service runs CrewAI crews that subscribe to Kafka topics:

| Kafka topic | Crew | What it does |
|---|---|---|
| `event.published` | Moderation crew | Policy check + SEO optimisation |
| `user.registered` | Mosaic crew | Generates an interest profile for the user |
| `ticket.confirmed` | Networking crew | Matches attendees with shared interests |

In dev (mocked Kafka) these do not fire. The service starts but sits idle.

---

## Ticketmaster Ingestion

Single pipeline in `backend/services/recommendation/app/services/ticketmaster_ingestion.py`.

- Triggered on-demand by the frontend city picker (`POST /recommendation/ingest-city`)
- Bulk-triggered by `backend/scripts/sync_ticketmaster.py` (cron for production)
- Idempotent: upserts on `(source, external_id)` — re-running never duplicates
- 60 global cities configured: USA, UAE, Europe, Asia
- Slices by Ticketmaster segment (Music, Sports, Arts, Film, Misc) to beat the 1,000-result-per-query cap

See **[DOCUMENTATION.md §13](DOCUMENTATION.md#13-periodic-ticketmaster-sync--global-cities)** for the full city list and cron schedule.

---

## Database Topology

One PostgreSQL database per stateful service:

| Service | Database |
|---|---|
| Auth | auth_db |
| User | user_db |
| Event | event_db |
| Ticketing | ticketing_db |
| Payment | payment_db |
| Chat | chat_db |
| Review | review_db |
| Community | community_db |

Stateless services (Gateway, Agents, Recommendation, Notification) have no database.

In dev, all services share a single SQLite file (`platform_dev.db`). Switch to Postgres with:

```powershell
docker compose up -d postgres
python backend\scripts\postgres_runner.py
```

---

## Deployment

Target: **Hetzner Cloud VPS + Supabase managed Postgres**.

See **[DOCUMENTATION.md §14](DOCUMENTATION.md#14-deployment-on-hetzner--supabase)** for step-by-step instructions including Nginx config, SSL, Docker Compose, Stripe webhook setup, and cron scheduling.

Estimated cost: ~$45/month (Hetzner CX32 + Supabase Pro + Vercel free tier).
