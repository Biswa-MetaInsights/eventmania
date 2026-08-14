# NewFind — Current State

> **This file describes the present only.** Rewrite the relevant section in place — never append.
> A stale entry here is a bug. History goes in `CHANGELOG.md`; specs for unbuilt work go in `TODO.md`.

Last reviewed: 2026-08-14

---

## ⚠️ Communities are PARKED for Phase 2 (2026-08-14)

**Communities are built and complete, but switched off for the MVP.** Gautham's requirement is that
a user must not encounter the word "community" anywhere — not in the nav, footer, Explore, hero,
wishlist, Create Event form, browser tab or PWA install prompt.

Nothing was deleted. Every removal is a commented block tagged **`PARKED 2026-08-14 (MVP)`**, so the
restore is one grep. What is switched off:

| Surface | How it is parked |
|---|---|
| `/community/*` routes | New `app/community/layout.tsx` — a server component that `redirect("/")`s the whole segment. The pages beneath it are untouched. |
| `/communities` | Existing redirect stub, retargeted from `/explore?view=communities` to `/` |
| Community OG + story images | `PARKED` const guard → 404. A metadata route and a route handler are separate route entries that a layout redirect never wraps. |
| `/community/[slug]` `generateMetadata` | Replaced by a static `{ title: "NewFind" }`; metadata resolution is a separate pass from rendering |
| Home `CommunityCarousel` | Render site, both React Query fetches, the merge, and three imports |
| `/explore` | Community fetch, cards, and the entire 3-way view switch. `parseView()` is the choke point — it ignores `?view=` and always answers `"events"`, which switches every derived value off on its own. Create Event is now unconditional. |
| Navbar / Footer | Communities dropdown (desktop + mobile) and the footer link |
| Hero, auth, metadata, manifest | Copy edits; the word is gone from every string |
| Wishlist | `kind: "community"` entries stay in localStorage but are filtered out of the view |
| Create Event | The "Add to my community" section, its state, its lookup and its payload field |

**Left running and untouched:** the whole backend (community service, gateway route, models, seed
data) and every frontend community component, fixture, API client and type. ⚠️ **Do not remove the
community service from `shadow_runner.py` / `start.bat`** — it is what creates the `communities`
table, and the user service will otherwise create an incompatible one.

Phase 2 restore checklist: `TODO.md` §12.

---

## Shipped

### Pages

| Route | What it does |
|---|---|
| `/` | Discovery — `HeroCarousel`, city-based `EventsCarousel`, `CategoryGrid` ("Browse by category", directly above the footer), `Footer`. ⚠️ `CommunityCarousel` is **parked** — see the Phase 2 section above |
| `/auth` | Login / register toggle. Two-column on `lg+` (hero panel + form), form-only on mobile. Google/Facebook buttons present but **disabled** ("Coming soon") |
| `/explore` | **Events browse.** Search, city picker, Sort by (client-side, `?sort=`), collapsible Filters panel, unconditional Create Event button. ⚠️ Was a unified events-AND-communities browse with a 3-segment view switch; both are **parked** — see the Phase 2 section above |
| `/event/[id]` | Event detail — full-bleed photo hero, description, reviews, booking card, sticky booking bar, `SimilarEvents` rail, auth guard |
| `/checkout/[id]` | Order summary + payment. Free events skip the card form (800 ms fake delay); paid events use a Stripe intent (2 s fake delay); success modal → `/dashboard` |
| `/dashboard` | 3 tabs — My Tickets (QR via qrserver.com), My Wishlist, Networking Profile |
| `/chat` | Chat inbox — the user's rooms (ticketed + organised events, deduped), unread first with a terracotta dot |
| `/chat/[roomId]` | Live WebSocket room — connection indicator, left/right alignment by sender |
| `/community/[slug]` | Community detail — **now built on the same template as `/event/[id]`**: full-bleed hero, two-column body ("About this community" + attendee reviews \| join card showing organiser / next event date-time-location / member count / price), full-bleed "Events in this community" rail with an Upcoming ⇄ Previous toggle, "Similar communities" rail, sticky "Join this community" bar. ⚠️ **PARKED — redirects to `/`.** When restored: the Join CTA is inert (no membership backend, `TODO.md` §3b) and reviews are aggregated from the community's past events, not community-scoped (`TODO.md` §11) |
| `/community/create` | Create community (organiser only). Eligibility gate: 2+ published events. ⚠️ **PARKED — redirects to `/`** |
| `/communities` | ⚠️ **PARKED — redirects to `/`** (was `/explore?view=communities`) |
| `/organizer` | Organiser console — 3 stat cards (Active Events real; Revenue + Attendees mocked), events table |
| `/organizer/create` | Create/publish event — Event Type toggle, Save as Draft + Publish, inline validation, verification guard |
| `/organizer/my-events` | Organiser's own published events, auth guard |
| `/organizer/onboarding` | One-time KYC form — company name, address, country, registration number |

### Systems

- **Theming** — light/dark with a navbar sun/moon toggle, driven entirely by `--brand-*` CSS variables in `globals.css`. Dark palette is "warm green-black".
- **Currency** — `events.currency` (ISO 4217, default `INR`) is the single source; every surface formats through `lib/currency.ts`.
- **Tag system** — one shared family for events and communities (`EventBadges.tsx`), one shared control set (`EventActions.tsx`), one glyph set (`EventIcons.tsx`).
- **Detail-page template** — `/event/[id]` and `/community/[slug]` are now one template, not two lookalikes. The sidebar card and sticky bar come from `DetailCard.tsx`, the bottom rails from `Rail.tsx`, the reviews block from `Reviews.tsx`. Each page supplies only its own copy and data.
- **Sharing** — OG link unfurl + 1080×1920 story card, generated server-side with `next/og`. Live for events; the community pair is **parked** (both routes 404).
- **Responsiveness** — verified by measurement (`document.scrollWidth === clientWidth`) on `/`, `/explore`, `/event/[id]`, `/community/[slug]` at 320 · 375 · 414 · 768 · 1024 · 1100 · 1280 · 1440 · 1920. ⚠️ **The `/community/[slug]` rebuild (2026-08-14) has NOT been re-swept** — no browser driver is installed and adding one needs Gautham's sign-off. Re-run the sweep on both detail pages before trusting this line.
- **Dummy/real data switch** — `NEXT_PUBLIC_DATA_MODE` toggles reads between local fixtures and the live backend.
- **Postgres** — `postgres_runner.py` runs the stack on per-service Postgres databases as an alternative to shadow-mode SQLite.
- **Ticketmaster ingestion** — pipeline runs end to end; the home page auto-ingests on first visit to a city.

---

## In progress / partial

- **Chat** — reachable and working live, but the unread glow and inbox are a **frontend-only MVP** (`ChatPresence.tsx`). Messages are not persisted, so nothing received while the app is closed is detected. See `TODO.md`.
- **Joining a community** — ⚠️ moot while communities are parked. When restored: the "Join this community" CTA is on the page (card + sticky bar) and **does nothing on click, by design**. There is no membership table, no join endpoint and no new-event notification hook; the joined-state UI is not designed yet. Full spec in `TODO.md` §3b.
- **Community reviews** — ⚠️ moot while communities are parked. When restored, the block aggregates reviews from the community's past events, because the review service is event-scoped. `TODO.md` §11.
- **SEO metadata** — `/event/[id]` has `generateMetadata()` + share images. Other dynamic routes do not. `/community/[slug]`'s is **parked** (static title, share images 404).
- **Ticketmaster geocoding** — ingestion runs, but many events land with `lat: 0, lng: 0` because no geocoder is wired up. See `TODO.md`.

---

## Not started

- **Real ticket issuance** — tickets live in Zustand/localStorage only, never written to the database.
- **Notification bell** — icon present, no panel and no backend.
- **Help page** — link present, no page.
- **Social login** — buttons present, disabled.
- **Event image upload** — the `image_url` column exists and is populated for synced Ticketmaster events, but there is no organiser upload path and no image field on the create form.
- **Ticket tiers** — backend supports a single price per event; multi-tier needs schema changes.
- **Mobile app** — the monorepo is structured for `apps/mobile`, nothing built.
- **Networking Profile** — the interests section on `/dashboard` shows hardcoded values (Technology, AI, Venture Capital).

---

## Known-wrong, deliberately shipped

These are live and **not** bugs to fix on sight — each was a conscious call. Full context and fix specs in `TODO.md`.

- **Organiser identity on `/event/[id]` is entirely hardcoded** — name, avatar initial, and the "Verified · 40+ events" trust line. Approved as a stopgap so the booking card could match the reference design. **Must be wired to real data before launch** — "Verified" is a trust claim.
- **`Today` and `Recommended` badges can never appear on a real event** — nothing emits them, so the home page's "Recommended" filter tab matches nothing.
- **The event card's meta row truncates the venue at `xl:grid-cols-4`** — 44px of room for the venue at 1440px.
- **The floating chat launcher overlaps the fourth "Similar events" card** at every width.
- **Guarded pages bounce to `/auth` on a hard load even when logged in** — a zustand hydration race. The fix (`_hasHydrated`) already exists in the store and is simply not used by the guards.
- **Home-page filter tabs are `rounded-full` pills**, contradicting the app-wide rounded-rectangle rule.

---

## Dead code (confirm before deleting)

- **Everything tagged `PARKED 2026-08-14 (MVP)` — parked, not dead.** The entire community feature; see the Phase 2 section at the top of this file. **Do not "clean up" any of it.**
- **Four `HeroCarousel` blocks — parked, not dead.** Commented out in place on 2026-08-11 at Gautham's explicit "we might bring it back later": (1) the Events / Communities segmented toggle, (2) the left column's Explore / Publish CTA pair, (3) the per-slide CTA on the photo ("Find offline events", "Find wellness events", …), (4) the terracotta eyebrow. The hero is pinned to `mode = "events"`, so `MODES.communities`, both `primary`/`secondary` CTAs, every slide `href` and both `eyebrow` strings are unreachable but still compile. The panel is now photo + centered dots only. **Do not delete any of it, and do not prune the MODES data as unused** — slide `label` is still the dots' `aria-label`. ⚠️ `MODES.communities` still carries the OLD headline voice ("Every community worth joining."); the events mode has since moved to the two-person dialogue, so restoring the toggle means rewriting the communities copy to match.
- `components/EventCard.tsx` — nothing imports it. The real card is `EventCardItem`, exported from `EventsCarousel.tsx`.
- `components/ShareButton.tsx` — its only importer is `EventCard.tsx`, so it is dead too.
- `eventmind/frontend/` — contains a single stray `.iml` file; the Flutter app it belonged to was deleted.
