# NewFind — Changelog

> **One short line per meaningful change** — a feature landing, a decision, a revert. Newest first.
> **Not** every file edit. Skip it entirely for small tweaks, refactors, and work in progress, and
> never log churn that was reverted in the same session. Unsure whether a change qualifies? It
> doesn't — update `STATUS.md` only.
>
> Current state → `STATUS.md`. Design rationale → `DESIGN_NOTES.md`. Unbuilt work → `TODO.md`.

---

## 2026-09-11

- **The dashboard's fourth tab is "Profile", and it takes a picture** (Gautham) — "Participant Profile" was renamed (every tab there is already a participant's), and the avatar disc gained an always-visible camera badge that opens `ProfilePictureModal` — the same `CoverImageField` an organiser picks a cover photo with, at `kind="avatar"`: a circular preview, upload or a pasted link, Remove. The picture also replaces the green initial disc in the navbar's account menu. It is stored in `useProfileStore` (localStorage, keyed by email) rather than on `profiles.avatar_url`, which is a `String(512)` with no upload endpoint behind it — the same wall the cover image hit. `image-upload.ts` grew `fileToAvatarDataUrl`: 320px, centre-cropped square, 150 KB.
- **The Earnings hero is an ordinary stat tile now** (Gautham) — the dark ink panel and its three-sentence explanation of who holds the money and who pays the 2% are gone, leaving four identical `StatTile`s in an even four-column grid. The rate is printed in the table's "Buyer fee 2%" column only; the tiles say who pays it, not what it is. `InkPanel`'s `ink` tone has no caller left.
- **`/organizer/create`'s three optional extras are authored in DIALOGS now, not inline** (Gautham) — Agenda, FAQ and Cover image each show what has been written so far plus one button that opens the same centred, "Save changes" dialog the event page opens. New `ListEditorModal` (the dialog and the draft, now shared with `EditListModal`, which keeps only the mutation) and `CoverImageModal` (around the unchanged `CoverImageField`); `ListSummary` renders the draft rows in the cards. Both dialogs validate before handing anything back, so the create form no longer checks list rows or the image URL at submit. `CoverImageField.hidePreview` deleted with the card that needed it.
- **The cover image is now the event's card picture too, not just its hero** (Gautham) — `card-adapters.ts` and `organizer-rows.ts` read `eventImageUrl()` (prefers the real `image_url`, falls back to the picsum placeholder) instead of always drawing the placeholder, so every `<Image>` reading a card's `imageUrl` is `unoptimized` — that URL can now be an organiser's own upload or pasted link, not just a host in `next.config.ts`'s `remotePatterns`. `CoverImageField` also swapped its always-visible "Or paste an image link" field for a second button — "Paste an image link" — that reveals the url input only once clicked (or a link is already set); `/organizer/create` additionally dropped the field's preview box (`hidePreview`).
- **The Attendees page's controls all do something** (Gautham) — the ticket-type and status dropdowns filter the rows in memory (bound to `?ticket=` / `?status=`, like `?event=`), and every dropdown's menu now hangs under its own trigger instead of over the sidebar (`FilterSelect align`). "Start check-in mode" is brand green and opens a door view — rows sorted by name, "Check in" solid green on each confirmed row — and "Check in" / "Undo" plus the row's "⋯" menu (check in, copy email, email) work in either mode, writing to `lib/checkin-store.ts`: this browser's localStorage, until the check-in endpoint in `TODO.md` §19.3 exists. `ConsoleUI` gained `RowMenu` (portalled) and `RowAction`'s `onClick` / `tone="green"`.
- **`/dashboard`'s three lists are the home-page card** (Gautham) — My Tickets, My Wishlist and My Events render `EventCardItem` on the home grid (4 across from `xl`) with its hover lift, replacing the dashboard's own row card and ticket panel. The card gained three optional slots — `media` (a ticket's QR code where the photo goes), `lines` (ticket number and seat, an organiser's Draft status) and `action` (Remove / Manage / Join Chat on the "View details" silhouette, `CARD_CTA`) — and exports its grid as `CARD_GRID`; with no slot filled it renders exactly as before.
- **Start Time and Duration on `/organizer/create` open a round clock on click** (Gautham) — `FormControls.ClockFace`, a Material-style dial: click an hour on the ring, it flips to minutes, click a minute. A solid brand-green face with linen numbers and a linen hand. Start Time (via `DateTimeInput`) shows twelve numbers plus an AM/PM switch or the two-ring 24-hour dial, following the browser locale like the native box it fills; Duration uses the two-ring face as 0–23 hours with "hours" / "minutes" captions, and anything longer is typed. A click used to light one hour/minute segment and open nothing visible; a dropdown list of quarter-hours was tried first the same day and rejected for the clock. Desktop only; a phone keeps its native picker (Start Time) or the typed boxes (Duration).
- **`/organizer/onboarding` is now `/organizer/create`'s design, whole** (Gautham) — the 1536px column, back-arrow header, 2px-bordered section cards, labels beside their inputs with "(required)" / "(optional)" on every field, the measured width scale, left-packed rows and the shared sticky submit bar. The create page's `Section` and `row()` moved to `FormControls` as `FormSection` / `formRow` so both pages read one definition; the onboarding page's private `FormField` / `inputCls` copies, its "One-time setup" chip and its three-tile trust strip are gone.
- **`/organizer/create`'s Duration is a clock, not a menu** (Gautham) — hours and minutes typed into one field, arrow-stepped (1h / 5m), capped at four days, replacing a `select` of 23 preset lengths that could not say 100 minutes. Deliberately not a native `type="time"`: that is a wall clock, so it reads "02:30 AM" in 12-hour locales and stops at 23:59. Both boxes can be cleared, so the field gained a `validate()` branch.
- **`/organizer/create`'s three optional sections sit side by side** (Gautham) — Agenda, FAQ and Cover image are one row of three equal-height cards from `xl` instead of three stacked ones, and their labels sit above their inputs rather than beside them, because a third of the column is half the width an inline label wants. The required sections above are untouched and still one column.
- **One corner radius for the whole app: `rounded-lg` (8px)** (Gautham) — every button, input, chip, tag, card, panel, dropdown and modal, replacing a role-based scale that ran 6px to 24px. Reverses the `rounded-xl` filter-tab approvals of 2026-08-21 and 2026-08-22; `rounded-md` survives only as the nested step inside a `p-1` track, and `rounded-full` only for elements with no text label.
- **Date and time fields now wear the app's own calendar and clock** (Gautham) — Chrome's grey picker indicator is hidden across `/organizer/create` and the organiser's edit dialog, and `FormControls.DateTimeInput` draws `EventIcons`' glyphs instead; the create form's Duration menu drops its hand-drawn outline clock for the same `ClockIcon`.
- **The width scale gained a sixth step, `smd` (320px), and the Organisation Name took it**
  (Gautham) — `sm` read tight for a name people type in full and `md` was a 75% jump. It is the one
  step not cut to a measured minimum, so menus stay off it. Organisation Name, Tags and Event
  Website still share one line from ~1535px, now at 1073 of 1440.
- **`/organizer/create` asks for the Organisation Name, and `/event/[id]` prints it under "Organised
  by"** (Gautham) — a required field in Event Basics, between Event Type and Tags. That line had
  been a hardcoded placeholder since the page was built; it is the fallback now. No column for it
  yet, so a real-mode create still shows the placeholder (TODO.md §19.12).
- **Every field on `/organizer/create` says "(required)" or "(optional)"** (Gautham) — category,
  language, event type, city, duration, capacity, currency and ticket price joined the required set;
  tags stays optional. Capacity and price grew the empty-box branch their marks needed — `parseInt("")`
  is NaN, so the old range test waved a cleared box straight through.
- **The note's placement became a breakpoint rule** (Gautham) — under the label from `lg`, beside it
  below, where the label is already alone above a full-width input and stacking only spent height.
- **A required field says "(required)" under its label, and the asterisk is gone** (Gautham) — with
  it goes the legend under "Create New Event" that existed only to translate the symbol. The note
  wears the same terracotta brackets as a hint, and a field carrying both reads "(required)
  (0/1000)". Below the label rather than beside it, because on `/organizer/create` the labels sit
  beside their inputs and anything added to that line pushes every control right.
- **`FormField`'s width scale is measured, not chosen, and Event Type now closes the title line**
  (Gautham) — five steps (132/176/240/420/560), each cut to the longest thing that must fit in it:
  "Portuguese", "Health & Wellness", and "A$ AUD — Australian Dollar" against "In-Person" across
  three equal segments. The city menu moved up a step and stopped ellipsising
  "Thiruvananthapuram, IN", which it had done at every width it ever had. The row's two gaps came
  down together, 12/40 → 10/32, to find the last of the width. **The title kept its size, so the
  four fields share a line from ~1535px and Event Type leads the second line below that.**

- **The Events hero's side column is "Notifications", and it has a second group** (Gautham) — the
  "Needs you today" label, the rule above it and the "cleared items disappear" footnote all went, and
  **"Unread chats"** now sits below the chores: one card per room with unread activity, linking into
  `/chat/{id}`. It reads the same `chat-unread-store` map the navbar's chat glow does, so it is live
  in dummy and real mode alike — and its counts are this session's socket traffic, not a persisted
  unread history (`TODO.md` §19.1). The chat glyph moved out of `Navbar.tsx` into `ConsoleIcons` so
  both callers share one drawing.

## 2026-09-09

- **`/organizer/create` asks for a start and a DURATION, not two datetimes** (Gautham) — the day and
  the clock are now two boxes, and "End Date & Time" is a duration menu (15 minutes to 4 days) behind
  a clock glyph. The end instant is derived at submit, so `end_date` on the wire is unchanged and the
  "end must be after start" check is gone with the field that needed it. The edit dialog still shows
  a real end date, deliberately: a published event's end is moved directly, not re-derived.
- **`/organizer/create` packs three fields to a line from `lg`** (Gautham) — Title · Category ·
  Language and Event Type · Tags · Website each share one row; City · Venue Address own a whole line
  of their own (a nested `row()`), with the address growing into everything the 200px city menu
  leaves; then Start Date · Start Time · Duration. The title dropped to `md` and the short menus to
  `xs` to buy the first two lines, and both remaining inline hints moved under their label.
- **Fixed: an inline `FormField` with no `width` never actually grew** — `lg:grow` sat on the control
  track inside a field that was itself content-sized, so the venue address came out ~150px wide on a
  line with 900px spare. The grow moved to the field, which is the flex item the row measures.
- **Fixed: `/explore`'s price and date filters did nothing in dummy mode** — `dummyEventSearch` dropped `price_min`/`price_max`/`date_from`/`date_to` on the floor, so every filter control on the page rendered, wrote state and changed the URL while the card grid never moved. Fixtures now filter on both, inclusive at each end and day-granular on dates, matching `/event/search`. Geography is still ignored, on purpose.
- **The Events overview panel is brand white on a green border** (Gautham) — it moved off `--brand-ink`, its five stat tiles and "needs you" cards became solid green blocks with linen type on a new fixed `--brand-console-green`, its "Next up" pill became an "Upcoming event" section heading on the home page's recipe, and it lost the event photograph, which cannot survive a white ground. The Earnings hero stays ink.
- **Reversed: the console's Events table opens on Live again** (Gautham) — **Live** is the first tab
  and the default, **All** sits immediately to its right, and the rest of the order is unchanged
  (`CONSOLE_TABS` order + the page's `useState`). This undoes yesterday's swap below.

## 2026-09-08

- **`/organizer/create` rebuilt on two columns, and the cover image can be UPLOADED** (Gautham). The
  form was a 768px single column of full-width inputs; fields now pair up inside each section and
  the cover photo and the two submits moved into a sticky rail, so Publish is on screen the whole
  way down. Nothing was removed and no section changed its order. Required fields carry a terracotta
  superscript `*`, every hint is terracotta in brackets, and every menu is alphabetical ("Other"
  last). The new `CoverImageField` — preview, upload, or a pasted link — is **shared with the edit
  dialog**; the upload is browser-side (downscaled to a `data:` URL) because there is still no file
  storage, so it stays inside the same `dummy`-mode gate as the rest of the authored extras.
- **`/explore` filters on a price range** — `price_min` / `price_max`, read from the URL, one Active
  chip. **One range, three controls** (Gautham): a dual slider, Min/Max fields and preset chips, all
  writing the same two numbers, so moving any one moves the others. **The Free-events toggle is
  gone** — Free is simply the preset 0 → 0, which removes the second control that owned `price_max`;
  `?free=true` still resolves to it. The event service gained `price_min`, **and its search cache now
  keys on every narrowing parameter** — it keyed on none of category, format, the dates or the price,
  so a filtered search could be served a previous unfiltered one for five minutes. Labels are ₹
  because India is the launch market, and amounts are compared as bare numbers across currencies —
  `TODO.md` §25.
- **The organiser dialogs lost their accent tints and their long copy** (Gautham) — the consequence blocks in Cancel / Publish / Duplicate / Edit details were 10–12% green or terracotta washes; they now sit on the panel's own brand white / brand dark with a 1px `--brand-border`, and the accents are confined to the buttons. Every description in those four was cut to its shortest true form at the same time.
- **The status select updates the page again in dummy mode** — `data-source`'s dummy reads now hand out copies, so React Query's deep-equality structural sharing can see an in-place fixture edit. The 2026-09-01 `{ ...target }` fix was comparing against an object it had already mutated.
- **The navbar's organiser item is "Dashboard" again, and the console's Events table opens on All**
  (Gautham). The label reverted yesterday's rename to "Organiser Console" — the Organisers dropdown
  around it already says whose dashboard it is. The table led with Live and defaulted to it, so an
  organiser with nothing in the next 30 days landed on an empty table; **All** is now the first tab
  and the default (`CONSOLE_TABS` order + the page's `useState`).

## 2026-09-07

- **The console's Dashboard section is gone; Events absorbed it** (Gautham). The two rendered the
  same rows off the same `toConsoleRows`, one truncated to five with a "See all events →" link. The
  Dashboard's overview band — the ink "next up" hero with its "Needs you today" column, and the five
  portfolio tiles — now opens `/organizer/events`, which is the console's landing section and wears
  the greeting as its `h1`. The rail is three items; `/organizer` is a redirect
  (`app/organizer/page.tsx`, outside the `(console)` group), and the navbar's "Dashboard" item is
  now "Organiser Console" pointing straight at `/organizer/events`. `DashboardIcon` deleted.

- **Home on a phone: photo-first hero, dropdown filters, touch pass** (Biswajith). Below `lg` the
  hero panel now precedes the spoken exchange; the two filter-tab rows became one `FilterTabs`
  component that renders the row only at `lg+` with a mouse and a native `<select>` in the tab's
  silhouette below that or on any touch-primary device. Touch across the app: navbar menus guard
  their hover handlers with `hoverCapable()` (a tap used to open and close them in one go) and close
  on an outside tap; form controls render at 16px under a coarse pointer (iOS focus-zoom); small
  controls grow to 40–44px under a finger with negative margins so the mouse render is unchanged;
  hover tooltips hide where nothing hovers; `touch-action: manipulation` and no tap highlight on
  every control; `dvh` on the console rail and dialog panels. Desktop renders of `/`, `/explore` and
  `/event/[id]` are unchanged; sweep clean at 320–1440.

## 2026-09-05

- **Whole-site responsive pass** — every route now measures clean at the nine widths, and the
  sweep is a repo script (`apps/web/scripts/responsive-sweep.mjs`). Fixed: the organiser console
  rendered as a ~0px column below 1024px (its mobile nav strip was a flex *sibling* of the content,
  not above it); the navbar's search input collapsed to ~20px at 1024–1279 (the box is now elastic
  between 170 and 410); Expiry + CVV overflowed the checkout sidebar at 1024; chip rows, sticky-bar
  CTAs, dialog rows and form button pairs that overflowed or clipped at 320–375; hover-only card
  controls, tags, and navbar dropdowns now work on touch (coarse-pointer reveal, tap-to-toggle);
  `100vh` → `100dvh` on the chat room, mobile menu and chat widget; `sizes` on event/category images
  keyed to the real grid breakpoints. Desktop renders of `/`, `/explore` and `/event/[id]` are
  unchanged except the 1024–1279 search box.

## 2026-09-03

- **The project instructions are split into a standing prompt and a handover doc** (Gautham) — the
  single 52 KB file was doing two jobs at once, and only one of them is worth loading every session.
  Root `CLAUDE.md` (11.7 KB) now holds only what a session needs *before* it knows to ask —
  execution rules, contribution guidelines, performance rules, and the routing table. The brand and
  design system moved to `frontend_react/apps/web/CLAUDE.md` (13.6 KB), which loads only when web
  files are touched and costs nothing on a backend or docs task. `HANDOVER.md` keeps how-to-run,
  architecture, the component index and the shipping checklist, read on demand with no budget.
  **Every session paid 52 KB before; it now pays 11.7 KB, and ~25 KB on frontend work.** The sorting
  rule, the per-file budgets and the reasoning are in `HANDOVER.md` → *Keeping these docs true*.
- **Branch history rewritten to match `main`** (Gautham) — the three `Co-Authored-By: Claude`
  trailers were stripped and Biswajith's four author identities canonicalised to one, reproducing
  the rewrite already on `main`. The two histories had shared no commit at all; they now share a
  merge base again and the branch merges normally.

- **The Playwright end-to-end harness is removed** (Gautham) — `test_app.mjs` and
  `test_auth_chat.mjs` walked a 17-step journey (homepage → register → checkout → AI chat reply)
  and screenshotted each step, but have been inert since June: their `node_modules` was dropped in
  `d353480`, and both hardcode an output path on another machine. Nothing referenced them and
  nothing replaced them, so **this leaves the project with no automated end-to-end coverage** — the
  scripts are recoverable from history if reviving them beats rewriting. The root `package.json`
  went with them; its only purpose was declaring `playwright`, and it was what invited an
  `npm install` at the repo root in the first place. `screenshots/` is kept. `node_modules/` is now
  in the root `.gitignore`, which it never was — the June commit landed at the repo root, and the
  existing rules only cover `frontend_react/`.

## 2026-09-02

- **The console's event pills are tag-palette fills, and its tabs move like the control beside
  them** (Gautham) — an events row's "On sale" / "Draft" / "Free" / price chips dropped the 12%
  tone wash for a solid palette colour with a linen label, so they read as the same object as a
  card's "This Week" tag; the four new hues are taken from the reserve list in `EventBadges.tsx`
  and recorded there (Attendees keeps the wash). `Pill` gained `type` and lost `outline`. Separately
  `Tabs` dropped `.nf-chip` — the select-pop and press-squish that made it move unlike the
  "See all events" control inches away — and an unpicked tab now takes the app-wide green hover.

- **"About this event" has an edit pencil in the organiser view** (Gautham) — the same glyph and
  tooltip the home page puts beside the city name, opening the existing "Edit details" dialog with
  the caret already in the description box. The trigger was lifted out of `CityPicker` into a shared
  `EditPencil` and its glyph into `EventIcons.PencilLineIcon`, so the two surfaces are one object
  rather than a second copy of the same path; home's rendered markup is unchanged. `EditPencil`
  splits `tooltip` (the visible invitation) from `label` (the accessible name), because "click here"
  is filler in front of a screen reader's "button". `EditEventModal` gained `focusField`.

- **The console header's "N need you" pill is gone** (Gautham) — with it the `needsYou` count, the
  shell's `organizer-attendees` query (the counter was its only consumer, so the console no longer
  fetches attendees on every section) and four imports. It was a `<span>`, not a link: it named a
  number of chores and offered nowhere to go, beside an inert search box that made it read as a
  search property. ⚠️ **Its two signals — refund requested, awaiting payment — are now owed to the
  notification bell** (`TODO.md` §24); until that lands an organiser has no ambient indicator at
  all. `PendingIcon` kept, caller-less, for that bell.

- **Decided: notifications belong in the navbar bell, and the console's "N need you" pill goes**
  (Gautham) — the pill is a dead end sitting beside an inert search box, duplicating the dashboard's
  "Needs you today" column one screen below. The bell takes **both** audiences in a **dropdown
  panel**; the chat button keeps its own unread glow. Build deferred — a real notification feed needs
  storage, producers and read endpoints, and the existing `notification` service is a Kafka-driven
  **mailer** with no database and no read routes. Spec, traps and the unblocked frontend-only half:
  `TODO.md` §24.

---

## 2026-09-01

- **The organiser console's Event rooms section is gone** (Gautham) — route, rail item, speech-bubble
  glyph, room/thread fixtures and the whole unanswered-question count deleted. Attendee conversation
  belongs to the chat surfaces for organisers and participants alike, and the organiser side of that
  is the backend's job (`TODO.md` §19.1, rewritten). The header's "N need you" pill now counts
  attendees only, and the dashboard hero lost its "Questions" tile and both room CTAs. The
  participant-facing chat is untouched. The console is four sections now.

- **The organiser console's Settings section is gone** (Gautham) — route, rail item and gear glyph
  deleted, along with its organiser-profile, event-defaults and team-&-notifications groups. Its
  four **payment terms** (receiving account, convenience fee, refund window, who approves refunds)
  moved to a read-only **Payments** card at the foot of Earnings, where an organiser is already
  looking at the money. The console is five sections now.

- **The event's lifecycle status is now four states, editable by its organiser and visible to
  everyone** (Gautham) — Draft / Live / **Registration closed** / Cancelled. The hero chip became a
  select in the organiser view and gained a fixed, participant-facing twin in the participant one;
  "Published" was renamed **Live** and "Finished" was dropped (the backend's `completed` folds onto
  Registration closed). Registration closed keeps the event visible and blocks new joins — no
  dimming, no banner, CTA and sticky bar say so. ⚠️ **Frontend-first, by decision:** the backend
  enum has no such value and `/event/search` defaults to `published`, so the option is disabled off
  dummy mode — `TODO.md` §23. ⚠️ The cancelled organiser tooltip promises a notification nothing
  sends; flagged, kept as specified.
- **Create, edit and the event page now cover the same fields.** The create form gained the cover
  image and offer name it was missing; the edit dialog gained category, event type, language,
  target audience, tags and website — all real columns the backend's `EventUpdate` had always
  accepted and `EventUpdateData` had never declared. The four choice lists moved to
  `lib/event-options.ts` so the two forms cannot drift, each guarded by `withCurrent` against a
  select silently rewriting a Ticketmaster row's category.
- **Ticket price and currency are chosen once, at creation, and locked afterwards** (Gautham) —
  reversing the 2026-08-24 call that made the price editable with a warning. The edit dialog shows
  both read-only with the reason, and the title alongside them. Capacity stays freely editable.
- **Console buttons press like the rest of the app.** `ConsoleButton` dropped
  `transition-all duration-150 active:scale-[0.98]` for a plain `transition-colors`, matching
  `/event/[id]`'s `DetailCTA` / `DetailStickyBar` — it was the only labelled button in NewFind that
  squished under the thumb, including on `/event/[id]` itself via the `EventSections` edit control.
  Sweeps all six console sections. `DESIGN_NOTES.md` §11 records why the squish came back off.
- **The organiser block on `/event/[id]` is now identical in both views.** `OrganiserEventCard`'s
  header dropped "Your event / Organiser view" for `BookingCard`'s "Organised by … Verified · 40+
  events", so toggling the participant preview no longer changes it. Both cards read one
  `ORGANISER_NAME` constant, renamed **EventMind Collective → NewFind Collective**; it stays the
  `TODO.md` §1 placeholder, which now records that the real value is the organisation's
  `company_name` (already collected at `/organizer/onboarding`), not the signed-in person's name.
  `useOwnerName()` deleted with its only call site.

## 2026-08-31

- **The detail card's full-width controls now share one skin.** `DetailCTA`'s `outline` variant
  moved off the green-on-green outline onto `ConsoleButton`'s outline tone — surface ground,
  `--brand-text` label, 2px `--brand-control-border` — matching the section edit controls it sits
  beside. "Manage attendees", "Manage revenue" and the participant's "Book Now" all wear it; the
  sticky bar keeps the green fill.

- **`/organizer/create` gained optional Agenda and FAQ sections.** The row editor moved out of
  `EditListModal` into a shared `ListEditor`, so the create form and the event page's edit dialog
  cannot drift. Announcements stay off the create form on purpose (an announcement updates an event
  that already exists). Still no backend column for either — Gautham chose frontend-now again, so
  both are disabled in real mode and the migration is logged in `TODO.md` §19.12, which now also
  covers `EventCreate` and the second `EXTRA_KEYS` strip. `eventsSource.create()` is new alongside it.

- **The Component Registry moved to its own `COMPONENTS.md`, and verification defaults were
  scoped.** `CLAUDE.md` was trimmed 105 KB → 48 KB on 2026-08-14 and had grown back to 104 KB (~30k
  tokens read every turn) in the seventeen days since — **86% of it the registry, 20 KB → 67 KB**,
  as each landing feature added rows and fattened existing ones per Contribution Guideline 4. The
  organiser console section alone is 26 KB; `FeatureBand`'s single row is 11 KB. Neither existed on
  2026-08-14. **Nothing was overwritten — the growth was per-task accretion with no rule bounding
  the total.** `CLAUDE.md` keeps a one-line index and is now ~12.6k tokens; guideline 4 now states
  that a row grown into an essay is a bug. Alongside it: type-check gained one
  narrow exception (edits the compiler cannot see), lint and browser verification became
  conditional, and `apps/web/AGENTS.md`'s "read `node_modules/next/dist/docs/` before writing any
  code" was scoped to unfamiliar framework APIs — it had directly contradicted `CLAUDE.md`'s
  do-not-read-`node_modules` rule.

- **`/event/[id]` lost both organiser bands; they are controls in the hero row now.** The row's
  organiser half reads **state → lens → actions**: a lifecycle **status chip** (with its Publish
  button on a draft), a segmented **Participant view ⇄ Organiser** toggle shown in both modes, then
  the three round controls. Both new controls are skinned as one of that set, and the whole row now
  reads as one: 48px on a linen ground, a 2px `--brand-hint` outline (brand-black in light,
  brand-white in dark — an approved exception to the `--brand-control-border` rule, scoped to this
  row), a label that goes green under the pointer, green when picked. Both bands' sentences were
  shortened into hover labels. `CancelledBanner` — a public statement, not an organiser control —
  is the page's only remaining band.

---

## 2026-08-24

- **The organiser view of `/event/[id]` became a management surface.** Eleven additions, all behind
  the existing `useIsEventOwner` gate and invisible to participants: a **lifecycle strip** under the
  green mode bar (Draft / Published / Cancelled / Finished, with a **Publish** confirmation on a
  draft); the booking card replaced by an **organiser card** carrying sold-vs-capacity, revenue so
  far and links to **Manage attendees** and **Manage revenue**, both deep-linked to this event via
  `?event=<id>` — which both console pages now honour with a working dropdown; a third hero control,
  **Duplicate event**, which copies the plan into a fresh draft at zero sales (and deliberately not
  the announcements); and **announcements, agenda of the programme and FAQ** as public sections a
  participant reads and the organiser edits through one shared list dialog. The edit dialog grew
  from four fields to five labelled groups, now covering **ticket price, offer name ("Early bird"),
  allowed number of participants and cover image**.
- **Reversed: price and capacity are editable.** They were excluded on 2026-08-21 because they
  change what a ticket holder already bought. Gautham asked for them on 2026-08-24 and chose the
  guardrail with them — **free edit, warning only**: capacity may go below `tickets_sold`, and the
  dialog states plainly that no ticket is voided, re-priced or refunded and that nobody is told.
  The title and the currency stay out (the currency because a mid-life change makes every Earnings
  total a sum across two — `TODO.md` §19.10).
- **The Attendees "Export CSV" button does something.** It had no handler at all. `lib/csv.ts` is now
  the one CSV path: RFC-4180 escaping, a formula-injection guard on leading `=+-@`, a UTF-8 BOM so
  Excel renders `₹` and non-ASCII names, and bare numbers beside a currency column so the file can
  be summed.
- **Decided: the organiser extras ship frontend-only for now.** Agenda, announcements, FAQ, offer
  name and cover image have no backend column, and adding them means hand-written migrations (there
  is no Alembic). Rather than let a save vanish silently, every authoring control is **disabled with
  an explanation** in `real` data mode and works fully in `dummy`. Spec for making them real —
  starting with `image_url`, which needs one line and no migration — is `TODO.md` §19.12.

## 2026-08-22

- **The organiser console now carries the home page's design signature.** It was token-coherent and
  signature-incoherent: the same `--brand-*` colours, but its own type scale (everything pinned at or
  under the 15px floor, plus 11px uppercase micro-labels), no photography, no hover on anything, and
  its own dialect of the filter tab. Four changes, all one-directional — **nothing on home,
  `/explore` or `/event/[id]` was restyled**: (1) the console moved onto the **site's type scale** —
  20px row titles, 17px body, 32px extrabold stat figures, section headings on `EventsCarousel`'s
  own `font-extrabold`/`-0.5px` recipe — which removed the console's 24 `data-keep-type` opt-outs and
  left it the only region of the app that never breaks the 15px floor; (2) the **uppercase
  micro-label is gone**, and a status `Pill` is now an `EventBadge` in everything but its colours;
  (3) **things react to the pointer** — rows wash green, `RowAction` replaced three hand-rolled
  hoverless outline links, and `ConsoleButton`'s tones moved from inline styles to classes (an inline
  colour beats `hover:`, so the console's buttons *could not* have had a hover state); (4) **the
  console has photographs** — every table row carries the event's own card picture, and the dashboard
  hero is that photo under `HERO_SCRIM` instead of a flat ink slab. `Tabs` is now literally the home
  page's filter tab. Shared as a side effect: `cardImageUrl` (one placeholder-URL rule) and
  `HERO_SCRIM` (was copy-pasted in two pages).

## 2026-08-21

- **An organiser can now edit and cancel their own event from its public page.** `/event/[id]`
  gained a full-width green mode bar for the event's own organiser — the **organiser view** by
  default, with a terracotta "Preview as participant" button to see what a visitor sees — and in the
  organiser view the hero's wishlist and share buttons are replaced by **Edit details** (description,
  start/end date & time, city, venue or online link) and **Cancel event**. A cancelled event keeps its page and wears the
  sold-out treatment: greyed hero, greyed booking card, disabled CTAs, and a banner saying so.
  ⚠️ **Both write through `PATCH /event/{id}` and nothing else happens** — the backend does not treat
  a date/venue change as a postponement, sends no notification or email to ticket holders, and does
  not check that the caller owns the event. Both dialogs say so on screen. Backend spec: `TODO.md`
  §20.
- **`TODO.md` is now classified `[FE]` / `[BE]` / `[FE+BE]` / `[OPS]`** (Gautham's ask) — a tag in
  every heading plus an index table at the top, and per-bullet tags in §11, so it is clear at a
  glance which side of the stack an item can be moved from.
- **The organiser console's Events filters work, and public/private is gone from it.** The three
  dropdowns above the table were disabled placeholders that never opened. Two of them are now real
  (`FilterSelect`): price — Paid / Free / Paid & free — and date order — soonest or latest first —
  filtering and sorting client-side over rows already in memory, since nothing there was ever
  waiting on a backend. The third is deleted: **every event NewFind serves is public**, so a
  visibility filter offered a state no event can be in. With it went the hardcoded "Public" pill on
  every row (dashboard and Events alike) and the two lines of copy promising invite-only events.

- **The dummy events and the organiser dashboard are one world now.** They were two: the console's
  hero, rooms, attendees and earnings described five Mumbai events that existed nowhere else, while
  the table under them listed the home page's New York ones. The console's events are now real
  `Event` objects (`dummyMyEvents`, eight of them across all four buckets) with cards and detail
  pages, and `lib/fixtures/organizer.ts` **derives** every room, earnings row and roll-up from them
  instead of restating figures. Same numbers as before — 8 events, 309 tickets, ₹342,600 net — but
  computed, so they can no longer disagree with the table beside them.
- **The organiser console is organiser-only.** A login is no longer enough: no organiser profile now
  gets an explaining state with one link to `/organizer/onboarding`, the same definition of
  "organiser" `/organizer/create` already used. Dummy mode treats the signed-in developer as the
  organiser on purpose.
- **The console reads each row's own currency instead of hardcoding `INR`** (four call sites), and
  the New York fixtures are tagged `USD` — they had been rendering `$45` events as `₹45`.
- **The organiser console lost its gold accent — the whole console is now on terracotta.**
  `--brand-gold` / `-hover` / `--brand-on-gold` are deleted from `globals.css`, and `ConsoleUI`'s
  `GOLD`/`ON_GOLD` are now `ACCENT`/`ON_ACCENT` on `--brand-terracotta` (button tone `gold` → `accent`).
  So the console has ONE accent rather than gold-on-ink beside terracotta-on-linen. Known, accepted
  cost: small terracotta text on the ink hero is ~3.3:1 where gold was ~7.5:1.
- **The navbar is now split by audience** — "Events" and the standalone "Organiser dashboard" link
  became two always-visible dropdowns: **Participants** (Explore Events / My Tickets / My Wishlist)
  and **Organisers** (Create Event / Dashboard). My Wishlist moved out of the avatar menu, which is
  now account-only. `/dashboard` tabs now read the `?tab=` param on every render instead of once on
  mount, so the two dropdown links into it actually switch tabs.
- **"Browse by category" tiles lost their explore arrow, and the chip shrank to 18px.** The arrow was
  decoration for what the whole-tile link already said — third affordance round to be cut there, after
  the Explore button and the arrow's tooltip. The chip then scaled ×0.9 across all six of its
  numbers (type, leading, glyph, both paddings, gap) at Gautham's request.
- **Home filter tabs are rounded rectangles, not pills** — both rows in `EventsCarousel` moved from
  `rounded-full` to `rounded-xl`, taking the event card's "View details" silhouette. Gautham's call
  after seeing the two shapes side by side; an approved departure from the shape rule's `rounded-lg`
  for small controls. Closes `TODO.md` §8 for events; `CommunityCarousel` stays pilled while parked.
- **"Organiser dashboard" is now a top-level navbar item**, beside Events (authed only). The `lg`
  search box narrowed 250→170 to pay for its width; `xl` untouched.
- **Console rail restyled** — it is now a themed surface (linen / dark ground) rather than a
  deep-green block, with green active states and terracotta section counts. Wordmark, the
  "Organising" label and the organiser footer block removed from it.
- **The organiser is always the signed-in user**, in both data modes — the fixture name is gone from
  the greeting, the room announcements and the settings profile. The dummy *figures* stay made up.

## 2026-08-20

- **Organiser dashboard v2** — `/organizer` replaced by a six-section console (Dashboard, Events,
  Event rooms, Attendees, Earnings, Settings) imported from the Claude Design file "Organiser
  Dashboard v2". Sits under the app navbar behind a deep-green rail; navbar entry renamed
  *Organizer Console* → *Organiser Dashboard*. Closes the front end of `TODO.md` §14.
- **Fixed: the organiser console listed other people's events.** The old `/organizer` called
  `eventsApi.search()` with no `organizer_id`, so every published event on the platform appeared
  under "Your Managed Events". Also removed its three hardcoded figures (revenue `12450`, attendees
  `1,240`, per-row `price * 120`).
- **Decision upheld on import: the 2% is the participant's, not the organiser's.** The imported
  Earnings design deducted the platform fee from the organiser's payout; that is the model `TODO.md`
  §13 rules out. Reworked to `net = gross − refunds`, with the fee shown as an informational
  "Buyer fee" column.
- **Two new brand tokens** — `--brand-ink` (the deep-green console panel; `--brand-green` resolves to
  a light mint in dark mode and cannot fill one) and `--brand-gold` (the console's accent on that
  panel). Both fixed in each theme, like `--brand-terracotta`. Approved by Gautham.

## 2026-08-19

- **`FeatureBand` shows both audiences at once — the switch is gone.** Gautham's call: participant tiles left, organiser tiles right, each feature tile naming its own audience with a filled badge above its title — green `Participants`, terracotta `Organisers` — instead of hiding half the pitch behind the `RailToggle`. Each half now **ends in a CTA tile** (Explore events / Create an event), which retired the outline button pair under the grid. **"Everything in one feed" is commented out**, so it runs 2 + CTA against 3 + CTA. **The band's width cap is gone** (960 → 1400 → none) — seven tiles need the width, so it now runs gutter to gutter like the sections above and below it; it still starts at the gutter and is still not centred. The CTA tiles carry **no audience label** (their opening question already names it) and centre their contents against the taller feature tiles. Icon chips were dropped — the audience badge takes their place at the top of each feature tile — and **every tile centres horizontally** while the section heading stays left-aligned. Vertically, only the two CTA tiles centre: feature tiles are top-aligned so their titles all start on one line. There is no subtitle under the heading. **Type now matches the event card** — 20px bold titles, 18px body, and the audience badge styled as a status tag (`Selling Fast`/`This Week` chrome, 16px) — because the two sit on the same page and the band read visibly smaller at 18/16. **Each half is skinned by one accent** — green for participants, terracotta for organisers — which is the badge fill, the badge's inverted label, and **the tile's own hover fill**, so the four organiser tiles hover **terracotta**: an approved, documented exception to the app-wide "hover → green" rule.
- **`FeatureBand` copy revised, and the 2% fee changed hands.** Gautham's rewrite: the fee is now a **convenience fee paid by the participant**, not deducted from the organiser ("Free to list. Small fee for priced events."), which is a different build — see `TODO.md` §13. The stats card also **stopped naming figures** ("info and stats" rather than "tickets sold, revenue"), which lowers the bar §14 has to clear. The assistant card now names the launcher's colour outright, so the inline `AssistantLauncherGlyph` becomes the thing that keeps that sentence verifiable rather than a flourish.

## 2026-08-17

- **`FeatureBand` added to home** — six feature cards between the Online Events row and "Browse by category", split three/three behind a **For Participants / For Organisers** switch (the shared `RailToggle`, not a new control). Equal three-up cards that fill green on hover; the heading sets "NewFind" as the real `Wordmark` in green rather than type. Search filters were cut as "standard on any site now". AI *recommendations*, "sell tickets" and "verified organisers" were deliberately left off as claims the product would fail on — the AI story is anchored to the event assistant, which is real. **Three cards are knowingly forward-looking** (pricing, stats, and the half-true chat lead) — Gautham's call; see `STATUS.md`.
- **`TODO.md` §2b — tag derivation belongs in the backend.** All four live tags are computed client-side in `toCarouselEvent`, and `tickets_sold` turns out to be written by nothing in the repo, so `sold-out` and `selling-fast` can never fire on a real event — the same failure as §2, on two more tags. Also logs the duplicate predicates in `explore/page.tsx` and the fact that client-side tags cannot be filtered server-side.
- **`TODO.md` §7b, §13, §14 logged** — whether the event assistant should open to non-registered users (it 403s them today, which is backwards from when it is most useful); the free-to-list / 2% pricing model, now promised on the home page and entirely unbuilt; and the organiser stats dashboard, which also records that `/organizer` calls `eventsApi.search()` with no `organizer_id` and is showing every organiser the whole platform's events.

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
- **`HANDOVER.md` split into four files.** It had grown to 103 KB / ~26k tokens, read in full at the start of every session. History moved here, current state to `STATUS.md`, unbuilt work to `TODO.md`, deep design rationale to `DESIGN_NOTES.md`. `HANDOVER.md` now holds instructions only.
- **Fixed the `Eventmind_files/` path.** The layout diagram placed it inside `Event mind/`; it actually sits one level higher, beside it. Every pointer to the PRD, competitor analysis and React handover had been resolving to nothing.
- **Removed six resolved "known inconsistencies"** that still carried their full original text, including a verbatim copy of the superseded `BADGE_CONFIG` hex values — a live risk of a session reading the old colours as current.

---

## Undated (predates this changelog)

Entries below were reconstructed from the old `HANDOVER.md` when it was split. They are ordered
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
