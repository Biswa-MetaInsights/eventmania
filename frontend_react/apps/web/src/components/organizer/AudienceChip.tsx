"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  THE "Target Audience" chip. Two call sites — `/organizer/create` and the
//  event page's "Edit details" dialog — and it is a component rather than markup
//  for the same reason `TARGET_AUDIENCES` lives in `lib/event-options`: the two
//  forms offer the same choices and must offer them in the same clothes. It was
//  copy-pasted markup in both files until 2026-09-11, which is exactly the drift
//  `CLAUDE.md`'s one-control-one-component rule is there to stop.
//
//  ⚠️ EVERY TONE IS A CLASS, NEVER AN INLINE `style`. An inline colour beats a
//  `hover:` rule, and that is why this chip sat inert under the pointer until
//  the green hover was added. Same trap as the console row, `FeatureBand`'s
//  audience badge and `FilterSelect`'s menu items — see `apps/web/CLAUDE.md`.
//
//  ⚠️ THE TOOLTIP NAMES THE ACTION, SO IT FLIPS ON A SELECTED CHIP. "Click to
//  select" over a chip that is already selected describes the state instead of
//  what the click does, and the action is the only thing a tooltip is for — the
//  same reasoning that makes `EditPencil` suppress its tooltip while the thing
//  it opens is open. **Do not collapse the two strings into one.**
// ─────────────────────────────────────────────────────────────────────────────

export function AudienceChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors hover:bg-[var(--brand-green)] hover:border-[var(--brand-green)] hover:text-[var(--brand-on-green)] ${
          selected
            ? "bg-[var(--brand-green)] border-[var(--brand-green)] text-[var(--brand-on-green)]"
            : "bg-[var(--brand-surface)] border-[var(--brand-control-border)] text-[var(--brand-text)]"
        }`}
      >
        {label}
      </button>

      {/* ⚠️ `hidden` → `group-hover:block`, NOT an opacity fade. A chip row wraps
          to four or five lines and the tooltip is wider than a short chip, so an
          always-rendered-but-transparent one would sit outside the form at 320px
          and count towards `document.scrollWidth` — an OVERFLOW the responsive
          sweep would report on a page nobody had touched. `display: none` at
          rest costs nothing.

          Above the chip rather than beside it: the neighbours in a wrapped row
          are only 8px away, and a tooltip opening sideways lands on top of the
          next chip along.

          Tailwind wraps `group-hover:` in `@media (hover: hover)`, so a finger
          never pins this open; the second guard is the house belt-and-braces
          every hover tooltip in the app carries. */}
      <span className="hidden group-hover:block [@media(hover:none)]:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg z-50 pointer-events-none bg-[var(--brand-surface)] text-[var(--brand-green)] border border-[var(--brand-border)]">
        {selected ? "Click to deselect" : "Click to select"}
      </span>
    </span>
  );
}
