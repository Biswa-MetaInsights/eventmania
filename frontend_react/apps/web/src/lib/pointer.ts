/**
 * Does the primary input device hover? True for a mouse or trackpad, false for
 * a finger (phones, tablets — including an iPad at 1024px, where the desktop
 * navbar row is showing).
 *
 * The one job this has: keep `onMouseEnter` / `onMouseLeave` from driving
 * NAVIGATION state on touch. A tap synthesises mouseenter → mousedown → mouseup
 * → click in that order, so a menu that opens on mouseenter AND toggles on
 * click opens and closes again in the same tap. Guarding the hover handlers
 * with this leaves the tap toggle as the only thing that runs on touch.
 *
 * It is a media query, not a `'ontouchstart' in window` sniff — a touch-screen
 * laptop with a trackpad reports `hover: hover` and gets the mouse behaviour,
 * which is right. Evaluated per call because a tablet with a paired mouse can
 * change its answer mid-session. Safe on the server (returns false, and the
 * hover handlers cannot fire there anyway).
 *
 * For a purely VISUAL hover reveal, prefer CSS — `TOUCH_REVEAL` in
 * `EventsCarousel` and the `[@media(hover:none)]:hidden` tooltips — which needs
 * no JS and no re-render. This is for state.
 */
export function hoverCapable(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover)").matches;
}
