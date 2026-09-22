// ─────────────────────────────────────────────────────────────────────────────
//  Brand token strings for inline styles.
//
//  These are just CSS `var(--brand-*)` references as strings, so components can
//  keep using inline `style={{ ... }}` exactly as before — but now the value
//  resolves through the theme-aware CSS variables defined in globals.css. Flip
//  `data-theme` on <html> and every one of these re-skins automatically.
//
//  The actual light/dark hex values live in ONE place: globals.css. Do not put
//  hexes here.
// ─────────────────────────────────────────────────────────────────────────────
export const BRAND = {
  green: "var(--brand-green)",
  onGreen: "var(--brand-on-green)",
  // Fixed accent (category badge, event-assistant button) — same in both themes.
  terracotta: "var(--brand-terracotta)",
  terracottaHover: "var(--brand-terracotta-hover)",
  onTerracotta: "var(--brand-on-terracotta)",
  // The organiser-console panel — also fixed in both themes. `ink` is the deep
  // green console panel (--brand-green goes mint in dark and cannot fill one).
  // The accent ON that panel is `terracotta` above; there is no gold token any
  // more (Gautham, 2026-08-21 — one accent for the whole console).
  ink: "var(--brand-ink)",
  onInk: "var(--brand-on-ink)",
  bg: "var(--brand-bg)",
  surface: "var(--brand-surface)",
  text: "var(--brand-text)",
  border: "var(--brand-border)",
  navBorder: "var(--brand-nav-border)",
  // Outline controls (secondary buttons, chips, tabs, segmented tracks). Much
  // darker than `border` so a control cannot blend into the page. See globals.css.
  controlBorder: "var(--brand-control-border)",
  // Secondary text + icons. Despite the name this is NOT gray — it is the brand
  // text colour in light and the brand white in dark. See globals.css.
  hint: "var(--brand-hint)",
  // The one genuinely-gray token: form placeholders and muted FILLS (sold-out
  // buttons, typing dots). Never use it for ordinary secondary text.
  muted: "var(--brand-muted)",
  logo: "var(--brand-logo)", // logo/wordmark tint — green in light, linen in dark
} as const;

export type ThemeName = "light" | "dark";

export const THEME_STORAGE_KEY = "eventmind-theme";

// Inline <head> script (stringified) that sets data-theme BEFORE first paint so
// there is no light→dark flash on load. Kept dependency-free and tiny.
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
