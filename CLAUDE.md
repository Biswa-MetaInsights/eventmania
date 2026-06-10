# EventMind — Project Handover for Claude

> You are picking up an active project. Read this file fully before making any changes.
> When you make a meaningful contribution, update this file and save any new reference documents to `Eventmind_files/`.

> **⚠️ Folder name has a space:** The parent folder is called `Event mind` (with a space). Always wrap paths in quotes in the terminal, e.g. `cd "c:\...\Event mind\eventmind"`. Forgetting the quotes will break commands silently.

---

## What Is EventMind?

EventMind is an AI-powered event discovery platform — think Eventbrite meets Meetup, with an AI layer for personalised recommendations and community matching. Users can discover events, register, buy tickets, and chat with other attendees. Organisers can create and manage events.

The project is mid-build. A Flutter Web frontend exists and is partially working. A full React/Next.js frontend has been migrated from it and is the active codebase going forward. The Flutter version is kept as reference only.

> **Important:** This is React/Next.js — NOT React Native. React Native is a mobile framework. This project is a Next.js web app. Do not confuse the two.

---

## Repository Layout

```
Event mind/
└── eventmind/
    ├── frontend/              ← Flutter Web (reference only, do not modify)
    ├── frontend_react/        ← React/Next.js (active codebase)
    │   ├── apps/web/          ← Next.js app
    │   └── packages/          ← shared types, store, api
    ├── backend/               ← FastAPI microservices
    │   ├── gateway/           ← API gateway (port 8000)
    │   ├── services/          ← auth, event, chat, payment, etc.
    │   └── scripts/           ← shadow_runner.py, bootstrap.py
    └── CLAUDE.md              ← this file

Eventmind_files/               ← all project documents live here
    ├── eventmind_prd.md       ← full Product Requirements Document
    ├── competitor_analysis.md
    └── REACT_MIGRATION.md     ← React frontend technical handover (read this too)
```

**Important:** All project documentation goes into `Eventmind_files/`, not inside `eventmind/`. Keep those folders separate.

---

## Prerequisites

Install these before doing anything else. If you already have them, skip ahead.

| Tool | Required version | How to check |
|---|---|---|
| Python | 3.10 or higher | `python --version` |
| Node.js | 20 or higher (project uses 24.16.0, see `.nvmrc`) | `node --version` |
| pnpm | any recent version | `pnpm --version` |
| Flutter | any recent stable | `flutter --version` (only needed to run the reference Flutter app) |

**Install pnpm** (if not already installed):
```powershell
npm install -g pnpm
```

Git must also be installed. Everything else is handled by the setup steps below.

---

## How to Run

There are two parts to run: the **backend** (Python) and the **React frontend** (Node.js). Run them in separate terminals. Both must be running for the app to work.

---

### Backend — First-Time Setup

Do this once when you first clone the project.

**Step 1 — Create a virtual environment**

A virtual environment keeps the project's Python packages isolated from your system. Run this from inside the `eventmind/` folder:

```powershell
cd "c:\Users\...\Event mind\eventmind"   # navigate to the eventmind folder
python -m venv .venv
```

This creates a `.venv` folder inside `eventmind/`. You only do this once.

**Step 2 — Activate the virtual environment**

Every time you open a new terminal to work on the backend, activate it first:

```powershell
.\.venv\Scripts\Activate.ps1
```

You'll see `(.venv)` appear at the start of your terminal prompt. That means it's active.

> If PowerShell blocks the script with an "execution policy" error, run this first (one time only):
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Step 3 — Install all backend dependencies**

With the venv activated, run the installer script. It walks through every service and installs all required packages:

```powershell
python backend\scripts\install_all.py
```

This may take a few minutes the first time. You only need to re-run it if new packages are added to any `requirements.txt`.

> **Python version note:** Some contributors have needed to manually bump certain package versions in the `requirements.txt` files to match their Python version (e.g. Python 3.12 or 3.13). If you get a dependency error during install or startup, open the `requirements.txt` of the failing service and upgrade the version of the conflicting package.

---

### Backend — Everyday Use

Once the venv is set up, just activate and run:

```powershell
cd "eventmind/"
.\.venv\Scripts\Activate.ps1
python backend\scripts\shadow_runner.py
```

Shadow Mode starts all services on SQLite with mocked Kafka and Redis — no Docker or external databases needed:

| Service | Port |
|---|---|
| API Gateway | 8000 |
| Auth | 8001 |
| User | 8002 |
| Event | 8003 |
| Ticketing | 8004 |
| Payment | 8005 |
| Notification | 8006 |
| Chat (WebSocket) | 8007 |
| Recommendation | 8008 |
| Review | 8009 |

Press `Ctrl+C` to shut everything down.

> **Known startup issue (Windows):** Each service's `config.py` uses `env_file=".env"` which resolves relative to the service's own directory, not the project root. When starting services manually (not via `shadow_runner.py`), you must either:
> - Set env vars in the shell session before launching, **or**
> - Set `PYTHONPATH=<project root>` so the shared `backend.shared` module is importable.
>
> The `shadow_runner.py` script handles this automatically. If you start services manually, run:
> ```powershell
> $env:PYTHONPATH = "D:\path\to\eventmind"
> $env:DATABASE_URL = "sqlite:///platform_dev.db"
> $env:JWT_SECRET = "<value from .env>"
> $env:MOCK_KAFKA = "TRUE"
> $env:REDIS_HOST = "MOCK"
> ```

**Step 4 (first time only) — Seed the database with events**

The database starts empty. Without seeding, the discovery page will show "No events found." Run this once after the backend is up for the first time:

```powershell
# In a new terminal, with venv activated, from the eventmind/ folder:
python backend\scripts\seed_events.py
```

You only need to do this once. The data is saved to `platform_dev.db` (SQLite) and persists across restarts.

**Step 5 (optional) — Populate real events from Ticketmaster**

To fill the catalogue with real, ticketed events (concerts, sports, theatre) for the launch cities, sync from the Ticketmaster Discovery API:

```powershell
# One-time: add your free key to the project-root .env (see .env.example)
#   TICKETMASTER_API_KEY=your_key_here   (get one at developer.ticketmaster.com)

# One-time: add the provenance columns to an existing dev DB
python backend\scripts\migrate_add_source_columns.py

# Sync (full backend must be running — gateway + recommendation service).
python backend\scripts\sync_ticketmaster.py
python backend\scripts\sync_ticketmaster.py --city London --radius 150
```

**How aggregated events work:**
- There is **one** Ticketmaster pipeline. The fetch + normalisation logic lives in `backend/services/recommendation/app/services/ticketmaster_ingestion.py`, exposed as `POST /recommendation/ingest-city?city=&lat=&lng=&radius=` (the frontend city picker calls this on-demand). `backend/scripts/sync_ticketmaster.py` is just a thin launcher that calls that endpoint for each launch city — it does not duplicate any logic.
- Every `events` row now carries `source` (`"native"` for organiser events, `"ticketmaster"` for synced), `external_id` (provider id), and `image_url`.
- Ingestion is idempotent — the pipeline upserts via `POST /event/ingest` on `(source, external_id)`, so re-running updates rather than duplicates. Cron the launcher (every 30–60 min) for continuous refresh; Celery is not needed at this stage.
- Aggregated events are **discover-and-redirect**: the frontend should send users to the event's `event_website` ("Buy on Ticketmaster") rather than into the native checkout/chat flow. Treat them as top-of-funnel; native organiser events remain the long-term value. Respect Ticketmaster's API terms on caching/retention before production.
- The Discovery API caps any single query at 1,000 results, so the pipeline slices by classification segment and paginates within each. Ticketmaster segments are mapped onto EventMind categories (Music→Creative, Sports→Networking, …) so aggregated events sit alongside native ones.

---

### React Frontend — First-Time Setup

You need Node.js (v20+) and pnpm installed. If you don't have pnpm:

```powershell
npm install -g pnpm
```

Then install all frontend dependencies (once):

```powershell
cd "eventmind/frontend_react"
pnpm install
```

Make sure `apps/web/.env.local` exists with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
(There is an `.env.local.example` file you can copy and rename.)

### React Frontend — Everyday Use

```powershell
cd "eventmind/frontend_react"
pnpm --filter @eventmind/web dev
# Opens at http://localhost:3000
```

### Flutter Frontend (reference only — do not modify)

```powershell
cd "eventmind/frontend"
flutter run -d chrome
```

---

## Architecture

### Backend
Microservices architecture. All API calls from the frontend go through the gateway at port 8000, which routes to the appropriate service. Do not call individual service ports directly from the frontend.

Gateway routing pattern: `GET /event/search` → `http://localhost:8003/events/search`

### React Frontend (Turborepo monorepo)
```
frontend_react/
├── apps/web/                  ← Next.js 16, App Router, TypeScript, Tailwind v4
└── packages/
    ├── types/                 ← shared TypeScript interfaces
    ├── store/                 ← Zustand stores (persisted to localStorage)
    └── api/                   ← Axios client + per-service API functions
```

All pages are in `apps/web/src/app/`. Shared logic goes into `packages/` so it can later be reused by the mobile app (planned).

Auth state and tickets are stored in Zustand, persisted to localStorage under the keys `eventmind-auth` and `eventmind-tickets`. If something looks wrong with login or ticket state, clear those keys in DevTools → Application → Local Storage.

The JWT access token payload contains `sub` (user UUID), `email`, and `role`. The `sub` field is used as the organiser ID when creating events.

**Adding a new npm package** to the web app:
```powershell
pnpm --filter @eventmind/web add <package-name>
# or to a shared package:
pnpm --filter @eventmind/api add <package-name>
```

Environment variable — create `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Brand & Design — Read Before Building Any New Page

Before building a new feature, read the PRD at `Eventmind_files/eventmind_prd.md` to understand the product intent. Do not build features that are not in the PRD without confirming with the team first.

EventMind's design is clean, minimal, and premium — inspired by functionhealth.com (aesthetic) and austoentertainment.com (colour palette). **User-friendliness and simplicity are the top priorities.** Do not add unnecessary complexity, decorations, or features.

### Colour palette — use these exact values everywhere, no substitutes

| Token | Hex | Where |
|---|---|---|
| Green | `#184E4A` | Buttons, CTAs, wordmark, active states, icons |
| Linen | `#F2EFEA` | Navbar bg, page bg, dropdown bg, scaffold bg |
| Text | `#111827` | All body text and headings |
| Border | `#E2DDD5` | Input borders, card borders, dividers |
| Nav border | `#C8C1B8` | Navbar bottom border only |
| Hint/muted | `#9CA3AF` | Placeholder text, secondary labels |

**Why linen and not white for backgrounds?** `#184E4A` reads as near-black on pure white. Linen gives it the clearly-green appearance the brand needs.

### Typography
Font: **Outfit** (loaded via `next/font/google` in `layout.tsx`). Already configured — do not add other fonts.

### Hover states (navbar and interactive elements)
On hover: background → `#184E4A`, text/icon → `#F2EFEA`. This pattern is used throughout the navbar and all dropdown items. Maintain it for any new interactive nav elements.

### Spacing and layout
- Navbar height: 72px, horizontal padding: `px-12` (48px)
- Page content: `px-12` horizontal padding to align with navbar
- Cards: `rounded-2xl` or `rounded-3xl`, border `#E2DDD5`, white background
- Buttons: `rounded-xl` or `rounded-2xl`

### Tone of UI copy
Conversational but professional. Avoid jargon. Keep labels short. Example: "Claim Free Ticket" not "Register for Free Event".

---

## What Has Been Built (React)

For the full technical breakdown, read `Eventmind_files/REACT_MIGRATION.md`.

Summary of working pages:

| Route | What it does |
|---|---|
| `/` | Discovery page — hero carousel, event grid, search |
| `/auth` | Login / register (toggle) |
| `/event/[id]` | Event detail — description, sidebar, Book Now |
| `/checkout/[id]` | Checkout — order summary + payment (free events skip card form) |
| `/dashboard` | User dashboard — My Tickets tab + Networking Profile tab |
| `/organizer` | Organiser console — stats + events table |
| `/organizer/create` | Create/publish a new event (with Save as Draft, Event Type toggle, inline validation) |
| `/chat/[roomId]` | Live WebSocket chat room (accessed from ticket card) |

The navbar has: EventMind wordmark, search (debounced to `?q=` URL param), Events dropdown, Communities dropdown (coming soon), Help, notification bell, avatar menu (My Dashboard, Organiser Console, Settings, Log Out).

---

## What Is Not Built Yet

Read the full breakdown in `Eventmind_files/REACT_MIGRATION.md` under "What Is Not Built Yet". Key gaps:

- **Communities** — entire feature is missing. Navbar dropdown shows "coming soon" toast.
- **Chat** — page exists but only reachable via ticket card. No inbox, no room list, not in main nav.
- **Notification bell** — icon present, no panel or backend integration.
- **Help page** — link present, no page.
- **Real ticket issuance** — tickets saved to Zustand/localStorage only, not to the database.
- **Social login** — buttons present but disabled.
- **SEO metadata** — event pages need `generateMetadata()` for Google indexing.
- **Mobile app** — monorepo is structured for it (`apps/mobile`), not started yet.
- **Event image/banner upload** — the schema now has an `image_url` column (populated for synced Ticketmaster events). Native organiser upload (file → storage → `image_url`) is still not wired up; the create form has no image field yet.
- **Ticket tiers** — backend only supports a single price per event; multi-tier (Free/Standard/VIP) needs schema changes.

## Planned Work

### PostgreSQL Migration
- Currently using SQLite (`DATABASE_URL=sqlite:///platform_dev.db`) for local dev.
- Production target is PostgreSQL (already configured in `docker-compose.yml`).
- Each service gets its own database: `auth_db`, `user_db`, `event_db`, `ticketing_db`, etc.
- To switch locally: update `.env` → `DATABASE_URL=postgresql://user:password@localhost:5432/auth_db` and run `docker-compose up postgres -d`.
- No code changes needed — SQLAlchemy handles both dialects.

---

## Flutter Frontend (Reference)

The Flutter version at `eventmind/frontend/` is the original. It has the same pages but uses Riverpod (state), GoRouter (routing), and flutter_secure_storage (token storage). When migrating any remaining feature from Flutter to React, read the corresponding `.dart` file first to understand the intended behaviour, then reimplement — don't copy patterns directly.

Key Flutter files for reference:
- `frontend/lib/ui/components/event_navbar.dart` — navbar logic
- `frontend/lib/blocs/auth_provider.dart` — auth state machine
- `frontend/lib/ui/views/` — all page implementations

---

## Contribution Guidelines

When you complete work in a session:

1. **Update this file (`CLAUDE.md`)** — add anything that would help the next Claude instance pick up without re-asking. Keep it factual and forward-looking, not a session log.
2. **Save new documents to `Eventmind_files/`** — not inside `eventmind/`. That folder is for code only.
3. **Keep `Eventmind_files/REACT_MIGRATION.md` current** — update the "Pages Built" table and "What Is Not Built Yet" section as features are completed.
4. **Do not modify the Flutter frontend** — it is reference material only.
5. **Run `pnpm --filter @eventmind/web type-check` before finishing** — all changes must be type-error free. This is non-negotiable.
6. **Match the brand palette exactly** — do not introduce new colours or fonts. If in doubt, the colours are listed in this file.
7. **Test in the browser** — for UI changes, run the dev server and visually verify the change before reporting it done. Type-checking does not catch visual bugs.
8. **Keep Node.js at v20+** — the project `.nvmrc` pins 24.16.0. If you use nvm, run `nvm use` inside `frontend_react/` to switch automatically.
9. **Do not commit `.env.local`** — it is already in `.gitignore`. Never commit secrets or local environment files.
