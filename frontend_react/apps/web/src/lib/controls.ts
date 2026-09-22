/**
 * Shared control classes that more than one surface needs to keep in step.
 *
 * ⚠️ THESE ARE CLASSES, NOT AN INLINE `style`. An inline colour beats a `hover:`
 * rule, so a control whose rest colours are inline cannot have a hover state at
 * all — the trap `ConsoleUI`'s BUTTON_TONE and the dashboard's wishlist row have
 * each already fallen into once. Spread these into `className`, never `style`.
 */

/**
 * The ordinary outline button — "Add an item", "Upload an image", and the three
 * controls on `/organizer/create` that open a dialog.
 *
 * The same 2px `--brand-control-border` edge as `REMOVE_BUTTON` beside it, and
 * the app-wide green hover fill from `apps/web/CLAUDE.md`. It was written out by
 * hand in `ListEditor` and `CoverImageField` until 2026-09-11, when the create
 * form's cards needed a third copy — which is one copy past the point where two
 * drift.
 *
 * Carries no padding, radius, font-size or weight, exactly like `REMOVE_BUTTON`:
 * each site keeps the geometry of the button it sits next to. Only the colours
 * are shared. The border is a CLASS, not an inline `style`, so hover can recolour
 * it — see the warning at the top of this file.
 */
export const OUTLINE_BUTTON =
  "transition-colors border-2 border-[var(--brand-control-border)] text-[var(--brand-text)] " +
  "disabled:opacity-40 disabled:cursor-not-allowed " +
  "enabled:hover:bg-[var(--brand-green)] enabled:hover:text-[var(--brand-on-green)]";

/**
 * The destructive outline button — every "Remove" in the product.
 *
 * ⚠️ **It looks like an ordinary outline button at rest** (Gautham, 2026-09-11):
 * the same 2px `--brand-control-border` edge as the "Add"/"Upload" control it
 * sits beside, and ordinary `--brand-text` for the label, so it re-skins with the
 * theme. It was terracotta-on-transparent with no edge, which made a row of
 * buttons read as two different kinds of control and left the word floating.
 *
 * The terracotta is now carried ENTIRELY by the pointer: hover — and `active`, so
 * a finger gets the same answer where there is no hover — fills the body
 * terracotta and flips the label to `--brand-on-terracotta` (white). That is the
 * one sanctioned exception to the app-wide green hover in CLAUDE.md: these
 * destroy content, and the fill is the warning.
 *
 * `enabled:` guards every hover/active colour because `:hover` still matches a
 * DISABLED `<button>` in every major browser — without it a dead control would
 * light up terracotta and advertise an action that cannot be taken. Same reason
 * `BUTTON_HOVER` is a separate map from `BUTTON_TONE`.
 *
 * Carries no padding, radius, font-size or weight: each site keeps the geometry
 * of the button it sits next to. Only the colours are shared.
 */
export const REMOVE_BUTTON =
  "transition-colors border-2 border-[var(--brand-control-border)] text-[var(--brand-text)] " +
  "disabled:opacity-35 disabled:cursor-not-allowed " +
  "enabled:hover:bg-[var(--brand-terracotta)] enabled:hover:text-[var(--brand-on-terracotta)] " +
  "enabled:hover:border-[var(--brand-terracotta)] " +
  "enabled:active:bg-[var(--brand-terracotta)] enabled:active:text-[var(--brand-on-terracotta)] " +
  "enabled:active:border-[var(--brand-terracotta)]";
