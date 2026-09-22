'use client'

// ─────────────────────────────────────────────────────────────────────────────
//  "Browse by category" — the two-row rail that sits directly above the footer
//  on home.
//
//  A category tile borrows the EVENT CARD's chassis — same rounded-lg, same
//  borderless-at-rest → 2px-border + 6px-lift hover, same aspect-video photo —
//  but it has NO BODY. The tile IS the photo, with the category's name riding on
//  a scrim at its bottom edge (Gautham's call: "no white space below the
//  photo"). The Explore button that used to sit in that body is GONE — the whole
//  tile was already a link to the same destination, so the button was a second
//  affordance for one action. Do not put a body or a CTA back.
//  Its columns are still sized to the home grid's cells, so a tile is exactly as
//  wide as an event card above it. If the event card's hover or radius changes,
//  change it here too.
//
//  The tile carries NO colour at rest — the photo is unwashed, exactly as on an
//  event card (Gautham's call; an earlier version washed the photo in the
//  category's accent at 62% and it read as a coloured block, not a photo).
//
//  The label is the SHARED `CategoryBadge` at `size="lg"` — the same linen chip
//  an event card overlays on its photo, scaled up. Because the chip brings its
//  own linen background there is no scrim: a version that put bare text on a
//  black gradient was built and replaced, and the photo is now wholly untouched.
//  Glyph and label take the RAW accent, which is correct on linen — that is the
//  surface those colours were contrast-checked against.
//
//  Opposite the chip sits a linen chip holding a green arrow, marking "explore
//  this category". ⚠️ It is DECORATION — `aria-hidden`, not focusable, no
//  handler — for the same reason the old Explore button was removed: the tile is
//  already a link to that destination, and a nested control would be a second
//  tab stop doing one job. Green-on-linen, never linen-on-green: a solid green
//  square read as a dark blob over most of the category photos.
//
//  ⚠️ The HOVER BORDER is the one place the raw accent will not do, because it
//  draws against the PAGE rather than against linen. It runs through
//  `liftAccent()` in dark mode; see the note on that function.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BRAND } from '@/lib/theme'
import { useTheme } from '@/providers/theme-provider'
import { GUTTERS } from '@/lib/layout'
import { CategoryBadge, categoryStyle } from './EventBadges'
import { EventArrowButton } from './EventActions'

// const GREEN = BRAND.green // the section header's "View all" link — PARKED with it
const SURFACE = BRAND.surface // the tile's own background, behind the photo
const TEXT = BRAND.text

// ─── The category accent, lifted for dark ────────────────────────────────────
//
// The accents in `categoryStyle()` are tuned as text ON LINEN, so every one of
// them is DARK — Business is #334155, Networking #065F46. Inside the chip that
// is exactly right. The HOVER BORDER is the exception: it draws between the
// photo inside it and the PAGE outside it, and in dark mode that page is
// #0F1A18 — so a raw accent had dark on both sides and read as no border at all,
// which is precisely the bug that was reported.
//
// So for dark mode each accent is lifted to a fixed lightness + a saturation
// floor. **Only the L and S move — the HUE is untouched**, so this is still the
// category's own colour rather than a new one, and it is derived from
// `categoryStyle()` rather than hand-picked (never hardcode a category colour
// here). Measured against the dark page it runs 4.0–12.6:1.
//
// If another dark surface ever needs this, move it next to the accents in
// EventBadges.tsx rather than copying it here.
const LIFT_L = 62
const LIFT_MIN_S = 60

function liftAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = h * 60
    if (h < 0) h += 360
  }

  // A near-grey accent has no hue worth boosting — forcing saturation onto it
  // would invent a colour (h=0 would come out red). Leave those desaturated.
  const pct = s * 100
  const lifted = pct < 8 ? pct : Math.max(pct, LIFT_MIN_S)
  return `hsl(${Math.round(h)} ${Math.round(lifted)}% ${LIFT_L}%)`
}

// The photo behind each tile. Unsplash is already whitelisted in next.config.ts;
// every id below was opened and eyeballed before it was committed — several
// plausible-looking ones turned out to be the wrong subject (an "arts" id that
// was a rock concert, a "networking" id that was an empty conference hall), so
// **look at the picture before you swap one out**, do not trust the id.
const PHOTO_PARAMS = 'auto=format&fit=crop&w=800&q=70'
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?${PHOTO_PARAMS}`

/**
 * The 11 categories /explore filters on, in its own order. Keep this list and
 * `CATEGORIES` in app/explore/page.tsx in step — a tile whose name is not in
 * that list lands on a filter the Explore page cannot show as selected.
 */
const CATEGORIES: { name: string; image: string; alt: string }[] = [
  { name: 'Technology', image: photo('1540575467063-178a50c2df87'), alt: 'Audience seated at a technology conference' },
  { name: 'Business', image: photo('1552664730-d307ca884978'), alt: 'Team running a workshop around a wall of sticky notes' },
  { name: 'Creative', image: photo('1558618666-fcd25c85cd64'), alt: 'Maker working at a craft bench' },
  { name: 'Summit', image: photo('1475721027785-f74eccf877e2'), alt: 'Microphone on stage in front of a crowd' },
  { name: 'Networking', image: photo('1543269865-cbf427effbad'), alt: 'Four people talking together over coffee' },
  { name: 'Gaming', image: photo('1542751371-adc38448a05e'), alt: 'Players at an esports gaming setup' },
  { name: 'Health & Wellness', image: photo('1544367567-0f2fcb009e0b'), alt: 'Person practising yoga at sunset' },
  { name: 'Education', image: photo('1523240795612-9a054b0db644'), alt: 'Group studying together around a laptop' },
  { name: 'Arts & Culture', image: photo('1503095396549-807759245b35'), alt: 'Performers on stage against a red theatre curtain' },
  { name: 'Sports', image: photo('1461896836934-ffe607ba8211'), alt: 'Sprinter on the starting blocks of a running track' },
  { name: 'Food & Drink', image: photo('1414235077428-338989a2e8c0'), alt: 'Diners sharing plates at a restaurant table' },
]

// const EXPLORE_ALL = '/explore?view=events' // PARKED with the header's "View all"
const categoryHref = (name: string) =>
  `/explore?view=events&category=${encodeURIComponent(name)}`

const GAP = 20 // matches the gap-5 the event grids use

// A column is sized to the EXACT width a home-page grid cell renders at, so a
// tile here and an event card above it are the same width and four columns fill
// the rail with nothing to scroll. Same percentage maths as SimilarEvents' rail
// — see the long note there for why these are percentages and never `100vw`.
const COLUMNS =
  'auto-cols-[100%] ' +
  'sm:auto-cols-[calc((100%-20px)/2)] ' +
  'xl:auto-cols-[calc((100%-60px)/4)]'

// Identical to the event cards', so a tile in this rail asks the browser for the
// same image widths its neighbours above do.
// Keyed to the grid's real breakpoints: 1-up below sm (px-4 gutters), 2-up to
// xl, 4-up from xl. The old string under-asked below 640px (blurry) and
// over-asked ~2x between 640 and 768.
const IMAGE_SIZES =
  '(max-width: 639px) calc(100vw - 32px), (max-width: 1279px) calc(50vw - 34px), calc(25vw - 39px)'

// Where a scroll arrow sits: hard against the page edge (Gautham's call — "as
// close to the edges of the browser as possible", so they stop covering tiles).
//
// ⚠️ `left-0` here means the BROWSER edge, not the rail edge. An absolutely
// positioned child resolves against its ancestor's PADDING box, and the rail's
// ancestor carries GUTTERS — so 0 lands in the margin outside the tiles, which
// is exactly what is wanted. An earlier version added the gutter back by hand
// (GUTTERS + 8px: 24 / 32 / 56) and that is what pushed the buttons ~40px ON TOP
// of the outermost tile.
//
// The fit is exact at `lg` and up: the gutter is 48px (px-12) and the `lg`
// button is 48px, so the arrow fills the gutter precisely — its outer edge on
// the browser edge, its inner edge on the tile's edge, zero overlap. Below `lg`
// the gutter is only 16/24px, so a 48px button cannot clear the tiles however
// far out it goes; it is simply as far out as it can be. **If the button size or
// GUTTERS changes, that exact fit is what to re-check.**
//
// `top` backs out the asymmetric clip room (24 above, 40 below) so the button
// centres on the tiles rather than on the padded box — it lands on the seam
// between the two rows.
const ARROW_POS = 'absolute top-[calc(50%-8px)] -translate-y-1/2 z-10 transition-opacity duration-200'
const ARROW_LEFT = 'left-0'
const ARROW_RIGHT = 'right-0'

// The right-pointing arrow — PARKED, like the `GREEN` / `EXPLORE_ALL` consts
// above, now that neither of its two call sites renders: the tile's chip arrow
// was removed (2026-08-21, see the tile) and the section's "View all" link is
// commented out. Uncomment WITH that link. It is the same glyph
// `EventArrowButton` draws and the same one every "View all" link in the app
// uses; if an `ArrowIcon` is ever added to EventIcons.tsx, both should take it.
// const ARROW_PATH = 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3'

// ─── Tile ──────────────────────────────────────────────────────────────────────

function CategoryTile({ name, image, alt }: { name: string; image: string; alt: string }) {
  const [hovered, setHovered] = useState(false)
  const { theme } = useTheme()
  // Only the accent is needed here — the glyph is the chip's own business now.
  const { accent } = categoryStyle(name)
  const lifted = liftAccent(accent)

  // The border is the ONE accent use whose backdrop is themed — it draws against
  // the page, not against linen. So it flips: the raw (dark) accent reads on
  // linen, the lifted one reads on the dark page. Measured against each page
  // background: raw-on-linen clears 4.5:1 (they are the AA-checked text colours),
  // lifted-on-dark runs 4.0–12.6:1. Using ONE of them for both themes is what
  // made the border invisible — lifted-on-linen bottoms out at 1.23:1
  // (Networking), and raw-on-dark was the bug reported here.
  const borderColor = theme === 'dark' ? lifted : accent

  return (
    // The tile IS the photo — there is no body below it (Gautham's call: "no
    // white space below the photo"), so `aspect-video` sits on the link itself
    // and the label rides on the picture. All tiles share the aspect, so both
    // grid rows still compute to the same height without an `h-full`.
    <Link
      href={categoryHref(name)}
      aria-label={`Explore ${name} events`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative block aspect-video rounded-lg overflow-hidden"
      style={{
        backgroundColor: SURFACE,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        // Where an event card goes green, a category tile goes to its OWN accent
        // (theme-picked — see borderColor above). The transparent 2px at rest
        // holds the space so the tile never resizes.
        border: hovered ? `2px solid ${borderColor}` : '2px solid transparent',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Photo, at its own colours — no accent wash. Same treatment as an event
          card's image; the category's colour lives in the glyph and the border. */}
      <Image src={image} alt={alt} fill className="object-cover" sizes={IMAGE_SIZES} />

      {/* Label — the SHARED `CategoryBadge` at `size="lg"`, i.e. the exact chip
          an event card overlays on its photo, scaled up (Gautham's call). It
          brings its own linen fill, so there is no scrim: an earlier version put
          bare text on a black gradient to keep it legible, and the chip's own
          background makes that unnecessary. The photo is now completely
          untouched, which is the point.

          The glyph and the label colour are the category's own accent, straight
          from `categoryStyle()` — on linen the RAW accent is correct (that is
          the surface those colours were contrast-checked against), so no lift
          here. `liftAccent` is only for the border, which draws on the page.

          `min-w-0` lets the chip give way rather than overflow the tile: the
          longest name ("Health & Wellness") ellipsises instead. */}
      {/* `justify-end` puts the chip at the tile's BOTTOM-RIGHT (Gautham's
          call); it used to sit bottom-left.

          ⚠️ The chip carried a right-pointing ARROW after the name, in via
          `CategoryBadge`'s `trailing` prop. **Removed on Gautham's call
          (2026-08-21) — do not put it back without asking.** It was decoration
          for something the tile already said: the whole tile is a link to that
          category, so the arrow was a third signal after the photo and the
          name. The chip is now name-only, and the tile's sole moving part on
          hover is the lift. (The `trailing` prop stays on the shared chip; it
          is generic, and nothing else in the file depended on the arrow.)

          Two earlier rounds died the same way and are also closed: an Explore
          BUTTON at the tile's right edge (a nested control = a second tab stop
          for one action) and a tooltip on the arrow (redundant with the name).
          The lesson is the standing one here — the tile explains itself with a
          photo and a name; anything further is noise. */}
      <div className="absolute inset-x-0 bottom-0 flex justify-end px-4 pb-4">
        <CategoryBadge category={name} size="lg" className="min-w-0" />
      </div>
    </Link>
  )
}

// ─── Section ───────────────────────────────────────────────────────────────────

export function CategoryGrid() {
  const rail = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const sync = useCallback(() => {
    const el = rail.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    // 1px of slack: sub-pixel widths leave scrollLeft just short of the end.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = rail.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync])

  // Scroll by exactly one column + gap. Column width is responsive, so measure
  // the first tile live rather than hard-coding it.
  const scrollBy = (dir: -1 | 1) => {
    const el = rail.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.getBoundingClientRect().width + GAP : el.clientWidth * 0.9
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  // Both ends true means the rail does not overflow — nothing to scroll, so no
  // arrow appears however long you hover.
  const overflows = !(atStart && atEnd)

  return (
    <section
      aria-label="Browse by category"
      className="py-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Keyboard users never fire mouseenter; without this the arrows would be
      // focusable but invisible.
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* ⚠️ The header's "View all" link is PARKED, not deleted (Gautham,
          2026-08-20: "unnecessary"). Every tile already goes to /explore with
          its category, and the rail's own arrows move through them, so the link
          was a third route to the same place. Restore = uncomment this block
          AND the `GREEN` / `EXPLORE_ALL` / `ARROW_PATH` consts above, all three
          parked with it so they do not sit unused. (`ARROW_PATH` joined them on
          2026-08-21, when the tiles' chip arrow was removed and this became its
          last reference.) The row keeps `justify-between` so the link drops
          straight back into place. */}
      <div className={`flex items-center justify-between ${GUTTERS} mb-5`}>
        <h2
          className="font-extrabold tracking-[-0.5px]"
          style={{ fontSize: 'clamp(22px, 4vw, 30px)', color: TEXT }}
        >
          Browse by category
        </h2>
        {/*
        <Link
          href={EXPLORE_ALL}
          aria-label="View all events"
          className="flex items-center gap-1.5 text-lg font-semibold transition-opacity hover:opacity-70"
          style={{ color: GREEN }}
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ARROW_PATH} />
          </svg>
        </Link>
        */}
      </div>

      <div className={`relative ${GUTTERS}`}>
        {/* TWO ROWS, flowing sideways: `grid-flow-col` fills row 1 then row 2 of
            each column before moving right, so a column is a stacked pair and
            the 4 that fit are the first 8 categories.

            The vertical padding is NOT spacing — it is clip room, and it is why
            the negative margins cancel it exactly. `overflow-x: auto` forces the
            block axis to compute to `auto` too (CSS overflow spec: one
            non-visible axis makes the other non-visible), so this scroll
            container clips vertically as well. The tile lifts 6px on hover and
            draws a 2px border, and its shadow bleeds ~16px up / ~40px down — all
            of which would be cut off at the rail's edges, most visibly as a
            missing top border on hover. Same fix, same numbers, as the
            "Similar events" rail; re-check them if the hover lift changes. */}
        <div
          ref={rail}
          className={`grid grid-rows-2 grid-flow-col ${COLUMNS} overflow-x-auto scrollbar-hide snap-x -mt-6 -mb-10`}
          style={{ gap: GAP, paddingTop: 24, paddingBottom: 40 }}
        >
          {CATEGORIES.map((c) => (
            <div key={c.name} className="snap-start">
              <CategoryTile {...c} />
            </div>
          ))}
        </div>

        {/* Scroll arrows — the /event/[id] back button's chrome, pointing the way
            they scroll. They sit over the rail's edges (not in the header, where
            SimilarEvents keeps its own) because a category tile carries no hover
            controls of its own for them to cover, and because the arrow appearing
            as you move onto the section is the cue that there is more to the
            right. `top` backs out the asymmetric clip room above, so the button
            centres on the tiles rather than on the padded box. */}
        {overflows && (
          <>
            <div className={`${ARROW_POS} ${ARROW_LEFT} ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <EventArrowButton
                direction="left"
                label="Previous categories"
                size="lg"
                labelSide="right"
                disabled={atStart}
                onClick={() => scrollBy(-1)}
              />
            </div>
            <div className={`${ARROW_POS} ${ARROW_RIGHT} ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <EventArrowButton
                direction="right"
                label="More categories"
                size="lg"
                labelSide="left"
                disabled={atEnd}
                onClick={() => scrollBy(1)}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
