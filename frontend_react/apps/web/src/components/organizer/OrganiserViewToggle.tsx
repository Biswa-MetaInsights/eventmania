"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The mode switch an organiser gets on their OWN event page.
//
//  ⚠️ IT LIVES IN THE HERO'S CONTROL ROW (Gautham, 2026-08-31), beside Edit /
//  Duplicate / Cancel — it replaced a full-width green band under the navbar
//  that carried the same two modes as a sentence plus a button. **Do not put the
//  band back.** The row is where the organiser's other controls already are, and
//  the page had two full-width bands stacked under the navbar before this.
//
//  ⚠️ **ORGANISER is the default mode** (Gautham, 2026-08-21) — an organiser
//  opening their own event arrives holding the controls, and previews the
//  participant's view deliberately. The reverse shipped first and was changed;
//  do not flip it back.
//
//  ⚠️ IT SHOWS IN BOTH MODES and is the only thing that NAMES the one you are
//  in: the two views otherwise differ by a few round controls in the hero, which
//  is easy to miss. The picked segment says it at rest, and the hover label
//  under the control says it in a sentence. **Keep both** — and if a third mode
//  is ever added, add it to `MODES` here rather than letting a page infer a mode
//  from something else.
//
//  ⚠️ EVERY SEGMENT ANSWERS THE POINTER, picked or not (Gautham, 2026-08-31) —
//  hovering the segment you are already in still shows its label. That is why
//  the copy comes in two forms: the picked one STATES the mode you are in, the
//  unpicked one OFFERS the switch. **Do not collapse them into one string** —
//  "You're viewing as the organiser" under a segment you are not in is a lie.
//
//  ⚠️ IT IS SKINNED AS ONE OF THE ROUND CONTROLS BESIDE IT (Gautham,
//  2026-08-31): a `--brand-surface` track — the same linen ground as an
//  `EventIconButton` — with `--brand-hint` labels, exactly the muted-glyph
//  colour those buttons wear at rest. **The picked segment is `--brand-green`**,
//  the app's own selected/CTA fill, with `--brand-on-green` on it.
//
//  ⚠️ It went through TWO earlier skins and neither is coming back: a
//  `--brand-green` track with a **terracotta** picked segment (carried over
//  from the band it replaced, changed because the control should read as part
//  of the hero's set rather than as a leftover band), and before that a linen
//  hover wash on the unpicked segment. **No gold either — there is no gold
//  token** (see `ConsoleUI`).
//
//  ⚠️ An unpicked segment takes NO hover FILL — only its label goes green,
//  which is precisely what the round buttons' glyphs do. Keep the two in step.
//
//  ⚠️ NO GLYPHS (Gautham, 2026-08-31). An eye rode on the preview segment and
//  was removed; two words say it without one. Do not re-add an icon here.
//
//  ⚠️ Rectangle with rounded edges, never a pill — the app's shape rule, and the
//  radius nests: `rounded-lg` track, `rounded-md` segments.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  ActionLabel,
  HERO_CONTROL,
  HERO_EDGE,
  HERO_EDGE_HOVER,
} from "@/components/EventActions";

export type EventViewMode = "participant" | "organiser";

/** The segments, in the order they render. Words only — see the header. */
const MODES: { mode: EventViewMode; label: string }[] = [
  { mode: "participant", label: "Participant view" },
  { mode: "organiser", label: "Organiser" },
];

/**
 * What the hover label says, per segment.
 *
 * `on` is the shortened form of the sentence the old green band printed
 * permanently — the mode is still stated in words, it just no longer costs a
 * band of every viewport. `off` is that band's own button copy, because a
 * segment you are not in is an offer, not a statement. **Both are needed:** the
 * pointer is answered on either segment, so one string would be wrong on one of
 * them.
 */
const TOOLTIP: Record<EventViewMode, { on: string; off: string }> = {
  participant: { on: "Previewing as a participant", off: "Preview as a participant" },
  organiser: { on: "Viewing as the organiser", off: "Switch to organiser view" },
};

/** Picked vs not. Colours are CLASSES, not an inline style — an inline colour
 *  outranks any `hover:` rule, the trap `FeatureBand` and `FilterSelect` both
 *  document, and the unpicked segment's green-on-hover depends on it. It gets
 *  no hover FILL, only the label colour, matching the round buttons' glyphs. */
const SEGMENT: Record<"on" | "off", string> = {
  on: "bg-[var(--brand-green)] text-[var(--brand-on-green)]",
  off: "text-[var(--brand-hint)] hover:text-[var(--brand-green)]",
};

export function OrganiserViewToggle({
  mode,
  onChange,
}: {
  mode: EventViewMode;
  onChange: (next: EventViewMode) => void;
}) {
  // WHICH segment the pointer is on, not merely whether the control is hovered:
  // each one has its own sentence, and the picked one has to answer too.
  const [hovered, setHovered] = useState<EventViewMode | null>(null);

  return (
    <div className="relative flex items-center" onMouseLeave={() => setHovered(null)}>
      {/* `ActionLabel` is the hero row's own hover pill, imported rather than
          restyled — this control sits between the back button and the action
          buttons, and a second pill styled to match is how those drift. It is
          anchored to the whole control rather than to a segment, so the label
          does not jump sideways as the pointer crosses the middle. */}
      {hovered && (
        <ActionLabel side="bottom">
          {TOOLTIP[hovered][hovered === mode ? "on" : "off"]}
        </ActionLabel>
      )}

      {/* `HERO_CONTROL` carries the type; the linen ground and `HERO_EDGE` are
          the round buttons' own, so the toggle reads as one of that set rather
          than as a control from somewhere else. The edge goes on the TRACK, not
          on a segment — one control, one outline — and it greens under the
          pointer like every other edge in the row (Gautham, 2026-09-01).

          ⚠️ It rides `hovered`, the same signal as the label, so the ring
          answers EITHER segment — including the picked one, which is the rule
          the header states for the label. Crossing the 4px gap between segments
          does not drop it: nothing clears `hovered` but the wrapper's
          `onMouseLeave`, so the ring cannot flicker mid-control. An inline
          style, so like the chip's it cannot be a `hover:` class. */}
      <div
        role="group"
        aria-label="Event view mode"
        className={`${HERO_CONTROL} flex items-center gap-1 rounded-lg p-1`}
        style={{
          backgroundColor: "var(--brand-surface)",
          border: hovered ? HERO_EDGE_HOVER : HERO_EDGE,
        }}
      >
        {MODES.map(({ mode: m, label }) => {
          const on = m === mode;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              onMouseEnter={() => setHovered(m)}
              aria-pressed={on}
              // `HERO_CONTROL`'s type, one radius step in so the inner corner
              // nests. 22px leading + 14px padding + the track's 8px + its 4px
              // of border = the 48px every control in this row stands at — see
              // `HERO_CONTROL`.
              className={`${HERO_CONTROL} rounded-md px-3.5 py-[7px] ${on ? SEGMENT.on : SEGMENT.off}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
