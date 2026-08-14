# NewFind (EventMind) — Project Handover for Claude

> You are picking up an active project. Read this file fully before making any changes — it is
> deliberately kept short enough that you can.
>
> **It holds instructions, not history.** Where each kind of writing goes:
>
> | Writing | File |
> |---|---|
> | *How to work on this* — conventions, gotchas, rules still true tomorrow | **`CLAUDE.md`** (here) |
> | *What state things are in right now* — shipped / partial / not started / known-wrong | **`STATUS.md`** (rewritten in place) |
> | *What meaningfully changed* — one short line per feature, decision, or revert | **`CHANGELOG.md`** (appended) |
> | *Specs for what's left to build*, and what's blocked on a decision | **`TODO.md`** |
> | *Why the design is the way it is* — measurements, rejected alternatives | **`DESIGN_NOTES.md`** |
>
> Before you add a line here, check it against the code — see *Keeping this file true* at the end.

> **⚠️ Folder name has a space.** The parent folder is `Event mind` (with a space). Always quote
> paths in the terminal: `cd "c:\...\Event mind\eventmind"`. Forgetting the quotes breaks commands
> silently.

---

## Execution Rules (read before every task)

- Before starting any task, identify the exact files needed. Open **only** those files.
- Do **not** explore the full project structure unless explicitly asked.
- Do **not** read `node_modules`, `.next`, `.venv`, `__pycache__`, or any build/cache directory.
- Do **not** re-read files you have already read in this session.
- If a task touches only one component, open only that component file.
- **After any TypeScript change**, run `pnpm --filter @eventmind/web type-check`. Do not report a task done if it fails.
- **For UI changes, run the dev server and verify visually.** Type-checking does not catch visual bugs.
- **If you change something this file describes, fix the description in the same task** — not at the end, not next session. **A stale instruction is worse than no instruction:** it doesn't just waste tokens, it actively produces wrong work.
- After completing a task, list only the files you modified.
- **Before building anything complex, state your interpretation and confirm before proceeding.** Especially when an image or asset is uploaded (do not hand-draw or reconstruct it — ask how to use it), when the request is ambiguous, or when the implementation could go several ways. A brief "Here's what I'm planning — does that sound right?" prevents wasted effort.

---

## What Is NewFind?

NewFind (formerly EventMind internally) is an AI-powered event discovery platform — think Eventbrite
meets Meetup, with an AI layer for personalised recommendations and community matching. Users
discover events, register, buy tickets, and chat with other attendees. Organisers create and manage
events.

The project is mid-build. The frontend is a React/Next.js web app in `frontend_react/`. It was
originally migrated from a Flutter Web prototype; that Flutter app has since been **deleted**.

> **This is React/Next.js — NOT React Native.** React Native is a mobile framework. This is a
> Next.js web app. Do not confuse the two.

`eventmind` survives as the internal package scope (`@eventmind/web`) and the localStorage key
prefix. **NewFind** is the user-facing name.

---

## Repository Layout

```
scratch/
├── Eventmind_files/            ← project DOCUMENTS live here (sibling of "Event mind", not inside it)
│   ├── eventmind_prd.md
│   ├── competitor_analysis.md
│   └── REACT_MIGRATION.md
└── Event mind/
    └── eventmind/              ← repo root (CLAUDE.md, STATUS.md, CHANGELOG.md, TODO.md, DESIGN_NOTES.md)
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

Don't duplicate these; read the source when you need the detail.

**Working docs — these are part of doing the work:**

| Document | Read it when |
|---|---|
| `STATUS.md` | **First, when picking the project up.** What's shipped, partial, not started, and known-wrong-on-purpose. |
| `TODO.md` | You're about to pick up unbuilt work, or you've hit something that looks broken — check whether it's already logged and whether it's blocked on Gautham. |
| `DESIGN_NOTES.md` | **Before proposing any layout or visual change to a shared surface.** Holds the measurements behind the rules and the alternatives already built and rejected. |
| `CHANGELOG.md` | You need to know *when* or *why* something changed. Rarely needed to do work. |

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
pnpm --filter @eventmind/web dev:webpack        # http://localhost:3000
```

`apps/web/.env.local` must exist with `NEXT_PUBLIC_API_URL=http://localhost:8000` (copy
`.env.local.example`).

> **⚠️ On low-RAM (8 GB) machines use `dev:webpack`, NOT plain `dev`.** Plain `dev` uses Turbopack,
> which spawns a large parallel worker pool; on 8 GB that exhausts physical RAM, Windows starts
> swapping, and **the entire laptop hangs** (unresponsive mouse — disk thrashing, not a crash). The
> workers then die with `Zone Allocation failed / JavaScript heap out of memory`, leaving orphaned
> `node` processes that pile up across runs. `--max-old-space-size` does **not** help — the limit is
> physical RAM, not the heap. `dev:webpack` spawns ~3 workers instead of hundreds.
>
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
- **Only read paths switch.** Mutations (create, pay) always hit the real API.
- Fixtures in `lib/fixtures/` are API-shaped, with dates computed relative to now so badges stay live. In dummy mode geo/city/price/date filters are ignored so the UI is always populated; only online-vs-offline, a loose text query, and `limit` are honoured. The home page also skips Ticketmaster auto-ingest.
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

One line per file: what it is, plus only the **non-obvious gotcha** — the thing you'd get wrong
without being told. Rationale and measurements live in `DESIGN_NOTES.md`. Add a component when you
create one; fix the gotcha when it changes. **Keep entries short.**

> ⚠️ **Communities are PARKED for Phase 2 (2026-08-14) — parked, NOT dead. Do not delete any of it.**
> `CommunityCarousel`, `CommunityJoinCard`, `CommunityEventsRail`, `CommunityReviews` and
> `SimilarCommunities` — plus `lib/community-server.ts`, `lib/community-events.ts`,
> `lib/fixtures/communities.ts`, `toCommunityItem` in `lib/card-adapters.ts`, the community sources
> in `lib/data-source.ts`, and `packages/api/src/communities.ts` + `community.ts` — are all intact
> and still type-checked, but **unreachable at runtime**: `/community/*` redirects to home.
>
> Most of them still have live importers (the `app/community/[slug]/*` files were never edited), so
> the compiler will not flag them. **`CommunityCarousel.tsx` is the exception** — both its page
> importers are commented out, so its components look unreferenced to tooling. It carries a
> do-not-delete header of its own; heed it.
>
> Do not add a call site back either: the requirement is that a user never encounters the word
> "community" anywhere. Their rows below describe how they behave once restored. Restore checklist:
> `TODO.md` §12.

### The shared systems — import these, never re-implement

| File | Purpose | Gotcha |
|---|---|---|
| `components/EventIcons.tsx` | **The** glyph set — every icon in the app | **Never draw another calendar/clock/pin.** Filled set, tuned for 14px. Glyphs are named for what they DRAW, not the tag they serve. Colour is `currentColor` by design — pass `color` only where it differs from surrounding text. No heart here: `EventActions` owns the heart. See `DESIGN_NOTES.md` §4. |
| `components/EventActions.tsx` | **The** round controls: share / wishlist / back / arrow | **Never hand-roll another.** Kind-agnostic despite the `Event*` prefix — pass `kind` (`'event'` \| `'community'`), which drives the share URL, wishlist record and aria-label. `item: ActionItem` is a structural shape both `CarouselEvent` and `CommunityItem` satisfy. Props: `labelSide`, `size` (`'sm'` 32px cards \| `'lg'` 48px standalone). **Need a variant? Add a prop — do not fork the file.** |
| `components/EventBadges.tsx` | **The** tags — status tags (`EventBadge`, `EventBadges`, `BADGE_CONFIG`) and the category chip (`CategoryBadge`, `categoryStyle`) | **Never re-declare `BADGE_CONFIG` or pick your own category colour.** Serves events AND communities (they sat in one mixed grid on `/explore?view=both`, until communities were parked for Phase 2 — the shared-tag rule still holds for when they return). Communities carry a single `badgeType`, events an array — wrap the single one, don't add a second component. `MAX_BADGES` caps status tags at 3 **at the render point** — do not cap at a call site or slice in `toCarouselEvent` (the filter tabs read `badgeTypes` too). Exports `TAG_SHAPE` for non-tag chips that must match the silhouette. `CategoryBadge` takes `size` (`'sm'` default, every card and hero \| `'lg'`, the scaled-up chip `CategoryGrid` overlays on its tiles) and `trailing` (a node rendered inside the chip after the label — `CategoryGrid`'s explore arrow) — **add a prop here rather than forking the chip.** The `'lg'` type size is held to a measurement; see `DESIGN_NOTES.md` §5 before changing it. ⚠️ **Tag labels currently fail WCAG AA — `TAG_LABEL` is the one-line switch to the accessible version.** See `DESIGN_NOTES.md` §3. |
| `components/EventBadges.tsx` → `CardTagRow` | **The** chip overlay for a card | **Use this on any card — never hand-place `CategoryBadge` + `EventBadges` in a card overlay.** Uses `flex-wrap-reverse` so overflow pushes up instead of clipping. The 3-tag cap counts **status tags only** — the category chip shares the bottom row with two of them by design. Heroes are unaffected and use the primitives directly. |
| `lib/currency.ts` | **The** price formatter — `formatPrice`, `formatEventPrice`, `currencySymbol`, `paymentCurrency` | **Never hand-write a currency symbol in a component** — that is exactly how cards ended up showing `₹` while every other surface showed `$`. **Always pass the event's `currency`**; omitting it falls back to INR, which is wrong for Ticketmaster rows carrying real USD/GBP/EUR. `freeLabel` defaults to `"Free"` at price 0 (pass `null` where 0 must render as an amount); `decimals` defaults to false — **checkout opts in**, because rounded parts wouldn't reconcile against the total. No DOM access, so the server-rendered share images can import it. The currency **list** lives in `packages/types` next to `EVENT_FORMATS`. |
| `components/DetailCard.tsx` | **The** right-column card on BOTH detail pages — `DetailCardShell`, `DetailCardHeader`, `DetailCardBody`, `DetailLine`, `DetailPeopleChip`, `DetailAccentChip`, `DetailDivider`, `DetailPriceRow`, `DetailCTA`, plus `DetailStickyBar` and the `DETAIL_ICON` size | **Never hand-roll a second booking/join card** — `/event/[id]`'s `BookingCard` and `CommunityJoinCard` are both thin copy-and-data wrappers over these. They used to be one private copy inside the event page, which is exactly why the community page had no card at all. **`verified` on `DetailCardHeader` draws a shield and is a TRUST CLAIM** — pass it only from a real `verification_status === "verified"`, never for decoration (the event page currently passes it on a hardcoded string; that's `TODO.md` §1, not a licence to copy). `DetailStickyBar` takes `gutters` as a prop so this file needs no layout import. **Need a variant? Add a prop — do not fork.** |
| `components/Rail.tsx` | **The** full-bleed horizontal card rail — `Rail`, `RailToggle`, `RAIL_ITEM`, `RAIL_CARD_BASIS`, `RAIL_GAP` | **Never build another rail.** Serves "Similar events", "Events in this community" and "Similar communities". ⚠️ **DELIBERATELY FULL-BLEED** — a rail must be a sibling *after* the page's capped column, carrying home's `GUTTERS`; inside the cap four cards shrink to ~311px. `RAIL_CARD_BASIS` is **percentages, never `100vw`** (vw includes the scrollbar and double-counts padding — that clipped the fourth card). The rail's vertical padding is **clip room, not spacing** — `-mt-6 -mb-10` cancel it exactly; delete it and the hover border clips. **Do not pin a card height or width.** Full reasoning: `DESIGN_NOTES.md` §2 and §6. `RailToggle` is the segmented Previous/Upcoming switch — 2px border on **both** states so it can't resize on click. |
| `components/Reviews.tsx` | **The** "Attendee Reviews" block — `ReviewsSection`, `ReviewCard` | Used by `/event/[id]` and (via `CommunityReviews`) `/community/[slug]`. Its rounded rating star is **not** `EventIcons.StarIcon` — that one is the sharp 5-point "Recommended" tag glyph. Two concepts, two shapes; don't unify them. Pass `average`/`count` only when there's something to average — the block hides the aggregate rather than showing `0.0`. |
| `lib/layout.ts` | `GUTTERS` — the standard horizontal padding | **Import it; never hand-write `px-4 sm:px-6 lg:px-12`.** That's how eleven pages ended up on a flat `px-12` while the navbar stepped down correctly. |
| `lib/card-adapters.ts` | API shape → card shape | `toCarouselEvent`, `toCommunityItem`. **This is the single place that decides which status tags an event gets** — a `BADGE_CONFIG` entry nothing emits here is dead (see `TODO.md` §2). Placeholder images are `picsum.photos/seed/<id>`. |
| `lib/community-events.ts` | `splitCommunityEvents()` — a community's events → `{ upcoming, previous }` | "Previous" means **finished**, so it reads `end_date` and only falls back to `start_date` — a multi-day festival stays Upcoming while it's still running. It lives in `lib/` (not in the page) because calling `Date.now()` in a component body trips the `react-hooks/purity` lint rule. |
| `lib/share-event.ts` | Share pipeline for both kinds | **`shareItem(kind, item)` is the entry point** — `kind` doubles as the URL segment, so `/event/…` and `/community/…` are derived, never hardcoded. `shareEvent()` is a back-compat wrapper. **Adding a third shareable type? Extend `ShareKind` and add the three route files — do not write a second share flow.** |

### Cards, grids and rails

| File | Purpose | Gotcha |
|---|---|---|
| `components/EventsCarousel.tsx` | Main events grid + online section | Exports `CarouselEvent` **and `EventCardItem`** — the card actually used by home, `/explore` and `/community/[slug]` (**not** `EventCard.tsx`). Also exports `SkeletonCard`. Meta row is icon-delimited and **packed left**; `OnlineEventCard` carries an identical row (third glyph is `VideoCallIcon`, not the pin) — **change both together or they drift.** ⚠️ The row truncates the venue at `xl:grid-cols-4` (`TODO.md` §6), and its filter tabs are pills in violation of the shape rule (`TODO.md` §8). Two layout alternatives are closed — see `DESIGN_NOTES.md` §1. |
| `components/CommunityCarousel.tsx` | Community cards on home | ⚠️ **PARKED for Phase 2 (2026-08-14) — no call sites.** Communities were cut from the MVP; the file is intact and still type-checked, but home, `/explore` and the navbar no longer reach it. **Do not delete it as dead code, and do not re-add a call site** — the rule is that users must not see the word "community" anywhere. Restore checklist: `TODO.md` §12. The rest of this row applies once it is back. Exports `CommunityItem` **and `CommunityCardItem`**. **Owns no chrome of its own** — tags from `EventBadges`, controls from `EventActions` with `kind="community"`. It used to keep private copies of `BADGE_CONFIG`, `ShareButton` and `HeartButton`, and that is exactly how events and communities drifted. **Do not re-add them.** |
| `components/SimilarEvents.tsx` | "Similar events" rail on `/event/[id]` | Now just a data source for `Rail` — **the full-bleed / card-width / clip-room rules and measurements live in `components/Rail.tsx`; read that row before changing layout here.** What's this file's own: it queries the **viewed event's own coordinates**, not the city picker, and splits nearby-vs-online the way home does. Renders `null` (divider included) when there is nothing to suggest. Full reasoning: `DESIGN_NOTES.md` §2 and §6. |
| `components/CommunityEventsRail.tsx` | "Events in this community" rail on `/community/[slug]` — the counterpart to "Similar events" | One rail, two tabs (Upcoming / Previous) via `RailToggle`. **It fetches nothing** — the page splits the events once (`lib/community-events.ts`) because the sidebar card and the reviews block need the same pieces. The active tab is **derived, not synced**: `picked ?? (no upcoming ? "previous" : "upcoming")`, so a community whose events have all happened doesn't open on an empty tab, while an explicit click still wins. Renders `null` only when BOTH lists are empty; an empty *tab* keeps the section and explains itself. |
| `components/SimilarCommunities.tsx` | "Similar communities" rail on `/community/[slug]` | Communities have no coordinates, so "similar" is **same category, then same city** — not a radius search like `SimilarEvents`. Ordering is the backend's (`member_count desc`), the only relevance signal the community service offers. |
| `components/CommunityJoinCard.tsx` | The sidebar card on `/community/[slug]` | Chrome from `DetailCard.tsx` — see that row. **This one does a REAL organiser lookup** (`organizerApi` on `community.organizer_id`), unlike the event page's hardcoded header, and the shield only appears on a genuine `verification_status === "verified"`. When there's no organiser profile it falls back to the **community's own name** — a community IS the organising entity, so that's true, not a placeholder. **The Join CTA is intentionally inert** — see `TODO.md` §3b; do not wire it to a device-local flag. |
| `components/CommunityReviews.tsx` | Attendee reviews on `/community/[slug]` | ⚠️ **A community has no reviews of its own** — this fans `useQueries` over its most recent past events (capped at 6, one request each) and averages the result. **Never relabel that aggregate as a community rating**; the subtitle must keep saying where it came from. The review service 404s for an event with no reviews — that's a normal answer here, hence `retry: false`. |
| `components/CategoryGrid.tsx` | "Browse by category" rail above the footer | A tile **borrows the event card's chassis but has no body** — it is a bare `aspect-video` photo carrying one `CategoryBadge size="lg"` bottom-**right**, with the "explore" arrow **inside that chip after the name** (via the `trailing` prop) rather than as a separate button. If `EventCardItem`'s hover or radius changes, change it here too. **No colour wash and no body — both were built and removed; do not put them back.** ⚠️ **The arrow is `aria-hidden` decoration, never a control** — the tile is already a link to that destination, so a nested control would be a second tab stop doing one job. **The `lg` chip size is pinned by a measurement** (the longest name clips at 20px once the arrow shares the row) — see `DESIGN_NOTES.md` §5 before enlarging either. Two rows, `grid-flow-col`, scrolled horizontally. Same clip-room fix as `SimilarEvents`. **Never hardcode a tile colour** — it's the category's own accent from `categoryStyle()`; the chip takes it raw, the hover border takes it through `liftAccent()` in dark mode only (a raw accent on the dark page is invisible). Tiles are the **11 categories `/explore` filters on, in its order** — keep this list and `CATEGORIES` in `app/explore/page.tsx` in step. **No event count on a tile, and do not fake one.** See `DESIGN_NOTES.md` §5. |
| `components/HeroCarousel.tsx` | Split hero on home — copy left, image right | ⚠️ **Communities are PARKED for Phase 2 (2026-08-14)** — `MODES.communities` now points at routes that redirect home, and the events mode's second subcopy line (which named communities) is commented out, so `subcopy` is temporarily `SubLine[]` rather than the `[SubLine, SubLine]` tuple. **Do not restore the Events/Communities toggle on its own** — it is the only thing that reaches a feature users are not meant to know exists; see `TODO.md` §12. **⚠️ The hero is the ONE surface not capped at the 1400px page column** — the grid spans the full viewport inside `GUTTERS` and splits 50/50, so the copy column is the page's left half. Do not "restore" a `maxWidth`. The copy block inside it is `max-w-[600px] mx-auto` (centred block, left-aligned lines). **600px and the headline’s `clamp(26px, calc(4.0vw - 6px), 46px)` are measurements tied to the current headline copy** — the headline is a three-turn spoken exchange and every turn must hold on ONE line; the binding turn is #2, not #1. Reword it and both numbers are wrong, so **re-run the width sweep after any change here** (`DESIGN_NOTES.md` §9). The body’s **"About N options" is the LIVE event count**, not copy: `GET /event/count` → `eventsSource.count()` → React Query, rounded to the nearest 10. Below 10 it renders **no number at all** rather than "0 options" — same path used while loading or on failure, so **never hardcode a figure into `SubLine.text`.** **The panel carries a `5px solid var(--brand-green)` frame** — Gautham's explicit call, decoration on a photo, **not** a control, so the 2px `--brand-control-border` rule does not apply and this is not a stray border to sweep. **The image panel is `aspect-[16/9]` at every width because that is the native aspect of every photo in `public/hero/` — never pin a height here.** A panel that disagrees with its source is exactly how much `object-cover` crops; the old `lg:h-[min(82vh,820px)]` made it near-square and ate ~40% of each photo's width. **Two modes (Events / Communities); the toggle swaps BOTH columns** and is local state, not a link — but **four blocks are commented out (parked, not dead — do not delete):** the toggle, the Explore/Publish CTA pair, the per-slide CTA on the photo, and the terracotta eyebrow. So `mode` is pinned to `"events"`, `MODES.communities` is unreachable, and the panel carries only the photo + the (now centered) dots. **Do not prune `Slide.href` or the MODES entries as unused** — they feed the parked CTA, and `label` is still the dots' `aria-label`. `MODES` is the single source. `SLIDE_COUNT` assumes both modes have the same slide count — **add a slide to both or the index maths breaks.** The two modes filter differently and must not be copy-pasted onto each other. Uses `<img>`, not `next/image`, because the wipe needs `clip-path`. Three layout arrangements are closed — see `DESIGN_NOTES.md` §1 and §9. |
| `components/EventCard.tsx` | ⚠️ **DEAD — nothing imports it** | Kept only to avoid an unrequested deletion. Carries `data-keep-type` for its intentional sub-15px type. See `TODO.md` §10. |
| `components/ShareButton.tsx` | ⚠️ **Effectively dead** — only importer is `EventCard.tsx` | Use `EventActions.tsx` instead. |

### Chrome, chat and shared UI

| File | Purpose | Gotcha |
|---|---|---|
| `components/navbar/Navbar.tsx` | Sticky top nav | Desktop on `lg+`, hamburger below. **⚠️ If you widen anything in the desktop row — a nav item, a longer label, a bigger logo — re-measure at exactly 1024px.** The search box (`w-[250px] xl:w-[410px]`) is the only elastic element and absorbs the difference; it was previously 1135px wide at `lg`, putting a horizontal scrollbar on *every page in the app* from 1024 to ~1150px. Both numbers were narrowed on 2026-08-14 and sit **below** the pair that fixed that bug, so the fit is safe by construction. **Narrowing is always safe; widening either number or adding a nav item is what needs the 1024px re-measure.** Chat button sits left of the bell (authed only) and turns green + terracotta dot on unread. Organizer status via `organizerApi.get()` (5-min React Query cache). |
| `components/ChatPresence.tsx` | **Invisible** app-wide listener (mounted once in `layout.tsx`) that lights the navbar chat glow | ⚠️ **FRONTEND-ONLY MVP.** Opens one WebSocket per room while the app is open; cannot detect anything received while the app is closed, and the state is not survivable. Replace it when the chat backend persists messages — see `TODO.md` §3. |
| `components/EventChatWidget.tsx` | AI chat widget on `/event/[id]` | Floating launcher is **terracotta**, not green, so it doesn't compete with the green CTAs. Panel internals stay green. ⚠️ It overlaps the fourth Similar-events card at every width — `TODO.md` §7. |
| `components/CityPicker.tsx` | City selector | Uses `useLocationStore`. `CITIES[0]` is the Online pseudo-city — use `isOnlineCity()`. |
| `components/ShareModal.tsx` | Desktop fallback when the native share sheet is unavailable | **Portalled to `<body>` via `createPortal` — do not remove.** It opens from inside cards and heroes that are `overflow-hidden` and apply a `transform` on hover; a transformed ancestor becomes the containing block for `position: fixed`, so rendering in place pins the overlay inside the card and clips it away. |
| `components/Footer.tsx` | Site footer | Deep-green block, **intentionally not themed**. |
| `components/brand/*` | Official logo, wordmark, lockup, loader | Inline SVG so they tint via `currentColor`; colour is driven by the theme-aware `--brand-logo`. Built from `eventmind/logo_and_wordmark/`. Loader keyframes live in `globals.css` and respect `prefers-reduced-motion`. |

### Sharing routes

Both events and communities produce two branded graphics, generated server-side with `next/og`
(no extra dependencies) from the item's own picture:

- **Link unfurl** — `app/<kind>/[id|slug]/opengraph-image.tsx` (1200×630). `layout.tsx` is a server component whose only job is `generateMetadata()`; Next auto-wires the route into `og:image` / `twitter:image`, so the page itself stays a client component.
- **Story card** — `app/<kind>/[id|slug]/story/route.tsx` (1080×1920 PNG), fetched by `lib/share-event.ts` and handed to `navigator.share`.
- Helpers: `lib/event-media.ts`, `lib/event-server.ts`, `lib/community-server.ts`.
- Only the copy differs between kinds: the community story eyebrow reads "JOIN THE COMMUNITY", its chip shows member count rather than price.
- **Set `NEXT_PUBLIC_SITE_URL` in production** so absolute share URLs and `metadataBase` are correct (defaults to `http://localhost:3000`).

---

## Brand & Design

Clean, minimal, premium — inspired by functionhealth.com (aesthetic) and austoentertainment.com
(palette). **User-friendliness, simplicity and consistency are the top priorities. Do not add
unnecessary complexity, decorations, or features.**

### ⚠️ Consistency is a requirement, not a preference

**The same thing must look and behave the same way everywhere.** A user moving from home to an event
page to a community page should never notice that two different people built them. **This outranks
matching a mockup pixel-for-pixel** — if a mockup conflicts with an established pattern, say so and
ask before diverging.

Before you build any UI:

1. **Search for the pattern before you write it.** If a share button, heart, date row, price chip, badge or empty state exists, **import it**. A second version is a bug, even when it looks fine on its own.
2. **One control = one component.** If a control needs to look different on a new surface, add a **prop** — do not fork the file.
3. **One icon per concept.** A calendar is the same glyph everywhere.
4. **Consistent ≠ identical behaviour by accident.** If two surfaces share a look, they must share the code. Copy-paste is how drift starts.
5. **If you find an inconsistency, report it.** Do not quietly work around it, and do not unilaterally restyle a shared surface — flag it and let Gautham decide, because a "fix" in one place changes every other place.

### Colour

**`globals.css` is the source of truth.** Every brand colour is a `--brand-*` CSS variable defined
once there (light in `:root`, dark in `:root[data-theme="dark"]`). **Do not reintroduce raw brand
hexes in components**, and do not restate the palette in this file — read `globals.css`.

Tokens: `--brand-green`, `--brand-green-hover`, `--brand-on-green` (text/icons **on** a green fill),
`--brand-bg` (page), `--brand-surface` (cards/navbar/inputs), `--brand-text`, `--brand-border`,
`--brand-nav-border`, `--brand-control-border`, `--brand-hint`, `--brand-muted`,
`--brand-terracotta` (+ `-hover`, `--brand-on-terracotta`), `--brand-logo`.

**Naming convention — what Gautham means:**
- **"green" / "green shade"** → always `#184E4A` (`--brand-green`). Never another green, never Tailwind `green-*`.
- **"white" / "white shade"** → always linen `#F2EFEA`. Pure `#FFFFFF` is only for text on dark or coloured backgrounds.

*(Those two hexes are the only ones stated here, because the rule is meaningless without them.)*

**Three token traps:**
- **`--brand-hint` is NOT gray** and must not be "restored" to one. It is full-contrast text in light, linen in dark.
- **`--brand-muted` is the only genuinely-gray token** — form placeholders and muted *fills* only. Never for ordinary secondary text; it would paint a near-black button in light mode.
- **`--brand-control-border` is for controls, `--brand-border` for non-controls.** Do not "simplify" a control onto `--brand-nav-border` — that's the navbar/card token and far too pale.

Usage: `style={{ color: "var(--brand-text)" }}`, or the `BRAND` string map from `@/lib/theme`, or
Tailwind arbitrary values (`text-[var(--brand-hint)]`). **Alpha tints need
`color-mix(in srgb, var(--brand-green) N%, transparent)`** — a CSS var can't take a hex-alpha suffix.

**Intentionally not themed:** `Footer.tsx`, the `HeroCarousel` letterbox, and semantic accents (badge
colours, star gold, error red, status green/amber, Google/Facebook brand colours).

Theme plumbing: `providers/theme-provider.tsx`, persisted to `eventmind-theme`, with a no-flash
`<head>` script in `layout.tsx`. A neutral dark-gray alternate sits commented out in `globals.css` —
uncomment to switch, no component edits needed.

Rationale for all of the above: `DESIGN_NOTES.md` §7.

### Typography

**One font, one place.** The whole app uses a single font (currently **Roboto**) loaded once in
`layout.tsx` and exposed as `--font-app`; `globals.css` maps it to `body` and Tailwind's
`--font-sans`. **There are no per-component font declarations** — do not re-import a font in a
component or set `fontFamily` inline.

**To swap the font:** change only the two marked lines in `layout.tsx` (the `next/font/google` import
and the loader call). Keep `variable: "--font-app"`. Nothing else touches.

**Font-size floor: 15px.** One rule in `globals.css` raises `text-xs`, `text-sm` and arbitrary
`text-[9px]`…`text-[14px]` to 15px. **Do not add new sub-15px sizes.** Opt out with
`data-keep-type` on an element (and its subtree) whose small type is deliberate.

**Prominent copy above the floor:** page subtitle 18px; empty-state heading 18px with a 16px helper
line. Follow this on new pages. See `DESIGN_NOTES.md` §8.

### Shape

**⚠️ Every button, chip, toggle and filter control is a rounded rectangle. `rounded-full` is not a
button shape.** The reference is the category chip on the event card — `rounded-lg`, the silhouette
exported as `TAG_SHAPE`.

- **Small controls** (filter chips, category chips, date presets, segmented items): `rounded-lg`. Inside a bordered track, the track is `rounded-lg` and its items `rounded-md` so the inner radius nests.
- **Standard buttons** (CTAs, form submits, search/city/sort controls): `rounded-xl` or `rounded-2xl`.
- **The only legitimate `rounded-full` elements** are things that aren't buttons-with-labels: the round icon controls in `EventActions.tsx`, avatars, count badges, carousel dots, and a toggle switch's knob + track. **Do not add to this list without asking.**

### Borders

**Outline controls on a linen/gray background use `2px solid var(--brand-control-border)`.**

- **⚠️ Bump the ACTIVE state to 2px too.** Most of these swap to a green border when selected; if only the inactive state is 2px, **the control changes size when you click it.**
- `--brand-border` is still correct for **non-controls**: card/panel borders, dividers, `border-t`/`border-b` rules, and form text inputs inside a card. **Do not sweep those to 2px.**
- **⚠️ A CARD is not a control.** The `SeeAllTile` in the carousels sits in the same grid as the event cards and must look identical to them — `2px solid transparent` at rest, green on hover, the transparent border holding the space so it never resizes. It must read as a card, not as a big button.
- **First choice is not to hand-write a border at all.** There is no shared Button component, which is why this treatment had to be applied in ~20 places across 12 files. If you add another outline control, **copy an existing one rather than inventing a third width.**

Dark theme is deliberately not lifted — the blending problem is light-only. See `DESIGN_NOTES.md` §7.

### Hover, spacing, tone

- **Hover:** background → green, text/icon → linen. Used throughout the navbar, dropdowns and cards. Maintain it for new interactive elements.
- **Navbar** 72px tall. **Page content and navbar share the same horizontal padding** — import `GUTTERS`.
- **Cards** `rounded-2xl`. **Buttons** `rounded-xl` / `rounded-2xl`.
- **Copy:** conversational but professional. Avoid jargon, keep labels short — "Claim Free Ticket", not "Register for Free Event".

### Responsiveness

**Verified by measurement, not by eye** — `document.scrollWidth === clientWidth` on `/`, `/explore`,
`/event/[id]` and `/community/[slug]` at **320 · 375 · 414 · 768 · 1024 · 1100 · 1280 · 1440 ·
1920**. This had *not* been true before: the claim sat in this file while eleven surfaces carried a
flat `px-12`. **Re-run that sweep after any layout change — 1024px especially, where the navbar
breaks first.**

Standard patterns:

- **Grids:** `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- **Horizontal padding:** import `GUTTERS`. Never hand-write the trio.
- **Two-column bodies:** `grid-cols-1 lg:grid-cols-[Nfr_1fr]`, never a bare `gridTemplateColumns` — a hard `fr` ratio has no narrow layout, it just squeezes the sidebar until it overflows.
- **Form rows:** `grid-cols-1 sm:grid-cols-N`. A bare `grid-cols-3` puts three ~100px cells on a phone.
- **Wide tables:** keep the width, wrap in `overflow-x-auto` with `min-w-[720px]`. Six columns have no honest narrow layout; scrolling beats crushing.
- **Full-bleed hero titles:** one line via `heroTitleSize()` on `lg+`; below `lg` the `.hero-title` rule in `globals.css` lets it wrap to 3 lines instead.
- When stacked, `/event/[id]` orders the **booking card above the description** so price/date/Book Now are visible without scrolling past the reviews.

---

## Performance Rules

- **Use `next/image` for images.** The one deliberate exception is `HeroCarousel`, which needs `<img>` because its wipe relies on `clip-path` (eslint-disabled inline). **Do not "fix" it.** Any new `<img>` needs the same kind of justification.
- **Use `next/link` for internal navigation.** Never a bare `<a>`.
- **Always give `<Image>` a meaningful `sizes` prop** — do not leave the default.
- Lazy-load below-the-fold components with `next/dynamic` where appropriate.
- **Do not add npm dependencies without asking.** Do not import from `node_modules` paths that aren't in `package.json`.

---

## Contribution Guidelines

1. **(MANDATORY) Update `STATUS.md`** whenever something moves between shipped / partial / not started, or is reverted. **Rewrite the section in place — never append.** It describes the present only, so a stale entry there is a bug.
2. **Add to `CHANGELOG.md` only for a meaningful change** — a feature landing, a decision, a revert — **one short line**, newest first. **Not** every file edit. Skip it entirely for small tweaks, refactors and work in progress, and **never log churn reverted in the same session.** Unsure? Then it isn't meaningful — update `STATUS.md` and skip the changelog.
3. **Update this file only for things still true tomorrow** — conventions and gotchas. It is instructions, not a record and not a status board. "What I did" → `CHANGELOG.md`; "what state it's in" → `STATUS.md`; "what's left" → `TODO.md`; "why it looks like that" → `DESIGN_NOTES.md`.
4. **Update the Component Registry** when a component is created or its purpose changes — one line, and only the gotcha someone would get wrong without it. Not a description of the work.
5. **Run `pnpm --filter @eventmind/web type-check` before finishing.** Non-negotiable.
6. **Test in the browser** for UI changes. Type-checking does not catch visual bugs.
7. **Match the brand system** — tokens from `globals.css`, one font, no new colours or fonts without approval.
8. **Save new project documents to `Eventmind_files/`**, not inside `eventmind/`.
9. **Never commit `.env.local`, `.env` or `start.bat`** — all git-ignored, all hold secrets.
10. **Keep Node at v20+** — `.nvmrc` pins 24.16.0; run `nvm use` inside `frontend_react/`.
11. **If you delete `platform_dev.db`** — restart all services first (so the community service creates the `communities` table), then re-run `seed_events.py`.
12. **Always stop the dev server with `Ctrl+C` in its terminal** — never just close the window. Killing the terminal on Windows orphans the Next.js worker processes; they accumulate across runs (we once found 321 zombie `node` processes), eat RAM, and cause heap-allocation crashes on later runs. Clean up orphans after a crash:
    ```powershell
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'next' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    ```
13. **Never attribute commits to Claude.** No `Co-Authored-By: Claude` trailers, no "Generated with Claude Code" lines, no AI attribution in commit messages or PR descriptions.

---

## Keeping this file true

This file is only worth its tokens if every line is still correct. Three rules, in priority order:

- **Point at the source of truth; don't copy it.** Colours, fonts, ports, limits and env vars are *defined* in `globals.css`, `layout.tsx`, `start.bat`, `config.py`, `.env.example`. **Name the file instead of restating the value** — a pointer can't rot, a copy silently does. **This is the strongest rule here:** it makes a whole class of drift structurally impossible.
- **Verify before you write.** Check any factual claim against the code — not against memory, and not against what another section of this file says. A wrong line will happily propagate itself.
- **Correct in place; never append.** When a rule changes, **edit the original sentence.** Do not add "actually, now…" underneath it. `CHANGELOG.md` is where the before/after belongs; this file states only what is true right now.

> **Worked example of the failure this prevents:** this file pointed every session at
> `Eventmind_files/eventmind_prd.md` and `Eventmind_files/REACT_MIGRATION.md` — including a
> "read the PRD before building any new feature" instruction — while its own layout diagram put that
> folder one level too deep. **Every one of those pointers resolved to nothing**, and had for a long
> time. It also told sessions to *"add anything that would help the next Claude instance"*, which is
> how the file reached 103 KB and ~26k tokens per session. Both corrected 2026-08-10.

"Codex will review your output/code once finish"
