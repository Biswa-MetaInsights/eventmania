# NewFind (NewFind) — End-to-End Documentation

> Last updated: 2026-06-23  
> Stack: React/Next.js + FastAPI microservices + PostgreSQL  
> This document is the single authoritative reference for the full platform.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend Services](#3-backend-services)
4. [Frontend Application](#4-frontend-application)
5. [Data Models](#5-data-models)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Event Discovery & Ticketmaster Pipeline](#7-event-discovery--ticketmaster-pipeline)
8. [Community System](#8-community-system)
9. [Ticketing & Payments](#9-ticketing--payments)
10. [AI & Recommendation Layer](#10-ai--recommendation-layer)
11. [Real-time Chat](#11-real-time-chat)
12. [Local Development Setup](#12-local-development-setup)
13. [Periodic Ticketmaster Sync — Global Cities](#13-periodic-ticketmaster-sync--global-cities)
14. [Deployment on Hetzner + Supabase](#14-deployment-on-hetzner--supabase)
15. [Known Gaps & Roadmap](#15-known-gaps--roadmap)

---

## 1. Product Overview

NewFind is an AI-powered event discovery platform. Think Eventbrite + Meetup with an AI personalisation layer.

**Core value proposition:**
- Attendees discover events by city, category, and interest — including real events pulled live from Ticketmaster
- Organisers create and manage events with a guided onboarding flow
- Communities group like-minded attendees around a recurring event programme
- AI agents moderate content, match attendees, and generate recommendations

**Who uses it:**
| Role | What they can do |
|---|---|
| Attendee | Browse/search events, buy tickets, join communities, chat with other attendees |
| Organiser | Create events, manage attendees, view revenue stats, build a community |
| Admin (planned) | Platform-level moderation via the Agents service |

---

## 2. System Architecture

```
                          ┌─────────────────────────────┐
Browser (Next.js)  ──────►│  API Gateway  :8000          │
                          │  FastAPI proxy, rate-limits   │
                          └────────────┬────────────────┘
                                       │ routes by prefix
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼              ▼              ▼              ▼                ▼
  Auth :8001     User :8002     Event :8003    Ticketing :8004   Payment :8005
  JWT tokens     Profiles       Discovery      QR tickets        Stripe intents
                 Wishlists      Ingest API     Reservations       Split-pay

        ▼              ▼              ▼              ▼                ▼
  Notify :8006   Chat :8007    Reco :8008      Review :8009     Agents :8010
  Email/push     WebSocket     TM ingestion    Star ratings      CrewAI agents
  (mocked)       rooms         AI generation   Summaries         Moderation

        ▼
  Community :8011
  Groups + events
```

**Rules:**
- All frontend calls go to `:8000` — never directly to a service port
- Gateway routes by URL prefix: `/event/*` → `:8003`, `/auth/*` → `:8001`, etc.
- Community service MUST start before User service (shared table ownership; see CLAUDE.md)

### Technology stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4, Zustand, React Query |
| Backend | Python 3.10+, FastAPI, SQLAlchemy (SQLite dev / PostgreSQL prod) |
| Auth | JWT (HS256), bcrypt hashing, stored in localStorage |
| Payments | Stripe (payment intent + webhook) — mocked in dev |
| Messaging | Kafka topic pub/sub — mocked in dev via `MOCK_KAFKA=TRUE` |
| Cache | Redis — mocked in dev via `REDIS_HOST=MOCK` |
| External data | Ticketmaster Discovery API v2 |
| AI | Gemini + CrewAI agents (Agents service) |

---

## 3. Backend Services

### 3.1 API Gateway `:8000`

Single entry point. Proxies requests to services by URL prefix. Applies a global rate limit of 60 req/min per IP.

```
GET  /event/search?city=London      → :8003/events/search?city=London
POST /auth/login                     → :8001/auth/login
POST /recommendation/ingest-city    → :8008/recommendations/ingest-city
```

Service map in `backend/gateway/main.py`. CORS is open (`*`) in dev — restrict to the frontend domain in production.

### 3.2 Auth Service `:8001`

**Handles:** registration, login, JWT issuance, password management.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account. Returns 201 on success. |
| POST | `/auth/login` | Returns `{ access_token, token_type }` |
| POST | `/auth/refresh` | Exchange refresh token for a new access token |
| GET | `/auth/me` | Return current user from JWT |

JWT payload: `{ sub: <uuid>, email, role }`. `sub` is used as `organizer_id` when creating events. Token lifetime: 30 min (access), 7 days (refresh).

### 3.3 User Service `:8002`

**Handles:** profiles, wishlist, organiser verification, networking profile.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Current user's profile |
| PUT | `/users/me` | Update profile |
| GET | `/users/wishlist` | Saved events |
| POST | `/users/wishlist/{event_id}` | Add to wishlist |
| DELETE | `/users/wishlist/{event_id}` | Remove from wishlist |

### 3.4 Event Service `:8003`

**Handles:** event CRUD, search, ingest (Ticketmaster), capacity tracking.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| GET | `/events/search` | Search by city, lat/lng radius, category, keyword |
| GET | `/events/{id}` | Event detail |
| POST | `/events` | Create event (organiser only) |
| PUT | `/events/{id}` | Update event |
| DELETE | `/events/{id}` | Delete event |
| POST | `/events/ingest` | Upsert an aggregated event (used by TM pipeline) |
| GET | `/events/organizer/{organizer_id}` | All events by organiser |

**Provenance columns on every event row:**
- `source`: `"native"` (organiser-created) or `"ticketmaster"`
- `external_id`: Ticketmaster event ID for aggregated events
- `image_url`: banner image URL

**Search behaviour:** takes `lat`, `lng`, `radius` (km), `category`, `keyword`, `page`, `limit`. Returns a list of `Event` objects sorted by start date ascending.

### 3.5 Ticketing Service `:8004`

**Handles:** ticket reservation, issuance, QR code data.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| POST | `/tickets/reserve` | Reserve a seat (Redis lock for 10 min) |
| POST | `/tickets/confirm` | Convert reservation to issued ticket after payment |
| GET | `/tickets/my` | User's tickets |
| GET | `/tickets/{id}/qr` | QR code data for a ticket |

Tickets are currently also stored in Zustand/localStorage on the frontend (see Known Gaps).

### 3.6 Payment Service `:8005`

**Handles:** Stripe payment intents, webhooks, organiser payouts.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| POST | `/payments/intent` | Create a Stripe PaymentIntent |
| POST | `/payments/webhook` | Stripe webhook receiver |
| GET | `/payments/organizer/{id}` | Revenue summary for an organiser |

In dev: free events use an 800ms fake delay; paid events use a 2s fake Stripe intent. No real money moves in development.

### 3.7 Notification Service `:8006`

Consumes Kafka events and dispatches email/push notifications. Fully mocked in dev — no emails are sent. Configured but not integrated with the frontend yet.

### 3.8 Chat Service `:8007`

**Handles:** WebSocket rooms, message persistence.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| WS | `/chat/ws/{room_id}` | WebSocket connection for a room |
| GET | `/chat/rooms/{room_id}/messages` | Message history |

Room IDs are derived from ticket IDs. Users with a ticket for an event can join that event's chat room. Chat inbox and room list are not yet built on the frontend.

### 3.9 Recommendation Service `:8008`

**Handles:** Ticketmaster ingestion, AI event generation, personalised recommendations.

Key endpoints:
| Method | Path | Description |
|---|---|---|
| POST | `/recommendations/ingest-city` | Trigger TM ingestion for a lat/lng location |
| POST | `/recommendations/generate` | AI-generate placeholder events for a city |
| GET | `/recommendations` | Personalised events for current user |

The Ticketmaster ingestion pipeline lives entirely in `backend/services/recommendation/app/services/ticketmaster_ingestion.py`. See section 7 for full detail.

### 3.10 Review Service `:8009`

**Handles:** star ratings and text reviews for events.

| Method | Path | Description |
|---|---|---|
| POST | `/reviews` | Submit a review (attendee only) |
| GET | `/reviews/event/{id}` | Reviews for an event |
| GET | `/reviews/summary/{id}` | Average rating + count |

### 3.11 Agents Service `:8010`

**Handles:** CrewAI-powered autonomous agents.

Agents subscribe to Kafka topics:
- `event.published` → moderation + SEO optimisation
- `user.registered` → profile enrichment + interest mosaic generation
- `ticket.confirmed` → attendee matching for networking

Not fully integrated with the frontend yet — content moderation pipeline is the most complete part.

### 3.12 Community Service `:8011`

**Handles:** community CRUD, membership, linked events.

| Method | Path | Description |
|---|---|---|
| GET | `/communities/search` | Search communities by city/keyword |
| GET | `/communities/{slug}` | Community detail |
| POST | `/communities` | Create community (organiser, 2+ published events required) |
| POST | `/communities/{id}/join` | Join a community |
| GET | `/communities/{id}/events` | Events linked to a community |

**Critical:** Community service MUST start before User service. Both define a `communities` SQLAlchemy model; whichever starts first wins the `CREATE TABLE`. The community service schema has all required columns.

---

## 4. Frontend Application

### 4.1 Structure

```
frontend_react/
├── apps/web/                    Next.js 16, App Router
│   └── src/
│       ├── app/                 Route pages
│       ├── components/          Shared React components
│       ├── lib/                 Adapters, config
│       └── providers/           React Query provider
└── packages/
    ├── api/src/                 Axios API clients
    ├── store/src/               Zustand stores
    └── types/src/               Shared TypeScript interfaces
```

### 4.2 Pages

| Route | Auth? | Description |
|---|---|---|
| `/` | No | Home — hero carousel, event grid, community carousel, footer |
| `/auth` | No | Login / register (toggle), Google/Facebook buttons (disabled) |
| `/explore` | No | Unified browse — events + communities, search, sort, filters, city picker |
| `/event/[id]` | No | Event detail — description, reviews, sticky booking bar |
| `/checkout/[id]` | Yes | Checkout — free (800ms) or paid (Stripe intent) |
| `/dashboard` | Yes | My Tickets (QR), My Wishlist, Networking Profile |
| `/organizer` | Yes | Organiser console — stats, events table |
| `/organizer/create` | Yes (org) | Create / publish event |
| `/organizer/my-events` | Yes (org) | List own published events |
| `/organizer/onboarding` | Yes | One-time KYC — company name, registration number |
| `/chat/[roomId]` | Yes | Live WebSocket chat room |
| `/community/[slug]` | No | Community detail — hero, linked events |
| `/community/create` | Yes (org) | Create community — eligibility gate (2+ events) |
| `/communities` | No | Redirects → `/explore?view=communities` |

### 4.3 State management

| Store | Key in localStorage | Contents |
|---|---|---|
| `auth-store` | `newfind-auth` | JWT tokens, user object, `isAuthenticated` |
| `tickets-store` | `newfind-tickets` | Purchased tickets (temp; see Known Gaps) |
| `wishlist-store` | `newfind-wishlist` | Saved event IDs |
| `location-store` | (session only) | Selected city, CITIES list, `isOnlineCity()` helper |

### 4.4 API packages

Each service has a corresponding file in `packages/api/src/`:
- `auth.ts` — `authApi.login()`, `register()`, `me()`
- `events.ts` — `eventsApi.search()`, `get()`, `create()`, `myEvents()`
- `communities.ts` — `communitiesApi.search()`, `get()` — used on home page
- `community.ts` — `communityApi.getBySlug()`, `create()` — used on community pages
- `recommendations.ts` — `ingestCity()`, `generateEventsForCity()`
- `organizer.ts` — `organizerApi.get()`, `onboard()`
- `payments.ts` — `paymentsApi.createIntent()`
- `reviews.ts` — `reviewsApi.list()`, `submit()`

### 4.5 Component registry

| File | Purpose |
|---|---|
| `components/EventsCarousel.tsx` | Main event grid + online section. Props: `events`, `isLoading`, `onBookNow`, `locationSlot`. |
| `components/CommunityCarousel.tsx` | Community cards carousel. Adapts via `toCommunityItem()`. |
| `components/EventCard.tsx` | Single event card in the home grid. Uses `@newfind/types Event`. |
| `components/HeroCarousel.tsx` | Auto-rotating hero banner. 5 local PNGs, clip-path wipe animation. |
| `components/CityPicker.tsx` | City selector dropdown. Uses `useLocationStore`. |
| `components/EventChatWidget.tsx` | AI chat overlay on event detail page. |
| `components/Footer.tsx` | Site footer. Green `#184E4A` bg, linen text. |
| `components/navbar/Navbar.tsx` | Sticky nav. Desktop `lg+`, hamburger `<lg`. Auth-aware avatar menu. |
| `lib/card-adapters.ts` | `toCarouselEvent()` and `toCommunityItem()` type adapters. |

### 4.6 Design tokens (non-negotiable)

| Token | Hex | Usage |
|---|---|---|
| Green | `#184E4A` | Buttons, CTAs, active states, icons |
| Linen | `#F2EFEA` | Page bg, navbar bg, card bg, dropdowns |
| Text | `#111827` | All body text and headings |
| Border | `#E2DDD5` | Inputs, cards, dividers |
| Nav border | `#C8C1B8` | Navbar bottom, event card borders |
| Hint | `#9CA3AF` | Placeholder text, secondary labels |

Fonts: **Outfit** (all pages), **Roboto** (event cards only). No other fonts.

---

## 5. Data Models

### Event

```python
class Event(Base):
    id: UUID
    organizer_id: UUID
    title: str (max 200)
    description: str
    category: str          # Creative | Networking | ...
    event_type: str        # In-Person | Online | Hybrid
    location: JSON         # { name, city, country, address, latitude, longitude }
    tags: JSON             # list[str]
    language: str
    event_website: str     # redirect URL for Ticketmaster events
    start_date: datetime
    end_date: datetime
    capacity: int
    price: float
    status: str            # draft | published | cancelled
    source: str            # native | ticketmaster
    external_id: str       # Ticketmaster event ID (for aggregated events)
    image_url: str
    created_at: datetime
    updated_at: datetime
```

### User / Auth

```python
class User(Base):
    id: UUID
    email: str (unique)
    hashed_password: str
    role: str              # attendee | organizer | admin
    is_verified: bool
    created_at: datetime

class Profile(Base):         # User service
    user_id: UUID
    display_name: str
    bio: str
    interests: JSON          # list[str]
    location: str
    avatar_url: str
```

### Community

```python
class Community(Base):
    id: UUID
    organizer_id: UUID
    name: str
    slug: str (unique)
    description: str
    category: str
    location: str
    member_count: int
    price: float
    status: str
    next_event_date: datetime
    image_url: str
    created_at: datetime
```

### Ticket

```python
class Ticket(Base):
    id: UUID
    event_id: UUID
    user_id: UUID
    status: str            # reserved | issued | cancelled
    price_paid: float
    qr_data: str
    created_at: datetime
```

---

## 6. Authentication & Authorization

### Flow

```
1. POST /auth/register → creates User + Profile → 201
2. POST /auth/login    → returns { access_token, refresh_token }
3. Frontend stores tokens in localStorage (key: newfind-auth)
4. All subsequent requests: Authorization: Bearer <token>
5. Gateway forwards header to services unchanged
6. Each service validates JWT independently (no central session store)
```

### JWT structure

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "organizer",
  "exp": 1234567890
}
```

`sub` is the user's UUID and doubles as `organizer_id` when creating events.

### Role guards

- **Organiser-only routes:** `organizerApi.get()` is called on mount; 404 → redirect to onboarding.
- **Auth guard pattern:** `useEffect` watches `useAuthStore.isAuthenticated`, redirects to `/auth` if false.
- Protected routes: `/dashboard`, `/checkout/*`, `/chat/*`, `/organizer/*`

JWT is decoded client-side with `atob()` + `JSON.parse()` — no external library.

---

## 7. Event Discovery & Ticketmaster Pipeline

### 7.1 Native events

Organisers create events via `/organizer/create`. Events are stored with `source="native"` and surface in all search and browse flows.

### 7.2 Ticketmaster aggregated events

Aggregated events are **discover-and-redirect**: NewFind shows the listing; clicking "Buy Tickets" sends the user to `event_website` on Ticketmaster. They do not go through the native checkout or chat flows.

**Ingestion pipeline** (`ticketmaster_ingestion.py`):

```
POST /recommendation/ingest-city?city=London&lat=51.5074&lng=-0.1278&radius=100
          │
          ▼
TicketmasterIngestion.ingest(city, lat, lng, radius)
          │
          ├─ For each SEGMENT in [Music, Sports, Arts & Theatre, Film, Miscellaneous]
          │    └─ Paginate up to 5 pages × 200 events = 1,000 per segment
          │
          ├─ normalize_event() converts each TM event to NewFind schema
          │    ├─ Skips past events
          │    ├─ Maps segment → NewFind category
          │    ├─ Picks best 16:9 banner image
          │    └─ Extracts venue coordinates (when present)
          │
          └─ POST /event/ingest (upsert on source + external_id)
                   → idempotent: re-running updates, never duplicates
```

**Category mapping:**
| Ticketmaster segment | NewFind category |
|---|---|
| Music | Creative |
| Arts & Theatre | Creative |
| Film | Creative |
| Sports | Networking |
| Miscellaneous | Networking |

**Known limitation:** Many Ticketmaster venues lack GPS coordinates. Events without coordinates are saved with `lat:0, lng:0` and will not appear in geo-radius searches. Fix: run venue names through Nominatim or Google Geocoding API in `normalize_event()`.

### 7.3 On-demand vs. scheduled ingestion

**On-demand (current):** The home page triggers `recommendationsApi.ingestCity()` on first visit to each city. Tracked in `localStorage["newfind-ingested-cities"]`. Falls back to AI-generated events if ingestion returns 0.

**Scheduled (production):** Use the `sync_ticketmaster.py` script on a cron. See section 13 for the full city list and scheduling approach.

---

## 8. Community System

Communities are linked to an organiser and represent a recurring audience (e.g. "Bangalore Tech Meetups").

**Eligibility gate:** An organiser must have 2+ published events before creating a community. The create page shows a progress bar until the threshold is met.

**Community detail page** (`/community/[slug]`): hero banner, member count, upcoming linked events, join button.

**Home page carousel:** shows communities near the selected city via `communitiesApi.search()`, adapting results through `toCommunityItem()`.

**Explore page:** communities can be browsed standalone (`?view=communities`) or interleaved with events (`?view=both`).

---

## 9. Ticketing & Payments

### Ticket flow

```
1. User clicks "Book Now" on event detail page (auth guard)
2. Redirects to /checkout/[event_id]
3. Checkout page calls POST /payments/intent to get a Stripe PaymentIntent client secret
4. Free events: skip form, 800ms delay, success modal
5. Paid events: Stripe Elements form, 2s Stripe processing, success modal
6. On success: ticket stored in Zustand (newfind-tickets) + navigate to /dashboard
7. Dashboard shows QR code generated via api.qrserver.com/v1/create-qr-code/?data=<ticket_id>
```

**Current state:** Tickets are stored in Zustand/localStorage only. The backend Ticketing service exists but the frontend does not yet call it to persist tickets. This means tickets are lost if localStorage is cleared.

### Stripe integration

Payment intents are created by the Payment service. In dev, `STRIPE_SECRET_KEY=sk_test_mock` — no real calls are made. For production, set a real Stripe secret key and configure the webhook endpoint at `/payments/webhook`.

---

## 10. AI & Recommendation Layer

### Agents service (CrewAI)

The Agents service subscribes to Kafka topics and runs autonomous workflows:
- **Moderation crew:** reviews new events for policy compliance before publishing
- **Mosaic crew:** generates an interest profile ("mosaic") for each new user
- **Networking crew:** matches attendees with shared interests in a chat room

In dev (mocked Kafka): these do not fire. The service starts but sits idle.

### AI event generation fallback

If `ingestCity()` returns 0 events (city not covered by Ticketmaster), the home page calls `recommendationsApi.generateEventsForCity()` after a 3-second delay. This calls the Recommendation service which uses Gemini to generate plausible-looking placeholder events. These are seeded into the database as `source="ai_generated"`.

---

## 11. Real-time Chat

Chat rooms are scoped to events. Every event has a room identified by the event ID. Only users with a ticket can join.

**WebSocket connection:** `ws://localhost:8007/chat/ws/{room_id}?token=<jwt>`

**Frontend page** (`/chat/[roomId]`):
- Connection status indicator (green dot = connected)
- Messages aligned left (others) / right (self)
- Reconnect logic on disconnect

**Current limitation:** The chat page is only reachable from the ticket card in `/dashboard`. There is no chat inbox or room list in the main navigation.

---

## 12. Local Development Setup

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 20+ (project pins 24.16.0) | `node --version` |
| pnpm | any | `pnpm --version` |
| Git | any | `git --version` |

### Backend setup (first time)

```powershell
# From the newfind/ root
python -m venv .venv
.venv\Scripts\Activate.ps1

python backend\scripts\install_all.py
```

### Start backend (every session)

**Option A — Windows batch launcher (recommended):**
```
double-click start.bat
```
Opens a terminal per service with all env vars pre-set. Press any key in the launcher window to stop all services.

**Option B — Python runner (cross-platform):**
```powershell
.venv\Scripts\Activate.ps1
python backend\scripts\shadow_runner.py
```

### Seed the database (first time only)

```powershell
# With backend running
python backend\scripts\seed_events.py
```

### Start frontend

```powershell
cd frontend_react
pnpm install           # first time only
pnpm --filter @newfind/web dev:webpack
# → http://localhost:3000
```

> **Important:** Use `dev:webpack`, not `dev`. The default Turbopack mode exhausts RAM on machines with 8 GB.

### Environment variables

`apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`newfind/.env` (project root, never committed):
```
TICKETMASTER_API_KEY=your_key
JWT_SECRET=your_64_char_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=your_key
```

### PostgreSQL (alternative to SQLite)

```powershell
docker compose up -d postgres
python backend\scripts\postgres_runner.py

# Seed
$env:PYTHONUTF8=1; python backend\scripts\seed_events.py
python backend\scripts\sync_ticketmaster.py
```

Postgres runs on host port **55432** (mapped from container 5432). DSN: `postgresql://user:password@localhost:55432/<service>_db`.

---

## 13. Periodic Ticketmaster Sync — Global Cities

### Strategy

The `sync_ticketmaster.py` script is a thin launcher that calls `POST /recommendation/ingest-city` for each city. The actual fetch/normalise logic lives in the recommendation service. Running the script periodically keeps the catalogue fresh.

All ingestion is **idempotent** — re-running the script upserts existing events (updates them) rather than creating duplicates, keyed on `(source, external_id)`.

### Recommended schedule

| Frequency | Rationale |
|---|---|
| Every 2 hours | Tier-1 cities (NYC, London, Dubai, Tokyo, Singapore, Mumbai) — high event velocity |
| Every 6 hours | Tier-2 cities (all others) — moderate event velocity |
| Daily at 02:00 UTC | Full sweep of all cities — catch anything missed |

### Expanded city list

Update `backend/scripts/sync_ticketmaster.py` to include the cities below. The script already accepts `--city` and `--radius` CLI flags; no other changes are needed.

**USA (12 cities)**
```python
{"city": "New York",        "lat": 40.7549,  "lng": -73.9840},
{"city": "Los Angeles",     "lat": 34.0522,  "lng": -118.2437},
{"city": "Chicago",         "lat": 41.8781,  "lng": -87.6298},
{"city": "Houston",         "lat": 29.7604,  "lng": -95.3698},
{"city": "Miami",           "lat": 25.7617,  "lng": -80.1918},
{"city": "San Francisco",   "lat": 37.7785,  "lng": -122.4056},
{"city": "Seattle",         "lat": 47.6062,  "lng": -122.3321},
{"city": "Boston",          "lat": 42.3601,  "lng": -71.0589},
{"city": "Las Vegas",       "lat": 36.1699,  "lng": -115.1398},
{"city": "Atlanta",         "lat": 33.7490,  "lng": -84.3880},
{"city": "Dallas",          "lat": 32.7767,  "lng": -96.7970},
{"city": "Denver",          "lat": 39.7392,  "lng": -104.9903},
```

**UAE (3 cities)**
```python
{"city": "Dubai",           "lat": 25.2048,  "lng": 55.2708},
{"city": "Abu Dhabi",       "lat": 24.4539,  "lng": 54.3773},
{"city": "Sharjah",         "lat": 25.3462,  "lng": 55.4209},
```

**Europe (20 cities)**
```python
{"city": "London",          "lat": 51.5074,  "lng": -0.1278},
{"city": "Paris",           "lat": 48.8566,  "lng":  2.3522},
{"city": "Berlin",          "lat": 52.5200,  "lng": 13.4050},
{"city": "Madrid",          "lat": 40.4168,  "lng": -3.7038},
{"city": "Rome",            "lat": 41.9028,  "lng": 12.4964},
{"city": "Amsterdam",       "lat": 52.3676,  "lng":  4.9041},
{"city": "Vienna",          "lat": 48.2082,  "lng": 16.3738},
{"city": "Brussels",        "lat": 50.8503,  "lng":  4.3517},
{"city": "Zurich",          "lat": 47.3769,  "lng":  8.5417},
{"city": "Barcelona",       "lat": 41.3851,  "lng":  2.1734},
{"city": "Stockholm",       "lat": 59.3293,  "lng": 18.0686},
{"city": "Munich",          "lat": 48.1351,  "lng": 11.5820},
{"city": "Warsaw",          "lat": 52.2297,  "lng": 21.0122},
{"city": "Prague",          "lat": 50.0755,  "lng": 14.4378},
{"city": "Lisbon",          "lat": 38.7169,  "lng": -9.1399},
{"city": "Copenhagen",      "lat": 55.6761,  "lng": 12.5683},
{"city": "Oslo",            "lat": 59.9139,  "lng": 10.7522},
{"city": "Helsinki",        "lat": 60.1699,  "lng": 24.9384},
{"city": "Dublin",          "lat": 53.3498,  "lng": -6.2603},
{"city": "Bucharest",       "lat": 44.4268,  "lng": 26.1025},
```

**Asia (25 cities)**
```python
{"city": "Tokyo",           "lat": 35.6762,  "lng": 139.6503},
{"city": "Seoul",           "lat": 37.5665,  "lng": 126.9780},
{"city": "Singapore",       "lat":  1.3521,  "lng": 103.8198},
{"city": "Mumbai",          "lat": 19.0760,  "lng":  72.8777},
{"city": "Delhi",           "lat": 28.6139,  "lng":  77.2090},
{"city": "Bangalore",       "lat": 12.9716,  "lng":  77.5946},
{"city": "Chennai",         "lat": 13.0827,  "lng":  80.2707},
{"city": "Hyderabad",       "lat": 17.3850,  "lng":  78.4867},
{"city": "Kolkata",         "lat": 22.5726,  "lng":  88.3639},
{"city": "Bangkok",         "lat": 13.7563,  "lng": 100.5018},
{"city": "Kuala Lumpur",    "lat":  3.1390,  "lng": 101.6869},
{"city": "Jakarta",         "lat": -6.2088,  "lng": 106.8456},
{"city": "Hong Kong",       "lat": 22.3193,  "lng": 114.1694},
{"city": "Beijing",         "lat": 39.9042,  "lng": 116.4074},
{"city": "Shanghai",        "lat": 31.2304,  "lng": 121.4737},
{"city": "Taipei",          "lat": 25.0330,  "lng": 121.5654},
{"city": "Osaka",           "lat": 34.6937,  "lng": 135.5023},
{"city": "Istanbul",        "lat": 41.0082,  "lng":  28.9784},
{"city": "Riyadh",          "lat": 24.7136,  "lng":  46.6753},
{"city": "Doha",            "lat": 25.2854,  "lng":  51.5310},
{"city": "Karachi",         "lat": 24.8607,  "lng":  67.0011},
{"city": "Dhaka",           "lat": 23.8103,  "lng":  90.4125},
{"city": "Colombo",         "lat":  6.9271,  "lng":  79.8612},
{"city": "Kathmandu",       "lat": 27.7172,  "lng":  85.3240},
{"city": "Thiruvananthapuram", "lat": 8.5241, "lng": 76.9366},
```

**Total: 60 cities**

### API rate limits

Ticketmaster Discovery API free tier: **5 requests/second, 5,000 requests/day**.

Each city × 5 segments × up to 5 pages = up to 25 API calls per city.
60 cities × 25 = 1,500 calls per full sweep.

The ingestion code already sleeps 250ms between pages to stay under 5 req/s. A full 60-city sweep takes roughly **45–60 minutes**. Run the full sweep daily; run tier-1 cities more frequently if budget allows.

**Rate limit management:**
- The ingestion code handles HTTP 429 with a 5-second back-off
- For production, upgrade to a paid Ticketmaster partner key for higher rate limits
- Consider splitting the full city list into batches staggered across hours

### Setting up a cron job (Linux production server)

```bash
# Edit crontab
crontab -e

# Every 2 hours: tier-1 cities
0 */2 * * * cd /app/newfind && /app/.venv/bin/python backend/scripts/sync_ticketmaster_tier1.py >> /var/log/tm_sync.log 2>&1

# Every 6 hours: all cities
0 */6 * * * cd /app/newfind && /app/.venv/bin/python backend/scripts/sync_ticketmaster.py >> /var/log/tm_sync.log 2>&1
```

Create `sync_ticketmaster_tier1.py` as a copy of `sync_ticketmaster.py` with only the 6 tier-1 cities in the `CITIES` list.

### Adding geocoding to fix missing coordinates

Many Ticketmaster events lack venue GPS coordinates and are stored as `lat:0, lng:0`. Fix in `normalize_event()` in `ticketmaster_ingestion.py`:

```python
# After building the location dict, if no coordinates:
if "latitude" not in location and location.get("city"):
    coords = await geocode_city(location["city"], location.get("country"))
    if coords:
        location["latitude"], location["longitude"] = coords

# Geocode helper using Nominatim (free, no API key):
import httpx

async def geocode_city(city: str, country: str = None) -> tuple | None:
    query = f"{city}, {country}" if country else city
    async with httpx.AsyncClient() as c:
        r = await c.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
            headers={"User-Agent": "newfind/1.0"},
        )
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    return None
```

Cache geocoding results in Redis (or a simple dict) to avoid repeated calls for the same venue.

---

## 14. Deployment on Hetzner + Supabase

### Architecture

```
Hetzner Cloud                          Supabase (managed Postgres)
─────────────────────────────          ──────────────────────────
VPS (CX32 or CAX31)                    One project per environment
  ├── Nginx (reverse proxy, SSL)        auth_db, user_db, event_db,
  ├── Docker Compose                    ticketing_db, payment_db,
  │    ├── gateway :8000                chat_db, review_db, community_db
  │    ├── auth :8001
  │    ├── user :8002                  Supabase also provides:
  │    ├── event :8003                   - Realtime (alternative to Kafka)
  │    ├── ticketing :8004               - Storage (event images/banners)
  │    ├── payment :8005                 - Auth (can replace custom auth)
  │    ├── notification :8006            - Edge Functions (optional)
  │    ├── chat :8007
  │    ├── recommendation :8008
  │    ├── review :8009
  │    ├── agents :8010
  │    └── community :8011
  └── Cron (Ticketmaster sync)

Vercel (or Hetzner Nginx)
  └── Next.js frontend (static + SSR)
```

### Step 1 — Provision Hetzner VPS

1. Sign up at hetzner.com/cloud
2. Create a server:
   - **Image:** Ubuntu 24.04
   - **Type:** CX32 (4 vCPU, 8 GB RAM) minimum; CAX31 (Arm64, cheaper) works well
   - **Location:** pick closest to your primary user base (Falkenstein/EU, or Ashburn/US)
   - **SSH key:** add your public key at creation time
3. Assign a **Floating IP** (for zero-downtime redeploys)
4. Enable a **Firewall** allowing only 22 (SSH), 80 (HTTP), 443 (HTTPS)

```bash
# SSH in
ssh root@<server-ip>

# Update and install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin nginx certbot python3-certbot-nginx
```

### Step 2 — Set up Supabase

1. Create a project at supabase.com
2. In **Project Settings → Database**, note the connection string:
   ```
   postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
   ```
3. Create one database per service using the SQL editor:
   ```sql
   CREATE DATABASE auth_db;
   CREATE DATABASE user_db;
   CREATE DATABASE event_db;
   CREATE DATABASE ticketing_db;
   CREATE DATABASE payment_db;
   CREATE DATABASE chat_db;
   CREATE DATABASE review_db;
   CREATE DATABASE community_db;
   ```
   > Supabase runs a single Postgres instance per project. The "databases" above are schemas within the same server — adjust the DSNs to use `?options=-csearch_path%3D<schema>` or just use the default `postgres` database with per-service schemas.

   **Alternatively:** Use the Supabase connection pooler (port 6543 for transaction mode) for production traffic.

4. Note the **anon key** and **service role key** from Project Settings → API.

### Step 3 — Configure environment

On the Hetzner server, create `/app/newfind/.env`:

```bash
# Database — Supabase DSNs (one per service)
AUTH_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?options=-csearch_path=auth
USER_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?options=-csearch_path=users
EVENT_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?options=-csearch_path=events
# ... repeat for each service

# Auth
JWT_SECRET=<64-char random string>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Ticketmaster
TICKETMASTER_API_KEY=<your key>

# AI
GEMINI_API_KEY=<your key>

# Infrastructure (use managed services in production)
REDIS_HOST=<Upstash Redis host or Hetzner Redis>
KAFKA_BOOTSTRAP_SERVERS=<Upstash Kafka or managed Kafka host>
# OR keep mocked for phase 1:
MOCK_KAFKA=TRUE
REDIS_HOST=MOCK

# Frontend URL (for CORS)
FRONTEND_URL=https://app.newfind.io
```

### Step 4 — Docker Compose for production

Create `/app/newfind/docker-compose.prod.yml`:

```yaml
services:
  gateway:
    build: ./backend/gateway
    restart: always
    ports: ["8000:8000"]
    env_file: .env
    environment:
      - FRONTEND_URL=${FRONTEND_URL}

  auth:
    build: ./backend/services/auth
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${AUTH_DB_URL}
      - JWT_SECRET=${JWT_SECRET}

  community:
    build: ./backend/services/community
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${COMMUNITY_DB_URL}

  user:
    build: ./backend/services/user
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${USER_DB_URL}
    depends_on: [community]

  event:
    build: ./backend/services/event
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${EVENT_DB_URL}

  ticketing:
    build: ./backend/services/ticketing
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${TICKETING_DB_URL}

  payment:
    build: ./backend/services/payment
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${PAYMENT_DB_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

  notification:
    build: ./backend/services/notification
    restart: always
    env_file: .env

  chat:
    build: ./backend/services/chat
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${CHAT_DB_URL}

  recommendation:
    build: ./backend/services/recommendation
    restart: always
    env_file: .env
    environment:
      - TICKETMASTER_API_KEY=${TICKETMASTER_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}

  review:
    build: ./backend/services/review
    restart: always
    env_file: .env
    environment:
      - DATABASE_URL=${REVIEW_DB_URL}

  agents:
    build: ./backend/agents
    restart: always
    env_file: .env
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
```

Deploy:
```bash
cd /app/newfind
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 5 — Nginx reverse proxy + SSL

```nginx
# /etc/nginx/sites-available/newfind
server {
    server_name api.newfind.io;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for chat
    location /chat/ws/ {
        proxy_pass http://127.0.0.1:8007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/newfind /etc/nginx/sites-enabled/
certbot --nginx -d api.newfind.io
nginx -t && systemctl reload nginx
```

### Step 6 — Frontend deployment

**Option A — Vercel (simplest):**
```bash
# In frontend_react/apps/web, set environment variable in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://api.newfind.io
```
Push to main → Vercel auto-deploys.

**Option B — Hetzner Nginx (same server):**
```bash
cd /app/newfind/frontend_react
pnpm install
pnpm --filter @newfind/web build

# Output is at apps/web/.next
# Serve via Node or export as static
pnpm --filter @newfind/web start   # runs on :3000
```

Add a second Nginx server block:
```nginx
server {
    server_name app.newfind.io;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

### Step 7 — Cron for Ticketmaster sync

```bash
# Install cron (Ubuntu)
apt install -y cron
crontab -e

# Add these lines:
# Tier-1 cities every 2 hours
0 */2 * * * docker exec newfind-recommendation-1 python -m scripts.sync_tm_tier1 >> /var/log/tm_tier1.log 2>&1

# All cities every 6 hours
0 */6 * * * docker exec newfind-recommendation-1 python /app/backend/scripts/sync_ticketmaster.py >> /var/log/tm_all.log 2>&1
```

Alternatively, run the sync script directly on the host (activate the venv first):
```bash
0 */6 * * * /app/newfind/.venv/bin/python /app/newfind/backend/scripts/sync_ticketmaster.py >> /var/log/tm_sync.log 2>&1
```

### Step 8 — Stripe webhook (production)

1. In the Stripe dashboard, add a webhook endpoint: `https://api.newfind.io/payment/webhook`
2. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Copy the signing secret into `.env` as `STRIPE_WEBHOOK_SECRET=whsec_...`

### Cost estimate

| Resource | Option | Est. monthly cost |
|---|---|---|
| Hetzner CX32 | 4 vCPU, 8 GB RAM, 80 GB SSD | ~€13 |
| Hetzner Floating IP | | ~€4 |
| Supabase Pro | 8 GB DB, 100 GB storage | $25 |
| Vercel Hobby | Frontend (if < 100 GB bandwidth) | Free |
| Ticketmaster API | Free tier (5,000 req/day) | Free |
| Nominatim geocoding | OSM, self-host or public | Free |
| **Total** | | **~$45/month** |

For higher traffic, upgrade to Hetzner CCX23 (8 vCPU, 16 GB) at ~€45 and Supabase Pro at $25.

---

## 15. Known Gaps & Roadmap

### Critical (block production launch)

| Gap | Description | Fix location |
|---|---|---|
| Venue geocoding | Ticketmaster events saved with `lat:0, lng:0` — don't appear in geo-radius search | `ticketmaster_ingestion.py` `normalize_event()` |
| Real ticket persistence | Tickets stored in localStorage only, not the DB | `checkout/[id]/page.tsx` → call `POST /tickets/confirm` |
| CORS lockdown | Gateway uses `allow_origins=["*"]` | `backend/gateway/main.py` — set `FRONTEND_URL` env var |
| Event image upload | No file upload field on organiser create form | `organizer/create/page.tsx` + image storage (Supabase Storage) |

### Important (ship within first month)

| Gap | Description |
|---|---|
| SEO metadata | Event pages need `generateMetadata()` for Google indexing |
| Organiser name on event detail | Shows "NewFind" instead of actual organiser name |
| Notification bell | Icon present, no panel or backend integration |
| Chat inbox | Chat only reachable via ticket card; needs room list in nav |
| Social login | Google/Facebook buttons disabled |
| Networking Profile | Hardcoded interests on dashboard; needs real user profile storage |

### Planned features (post-launch)

| Feature | Notes |
|---|---|
| Ticket tiers | Backend supports single price; multi-tier (Free/Standard/VIP) needs schema change |
| Mobile app | Turborepo has `apps/mobile` scaffold; not started |
| Help page | Footer link exists, no page |
| Real-time notifications | Notification service exists but not wired to frontend |
| Recurring events | No recurrence pattern in the event schema |
| Analytics dashboard | Organiser revenue + attendee stats (Revenue + Attendees currently mocked) |
