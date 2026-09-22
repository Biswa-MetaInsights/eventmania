# NewFind — Project Handover

> **This is the reference half of the project's instructions — read on demand, not automatically.**
> The rules that must be in context *before* you know you need them live in **`CLAUDE.md`** (repo
> root, loaded every session) and **`frontend_react/apps/web/CLAUDE.md`** (the brand and design
> system, loaded when you touch web files). **`CLAUDE.md` → *Where everything lives* is the routing
> table for all of it.**
>
> What's here: how to run the thing, what the architecture is, where the code lives, and the
> component index. **Grep `^## ` for the one section you need** — a whole-file read is a mistake,
> not thoroughness.
>
> **It holds instructions, not history.** "What I did" → `CHANGELOG.md`. "What state it's in" →
> `STATUS.md`. "What's left" → `TODO.md`. "Why it looks like that" → `DESIGN_NOTES.md`.
>
> **No size budget applies here** — nothing pays for this file until someone opens it. That is
> exactly why the standing rules were moved out; see *Keeping these docs true* at the end.

> **⚠️ Folder name has a space.** The parent folder is `Event mind` (with a space). Always quote
> paths in the terminal: `cd "c:\...\Event mind\eventmind"`. Forgetting the quotes breaks commands
> silently.

> **What NewFind is**, and the React/Next.js-vs-React-Native warning: `CLAUDE.md` → *What Is
> NewFind?*. Not repeated here — one definition or they drift.

---

## Repository Layout

```
scratch/
├── Eventmind_files/            ← project DOCUMENTS live here (sibling of "Event mind", not inside it)
│   ├── eventmind_prd.md
│   ├── competitor_analysis.md
│   └── REACT_MIGRATION.md
└── Event mind/
    └── eventmind/              ← repo root (HANDOVER.md, STATUS.md, CHANGELOG.md, TODO.md, DESIGN_NOTES.md)
        ├── frontend_react/     ← Turborepo monorepo
        │   ├── apps/web/       ← Next.js 16, App Router, TypeScript, Tailwind v4
        │   └── packages/       ← types / store / api (shared, for the planned mobile app)
        ├── backend/            ← FastAPI microservices
        │   ├── gateway/        ← API gateway (port 8000)
        │   ├── services/       ← auth, user, event, ticketing, payment, notification,
        │   │                     chat, recommendation, review, agents, community
        │   └── scripts/        ← shadow_runner, postgres_runner, seed_events, sync_ticketmaster, migrations
        ├── start.bat / stop.bat  ← Windows launchers (start.bat holds real keys — git-ignored)
        └── docker-compose.yml
```

**Documentation goes in `Eventmind_files/`, code stays in `eventmind/`.** Keep them separate. The
five handover docs (this file, `STATUS.md`, `CHANGELOG.md`, `TODO.md`, `DESIGN_NOTES.md`) are the
exception — they live at the repo root beside the code they describe.

To map the current file tree:

```powershell
Get-ChildItem -Recurse -File | Where-Object {
  $_.FullName -notmatch 'node_modules|\.next|\.git|\.venv|__pycache__|build'
} | Resolve-Path -Relative | Sort-Object
```

---

## Related Documents

**The routing table for the working docs is `CLAUDE.md` → *Where everything lives*** — which file
answers which question, and how to read each one without opening it whole. It is loaded into every
session already, so it is not repeated here. Two notes that belong with it:

- `STATUS.md` is what you read **first when picking the project up** — what's shipped, partial, not started, and known-wrong-on-purpose.
- The *Component Registry* index below tells you whether a `COMPONENTS.md` row exists before you go looking for one.

**Reference docs in `Eventmind_files/` — these exist, and that's all you need to know by default:**

| Document | What's in it |
|---|---|
| `eventmind_prd.md` | Product requirements — long-term plan, goals, feature scope |
| `competitor_analysis.md` | Competitor landscape and positioning |
| `REACT_MIGRATION.md` | Deeper technical handover on the React frontend |

**Open these only when Gautham asks for something from them** — brainstorming a new feature,
weighing whether to build something, or a question about product direction. **Do not read them to
fix a bug, tweak UI, or implement a feature that's already been decided on.** They are large, and
opening one on a normal task is wasted context.

Separately: **don't build a feature that wasn't asked for.** Confirm scope with Gautham first.

---

## Prerequisites

| Tool | Required version | How to check |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 20+ (project pins 24.16.0 in `.nvmrc`) | `node --version` |
| pnpm | any recent | `pnpm --version` |

Install pnpm with `npm install -g pnpm`. Git must also be installed.

> **Python version gotcha:** contributors have needed to bump package versions in individual
> `requirements.txt` files to match their interpreter (3.12/3.13). If install or startup fails on a
> dependency, open the failing service's `requirements.txt` and bump the offending pin.

---

## How to Run

Two parts, separate terminals: the **backend** (Python) and the **React frontend** (Node). Both must
run for the app to work.

### Backend — first-time setup

From `eventmind/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python backend\scripts\install_all.py
```

> If PowerShell blocks activation with an execution-policy error, run once:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Then seed the database — it starts empty, and without this the discovery page shows "No events
found":

```powershell
python backend\scripts\seed_events.py
```

This seeds **dummy** events for NYC, London, SF, Berlin, Amsterdam, Brussels, Thiruvananthapuram and
online, plus communities for Thiruvananthapuram. Data persists across restarts; re-run only if you
delete `platform_dev.db`.

### Backend — everyday use

**Option A (recommended on Windows):** double-click `start.bat` in `eventmind/`. It opens a terminal
per service with all env vars pre-set and uses the `.venv` Python.

**To stop:** press any key in the main `start.bat` window. If you lost that window, run `stop.bat`.
Stopping the backend does **not** stop the frontend dev server — that's a separate Node process.

> ⚠️ `start.bat` contains real API keys. It is git-ignored and **must never be committed.**

**Option B (cross-platform):** `python backend\scripts\shadow_runner.py` with the venv activated.

Both start every service on SQLite with mocked Kafka and Redis — no Docker needed. Ports are
declared in `shadow_runner.py` / `start.bat`; the gateway is **8000** and is the only one the
frontend talks to.

> **⚠️ The community service must start BEFORE the user service.** Both declare a `communities`
> table in SQLAlchemy — community's schema is the full one, user's is simpler, and `create_all` only
> builds the table once, so whichever starts first wins. Both launchers already order it correctly.
> **Change the startup order and seeding fails with missing-column errors.**

> **Starting a service manually?** Set `PYTHONPATH`, `DATABASE_URL`, `JWT_SECRET`, `MOCK_KAFKA=TRUE`
> and `REDIS_HOST=MOCK` first — see `start.bat` for the exact values.

### Backend on Postgres (optional)

`postgres_runner.py` runs one database per service, matching production. No code or model changes
needed — SQLAlchemy handles both dialects.

```powershell
docker compose up -d postgres          # creates the 8 per-service DBs on first init
python -m pip install psycopg2-binary
python backend\scripts\postgres_runner.py
$env:PYTHONUTF8=1; python backend\scripts\seed_events.py   # UTF8 so seed prints don't crash on cp1252
```

- Only services whose `config.py` declares `DATABASE_URL` get a database. `gateway`, `agents`, `recommendation` and `notification` are stateless.
- **Host port is 55432, not 5432** — `docker-compose.yml` maps `55432:5432` to avoid clashing with a native Postgres. Override via `PG_DSN_BASE`.
- Inspect: `docker compose exec -T postgres psql -U user -d event_db -c "\dt"`.

### Real events from Ticketmaster (optional)

```powershell
# One-time: TICKETMASTER_API_KEY in the project-root .env (free key at developer.ticketmaster.com)
python backend\scripts\migrate_add_source_columns.py
python backend\scripts\migrate_add_currency_column.py   # run AFTER the source migration
python backend\scripts\sync_ticketmaster.py             # full backend must be running
```

- **There is one pipeline.** Fetch + normalisation live in `recommendation/app/services/ticketmaster_ingestion.py`, exposed as `POST /recommendation/ingest-city`. `sync_ticketmaster.py` is a thin launcher over that endpoint — **it duplicates no logic, keep it that way.**
- Ingestion is **idempotent** — upserts via `POST /event/ingest` on `(source, external_id)`. Cron the launcher every 30–60 min for continuous refresh; Celery is not needed yet.
- Aggregated events are **discover-and-redirect** — send users to `event_website` ("Buy on Ticketmaster"), not into native checkout or chat. Native organiser events remain the long-term value.
- The Discovery API caps a query at 1,000 results, so the pipeline slices by classification segment and paginates within each. Ticketmaster segments map onto NewFind categories (Music→Creative, Sports→Networking, …).
- **The ingest is fire-and-forget — never `await` it in the endpoint.** A full city ingest runs ~186s (segment slicing × pagination, above), but the gateway proxies every route on a **30s** timeout, so awaiting it fails *every* call with a misleading `502 … unreachable` while the ingest succeeds underneath. `reco_endpoints` dispatches via `asyncio.create_task` in `_run_ingest()` and returns 202. **Consequence: the 202 carries no `created`/`upserted`/`failed` counts** — poll `/event/search` or read the recommendation service log.
- **`recommendation/main.py` must keep its `logging.basicConfig(level=logging.INFO)`** — without it the root logger has no handler and `_run_ingest`'s completion line (the only report an un-awaited task gives) is silently dropped. Most services still don't configure logging; that's why an app-level `logger.info` can print nothing.
- **The gateway returns `504` on a proxy timeout, not `502`.** `httpx.TimeoutException` subclasses `httpx.RequestError`, so its handler must stay **above** the `RequestError` handler or it is unreachable and a slow-but-healthy service is reported as down again.
- **The home page polls; it does not wait.** `app/page.tsx` re-checks every `INGEST_POLL_MS` (10s) for up to `INGEST_WINDOW_MS` (240s), invalidating the events query so the grid fills as rows land, and only falls back to AI generation if the city is still empty when the window closes. Interval cleared on unmount/city change.
- Respect Ticketmaster's API terms on caching/retention before production.

### Frontend

```powershell
cd "eventmind/frontend_react"
pnpm install                                    # first time only
pnpm --filter @eventmind/web dev                # http://localhost:3000 (Turbopack)
```

`apps/web/.env.local` must exist with `NEXT_PUBLIC_API_URL=http://localhost:8000` (copy
`.env.local.example`).

> **⚠️ If the dev server OOMs: delete `.next`, retry, and only THEN fall back to `dev:webpack`.**
> Deleting is the first move, not the last — see why below.
>
> **Turbopack works on this 8 GB machine.** Retested 2026-09-08 on Next 16.2.6: `Ready in 4.4s`,
> **4** node processes (not the hundreds seen in June), and roughly **12x faster than webpack** —
> `/organizer/events` cold 12.95s → 1.07s, and HMR per file save ~3s (11.9s worst) → **under 1s**.
> That HMR number is the one that matters; it is paid on every save, not once per route.
>
> **Why deleting `.next` comes first:** the June 2026 failure (worker pool exhausting physical RAM,
> hanging the whole laptop) is most likely explained by a **stale 502 MB `.next/dev/cache/turbopack`**
> left behind by an older Next version. Clearing it is what made this retest succeed.
>
> **Turbopack is NOT the lighter option** — ~1184 MB across its 4 processes vs webpack's 964 MB in
> one. It fits, but the margin is thin: it wants ~2.5 GB free at launch, so close what you can first.
> `--max-old-space-size` helps **neither** bundler — Turbopack allocates in Rust, outside the V8 heap.
>
> `dev:webpack` stays in `apps/web/package.json` as the fallback and still works.
> This has **nothing to do with the backend** — the dev server uses the same memory either way.

**Add a package:** `pnpm --filter @eventmind/web add <name>` (or `--filter @eventmind/api`).
**Do not add new dependencies without asking.**

### Dummy vs real data mode

Reads can come from local fixtures (no backend) or the live backend, via `NEXT_PUBLIC_DATA_MODE` in
`apps/web/.env.local`:

```
NEXT_PUBLIC_DATA_MODE=dummy   # local fixtures — UI work with no backend running
NEXT_PUBLIC_DATA_MODE=real    # live backend via the gateway (default when unset)
```

- Implemented in `lib/data-source.ts`: pages import `eventsSource` / `communitiesSource` / `communitySource` instead of the `*Api` objects. Same method shapes and `{ data }` envelope, so call sites are identical.
- **Read paths all switch. Of the WRITES, only the event ones do** — `create`, `update` and `duplicate` — because each can carry the organiser-authored extras and dummy mode is the only place those survive. **Payment always hits the real API**: there is no honest fixture for taking someone's money.
  - **`update()`** is the organiser's edit/cancel/publish. An edit writes a row that must already exist, and in dummy mode it does not, so a PATCH would 404 on every fixture id. The dummy branch mutates the fixture object in module memory instead: **an edit made in dummy mode survives navigation and dies on reload.** That is the honest behaviour for a fixture — do not add a localStorage layer to make it look persistent. ⚠️ **It returns a shallow COPY of the fixture, and the spread is load-bearing** — every caller pipes the result into `queryClient.setQueryData(["event", id], …)`, and the cache is already holding that same object, so returning it unchanged writes a referentially-equal value, React Query treats it as no change, and **nothing re-renders even though the write succeeded.** Publish, cancel, edit and the status select all had this. **Any new dummy-mode mutation that mutates in place must return a fresh reference too.** `ownsEvent()` lives beside it for the same reason: who owns an event is answered differently in each mode.
  - **`create()`** backs `/organizer/create`. Real mode POSTs; dummy mode pushes onto `dummyMyEvents`, same module-memory lifetime as an edit — which is what lets the create form's agenda and FAQ editors actually work in the one mode where they can.
  - ⚠️ **BOTH `create()` and `update()` STRIP the five extras in real mode** (`EXTRA_KEYS` — agenda, announcements, faq, offer_name, image_url). There is no column for any of them, so Pydantic would drop them anyway; stripping makes that visible in one place instead of silent in the network tab. It is the **second** lock — the first is that every authoring control is disabled off `EXTRAS_ARE_LOCAL`. **When the columns land, delete BOTH strips AND `EXTRA_KEYS`**, or they will quietly discard the fields they were added to protect.
  - **`eventsSource.duplicate()` is also a create** — `POST /event/` in real mode, a push onto `dummyMyEvents` in dummy. The copy is **always a draft at `tickets_sold: 0`** and drops the original's announcements; see `DuplicateEventModal`.
- Fixtures in `lib/fixtures/` are API-shaped, with dates computed relative to now so badges stay live. In dummy mode geo/city/price/date filters are ignored so the UI is always populated; only online-vs-offline, a loose text query, and `limit` are honoured. The home page also skips Ticketmaster auto-ingest.
- ⚠️ **There is ONE set of dummy events, seen from two sides.** `lib/fixtures/events.ts` exports three arrays: `dummyEvents` + `dummyOnlineEvents` (other organisers' — discoverable and nothing more) and **`dummyMyEvents`**, the eight events the signed-in developer *owns*. The organiser console draws that third array and nothing else, and **`lib/fixtures/organizer.ts` derives every console figure from it** — rooms, earnings, roll-ups, the hero. **Never hand-write a title or a total in `organizer.ts`**; that is exactly how the dashboard ended up describing five events the rest of the app had never heard of. Details in both files' headers.
- ⚠️ **`dummyEventSearch` returns only published, not-yet-finished events**, matching the real endpoint's `status: "published"` default. `dummyMyEvents` deliberately contains a draft and three finished events so the console's Drafts and Past tabs are populated — they must never reach discovery. `eventsSource.get()` still resolves them by id, so the console's "Manage" link opens a real event page for every row.
- **`NEXT_PUBLIC_*` vars are inlined at dev-server start — restart the server after changing the mode.**

---

## Architecture

### Backend

Microservices. **All frontend calls go through the gateway at port 8000** — never call a service
port directly from the frontend. Routing pattern: `GET /event/search` →
`http://localhost:8003/events/search`.

### Frontend

Next.js 16 App Router in `apps/web/`; shared logic in `packages/` (`types`, `store`, `api`) so it
can be reused by the planned mobile app.

- **State:** Zustand, persisted to localStorage — `eventmind-auth`, `eventmind-tickets`, `eventmind-wishlist`, `eventmind-theme`, `eventmind-chat-unread`, `eventmind-ingested-cities`. If login or ticket state looks wrong, clear those keys in DevTools → Application → Local Storage.
- **Auth:** JWT decoded with `atob()` + `JSON.parse()`, no external library. Payload carries `sub` (user UUID, used as the organiser id when creating events), `email`, `role`.
- **Auth guard pattern:** protected pages (`/dashboard`, `/checkout`, `/chat`, `/organizer/*`) redirect to `/auth` when `useAuthStore.isAuthenticated` is false. ⚠️ Most guards race zustand hydration — see `TODO.md` §5. `/chat` and `app/page.tsx` show the correct `_hasHydrated` pattern.
- **Home page:** fetches events near the selected city plus a separate online query (lat/lng 0,0, so online events show regardless of city). On first visit to a new city it auto-calls `recommendationsApi.ingestCity()` once (tracked in `eventmind-ingested-cities`); if that returns 0 events it falls back to `generateEventsForCity()` after 3 s.
- **`isOnlineCity`:** `CITIES[0]` in `location-store.ts` is the "Online" pseudo-city (country `""`, lat/lng 0,0). Use the exported `isOnlineCity(city)` to detect it and switch queries to `category="online"` instead of a geo radius.

> **⚠️ Online is a FORMAT, not a category.** `event_type` (In-Person / Online / Hybrid) and
> `category` (Music / Creative / …) are orthogonal axes. Never encode "online" as a category on the
> events side. The **communities** side is the documented exception — it has no format filter at
> all, so online communities are expressed with the `Online` pseudo-city.

---

## Component Registry

**The registry itself is `COMPONENTS.md`** — one row per file carrying the **gotcha** you would get
wrong without being told. **Read the row for a file before you touch that file. Do not read the
whole document as a matter of course** — it is long on purpose, and most of it is irrelevant to any
one task. Below is the index only: what exists, and what it is for.

⚠️ **Before you build any UI, look for it in this index first.** If a share button, heart, date row,
price chip, badge, rail, dialog chassis, form field or empty state already exists, **import it** — a
second version is a bug even when it looks fine on its own. **One control = one component; if it
must look different somewhere, add a prop — do not fork the file.**

⚠️ **Communities are PARKED for Phase 2 (2026-08-14) — parked, NOT dead.** Every community-shaped
file is intact and still type-checked, but unreachable at runtime: `/community/*` redirects home.
**Do not delete any of it as dead code, and do not add a call site back** — the requirement is that
a user never encounters the word "community" anywhere. The full file list, the `CommunityCarousel`
trap (its importers are commented out, so tooling reads it as unreferenced) and the restore
checklist: `COMPONENTS.md` and `TODO.md` §12.

### The shared systems — import these, never re-implement

| File | What it is |
|---|---|
| `components/EventIcons.tsx` | **The** glyph set — every icon in the app |
| `components/EventActions.tsx` | **The** round controls — share / wishlist / back / arrow, plus the organiser's edit / duplicate / cancel |
| `components/ModalShell.tsx` | **The** dialog chassis — overlay, panel, title row, close, Escape, click-outside, portal |
| `components/FormControls.tsx` | **The** form primitives — `FormField`, its measured `width` scale, and `inputCls` |
| `components/EventBadges.tsx` | **The** tags — status tags, the category chip, and `CardTagRow` (the card's chip overlay) |
| `components/DetailCard.tsx` | **The** right-column card on both detail pages, plus `DetailStickyBar` |
| `components/Rail.tsx` | **The** full-bleed horizontal card rail |
| `components/Reviews.tsx` | **The** "Attendee Reviews" block |
| `lib/currency.ts` | **The** price formatter — never hand-write a currency symbol |
| `lib/csv.ts` | **The** CSV download — never hand-roll `values.join(",")` |
| `lib/checkin-store.ts` | **The** door record behind Attendees' check-in controls — localStorage, this device only, until `TODO.md` §19.3 |
| `lib/dev-flags.ts` | **The** developer escape hatches — every one gated on `NODE_ENV === "development"` **and** an env var |
| `lib/layout.ts` | `GUTTERS` — **the** standard horizontal padding |
| `lib/pointer.ts` | `hoverCapable()` — guards `onMouseEnter`-driven *state* (menus) so a tap does not open-then-close it |
| `lib/share-event.ts` | **The** share pipeline, both kinds |
| `lib/card-adapters.ts` | API shape → card shape; **the** one place status tags are decided, and `cardImageUrl` |
| `lib/event-extras.ts` | The five organiser-authored extras and their readers — **no backend column for any of them** |
| `lib/event-options.ts` | **The** choice lists behind the event form — category, format, language, audience — shared by create and edit. Alphabetical, "Other" last |
| `lib/image-upload.ts` | The browser-side cover-image upload (downscale → `data:` URL) and `isImageSrc`, the one test both event forms apply |
| `lib/community-events.ts` | `splitCommunityEvents()` — a community's events → upcoming / previous |

### Cards, grids and rails

| File | What it is |
|---|---|
| `components/EventsCarousel.tsx` | Main events grid + online section; exports `EventCardItem` (the card home / `/explore` / `/dashboard` actually use), `CARD_GRID` and `CARD_CTA` |
| `app/dashboard/page.tsx` | My Tickets / My Wishlist / My Events / Profile — the three lists are `EventCardItem`s on `CARD_GRID`; the Profile tab's camera badge opens `ProfilePictureModal` |
| `components/CategoryGrid.tsx` | "Browse by category" rail above the footer |
| `components/FeatureBand.tsx` | "Why NewFind" — participant tiles left, organiser tiles right |
| `components/HeroCarousel.tsx` | Split hero on home — copy left, image right |
| `components/SimilarEvents.tsx` | "Similar events" rail on `/event/[id]` |
| `components/CommunityCarousel.tsx` | Community cards on home — ⚠️ **parked, no call sites** |
| `components/CommunityEventsRail.tsx` | "Events in this community" rail — ⚠️ **parked** |
| `components/SimilarCommunities.tsx` | "Similar communities" rail — ⚠️ **parked** |
| `components/CommunityJoinCard.tsx` | The sidebar card on `/community/[slug]` — ⚠️ **parked** |
| `components/CommunityReviews.tsx` | Attendee reviews on `/community/[slug]` — ⚠️ **parked** |
| `components/EventCard.tsx` | ⚠️ **DEAD — nothing imports it** (`TODO.md` §10) |
| `components/ShareButton.tsx` | ⚠️ **Effectively dead** — use `EventActions.tsx` |

### Chrome, chat and shared UI

| File | What it is |
|---|---|
| `components/navbar/Navbar.tsx` | Sticky top nav, 72px — split by audience (Participants / Organisers) |
| `components/ChatPresence.tsx` | Invisible app-wide listener that lights the navbar chat glow |
| `components/EventChatWidget.tsx` | AI chat widget on `/event/[id]` |
| `components/CityPicker.tsx` | City selector — `CITIES[0]` is the Online pseudo-city |
| `components/ShareModal.tsx` | Desktop fallback when the native share sheet is unavailable |
| `components/Footer.tsx` | Site footer — **intentionally not themed** |
| `components/brand/*` | Official logo, wordmark, lockup, loader |

### The organiser console (`/organizer/events`)

Three sections under one shell — Events, Attendees, Earnings — see `TODO.md` §19 for what is real
and what waits on a backend. **Events is the landing section**, and `/organizer` is a redirect to it.
**Three sections have been removed and none comes back without asking:** *Settings* (2026-09-01 — its
payment terms are now a card at the foot of Earnings; its other three groups are gone), *Event rooms*
(2026-09-01 — attendee conversation belongs to the chat surfaces, and the organiser side of that is
the backend's job, `TODO.md` §19.1), and *Dashboard* (2026-09-07 — it and Events rendered the same
rows off the same `toConsoleRows`, so its overview band moved to the top of Events).

| File | What it is |
|---|---|
| `app/organizer/page.tsx` | `/organizer` → `/organizer/events`. **Outside the `(console)` group on purpose** — inside it, a second file would resolve to the same URL |
| `app/organizer/(console)/layout.tsx` | The console shell: rail, page header, **both** auth gates |
| `components/organizer/ConsoleUI.tsx` | **Every shape the three sections share** — card, stat tile, tabs, pill, table shell, empty states |
| `components/organizer/ConsoleSidebar.tsx` | The section nav — one list, two shapes |
| `components/organizer/ConsoleIcons.tsx` | Console chrome glyphs — nav, actions, pagination |
| `components/organizer/useOrganiser.ts` | Who is running the console and whether they may be here |
| `lib/organizer-rows.ts` | `Event` → the console row, plus the Events page's filter and sort |
| `lib/fixtures/organizer.ts` | Dummy console data — **derived from `dummyMyEvents`, never hand-written** |
| `lib/use-today.ts` | Time-of-day greeting for the console header |
| `components/organizer/OrganiserViewToggle.tsx` | Organiser view ⇄ participant preview, in the hero's control row |
| `components/organizer/OrganiserEventCard.tsx` | The right-column card an organiser gets **instead of** `BookingCard` |
| `components/organizer/EventStatus.tsx` | The Draft / Live / Registration closed / Cancelled state — editable for the organiser, fixed for everyone else — and `lifecycleOf()` |
| `components/organizer/EditEventModal.tsx` | "Edit details" — the organiser's edit dialog |
| `components/organizer/ListEditor.tsx` | **One** repeating-row editor behind all three authored lists, plus their `SPEC` and the read-only `ListSummary` |
| `components/organizer/ListEditorModal.tsx` | **The** dialog every authored list is edited in — event page and create form |
| `components/organizer/EditListModal.tsx` | What "Save changes" means on `/event/[id]`: one mutation behind `ListEditorModal` |
| `components/organizer/DuplicateEventModal.tsx` | "Duplicate event" — copy the plan into a fresh draft |
| `components/organizer/PublishEventModal.tsx` | "Publish event" — the confirmation on a draft |
| `components/organizer/CoverImageField.tsx` | **The** cover-image control — preview, upload, or a pasted link — shared by create and edit |
| `components/organizer/CoverImageModal.tsx` | The create form's dialog around that control — draft, validate, "Save changes" |
| `components/organizer/AudienceChip.tsx` | **The** Target Audience chip — shared by create and edit |
| `components/organizer/CancelEventModal.tsx` | "Cancel event" — the confirmation |
| `components/EventSections.tsx` | The three authored blocks in `/event/[id]`'s left column — **public**, the edit control is not |

### Sharing routes

Both kinds produce two branded graphics via `next/og`, no extra dependencies: a **link unfurl**
(`app/<kind>/[id|slug]/opengraph-image.tsx`, 1200×630) and a **story card**
(`.../story/route.tsx`, 1080×1920). Helpers: `lib/event-media.ts`, `lib/event-server.ts`,
`lib/community-server.ts`. ⚠️ **`event-media.ts` also exports `HERO_SCRIM`** — the one definition of
the hero-photo wash, shared by `/event/[id]`, `/community/[slug]` and the organiser dashboard panel.
**Import it; do not paste a fourth gradient.** ⚠️ **Set `NEXT_PUBLIC_SITE_URL` in production.**
Details and the client/server split: `COMPONENTS.md`.

---


## Brand & Design

**Moved to `frontend_react/apps/web/CLAUDE.md`** — colour tokens, typography and the type scale,
shape, borders, hover, and the responsiveness rules including the Tailwind v4 breakpoint-ordering
trap. It loads itself whenever you touch anything under `apps/web/`, which is the only place those
rules apply, and costs nothing on a backend or docs task. The *reasoning* behind them stays in
`DESIGN_NOTES.md` §7–§8.

---

## Shipping checklist

### Strip the dev bypass

`lib/dev-flags.ts` holds the developer escape hatches — today `SKIP_ORGANIZER_VERIFICATION`, which
opens `/organizer/create` with no verified organiser profile and adds a dev strip to
`/organizer/onboarding`. **Remove all of it as part of shipping**, in this order:

1. Delete `lib/dev-flags.ts`.
2. In `app/organizer/create/page.tsx` — drop the import, reset `verificationChecked` to `useState(false)`, delete the early return in the gate effect, and put the back button back to a plain `router.back()`.
3. In `app/organizer/onboarding/page.tsx` — drop the import, delete the early return that suppresses the verified-organiser redirect, and delete the terracotta-edged dev strip above the header.
4. Remove `NEXT_PUBLIC_SKIP_ORGANIZER_VERIFICATION` from `.env.local.example` and from every developer's `.env.local`.
5. Delete the `lib/dev-flags.ts` row from `COMPONENTS.md` and from this file's *Component Registry*, and `CLAUDE.md`'s guideline 13 with them.

**What this is NOT:** it is not a live hole in production — the reasoning is stated once, in
`CLAUDE.md` guideline 13, along with the corollary that matters more than this checklist.

---

## Keeping these docs true

The instructions are split across three files, and **the split is the point**: everything in a
`CLAUDE.md` is paid for on every turn of every session, and everything here is free until someone
opens it.

| File | Loaded | Budget | Holds |
|---|---|---|---|
| `CLAUDE.md` (root) | every session | **12 KB** | rules you need before you know you need them |
| `frontend_react/apps/web/CLAUDE.md` | when you touch web files | **16 KB** | the brand and design system |
| `HANDOVER.md` (here) | on demand | none | how to run it, architecture, the component index |

**The sorting question is not "is this true" but "would a session get this confidently wrong without
being told?"** A house colour, a type scale, a border width — yes; those belong in a `CLAUDE.md`.
How to start the backend — no; a session will ask, or come here.

- **Over a budget, MOVE a section here and leave a pointer — do not compress sentences.** Extraction is the move: the registry left for `COMPONENTS.md` on 2026-08-31 and took 60 KB with it, while every gotcha survived intact.
- **Point at the source of truth; don't copy it.** Colours, fonts, ports, limits and env vars are *defined* in `globals.css`, `layout.tsx`, `start.bat`, `config.py`, `.env.example`. **Name the file instead of restating the value** — a pointer can't rot, a copy silently does. **This is the strongest rule here:** it makes a whole class of drift structurally impossible.
- **Verify before you write.** Check any factual claim against the code — not against memory, and not against what another section of these docs says. A wrong line will happily propagate itself.
- **Correct in place; never append.** When a rule changes, **edit the original sentence.** Do not add "actually, now…" underneath it. `CHANGELOG.md` is where the before/after belongs.

> **Worked example of the failure this prevents:** the old combined file pointed every session at
> `Eventmind_files/eventmind_prd.md` and `Eventmind_files/REACT_MIGRATION.md` — including a
> "read the PRD before building any new feature" instruction — while its own layout diagram put that
> folder one level too deep. **Every one of those pointers resolved to nothing**, and had for a long
> time. It also told sessions to *"add anything that would help the next session"*, which is how the
> file reached 103 KB and ~26k tokens per session. Both corrected 2026-08-10; the file was split
> into the three above on 2026-09-03.
