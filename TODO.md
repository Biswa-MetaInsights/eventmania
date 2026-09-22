# NewFind — Open Work

> Specs for things that are **known-broken or unbuilt and have a decided-enough shape to act on**.
> Delete an entry once it ships (and add a `CHANGELOG.md` line). `STATUS.md` lists these as
> one-liners — read the spec here before picking one up.
>
> **Items marked NEEDS A DECISION are blocked on Gautham.** Do not silently work around them.

---

## Where the work is — frontend, backend, or both

Every section below carries a tag in its heading. **The tag is the first thing to read**: it says
what kind of session can pick the item up, and roughly half of this file cannot be moved at all
from the side you happen to be sitting on.

| Tag | Meaning |
|---|---|
| **`[FE]`** | Frontend only — React/Next.js under `frontend_react/`. No API change needed. |
| **`[BE]`** | Backend only — FastAPI under `backend/`. The UI is already built and waiting, or the item is invisible to the UI. |
| **`[FE+BE]`** | Needs both, and usually **backend first**: the frontend half is blocked until the field, endpoint or event exists. |
| **`[OPS]`** | Neither — deployment, verification or a third-party account. |

⚠️ **`[FE+BE]` is not "half done on each side".** In almost every case here the frontend is already
built against a shape the backend does not serve yet (organiser console, tags, tickets), so the
frontend half is a *swap*, not a build. Read the section before assuming there is UI work in it.

| # | Item | Tag |
|---|---|---|
| 1 | Organiser identity on `/event/[id]` is hardcoded | `[FE+BE]` |
| 2 | `Today` / `Recommended` badges are dead for real data | `[FE+BE]` |
| 2b | Tag derivation belongs in the backend | `[FE+BE]` |
| 3 | Chat backend — persistence, room list, real unread | `[BE]` |
| 3b | Join a community | `[FE+BE]` · parked |
| 3c | Verify the participant room end to end | `[FE+BE]` |
| 4 | Ticketmaster geocoding | `[BE]` |
| 5 | Auth guards race zustand hydration | `[FE]` · decision |
| 6 | Event card meta row over-stuffed | `[FE]` · decision |
| 7 | Chat launcher overlaps the Similar-events card | `[FE]` · decision |
| 7b | Event assistant for unregistered users | `[FE+BE]` · decision |
| 8 | Home-page filter tabs | `[FE]` · decision |
| 9 | Remaining icon-set stragglers | `[FE]` |
| 10 | Dead code awaiting sign-off | `[FE]` |
| 11 | Smaller gaps | mixed — **tagged per bullet** |
| 12 | Phase 2 — un-park the community feature | `[FE]` (+ 3b for the backend half) |
| 13 | Pricing — free to list, 2% on paid events | `[FE+BE]` |
| 14 | Organiser stats dashboard | `[BE]` — the frontend shipped |
| 15 | `FeatureBand` breadth card | `[FE]` · blocked on catalogue size |
| 16 | Park event rooms for Phase 2 | `[FE]` |
| 17 | Recommendation engine | `[BE]` |
| 18 | Verify share on a public deploy | `[OPS]` |
| 19 | Organiser console — the backend behind dashboard v2 | `[BE]` |
| 20 | Postponing and cancelling an event | `[BE]` |
| 21 | How to handle a refund | `[BE]` · decision |
| 22 | Posting an announcement is too hard for an organiser | `[FE]` · decision |
| 23 | `registration_closed` has no backend — the UI ships ahead of it | `[BE]` |
| 24 | Notifications move to the navbar bell | `[BE]` — pill removed 2026-09-02, **the bell now owes its signals** |
| 25 | Multi-currency — every amount is a bare number | `[FE+BE]` · decision |
| 26 | Contact person email on `/organizer/onboarding` is collected but not persisted | `[BE]` |

---

## 1. `[FE+BE]` Organiser identity on `/event/[id]` is hardcoded — must fix before launch

**Where:** the green header on **both** right-column cards in `app/event/[id]/page.tsx` — the
participant's `BookingCard` and the organiser's `OrganiserEventCard`, which show the same block
(Gautham, 2026-09-01).

Every part of the organiser block is fake: the name is the literal string `"NewFind Collective"` —
the `ORGANISER_NAME` constant both cards are passed — the avatar is that string's first letter, and
"✓ Verified · 40+ events" is a fixed string. There is no organiser lookup, no verification flag and
no event count behind it. Gautham approved this **for now** so the card could match the reference
design. **"Verified" is a trust claim** — it cannot ship to real users as-is.

**Fix:** look the organiser up by `event.organizer_id` via `organizerApi`, then pass real
`organizer` / `verified` / `eventCount` props into both cards, replacing `ORGANISER_NAME`.
`CommunityJoinCard` already does exactly this lookup — **copy it, don't re-derive it.**

⚠️ **The name is the ORGANISATION's, not the person's** (Gautham, 2026-09-01): `company_name` on
`OrganizerProfile`, falling back to `full_name`. `/organizer/onboarding` already collects it and
`organizerApi.get(userId)` already returns it, so **nothing new is needed on the create-event form.**

`OrganizerProfile` also carries `VerificationStatus` (`"unverified" | "pending" | "verified"`), so
the verified flag is `verification_status === "verified"`. **The event count has no backend field
yet and needs one.** Where an organiser is unverified or the count is unknown, **hide the trust
line — do not fake it.**

---

## 2. `[FE+BE]` `Today` and `Recommended` badges are dead for real data

`BADGE_CONFIG` in `EventBadges.tsx` defines both, but `toCarouselEvent()` in `lib/card-adapters.ts`
only ever emits `sold-out`, `selling-fast`, `this-week` and `free`. Nothing else produces
`badgeTypes`, so a real event **cannot** be tagged Today or Recommended — they appear only on the
hardcoded sample array inside `EventsCarousel.tsx`.

**Consequence:** the home page's **"Recommended" filter tab** filters on
`badgeTypes?.includes('recommended')`, so it can never match a live event. The same is why neither
is offered as an `/explore` filter.

**Two ways out, pick one:** emit the tags from `toCarouselEvent` (needs a "recommended" signal from
the backend, and a `today` date check), or drop the tab and both `BADGE_CONFIG` entries.

**Do not solve this one in isolation — see §2b and §17.** The right home for a `recommended` signal
and a `today` check is a backend-owned tag set, not another branch in `toCarouselEvent`. ⚠️ **And
there is no engine to take the signal FROM yet** — the recommendation service's whole algorithm is a
substring match over a user-interests list nothing ever fills, and no frontend code calls it. §17 is
that work; this tab cannot light up before it.

---

## 2b. `[FE+BE]` Tag derivation belongs in the backend — and two more tags are already dead

§2 covers the two badge types nothing emits. This covers the four that *are* emitted: they are all
derived **client-side, per card**, in `toCarouselEvent()` (`lib/card-adapters.ts`).

| Tag | Predicate |
|---|---|
| `sold-out` | `capacity > 0 && tickets_sold >= capacity` |
| `selling-fast` | `!soldOut && capacity > 0 && tickets_sold / capacity > 0.7` |
| `this-week` | `!soldOut && isThisWeek(start_date)` |
| `free` | `price === 0` |

**⚠️ Two of those four can never fire on a real event either.** `tickets_sold` is
`Column(Integer, default=0)` in `services/event/app/models/event.py` and **nothing in the repo ever
writes to it** — a repo-wide grep returns only the column definition, the Pydantic field, fixture
literals and read sites. Tickets never reach the database at all (§11, "real ticket issuance"), so
`tickets_sold` is permanently `0` on live data and **`sold-out` and `selling-fast` appear only on
the dummy fixtures, which hardcode the numbers.** Only `this-week` and `free` survive against a real
backend.

The same zero shows through on the detail page: `/event/[id]` passes `going={event.tickets_sold}`
and `left={capacity - tickets_sold}` into the booking card, so every real event reads "0 going".

**Second problem — the derivation is duplicated.** `app/explore/page.tsx` re-implements the sold-out,
selling-fast and popularity predicates independently of `card-adapters.ts`. Two copies of the 0.7
threshold, free to drift.

**Third — a client-side tag cannot be filtered server-side.** `/event/search` accepts no
`selling_fast` or `this_week` parameter, so the home filter tabs and Explore's "Selling fast" toggle
narrow only the rows already fetched, not the catalogue (`DESIGN_NOTES.md` §10 records this for the
Explore panel). A "Free" tab that silently misses free events further down the result set is worse
than no tab.

**Fix, in order:**
1. **Make `tickets_sold` real** — increment it on issuance. Blocked on §11's real ticket issuance;
   until that lands, anything built on it stays decorative.
2. **Move derivation server-side** — return a computed tag array on the event payload from
   `/event/search` and `/event/{id}`, with the thresholds owned by the event service.
3. **Accept the same tags as filter parameters** on `/event/search`, so the tabs filter the
   catalogue rather than the page.
4. **Reduce `toCarouselEvent` to rendering what it is given**, and delete the duplicate predicates
   in `explore/page.tsx`.

Fold §2 in when this lands — a backend-owned tag set is the natural home for a real `recommended`
signal and a `today` check.

---

## 3. `[BE]` Chat backend — persistence, room list, real unread

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

## 3b. `[FE+BE]` Join a community — the button exists, nothing behind it

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
   > ⚠️ Mind the startup-order trap in `HANDOVER.md`: the community service must still create the
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

## 3c. `[FE+BE]` Verify the participant room end to end — and make people in it identifiable

**Why this matters now:** `FeatureBand`'s lead card on the home page says *"Every event has its
own room. Ask the organiser a question, and meet the people going."* That is a claim to every
visitor, so the room needs to be confirmed working, not just confirmed present.

**What has been verified — by reading the code only (2026-08-18):**
- The room id **is the event id** (`app/chat/[roomId]` opens `CHAT_WS_BASE/{roomId}/{userId}`).
- Membership is **tickets held ∪ events organised**, deduped (`app/chat/page.tsx`), so every
  ticket-holder and the organiser resolve to the same room for a given event.
- `ConnectionManager.broadcast_to_room` fans each message out to **every** socket in
  `active_connections[room_id]`, plus a Redis publish for other instances.

So it is a group room by construction, not a 1:1 with the organiser. **Nobody has run two clients
against one event and watched a message land.** Do that first: two browsers, two accounts, both
ticketed on the same event, and confirm each sees the other's message.

**Gaps found while reading — fix before leaning on the card any harder:**
1. **Nobody is identifiable.** Every sender that is not you renders as
   `Attendee <first 4 chars of their UUID, uppercased>`. There is **no organiser branch at all**, so
   the one thing the card tells people to do — ask the organiser — cannot actually be acted on,
   because you cannot tell which message is theirs. The page already knows `roomId === event.id`,
   so look the event up and compare `msg.sender_id` against `organizer_id` to badge them. Real
   display names need a user lookup (`GET /user/{id}`) or a name on the broadcast payload.
2. **Nothing persists** — see §3. Two people in the room at different times see an empty room, so
   "meet the people going" only works if they happen to be online together.
3. **Post-booking only** — a prospective attendee cannot reach the room at all, which is the same
   shape of problem as §7b. The card's copy deliberately does not say *when* you can chat, so it
   stays accurate either way; do not "clarify" it.

---

## 4. `[BE]` Ticketmaster geocoding

Ingestion runs, but many Ticketmaster events carry no venue coordinates and are currently saved with
`lat: 0, lng: 0`. That is a real point in the Atlantic, so those events fall out of every radius
search. Needs a geocoding API (Google Maps or Nominatim) in
`backend/services/recommendation/app/services/ticketmaster_ingestion.py`.

Note `eventCoords()` in `SimilarEvents.tsx` already treats `0,0` as "no coordinates" — keep that
guard until this is fixed.

Once geocoding works end to end, `seed_events.py` is no longer needed for populating **events**
(still useful for communities).

---

## 5. `[FE]` Auth guards race zustand hydration — NEEDS A DECISION (behaviour change)

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

## 6. `[FE]` Event card meta row is over-stuffed at `xl:grid-cols-4` — NEEDS A DECISION

Measured at 1440px: the row is 285px and the fixed content (calendar + date + clock + time + pin,
all `shrink-0` at 18px) eats 241px, leaving the venue **44px** — so even "The Blue Room" truncates
to "The…". It looks fine at `sm:grid-cols-2`, where cards are wider.

**Pre-existing, not caused by the clock icon** — the old `date · time · pin venue` layout left the
venue 47px, a 3px difference.

**Options, all of which change the card:** drop the venue from the row, wrap to a second line, or
shrink the row's 18px type (limited by the 15px font floor).

---

## 7. `[FE]` Chat launcher overlaps the last Similar-events card — NEEDS A DECISION

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

## 7b. `[FE+BE]` Should the event assistant be open to users not registered for the event? — NEEDS A DECISION

The AI assistant in `EventChatWidget` is gated to the organiser or a ticket-holder, on both sides:
the backend 403s any other caller (`chat_endpoint.py`, the `_user_has_ticket` check), and the widget
mirrors that client-side with an `access` state, so a browsing visitor never sees an error — they
get a designed locked panel reading **"Attendees only / Register for this event to unlock the AI
event assistant"** (signed-out users get **"Sign in to chat"** instead).

**The question:** the launcher is visible to everyone on `/event/[id]`, but only works after you
book. That is backwards from the moment the assistant is most useful — a prospective attendee
deciding *whether* to go is exactly who has questions about what to bring, where it is, and what to
expect. Today they can open the panel and be turned away.

**Three ways to go, all with a real cost:**

1. **Open it to everyone.** Drop the ticket check for non-organiser callers. Best for conversion,
   and it makes the feature advertisable on the home page. Costs: every anonymous visitor becomes a
   billable OpenAI call with no rate limit in front of it, and the widget currently sends `user_id`
   with no signed-out path — an unauthenticated caller has no id to send.
2. **Open it to signed-in users only.** Keeps a real identity on every call and gives a natural
   throttle key; still turns away the anonymous browser. `no_auth` keeps its current panel,
   `no_access` goes away.
3. **Leave it gated and hide the launcher** when `access` is `no_auth` / `no_access`, so nobody is
   offered a control they can't use. Cheapest, but gives up the pre-booking use case entirely.

**Blocks the home-page features section** — whether we can advertise the assistant, and how the
copy has to be worded, depends on this answer.

If 1 or 2 is chosen, also decide: rate limiting (the gateway's 60/min is per-IP and global, not
per-user), whether the system prompt's role note needs a third "prospective attendee" variant
alongside the organiser/attendee ones, and whether an un-booked visitor should see a nudge to
register in the assistant's answers.

---

## 8. `[FE]` Home-page filter tabs — CLOSED

**Nothing left here.** The tabs were the last radius question in the app and the app-wide
single-radius sweep (Gautham, 2026-09-11) answered it: every tab row is `rounded-lg`, the same as
every other control. `EventsCarousel`'s approved `rounded-xl` departure and `CommunityCarousel`'s
`rounded-full` pills both went in that sweep, parked code included, so the two carousels no longer
diverge and the §12 restore has nothing to match up. The rule is in
`frontend_react/apps/web/CLAUDE.md` → *Shape*.

---

## 9. `[FE]` Remaining icon-set stragglers

`EventIcons.tsx` unified date/time/location/verification, but these are still outline heroicons and
were deliberately left out of scope:

- Decorative **empty-state** calendars in `EventsCarousel` and `community/[slug]`
- The `/checkout` event thumbnail
- The organiser console's `EventIcon` stat glyph

`/checkout`'s "Expiry Date" field keeps its outline calendar **on purpose** — it belongs to the
payment form's own icon family (`CardIcon`, `LockIcon`, `PersonIcon`), and it is a card expiry, not
an event date. Leave it alone.

---

## 10. `[FE]` Dead code awaiting sign-off

> ⚠️ **Nothing community-related belongs in this section.** The whole feature was parked for Phase 2
> on 2026-08-14 (§12) and reads as unused on purpose — `CommunityCarousel.tsx` in particular has no
> live importer for its components. **Parked ≠ dead. Do not add it here and do not delete it.**

- `components/EventCard.tsx` — nothing imports it. Confusingly named: the card actually rendered is
  `EventCardItem` from `EventsCarousel.tsx`. Uses `@eventmind/types Event`, a different shape to
  `CarouselEvent`. Carries `data-keep-type` for its intentional 11/12/14px type.
- `components/ShareButton.tsx` — only importer is `EventCard.tsx`, so effectively dead.
- `PendingIcon` in `components/organizer/ConsoleIcons.tsx` — lost its only caller when the console
  header's "N need you" pill was removed on 2026-09-02 (§24). ⚠️ **Keep it.** It is part of the
  console's chrome glyph set, and the notification bell §24 specifies is the obvious next user —
  a waiting-clock face is exactly what a "refund requested" row wants.
- `eventmind/frontend/` — one stray `.iml` file left from the deleted Flutter app.

Both components were kept only to avoid an unrequested deletion. **Confirm with Gautham before
removing.**

---

## 11. `[mixed]` Smaller gaps

⚠️ **This is the one section with no single tag** — each bullet carries its own, because they have
nothing in common but their size.

- `[FE]` **SEO metadata** on dynamic routes other than `/event/[id]` and `/community/[slug]`.
- `[FE+BE]` **Notification bell** — icon present, no panel, no backend.
- `[FE]` **Help page** — link present, no page.
- `[BE]` **Real ticket issuance** — tickets are Zustand/localStorage only, never written to the database.
- `[FE+BE]` **Social login** — buttons present, disabled.
- `[FE+BE]` **Event image upload** — `image_url` exists and is populated for synced events; no organiser upload path, no field on the create form.
- `[FE+BE]` **Ticket tiers** — backend supports one price per event; Free/Standard/VIP needs schema changes.
- `[FE+BE]` **Participant Profile** — `/dashboard` interests are hardcoded (Technology, AI, Venture Capital); needs real profile storage. The profile picture added 2026-09-11 is in the same boat: `useProfileStore` writes it to localStorage because `profiles.avatar_url` is a `String(512)` with no upload endpoint behind it. When storage lands, `fileToAvatarDataUrl` becomes the POST and the store becomes its cache — no call site moves.
- `[FE]` **One dialog chassis, two definitions.** `components/ModalShell.tsx` is the shared one
  (overlay, panel, title row, Escape, click-outside, portal) and the organiser's edit and cancel
  dialogs use it. **`components/ShareModal.tsx` predates it and still hand-rolls the same chassis** —
  the values were copied across so the three look identical today, which is exactly the drift that
  will not survive the next change to either. Move `ShareModal` onto `ModalShell` (its body becomes
  the story preview + the two action buttons). ⚠️ Note `ShareModal`'s `mounted`-state portal guard is
  a lint error in this repo (`react-hooks/set-state-in-effect`); `ModalShell` uses a
  `typeof document` check instead and has none — **take the shell's version, not the modal's.**
- `[FE+BE]` **Community reviews are borrowed from the community's events.** There is no community-scoped
  review endpoint — the review service only serves `/review/event/{id}` — so
  `components/CommunityReviews.tsx` fans `useQueries` over the community's most recent past events
  (capped at 6) and averages what comes back. The subtitle says so out loud. If a real
  `/review/community/{id}` ever lands, swap the component's data source and drop the cap; **do not
  relabel the current aggregate as a community rating.**
- `[FE]` **`community_id` is ignored in dummy data mode.** `dummyEventSearch()` in `lib/data-source.ts`
  honours only `event_type`, `category`, `q`, `organizer_id` and `limit`, so in dummy mode every
  community's events rail shows the whole fixture catalogue. That is consistent with dummy mode's
  stated purpose (keep the UI populated for beautifying) — but **don't read the rail's contents as
  proof the filter works.** Verify that against `NEXT_PUBLIC_DATA_MODE=real`.
- `[FE]` **Community share links use `id` where the route resolves by `slug`.** Cards link to `/community/${CommunityItem.id}` and `shareUrl()` deliberately matches, so both are always the same string. In dummy fixtures `slug === id`, so it works today — **if the API ever returns a slug that differs from the id, both break together.** Fix by threading the real `slug` through `toCommunityItem()`.

---

## 12. `[FE]` Phase 2 — un-park the community feature

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
   1024px — restoring the Communities dropdown puts a **third** nav item into the desktop row beside
   Participants and Organisers, and that row is the width that breaks first. The navbar search box is
   `w-[170px] xl:w-[410px]`, both below the values that were measured to fit *with* that dropdown
   present, so this should pass; verify rather than assume.

---

## 13. `[FE+BE]` Pricing — free to list, 2% on paid events

**Decided by Gautham (2026-08-17), amended 2026-08-19:** listing an event is free, free events cost
**both sides** nothing ever, and paid events carry a flat **2% convenience fee — paid by the
PARTICIPANT, not the organiser.** ⚠️ **That amendment changes the build, not just the wording.** The
fee is added on top of the ticket price at checkout, not deducted from the organiser's payout, so
the buyer's total is `price + 2%` and the organiser is made whole. The `FeatureBand` pricing card
("Free to list. Small fee for paid events.") states it in exactly those terms and is **live on the
home page ahead of any implementation** — so this is a promise already on the page, not a
nice-to-have. Do not build the organiser-pays version the earlier wording implied.

**Nothing exists.** There is no fee, commission, payout or invoicing code anywhere in the backend.

**Needs:**
1. The fee applied at checkout and **itemised as the participant's line** — `/checkout/[id]`
   currently adds a flat `2.5` service fee that is unrelated to this and needs reconciling against
   it. The home page calls it a *convenience fee*; the checkout label should not invent a third name.
2. The fee shown on the **event/checkout side before the participant commits**, so the total isn't a
   surprise — and stated on `/organizer/create` too, since an organiser setting a price needs to
   know what their attendee will actually be charged.
3. Reconciliation against the Stripe intent, and a payout path to the organiser **for the full ticket
   price** (the platform keeps the separately-collected 2%).

⚠️ **Sits behind real payment confirmation.** `/checkout/[id]` creates a genuine PaymentIntent but
never confirms it — success is a hardcoded 2 s `setTimeout` — and tickets never reach the ticketing
DB (§11). A percentage of a payment that never completes is meaningless, so do §11's real ticket
issuance and real payment capture first.

---

## 14. `[BE]` Organiser stats dashboard

**Promised on the home-page `FeatureBand`** ("Everything an organiser wants, in one place — see all
your event info and stats in the organiser dashboard, one at a time, or all together"), and intended
for the MVP.

⚠️ **That copy was softened on 2026-08-19 and no longer names a figure.** It used to promise
"tickets sold, revenue, and how each event is tracking", which set a bar nothing could clear:
"tickets sold" needs real ticket issuance (§11) and a real `tickets_sold` (§2b — nothing writes to
that column today), and "revenue" needs payments that actually complete (§13). The card now says
"info and stats", so **event counts and statuses honestly satisfy it** and the two harder figures
can follow their dependencies. **Do not put revenue or tickets-sold back into the card before the
numbers behind them are real, and do not wire the page to the existing hardcoded constants and call
it done.**

**Wanted:** per-event stats, all-events aggregate, and any organiser-selected subset.

**✅ BUILT 2026-08-20 — the front end of this is done.** `app/organizer/page.tsx` was replaced by the
multi-section console at `app/organizer/(console)/*` (dashboard v2, imported from Claude Design). What
that closed:
- The three hardcoded constants (**Total Revenue `12450`**, **Total Attendees `1,240`**, per-row
  `price * 120`) are **gone**. Revenue is now `tickets_sold × price` in the event's own currency, and
  every figure without a real source prints an em dash instead of a number.
- ⚠️ **The live bug is FIXED.** The old page called `eventsApi.search()` with **no `organizer_id`**,
  so "Your Managed Events" listed every published event on the platform rather than the signed-in
  organiser's. The console fetches through `organizerSource.events(organiserId)`, which passes it.

**Still blocked on the same data as §13 and §11:** attendee counts need `tickets_sold` to be real
(§2b), and revenue needs payments to actually complete. The console reports event counts, statuses
and sold/capacity honestly and says plainly where a figure has no source — **the remaining backend
work is itemised in §19.**

---

## 15. `[FE]` `FeatureBand` — a "plenty to choose from" card for participants — LATER, NOT NOW

**Wanted by Gautham (2026-08-19), deliberately deferred.** A participant tile on the home-page
`FeatureBand` whose message is *"choose from the plethora of options we have on this website"* —
breadth of catalogue as a reason to use NewFind.

⚠️ **The trigger is the only thing holding it back, and it is a number, not a date.** The claim is
only true once there are enough events live to boast about, so **do not add this card until the real
catalogue backs it.** A breadth claim on a thin catalogue is the same failure mode as the dead
`Recommended` badge (§2): it breaks on the first click, on the page that is supposed to earn trust.
There is no agreed threshold yet — **ask Gautham for the number before building it**, and check it
against `/event/search`, not against a seeded or dummy-mode database.

**Where it goes:** the participants half of `components/FeatureBand.tsx`. That half currently runs
two cards plus its CTA tile because **"Everything in one feed" is commented out there** — it made a
neighbouring breadth claim ("big-name listings and independent organisers … one place, not five
tabs"), so **decide between the two rather than shipping both**; two adjacent tiles both saying
"lots of events" reads as padding. ⚠️ **Adding a tile is a layout change**: the band is one flat grid
whose top step is `band:grid-cols-7`, matching today's seven tiles exactly, so an eighth needs that
count and probably its 1400px breakpoint re-picked — see the notes in the component.

**Reuse the live count — do not hardcode a figure.** `HeroCarousel`'s "About N options" is already
this exact pattern: `GET /event/count` → `eventsSource.count()` → React Query, rounded to the
nearest 10, and it renders **no number at all** below 10 rather than "0 options". A card that names
a figure must take it from there and must degrade the same way, so the copy has to hold together
with the number absent (loading, failure, or a thin catalogue). If the copy can only work with a
number in it, it is not ready to ship.

⚠️ **Not a recommendations claim.** "Lots to choose from" is about the catalogue; it must not drift
into "we'll pick the right ones for you", which is §2 and is not built.

---

## 16. `[FE]` Event rooms are being parked for Phase 2 — the `FeatureBand` chat card goes with them

**Gautham's plan (2026-08-20), mostly not yet actioned.** The per-event chat room every event
carries is to be **commented out and pushed to the next phase**, the same way communities were
parked on 2026-08-14 — parked, not deleted.

> ⚠️ **One piece of this IS done, and it was a deletion, not a parking.** The organiser console's
> **Event rooms section** was removed outright on 2026-09-01 (Gautham) — see §19's header. That was
> the organiser's private mirror of the room, and it is gone for good, not commented out. **The
> participant-facing room is a separate question and is still fully live** — `/chat`,
> `/chat/[roomId]`, `EventChatWidget`, `ChatPresence` and the `FeatureBand` tile below are all
> untouched, and everything in this section still applies to them.

⚠️ **The home page advertises it, so the copy has to move in the SAME change.** `FeatureBand`'s
lead participant tile is *"Talk to the organiser before you go — Every event has its own room. Ask
the organiser, meet the people going, even before it starts. Say goodbye to endless emails."* The
moment rooms are unreachable that tile is **a promise the product cannot keep**, on the page whose
whole job is to earn trust. It is the first card a participant reads.

**Adjust the card — do not just delete it and leave a hole.** In order of preference:
1. **Comment it out** alongside the room code, exactly like the parked "Everything in one feed"
   card two lines below it in `FEATURES.participants`. That leaves the participants half with one
   feature tile plus its CTA.
2. **Or replace it** with §15's "plenty to choose from" tile if the catalogue is big enough by then —
   that would keep the half at two feature tiles and needs no grid change.

⚠️ **Removing a tile IS a layout change.** The band is one flat grid whose top step is
`band:grid-cols-7`, sized to exactly today's seven tiles. Dropping the chat card makes it six, so
`grid-cols-7` must become `grid-cols-6` **and** its 1400px breakpoint should be re-picked — six wider
tiles need less room, so the row can start earlier. The narrower steps are bound with `max-band:`
for a reason; read the notes in the component and beside `--breakpoint-band` in `globals.css`
before touching them.

**What else names the room, and must be swept in the same pass:**
- `components/ChatPresence.tsx` — the app-wide listener mounted in `layout.tsx` that lights the
  navbar's chat glow. Its whole purpose is per-event rooms.
- The chat button in `components/navbar/Navbar.tsx` and its unread dot (`eventmind-chat-unread`).
- `/chat`, and the room entry point on `/event/[id]`.
- ⚠️ **`EventChatWidget.tsx` is NOT this.** That is the AI event assistant, a different feature that
  stays — and `FeatureBand`'s second participant tile ("An AI assistant that knows the event inside
  out") is about the assistant, not the room. **Do not park that card by mistake.**

**Related, and partly superseded by this:** §3 (chat persistence, room list, real unread) and §7b
(should the assistant open to unregistered users) — §3's work is exactly what parking defers.

---

## 17. `[BE]` The "Recommended" tab has no recommendation engine behind it — build one

**Gautham (2026-08-20): there is no working recommendation system, and the home page's "Recommended"
tab needs one.** §2 records the symptom on the frontend (nothing ever emits a `recommended` badge, so
the tab matches zero events); this is the backend half, and it is the bigger one. **Do §2 and this
together — neither is worth doing alone.**

**What actually exists today** (`backend/services/recommendation/`):
- `app/services/recommendation_logic.py` — `generate_recommendations(user_id)`: fetches the user
  profile, fetches `/events/search?status=published`, and keeps an event if its `category` is in
  `user.interests` **or** if any interest string appears in the event description. That is the whole
  algorithm: a substring match. No scoring, no ranking, no ordering, and **no limit** — it returns
  every match in whatever order the event service listed them.
- `app/api/reco_endpoints.py` — `GET /recommendations/for-you?user_id=…` wraps it. Also
  `GET /recommendations/trending`, which **returns a hardcoded `[]`**, and
  `POST /recommendations/refresh/{user_id}`, which returns a "task started" message and starts
  nothing.
- ⚠️ **Nothing on the frontend calls any of them.** `packages/api` only reaches this service for
  `ingestCity()` (the Ticketmaster pipeline, which lives in the same service but is unrelated work).

**⚠️ It cannot work as written, for three reasons — fix these before tuning any algorithm:**
1. **`user.interests` is effectively always empty.** The column exists
   (`user_profile.py`, `Column(JSON, default=[])`) but nothing in the product ever fills it: the
   interests block on `/dashboard` is **hardcoded display values** (see `STATUS.md`), and there is no
   UI to set them. An interest-matching engine over an empty interest list returns `[]` for every
   user. **Either collect interests (onboarding, or infer from bookings) or pick a signal that
   exists.**
2. **The behavioural signals it would otherwise use are also empty** — `tickets_sold` is never
   written (§2b) and tickets never reach the DB (§11), so "people who booked X also booked Y" and
   any popularity ranking have no data yet. `/recommendations/trending` returning `[]` is honest
   about that.
3. **It needs Redis.** `RecommendationService.__init__` constructs a `redis.Redis` client at import
   and caches results for an hour. The dev launchers run with `REDIS_HOST=MOCK`, so **verify the
   cache path works (or is bypassed) under the mock before trusting a local test.**

**A defensible first version, in order:**
1. **Decide what "recommended" means and write it down** — it is a promise on the home page. With no
   interests and no booking history, the honest MVP is *proximity + upcoming + category affinity from
   what the user has actually viewed or wishlisted* (`eventmind-wishlist` is real and local; a
   server-side view/wishlist signal would need adding).
2. **Return a RANKED, LIMITED list**, not every match — with a score, so the frontend can take a top N.
3. **Expose it through the gateway** (`/recommendation/*` → the service) and add a `packages/api`
   client beside `ingestCity()`; today there is no frontend path to it at all.
4. **Feed the badge from the backend**, per §2b — the `recommended` flag belongs in a backend-owned
   tag set, not another branch in `toCarouselEvent()`. That is what finally makes the tab match
   something.
5. **Handle the cold-start case explicitly.** A new, signed-out, or interest-less user must get
   *something* sensible (nearest upcoming events) or the tab shows an empty state on a fresh account
   — which is exactly today's bug wearing a new coat.

⚠️ **Until this ships, do not advertise recommendations anywhere in the UI** — `FeatureBand` has a
standing rule against it (see the component header), and `STATUS.md` lists the dead badge under
known-wrong. **A "Recommended" tab that matches nothing is worse than no tab**, so if this work is
not being picked up, take §2's second option and drop the tab instead.

---

## 18. `[OPS]` Verify event/community share on a public deploy — the link unfurl (1b) cannot be tested on localhost

The share feature is built and works: the Share button (on event/community cards + the event hero)
hands the generated **story image** (1c, `/{event,community}/[id]/story` → PNG) to the native share
sheet on mobile, and the **link-unfurl** metadata (1b) is emitted by `generateMetadata()` +
`opengraph-image.tsx`. Both images render correctly (verified locally).

**What can't be tested locally — and why:** the 1b card is drawn by whatever app the link is *pasted
into* (WhatsApp, iMessage, Slack, X), which fetches the page's Open Graph tags from a **public URL**.
On dev the links are `http://localhost:3000/...`, which only resolve on the dev machine, so no
external app can reach them — pasting a link shows a bare URL with no card. This is expected, not a
bug. (Gautham hit this on 2026-08-20: clicking Share opened the Windows OS share sheet, and Copy link
pasted a non-previewing localhost URL.)

**To verify after deploying to a public domain:**
1. Set **`NEXT_PUBLIC_SITE_URL`** (e.g. `https://newfind.co`) in the deploy env so `og:url`,
   `og:image` and the copied link are absolute + reachable. Without it they default to
   `http://localhost:3000` and the unfurl stays broken in prod.
2. Paste a real event link into WhatsApp / iMessage / Slack and confirm the **1b** card renders
   (image left, mark → title → place · date · price). Debug with the metadata validators
   (opengraph.xyz, Slack's link unfurl, X card validator) — they fetch the URL live.
3. On a phone, tap Share and confirm the **1c** story PNG reaches the native sheet (post to a story).

**Optional desktop polish (deferred, Gautham to decide):** on desktop the browser's Web Share API
opens the clumsy OS share sheet. We could instead show our own popup there (preview of the 1c card +
Download image + Copy link — the `ShareModal` fallback already exists; just gate native share to
mobile). Left as-is for now.

---

## 19. `[BE]` Organiser console — the backend behind the dashboard v2

**The UI is built and live** (`app/organizer/(console)/*`, imported from the Claude Design file
"Organiser Dashboard v2", 2026-08-20). Three sections: Events, Attendees, Earnings.
**One of them is real; two are waiting on endpoints that do not exist.**

> ⚠️ **THREE SECTIONS HAVE BEEN DELETED (Gautham), and none is rebuilt without asking.**
>
> - **Dashboard** (2026-09-07) — it and Events showed the same rows off the same `toConsoleRows`,
>   one truncated to five. Its **overview band** — the ink "next up" hero, its notifications
>   column and the five portfolio tiles — is now the top of `/organizer/events`, which is the
>   console's landing section and wears the greeting as its `h1`. `/organizer` redirects there.
>   **Everything below that used to say "Dashboard + Events" now means Events alone.**
>
> - **Settings** — route, rail item and gear glyph gone, with the organiser-profile /
>   event-defaults / team-&-notifications groups. Only its four **payment terms** survive, as a
>   read-only card at the foot of Earnings (`dummyPaymentTerms` → `organizerSource.paymentTerms()`).
>   **When §19.5 below is built, it lands in that card — do not rebuild the section to hold it.**
> - **Event rooms** — route, `RoomsIcon`, `dummyRooms`, `dummyThreads`, `organizerSource.rooms()` /
>   `.thread()` and the whole `unread` question count, gone. Attendee conversation happens in the
>   **chat** surfaces for organisers and participants alike; making that work for an organiser is a
>   backend job, restated in §19.1 below. **Nothing counts unanswered questions any more**, which is
>   why the header's "N need you" pill is attendees-only and the "next up" hero lost its "Questions"
>   tile and both room CTAs. Do not reintroduce a count that can only print zero.

**Real today:** Events, from `eventsSource.search({ organizer_id })` via
`organizerSource.events()`. Event, when, where, sold (`tickets_sold`/`capacity`), gross revenue
(`tickets_sold × price`, in the event's own currency) and the live/upcoming/past/draft buckets are
all derived from data the events service actually returns.

**Not real — and deliberately NOT faked.** In `dummy` data mode these render the fixtures in
`lib/fixtures/organizer.ts` so the whole design is visible with no backend; in `real` mode
`organizerSource` returns empty and each section renders `NotBuiltYet`, which says the endpoint does
not exist rather than showing a zero. ⚠️ **Do not "fix" that by serving the fixtures in real mode** —
an organiser reading invented revenue or invented attendees for their own event is the one failure
this design must not have.

> ⚠️ **EVERY NUMBER ON THIS CONSOLE IS THE BACKEND'S JOB FOR A REAL EVENT** (Gautham,
> 2026-08-21). The revenue figures, the earnings table and its totals, the portfolio roll-ups,
> the check-in rate, the refund amounts, the unread counts — all of it. What the fixtures do is
> **derive** those figures from the organiser's own events (`dummyMyEvents` in
> `lib/fixtures/events.ts`), so the shape of the answer is already settled and the front end has
> nowhere left to invent one. **That derivation is a specification, not an implementation** — it
> runs on eight fixture events in one currency with no concurrency and no money movement, and
> every item below is what it takes to compute the same thing honestly. The rule that survives
> into production: a figure with no source prints an em dash, never a `0`.

**Endpoints needed, roughly in the order they unblock the most screen:**
1. **The organiser's side of the event chat** — ⚠️ **restated 2026-09-01 (Gautham). This is no
   longer a console section; it is a chat feature.** The console's Event rooms page is deleted, and
   the requirement in its place is that an organiser and their attendees talk in the **same chat
   surfaces everyone else uses** (`/chat`, `/chat/[roomId]` — *not* `EventChatWidget`, which is the
   AI assistant; see §16) rather than in a private organiser mirror of them. What is missing is entirely backend: the chat service has no
   organiser-room concept, does not persist messages (§3), and cannot tell an organiser's message
   from an attendee's — so there is no unread count, no question/answered state and no way to post
   an update to a room. **Build it in the chat service under §3 / §3c, not as a new console page.**
2. **Attendees** — organiser-scoped ticket holders per event: name, contact, ticket type, amount
   paid, booked-at, status. Blocked on real ticket issuance (§11) — nothing writes tickets to the
   ticketing DB today.
3. **Check-ins** — a check-in record per ticket, and the door flow behind "Start check-in mode".
   ⚠️ **The door flow EXISTS on the Attendees page and writes to localStorage** (2026-09-11,
   `lib/checkin-store.ts` — one device's record, invisible to a second phone at the same door).
   When this endpoint lands, `setCheckedIn` posts to it and the store file goes; the page's
   controls, tile and status pill need no redesign. Everywhere ELSE a check-in figure would go
   (the Events table, the overview tiles) still prints an em dash, never a `0`: "nobody has
   arrived" and "we do not record arrivals" are different statements and must not be conflated.
4. **Earnings** — per-event settlement. ⚠️ **The organiser keeps the full ticket price.** The 2% is
   the participant's convenience fee, added on top at checkout (§13, amended 2026-08-19), so
   `net = gross − refunds` and the fee column is informational. The imported design deducted it from
   the organiser and that framing was **removed on import** — do not reintroduce it. Blocked on
   payments actually completing (§13) and on refunds existing at all (**§21** — which is also where
   "does the buyer's 2% come back on a refund?" gets answered; this column's arithmetic assumes not).
5. **Payment terms** — a preferences record behind the four rows the Earnings page prints:
   receiving account, convenience fee, refund window, who approves refunds. Read-only today, and
   the account is a fixture string; company details remain editable on `/organizer/onboarding`.
   ⚠️ **Scope shrank on 2026-09-01** — default visibility, waitlist, room-on-publish, notification
   routing and co-organisers were deleted with the Settings section and are **not** waiting on this
   endpoint. Do not build them back in on the strength of this item.
6. **Drafts** — `eventsApi.search` hardcodes `status: "published"`, so an organiser cannot list
   their own drafts. The Drafts tab is therefore always empty against a live backend. Needs either
   an organiser-scoped event endpoint or a `status` passthrough.
7. **Console search + filters** — the header search box is a disabled control with a title
   explaining why. ⚠️ **Events is the reference**: its price filter and date sort run client-side
   over rows `useOrganiserEvents` has already fetched, via `FilterSelect` in `ConsoleUI.tsx` and
   `filterAndSortRows` in `lib/organizer-rows.ts`. **Where the rows are already in memory, do the
   work rather than disabling the control.** Applying that rule (2026-08-24), **Attendees and
   Earnings now each have a working per-event `FilterSelect`** bound to `?event=<id>` — which is
   also how `/event/[id]`'s organiser card deep-links into them (`manageAttendeesHref` /
   `manageRevenueHref`), and **Attendees' ticket-type and status dropdowns work the same way**
   (2026-09-11, `?ticket=` / `?status=`, options derived from the rows on screen). **Still disabled
   and still waiting on a backend:** the header search and the Earnings date range — those
   genuinely need an organiser-scoped query endpoint, since the fixtures hold one sample rather
   than a full list.
   ⚠️ Both pages test `NotBuiltYet` against the **unfiltered** list; a filter matching nothing
   renders an `EmptyState` instead. Do not collapse those two states into one.
8. **Event visibility (public/private)** — there is no visibility column. The console used to stamp
   a hardcoded "Public" pill on every row and describe an invite-only mode in three places; all of
   it was removed on 2026-08-21 (Gautham: there are only public events). **Do not reintroduce a
   badge, a filter or the copy until the column exists** — a badge that can only say one thing
   carries no information, and a wrong privacy claim is worse than no claim. When it lands, add
   `visibility` back to `ConsoleRow` in `lib/organizer-rows.ts` and let the pill read it.
9. **Portfolio roll-ups** — `GET /organizer/{id}/overview`, serving what `dummyPortfolio` computes:
   events run, tickets sold (plus the last-7-days delta), net revenue, check-in rate, refunds
   issued, average ticket. ⚠️ **These must be computed BY the backend, not by summing whatever the
   events endpoint happened to return** — a paged or filtered event list would silently under-report
   an organiser's revenue, which is the worst kind of wrong number: plausible. Depends on 2, 3, 4.
10. **A currency answer for a multi-currency organiser.** Every total on the Dashboard and the
    Earnings page ADDS ROWS UP, and an organiser with a London event and a Mumbai one has no single
    honest total. The fixtures dodge this by asserting one currency (`assertOneCurrency`) and the
    pages read the currency off the data rather than naming one — so the **front end is ready and
    the product decision is not**. Pick one before this ships: totals split per currency, or
    converted at a stated rate on a stated date. **Do not let it default to "whatever the first row
    said".**
    ⚠️ **One half of this is now settled and it is NOT the totals half.** A single event's currency
    can no longer move: price and currency are chosen once on `/organizer/create` and the edit
    dialog shows both read-only (Gautham, 2026-09-01) — so a row's totals can never be a sum across
    two currencies *within one event*. **The open question is unchanged and is the harder one:** an
    organiser running events in two currencies still has no honest single total on the Dashboard or
    the Earnings page. Do not read the locked field as this item being done.
    **This is the organiser-totals half of §25**, which collects the same gap on the participant side
    (the price filter and the price sort compare raw numbers across currencies). A rate source
    answers both; **this item stays the source of truth for the totals question.**
11. **The `tickets_sold` column has to become real first.** Revenue on this console is
    `tickets_sold × price`, and nothing writes that column today (§2b) — so on a live backend the
    Events table's Revenue column is currently `0 × price` for every row. That is the single
    highest-leverage item in this list: it is upstream of 2, 4, 9 and of §14's promise.

12. **The organiser-authored extras have no columns — agenda, announcements, FAQ, offer name, an
    editable cover image, and (since 2026-09-11) the organisation name.** The whole frontend shipped on 2026-08-24 (Gautham asked for it, and
    chose frontend-only over a migration): `/event/[id]` renders all three lists publicly, the
    organiser authors them through `EditListModal`, and the offer name and cover image are fields in
    `EditEventModal`. **On 2026-08-31 the agenda and the FAQ also became sections of
    `/organizer/create`** (same call, same trade — frontend now, columns later), so an organiser can
    seed both while writing the event instead of only after it exists. **Every one of those controls
    is disabled in real mode**, off `EXTRAS_ARE_LOCAL` in `lib/data-source.ts`, because
    `EventCreate` / `EventUpdate` do not accept the keys and Pydantic drops them silently — an
    organiser would type an agenda, press Save, and watch the server's reply wipe it with no error.
    `lib/event-extras.ts` is the whole gate; read its header.

    What it takes to make them real:
    - **`image_url` is one line and no migration** — the column already exists on `events`, it is
      merely absent from `EventUpdate` in `backend/services/event/app/schemas/event_schemas.py`.
      **Do this one first**, then take `image_url` out of `EXTRA_KEYS`. (Still no *upload*: there is
      no file storage, so the field takes a URL and says so.)
    - **`offer_name`** — a `String(60)` column, plus `EventCreate`/`EventUpdate`/`EventOut`.
    - **`organization_name`** — a `String(120)` column, plus the same three schemas. ⚠️ **This one
      is NOT disabled in real mode, and it is the only extra that is not** (Gautham, 2026-09-11).
      It is a **required** field on `/organizer/create` in every mode, because it is what
      `/event/[id]` prints under "Organised by" and Gautham chose to build that frontend ahead of
      the column. The loss is bounded rather than silent: the event page falls back to its own
      `ORGANISER_NAME` placeholder whenever the field is absent, which is every event today. **Do
      not copy the exception onto the other five** — an agenda that vanishes has nothing to fall
      back on. Landing this column is also half of §1 (the other half is the "Verified · 40+
      events" trust line, which is still hardcoded).
    - **`agenda`, `announcements`, `faq`** — three JSON columns (the shapes are already typed as
      `AgendaItem`, `Announcement` and `FaqItem` in `packages/types`), or one `organiser_content`
      JSON blob holding all three. ⚠️ **Not `content_generated`** — that is the AI agents' pipeline
      output, and mixing organiser-authored copy into it means neither side can be cleared without
      destroying the other.
    - ⚠️ **`agenda` and `faq` must land on `EventCreate` too, not only `EventUpdate`** — the create
      form sends them today and `eventsSource.create()` strips them on the way out. Adding them to
      `EventUpdate` alone would leave the create form silently lossy while the edit dialog worked,
      which is the confusing half-state this gate exists to avoid. (`announcements` is
      update-only by design — see the note at the bottom of this item.)

13. **"in N days" on the upcoming-event chip has to be computed server-side.** The chip beside the
    hero's title on `/organizer/events` (Gautham, 2026-09-11 — it replaced the "Paid" chip, which
    said nothing this band exists to answer) reads `overview.next.inDays`, and that is a **fixture
    number**: `lib/fixtures/organizer.ts` writes it, nothing derives it. In real mode there is no
    overview at all, so `RealNextUpHero` shows no chip rather than counting the days itself.
    ⚠️ **Do not "fix" that by subtracting dates in the browser.** A countdown computed from the
    viewer's clock is wrong for anyone whose timezone differs from the event's, which on this
    platform is most people, and it goes stale on a tab left open overnight — a plausible wrong
    number, which is the kind item 9 above already warns about. It belongs on the same
    `GET /organizer/{id}/overview` payload as the roll-ups, computed against the event's own
    timezone. Until then `inDaysLabel` in the page only spells the number ("today", "in 1 day",
    "in N days"); it does not work one out.
    - **All four need a migration script.** There is no Alembic: `create_all` only ever CREATES
      tables, so an added column 500s every query against the existing `platform_dev.db` until an
      idempotent `ALTER` has run. Copy `backend/scripts/migrate_add_currency_column.py` — it has the
      per-dialect `COLUMNS` dict that keeps SQLite and Postgres both working.
    - **Then delete the strip in `eventsSource.create()` AND `eventsSource.update()`, and
      `EXTRA_KEYS` with them** — there are now two, and either one left behind goes on discarding
      exactly the fields this work made real.
    - **Then flip the create form's editors on.** They read `!EXTRAS_ARE_LOCAL` for `disabled`;
      once the columns exist that gate is wrong there and the `disabledNote` copy goes with it.
    - ⚠️ **An announcement is not a notification.** Posting one changes the page and reaches nobody;
      the dialog says so. Wiring it to the notification service is §20's problem, not this one.
    - ⚠️ **Announcements are deliberately NOT on the create form** (Gautham, 2026-08-31). One is an
      update posted to an event people have already booked — dated, and rendered newest-first — so
      there is nothing to update at the moment the event is being written. **Do not "complete the
      set" by adding a third section there.**

**Access control — DONE for the console, still open for the API (2026-08-21).** `/organizer/*` now
requires an organiser PROFILE, not merely a login: `useOrganiser` returns `isOrganiser`, and the
console layout renders an explaining state with a "Become an organiser" link instead of the console.
Dummy mode treats whoever is signed in as the organiser on purpose — that is the development setup.
⚠️ **The remaining half is the backend's.** The console is only as private as the endpoints behind
it: every one of the items above must be scoped to the caller's own `organizer_id` server-side and
must reject a request for someone else's event, because a front-end guard stops a person clicking,
not a person curling. Attendee contact details and revenue are the two that matter most.

**Also worth doing here:** `/organizer/my-events` now overlaps the console's Events section almost
exactly. Both are reachable from the navbar. Decide whether to retire it and point its navbar entry
at `/organizer/events` — Gautham's call, not a silent deletion.

---

## 20. `[BE]` Postponing and cancelling an event — the frontend is done, nothing is told

**Shipped on the frontend 2026-08-21 (Gautham).** An organiser viewing their own `/event/[id]` can
switch to an organiser view and either **edit the details** (description, start/end date & time,
city, venue or online link) or **cancel the event**. Both write through
`eventsSource.update()` → `PATCH /event/{id}`, which already exists and works.

**What the backend does today:** `update_event` in
`backend/services/event/app/api/event_endpoints.py` copies the submitted fields onto the row,
commits, and returns it. That is all. It does not know a postponement from a typo fix, it publishes
nothing to Kafka, and **it does not check who is asking** (see the authorisation item below).

**Gautham's requirement (2026-08-21): a postponement and a cancellation must each send every
attendee a notification AND an email.** Neither exists.

**What to build, in order:**

1. **Treat a schedule/venue change as a POSTPONEMENT, not an edit.** Either a dedicated
   `PATCH /events/{id}/reschedule`, or a diff inside `update_event` — but the decision must be made
   in the **event service**, not in the browser. The frontend already tells the organiser "this
   counts as postponing the event" (`EditEventModal.tsx`); the backend currently disagrees silently.
   Publish `event.postponed` with the event id, the **old and new** `start_date` / `end_date` /
   `location`, and the organiser id. `create_event` shows the pattern —
   `background_tasks.add_task(kafka_manager.send, …)`.
2. **Publish `event.cancelled`** the same way when `status` moves to `CANCELLED`. It is a distinct
   message, not a postponement with no new date: the recipient's next action differs completely.
3. **Handlers in the notification service.** `services/notification/app/services/event_handlers.py`
   already has the shape (`handle_ticket_issued` is the closest sibling) and
   `notification_service.send_email` already renders templates. Two new templates and two new
   handlers. ⚠️ **Both need the attendee list, which means the ticketing service** — and nothing
   writes tickets to the database yet (§11, "real ticket issuance"). **That is the true blocker: an
   email pipeline over an empty ticket table sends nothing and looks like it worked.**
4. **In-app notification as well as email.** The bell in the navbar is an icon with no panel and no
   backend (§11) — a "notification" today has nowhere to land. Scope that with this, or the
   requirement is only half met.
5. **Authorisation on the write path — do this one FIRST.** `PATCH /events/{id}` takes no identity
   and checks no ownership: **any caller who knows an event id can rewrite or cancel anyone's
   event.** The gateway forwards the `Authorization` header already, so the fix is to decode the
   JWT in the event service and compare `sub` against `event.organizer_id`. The frontend's
   `ownsEvent()` (`lib/data-source.ts`) only decides whether to *draw* the controls — it is a UI
   gate, not a permission, and it is trivially bypassed with curl. ⚠️ **This is a live hole today,
   not a nice-to-have**, and it got worse the moment the UI made the edit path ordinary.
6. **Refunds on cancellation** — **specced in §21**, and still blocked on payments completing (§13)
   and tickets existing (§11). ⚠️ **§21's decision 5 is this one:** whether a cancellation refunds
   automatically or raises a request the organiser approves — an attendee whose event was called off
   did nothing to warrant a request queue. Decide it here, with this section. The cancel dialog says
   plainly that no refunds are issued; when that changes, change the dialog in the same commit.

**Two smaller frontend follow-ups**, deliberately left out and to be picked up with the above rather
than on their own:

- **A `Postponed` badge.** Nothing marks a moved event on a card or a hero. It needs a real signal
  (a flag or a recorded previous date — a client-side guess is not one) and a `BADGE_CONFIG` entry;
  §2b is the rule for where a tag may be derived. Until then a postponed event looks identical to
  one that was always on that date.
- **Un-cancelling.** `EventStatus` allows it and the API would accept it, but there is no control
  and no copy, on purpose: bringing back an event whose attendees were told it was off is a
  different action from cancelling, and needs its own message.

---

## 21. `[BE]` How to handle a refund — NEEDS A DECISION on the policy, then a build

**This is referenced from three other sections and specified in none of them** (§19.4 earnings,
§19.9 roll-ups, §20.6 cancellation). Each defers it in a sentence; this is the section they defer
*to*. **The policy half is Gautham's and comes first** — the build below is not startable without it.

**What exists today: two enum members and nothing else.**
- `PaymentStatus.REFUNDED` (`services/payment/app/models/payment.py`) and `TicketStatus.REFUNDED`
  (`services/ticketing/app/models/ticket.py`) are both declared, and **nothing in the repo ever
  writes either** — same shape of dead column as `tickets_sold` (§2b).
- `services/payment/app/services/stripe_service.py` has exactly two methods,
  `create_payment_intent` and `construct_webhook_event`. **There is no `stripe.Refund` call
  anywhere.**
- `payment_endpoints.py` is `POST /create-intent` and `POST /webhook`. **No refund endpoint**, and
  the webhook handles only `payment_intent.succeeded` and `payment_intent.payment_failed` — a
  refund raised *inside the Stripe dashboard* (`charge.refunded`) would fall through unrecorded, so
  the two systems would silently disagree about what was paid.
- There is **no refund record at all** — no table, no requested-by, no approved-by, no reason, no
  timestamp. A refund is an audit trail, not a status flip: `status = REFUNDED` on a ticket cannot
  answer who asked, who approved, when, or how much came back.

⚠️ **The frontend already speaks the whole vocabulary, and it is a specification** (the §19 rule).
`lib/fixtures/organizer.ts` carries per-event `refunds` (an amount) and `refundedTickets` (a count),
an attendee status of **`"Refund requested"`** whose row action is **Review**, the Earnings page's
`net = gross − refunds` column, the portfolio's "Refunds issued" roll-up, and two of the payment
terms at the foot of Earnings — **"Refund window: Up to 48h before"** and **"Who approves refunds:
You"**. **None of that is a decision that has been taken.** They are fixture values standing in for
answers, and the console reads them as read-only. (The "Refund request → Push" notification route
that used to say the same thing a third time went with the Settings section on 2026-09-01.) Do not treat the fixture's 48h and
organiser-approval as settled policy because they are typed somewhere.

**Decide these first — they change what gets built, not just the copy:**

1. **Who initiates, and is approval needed?** The fixtures assume attendee-requests-then-organiser-
   approves. The alternative is a self-serve refund inside the window with no approval step. These
   are different products: one needs a request record, a queue and two notifications; the other
   needs a button and a rule.
2. **The refund window**, and whether an organiser may change it per event. The Earnings row is
   read-only today; if it becomes editable it is a **column on the event**, not a global constant.
3. **⚠️ What happens to the 2% convenience fee.** It is the **participant's** money (§13, amended
   2026-08-19), collected on top of the ticket price, so on a refund it is genuinely open whether
   the buyer gets it back or the platform keeps it as the cost of the transaction. **The fixtures
   dodge this entirely** — `net = gross − refunds` never touches the fee. Whichever way it goes,
   the checkout copy has to say so **before** the buyer pays, or the first refund is the first time
   they hear it.
4. **Partial refunds?** `refunds` in the fixtures is an *amount*, not a ticket count times a price,
   so the shape already permits one. If partials are in, `refundedTickets` and `refunds` can
   disagree and the Earnings table needs to survive that.
5. **An organiser-cancelled event (§20) — automatic or requested?** A cancellation is the one case
   where the attendee did nothing wrong, so a refund request flow is arguably the wrong shape.
   Decide this **with** §20, because `CancelEventModal` currently promises the opposite in writing.

**Then build, in order:**

1. **A refund record** in the payment service — payment intent, ticket, amount, currency, reason,
   requested_by, approved_by, status, timestamps. **Not a status flip on the ticket**, though the
   ticket's `REFUNDED` status is set from it.
2. **`stripe_service.refund(intent_id, amount=None)`** wrapping `stripe.Refund.create`, plus a
   **`charge.refunded` / `charge.refund.updated` branch in the webhook** so a dashboard-initiated
   refund reconciles instead of being lost. Refunds must be **idempotent** — a double-click or a
   webhook redelivery must not refund twice.
3. **Endpoints**, scoped server-side to the caller: request (attendee), approve/decline (organiser,
   and **only for their own event** — the same authorisation hole as §20.5), and read. The organiser
   endpoints belong to the console (§19.2 Attendees, §19.4 Earnings).
4. **Void the ticket and correct the counts** in the same transaction — `tickets_sold` decrements
   (once §2b makes it real), or a sold-out event stays sold out after a refund and the seat is never
   resold.
5. **Notifications and email on every state change** — requested, approved, declined, money sent.
   Same handler shape as §20.3, and blocked on the same missing notification backend (§11).
6. **Serve the figures the console already draws** — per-event `refunds` / `refundedTickets`, the
   Earnings rows, and the "Refunds issued" roll-up, computed by the backend (§19.9's rule: never by
   summing whatever the events endpoint happened to return).

⚠️ **Blocked, and honestly so: there is nothing to refund yet.** Tickets never reach the database
(§11) and `/checkout/[id]` never confirms its PaymentIntent — success is a hardcoded 2 s
`setTimeout` (§13). **A refund pipeline over payments that never completed will pass every test and
move no money.** Do §11 and §13's payment capture first; the policy decisions above can be taken in
parallel and should be, since §13's checkout copy depends on answer 3.

**Frontend follow-ups, to move in the same change and not before:**
- `CancelEventModal.tsx` says **"No refunds are issued"** and `/event/[id]`'s cancelled-event strip
  deliberately says nothing about refunds. **Both are true today and must be edited in the commit
  that makes them false** — not earlier, and not left behind.
- The Attendees row action ("Review" on a refund request) and the Earnings filters are disabled
  controls waiting on §19.7's endpoint.
- `/checkout` must state the refund window and the fee answer **before** payment, per decision 3.

---

## 22. `[FE]` Design a user-friendly way for an organiser to post an announcement — NEEDS A DECISION

**Raised by Gautham, 2026-08-31, alongside the create-form work (§19.12).** Announcements were
deliberately kept off `/organizer/create` — an announcement updates an event that already exists —
which leaves the *existing* path as the only one, and that path is the problem this section is
about. **This is a design task first and a build task second: do not start building a composer
before the questions below are answered.**

**The path today is seven steps for one sentence.** To tell attendees "the room has moved":

1. Sign in → 2. reach the event (console → Events → Manage, or find it on the site) → 3. land on
`/event/[id]` → 4. make sure you are in the **organiser view** → 5. scroll past the hero, the
description and the agenda to the Announcements section → 6. click **Post an announcement**, which
opens `EditListModal` — *the full list editor*, showing every past announcement as an editable row →
7. **Add** a row, type, **Save changes**.

Three things are wrong with it independently of how many clicks it is:

- **The composer is a list editor.** Posting one new update means opening an editor for the whole
  history, adding a row to the bottom, and pressing a button labelled *Save changes* rather than
  *Post*. Adding is the common case; editing an old post is the rare one, and the UI is built the
  other way round.
- **It is only reachable from the event's public page**, in a mode the organiser has to already be
  in. The organiser console — the surface built for exactly this kind of work — has no way to post
  one against an arbitrary event.
- **The Announcements section is invisible to a participant until it has content** (`showsSection`
  in `EventSections.tsx`), which is right for the reader and means an organiser has no ambient
  reminder the feature exists.

⚠️ **There are already TWO organiser-update surfaces, and nothing has decided how they relate.**
This is the first question to settle, because the answer changes what gets built:

| Surface | What it is | Where it lives |
|---|---|---|
| **Announcement** | A dated post on the event's **public page**, read by anyone who opens it — including people who never booked | On the event, via `EditListModal` |
| **"Your updates"** | An organiser message **inside the event's chat room**, read by the people in that room | ⚠️ **Nowhere, since 2026-09-01** — the console's rooms page was the only surface for it and is deleted. It comes back only as part of the chat service's organiser support (§19.1, no backend) |

They currently overlap in the organiser's head and nowhere in the code. Are they one thing with two
audiences, two genuinely different acts, or should posting once optionally do both?

**Questions for Gautham — these change the build, not the copy:**

1. **Where does an organiser expect to post from?** Candidates: a composer on the console dashboard
   (with an event picker), a per-event action on the console's Events table, a quick composer inline
   on `/event/[id]` in organiser view, or all three feeding one place.
2. **Is a new post a different control from editing the history?** The likely answer is yes — a
   small "post" box that appends, with the existing list editor kept behind a quieter "Manage
   announcements". Confirm before building.
3. **The two surfaces above** — one act or two?
4. **Does an announcement deserve a template or two?** The recurring cases are narrow: venue
   changed, time changed, what to bring, cancelled-adjacent. A picker that pre-fills a headline may
   be more "easy" than a blank box — or may be clutter. Gautham's call.
5. **What does the organiser see after posting?** There is no delivery to confirm (see the
   constraint below), so the honest confirmation is "it is on your event page", with a link to it.

**Constraints that already hold — a design that breaks one of these is wrong, not bold:**

- ⚠️ **An announcement is NOT a notification.** Nothing is emailed, pushed or told; a post only
  changes the page. `EditListModal` says so in writing today, and any new composer must too
  (§20, §11). **Do not write "notify attendees" on a button that does not.**
- ⚠️ **No backend column** (§19.12). Every authoring control is disabled off `EXTRAS_ARE_LOCAL` and
  works in `dummy` mode only. A composer built now ships disabled in `real` mode like the rest —
  that is acceptable and is how the agenda and FAQ shipped, but **decide it deliberately** rather
  than discovering it at the end.
- ⚠️ **Editing does not re-stamp `posted_at`** — a typo fix is not a repost. Whatever appends must
  keep that rule.
- ⚠️ **Rendered newest-first, sorted on read** (`announcementsOf`). Order is derived, never chosen,
  so no reorder control.
- ⚠️ **One editor, not two.** `ListEditor.tsx` is the shared row editor behind all three lists. A
  new composer may be a genuinely different control (question 2), but it must not become a second
  implementation of the same rows — extend the `SPEC`, do not fork.
- ⚠️ **Announcements stay off `/organizer/create`** (§19.12, last bullet).

**What can move before the decisions:** nothing structural. The one safe, useful preparatory step is
to **write down the real organiser journeys** — "I need to tell everyone the venue moved, two hours
before doors" — and count the clicks each candidate placement costs. That is the evidence the
questions above need, and `DESIGN_NOTES.md` is where it belongs once measured.

---

## 23. `[BE]` `registration_closed` has no backend — the UI ships ahead of it

**Gautham chose frontend-first, 2026-09-01**, when the lifecycle chip on `/event/[id]` became an
editable four-state select (`components/organizer/EventStatus.tsx`). The state is real in the UI and
**not persistable against the live backend**. Three things are missing, and the second is the one
that would ship a bug if the first landed alone.

1. **The enum.** `backend/services/event/app/models/event.py` declares
   `EventStatus = draft | published | cancelled | completed`. A PATCH carrying
   `status: "registration_closed"` **422s** — which is why the option is disabled off dummy mode
   today (`REGISTRATION_CLOSED_IS_LOCAL` in `EventStatus.tsx`).

2. **⚠️ The search default, and it is not optional.** `event_endpoints.py` defaults both list
   endpoints to `status: Optional[EventStatus] = Query(EventStatus.PUBLISHED)`. Add the enum value
   and nothing else, and a registration-closed event **vanishes from discovery** — the exact
   opposite of what the state promises the organiser ("stays visible to participants"). The default
   has to become *published **or** registration_closed*, and the two endpoints have to agree.
   **Do not land 1 without 2.**

3. **The join gate.** Nothing server-side refuses a booking on a closed event — the frontend
   disables the CTA and `handleBookNow`, and that is all. `/checkout` and the ticketing service must
   reject it too, or a stale tab still buys a ticket. Same class of gap as §20's cancelled events.

**What `completed` becomes.** "Finished" was dropped from the UI in the same change, so
`lifecycleOf()` currently folds `completed` onto `registration_closed` — true of a finished event
(visible, not taking joins) and better than the `draft` fallback, which would have told a
participant the page was invisible to them. If the backend ever needs the two distinguished again,
that is a **product** decision about what a past event's page should say, not a mapping to quietly
change here.

**Frontend work when this lands:** delete `REGISTRATION_CLOSED_IS_LOCAL` and
`REGISTRATION_CLOSED_HINT`, and drop the `reasonFor()` branch that reads them. Nothing else changes
— the select, the copy and the booking gate are already built against the real shape.

---

## 24. `[BE]` Notifications move to the navbar bell — the console pill is gone

**Gautham, 2026-09-02**, on reading the console header: *"I think it's best to remove that honestly.
It's a bit confusing. I think all this 'notifications' should be displayed in the bell icon on the
navbar instead."* The shape was then decided in full (below) and the build **deliberately deferred**,
because the bell is only worth building once something can feed it.

**The two parts are separable and must not be bundled.** Part A is frontend-only and unblocked; part
B is a backend feature. Doing A alone is a net improvement — the pill duplicates the dashboard
column that sits directly beneath it, and does it worse.

### Part A `[FE]` — remove the "N need you" pill. ✅ **DONE 2026-09-02.**

Deleted from `app/organizer/(console)/layout.tsx`: the pill JSX, the `needsYou` `useMemo` and its
`⚠️ ATTENDEES ONLY` comment, the whole `organizer-attendees` `useQuery` (the counter was its only
consumer, so the shell no longer fetches attendees on every console page), and four then-unused
imports — `PendingIcon`, `useMemo`, `useQuery`, `organizerSource`. `isDummyMode` stayed: same
module, still feeding the sample-data footer. A comment marks the spot and points here.

Why it went, for anyone tempted to put a counter back:

1. **It was a dead end.** A `<span>`, not a link — it named a number of chores and gave you nowhere
   to go. The Events hero's *"Notifications"* column is the same information **with working links**,
   one screen below it.
2. **It read as a message notification**, because it sat immediately beside the inert *"Search
   events, attendees…"* box and looked like a property of the search.

⚠️ **`PendingIcon` (`ConsoleIcons.tsx`) now has no caller.** It stays exported so nothing flags it.
**Do not delete it** — it is part of the console's chrome set and the bell's list is the obvious
next user. Logged in §10.

### ⚠️ The removed signals are now owed to the bell — this is a debt, not a deletion

Part A took a real signal off the screen and part B has not landed, so **an organiser currently has
no ambient indication that anything is waiting on them** until they open the dashboard. That is an
accepted, deliberate gap (the pill was a bad way to close it), but it means part B **must** carry
these two, and they are the minimum bar for calling the bell done:

- **Refund requested** — an attendee is owed money and an organiser has to approve it (§21).
- **Awaiting payment** — a booking is holding a seat it has not paid for.

Both come from `organizerSource.attendees()` (`status !== "Confirmed"`), which is **dummy-mode only**
— the real backend serves no attendee list yet (§19). Do not ship the bell to real mode claiming to
watch these until it can.

### Part B `[BE]` — the bell becomes the one notification surface

**The bell is completely inert today.** `components/navbar/Navbar.tsx` → `BellButton()` is a button
with a `title="Notifications"` tooltip, no `onClick`, no badge and no data source. This is a build
from scratch, not a move.

**The decided shape (Gautham, 2026-09-02) — do not re-litigate these four:**

| Question | Decided |
|---|---|
| Audience | **Both.** Participant *and* organiser notifications in one bell. |
| Interaction | **A dropdown panel** listing individual items, each linking to the thing it is about — not a badge that merely navigates. |
| Chat button | **Untouched.** It keeps its own green-glow-plus-terracotta-dot for unread chat. Messages and notifications stay two visibly different concepts. |
| Participant sources | **Upcoming booked events** and **wishlist events starting soon.** |

**Match the existing dropdown, do not invent a second one.** `NavDropdown` and `AvatarMenu` in the
same file already establish the pattern: `activeMenu` state keyed by a `MenuKey`, `closeAll()` on
sibling hover, `LINEN` panel on a 1px `BORDER`, `rounded-lg shadow-xl`, and the **invisible bridge
div** (`absolute -top-1 inset-x-0 h-1`) that stops `onMouseLeave` firing while the pointer crosses
the `mt-1` gap. Add `"notifications"` to `MenuKey`. A panel of *rows that navigate* is not a
`DropdownItem` (emoji + label), so it needs its own row component — that is fine, but it should
still use `useHoverStyle` so it hovers green like everything else in the bar.

**Three traps, all previously paid for:**

- ⚠️ **The unread badge must be `absolute`-positioned over the glyph**, exactly like `ChatButton`'s
  dot. The navbar's search box is the row's only elastic element and the fit at **1024px** is
  arithmetic, not measured — anything that widens the button row means re-measuring at exactly
  1024px (see `apps/web/CLAUDE.md` → Responsiveness, and the `w-[170px] xl:w-[410px]` comment in the file).
  An overlaid badge changes no width and avoids the whole problem.
- ⚠️ **Colour anything that hovers with CLASSES, not an inline `style`.** An inline colour beats a
  `hover:` rule; this has bitten the console table row, `FeatureBand`'s audience badge and
  `FilterSelect`'s menu items.
- ⚠️ **A notification is a promise to a user** — the `FeatureBand` rule applies here just as hard.
  Never render a row for something the app cannot actually do.

**What can be derived on the frontend today** (useful for judging how much of B is really backend):

| Row | Source | Mode |
|---|---|---|
| "X starts in N days" | `useTicketsStore` — `StoredTicket.start_date` / `event_title` | both |
| "X is this week, you haven't booked" | `useWishlistStore` — `WishlistItem.date` / `badgeType` | both |
| Refund requested · awaiting payment | `organizerSource.attendees()`, gated on the navbar's existing `isOrganizer` | dummy only |

The navbar **already knows who is an organiser** — `organizerApi.get(userId)` on a 5-minute
`staleTime` — so gating the organiser rows costs nothing new.

**Why this is still `[BE]` despite that table.** Everything above is *derived from local state the
user themself created*. A notification system is the opposite: things that happened **elsewhere**,
that persist, and that are individually **read or unread**. None of that exists. Missing:

1. **Somewhere to store them.** Per-user rows with `read_at`, survivable across devices and reloads.
2. **Producers.** Refund requested, payment failed, ticket issued, event cancelled or postponed
   (§20), organiser replies. Most already flow through Kafka — see `KAFKA_TOPIC_TICKET_ISSUED` and
   `KAFKA_TOPIC_PAYMENT_FAILED` in the notification service's config.
3. **Read endpoints.** `GET` a page of notifications, `POST` mark-read / mark-all-read, and an
   unread count cheap enough for the navbar to poll on every page.

⚠️ **The `notification` service is NOT a head start — it is a mailer.**
`backend/services/notification/` consumes Kafka and sends **email and SMS** (SendGrid + a Twilio
placeholder). It declares **no `DATABASE_URL`** — `HANDOVER.md` correctly lists it among the stateless
services — and `main.py` exposes **only a `/` health check**. It stores nothing and serves nothing a
UI can read. This feature needs a *notification feed*, which is either a new stateful service or a
new persistence layer plus routes inside this one. **Decide which before starting.**

⚠️ **Two live bugs in that service, found while scoping this.** Both are latent today because the
mailer is only ever exercised with no API key (it logs `SIMULATED EMAIL` and returns before
touching either):

- `notification_service.py:24` calls `self.jinja_env.get_project_template(template_name)`. Jinja2's
  `Environment` has **no such method** — it is `get_template()`. The first real send with
  `SENDGRID_API_KEY` set will `AttributeError`.
- `main.py:18` uses `@app.on_event("startup")`, deprecated in current FastAPI in favour of a
  `lifespan` handler.

**Open, not yet decided:** whether an organiser's notifications and a participant's are visually
separated inside the one panel (the navbar is split by audience everywhere else — see the
Participants / Organisers dropdowns — so mixing them in one flat list may read wrong), and what the
empty state says.

---

## 25. `[FE+BE]` Multi-currency is displayed but not SUPPORTED — every comparison is a bare number

**Raised while building the `/explore` price range (Gautham, 2026-09-08).** The gap is easy to miss
because the *rendering* half is finished and looks complete: `lib/currency.ts` is the one formatter,
every event carries its own `currency` column, and `/organizer/create` writes it. **What does not
exist is any notion that ₹100 and $100 are different amounts.**

Where it bites today, in order of how visible it is:

1. **`/explore`'s price range** — the query is `price >= min AND price <= max` against the raw column
   (`event_endpoints.py`), so a **$45** event matches "Up to ₹500" and a **₹4,000** one does not. The
   filter's labels say ₹ because India is the launch market; that is a deliberate, informed choice,
   **not a sign that the numbers were converted.** Its **Free** preset (`price = 0`) is the one bound
   that is honest in every currency.
2. **Sort by "Price: low to high"** (`/explore`) sorts the same bare numbers, so a mixed-currency
   list is ordered by a meaningless key.
3. **Organiser totals** — an organiser running events in two currencies has no honest single figure
   on the Dashboard or Earnings. **This half is already specced in §19.10 and is the harder
   question; do not solve it here.** §19.10 stays the source of truth for it.

**Needed to close it, and none of it is decided:**

- **A rate source.** A live FX API (a dependency and a key — Gautham's call), or a rates table an
  admin maintains, or a hard "the catalogue is single-currency per market" rule that makes the
  question go away. The third is the cheapest and may well be right for launch.
- **A display currency for the viewer**, and whether a converted amount is ever shown as if it were
  the price (it must not be — a ticket is charged in the organiser's currency, so a converted figure
  is a *guide*, and needs to say so).
- **Backend filter semantics** — either `price_min`/`price_max` grow a `currency` parameter and the
  service converts before comparing, or search is scoped to one currency per market.

⚠️ **Until this is decided, do not "fix" the ₹ labels on the price filter to a neutral "Min"/"Max".**
Hiding the symbol makes the control look currency-agnostic when it is not; the symbol at least tells
an Indian user which numbers the range is written for. Every place that compares a raw price carries
a comment pointing here.

---

## 26. `[BE]` Contact person email on `/organizer/onboarding` is collected but not persisted

**Added 2026-09-11.** The Contact Person section now has an Email field beside Full Name
(`app/organizer/onboarding/page.tsx`), sent as `contact_email` in the `POST /user/{id}/organizer`
body (`OrganizerProfileCreate` in `packages/api/src/organizer.ts`). The backend does not have this
field: `OrganizerProfileCreate` in `backend/services/user/app/schemas/organizer_schemas.py` doesn't
declare it, and `OrganizerProfile` (`backend/services/user/app/models/organizer_profile.py`) has no
column for it, so Pydantic silently drops it — the value is typed, collected and thrown away.

**To close it:**

1. Add a `contact_email` column to `OrganizerProfile` (the model) — `String(255), nullable=False`,
   same shape as `company_email`.
2. Add `contact_email: EmailStr` to both `OrganizerProfileCreate` and `OrganizerProfileOut` in
   `organizer_schemas.py`.
3. Add `contact_email: string` to `OrganizerProfile` in `packages/types/src/index.ts` once the
   backend returns it — not before, or the type promises a field the API never sends.
4. No migration tooling exists for this service (no `alembic/` directory) — the table is created via
   `Base.metadata.create_all`, so a fresh `platform_dev.db` picks the column up; an existing dev DB
   needs the column added by hand or the file deleted and reseeded (`CLAUDE.md` §10).
