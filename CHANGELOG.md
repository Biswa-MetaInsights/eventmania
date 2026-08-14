# NewFind — Changelog

> **One short line per meaningful change** — a feature landing, a decision, a revert. Newest first.
> **Not** every file edit. Skip it entirely for small tweaks, refactors, and work in progress, and
> never log churn that was reverted in the same session. Unsure whether a change qualifies? It
> doesn't — update `STATUS.md` only.
>
> Current state → `STATUS.md`. Design rationale → `DESIGN_NOTES.md`. Unbuilt work → `TODO.md`.

---

## 2026-08-14

- **Communities cut from the MVP and parked for Phase 2.** Gautham's call: users must not encounter the word "community" anywhere — nav, footer, Explore, hero, wishlist, Create Event, page title or PWA manifest. Nothing was deleted: every removal is a `PARKED 2026-08-14 (MVP)` comment block, `/community/*` redirects home via a new `app/community/layout.tsx`, and the community components, fixtures, API clients and backend service all stay intact. Explore is now events-only (the 3-way view switch is parked outright — a one-option switch reads as broken). Restore is `grep "PARKED 2026-08-14"` plus deleting that layout.
- **`/community/[slug]` rebuilt on the `/event/[id]` template.** Adds an attendee-reviews section, a sidebar "join card" (organiser, next event date/time/location, members, price), an "Events in this community" rail with an Upcoming ⇄ Previous toggle replacing the old flat grid, a "Similar communities" rail, and a sticky "Join this community" bar in place of Book Now.
- The chrome behind both detail pages is now **shared, not duplicated**: `DetailCard.tsx` (sidebar card + sticky bar), `Rail.tsx` (full-bleed rails, lifted out of `SimilarEvents`), `Reviews.tsx`. `/event/[id]` was refactored onto them with no visual change — its private copies were the reason the two pages had drifted.
- **Join is deliberately inert.** Gautham's call: build the button now, the flow later. No membership table, endpoint or notification hook exists — spec logged as `TODO.md` §3b, including the undesigned joined state.
- Community reviews are **aggregated from the community's past events** (the review service is event-scoped); the section says so rather than presenting it as a community rating.

---

## 2026-08-11

- Hero image panel now matches its photos (`aspect-[16/9]` everywhere) instead of a fixed `lg:h-[min(82vh,820px)]` — the near-square panel was cropping ~40% off each 16:9 photo's width.
- Hero's Events/Communities toggle, Explore/Publish CTA pair and per-slide photo CTA all commented out at Gautham's request — parked, not deleted; `communities` mode is unreachable until the toggle returns. The panel is now photo + dots only.
- Hero carousel dots moved from bottom-right to centered, now that the per-slide CTA no longer occupies the bottom-left.
- Hero image panel gained a 5px `--brand-green` frame (Gautham's call) — decoration on a photo, deliberately outside the 2px control-border rule.
- **Hero copy rewritten to a three-turn spoken exchange** ("What do you want to do?" / "No idea. What about you?" / "Same."), over a new body paragraph led by a bold "Leave it with us.". The terracotta eyebrow was parked with it — the body line already says "near you or online". An intermediate two-line version needed non-breaking-space binding to wrap correctly and overflowed the page at 320/375; the shorter turns removed the need for it entirely.
- **`GET /events/count` added to the event service** (proxied as `/event/count`, no gateway change needed) plus `eventsApi.count()` / `eventsSource.count()`. The hero's "About N options" is now the live catalogue size rounded to the nearest 10, replacing a hardcoded 400. Counts a single column so it survives `platform_dev.db` lagging the model.
- Hero body paragraph raised to 24px and "Leave it with us." set bold. (A centred variant was tried and reverted the same day — it broke the shared left edge with the headline.)
- **Hero uncapped from the 1400px page column** and split 50/50, with the copy block centred in the page's left half. At 1920 the cap had been leaving ~260px of dead margin outside each gutter. Nothing crosses the gutter, so the earlier edge-bleed rejection still stands.

---

## 2026-08-10

- **`CategoryGrid` tiles redesigned — the tile is now just the photo.** The accent colour wash over the photo, the linen body row and its **Explore** button were all removed; the label is the shared `CategoryBadge` at a new `size="lg"`, overlaid on the picture. An intermediate version (bare text on a black scrim, glyph in a green box) was replaced in the same pass.
- **`CategoryGrid` tiles gained an "explore" arrow**, inside the category chip straight after the name, in the category's own accent. Decoration (`aria-hidden`), not a control: the tile is already a link to that destination. Three earlier forms were replaced in the same pass — a standalone button at the tile's right edge, a green-filled square with a linen arrow, and a green arrow on linen.
- **`CategoryGrid`'s category chip moved to the tile's bottom-right** (was bottom-left).
- **`CategoryGrid`'s scroll arrows moved to the page edge** (`left-0` / `right-0`). They had been offset by GUTTERS + 8px, which put them ~40px on top of the outermost tile; at `lg` and up they now fill the 48px gutter exactly, with zero overlap.
- **`CategoryBadge` gained `size` and `trailing` props** instead of `CategoryGrid` forking the chip. `'sm'` renders byte-identically to before; `'lg'` is 20px, held to a measurement (the longest name clears by 19px with the arrow inline, but clipped by 5px when the arrow was a separate button sharing the row).
- **`CategoryGrid`'s hover border is theme-aware.** The raw category accent is dark by design (it is contrast-checked as text on linen) and was invisible against the dark page background; `liftAccent()` raises L/S — never hue — for dark mode only. Using one value for both themes just mirrors the bug: lifted-on-linen bottoms out at 1.23:1.
- **`CLAUDE.md` split into four files.** It had grown to 103 KB / ~26k tokens, read in full at the start of every session. History moved here, current state to `STATUS.md`, unbuilt work to `TODO.md`, deep design rationale to `DESIGN_NOTES.md`. `CLAUDE.md` now holds instructions only.
- **Fixed the `Eventmind_files/` path.** The layout diagram placed it inside `Event mind/`; it actually sits one level higher, beside it. Every pointer to the PRD, competitor analysis and React handover had been resolving to nothing.
- **Removed six resolved "known inconsistencies"** that still carried their full original text, including a verbatim copy of the superseded `BADGE_CONFIG` hex values — a live risk of a session reading the old colours as current.

---

## Undated (predates this changelog)

Entries below were reconstructed from the old `CLAUDE.md` when it was split. They are ordered
roughly newest-first within each area, but the dates were never recorded.

### Design system

- **Outline-control border** standardised on `2px solid var(--brand-control-border)` (`#8B8172` light). An intermediate 2px `--brand-nav-border` pass shipped first and was replaced — the pale colour was the bigger half of the problem, not the thickness.
- **`--brand-hint` de-grayed** — resolves to brand text in light and linen in dark. Every gray secondary label on the site was washed out; hierarchy now comes from size, weight and position. Covers ~96 text usages across 20 files plus ~26 muted icons.
- **`--brand-muted` retained** as the one genuinely-gray token, for form placeholders and muted fills only.
- **Light/dark theme shipped** — navbar sun/moon toggle, all brand colours moved from hardcoded hexes to `--brand-*` CSS variables in `globals.css`, no-flash `<head>` script, persisted to `eventmind-theme`. Dark palette is "warm green-black"; a neutral dark-gray alternate sits commented out in `globals.css`.
- **Single-font architecture** — one font (currently Roboto) loaded once in `layout.tsx` as `--font-app`; all per-component font declarations removed.
- **15px font floor** applied site-wide in `globals.css`, with a `data-keep-type` opt-out.
- **Category chip and status tags merged onto one silhouette** (`rounded-lg`, 14px glyph + label), exported as `TAG_SHAPE`. Fill now signals category-vs-status instead of shape. `rounded-full` was tried and rejected.
- **Status tags moved to Gautham's solid palette** with linen labels. ⚠️ Shipped as a **preview, not an accessible final** — every assigned tag fails WCAG AA. See `DESIGN_NOTES.md`.
- **Button shape ruled: rounded rectangles, never pills.** Made when the `/explore` filter bar was first built with pill chips.

### Components

- **`EventIcons.tsx` created** — one filled glyph set for the whole app, replacing three separate icon sets for the same concepts. Health & Wellness took `LotusPoseIcon` over a leaf.
- **`EventActions.tsx` created** — one share / wishlist / back / arrow control set, kind-agnostic across events and communities. `EventBackButton` became `EventArrowButton` pointing left so the two cannot drift.
- **`CommunityCarousel` stripped of its private chrome** — its own `BADGE_CONFIG`, `ShareButton` and `HeartButton` were deleted in favour of the shared ones. Those copies were exactly how events and communities had drifted.
- **`CardTagRow` added** to `EventBadges.tsx` as the single chip overlay for any card; uses `flex-wrap-reverse` so overflow pushes up instead of clipping (it had been clipping on 12 of 23 fixture cards).
- **`CategoryGrid` built** — 2-row horizontally scrolling category rail above the footer. Replaced an earlier 3-row wrapped grid that included a 12th "View all" tile.
- **`SimilarEvents` built** as a full-bleed rail; card widths moved from a fixed 320px to percentage-based `CARD_BASIS`.
- **`HeroCarousel` rebuilt** as contained copy-left / image-right with Events and Communities modes. Two edge-bleed variants were built and rejected; the `.hero-bleed` class was deleted. The reference mockup's quick-filter chip row was built and then removed, taking `weekendRange()` and the `Chip` type with it.
- **`ChatPresence` added** — invisible app-wide listener lighting the navbar chat glow. Frontend-only MVP.
- **`components/brand/*` created** from the official logo assets — `BrandMark`, `Wordmark`, `BrandLogo`, `BrandLoader`.
- **`lib/currency.ts` created**, closing the app's worst data inconsistency: cards rendered `₹` while `/event/[id]`, `/checkout`, `/dashboard`, the organiser console and the share images hardcoded `$`.
- **`lib/layout.ts` created** to export `GUTTERS` — eleven pages had been hand-writing a flat `px-12`.

### Pages

- **`/communities` merged into `/explore`** and reduced to a permanent redirect. `/explore` gained the 3-segment view switch and the Availability filter.
- **`/event/[id]` booking card rebuilt** to a reference screenshot — organiser moved into the green header, price moved out of it into a baseline-aligned row above Book Now.
- **`/event/[id]` and `/community/[slug]` made responsive**, along with nine other surfaces. When stacked, the booking card is ordered above the description.
- **Community share pipeline built** to mirror the event one — `story/route.tsx`, `opengraph-image.tsx`, `layout.tsx`.
- **Event sharing built** — OG link unfurl and 1080×1920 story card via `next/og`, no new dependencies.
- **Navbar desktop breakpoint fixed** — the `lg` cluster measured 1135px, so every page carried a horizontal scrollbar from 1024 to ~1150px. The search box now absorbs the difference (`w-[280px] xl:w-[440px]`).
- **Navbar chat button + unread dot added**; an earlier pulsing green halo was removed.

### Backend & data

- **Postgres runner added** (`postgres_runner.py`) — one database per service, host port 55432 to avoid clashing with a native Postgres.
- **`events.currency` column added** (ISO 4217, default `INR`) with `migrate_add_currency_column.py`.
- **`source` / `external_id` / `image_url` columns added** to `events` with `migrate_add_source_columns.py`.
- **Ticketmaster ingestion consolidated** into `recommendation/app/services/ticketmaster_ingestion.py`, exposed as `POST /recommendation/ingest-city`. `sync_ticketmaster.py` became a thin launcher over that endpoint rather than a second copy of the logic.
- **Community service ordered before user service** at startup — both declare a `communities` table and `create_all` only builds it once.

### Project

- **Flutter frontend deleted.** The project is React/Next.js only.
- **Renamed EventMind → NewFind** for user-facing copy; `eventmind` survives as the internal package scope and localStorage prefix.
