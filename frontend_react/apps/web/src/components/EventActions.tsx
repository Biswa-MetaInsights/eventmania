'use client'

// ─────────────────────────────────────────────────────────────────────────────
//  The round hero/card controls — ONE definition, used everywhere.
//
//  Serves BOTH events and communities: the event cards (EventsCarousel), the
//  community cards (CommunityCarousel), the /event/[id] hero and the
//  /community/[slug] hero all render these, so no two surfaces can drift apart
//  again. If you need a share, favourite or back control anywhere new, import it
//  from here; do not hand-roll another one.
//
//  ⚠️ The `Event*` export prefix is historical — these are kind-agnostic now.
//  Pass `kind` to say which you are rendering; it drives the share URL, the
//  wishlist record and the aria-label.
//
//  All three share the same chrome: linen circle, muted icon that goes green on
//  hover — taking the button's ring with it, where it has one (`hoverEdge`) —
//  and a hover label that opens away from the edge it is anchored to.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useWishlistStore } from '@eventmind/store'
import { BRAND } from '@/lib/theme'
import { shareItem, type ShareFallback, type ShareKind } from '@/lib/share-event'
import { ShareModal } from './ShareModal'
import type { BadgeType } from './EventBadges'
import type { EventIcon } from './EventIcons'
import { CancelIcon, DuplicateIcon, EditIcon } from './organizer/ConsoleIcons'

/**
 * The fields these controls need. Both `CarouselEvent` and `CommunityItem`
 * satisfy it structurally, so a call site passes its card object unchanged.
 *
 * The two differ in exactly one place — events carry `badgeTypes` (an array),
 * communities `badgeType` (a single value) — so both are optional here and the
 * wishlist record takes whichever is present.
 */
export interface ActionItem {
  id: string
  title: string
  date: string
  time: string
  venue: string
  price: string
  imageUrl: string
  badge?: string
  badgeTypes?: BadgeType[]
  badgeType?: BadgeType
  isSoldOut?: boolean
  category: string
  memberCount?: string
}

const GREEN = BRAND.green
const LINEN = BRAND.surface
const MUTED = BRAND.hint

/** What a control's glyph turns when you hover it. Green is the default for
 *  every control here; `terracotta` is for a DESTRUCTIVE one, so "Cancel event"
 *  cannot be confused with the affirmative controls it sits beside. */
type Tone = 'green' | 'terracotta'
const TONE_FG: Record<Tone, string> = { green: GREEN, terracotta: BRAND.terracotta }

// ⚠️ `transition-[border-color,transform]`, NOT `transition-transform` + a
// second `transition-colors` — both set `transition-property`, and Tailwind v4
// does not resolve conflicting utilities by string order (same trap CLAUDE.md
// documents on breakpoints). One utility, both properties.
const BTN = 'rounded-full flex items-center justify-center transition-[border-color,transform] active:scale-90 disabled:cursor-not-allowed'
const PILL = 'text-[16px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap'

/**
 * The same pill for a label that is a SENTENCE, not a verb — the lifecycle
 * chip's status explanation, which runs to ~150 characters.
 *
 * ⚠️ It is a SEPARATE const, not `PILL` plus overrides: radius, whitespace and
 * padding would each be a conflicting utility in one class string, and Tailwind
 * v4 does not resolve those by string order (the trap CLAUDE.md documents on
 * breakpoints). One string, one value per property.
 *
 * ⚠️ `w-max` IS LOAD-BEARING — WITHOUT IT THE LABEL IS AS NARROW AS ITS
 * CONTROL. This shipped broken once (Gautham, 2026-09-01: "the width is same as
 * the button size"). An absolutely-positioned box with `left-0` and no `right`
 * is SHRINK-TO-FIT, and its available width is the containing block's — here the
 * chip's own wrapper, ~120px. A `max-width` can only cap that, never expand it,
 * so the sentence wrapped into a column the width of the chip. `width:
 * max-content` sizes the box to the unwrapped sentence first; `max-width` then
 * reels it back in. **The old `PILL` never hit this because `whitespace-nowrap`
 * forces min-content past the available width, so it simply overflowed.**
 *
 * ⚠️ The `max-w` here is only the FALLBACK, for a caller that passes no
 * `maxWidth`. The lifecycle chip measures the real distance to the browser's
 * right edge and passes it in — see `EventStatus.tsx`'s `useRoomToRightEdge`.
 */
const PILL_WIDE =
  'text-[16px] font-semibold leading-snug text-left px-3 py-2 rounded-lg whitespace-normal w-max max-w-[min(280px,calc(100vw-2rem))]'

/** Which side the hover label sits on, so it always grows away from the edge
 *  the button is anchored to. 'bottom' drops it underneath instead — use that
 *  where a side label would collide with a neighbouring control or the viewport
 *  edge (the /event/[id] hero: its controls sit in a 48px gutter, too narrow for
 *  a side pill). The label is absolutely positioned in every case, so hovering
 *  NEVER reflows the row — that used to shove the wishlist button sideways. */
export type LabelSide = 'left' | 'right' | 'bottom' | 'bottom-start'

/** Out-of-flow placement for the hover label, keyed by side. `bottom-start`
 *  drops it underneath but LEFT-ALIGNED — for a control near the left gutter,
 *  where a centred label long enough to be a sentence runs off the hero's
 *  `overflow-hidden` edge and gets clipped. */
const LABEL_POS: Record<LabelSide, string> = {
  left: 'right-full mr-1.5 top-1/2 -translate-y-1/2',
  right: 'left-full ml-1.5 top-1/2 -translate-y-1/2',
  bottom: 'top-full mt-1.5 left-1/2 -translate-x-1/2',
  'bottom-start': 'top-full mt-1.5 left-0',
}

/**
 * THE chassis for a LABELLED control in the /event/[id] hero row — the
 * organiser's status chip, the view toggle, the Publish button. The round
 * controls above are circles; these are rectangles, and without one definition
 * they drift on radius, weight and type the way this file's controls once did.
 *
 * ⚠️ They all stand **48px** tall, the height of a `size="lg"` circle, and the
 * arithmetic differs by structure — every one of them also carrying `HERO_EDGE`
 * below, which is 4px of the total: a bare control is `py-[11px]`
 * (22 + 22 + 4); the toggle's segments are `py-[7px]` inside a `p-1` track
 * (22 + 14 + 8 + 4). **Move one and re-derive the others** — a row of controls
 * at three heights is what this const exists to prevent. Ground colours are the
 * caller's, because a status chip, a picked segment and a CTA do not share one.
 *
 * ⚠️ IT CARRIES NO RADIUS, deliberately. Every caller states its own —
 * `rounded-lg` on an outer control, `rounded-md` on a segment nested inside
 * one. Putting `rounded-lg` in here and overriding it at the segment would be
 * two conflicting utilities in one class string, which Tailwind v4 does NOT
 * resolve by string order (CLAUDE.md's responsiveness section documents the
 * same trap on breakpoints).
 */
export const HERO_CONTROL =
  'text-[18px] font-bold leading-[22px] whitespace-nowrap transition-colors'

/**
 * THE edge every control in that row wears — the round ones, the status chip,
 * the view toggle's track, the Publish button.
 *
 * ⚠️ `--brand-hint`, NOT `--brand-control-border` (Gautham, 2026-08-31, asked
 * for it by its two values). It is `#111827` in light and the brand linen
 * `#F2EFEA` in dark, so the edge is brand-black on a light theme and
 * brand-white on a dark one; the control-border token is a mid tone in both and
 * reads as no edge at all against a photograph. **This is a deliberate,
 * approved exception to CLAUDE.md's outline-control rule, and it is scoped to
 * this row** — do not sweep it onto the outline controls elsewhere, and do not
 * "correct" it back to `--brand-control-border`.
 *
 * ⚠️ It costs 4px of height on anything not pinned to a fixed size, because a
 * border grows a content-box element. The round controls are `w-12 h-12` and
 * absorb it; every labelled control's padding is 4px shorter than the bare
 * arithmetic for the same reason. **Add this to something new and take the 4px
 * out of its padding**, or the row lands at two heights.
 */
export const HERO_EDGE = '2px solid var(--brand-hint)'

/**
 * That same edge UNDER THE POINTER (Gautham, 2026-09-01): the ring takes the
 * colour the control's own label or glyph takes, so it lights up as one thing
 * rather than as green type inside a black ring.
 *
 * Exported because **every** control in that row does this now — the round
 * buttons through `hoverEdge` below, and the two LABELLED ones (the status chip,
 * the view toggle) by reaching for this directly, since their hover state is
 * their own. One definition or the row drifts, which is the whole reason
 * `HERO_EDGE` is exported beside it.
 *
 * ⚠️ The toggle wears it on the TRACK, not on a segment — one control, one
 * outline (see `OrganiserViewToggle`).
 */
export const HERO_EDGE_HOVER = `2px solid ${TONE_FG.green}`

/**
 * The round controls' version: `HERO_EDGE_HOVER`, but tone-aware.
 *
 * ⚠️ It follows the `tone`, not a hard-coded green — the destructive control's
 * ring goes terracotta exactly as its glyph does. A green ring around a
 * terracotta cross would be two signals disagreeing, and terracotta-means-
 * destructive is the whole point of the tone (see `EventCancelButton`).
 *
 * ⚠️ Returns `edge` UNCHANGED when there is no edge or no hover — the `sm` card
 * controls have no border at all, and this must not give them one. The hover
 * ring is scoped to the same 'lg' hero row `HERO_EDGE` is.
 */
function hoverEdge(edge: string | undefined, active: boolean, tone: Tone = 'green') {
  if (!edge || !active) return edge
  return tone === 'green' ? HERO_EDGE_HOVER : `2px solid ${TONE_FG[tone]}`
}

/** 'sm' = the card overlay (default). 'lg' = standalone surfaces like the
 *  /event/[id] hero, where a 32px control is lost against a full-bleed photo. */
type Size = 'sm' | 'lg'

/** ⚠️ `edge` is on 'lg' ONLY, and that is the scope of the whole treatment: the
 *  standalone hero controls. 'sm' is the CARD overlay — home, /explore, the
 *  wishlist — and those surfaces are settled; outlining every heart and share
 *  button in the app is not what was asked for. */
const SIZES: Record<Size, { btn: string; icon: string; edge?: string }> = {
  // 'sm' grows to 40px under a COARSE pointer (a finger): 32px is under every
  // platform's touch minimum, and on touch these are always visible (see
  // `TOUCH_REVEAL`), so they are the card's primary controls there. The glyph
  // stays 16px; a mouse still gets the 32px circle exactly as before.
  sm: { btn: 'w-8 h-8 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10', icon: 'w-4 h-4' },
  lg: { btn: 'w-12 h-12', icon: 'w-6 h-6', edge: HERO_EDGE },
}

/**
 * THE hover label for a control on the /event/[id] hero — exported because the
 * organiser's view toggle sits in that same row and must carry the identical
 * pill, not a second one styled to match. Absolutely positioned in every case,
 * so showing it never reflows the row.
 *
 * ⚠️ THE TEXT IS `--brand-hint`, NOT GREEN (Gautham, 2026-09-01). It is the same
 * token, chosen for the same reason, as `HERO_EDGE` above: brand-black in light
 * and the brand linen in dark, which is the "brand white" that was asked for.
 * **Do not hard-code the linen** — the pill's own ground IS linen in light, so a
 * literal `#F2EFEA` label would be invisible on half the app. And do not put the
 * green back: the green now belongs to the hover ring and the glyph.
 */
export function ActionLabel({
  children,
  side,
  wide = false,
  maxWidth,
}: {
  children: string
  side: LabelSide
  /** A sentence rather than a verb — wraps inside a capped width instead of
   *  running off the hero's clipped edge. Added as a PROP rather than as a
   *  second pill styled to match, per CLAUDE.md's one-control-one-component
   *  rule; the lifecycle status chip is its only caller. */
  wide?: boolean
  /** How wide the label may grow, in px — normally the measured distance from
   *  the control's LEFT edge to the browser's right edge, which is the only way
   *  to know it (the label's containing block is the control, not the page).
   *  Undefined falls back to `PILL_WIDE`'s own cap. `wide` only. */
  maxWidth?: number
}) {
  return (
    <span
      /* Hidden where nothing hovers: a tap synthesises mouseenter but no
         mouseleave follows, so the label would stay pinned beside the control
         that was just tapped. The control's `aria-label` carries the name. */
      className={`${wide ? PILL_WIDE : PILL} [@media(hover:none)]:hidden absolute z-20 pointer-events-none ${LABEL_POS[side]}`}
      // An inline `maxWidth` outranks the class, which is the intent here — it
      // is a measurement, not a hover state, so none of the inline-colour trap
      // this repo keeps hitting applies.
      style={{ backgroundColor: LINEN, color: BRAND.hint, maxWidth }}
    >
      {children}
    </span>
  )
}

/** The long arrow, both ways round. The right-hand path is the exact mirror of
 *  the left, and is the same glyph the section headers' "View all" links draw. */
const ARROW_PATH: Record<'left' | 'right', string> = {
  left: 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
  right: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
}

/**
 * A round arrow control — the shape the /event/[id] back button established,
 * generalised so anything that needs "go that way" gets the identical chrome.
 * `EventBackButton` below is just this pointing left, and `CategoryGrid`'s rail
 * controls are this pointing right; keeping one body is what stops the two
 * drifting the way the app's icons and badges once did.
 *
 * `label` is the caller's because the wording is surface-specific ("Go back" vs
 * "More categories"), not a property of the arrow.
 */
export function EventArrowButton({
  direction,
  label,
  onClick,
  disabled = false,
  labelSide = 'right',
  size = 'sm',
}: {
  direction: 'left' | 'right'
  label: string
  onClick: () => void
  disabled?: boolean
  labelSide?: LabelSide
  size?: Size
}) {
  const [hovered, setHovered] = useState(false)
  const s = SIZES[size]
  const active = hovered && !disabled

  return (
    <div className="relative flex items-center">
      {active && <ActionLabel side={labelSide}>{label}</ActionLabel>}
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`${BTN} ${s.btn} disabled:opacity-35`}
        style={{ backgroundColor: LINEN, border: hoverEdge(s.edge, active) }}
      >
        <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : MUTED} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={ARROW_PATH[direction]} />
        </svg>
      </button>
    </div>
  )
}

/**
 * The generic round control: any glyph, any label, the same chrome as share and
 * wishlist. `EventArrowButton` above predates it and keeps its own inline path
 * because the arrow is drawn nowhere else; anything that HAS a glyph in
 * `EventIcons` / `ConsoleIcons` should come through here rather than inlining a
 * second copy of it.
 *
 * The icon is a component, not a `d` string, so the app keeps one drawing per
 * concept — the organiser's pencil here is literally the console's `EditIcon`.
 * Those glyphs stroke at 1.8 against this file's own 2; at 24px the difference
 * is invisible and one definition is worth more than the hairline.
 */
export function EventIconButton({
  icon: Icon,
  label,
  onClick,
  tone = 'green',
  disabled = false,
  labelSide = 'right',
  size = 'sm',
}: {
  icon: EventIcon
  label: string
  onClick: () => void
  tone?: Tone
  disabled?: boolean
  labelSide?: LabelSide
  size?: Size
}) {
  const [hovered, setHovered] = useState(false)
  const s = SIZES[size]
  const active = hovered && !disabled

  return (
    <div className="relative flex items-center">
      {active && <ActionLabel side={labelSide}>{label}</ActionLabel>}
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          // Cards wrap these in a <Link>; never let an action tap navigate.
          e.preventDefault()
          e.stopPropagation()
          onClick()
        }}
        disabled={disabled}
        aria-label={label}
        className={`${BTN} ${s.btn} disabled:opacity-35`}
        style={{ backgroundColor: LINEN, border: hoverEdge(s.edge, active, tone) }}
      >
        <Icon className={s.icon} color={active ? TONE_FG[tone] : MUTED} />
      </button>
    </div>
  )
}

/**
 * ── The three ORGANISER controls on /event/[id] ────────────────────────────
 *
 * Edit, Duplicate and Cancel take the places of wishlist and share in the
 * organiser view of the hero (see `OrganiserViewToggle`, which shares that row
 * and is what switches between the two views), which is why they live
 * here rather than in a file of their own: same chrome, same row, same set. None
 * is shown to anyone but the event's own organiser, and `useIsEventOwner` is
 * what decides that.
 *
 * ⚠️ THREE IS THE CEILING for that row (Gautham, 2026-08-24 — it was two until
 * Duplicate arrived). They sit in the hero's 48px gutter with `labelSide="bottom"`
 * because a side label collides with the neighbour; a fourth control starts
 * crowding the gutter at 375px. **A fourth organiser action belongs in the
 * sidebar card (`OrganiserEventCard`), not here.**
 */
export function EventEditButton({
  onClick,
  disabled = false,
  labelSide = 'left',
  size = 'sm',
}: {
  onClick: () => void
  disabled?: boolean
  labelSide?: LabelSide
  size?: Size
}) {
  return (
    <EventIconButton
      icon={EditIcon}
      label="Edit details"
      onClick={onClick}
      disabled={disabled}
      labelSide={labelSide}
      size={size}
    />
  )
}

/**
 * "Duplicate event" — green, not terracotta: it creates something, it changes
 * nothing about the event you are looking at. Only `EventCancelButton` is
 * destructive on this row and it must stay the only terracotta one, or the tone
 * stops meaning anything.
 */
export function EventDuplicateButton({
  onClick,
  disabled = false,
  labelSide = 'bottom',
  size = 'sm',
}: {
  onClick: () => void
  disabled?: boolean
  labelSide?: LabelSide
  size?: Size
}) {
  return (
    <EventIconButton
      icon={DuplicateIcon}
      label="Duplicate event"
      onClick={onClick}
      disabled={disabled}
      labelSide={labelSide}
      size={size}
    />
  )
}

export function EventCancelButton({
  onClick,
  disabled = false,
  labelSide = 'right',
  size = 'sm',
}: {
  onClick: () => void
  disabled?: boolean
  labelSide?: LabelSide
  size?: Size
}) {
  return (
    <EventIconButton
      icon={CancelIcon}
      label="Cancel event"
      onClick={onClick}
      tone="terracotta"
      disabled={disabled}
      labelSide={labelSide}
      size={size}
    />
  )
}

/**
 * Back control for the /event/[id] hero. Same chrome as share + wishlist so the
 * three read as one set. It returns to the previous page, not to `/`, so the
 * label deliberately says "Go back" rather than naming a destination.
 */
export function EventBackButton({
  onClick,
  labelSide = 'right',
  size = 'sm',
}: {
  onClick: () => void
  labelSide?: LabelSide
  size?: Size
}) {
  return (
    <EventArrowButton
      direction="left"
      label="Go back"
      onClick={onClick}
      labelSide={labelSide}
      size={size}
    />
  )
}

export function EventShareButton({
  item,
  kind = 'event',
  labelSide = 'right',
  size = 'sm',
}: {
  item: ActionItem
  kind?: ShareKind
  labelSide?: LabelSide
  size?: Size
}) {
  const [hovered, setHovered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fallback, setFallback] = useState<ShareFallback | null>(null)
  const s = SIZES[size]

  async function onClick(e: React.MouseEvent) {
    // Cards wrap this in a <Link>; never let a share tap navigate to the item.
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      const { shared, fallback: fb } = await shareItem(kind, { id: item.id, title: item.title })
      if (!shared) setFallback(fb)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="relative flex items-center">
        {hovered && <ActionLabel side={labelSide}>Share</ActionLabel>}
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onClick}
          disabled={busy}
          aria-label={`Share ${kind}`}
          className={`${BTN} ${s.btn}`}
          style={{ backgroundColor: LINEN, border: hoverEdge(s.edge, hovered) }}
        >
          <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke={hovered ? GREEN : MUTED} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
        </button>
      </div>
      <ShareModal fallback={fallback} onClose={() => setFallback(null)} />
    </>
  )
}

export function EventWishlistButton({
  item,
  kind = 'event',
  labelSide = 'left',
  size = 'sm',
}: {
  item: ActionItem
  kind?: ShareKind
  labelSide?: LabelSide
  size?: Size
}) {
  const toggle = useWishlistStore((st) => st.toggleItem)
  const liked = useWishlistStore((st) => st.items.some((i) => i.id === item.id))
  const [hovered, setHovered] = useState(false)
  const label = liked ? 'Added!' : 'Add to wishlist'
  const s = SIZES[size]

  return (
    <div className="relative flex items-center">
      {(hovered || liked) && <ActionLabel side={labelSide}>{label}</ActionLabel>}
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggle({
            kind,
            id: item.id,
            title: item.title,
            date: item.date,
            time: item.time,
            venue: item.venue,
            price: item.price,
            imageUrl: item.imageUrl,
            badge: item.badge,
            // Events carry an array, communities a single value — save BOTH, so
            // the wishlist row can render every tag the card showed and still
            // read a community's lone tag. `badgeType` also keeps rows written
            // before the array existed working; see the note on WishlistItem.
            badgeType: item.badgeTypes?.[0] ?? item.badgeType,
            badgeTypes: item.badgeTypes,
            isSoldOut: item.isSoldOut,
            category: item.category,
            memberCount: item.memberCount,
          })
        }}
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={liked}
        className={`${BTN} ${s.btn}`}
        // The ring follows the POINTER only, not `liked` — a saved item keeps
        // its filled green heart, but a permanent green ring would read as a
        // selected control and change the row at rest.
        style={{ backgroundColor: LINEN, border: hoverEdge(s.edge, hovered) }}
      >
        {/* Hovering brings the outline to full strength (same as the share icon);
            an actual save additionally fills it. */}
        <svg className={s.icon} viewBox="0 0 24 24" fill={liked ? GREEN : 'none'} stroke={liked || hovered ? GREEN : MUTED} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>
    </div>
  )
}
