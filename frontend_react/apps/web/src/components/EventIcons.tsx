// ─────────────────────────────────────────────────────────────────────────────
//  Every glyph in the app — ONE definition each, used everywhere.
//
//  A calendar means the same glyph on a card, on /event/[id], and in the
//  dashboard. Before this file the app drew each concept three different ways
//  (filled on the cards, thin outline heroicons on the detail page, 12px
//  outlines on EventCard) — see HANDOVER.md "Known design inconsistencies" #1.
//
//  Two sections:
//    1. Date / time / location / verification — the card + booking-card glyphs.
//    2. Tag glyphs — the icon inside a category chip or a status pill. Mapped
//       to a category/status in EventBadges.tsx; this file only draws them.
//
//  THE SET IS FILLED, not outline: chunky calendar with a dot grid, solid
//  teardrop pin, ring clock. Gautham picked it off the event cards.
//
//  Colour is NOT unified — each surface keeps its own (cards near-black, the
//  /event/[id] booking card green), so `color` defaults to `currentColor` and
//  the icon simply inherits whatever the row already uses. Pass `color`
//  explicitly only where the surrounding text colour is not the icon colour.
//
//  Sizing is the caller's job via `className`; the default matches the compact
//  card rows these mostly appear in.
//
//  THE FORMS ARE IN THE SET TOO, as of 2026-09-11: `FormControls.DateTimeInput`
//  hides Chrome's own picker indicator and draws the calendar or the clock below
//  instead, so `/organizer/create` and the organiser's edit dialog say "date"
//  with the same glyph the cards do. **Never hand-draw a form's date icon.**
//
//  Not in this set (deliberately): the big decorative empty-state calendars,
//  the /checkout "Expiry Date" field icon (that belongs to the payment form's
//  own outline family, and is a CARD's expiry rather than an event's date), and
//  the organiser console's stat glyphs — including `ConsoleIcons.PendingIcon`,
//  which is drawn as a clock but means "waiting on you", not a time.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactElement } from 'react'

export type IconProps = {
  /** Defaults to `currentColor` so the icon inherits the row's text colour. */
  color?: string
  className?: string
}

/** Every glyph below has this signature, so a tag can hold one in a config. */
export type EventIcon = (props: IconProps) => ReactElement

const DEFAULT_CLASS = 'w-4 h-4 shrink-0'

export function CalendarIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" fill={color} aria-hidden="true">
      <path d="M960 95.888l-256.224.001V32.113c0-17.68-14.32-32-32-32s-32 14.32-32 32v63.76h-256v-63.76c0-17.68-14.32-32-32-32s-32 14.32-32 32v63.76H64c-35.344 0-64 28.656-64 64v800c0 35.343 28.656 64 64 64h896c35.344 0 64-28.657 64-64v-800c0-35.329-28.656-63.985-64-63.985zm0 863.985H64v-800h255.776v32.24c0 17.679 14.32 32 32 32s32-14.321 32-32v-32.224h256v32.24c0 17.68 14.32 32 32 32s32-14.32 32-32v-32.24H960v799.984zM736 511.888h64c17.664 0 32-14.336 32-32v-64c0-17.664-14.336-32-32-32h-64c-17.664 0-32 14.336-32 32v64c0 17.664 14.336 32 32 32zm0 255.984h64c17.664 0 32-14.32 32-32v-64c0-17.664-14.336-32-32-32h-64c-17.664 0-32 14.336-32 32v64c0 17.696 14.336 32 32 32zm-192-128h-64c-17.664 0-32 14.336-32 32v64c0 17.68 14.336 32 32 32h64c17.664 0 32-14.32 32-32v-64c0-17.648-14.336-32-32-32zm0-255.984h-64c-17.664 0-32 14.336-32 32v64c0 17.664 14.336 32 32 32h64c17.664 0 32-14.336 32-32v-64c0-17.68-14.336-32-32-32zm-256 0h-64c-17.664 0-32 14.336-32 32v64c0 17.664 14.336 32 32 32h64c17.664 0 32-14.336 32-32v-64c0-17.68-14.336-32-32-32zm0 255.984h-64c-17.664 0-32 14.336-32 32v64c0 17.68 14.336 32 32 32h64c17.664 0 32-14.32 32-32v-64c0-17.648-14.336-32-32-32z" />
    </svg>
  )
}

/**
 * Drawn to match the calendar rather than borrowed from a set: the ring and the
 * hands are 1.5/24 thick, the same 6.25% of the viewBox as the calendar's frame,
 * so the two sit together at 16px without one looking heavier.
 */
export function ClockIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM11.25 7h1.5v4.25h4v1.5h-5.5z"
      />
    </svg>
  )
}

/**
 * The hole is punched with `evenodd`, not painted with the surface colour, so
 * the pin works on any background — including the city picker's button, which
 * turns green while its dropdown is open.
 */
export function LocationPinIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 4.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z"
      />
    </svg>
  )
}

/**
 * Verified organiser. Not a tag glyph — it sits inline in the /event/[id]
 * booking card's trust line, not inside a chip.
 *
 * The tick is punched with `evenodd` for the usual reason (it renders on the
 * card's green header, so a tick painted in a surface colour would be wrong),
 * and it is drawn 1.7/24 thick — the same chunky weight as the calendar frame —
 * because at 15px a hairline tick inside a shield is the first thing to mush.
 */
export function ShieldCheckIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2L4 5.2V11.6C4 16.4 7.4 20.8 12 22C16.6 20.8 20 16.4 20 11.6V5.2ZM15.6 7.8L10.4 13L8.2 10.8L7 12L10.4 15.4L16.8 9Z"
      />
    </svg>
  )
}

// ── Tag glyphs ───────────────────────────────────────────────────────────────
//  The icon inside a category chip (Music / Technology / …) or a status pill
//  (Free / Selling Fast / …). EventBadges.tsx decides which tag gets which —
//  these are named for what they DRAW, not for the tag they currently serve, so
//  a re-map never leaves a component called `MusicIcon` drawing a trophy.
//
//  Same filled family as the three above, and deliberately chunky: they render
//  at 14px inside a pill, where thin strokes and fine detail turn to mush.
//
//  Holes are punched with `evenodd` rather than painted in the chip's fill, so
//  a glyph survives on any background (same reason as LocationPinIcon).
//
//  No heart here on purpose: EventActions.tsx already owns the heart, where it
//  means "wishlisted". A second heart meaning "health & wellness" would read as
//  a saved event on a card — Health & Wellness takes the lotus pose instead.

/**
 * Health & Wellness. A figure seated in lotus pose — Gautham's call over the
 * leaf, which read as "eco/plants" rather than wellbeing.
 *
 * Drawn as three separate solids (head, torso-with-arms, crossed legs) rather
 * than the usual one-piece meditation glyph: at 14px inside a chip the gaps
 * between them are what make it read as a person, and a merged silhouette
 * turns into a blob. A first pass had the legs starting at y=15.4 and it
 * swallowed the hands — keep the ~2-unit gap between the arms' underside and
 * the legs if you retouch this.
 */
export function LotusPoseIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2a2.6 2.6 0 1 0 0 5.2A2.6 2.6 0 0 0 12 2z" />
      <path d="M12 8.2c-1.6 0-2.9 1.2-2.9 2.7v.9l-3.5 1.6a1.3 1.3 0 0 0 1.1 2.35l3.3-1.5h4l3.3 1.5a1.3 1.3 0 0 0 1.1-2.35l-3.5-1.6v-.9c0-1.5-1.3-2.7-2.9-2.7z" />
      <path d="M12 16.6c-2.4 0-4.6.6-6.4 1.6-.9.5-1.7 1.1-2.2 1.6-.5.5-.1 1.4.7 1.4h15.8c.8 0 1.2-.9.7-1.4-.5-.5-1.3-1.1-2.2-1.6-1.8-1-4-1.6-6.4-1.6z" />
    </svg>
  )
}

/** A leaf — kept for reuse; Health & Wellness now uses LotusPoseIcon. */
export function LeafIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.38 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" />
    </svg>
  )
}

/** Music. A beamed pair rather than a single note — it reads as "music" at
 *  14px, where one note's flag is too fine to survive. */
export function MusicNoteIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M9 17.5V6.6l10-2.2v11.1h-2V6.8l-6 1.3v9.4z" />
      <path d="M8.5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
      <path d="M16.5 13a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
    </svg>
  )
}

/** Technology. A microchip — kept for reuse; Technology now uses LaptopIcon. */
export function ChipIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 4v6h6V9H9z" />
      <path d="M9 1h1.5v3H9zM13.5 1H15v3h-1.5zM9 20h1.5v3H9zM13.5 20H15v3h-1.5zM1 9h3v1.5H1zM1 13.5h3V15H1zM20 9h3v1.5h-3zM20 13.5h3V15h-3z" />
    </svg>
  )
}

/** Technology. A laptop — the screen's hole is punched with `evenodd` so the
 *  glyph survives on any chip background (same reason as LocationPinIcon). */
export function LaptopIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M5 4h14a1 1 0 0 1 1 1v10H4V5a1 1 0 0 1 1-1zm1 2v7h12V6H6z" />
      <path d="M2 16h20l-1.1 2.6a1 1 0 0 1-.92.6H4.02a1 1 0 0 1-.92-.6L2 16z" />
    </svg>
  )
}

/** Business. */
export function BriefcaseIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2zm0 4h4V4h-4v2z" />
    </svg>
  )
}

/**
 * A pencil resting on a ruled line — the app's **"edit this text" affordance**.
 *
 * ⚠️ THIS IS NOT `PencilIcon` BELOW, and the two must not be merged. That one is
 * the **Creative category** tag glyph: it labels a kind of event, it appears
 * inside a `CategoryBadge`, and it is never a control. This one is only ever a
 * button — the home page's "edit location" trigger beside the city name, and
 * `/event/[id]`'s "edit the event details" trigger beside the About heading.
 * Same object, same drawing, one definition; a category chip and a control that
 * happened to share a picture would be the coincidence, not the rule.
 *
 * ⚠️ IT IS ALSO NOT `ConsoleIcons.EditIcon`, which is the OUTLINE pencil worn by
 * labelled "Edit" buttons — the hero's round control and the console's rows.
 * The split is the one that file's header already draws: filled for content
 * surfaces, outline for chrome. **Two edit pencils is one more than ideal** —
 * if they are ever unified, unify them deliberately rather than by picking
 * whichever import was nearest.
 *
 * Its own viewBox (`0 -0.5 21 21`) is the source artwork's and is kept as-is so
 * the drawing is unchanged from the one already shipped on the home page.
 */
export function PencilLineIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 -0.5 21 21" fill={color} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M0,20 L20.616532,20 L20.616532,18.042095 L0,18.042095 L0,20 Z M7.215786,13.147332 L7.215786,10.51395 L13.094591,5.344102 L15.146966,7.493882 L9.903151,13.147332 L7.215786,13.147332 Z M16.244797,2.64513 L18.059052,4.363191 L16.645788,5.787567 L14.756283,3.993147 L16.244797,2.64513 Z M21,4.64513 L16.132437,0 L5.154133,9.687714 L5.154133,15.105237 L10.78657,15.105237 L21,4.64513 Z"
      />
    </svg>
  )
}

/** Creative. */
export function PencilIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
      <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}

/** Summit. */
export function MountainsIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z" />
    </svg>
  )
}

/** Networking. */
export function PeopleIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 12.75c1.63 0 3.07.39 4.24.9A3 3 0 0 1 18 16.38V18H6v-1.61a3 3 0 0 1 1.76-2.73c1.17-.52 2.61-.91 4.24-.91z" />
      <path d="M4 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM5.13 14.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2 2 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29z" />
      <path d="M20 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM24 16.43V18h-4.5v-1.61c0-.83-.23-1.61-.63-2.29.37-.06.74-.1 1.13-.1.99 0 1.93.21 2.78.58A2 2 0 0 1 24 16.43z" />
    </svg>
  )
}

/** Gaming. */
export function GamepadIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M21.58 16.09l-1.09-7.66A4 4 0 0 0 16.53 5H7.47a4 4 0 0 0-3.96 3.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM8 8h1v2h2v1H9v2H8v-2H6v-1h2V8zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
    </svg>
  )
}

/** Education. */
export function GraduationCapIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
      <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
    </svg>
  )
}

/** Arts & Culture. */
export function PaletteIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67 0 1.38-1.12 2.5-2.5 2.5zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5 0-.16-.08-.28-.14-.35-.41-.46-.63-1.05-.63-1.65 0-1.38 1.12-2.5 2.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z" />
      <path d="M6.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  )
}

/** Sports. */
export function TrophyIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96A5 5 0 0 0 21 8V7a2 2 0 0 0-2-2zM5 8V7h2v3.82A3 3 0 0 1 5 8zm14 0a3 3 0 0 1-2 2.82V7h2v1z" />
    </svg>
  )
}

/** Food & Drink. */
export function CutleryIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7z" />
      <path d="M16 6v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
  )
}

/** Online. */
export function GlobeIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3a1 1 0 0 0-1-1H8v-2h2a1 1 0 0 0 1-1V7h2a2 2 0 0 0 2-2v-.41a8 8 0 0 1 5 7.41 7.96 7.96 0 0 1-2.1 5.39z" />
    </svg>
  )
}

/** Other / General, and the fallback for any category we have no glyph for.
 *  ONE sparkle, not the usual cluster of three: the small two are sub-pixel at
 *  14px and just dirty the chip. This is the glyph most likely to appear (every
 *  free-form category falls back to it), so it has to survive the small size. */
export function SparkleIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2c0 5.523 4.477 10 10 10-5.523 0-10 4.477-10 10 0-5.523-4.477-10-10-10 5.523 0 10-4.477 10-10z" />
    </svg>
  )
}

/** Free. */
export function TagIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
    </svg>
  )
}

/** Selling Fast. */
export function FlameIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 12.9l-2.13 2.09A2.89 2.89 0 0 0 9 17.06C9 18.68 10.35 20 12 20s3-1.32 3-2.94c0-.78-.31-1.52-.87-2.07L12 12.9z" />
      <path d="M16 6l-.44.55C14.38 8.02 12 7.19 12 5.3V2S4 6 4 13c0 2.92 1.56 5.47 3.89 6.86A4.87 4.87 0 0 1 7 17.06c0-1.32.52-2.56 1.47-3.5L12 10.1l3.53 3.47c.95.93 1.47 2.17 1.47 3.5 0 1.02-.31 1.96-.85 2.75a7.97 7.97 0 0 0 3.71-5.3C20.52 10.97 18.79 7.62 16 6z" />
    </svg>
  )
}

/** Recommended. */
export function StarIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}

/** Sold Out. */
export function BanIcon({ color = 'currentColor', className = DEFAULT_CLASS }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={color} fillRule="evenodd" clipRule="evenodd" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.9 7.9 0 0 1 4 12zm8 8a7.9 7.9 0 0 1-4.9-1.69L18.31 7.1A7.9 7.9 0 0 1 20 12c0 4.42-3.58 8-8 8z" />
    </svg>
  )
}
