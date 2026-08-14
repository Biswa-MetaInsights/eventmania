# NewFind — Open Work

> Specs for things that are **known-broken or unbuilt and have a decided-enough shape to act on**.
> Delete an entry once it ships (and add a `CHANGELOG.md` line). `STATUS.md` lists these as
> one-liners — read the spec here before picking one up.
>
> **Items marked NEEDS A DECISION are blocked on Gautham.** Do not silently work around them.

---

## 1. Organiser identity on `/event/[id]` is hardcoded — must fix before launch

**Where:** the booking card's green header in `app/event/[id]/page.tsx`.

Every part of the organiser block is fake: the name is the literal string `"EventMind Collective"`
passed at the `<BookingCard>` call site, the avatar is that string's first letter, and
"✓ Verified · 40+ events" is a fixed string. There is no organiser lookup, no verification flag and
no event count behind it. Gautham approved this **for now** so the card could match the reference
design. **"Verified" is a trust claim** — it cannot ship to real users as-is.

**Fix:** look the organiser up by `event.organizer_id` via `organizerApi`, then pass real
`organizer` / `verified` / `eventCount` props into `BookingCard`. `OrganizerProfile` in
`packages/types` already carries `VerificationStatus` (`"unverified" | "pending" | "verified"`), so
the verified flag is `verification_status === "verified"`. **The event count has no backend field
yet and needs one.** Where an organiser is unverified or the count is unknown, **hide the trust
line — do not fake it.**

---

## 2. `Today` and `Recommended` badges are dead for real data

`BADGE_CONFIG` in `EventBadges.tsx` defines both, but `toCarouselEvent()` in `lib/card-adapters.ts`
only ever emits `sold-out`, `selling-fast`, `this-week` and `free`. Nothing else produces
`badgeTypes`, so a real event **cannot** be tagged Today or Recommended — they appear only on the
hardcoded sample array inside `EventsCarousel.tsx`.

**Consequence:** the home page's **"Recommended" filter tab** filters on
`badgeTypes?.includes('recommended')`, so it can never match a live event. The same is why neither
is offered as an `/explore` filter.

**Two ways out, pick one:** emit the tags from `toCarouselEvent` (needs a "recommended" signal from
the backend, and a `today` date check), or drop the tab and both `BADGE_CONFIG` entries.

---

## 3. Chat backend — persistence, room list, real unread

The navbar glow and `/chat` inbox are a **frontend-only MVP** (`components/ChatPresence.tsx`). It
opens one WebSocket per room while the app is open and marks a room unread on any inbound message
whose `sender_id` isn't the user's. By design this cannot detect anything received while the app is
closed, and there is no read-receipt state that survives a refresh.

**Needs, in order:**
1. **Message persistence** — `chat_endpoints.py` has its `db.add` / `commit` calls commented out.
2. **A room-list endpoint** — the frontend currently derives rooms from tickets held plus events organised.
3. **A real unread-count / read-receipt mechanism**, then replace `ChatPresence` with it.

Room ids share the WS base (`CHAT_WS_BASE`) with the room page via `lib/chat.ts`. Current unread
state lives in `packages/store/src/chat-unread-store.ts` (persisted map `eventmind-chat-unread`,
plus a non-persisted `activeRoom` so the room you are viewing never glows).

---

## 3b. Join a community — the button exists, nothing behind it

> ⚠️ **Blocked by the Phase 2 park (2026-08-14).** Communities are switched off for the MVP, so
> nothing in this section is reachable by a user. Do not build it before §12 is actioned.

**Where:** `components/CommunityJoinCard.tsx` (the card CTA) and `app/community/[slug]/page.tsx`
(the sticky bar CTA). Both call `handleJoin()`, which is **deliberately empty**. Gautham asked for
the button now and the flow later — do not wire it up halfway.

**Nothing exists on the backend.** `backend/services/community/` has only create / search / get
(`community_endpoints.py`). There is no membership table, no join endpoint, and no notification
hook. `Community.member_count` is a plain `Integer` column with **nothing maintaining it** — it is
whatever the seed script wrote.

**Needs, in order:**

1. **`community_members` table** — `community_id`, `user_id`, `joined_at`; unique on
   `(community_id, user_id)` so a double-click can't join twice. New model beside
   `models/community.py`.
   > ⚠️ Mind the startup-order trap in `CLAUDE.md`: the community service must still create the
   > `communities` table before the user service does. Adding a second table here doesn't change
   > that, but adding a *relationship* to `communities` could.
2. **Endpoints** — `POST /community/{id}/members` (join), `DELETE /community/{id}/members` (leave),
   `GET /community/{id}/members/me` (am I a member?). Join/leave must update `member_count` in the
   same transaction, or drop the column and compute the count — **do not leave two sources of
   truth.**
3. **Notification on new events** — when an event is published with a `community_id`, the
   notification service emails / notifies that community's members. This is the actual feature
   Gautham asked for; the join button is only its entry point. Decide whether it fires from the
   event service on publish or from a Kafka consumer (note Kafka is mocked in dev — `MOCK_KAFKA`).
4. **Frontend join state** — `communityApi.join/leave/membership`, surfaced through React Query.
   Auth-gate the CTA: unauthenticated users go to `/auth` first.

**Then design the joined state** (not yet designed — this is the open question, not a coding task):

- What the CTA becomes — "Joined ✓", a "Leave" affordance, and where leaving lives so it isn't a
  one-click mistake.
- Whether the sticky bar keeps a CTA at all once you're a member, or switches to something else.
- What a member sees that a non-member doesn't — member-only events? a members list? a notification
  preference toggle ("email me about new events")?
- Whether `member_count` visibly increments straight away (optimistic) or after the round-trip.

**Until all of the above lands, the button must keep doing nothing** rather than storing a
device-local "joined" flag — a join that sends no email is not the feature.

---

## 4. Ticketmaster geocoding

Ingestion runs, but many Ticketmaster events carry no venue coordinates and are currently saved with
`lat: 0, lng: 0`. That is a real point in the Atlantic, so those events fall out of every radius
search. Needs a geocoding API (Google Maps or Nominatim) in
`backend/services/recommendation/app/services/ticketmaster_ingestion.py`.

Note `eventCoords()` in `SimilarEvents.tsx` already treats `0,0` as "no coordinates" — keep that
guard until this is fixed.

Once geocoding works end to end, `seed_events.py` is no longer needed for populating **events**
(still useful for communities).

---

## 5. Auth guards race zustand hydration — NEEDS A DECISION (behaviour change)

Every guard is `useEffect(() => { if (!isAuthenticated) router.replace("/auth") })`, which fires on
the first client render — **before** zustand's `persist` has rehydrated `eventmind-auth` from
localStorage. So `isAuthenticated` is still `false`, the guard redirects, and `/auth` (seeing the
now-hydrated session) sends the user on to `/`.

Reproduced repeatedly on `/dashboard`, `/organizer`, `/organizer/my-events`: a hard load lands on
`/`, a soft client-side navigation usually survives — the signature of a hydration race, and why it
looks intermittent in normal use.

**The fix already exists in the codebase and is simply not used here.** The store exposes
`_hasHydrated`, and `app/page.tsx` already gates on it
(`hasHydrated ? _selectedCity : DEFAULT_CITY`); `/chat` does too. The guards should do the same —
wait for `_hasHydrated` before deciding, and render the loader until then.

**Do not "fix" it by removing the guard.** Flagged as needing a decision only because it is an
auth-behaviour change rather than a layout one.

---

## 6. Event card meta row is over-stuffed at `xl:grid-cols-4` — NEEDS A DECISION

Measured at 1440px: the row is 285px and the fixed content (calendar + date + clock + time + pin,
all `shrink-0` at 18px) eats 241px, leaving the venue **44px** — so even "The Blue Room" truncates
to "The…". It looks fine at `sm:grid-cols-2`, where cards are wider.

**Pre-existing, not caused by the clock icon** — the old `date · time · pin venue` layout left the
venue 47px, a 3px difference.

**Options, all of which change the card:** drop the venue from the row, wrap to a second line, or
shrink the row's 18px type (limited by the 15px font floor).

---

## 7. Chat launcher overlaps the last Similar-events card — NEEDS A DECISION

`EventChatWidget`'s terracotta button is `position: fixed` bottom-right and the Similar events rail
is full-bleed, so the button sits over the **fourth card's lower-right corner** — measured at 1440px
(card ends x=1392, button spans 1360–1416) and 1920px (card ends 1872, button 1840–1896). It covers
part of that card's "View details" CTA; the rest of the card still works, since the whole card is a
link.

Partly pre-existing — the two already collided at 1440px when the rail sat inside the capped
column — but full-bleed made it happen at **every** width.

**Every obvious remedy has a cost:** right-padding the rail breaks the four-across maths and home
parity, and moving or hiding the launcher changes a shared component used across the page.

---

## 8. Home-page filter tabs are pills — NEEDS A DECISION

The "All / Recommended / This week / Free" tabs in `EventsCarousel.tsx` / `CommunityCarousel.tsx`
are `rounded-full`, contradicting the app-wide rounded-rectangle rule (small controls should be
`rounded-lg`). Their borders were updated in the outline-control pass; their shape was not, because
changing it is a visual decision.

---

## 9. Remaining icon-set stragglers

`EventIcons.tsx` unified date/time/location/verification, but these are still outline heroicons and
were deliberately left out of scope:

- Decorative **empty-state** calendars in `EventsCarousel` and `community/[slug]`
- The `/checkout` event thumbnail
- The organiser console's `EventIcon` stat glyph

`/checkout`'s "Expiry Date" field keeps its outline calendar **on purpose** — it belongs to the
payment form's own icon family (`CardIcon`, `LockIcon`, `PersonIcon`), and it is a card expiry, not
an event date. Leave it alone.

---

## 10. Dead code awaiting sign-off

> ⚠️ **Nothing community-related belongs in this section.** The whole feature was parked for Phase 2
> on 2026-08-14 (§12) and reads as unused on purpose — `CommunityCarousel.tsx` in particular has no
> live importer for its components. **Parked ≠ dead. Do not add it here and do not delete it.**

- `components/EventCard.tsx` — nothing imports it. Confusingly named: the card actually rendered is
  `EventCardItem` from `EventsCarousel.tsx`. Uses `@eventmind/types Event`, a different shape to
  `CarouselEvent`. Carries `data-keep-type` for its intentional 11/12/14px type.
- `components/ShareButton.tsx` — only importer is `EventCard.tsx`, so effectively dead.
- `eventmind/frontend/` — one stray `.iml` file left from the deleted Flutter app.

Both components were kept only to avoid an unrequested deletion. **Confirm with Gautham before
removing.**

---

## 11. Smaller gaps

- **SEO metadata** on dynamic routes other than `/event/[id]` and `/community/[slug]`.
- **Notification bell** — icon present, no panel, no backend.
- **Help page** — link present, no page.
- **Real ticket issuance** — tickets are Zustand/localStorage only, never written to the database.
- **Social login** — buttons present, disabled.
- **Event image upload** — `image_url` exists and is populated for synced events; no organiser upload path, no field on the create form.
- **Ticket tiers** — backend supports one price per event; Free/Standard/VIP needs schema changes.
- **Networking Profile** — `/dashboard` interests are hardcoded (Technology, AI, Venture Capital); needs real profile storage.
- **Community reviews are borrowed from the community's events.** There is no community-scoped
  review endpoint — the review service only serves `/review/event/{id}` — so
  `components/CommunityReviews.tsx` fans `useQueries` over the community's most recent past events
  (capped at 6) and averages what comes back. The subtitle says so out loud. If a real
  `/review/community/{id}` ever lands, swap the component's data source and drop the cap; **do not
  relabel the current aggregate as a community rating.**
- **`community_id` is ignored in dummy data mode.** `dummyEventSearch()` in `lib/data-source.ts`
  honours only `event_type`, `category`, `q`, `organizer_id` and `limit`, so in dummy mode every
  community's events rail shows the whole fixture catalogue. That is consistent with dummy mode's
  stated purpose (keep the UI populated for beautifying) — but **don't read the rail's contents as
  proof the filter works.** Verify that against `NEXT_PUBLIC_DATA_MODE=real`.
- **Community share links use `id` where the route resolves by `slug`.** Cards link to `/community/${CommunityItem.id}` and `shareUrl()` deliberately matches, so both are always the same string. In dummy fixtures `slug === id`, so it works today — **if the API ever returns a slug that differs from the id, both break together.** Fix by threading the real `slug` through `toCommunityItem()`.

---

## 12. Phase 2 — un-park the community feature

Communities were cut from the MVP on **2026-08-14** at Gautham's request: users must not encounter
the word "community" anywhere. Nothing was deleted. Current state and the full surface list are in
`STATUS.md`; the *why* is in `CHANGELOG.md`.

**Restore, in order:**

1. **Delete `apps/web/src/app/community/layout.tsx`.** That whole file is the park — a server
   component that redirects the entire `/community/*` segment to `/`. The pages under it were never
   edited and come back untouched.
2. **`grep -rn "PARKED 2026-08-14" apps/web/src apps/web/public`** and uncomment each block. Every
   one carries its own restore note; a handful need more than an uncomment:
   - `app/community/[slug]/layout.tsx` — delete the static `metadata`, uncomment `generateMetadata`, restore its three imports.
   - `app/community/[slug]/opengraph-image.tsx` and `story/route.tsx` — set `PARKED` to `false` (or delete the const and its `if`), and put `alt` back to `"Community on NewFind"`.
   - `app/explore/page.tsx` — `parseView()` is the choke point; restoring it re-enables `showEvents`/`showCommunities`/`noun`/the `items` memo automatically. Also restore `setView`, `VIEW_SEGMENTS`, `selectView`, the `justify-between` on the switch row, and the `view === "events"` guard on Create Event.
   - `app/page.tsx` — widen `exploreHref`'s `view` param back to `"events" | "communities"`.
   - `components/HeroCarousel.tsx` — `subcopy` goes back to the `[SubLine, SubLine]` tuple once the events line 2 returns. ⚠️ Restoring the hero's Events/Communities toggle (parked separately, 2026-08-11) means restoring **all** of this first — see the note in that file.
   - `app/dashboard/page.tsx` — drop the wishlist `.filter()` and rename the prop back to `items`.
3. **Nothing to do on the backend.** The community service, gateway route, models and seed data were
   never touched and have been running throughout.
4. **Re-run the checks:** `pnpm --filter @eventmind/web type-check`, then the responsiveness sweep at
   1024px — restoring the Communities dropdown puts a nav item back into the desktop row, which is
   the width that breaks first. The navbar search box is `w-[250px] xl:w-[410px]`, both below the
   values that were measured to fit *with* that dropdown present, so this should pass; verify rather
   than assume.
