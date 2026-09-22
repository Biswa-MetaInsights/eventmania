"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The sidebar card shared by /event/[id] and /community/[slug].
//
//  Both pages put a bordered card in their right column: a flat green header
//  saying WHO is running this, a surface body with date/time/location lines, a
//  social-proof chip, a price row and a full-width CTA. They are the same card
//  with different copy — so the chrome lives here ONCE.
//
//  ⚠️ Do not fork this file for a third surface. Add a prop.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { TAG_SHAPE } from "./EventBadges";
import { ShieldCheckIcon } from "./EventIcons";
import { BRAND } from "@/lib/theme";

const GREEN = BRAND.green;

/** Secondary text/glyphs on the card's green header. */
export const ON_GREEN_MUTED = "color-mix(in srgb, var(--brand-on-green) 70%, transparent)";

/**
 * The card runs its date/time/location glyphs bigger than the compact card rows
 * the shared icon default is tuned for.
 */
export const DETAIL_ICON = "w-[22px] h-[22px] shrink-0";

/** Horizontal padding shared by the header and the body, so they line up. */
const PAD_X = "px-5 sm:px-8";

// ── Shell ────────────────────────────────────────────────────────────────────

export function DetailCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--brand-border)", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}
    >
      {children}
    </div>
  );
}

/** The surface-coloured lower half. Everything below the green header goes here. */
export function DetailCardBody({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${PAD_X} py-7`} style={{ backgroundColor: "var(--brand-surface)" }}>
      {children}
    </div>
  );
}

// ── Green header ─────────────────────────────────────────────────────────────

/**
 * Who is running this. The avatar is the name's initial — neither events nor
 * communities have an organiser image field yet.
 *
 * `subline` is plain truth (member count, event count); `verified` is the only
 * thing that draws the shield, and it must come from a real
 * `verification_status === "verified"`. **Never pass `verified` for decoration**
 * — it is a trust claim (TODO.md §1).
 */
export function DetailCardHeader({
  eyebrow,
  name,
  subline,
  verified = false,
}: {
  eyebrow: string;
  name: string;
  subline?: string;
  verified?: boolean;
}) {
  return (
    <div className={`${PAD_X} pt-7 pb-8`} style={{ backgroundColor: GREEN }}>
      <p className="text-[13px] font-bold tracking-[0.08em] mb-3" style={{ color: ON_GREEN_MUTED }}>
        {eyebrow}
      </p>
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-on-green) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--brand-on-green) 22%, transparent)",
          }}
        >
          <span className="text-[24px] font-extrabold" style={{ color: "var(--brand-on-green)" }}>
            {name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        </div>
        <div className="min-w-0">
          <p
            className="text-[24px] font-extrabold leading-tight truncate"
            style={{ color: "var(--brand-on-green)" }}
          >
            {name}
          </p>
          {subline && (
            <div className="flex items-center gap-1.5 mt-1">
              {verified && (
                <ShieldCheckIcon color={ON_GREEN_MUTED} className="w-[15px] h-[15px] shrink-0" />
              )}
              <span className="text-[15px] truncate" style={{ color: ON_GREEN_MUTED }}>
                {subline}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Body pieces ──────────────────────────────────────────────────────────────

/** One icon + label row (date, time, location). */
export function DetailLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="shrink-0">{icon}</span>
      <span className="text-[16px] font-semibold text-[var(--brand-text)] truncate">{text}</span>
    </div>
  );
}

/**
 * Social proof: three stacked dots standing in for member/attendee avatars, and
 * a count. Takes the tag silhouette from EventBadges (TAG_SHAPE) so it matches
 * Selling Fast / Music, but keeps its own light fill — the tags' dark tints are
 * tuned for the hero's photo scrim and read as heavy blocks on this body.
 */
export function DetailPeopleChip({ count, label }: { count: number | string; label: string }) {
  return (
    <div
      className={`${TAG_SHAPE} gap-3 px-4 py-3`}
      style={{ backgroundColor: "color-mix(in srgb, var(--brand-green) 5%, transparent)" }}
    >
      <div className="flex">
        {["#C1603F", GREEN, "#4A5FA5"].map((c, i) => (
          <span
            key={i}
            className="w-7 h-7 rounded-full"
            style={{
              backgroundColor: c,
              border: "2px solid var(--brand-surface)",
              marginLeft: i === 0 ? 0 : -10,
            }}
          />
        ))}
      </div>
      <span className="text-[15px] whitespace-nowrap text-[var(--brand-hint)]">
        <b className="text-[var(--brand-text)]">{count}</b> {label}
      </span>
    </div>
  );
}

/** The terracotta-tinted scarcity/status chip that sits opposite the people chip. */
export function DetailAccentChip({ text }: { text: string }) {
  return (
    <span
      className={`${TAG_SHAPE} px-3.5 py-2 text-[15px] font-bold`}
      style={{ backgroundColor: "color-mix(in srgb, #C1603F 12%, transparent)", color: "#B4542F" }}
    >
      {text}
    </span>
  );
}

export function DetailDivider() {
  return <div className="my-7 h-px bg-[var(--brand-border)]" />;
}

/**
 * Price row. Label and figure share a baseline so "Starting from" reads as a
 * caption on the amount rather than as its own row.
 */
export function DetailPriceRow({
  label,
  amount,
  suffix,
}: {
  label: string;
  amount: string;
  /** "/ ticket", "/ month" — omitted when the item is free. */
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[13px] font-bold tracking-[0.08em] text-[var(--brand-hint)]">{label}</p>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-[38px] leading-none font-extrabold" style={{ color: GREEN }}>
          {amount}
        </span>
        {suffix && <span className="text-[16px] font-medium text-[var(--brand-hint)]">{suffix}</span>}
      </div>
    </div>
  );
}

/**
 * The card's full-width primary action.
 *
 * ⚠️ PASS `href` WHEN THE ACTION IS NAVIGATION (the organiser card's "Manage
 * attendees" and "Manage revenue"), and it renders a `next/link` with the
 * identical chrome. A `router.push` inside `onClick` would look the same and
 * lose the three things a link gives for free: prefetch, middle-click, and a
 * destination in the status bar. `onClick` stays for the actions that are NOT
 * navigation — "Book Now" branches on whether you are signed in.
 *
 * `variant="outline"` is the quieter of the two: same size and radius, but it
 * wears the SAME skin as the section edit controls in `EventSections` —
 * `ConsoleButton`'s `outline` tone: surface ground, `--brand-text` label (brand
 * black in light, warm off-white in dark) and a 2px `--brand-control-border`,
 * hovering to the app-wide green ground + linen label (Gautham, 2026-08-31).
 * It was a green outline with a green label, which made "Manage attendees" and
 * "Post an announcement" — two equally-weighted controls on one screen — read
 * as two different systems. **Do not restore the green label.**
 *
 * Use it for the secondary of a mixed pair, or for BOTH when neither action
 * outranks the other (`OrganiserEventCard`), and on the participant card's
 * "Book Now" so the one CTA a reader sees matches the rest of the page.
 * The outline keeps its 2px border through the hover, so it never resizes.
 */
export function DetailCTA({
  label,
  onClick,
  href,
  disabled = false,
  variant = "solid",
}: {
  label: string;
  onClick?: () => void;
  /** Internal route. Wins over `onClick` when both are somehow passed. */
  href?: string;
  disabled?: boolean;
  variant?: "solid" | "outline";
}) {
  const solid = variant === "solid";
  // ⚠️ `py-[14px]` on the outline, not `py-4`. Its 2px border is inside the box,
  // so 14 + 2 lands on exactly the solid button's 16px — the two are the same
  // height when stacked, and the solid one is byte-identical to what "Book Now"
  // has always rendered. Change one of these numbers and change the other.
  const cls = `block w-full mt-5 ${
    solid ? "py-4" : "py-[14px]"
  } rounded-lg text-[18px] font-bold text-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed`;
  // Inline, and hovered from JS, because that is what this file already does for
  // the sticky bar below — one pattern per file beats a correct second one.
  const rest = solid
    ? { backgroundColor: GREEN, color: "var(--brand-on-green)" }
    : {
        backgroundColor: "var(--brand-surface)",
        color: "var(--brand-text)",
        border: "2px solid var(--brand-control-border)",
      };
  // ⚠️ The outline swaps its BORDER too. `ConsoleButton`'s outline tone goes
  // green-on-green on hover; leaving this one on the control border would give
  // the same control two different hovers on one page.
  const enter = (el: HTMLElement) => {
    el.style.backgroundColor = solid ? "var(--brand-green-hover)" : GREEN;
    el.style.color = "var(--brand-on-green)";
    if (!solid) el.style.borderColor = GREEN;
  };
  const leave = (el: HTMLElement) => {
    el.style.backgroundColor = rest.backgroundColor;
    el.style.color = rest.color;
    if (!solid) el.style.borderColor = "var(--brand-control-border)";
  };

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={cls}
        style={rest}
        onMouseEnter={(e) => enter(e.currentTarget)}
        onMouseLeave={(e) => leave(e.currentTarget)}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={rest}
      onMouseEnter={(e) => !disabled && enter(e.currentTarget)}
      onMouseLeave={(e) => leave(e.currentTarget)}
    >
      {label}
    </button>
  );
}

// ── Sticky bottom bar ────────────────────────────────────────────────────────

/** How tall the bar is. Exported because every page that mounts one owes its
 *  own content this much bottom padding — see `DetailStickyShell`. */
export const STICKY_BAR_HEIGHT = 88;

/** The `compact` bar's height: a 48px button with 12px of air above and below.
 *  Move one number and move the other — see `DetailStickyCTA`'s `compact`. */
export const STICKY_BAR_HEIGHT_COMPACT = 72;

/**
 * The chrome of the fixed bar a page pins to the foot of the viewport:
 * full-bleed, `STICKY_BAR_HEIGHT` tall, page ground, a 1px rule along the top,
 * and the page's own gutters so its contents line up with the column above.
 *
 * ⚠️ SPLIT OUT OF `DetailStickyBar` SO `/organizer/create` COULD HAVE THE SAME
 * BAR WITH TWO BUTTONS IN IT (Gautham, 2026-09-11). He asked for that form's
 * "Publish Event" and "Save as Draft" to look EXACTLY like "Manage attendees" —
 * same bar, same button, just two of them — and the only honest way to promise
 * that is to share this markup rather than restate 88px and the rule somewhere
 * else. `DetailStickyBar` below is still the one-CTA form of it, unchanged.
 *
 * ⚠️ NOTHING PADS THE PAGE FOR IT. The bar is `fixed`, so it floats over
 * whatever is at the bottom of the document — a page that mounts one owes its
 * content `STICKY_BAR_HEIGHT` of bottom padding, or the last thing on the page
 * sits under the bar where nobody can reach it.
 *
 * `justify-between` puts the first child left and the last right, so a bar whose
 * only child is a button row wants `ml-auto` on that row.
 *
 * ⚠️ `compact` IS `/organizer/create`'s BAR AND ONLY ITS BAR (Gautham,
 * 2026-09-11). 72px instead of 88, carrying 48px buttons, with a 2px
 * `--brand-control-border` along the top instead of the 1px `--brand-border`.
 * **`/event/[id]` and `/community/[slug]` are deliberately NOT on it.** Their
 * bar is settled and a public page does not get restyled to suit a console one;
 * the day Gautham wants the short bar everywhere, delete the flag rather than
 * pass it from three call sites.
 *
 * ⚠️ The heavier top edge is the same call `/explore`'s filter sidebar and
 * `FeatureBand`'s cards already made: 1px `--brand-border` on linen is ~1.24:1
 * and reads as no edge at all, so a bar painted `--brand-bg` looked like it was
 * part of the page rather than floating over it. It is NOT licence to sweep
 * dividers to 2px — see the *Borders* section in `apps/web/CLAUDE.md`.
 */
export function DetailStickyShell({
  gutters,
  compact = false,
  children,
}: {
  /** The page's GUTTERS class — passed in so this file needs no layout import. */
  gutters: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 flex items-center justify-between gap-3 sm:gap-4 bg-[var(--brand-bg)] z-30 ${gutters}`}
      style={{
        height: compact ? STICKY_BAR_HEIGHT_COMPACT : STICKY_BAR_HEIGHT,
        borderTop: compact
          ? "2px solid var(--brand-control-border)"
          : "1px solid var(--brand-border)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * The green slab on the right of a sticky bar — "Book Now", "Manage attendees",
 * and both of `/organizer/create`'s submits.
 *
 * ⚠️ THE ONE DEFINITION OF THAT BUTTON. It was inline in `DetailStickyBar` until
 * the create form needed the same look; **anything that wants it imports this**,
 * and a second copy of these numbers is drift even where it renders identically.
 *
 * Below `sm` it gives up its padding and a type step: the organiser bar
 * ("Tickets sold · 120 / 500" + "Manage attendees") is ~330px of nowrap content
 * and a 320px phone has 288. Unchanged from `sm` up.
 *
 * `share` is for a bar carrying TWO of these. Below `sm` the pair splits the bar
 * evenly and trades away more padding to do it — two labels at `px-4` come to
 * ~326px against the 288 a 320px phone has, so without it they overflow. **From
 * `sm` up `share` changes nothing**, which is what keeps the promise above: at
 * every width where there is room, these are the same button as the single one.
 *
 * `type="submit"` is for the pair inside a form. The default stays `"button"` so
 * a bar dropped into one can never submit it by accident.
 *
 * ⚠️ `compact` PINS THE HEIGHT AT 48px (`h-12`) instead of deriving it from
 * `py-4` — 59px at rest, which Gautham asked to come down on `/organizer/create`
 * (2026-09-11). It is a HEIGHT, not a type step: the label stays 18px bold,
 * because the house type scale puts every button there and a 48px slab has room
 * for it (18/27 leaves 10.5px a side). **Pass it with the shell's own `compact`
 * or the buttons rattle in a bar still sized for 59px ones.** Nothing public
 * uses it — see the note on `DetailStickyShell`.
 */
export function DetailStickyCTA({
  label,
  onClick,
  href,
  disabled = false,
  type = "button",
  share = false,
  compact = false,
}: {
  label: React.ReactNode;
  onClick?: () => void;
  /** Internal route — see the note on `DetailCTA`. Wins over `onClick`. */
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  share?: boolean;
  compact?: boolean;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-lg text-[16px] sm:text-[18px] " +
    "font-bold text-[var(--brand-on-green)] transition-colors whitespace-nowrap " +
    "disabled:opacity-60 disabled:cursor-not-allowed " +
    (compact ? "h-12 " : "py-4 ") +
    (share ? "basis-0 grow sm:grow-0 px-2 sm:px-10 lg:px-16" : "px-4 sm:px-10 lg:px-16");

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={cls}
        style={{ backgroundColor: GREEN }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--brand-green-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={{ backgroundColor: GREEN }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = "var(--brand-green-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
    >
      {label}
    </button>
  );
}

/**
 * The fixed bar at the bottom of a detail page: caption + amount on the left,
 * primary action on the right. Same control on both pages, only the copy differs.
 */
export function DetailStickyBar({
  caption,
  amount,
  cta,
  onClick,
  href,
  disabled = false,
  gutters,
}: {
  caption: string;
  amount: string;
  cta: string;
  onClick?: () => void;
  /** Internal route — see the note on `DetailCTA`. Wins over `onClick`. */
  href?: string;
  disabled?: boolean;
  /** The page's GUTTERS class — passed in so this file needs no layout import. */
  gutters: string;
}) {
  return (
    <DetailStickyShell gutters={gutters}>
      {/* shrink-0 on the amount, so on a narrow bar the button loses its generous
          padding rather than the figure being squeezed out. */}
      <div className="shrink-0" style={{ textAlign: "left" }}>
        <p className="text-sm text-[var(--brand-hint)]">{caption}</p>
        <p className="text-[22px] sm:text-[28px] font-bold text-[var(--brand-text)]">{amount}</p>
      </div>
      <DetailStickyCTA label={cta} onClick={onClick} href={href} disabled={disabled} />
    </DetailStickyShell>
  );
}