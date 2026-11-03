# NewFind — Open Work

> Specs for things that are **known-broken or unbuilt and have a decided-enough shape to act on**.
> Delete an entry once it ships (and add a `CHANGELOG.md` line). `STATUS.md` lists these as
> one-liners — read the spec here before picking one up.
>
> **Current backlog owner: Biswajith Gopinathan (Biswa-MetaInsights).** Biswajith authorized the combined launch backlog on 2026-11-02; routine implementation decisions no longer wait for Gautham. Existing historical notes retain their authorship. Paid services, disruptive production changes and real payments still require explicit approval.

---

## Current priorities — owner: Biswajith Gopinathan

| Priority | State | Remaining work |
|---|---|---|
| 1 | Core implementation ready for deployment verification | Production SMTP, off-server encrypted backups and external alert destination; full mobile/security/load release evidence; provider approval/credentials |
| 2 | Event operations implemented; deployed QA pending | Console large-data search/pagination UX, scheduled reminders, refund/statement workflows and operator training |
| 3 | Communities and interest suggestions implemented | Verified Google/Facebook OAuth; paid tiers and Stripe test flow; refunds/settlements; grounded assistant and its approved service credentials |

Implemented in the release candidate: persisted profiles/images and event content, 200 km map discovery, backend live badges, currency-safe comparisons/totals, email recovery/verification transport, attendees/check-ins/audit, event closure, reschedule/cancel notices, persistent chat/notifications, communities/membership/reviews and saved-interest suggestions. See STATUS.md for tested boundaries. Production activation is not implied by implementation.

---

## 1. Organiser identity — implemented (Biswajith Gopinathan)

Both event sidebar views use the same privacy-safe public organizer lookup. The API exposes only user_id, name and verification_status; bank/contact/address data remains owner-only. Unknown counts are hidden, and a badge appears only for a genuinely verified profile. The organization name falls back to full_name; failed lookups display a neutral unavailable label.

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

## 2b. Release candidate — Backend badge derivation implemented; recommendation badges apply only to interest matches.

## 3. Release candidate — Persistent event rooms/messages/read cursors and older-history UI implemented; deployed QA remains.

## 3b. Release candidate — Durable membership and community reviews implemented; no paid membership.

## 3c. Release candidate — Server-derived sender identity and organizer badge verified through API; deployed browser/cross-device QA remains.

## 4. `[OPS+BE]` Activate and verify the Ticketmaster catalogue — Biswajith Gopinathan

A lightweight one-shot importer is prepared (`backend/scripts/sync_external_events.py` and `backend/shared/ticketmaster_sync.py`). It runs in the existing event container, authenticates private ingestion, validates provider links, upserts provider IDs, and stops cleanly on provider errors. Default scope is Brussels/BE, Amsterdam/NL and Luxembourg/LU, two pages per city. A timer may be installed only after a successful real import. Native tickets and provider listings are distinct: external checkout is blocked server-side and the UI directs visitors to Ticketmaster.

Deployed and checked on 2026-11-03: event/ticketing safeguards, database backup, healthy services and persistent core API journeys. Pending: configure a private Ticketmaster key (absent from server and Vercel), run a real import, verify provenance/links/images and repeated-sync identity, then activate the refresh timer. No real import is claimed until those checks pass. Venue coordinates are used when supplied; missing coordinates remain missing rather than fake 0,0. No paid geocoding is configured.

## 5. Auth hydration — core routes fixed (Biswajith Gopinathan)

Dashboard, checkout, organizer onboarding and event creation wait for persisted authentication before redirecting or fetching. The console already used this guard. Parked community/chat routes still need the same review when enabled.

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
- `[BE]` **Paid/tiered ticket issuance** — free booking persistence, live inventory and idempotency are implemented and tested; paid issuance and tiers remain pending.
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

## 14. Release candidate — Real organizer overview and currency-split earnings implemented; payment/refund statements remain.

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

## 16. Real-mode capability presentation — implemented (Biswajith Gopinathan)

Real mode hides chat, notification and event-assistant entry points, ticket chat actions and the unimplemented Recommended filter. ChatPresence opens no sockets or organizer-room queries in real mode. Home cards describe discovery, persisted free tickets, event management, publishing and free listings; paid checkout is explicitly unavailable. Dummy-mode components remain for future work. Hiding controls does not complete the deferred backend services.

---

## 17. Release candidate — Interest/category/tag matching within the selected radius implemented; no paid AI model.

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

**Real today:** Events read through `organizerSource.events()` with the signed-in organizer ID. The console now explicitly requests draft, published, cancelled and completed states instead of silently showing published events only. Each state is currently capped at 200 rows; cursor pagination remains pending for larger organizer portfolios.

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

## 20. Release candidate — Owner-only lifecycle changes create durable in-app notices and email outbox entries; production SMTP remains unconfigured.

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

## 23. Release candidate — Registration closure is persisted and blocks new bookings while preserving the listing.

## 24. Release candidate — Persistent authenticated notifications and navbar bell implemented; scheduled reminders remain.

## 25. Release candidate — Nonzero price comparisons require currency and earnings totals stay separated by currency; no FX conversion.

## 26. Organizer contact email — implemented (Biswajith Gopinathan)

The user service persists and returns contact_email on the private organizer profile. An additive, repeatable startup migration preserves existing rows and backfills their company email because historical contact inputs were discarded. Older clients without contact_email also use company_email; new submissions preserve the supplied contact address. Public organizer responses exclude both addresses.

## 27. Launch operations and verification — owner: Biswajith Gopinathan

- Daily protected local PostgreSQL backups are installed. Four core databases passed isolated restoration, checksums and public-table row-count checks. Off-server storage and retention/disk monitoring remain pending; local snapshots cannot recover a lost server.
- Complete mobile/device verification and the organizer publish/edit/participant-booking browser checks. Organizer onboarding and draft creation passed; draft console visibility was identified and fixed in code.
- Add health/error monitoring, review security/rate limits and run basic load tests.
- Configure password recovery/email verification and transactional email with the required provider configuration.
- Connect a dedicated NewFind domain; new paid services require explicit approval.
- Rename the GitHub repository to newfind once authenticated settings access is available, then validate server remotes and Vercel connectivity.

### Organizer browser verification — Biswajith Gopinathan, 2026-11-02

Completed in production: synthetic organizer setup; draft create/list/edit/refresh/publish; a free booking of another organizer's event; confirmed QR ticket persistence after reload. Self-booking correctly rejected. Backend safeguards are deployed and Hetzner sign-in is restored. Remaining: real provider sync requires a private Ticketmaster key, then live verification.
