"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  THE bare pencil trigger: a small glyph beside a piece of text that opens the
//  thing which edits it, with its explanation in a hover tooltip.
//
//  Two call sites, and they are why this is a component rather than markup:
//    · the home page's city name — "Click here to change your location"
//    · /event/[id]'s "About this event" heading (organiser view) —
//      "Click here to edit the event details"
//
//  ⚠️ IT IS NOT AN `EventActions` CONTROL, and reaching for `EventIconButton`
//  here is the mistake to avoid. Those are 32/48px filled circles built to hold
//  their own against a full-bleed hero photograph; this one sits inline beside a
//  22px heading, where a circle that size reads as a second heading. Bare glyph,
//  no ground, no border — the home page set that shape and this keeps it.
//
//  ⚠️ THE TOOLTIP IS REQUIRED — the glyph alone does not say WHAT it edits, and
//  on a page with four editable blocks that matters. **Never pass a bare "Edit".**
//
//  ⚠️ `label` IS SEPARATE FROM `tooltip`, and that is not redundancy. The visible
//  tooltips are written as invitations ("Click here to…"), which is right on
//  screen and wrong in an accessible name: a screen reader announces the name
//  followed by "button", so "click here to" is filler in front of the only words
//  that carry meaning, and "here" refers to a pointer position that has none.
//  So `label` is the plain imperative ("Edit location") and defaults to the
//  tooltip only when a caller has nothing better.
//
//  ⚠️ COLOUR IS INLINE AND HOVER IS A JS HANDLER, not a `hover:` class. That is
//  deliberate and copied verbatim from the home page's trigger: the resting
//  colour depends on `active`, an inline style beats a `hover:` rule, and the
//  two would fight. This is the documented exception, not a pattern to spread.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { BRAND } from "@/lib/theme";
import { PencilLineIcon } from "./EventIcons";

const GREEN = BRAND.green;
const SURFACE = BRAND.surface;
const BORDER = BRAND.border;
const HINT = BRAND.hint;

export function EditPencil({
  tooltip,
  label,
  onClick,
  active = false,
}: {
  /** The sentence shown on hover. Written as an invitation. */
  tooltip: string;
  /** The accessible name — a plain imperative. Falls back to `tooltip`. */
  label?: string;
  onClick: () => void;
  /**
   * The thing this opens is already open, so the glyph stays green and the
   * tooltip is suppressed — a tooltip saying "click here to open" over an open
   * panel is noise. The city picker passes its dropdown state.
   */
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label ?? tooltip}
        onMouseEnter={(e) => {
          setHovered(true);
          if (!active) e.currentTarget.style.color = GREEN;
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          if (!active) e.currentTarget.style.color = HINT;
        }}
        /* 28px under a mouse (the glyph is 16px and sits beside a heading; a
           bigger ground would read as a second heading — see the note at the
           top). On a COARSE pointer the box grows to 44px, the touch minimum,
           and the negative margin gives the extra back so the row's layout is
           byte-identical either way. */
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:-m-2"
        style={{ color: active ? GREEN : HINT }}
      >
        <PencilLineIcon className="w-4 h-4" />
      </button>

      {/* Absolutely positioned, so hovering never reflows the row it sits in —
          the same rule EventActions' hover label follows. It opens to the RIGHT
          because both call sites put this at the end of a left-aligned line.
          Hidden on a device with NO hover (`hover: none` — phones, tablets):
          a tap fires mouseenter but nothing ever fires mouseleave, so the
          "Click here to…" tooltip would stick beside the heading after the
          picker closed. */}
      {hovered && !active && (
        <span
          className="[@media(hover:none)]:hidden absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg z-50 pointer-events-none"
          style={{ backgroundColor: SURFACE, color: GREEN, border: `1px solid ${BORDER}` }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
