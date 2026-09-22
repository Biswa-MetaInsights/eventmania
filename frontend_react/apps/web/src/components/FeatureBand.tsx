'use client'

// ─────────────────────────────────────────────────────────────────────────────
//  "Why NewFind" — the feature band between the Online Events row and
//  "Browse by category" on home.
//
//  BOTH AUDIENCES ARE ON SCREEN AT ONCE (Gautham, 2026-08-19). There is no
//  switch any more: the participant tiles sit left, the organiser tiles right,
//  and each tile names its own audience with a coloured dot. Do not put the
//  `RailToggle` back — hiding half the pitch behind a click was the thing that
//  was rejected.
//
//  ⚠️ THE CTA IS A TILE, not a button row under the grid. Each half ends with a
//  tile carrying the audience's one action (Explore events / Create an event),
//  so a half reads as one uninterrupted row. The old `BandCTA` outline-button
//  pair below the grid is gone — do not reinstate it.
//
//  ⚠️ EVERY CLAIM HERE IS A PROMISE TO A USER. Check STATUS.md before adding or
//  editing a card. Three things are deliberately absent and must not be added:
//    · "AI-powered personalised recommendations" — the engine is a keyword
//      match nothing on the frontend calls, and the `Recommended` badge can
//      never fire on a real event (TODO.md §2). It fails on the first click.
//    · "Sell tickets" as a working claim — checkout never confirms its Stripe
//      intent and tickets never reach the DB (TODO.md §11). The pricing card
//      states the FEE, not that selling works.
//    · "Verified organisers" — the trust line on /event/[id] is hardcoded
//      (TODO.md §1).
//  And the word "community" must not appear anywhere here — parked for Phase 2.
//
//  ⚠️ Three of the five live cards are forward-looking, by Gautham's call:
//    · CHAT    — rooms are live, but only after you book. The copy deliberately
//                never says WHEN you can chat, so it stays true either way. Do
//                not "clarify" it into "once you book". See TODO.md §7b.
//    · PRICING and STATS — not built. TODO.md §13 and §14.
//  Chat copy must also stay PRESENT-TENSE: message persistence is commented out
//  in the backend, so nothing survives a refresh. Never write "message your
//  attendees anytime" or "chat history".
//
//  ⚠️ The heading sets "NewFind" as the real `Wordmark`, not type. It inherits
//  `currentColor`, so the green comes from the span around it. The `1.1em`
//  height is a VISUAL match to the adjacent text, not a computed one — the
//  master viewBox includes the script's ascenders and descenders, so matching
//  the font-size numerically renders it too small. Re-eyeball it if the heading
//  size changes.
//
//  ⚠️ A FEATURE CARD IS NOT A LINK and must not become one — the hover fill is
//  feedback on a block of copy, not an affordance. **The two CTA tiles are the
//  exception and ARE links** (Gautham, 2026-08-20): a click anywhere in them
//  navigates. That is safe only because a CTA tile holds no inline link of its
//  own — see the note on `CTATile`. A card body MAY carry an inline
//  `BodyLink` (the stats card points at the organiser console), and that is only
//  safe BECAUSE the card is not a link: wrapping the card would make the inline
//  link a second tab stop competing with it, which is the same trap
//  `CategoryGrid`'s decorative arrow avoids. Hover uses the app-wide rule
//  (background → green, text → linen) via `group-hover:` classes rather than
//  inline styles, because an inline style cannot express a hover state.
//
//  ⚠️ THE BAND HAS NO WIDTH CAP — it runs gutter to gutter like every other
//  home section (Gautham, 2026-08-19). It was capped at 960 while it was three
//  cards behind a switch, and briefly at 1400 once both audiences shared a row;
//  seven tiles need the width, so the cap is gone. It still carries `GUTTERS`
//  and nothing is centred, so the heading keeps the left line it shares with
//  `EventsCarousel` above and `CategoryGrid` below. Do not add `margin: 0 auto`
//  and do not centre the text — a centred block was built and rejected, and
//  that answer still stands. See DESIGN_NOTES.md §1.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { BRAND } from '@/lib/theme'
import { GUTTERS } from '@/lib/layout'
import { Wordmark } from './brand'
import { TAG_SHAPE } from './EventBadges'
import { SparkleIcon } from './EventIcons'

const GREEN = BRAND.green
const TEXT = BRAND.text

/** Wordmark size in the heading. A VISUAL match to the adjacent text, not a
 *  computed one — the master viewBox carries the script's ascenders and
 *  swashes, so matching the font-size numerically renders it too small. */
const WORDMARK_HEIGHT = '1.1em'

/** ⚠️ Why the wordmark needs a nudge to share a line with "Why".
 *
 *  Measured off the path data, not eyeballed: the lowercase e/w/i/n/d rest at
 *  y ≈ 7.24 in an 8.001-tall viewBox, and the capital N and F swashes descend
 *  past them to the box's bottom edge (the master is cut flush to the swashes).
 *  So the wordmark's BASELINE is at 90.5% of its box, with 9.5% of descender
 *  below it.
 *
 *  `vertical-align: baseline` puts a replaced element's bottom MARGIN EDGE on
 *  the text baseline — i.e. the bottom of the swashes — which floats the
 *  lettering high by exactly that 9.5%. This drops it back. Re-derive it if
 *  `WORDMARK_HEIGHT` changes; it is 9.5% of that value.
 *
 *  (The earlier `items-center` did the opposite and sat the wordmark low: it
 *  centred the whole box, swashes included, against the text's line box.) */
const WORDMARK_BASELINE_DROP = '0.105em'

type Audience = 'participants' | 'organisers'

/** ⚠️ No "For " prefix (Gautham, 2026-08-19) — these are badges now, and a badge
 *  states the thing, it doesn't make a sentence about it. Title Case to match
 *  `BADGE_CONFIG`'s labels ("Selling Fast", "Sold Out"), not uppercase. */
const AUDIENCE_LABEL: Record<Audience, string> = {
  participants: 'Participants',
  organisers: 'Organisers',
}

type Feature = {
  id: string
  title: string
  /** A node, not a string, so a card can carry an inline link (the stats card
   *  points at the organiser console). Keep the plain ones as plain strings. */
  body: React.ReactNode
}

/** The one action a half is pitching, rendered as that half's last tile. */
type AudienceCTA = { title: string; href: string; label: string }

/** An inline link inside a card body. It carries its HALF'S ACCENT at rest —
 *  terracotta in an organiser card, green in a participant one (Gautham,
 *  2026-08-19: "keep the organiser dashboard link also in the brand orange") —
 *  so a link matches the badge above it instead of importing the other half's
 *  colour into the tile. That is why it takes an `audience`: the accent comes
 *  from `SKIN`, never from a colour written in here.
 *
 *  The CTA tiles' links follow the same rule, so every link in a half carries
 *  that half's colour.
 *
 *  ⚠️ `group-hover:text-inherit`, NOT a named colour. On hover the tile fills
 *  with that same accent, so the link has to leave it; inheriting picks up the
 *  body `<p>`'s `SKIN.fg`, which means one link works in either half and cannot
 *  fall out of step with the tile it sits on (an organiser tile hovers
 *  TERRACOTTA, so a hardcoded `--brand-on-green` would be the wrong white). The
 *  underline is what keeps it readable as a link once it matches the copy. */
function BodyLink({
  href,
  audience,
  children,
}: {
  href: string
  audience: Audience
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        'font-semibold underline underline-offset-2 transition-colors duration-200 ' +
        `${SKIN[audience].link} group-hover:text-inherit hover:opacity-75`
      }
    >
      {children}
    </Link>
  )
}

/** A miniature of the assistant's floating launcher, rendered inline in the
 *  assistant card's body so the copy can point at the control without naming a
 *  colour ("the terracotta button") that a reader on a dark theme, or a
 *  colour-blind reader, cannot verify. The round terracotta disc is what
 *  identifies it — that shape and fill are the launcher's, from
 *  `EventChatWidget.tsx`.
 *
 *  The glyph is the app's own `SparkleIcon`, deliberately NOT a pixel copy of
 *  the launcher's two-star cluster: at this size the small second star is
 *  sub-pixel and just dirties the disc — the same reason `SparkleIcon` is one
 *  sparkle and not three (see its note in `EventIcons.tsx`).
 *
 *  ⚠️ Stays terracotta through the card's green hover fill, on purpose: it is a
 *  picture of a control that is always terracotta, not text that should invert.
 *
 *  ⚠️ `align-middle`, NOT a `vertical-align` offset in em. An inline-flex box
 *  takes its baseline from its first flex item, and an `<svg>` is a replaced
 *  element with no baseline of its own — so the browser synthesizes one from the
 *  glyph's BOTTOM edge, which hangs the whole disc below the line of text. Any
 *  em offset is then a guess layered on top of a synthesized number that shifts
 *  with the glyph's size. `middle` ignores the baseline entirely and centres the
 *  disc on the text's x-height, which is stable at any size. Do not "restore" a
 *  numeric drop here — that is what sat it low the first time.
 *
 *  The `-translate-y` on top of it is the nudge from the x-height centre up to
 *  the CAP-height centre — Roboto's x-height is ~0.53em and its cap height
 *  ~0.71em, so their midpoints differ by ~0.09em, and that is the whole constant.
 *  A disc this much taller than the text reads low when centred on lowercase.
 *  It is a transform, NOT a vertical-align offset, so it stays independent of
 *  the synthesized baseline above. Re-derive it from the two metrics if the font
 *  changes; don't re-guess it.
 *
 *  ⚠️ `rounded-full` is correct here and is not a breach of the shape rule —
 *  this depicts a round icon control, the one category the rule exempts. */
function AssistantLauncherGlyph() {
  return (
    <span
      role="img"
      aria-label="assistant button"
      className="inline-flex items-center justify-center align-middle mx-[0.12em]
                 -translate-y-[0.09em] w-[1.35em] h-[1.35em] rounded-full"
      style={{
        backgroundColor: 'var(--brand-terracotta)',
        color: 'var(--brand-on-terracotta)',
      }}
    >
      <SparkleIcon className="w-[0.8em] h-[0.8em]" />
    </span>
  )
}

const FEATURES: Record<Audience, Feature[]> = {
  participants: [
    {
      // ⚠️ ON BORROWED TIME — event rooms are to be parked for Phase 2 (Gautham,
      // 2026-08-20), and this card must be commented out or replaced in the SAME
      // change, or the home page promises a feature that is no longer reachable.
      // Removing it also drops the band to six tiles, which is a grid change.
      // Spec: TODO.md §16. (The assistant card below is a DIFFERENT feature and
      // stays.)
      id: 'chat',
      title: 'Talk to the organiser before you go',
      body: 'Every event has its own room. Ask the organiser, meet the people going, even before it starts. Say goodbye to endless emails.',
    },
    // ⚠️ PARKED, NOT DELETED (Gautham, 2026-08-19) — "Everything in one feed" is
    // commented out so Participants runs two cards + the CTA tile. Uncomment to
    // restore it; the grid needs no change (each half wraps on its own).
    // ⚠️ Read TODO.md §15 first if you are restoring it: the deferred
    // "plenty to choose from" card makes a neighbouring breadth claim, and the
    // two are an either/or — not two tiles both saying "lots of events".
    // {
    //   id: 'feed',
    //   title: 'Everything in one feed',
    //   body: 'Big-name listings and independent organisers, near you or online — one place, not five tabs.',
    // },
    {
      id: 'assistant',
      title: 'An AI assistant that knows the event inside out',
      // ⚠️ THE GLYPH IS THE NOUN — it is not decoration beside a description of
      // the button, it IS the word (Gautham, 2026-08-20: "the emoji/symbol alone
      // is enough"). An earlier draft read "just tap the terracotta button" and
      // named the colour, which a reader on a dark theme or with colour-vision
      // deficiency cannot verify; the picture says it without that problem, and
      // its `aria-label` ("assistant button") is what a screen reader reads in
      // its place. **Do not delete it without putting words back.**
      body: (
        <>
          Ask it what to bring, where to go, what to expect, and more — just tap the{' '}
          <AssistantLauncherGlyph /> on any event to start chatting.
        </>
      ),
    },
  ],
  // ⚠️ ORDER IS THE MESSAGE, not an accident. Array order IS render order — the
  // grid has no sort — and the first card is the leftmost, which is the one an
  // organiser reads first. `stats` leads by Gautham's call (2026-08-18): the
  // dashboard is the pitch. Do not reorder these to group the built features
  // together or to put the cheapest promise first.
  organisers: [
    {
      id: 'stats',
      title: 'Everything an organiser wants, in one place',
      body: (
        <>
          See all your event info and stats in the{' '}
          <BodyLink href="/organizer/events" audience="organisers">
            organiser console
          </BodyLink>{' '}
          — one at a time, or all together.
        </>
      ),
    },
    {
      id: 'publish',
      title: 'Publishing events got easier',
      body: 'Fill the form, save a draft, and publish when you’re ready.',
    },
    {
      // ⚠️ THE FEE IS PAID BY THE PARTICIPANT, not deducted from the organiser
      // (Gautham, 2026-08-19 — it was "organisers pay a flat 2%" until then).
      // That is a different build, not a rewording: it lands on the checkout
      // total as an itemised line. TODO.md §13 carries the spec — keep the two
      // in step, because this card is the promise and §13 is the work.
      id: 'pricing',
      title: 'Free to list. Small fee for paid events.',
      body: 'Free events cost nothing to participants and organisers. Participants pay a mere 2% convenience fee on paid events.',
    },
  ],
}

// ⚠️ The CTA tiles were parked for one round on 2026-08-19 (five tiles, no call
// to action) and RESTORED the same day — Gautham preferred seven. The grid
// numbers move with them: 3 + 4 across from 1400px. If they ever come out
// again, the five-up arrangement was `xl:grid-cols-5` with `col-span-2` /
// `col-span-3` and inner counts of 2 and 3.
const CTAS: Record<Audience, AudienceCTA> = {
  participants: { title: 'Looking for plans?', href: '/explore', label: 'Explore events' },
  organisers: { title: 'Got an event?', href: '/organizer/create', label: 'Create an event' },
}

// ─── Tile chrome ─────────────────────────────────────────────────────────────

/** ⚠️ 2px `--brand-control-border`, NOT 1px `--brand-border`. Gautham's explicit
 *  call (2026-08-18): "the same colour, thickness, just like every other border
 *  in the website". A card is normally a non-control and would take 1px
 *  `--brand-border` — but at #E2DDD5 on #F2EFEA linen that is the
 *  invisible-border problem the 2px pass was introduced to fix, and /explore's
 *  filter sidebar is the same precedent (a panel, not a control, carrying 2px
 *  control-border). Keep 2px on BOTH states so the card cannot resize on hover.
 *
 *  `p-5`, not the old `p-6`: a tile is ~180px wide once seven of them share a
 *  row, and 24px of padding either side left the copy under 130px.
 *
 *  ⚠️ EVERY TILE CENTRES HORIZONTALLY (Gautham, 2026-08-19): `items-center` +
 *  `text-center`. `items-center` is also what shrink-wraps the audience badge —
 *  without it the tile's `flex flex-col` stretches it into a colour bar.
 *
 *  ⚠️ VERTICAL alignment is NOT set here, on purpose. A feature tile is
 *  top-aligned (the flex default) so that every title in the row starts on the
 *  same line — centring them was built and rejected the same day, because the
 *  titles then floated to a different height in each tile. **Only `CTATile`
 *  adds `justify-center`**, and it adds it rather than overriding a value from
 *  here: two conflicting utilities in one class string do not resolve by string
 *  order in Tailwind v4 (the generated stylesheet's order decides), which is the
 *  same trap `CategoryBadge` documents. Set it in one place, never both.
 *
 *  This is the TILE only — **the band's heading and subtitle stay left-aligned**,
 *  which is a separate and still-standing decision (DESIGN_NOTES.md §1: "left
 *  align the whole thing"). Do not centre the section while centring the cards. */
const TILE =
  'group h-full rounded-lg p-5 flex flex-col gap-2.5 border-2 transition-colors duration-200 ' +
  'items-center text-center ' +
  'bg-[var(--brand-surface)] border-[var(--brand-control-border)]'

/** ⚠️ THE TYPE SCALE IS THE EVENT CARD'S, not this band's own (Gautham,
 *  2026-08-19): a tile title is `text-[20px] font-bold` and its body
 *  `text-[18px]`, the same pair `EventCardItem` uses for an event title and its
 *  date/venue line — the two sit on the same page and were visibly out of step
 *  at 18/16. **If `EventsCarousel`'s card sizes move, move these with them**;
 *  they are a deliberate match, not a coincidence. The `SeeAllTile` in that file
 *  carries the same note for the same reason. */
const TILE_TITLE =
  'text-[20px] font-bold leading-snug transition-colors duration-200 text-[var(--brand-text)]'

/** `--brand-hint` is the secondary-text token and is NOT gray — do not "restore"
 *  it to --brand-muted, which is placeholders and fills. */
const TILE_BODY =
  'text-[18px] leading-relaxed transition-colors duration-200 text-[var(--brand-hint)]'

/** ⚠️ ONE ACCENT PER HALF, and it drives everything (Gautham, 2026-08-19):
 *  **participants are GREEN, organisers are TERRACOTTA.** The accent is the
 *  badge's fill at rest, the fill the whole TILE takes on hover, and — inverted —
 *  the badge's label once the tile is filled. So an organiser tile hovers
 *  terracotta, not green, which is the one place this band departs from the
 *  app-wide "hover → green" rule; it is deliberate, it is what separates the two
 *  halves at a glance, and it should not be swept back to green.
 *
 *  ⚠️ Derive, don't hand-pick. Each half is exactly one `--brand-<accent>` /
 *  `--brand-on-<accent>` pair, used five ways — the fifth being an inline
 *  `BodyLink` in the copy, which takes the accent at rest so a link matches the
 *  badge above it rather than importing the other half's colour. If you add a third audience or
 *  change an accent, change the pair here and nothing else — a colour written
 *  straight into a component is how the two halves drift apart.
 *
 *  ⚠️ `hover:` on the tile and `group-hover:` on its contents are CLASSES on
 *  purpose. An inline `style` cannot express a hover state at all, and an inline
 *  colour would beat the `group-hover:` rule on the children.
 *
 *  ⚠️ CONTRAST, stated so it is a known trade and not a surprise: linen on
 *  `--brand-green` is ~8.3:1, but white on `--brand-terracotta` is ~4.2:1 —
 *  fine for the 18px bold title (AA large needs 3:1) and **just under AA for the
 *  16px body** (4.5:1). It is a transient hover state on copy that is fully
 *  legible at rest, and the terracotta is Gautham's; do not darken the token to
 *  "fix" it, because `--brand-terracotta` is shared with the chat launcher and
 *  the category chip. */
const SKIN: Record<Audience, { tile: string; fg: string; badge: string; link: string }> = {
  participants: {
    tile: 'hover:bg-[var(--brand-green)] hover:border-[var(--brand-green)]',
    fg: 'group-hover:text-[var(--brand-on-green)]',
    badge:
      'bg-[var(--brand-green)] text-[var(--brand-on-green)] ' +
      'group-hover:bg-[var(--brand-on-green)] group-hover:text-[var(--brand-green)]',
    link: 'text-[var(--brand-green)]',
  },
  organisers: {
    tile: 'hover:bg-[var(--brand-terracotta)] hover:border-[var(--brand-terracotta)]',
    fg: 'group-hover:text-[var(--brand-on-terracotta)]',
    badge:
      'bg-[var(--brand-terracotta)] text-[var(--brand-on-terracotta)] ' +
      'group-hover:bg-[var(--brand-on-terracotta)] group-hover:text-[var(--brand-terracotta)]',
    link: 'text-[var(--brand-terracotta)]',
  },
}

/** Which half a tile belongs to, stated on the tile itself — this is what makes
 *  the two halves legible now that nothing labels them from above. A filled
 *  badge: **terracotta for participants, green for organisers** (Gautham,
 *  2026-08-19 — swapped later the same day from green/terracotta, so do not
 *  "restore" the older pairing; it replaced a coloured dot beside plain text).
 *
 *  ⚠️ IT IS STYLED AS A STATUS TAG (Gautham, 2026-08-19): "use the Selling Fast
 *  / This Week tags on the event card as the reference". Silhouette from
 *  `EventBadges`' exported `TAG_SHAPE`, then `gap-1.5 font-bold leading-5` +
 *  `px-2.5 py-1.5 text-[16px]` — the exact chrome `EventBadge` renders. Those
 *  utilities are RESTATED rather than imported because `TAG` is private to that
 *  file, which exports only the shape on purpose; **if `EventBadge`'s padding or
 *  size changes, change these to match.** The one thing not copied is the glyph
 *  every status tag carries — say the word and it is `PeopleIcon` /
 *  `BriefcaseIcon` from `EventIcons`, the two this band used before the tiles
 *  lost their icon chips.
 *
 *  ⚠️ The badge must never be left to stretch. The tile is a `flex flex-col`,
 *  so under the default `align-items: stretch` it runs edge to edge as a colour
 *  bar; today `TILE`'s own `items-center` is what shrink-wraps it. If that
 *  centring is ever removed, put `self-start` back on this span.
 *
 *  ⚠️ EVERY badge INVERTS on hover, and it has to: the tile fills with that
 *  half's own accent, so the badge would otherwise be accent-on-accent and
 *  vanish. Inverted, it takes the `--brand-on-<accent>` fill and the accent as
 *  its label. All of it comes from `SKIN` — see the note there, and do not
 *  hand-write a colour here. (This is NOT the `AssistantLauncherGlyph` rule,
 *  which keeps that glyph terracotta through a hover because it depicts an
 *  always-terracotta control; that still stands.)
 *
 *  ⚠️ 16px clears the 15px font-size floor, so this needs **no
 *  `data-keep-type`** — it carried one back when it was 13px. It fits easily
 *  now that the tiles are five-up (~250px of content); `TAG_SHAPE` brings
 *  `whitespace-nowrap`, so a longer label would overflow rather than wrap —
 *  **re-measure before adding a third, longer audience name.** */
function AudienceBadge({ audience }: { audience: Audience }) {
  return (
    <span
      className={
        `${TAG_SHAPE} gap-1.5 font-bold leading-5 px-2.5 py-1.5 text-[16px] ` +
        `transition-colors duration-200 ${SKIN[audience].badge}`
      }
    >
      {AUDIENCE_LABEL[audience]}
    </span>
  )
}

function FeatureTile({ title, body, audience }: Feature & { audience: Audience }) {
  return (
    <div className={`${TILE} ${SKIN[audience].tile}`}>
      {/* ⚠️ The badge sits ABOVE the title (Gautham, 2026-08-19) — it labels the
          whole tile, so it reads as an eyebrow rather than as something
          attached to the heading it used to sit under. */}
      <AudienceBadge audience={audience} />
      <h3 className={`${TILE_TITLE} ${SKIN[audience].fg}`}>{title}</h3>
      <p className={`${TILE_BODY} ${SKIN[audience].fg}`}>{body}</p>
    </div>
  )
}

/** The half's closing tile. Same chrome as a feature tile, but THIS ONE IS A
 *  LINK — the whole tile navigates, wherever you click in it (Gautham,
 *  2026-08-20).
 *
 *  ⚠️ It is the documented exception to "a card is not a link" in the header
 *  note, and it is safe for the one reason the feature tiles are not: it holds
 *  **no inline link of its own**. The rule exists because a card-as-link
 *  wrapping a `BodyLink` gives one action two tab stops competing for it. Here
 *  the tile IS the single action and the single tab stop — the same shape as a
 *  `CategoryGrid` tile, whose arrow is decoration inside the tile's own link.
 *  **So do not add a `BodyLink` to a CTA tile, and do not turn a feature tile
 *  into a link while it carries one.**
 *
 *  ⚠️ NO hover effect on the label (same call). It used to carry
 *  `hover:opacity-75`, which fired only when the pointer was over those two
 *  words and so advertised the text as *the* clickable thing — the opposite of
 *  what a whole-tile link is telling you. The only hover left is the tile's own
 *  fill, which reacts identically wherever the pointer is inside it. The label
 *  still takes `SKIN.fg` on hover, but that is the whole tile changing colour,
 *  not the text singling itself out. **Do not put a text-only hover back.**
 *
 *  ⚠️ NO `AudienceBadge` here, by Gautham's call (2026-08-19) — the question the
 *  tile opens with ("Looking for plans?" / "Got an event?") already names its
 *  audience, so the label was saying it twice. Do not "restore" it for symmetry
 *  with the feature tiles. It still takes the half's `SKIN`, so the organiser
 *  CTA hovers terracotta with the other three organiser tiles.
 *
 *  ⚠️ `justify-center` is THIS tile's alone (Gautham, 2026-08-19). Its two short
 *  lines sit centred against the taller feature tiles beside it, while those
 *  stay top-aligned so their titles all start on one line. `TILE` deliberately
 *  sets no vertical alignment — see the note there before moving this. */
function CTATile({ audience, cta }: { audience: Audience; cta: AudienceCTA }) {
  return (
    <Link href={cta.href} className={`${TILE} ${SKIN[audience].tile} justify-center`}>
      <h3 className={`${TILE_TITLE} ${SKIN[audience].fg}`}>{cta.title}</h3>
      {/* ⚠️ A `span`, not a nested link — the tile is the link. It takes its
          HALF'S ACCENT at rest, like the inline `BodyLink` — so "Create an
          event" is terracotta and "Explore events" green (Gautham, 2026-08-19).
          It is the one place in the app where a call to action is not green, and
          it is deliberate: this band is skinned by audience, not by control
          type. The hover foreground still follows the skin, because that accent
          is what the tile has filled with underneath it — which is also why the
          rest colour cannot simply be reused there. */}
      <span
        className={
          'text-[18px] font-bold transition-colors duration-200 ' +
          `${SKIN[audience].link} ${SKIN[audience].fg}`
        }
      >
        {cta.label} <span aria-hidden>→</span>
      </span>
    </Link>
  )
}

// ─── Tile order ──────────────────────────────────────────────────────────────

/** ⚠️ ONE FLAT GRID, not two nested half-grids (Gautham, 2026-08-19). The band
 *  used to render each audience as its own grid inside a 3/4 column split; that
 *  guaranteed the halves stayed grouped, but it also meant a half always started
 *  a NEW ROW — so at two-up the participants' CTA tile sat alone with a hole
 *  beside it instead of the first organiser tile. Flattening lets the tiles flow
 *  continuously at every width, and costs nothing at seven-up: document order is
 *  already 3 participants then 4 organisers, so `grid-cols-7` reproduces the
 *  split exactly, with equal widths for free.
 *
 *  ⚠️ These MUST stay direct children of the grid — no wrapper element per
 *  audience, which is why this is a `flatMap` and not a nested `map`. A wrapper
 *  is precisely the thing that reintroduced the row break.
 *
 *  Order is the message: participants first, and within each half the array
 *  order in `FEATURES` (see the note there). The CTA closes its own half. */
const AUDIENCE_ORDER: Audience[] = ['participants', 'organisers']

function tiles() {
  return AUDIENCE_ORDER.flatMap((audience) => [
    ...FEATURES[audience].map((f) => <FeatureTile key={f.id} audience={audience} {...f} />),
    <CTATile key={`${audience}-cta`} audience={audience} cta={CTAS[audience]} />,
  ])
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function FeatureBand() {
  return (
    <section aria-label="What you can do on NewFind" className="py-8">
      {/* No inner width cap — `GUTTERS` alone, so the band runs the full page
          width like `EventsCarousel` and `CategoryGrid`. See the header note. */}
      <div className={GUTTERS}>
        {/* Heading — same type treatment as CategoryGrid's, so the two read as
            one family. */}
        {/* Deliberately normal inline flow, NOT a flex row — the wordmark has to
            sit on the text baseline, and flex alignment can only centre or
            stretch the whole box (swashes included). See the constants above. */}
        <h2
          className="font-extrabold tracking-[-0.5px]"
          style={{ fontSize: 'clamp(22px, 4vw, 30px)', color: TEXT }}
        >
          Why
          <Wordmark
            style={{
              height: WORDMARK_HEIGHT,
              width: 'auto',
              display: 'inline-block',
              verticalAlign: 'baseline',
              transform: `translateY(${WORDMARK_BASELINE_DROP})`,
              marginLeft: '0.28em',
              // `currentColor` all the way down, so setting `color` here tints
              // the whole wordmark green without touching the master paths.
              color: GREEN,
            }}
          />
        </h2>

        {/* ⚠️ NO SUBTITLE under the heading (Gautham, 2026-08-19). The badges
            say who each half is for, so a line explaining that was repeating
            them. Do not reinstate one — and if you ever do, do not let it COUNT
            the cards: a "three things each" subtitle goes stale the moment a
            card is parked or restored, which has already happened once. */}

        {/* All seven tiles in one flow — see the note on `tiles()`.
            ⚠️ `band:grid-cols-7` is the whole design: 3 participants beside 4
            organisers, across the full page width. `band` is a REGISTERED 1400px
            breakpoint from globals.css.
            ⚠️ EVERY NARROWER STEP IS BOUND WITH `max-band:`, and that is not
            noise — it is the fix for a real bug. A wider breakpoint does not
            beat a narrower one by being wider: `band:` (like `min-[1400px]:`
            before it) is emitted BEFORE the built-in screens, so a plain
            `lg:grid-cols-4` sitting on this same element won at 1600px and the
            row rendered four-up. `max-band:` makes the ranges disjoint, so
            source order stops mattering. **Do not "simplify" these back to bare
            `sm:`/`md:`/`lg:`** — that is precisely the broken version. See the
            note beside `--breakpoint-band` in globals.css.
            The width itself is tied to the tile COUNT: neither
            `xl` (1280, where seven tiles are only ~150px each) nor `2xl` (1536,
            which would leave a 1440px laptop stacked); 1400 puts a tile near
            180px and 1440 near 190px. **Re-pick it if the count changes** — a
            briefly shipped five-tile version used `xl:grid-cols-5`.
            Below it the tiles wrap continuously rather than by half, so a row
            can hold the end of one audience and the start of the other. The
            counts step 1 → 2 → 3 → 4 to keep a tile from ~220px up; seven across
            a 1024px viewport would be ~115px, narrower than the words in them.
            Both audiences are always on the page at every width — this band is
            never behind a switch.
            ⚠️ `auto-rows-fr` + the tile's own `h-full` are what make EVERY tile
            the same height, and they are load-bearing once the tiles wrap: seven
            into three or four columns leaves the last row holding a lone CTA
            tile, which is the shortest content in the band, so without this it
            renders as a stub beside full-height cards. `minmax(0, 1fr)` rows in
            an auto-height grid all resolve to the tallest row's content, which
            is exactly what is wanted here. Do not drop it when changing the
            column counts. */}
        <div className="mt-6 grid gap-5 auto-rows-fr grid-cols-1 max-band:sm:grid-cols-2 max-band:md:grid-cols-3 max-band:lg:grid-cols-4 band:grid-cols-7">
          {tiles()}
        </div>
      </div>
    </section>
  )
}
