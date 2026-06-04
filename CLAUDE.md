# EventMind — Project Handover for Claude

> You are picking up an active project. Read this file fully before making any changes.
> When you make a meaningful contribution, update this file and save any new reference documents to `Eventmind_files/`.

> **⚠️ Folder name has a space:** The parent folder is called `Event mind` (with a space). Always wrap paths in quotes in the terminal, e.g. `cd "c:\...\Event mind\eventmind"`. Forgetting the quotes will break commands silently.

---

## Execution Rules (read before every task)

- Before starting any task, identify the exact files needed. Open **only** those files.
- Do **not** explore the full project structure unless explicitly asked.
- Do **not** read `node_modules`, `.next`, `.venv`, `.dart_tool`, or any build/cache directories.
- Do **not** re-read files you have already read in this session.
- If a task touches only one component, open only that component file.
- Always run `pnpm --filter @eventmind/web type-check` after any TypeScript changes. Do not report a task done if type-check fails.
- After completing a task, list only the files you modified.
- **Before building anything complex, state your interpretation of the task and ask Gautham to confirm before proceeding.** This is especially important when: an image or asset is uploaded (do not hand-draw or reconstruct it — ask how to use it), the request is ambiguous, or the implementation could go several different ways. A brief "Here's what I'm planning — does that sound right?" prevents wasted effort.

---

## What Is EventMind?

EventMind is an AI-powered event discovery platform — think Eventbrite meets Meetup, with an AI layer for personalised recommendations and community matching. Users can discover events, register, buy tickets, and chat with other attendees. Organisers can create and manage events.

The project is mid-build. A Flutter Web frontend exists and is partially working. A full React/Next.js frontend has been migrated from it and is the active codebase going forward. The Flutter version is kept as reference only.

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

## Project Structure

Run this once to map the project (Windows PowerShell). Update this section whenever new files are added.

```powershell
Get-ChildItem -Recurse -File | Where-Object {
  $_.FullName -notmatch 'node_modules|\.next|\.git|\.venv|__pycache__|\.dart_tool|build'
} | Resolve-Path -Relative | Sort-Object
```

Current snapshot (last updated this session):

```
frontend_react/apps/web/src/
├── app/
│   ├── auth/page.tsx
│   ├── chat/[roomId]/page.tsx
│   ├── checkout/[id]/page.tsx
│   ├── dashboard/page.tsx
│   ├── event/[id]/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── organizer/create/page.tsx
│   ├── organizer/page.tsx
│   └── page.tsx                        ← home / discovery page
├── components/
│   ├── EventCard.tsx                   ← card used in the main events grid (API-driven)
│   ├── EventsCarousel.tsx              ← main grid + online events section (SAMPLE_EVENTS)
│   ├── HeroCarousel.tsx                ← rotating hero banner
│   └── navbar/Navbar.tsx
├── lib/api-config.ts
└── providers/query-provider.tsx

frontend_react/packages/
├── api/src/        ← Axios client + per-service API functions
├── store/src/      ← Zustand stores (auth-store, tickets-store)
└── types/src/      ← shared TypeScript interfaces

backend/
├── gateway/main.py                     ← API gateway (port 8000)
├── scripts/shadow_runner.py            ← starts all services locally
├── scripts/seed_events.py              ← seeds SQLite with sample events
└── services/
    ├── auth/       (port 8001)
    ├── user/       (port 8002)
    ├── event/      (port 8003)
    ├── ticketing/  (port 8004)
    ├── payment/    (port 8005)
    ├── notification/ (port 8006)
    ├── chat/       (port 8007)
    ├── recommendation/ (port 8008)
    └── review/     (port 8009)
```

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

Press `Ctrl+C` to shut everything down.

**Step 4 (first time only) — Seed the database with events**

The database starts empty. Without seeding, the discovery page will show "No events found." Run this once after the backend is up for the first time:

```powershell
# In a new terminal, with venv activated, from the eventmind/ folder:
python backend\scripts\seed_events.py
```

You only need to do this once. The data is saved to `platform_dev.db` (SQLite) and persists across restarts.

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

## Component Registry

Keep this updated as components are created or significantly changed.

| File | Purpose | Notes |
|---|---|---|
| `components/EventsCarousel.tsx` | Main events grid + online events section | Contains `EventCardItem`, `OnlineEventCard`, `SeeAllTile`, `OnlineEventsRow`, skeleton, filter tabs. Exports `SAMPLE_EVENTS` and `CarouselEvent` type. |
| `components/EventCard.tsx` | Single event card used in the API-driven grid on the home page | Uses `@eventmind/types Event` (different from `CarouselEvent`) |
| `components/HeroCarousel.tsx` | Auto-rotating hero banner at the top of the home page | 4 slides, diagonal wipe animation, 560px height |
| `components/navbar/Navbar.tsx` | Sticky top navigation | Search, dropdowns, auth-aware avatar menu |

> Add new components here as they are created.

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
| Nav border | `#C8C1B8` | Navbar bottom border, event card borders |
| Hint/muted | `#9CA3AF` | Placeholder text, secondary labels |

**Why linen and not white for backgrounds?** `#184E4A` reads as near-black on pure white. Linen gives it the clearly-green appearance the brand needs.

**Colour naming convention (user instructions):**
- When Gautham says **"green"** or **"green shade"** → always use `#184E4A`. Never use any other green (e.g. `#16a34a`, Tailwind `green-*`).
- When Gautham says **"white"** or **"white shade"** (unless he explicitly means pure white) → always use linen `#F2EFEA`. Pure white `#FFFFFF` is only acceptable for text on dark/coloured backgrounds (e.g. badge labels, button text on green).

### Typography

- **Outfit** — primary font for all pages, loaded via `next/font/google` in `layout.tsx`.
- **Roboto** — loaded in `EventsCarousel.tsx` via `next/font/google`, applied to both `EventCardItem` (offline) and `OnlineEventCard` body sections. Do not use elsewhere without approval.

Do not introduce additional fonts without explicit approval.

### Hover states (navbar and interactive elements)
On hover: background → `#184E4A`, text/icon → `#F2EFEA`. This pattern is used throughout the navbar, all dropdown items, and event cards. Maintain it for any new interactive elements.

### Spacing and layout
- Navbar height: 72px, horizontal padding: `px-12` (48px)
- Page content: `px-12` horizontal padding to align with navbar
- Cards: `rounded-2xl`, border `#C8C1B8`, linen background (`#F2EFEA`)
- Buttons: `rounded-xl` or `rounded-2xl`

### Tone of UI copy
Conversational but professional. Avoid jargon. Keep labels short. Example: "Claim Free Ticket" not "Register for Free Event".

---

## Performance Rules

- Use `next/image` for all images. **Never use `<img>` tags.**
- Use `next/link` for all internal navigation. **Never use `<a>` tags directly.**
- Lazy-load components below the fold with `next/dynamic` where appropriate.
- Always provide a meaningful `sizes` prop on `<Image>` components — do not leave it as the default.
- Do not add new npm dependencies without asking first.
- Do not import from `node_modules` paths that are not in `package.json`.

---

## What Has Been Built (React)

For the full technical breakdown, read `Eventmind_files/REACT_MIGRATION.md`.

Summary of working pages:

| Route | What it does |
|---|---|
| `/` | Discovery page — hero carousel, EventsCarousel (grid + online section), event grid |
| `/auth` | Login / register (toggle) |
| `/event/[id]` | Event detail — description, sidebar, Book Now |
| `/checkout/[id]` | Checkout — order summary + payment (free events skip card form) |
| `/dashboard` | User dashboard — My Tickets tab + Networking Profile tab |
| `/organizer` | Organiser console — stats + events table |
| `/organizer/create` | Create/publish a new event |
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
- **EventsCarousel API integration** — currently uses `SAMPLE_EVENTS` hardcoded data. Needs to be wired to `eventsApi.search()` with a `CarouselEvent` adapter.

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
4. **Update the Component Registry above** — whenever a component is created or its purpose changes significantly.
5. **Do not modify the Flutter frontend** — it is reference material only.
6. **Run `pnpm --filter @eventmind/web type-check` before finishing** — all changes must be type-error free. This is non-negotiable.
7. **Match the brand palette exactly** — do not introduce new colours or fonts without approval. Approved fonts: Outfit (global), DM Sans (online event cards only).
8. **Test in the browser** — for UI changes, run the dev server and visually verify the change before reporting it done. Type-checking does not catch visual bugs.
9. **Keep Node.js at v20+** — the project `.nvmrc` pins 24.16.0. If you use nvm, run `nvm use` inside `frontend_react/` to switch automatically.
10. **Do not commit `.env.local`** — it is already in `.gitignore`. Never commit secrets or local environment files.
