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
      className="rounded-3xl overflow-hidden"
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
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
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

/** The card's full-width primary action. */
export function DetailCTA({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-5 py-4 rounded-2xl text-[18px] font-bold text-[var(--brand-on-green)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ backgroundColor: GREEN }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = "var(--brand-green-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
    >
      {label}
    </button>
  );
}

// ── Sticky bottom bar ────────────────────────────────────────────────────────

/**
 * The fixed bar at the bottom of a detail page: caption + amount on the left,
 * primary action on the right. Same control on both pages, only the copy differs.
 */
export function DetailStickyBar({
  caption,
  amount,
  cta,
  onClick,
  disabled = false,
  gutters,
}: {
  caption: string;
  amount: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  /** The page's GUTTERS class — passed in so this file needs no layout import. */
  gutters: string;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 bg-[var(--brand-bg)] z-30 ${gutters}`}
      style={{ height: 88, borderTop: "1px solid var(--brand-border)" }}
    >
      {/* shrink-0 on the amount, so on a narrow bar the button loses its generous
          padding rather than the figure being squeezed out. */}
      <div className="shrink-0" style={{ textAlign: "left" }}>
        <p className="text-sm text-[var(--brand-hint)]">{caption}</p>
        <p className="text-[22px] sm:text-[28px] font-bold text-[var(--brand-text)]">{amount}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="px-6 sm:px-10 lg:px-16 py-4 rounded-2xl text-[18px] font-bold text-[var(--brand-on-green)] transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: GREEN }}
        onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = "var(--brand-green-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
      >
        {cta}
      </button>
    </div>
  );
}