# NewFind — Design Notes

> The **reasoning** behind the visual decisions, and the measurements that back them. `CLAUDE.md`
> carries the rules; this file carries the *why*, so the rules stay short and this stays skimmable.
>
> **Read §1 before proposing any layout or visual change to a shared surface.** Several things here
> were built, shown to Gautham, and rejected — re-proposing them costs a round trip.

---

## 1. Closed decisions — do not re-propose without new information

| Decision | What was tried and rejected |
|---|---|
| **Event card meta row is packed left, icon-delimited** | `justify-between` (date left, venue right, time in the slack) was built and reverted — Gautham looked at it and said it looked bad. `grid-cols-3` with a truly centred time was rejected on measurement: at `xl:grid-cols-4` a third is ~95px but date+icon needs ~119px, so the date truncates. |
| **Hero is copy-left / image-right, and nothing crosses the gutter** | Two edge-bleed variants were built and rejected — image bleeding off the right ("looks almost incomplete"), and image-left/copy-right bleeding off the left. The `.hero-bleed` class was deleted from `globals.css`. ⚠️ **Amended 2026-08-11:** the hero is no longer capped at the 1400px page column — it now spans the full viewport *inside* the gutters and splits 50/50 (§9). That is not a re-proposal of edge-bleed; the rejected variants ran photo off the screen edge, this one still stops at the gutter. **The bleed answer stands; only the 1400 cap changed.** |
| **Hero has no quick-filter chips** | The reference mockup's In person / Online / This weekend / Free row was built, then removed at Gautham's request for both modes. Its removal is what killed `weekendRange()` and the `Chip` type. |
| **`CategoryGrid` is a 2-row scrolling rail with no "See all" tile** | An earlier 3-row wrapped grid with a 12th "View all" tile was built and replaced. |
| **A category tile is a bare photo carrying one chip — no wash, no body, no separate button** | Four versions were built and replaced: the accent wash over the photo ("reads as a coloured block, not a photo"), the linen body row carrying an **Explore** button, bare text on a black scrim (replaced once the label moved into `CategoryBadge size="lg"`, which brings its own fill), and a standalone arrow button at the tile's right edge (clubbed into the chip instead). The arrow that replaced the Explore button is **decoration, not a control** — the objection to the button was never the affordance, it was that a nested control duplicates the tab stop the tile already provides. |
| **`SimilarEvents` card width is percentage-based and full-bleed** | A fixed 320px matched home only at 1440px and Gautham spotted it as "smaller". A `100vw`-based version was wrong twice — see §2. Do not move the rail back inside the capped column. |
| **Tags are `rounded-lg`, not pills** | `rounded-full` on a tag was tried and rejected. The same answer was then applied to buttons app-wide. |
| **Category chip and status tags share one silhouette** | This supersedes an earlier "keep the shapes different" decision. **Fill** signals category-vs-status now; shape does not. Do not re-split them. |
| **Health & Wellness uses `LotusPoseIcon`, not a leaf** | The leaf read as "eco/plants" rather than wellbeing. A heart was never an option — `EventActions` owns the heart, where it means "wishlisted". |
| **Slide CTA and chat launcher are terracotta, not green** | So they read as accents rather than competing with the green Explore / Publish / Book Now CTAs. The carousel dots are therefore **white** — two terracotta elements on one photo read as the same control. ⚠️ The hero's slide CTA is **parked** as of 2026-08-11 (§9); the rule still binds the chat launcher, and binds the slide CTA again if it returns. |
| **The navbar chat dot does not animate** | An earlier pulsing green halo was removed. |
| **`--brand-hint` is not gray and must not be "restored"** | Every gray secondary label on the site read as washed out. The name survives only to avoid touching 127 call sites. |
| **Outline controls use `--brand-control-border`, not `--brand-nav-border`** | An intermediate 2px `--brand-nav-border` pass shipped and still read as blending — at 1.55:1 it was only making an invisible thing thicker. |
| **`CategoryGrid` has 11 tiles, leaving a hole in the 6th column** | Filling it means a 12th category, and Gautham explicitly chose the 11 Explore categories over adding Music. |

---

## 2. Card and grid geometry

### The percentage rule

`SimilarEvents` and `CategoryGrid` are the app's only two horizontal scrollers; every other surface
is a grid. Both size their cards to **reproduce the home grid's cell exactly**, using percentages:

```
basis-full  sm:basis-[calc((100%-20px)/2)]  xl:basis-[calc((100%-60px)/4)]
```

mirroring home's `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` + `gap-5`.

**⚠️ Percentages, never `100vw`.** A viewport-based version failed twice:

1. It had to double-count padding, needing a fourth `lg` breakpoint just to track home's px-6 → px-12 step.
2. **`100vw` includes the vertical scrollbar; a container's width excludes it.** Four cards came out ~15px wider than the row could hold, so the fourth clipped into a scroll.

Percentages have neither problem — but they only work *because* `SimilarEvents` is full-bleed with
home's own gutters, which makes both containers the same width.

Verified: **4 cards, zero scroll, arrows hidden, card width 321px @1440 and 441px @1920 — identical
to home at both.** 6 cards overflow and the arrows appear.

### Why `SimilarEvents` is full-bleed

Rendered as a sibling **after** the page's `maxWidth: 1400` column, carrying home's
`px-4 sm:px-6 lg:px-12` gutters (`GUTTERS`). That is what lets **a row of four fill without
scrolling at home's card size** — inside the capped column, four cards only fit by shrinking to
~311px, narrower than home at every width.

**The trade Gautham accepted:** above a 1400px viewport the section's edges sit outside the column
above it (~260px at 1920). The full-width divider is what makes that read as a section break rather
than a misalignment.

### Clip room — the `-mt-6 -mb-10` trick

Both scrollers carry `paddingTop: 24` / `paddingBottom: 40`, cancelled exactly by `-mt-6 -mb-10`.

**That padding is CLIP ROOM, not spacing.** `overflow-x: auto` forces the block axis to compute to
`auto` as well (CSS overflow spec: one non-visible axis makes the other non-visible), so the rail
clips vertically too. The card's 6px hover lift + 2px border was being cut off, which surfaced as a
**missing top border on hover**. The home grid never shows this — a grid has no overflow container.

Delete the padding and the bug returns. Re-check the numbers if the card's hover lift or shadow
changes.

### Equal height

`items-stretch` + `[&>a]:h-full` reproduces the grid row's stretch (verified: three cards with
24/25/27-character titles all render 327px). Card height itself stays content-driven, exactly as on
home — **do not pin a fixed height**, it would clip long titles.

---

## 3. The tag system

### Palette

**Status tags are a solid fill from Gautham's palette with a linen `#F2EFEA` label and glyph.**

Assigned: `this-week` → Mustard `#B3982B` · `selling-fast` → Coral `#C6503F` · `today` → Sky
`#4E82C0` · `recommended` → Iris `#7C6FC0` · `free` → Plum `#A05FA0`.

`sold-out` keeps a neutral grey `#4B5158` — Gautham's call, since grey reads as unavailable and a
hue would make it compete with the live tags.

**Reserve (in the palette, not yet on a tag):** Olive `#7E8B3A`, Berry `#BC5675`, Rust `#A8543A`,
Saffron `#CFA02E`, Lime `#8FA83C`, Aqua `#2FA0A8`, Denim `#3E6FA0`, Grape `#6A5AB8`, Orchid
`#B85FB0`, Rose `#C85888`, Slate `#5F7080`. **Take from the reserves before inventing a new colour,
and record it here when you do.** (Teal `#2E8F8A` was in the original eight; Gautham dropped it.)

### ⚠️ The linen label is a preview, not an accessible final

**Every assigned tag fails WCAG AA.** Linen-on-fill measures: Mustard 2.46, Sky 3.47, Iris 3.74,
Plum 3.95, Coral 3.96 (reserves: Olive 3.25, Berry 3.87). None reach 4.5, because the palette is
mid-tone (luminance 0.18–0.32, the worst zone for text) and linen is effectively white-on-solid —
the exact look Gautham had previously rejected.

**The accessible alternative is a black label**, which clears AA on all eight (4.62–7.44). It is
flat `#000` rather than a dark shade per hue because Coral sets the floor (luminance 0.181 →
best-possible 4.62:1, reached only at pure black; even brand text `#111827` on Coral is 3.90:1).

**`TAG_LABEL` in `EventBadges.tsx` is the single switch** — flip it to `#000000` to ship the
accessible version.

Worth knowing: the mid-tone fills do hold their shape on a dark event-card photo *better* than the
old dark tints, which measured ~1.2:1 at the near-black end and lost their outline entirely.

### Category chip

**Always linen** (`CHIP_FILL`, hardcoded for the same reason the status colours are — a themed
surface would go near-black-on-black on the dark scrim). The per-category colour that used to be
the fill now tints the label and glyph instead.

Those accents are a shade darker than the old fills: as text on linen, six of the fourteen failed
AA (summit worst at 2.69:1), so each moved to a darker shade of the same hue. All now clear 4.5:1;
lowest is summit at 6.17:1. **Re-check contrast before changing an accent.**

An unlisted category still hashes onto the accent palette (one stable colour) but always gets the
neutral sparkle glyph — an arbitrary colour is fine, an arbitrary glyph would put a briefcase on a
yoga class.

### The three-tag cap and the two-row split

**Max three status tags**, enforced by `MAX_BADGES` inside `EventBadges` — the single render point,
so the cap holds whatever a caller or adapter passes. **Do not cap at a call site**, and do not
slice in `toCarouselEvent`: `badgeTypes` is also read by the filter tabs, so trimming the data would
change filtering as well as display.

**At three tags: the third sits alone on the line above, the first two below** (Gautham's rule),
laid out explicitly rather than by `flex-wrap` — wrapping gave each tag its own line and produced a
three-high stack.

**⚠️ The cap and the split count STATUS tags only.** The category chip does not count toward the
three and is *expected* to share a row with two of them — `[category][tag][tag]` is the intended
bottom line, not an overflow.

### Why `CardTagRow` uses `flex-wrap-reverse`

The bottom line does not always fit, and `flex-wrap-reverse` pushes the overflow **up** instead of
clipping. It had been clipping on 12 of 23 fixture cards; plain `flex-wrap` hid that by stacking
tags three-high.

Measured at `xl:grid-cols-4` (327px card → 323px row): a category chip runs **91–175px** ("Music" …
"Health & Wellness"), a status tag **72–124px** ("Free" … "Selling Fast"), so category + two tags
spans **175–414px** — only the shorter combinations make one row (**5 of 17** tagged fixture cards
at 1440px). To get all of them on one row the cards must be wider: a 3-across grid gives ~434px,
clearing even the 426px worst case. **Nothing is ever cut off either way.**

The heroes are unaffected — they have ~1344px, fit on one line, and use `CategoryBadge` +
`EventBadges` directly.

### `TAG_SHAPE`

`TAG_SHAPE` = `inline-flex items-center rounded-lg whitespace-nowrap`; `TAG` = `TAG_SHAPE` +
`gap-1.5 font-bold`.

`TAG_SHAPE` is exported for the `/event/[id]` booking card's "N going" and "N spots left" chips,
which Gautham asked to match the tags' shape but which are **not** tags: they carry a 28px avatar
stack rather than a 14px glyph, and they sit on the card's light surface, so they keep their own
padding, gap, weight and **light fills**. The status tags' dark tints are tuned for the hero's photo
scrim and read as heavy blocks on a white body.

Import `TAG_SHAPE` for any future chip that must share the silhouette. **Do not hand-write
`rounded-lg` at the call site**, or the radius drifts apart the next time it moves.

---

## 4. Icons

The set is **filled**, not outline — chunky calendar with a dot grid, solid teardrop pin, ring
clock — picked by Gautham off the event cards.

- **Tag glyphs are named for what they DRAW, not the tag they serve**, so a re-map never leaves a `MusicIcon` drawing a trophy.
- They render at 14px inside a pill, so they are deliberately chunky. Thin strokes turn to mush — `SparkleIcon` is one sparkle, not the usual three, for exactly this reason.
- `ClockIcon` was drawn for this set (the filled family had no clock). Its ring and hands are 1.5/24 thick, matching the calendar frame's 6.25% of viewBox.
- `LocationPinIcon` punches its hole with `evenodd` rather than painting it `--brand-surface`, so it survives any background — e.g. the city picker button turning green when open. `ShieldCheckIcon` does the same, and is drawn 1.7/24 thick because a hairline tick inside a shield is the first thing to mush at 15px.
- `LotusPoseIcon` is three *separate* solids (head / torso-with-arms / crossed legs) — at 14px the gaps are what make it read as a person. A first pass merged the hands into the leg mound; keep the ~2-unit gap under the arms if you retouch it.
- **Colour is deliberately not unified.** `color` defaults to `currentColor`, so each surface keeps its own (cards near-black, booking card green). Pass `color` only where the icon differs from surrounding text.

---

## 5. `CategoryGrid` specifics

A category tile borrows the **event card's chassis** — same `rounded-2xl`, same borderless-at-rest →
2px border + 6px lift on hover, same `aspect-video` photo. **If `EventCardItem`'s hover or radius
changes, change it here too.** But the tile has **no body**: it *is* the photo, with the category's
label overlaid on it.

- **The tile has NO colour wash.** The photo shows at its own colours, exactly as on an event card. An earlier version washed it in the category's accent at 62% opacity — Gautham's call was that it read as a coloured block, not a photo. **Never hardcode a tile colour here.**
- **There is no body.** It was removed at Gautham's request ("no white space below the photo"), taking the **Explore** button with it. **Do not put a body back.**
- **The label is the shared `CategoryBadge` at `size="lg"`** — the same linen chip an event card overlays on its photo, scaled up (20px label, 24px glyph). Both `size` and `trailing` are **props, not forks**: they were added to `CategoryBadge` rather than hand-rolling a second category chip here.
- **The chip sits bottom-RIGHT**, not bottom-left.
- **The explore arrow sits INSIDE the chip, straight after the name** (via `trailing`), not apart at the tile's right edge. A standalone 44px button at the right edge was built and replaced — clubbed with the name, the arrow reads as part of the category rather than as a separate control.
- **⚠️ The `lg` size is held to a measurement, not chosen by eye.** At the narrowest 4-across column (321px tile → 285px row) the longest name, "Health & Wellness", comes to **266px and clears by 19px**; every other category has 58px+ of slack. It was briefly 18px, when the arrow was a separate button sharing the row — that left only 229px and 20px clipped by 5px. **Clubbing the arrow into the chip is what bought the size back.** Re-measure from Roboto Bold's advance widths before enlarging either.
- **The arrow is decoration, not a control** — `aria-hidden`, not focusable, no handler. This is the *same* reasoning that removed the Explore button: the whole tile is already a link to that destination, so a nested control would be a second tab stop performing one action and a second thing for a screen reader to announce. The affordance is visual only; AT gets it from the Link's `aria-label`. **Do not make it interactive.**
- **The arrow takes `stroke="currentColor"`, so it is always the category accent the label is painted in** — the two cannot drift. It is drawn at `strokeWidth 3.25`, heavier than the 2 the "View all" links use, because it stands alone rather than beside text. **Two colour treatments were tried and dropped:** a green-filled square with a linen arrow (green is dark, and the square read as a blob over most photos), then a green arrow on the chip's linen (inside a chip whose label is already the category's colour, green read as a third colour).
- **The arrow carries no tooltip.** One was built ("Click to explore this category") and removed as redundant — the arrow, the category name and the fact that the whole tile is a link all already say the same thing. **Don't re-add one.**
- **No scrim.** An intermediate version put bare 20px text on a black bottom gradient so it would read over an arbitrary photo. The chip carries its own linen fill, so the gradient became unnecessary and was removed — which is what leaves the photo completely untouched.
- **Glyph and label take the RAW accent; the hover border does not.** The accents in `EventBadges.tsx` are contrast-checked as text *on linen*, so inside the chip the raw value is correct. The border is the exception — it draws between the photo inside it and the **page** outside it, and in dark mode that page is `#0F1A18`, so a raw (dark) accent had dark on both sides and **read as no border at all**. `liftAccent()` in `CategoryGrid.tsx` raises L to 62% and floors S at 60%, **hue untouched**, for the dark-mode border only. Measured against the dark page: **4.0–12.6:1**. Light mode keeps the raw accent (dark on linen). **Do not collapse this to one value for both themes** — lifted-on-linen bottoms out at **1.23:1** (Networking), which is the same invisible-border bug mirrored.
- Scroll arrows sit **on the seam between the two rows, hard against the page edge**, not in the header where `SimilarEvents` keeps its own. `left-0` / `right-0` means the *browser* edge, because an absolutely positioned child resolves against its ancestor's **padding box** and the rail's ancestor carries GUTTERS. **The fit is exact at `lg` and up:** the gutter is 48px (`px-12`) and the `lg` button is 48px, so the arrow fills the gutter — outer edge on the browser edge, inner edge on the tile's edge, **zero overlap**. Below `lg` the gutter is only 16/24px, so a 48px button cannot clear the tiles however far out it goes; it is simply as far out as it can be. An earlier version added the gutter back by hand (GUTTERS + 8px: 24 / 32 / 56) and **that is what put the buttons ~40px on top of the outermost tile**. **If the button size or GUTTERS changes, re-check that exact fit.**
- **There is no event count on a tile.** The reference design had one, but `/event/search` returns rows, not totals, and there is no count endpoint. **Do not fake a number.**
- Photos are **Unsplash ids**, and every one was opened and eyeballed before it was committed — several plausible-looking ids turned out to be the wrong subject (an "arts" id that was a rock concert, a "networking" id that was an empty conference hall). **Look at the picture before swapping one; do not trust the id.**

---

## 6. `SimilarEvents` query logic

**Two queries, merged.** Same `category` within `RADIUS_KM = 100` of **the viewed event's own
coordinates** — *not* the city picker, because a Berlin event must suggest Berlin events no matter
what the picker says (the picker is only the fallback). Plus a separate `event_type: Online` query
in the same category, because online events carry no real coordinates and any radius search drops
them.

Nearby first, then online, deduped by id (a **Hybrid** event matches both queries), current event
filtered out, capped at `MAX_CARDS = 12`.

`eventCoords()` treats **lat/lng 0,0 as "no coordinates"** — that is where failed Ticketmaster
geocoding lands, and it is a real point in the Atlantic, so a radius search around it returns
nothing useful.

**Renders `null` — including its own top divider — when there is nothing to suggest**, so an empty
rail never leaves an orphaned rule on the page. Keep the divider inside the component if you move it.

Scroll is **arrow buttons + `scrollbar-hide`** (Gautham's call over a visible native bar, which is a
grey Windows bar on linen). The arrows sit in the section header rather than as overlays, so they
never cover a card's own hover share/wishlist controls, and they **hide entirely when the rail does
not overflow** (verified: 3 cards at 1440px do not overflow; at 900px they do).

---

## 7. Colour token rationale

### Why linen and not white

`#184E4A` reads as near-black on pure white. Linen gives it the clearly-green appearance the brand
needs.

### `--brand-hint` is not gray

Gautham's call: every gray secondary label on the site was washed out, so the token resolves to the
brand **text** colour in light (`#111827`) and the brand **linen** in dark (`#F2EFEA` —
deliberately the linen, *not* `--brand-text`'s `#ECEAE4`). Secondary copy reads at full contrast;
hierarchy is carried by size, weight and position instead.

This covers ~96 text usages across 20 files and, per the same decision, the ~26 muted **icons** that
share the token. The name survives only to avoid touching 127 call sites.

### `--brand-muted` is the one genuinely-gray token

Two things must **not** follow the above: **form placeholders** (a full-contrast placeholder makes
an empty input look pre-filled) and muted **fills** — the sold-out/full CTA backgrounds in
`EventsCarousel` / `CommunityCarousel` (aliased there as `MUTED_FILL`, distinct from the text alias
`MUTED`) and `EventChatWidget`'s typing dots. Reusing `--brand-hint` for a fill would paint a
near-black button in light mode.

### `--brand-control-border` and the 2px treatment

With `--brand-surface` equal to `--brand-bg` in light mode, a control's border is the *only* thing
separating it from the page — and the old `1px solid var(--brand-border)` is so close to linen that
buttons "almost blend with the background so it doesn't even feel like one".

**Measured against linen `#F2EFEA`:** `--brand-border` **1.24:1**, `--brand-nav-border` **1.55:1**,
`--brand-control-border` **3.34:1**, brand black `#111827` **15.8:1**.

Thickness alone doesn't fix it — the pale colour was the bigger half of the problem, so both changed
together. Gautham chose `#8B8172` off a side-by-side against brand black, which was unambiguous but
too heavy at 2px (every outline control started competing with the green CTAs).

**Dark theme is deliberately not lifted** — `--brand-control-border` resolves to `#33433F` there,
the same as the nav border, because dark mode's `--brand-surface` (`#16211F`) already sits off
`--brand-bg` (`#0F1A18`). The blending problem is light-only.

### Terracotta

`--brand-terracotta` (`#C1603F`) is **deliberately the same hex in both themes** — it is a semantic
accent, not a themed surface, so it sits with the badge reds and golds rather than the green/linen
system. A darkened variant `#8F4229` survives as the "Other"/"General" category accent, because the
token itself fails AA as text on linen.

---

## 8. Typography rationale

**Why a 15px floor:** it gives the site a comfortable, Talk_to_file-like scale (their effective
minimum was ~14–15px). The rule uses `!important`, which is safe **only because the app uses no
responsive text scaling** (no `md:text-*` etc.) — if you ever add responsive size-ups from a small
base, revisit it.

**Prominent-copy scale (above the floor)**, so key copy doesn't sit at the minimum: a page subtitle
(the `<p>` under an `<h1>`) is **18px**; an empty-state heading is **18px** with a **16px** helper
line. Applied across Explore, Organizer console, My Events, Create Event, Onboarding, Create
Community and Community detail. Follow this on new pages.

**Why `data-keep-type` exists:** `EventCard.tsx`'s 11/12/14px type is intentional and must not
change. The carousels already use no sub-15px type, so they need no marker.

---

## 9. `HeroCarousel` mode system

> **⚠️ Parked 2026-08-11 — three blocks, commented out, NOT deleted** (Gautham: "unnecessary, but
> not sure… we might bring it back later"):
>
> 1. the Events / Communities segmented toggle,
> 2. the left column's Explore / Publish CTA pair,
> 3. the **per-slide CTA on the photo** ("Find offline events", "Find wellness events", "Find online
>    communities", …),
> 4. the terracotta **eyebrow** — the rewritten body copy's "Near you or online." already says what
>    "Online & offline" said, and the two sat one line apart.
>
> What survives: the photo, the wipe, and the dots. The left column is eyebrow + headline + subcopy;
> `mode` is pinned to `"events"`, so the whole `communities` branch is unreachable. Every slide still
> carries the `label` + `href` the per-slide CTA rendered, and `label` is still doing real work as the
> dots' `aria-label` — **do not prune `Slide.href` or the MODES data as "unused".**
>
> Restoring any of it: uncomment the block, plus `setMode` in the `useState` destructure (toggle),
> the `activeSlide` line (per-slide CTA), and the `next/link` import (either CTA).
>
> Everything below describes that still-live code.

**The hero has two modes — Events and Communities — and the segmented toggle swaps BOTH columns**,
not just the left. `MODES: Record<ModeKey, Mode>` is the single source: a mode owns its eyebrow,
headline, subcopy, both CTAs, and its five slide CTAs.

**The toggle is local `useState`, not a link** — clicking Communities re-dresses the hero in place;
it does not navigate. The five photos are shared across modes (`IMG`), so only labels and hrefs
change and the carousel keeps its position across a toggle. `SLIDE_COUNT` assumes both modes have
the same number of slides — **add a slide to both or the index maths breaks.**

**The two modes filter differently and must not be copy-pasted onto each other.** For events,
offline/online is the `event_type` **format** filter, never `category`. For communities there is no
format filter at all — `/explore`'s community query only honours `q` + `category` + `city` — so
"online communities" is expressed with the **`Online` pseudo-city** (`&city=Online`), and the
food-market photo takes `category=Food & Drink` rather than a fake offline format.

`activeIdx` flips at the wipe's halfway point (`progress > 0.5`) so it names whichever photo covers
most of the panel — it drove the parked CTA's label and still drives the dots. A bottom scrim keeps
them legible.

**The dots are centered** (`bottom-6 left-1/2 -translate-x-1/2`). They had been bottom-**right**
only to stay clear of the per-slide CTA in the bottom-left; parking that CTA freed the whole bottom
edge, and Gautham asked for them "more towards the middle". **If the CTA is ever restored, send the
dots back to `right-5`** — centered dots and a bottom-left CTA would sit uncomfortably close.

**Deliberate divergence from the reference mockup:** events' "Find workshops" maps to
`category=Creative` — there is no Workshops category in `/explore`'s `CATEGORIES`, and Creative fits
the painting photo better than Education.

**Uses `<img>`, not `next/image`,** because the wipe relies on `clip-path`.

### Panel geometry — the panel matches the photos, 16/9 at every width

Every file in `public/hero/` is 16:9 (1376–1408 × 768). `object-cover` crops exactly as much as the
panel disagrees with its source, so **the panel's aspect ratio is the crop dial**, and matching the
photos sets it to ~zero.

The panel used to be `aspect-[4/3]` stacked and `lg:h-[min(82vh,820px)]` at `lg` — an explicit
height so it stayed tall regardless of the copy's height. That made it **777 × 738 at 1440px, very
nearly square against a 1.79 source**, and cover threw away **~40% of every photo's width**. Gautham:
the image "is getting cut off at the middle". The height that was buying presence was buying it by
discarding the subject.

Now `aspect-[16/9]` at all widths → 745 × 419 at 1440, 506 × 284 at 1024, 343 × 193 at 375, and the
residual crop is the 1.833-vs-1.778 rounding (~1.5% off each side — invisible). The shorter panel
also suits the parked left column, which lost its toggle and its button pair.

**Do not pin a height here again.** If the hero needs to be taller, re-crop or re-shoot the source
images to the taller ratio and set the panel to *that* — do not ask cover to invent the difference.

### The hero is the one surface not capped at 1400px

`<section>` carries the standard `GUTTERS`; the grid inside it has **no `maxWidth`** and is
`lg:grid-cols-2`. So the copy column is literally the page's left half.

**Why:** with the 1400 cap, a 1920 viewport put ~260px of dead margin outside each gutter, and the
hero copy sat marooned against it. Gautham: "there is a lot of empty space in the left… center align
the text to the 50% width in the left of the page."

**The copy block is `w-full max-w-[600px] mx-auto` — centred in that half, with its lines still
left-aligned.** Both halves matter:

- **Without the max-width, centring is a no-op** — a full-width block has nothing to centre in.
- **600px is measured**, not picked: it is the longest spoken turn's width at the 46px cap (564px)
  plus air. Change the headline copy and this number is wrong.
- **Lines stay left-aligned** (Gautham's call) so the copy keeps the common left edge the rest of
  the site reads on; only the block is centred.

**Consequence to expect:** the hero copy no longer aligns with the page's left gutter the way every
section below it does — it starts ~90px further in at 1440. That is the point of the change, not a
regression.

### Headline type: a measurement, not a taste call

`clamp(26px, calc(4.0vw - 6px), 46px)`, and every number in it is load-bearing.

The events headline is a **spoken exchange** — three turns, one per `headline[]` entry, joined by
`<br />`. The single constraint everything derives from:

> **Each turn must hold on one line.** A turn needs ~12.4× the font size in px. A wrapped turn reads
> as prose, not as someone talking.

Two things fall out of that:

- **The longest turn is turn 2, "No idea. What about you?" (564px at 46px) — not turn 1.** It is
  what sets both the 600px block and the 46px cap, and the fit has only ~36px of slack. **Any reword
  past ~26 characters must be re-measured**, not eyeballed.
- **The `- 6px` offset** exists because a plain `vw` grows *faster* than the block does between lg
  and ~1300px, where the block is the page half rather than the 600px cap. Without it, turns wrapped
  across that whole band.

### "About N options" is live, rounded, and degrades to nothing

The number is the real catalogue size, not a copywriter's figure. Chain:
`GET /event/count` → `eventsApi.count()` → `eventsSource.count()` (fixtures in dummy mode) →
React Query in `HeroCarousel`.

- **Rounded to the nearest 10** (Gautham's call). An exact live number reads as a dashboard stat
  and would tick between page loads.
- **Below 10 it returns `null`, which drops the clause entirely** — the sentence becomes
  "**Leave it with us.** Near you or online." A catalogue of 4 rounds to "0 options", and 10 would
  overstate. That fallback is also what renders while the request is in flight or if it fails
  (`retry: false`), so the hero **never** shows "About  options" or a number nobody can stand behind.
  This is why `SubLine` carries both `text` and `textWithCount` — **never bake a number into `text`.**
- **`GET /events/count` must stay declared above `GET /events/{event_id}`** in
  `event_endpoints.py`. FastAPI matches in definition order; below it, "count" is captured as an
  event_id and 422s on the UUID parse. That is not hypothetical — it is what the first version did.
- **It counts `func.count(Event.id)`, one column — not `db.query(Event).count()`**, which wraps a
  SELECT of every mapped column and therefore breaks whenever the table lags the model. It does
  today: `platform_dev.db` has no `source` column until `migrate_add_source_columns.py` is run, and
  `/events/search` 500s on exactly that. Counting one column is cheaper *and* survives the skew.

### The body paragraph is left-aligned and 24px

- **Left-aligned.** Everything in the copy block — all three spoken turns, "Leave it with us." and
  "Join a one-off event…" — starts on one left edge (verified: all at x=72 at 1440). **A centred
  version was built and reverted the same day** (2026-08-11): centring gave each line its own
  start, so the second sentence no longer sat under the first. **Only the block is centred in the
  page's left half; nothing inside it is.**
- **24px, up from 18px.** A knowing departure from the 18px page-subtitle standard in §8. Gautham
  said *"for now"*, so it is **provisional and hero-only** — do not read it as a new site-wide
  subtitle size, and do not sweep §8's other 18px surfaces to match.
- **24px is the ceiling that keeps sentence 1 on one line**: it measures 580px in the 600px block.
  Anything larger wraps it at every width.

**Known and accepted:** between 1024 and ~1310px the block is the page half rather than the 600px
cap, so sentence 1 wraps to two lines. No fixed size above 18px avoids this — at 1024 the block is
440px and the sentence needs 580px. It wraps cleanly, so it was left alone.

### Short turns, not NBSP machinery

An earlier version of this copy had a 38-character turn that could not fit at any usable size. Its
words were bound with non-breaking spaces to force the wrap to land at the comma. **That approach is
a bug factory and is now gone:**

- **A bound run cannot break, so when it exceeds the block it overflows the page** rather than
  wrapping. It did — 7px at 375 and 62px at 320.
- **The binding is off-by-one-word sensitive.** Putting the NBSP directly after the comma binds
  `know,` to `what` and leaves the only legal break after "don't" — a mid-phrase break, the exact
  thing the binding was added to prevent. That shipped briefly and Gautham caught it on sight.

**Prefer copy that fits over machinery that forces it to fit.** If a turn needs binding to work, it
is too long for the block.

Verified 0 horizontal overflow, and all three turns on one line each, at 2560 · 1920 · 1600 · 1440 ·
1300 · 1280 · 1200 · 1150 · 1100 · 1024 · 900 · 768 · 414 · 375. At **320** turns 1 and 2 wrap —
unavoidable at that width and harmless, since there is no bound run left to overflow. **Re-run that
sweep if you touch the copy, the block width, or the clamp** — several of those widths were failing
mid-build.


### The 5px green frame

`border: 5px solid var(--brand-green)` on the panel — Gautham's explicit call, 2026-08-11.

**This is not a violation of the border system, and is not a stray hardcode to sweep.** The 2px
`--brand-control-border` rule governs *controls*; `--brand-border` governs cards, panels and
dividers. This is decoration on a photograph, and it is a brand token, not a hex.

Two mechanics worth knowing before touching it:

- **The frame eats the photo, it does not grow the panel.** Tailwind's preflight sets
  `box-sizing: border-box`, so `aspect-[16/9]` sizes the *border* box. The panel stays 745 × 419 at
  1440; the image inside becomes 735 × 409. That is 1.797 against a 1.833 source — marginally
  *better* than the bare panel's 1.778, so the frame did not reintroduce any crop.
- **It works in dark without intervention** because `--brand-green` is theme-aware: `#184E4A` on
  linen, lifted to `#2F8A80` on the near-black page. A raw hex here would have vanished in dark —
  the same trap `CategoryGrid`'s hover border hit (§5).

---

## 10. `/explore` filter design

**The Availability section (`[All] [Selling Fast]`) is the card's status tags as a filter, and is
the panel's one client-side filter.** "Selling fast" is derived from `tickets_sold / capacity > 0.7`,
a test `/event/search` cannot express, so it narrows the fetched rows inside the `items` useMemo
rather than the query.

**`itemSellingFast` must stay in step with the `selling-fast` badge in `toCarouselEvent`** — move
the 70% threshold in one and the filter starts returning cards that carry no Selling Fast tag.

It deliberately does **not** filter communities (they have no capacity, and emptying the other half
of "View Both" would read as a broken filter), matching how price/date/format already behave.

**Only Selling Fast lives there.** Free is the Price toggle and This Week is a Date Range preset, so
nothing has two homes. Sold Out was rejected as something nobody browses *for* — those cards already
sink via `soldOutLast`.

**It is not a Category chip.** Category is single-select, so filing it there would make "Music" and
"selling fast" mutually exclusive — the same axis-confusion as the online-is-a-format rule.
