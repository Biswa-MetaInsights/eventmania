"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The full-bleed horizontal card rail used at the bottom of the detail pages:
//  "Similar events" (/event/[id]), "Events in this community" and
//  "Similar communities" (/community/[slug]).
//
//  ⚠️ DELIBERATELY FULL-BLEED. A rail is a sibling AFTER the page's capped
//  1400px column, carrying the home page's own GUTTERS, so its cards render at
//  exactly the home grid's size and a full row of four fits without scrolling.
//  Inside the capped column four cards could only fit by shrinking to ~311px —
//  narrower than home at every width. The full-width divider it carries is what
//  makes the overhang read as a deliberate section break, not a misalignment.
//
//  ⚠️ Do not fork this file. Add a prop.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type RefObject } from "react";
import { BRAND } from "@/lib/theme";
import { GUTTERS } from "@/lib/layout";

/** Matches the gap-5 the event grids use. */
export const RAIL_GAP = 20;

/**
 * Each card is sized to the EXACT width a home-page grid cell renders at, so a
 * card here and a card on home are the same size, and a row of four fills the
 * rail with nothing to scroll. The home grid is `grid-cols-1 sm:grid-cols-2
 * xl:grid-cols-4` with `gap-5`, i.e. a cell is (container − gaps) / cols — so
 * these percentages, resolved against this rail's own inner width, reproduce it
 * exactly. That works ONLY because the section is full-bleed with the same
 * gutters as home; both containers are then the same width.
 *
 * ⚠️ Percentages, NOT `100vw`. An earlier version used viewport math and it was
 * wrong twice over: it double-counted the padding (needing a 4th `lg` breakpoint
 * for home's px-6→px-12 step), and `100vw` INCLUDES the vertical scrollbar while
 * a container's width excludes it — so four cards came to ~15px more than the
 * row could hold and the fourth was clipped into a scroll. Percentages have
 * neither problem: padding is already subtracted and the scrollbar never counts.
 */
export const RAIL_CARD_BASIS =
  "grow-0 shrink-0 " +
  "basis-full " +
  "sm:basis-[calc((100%-20px)/2)] " +
  "xl:basis-[calc((100%-60px)/4)]";

/** Wrapper every card in a rail needs: the width basis, snap point and equal height. */
export const RAIL_ITEM = `${RAIL_CARD_BASIS} snap-start [&>a]:h-full`;

export function Rail({
  title,
  ariaLabel,
  itemCount,
  headerExtra,
  children,
}: {
  title: string;
  /** Defaults to `title`. Pass one when the heading changes but the section doesn't. */
  ariaLabel?: string;
  /** Re-measure the arrows when the contents change (skeletons → cards, tab switch). */
  itemCount: number;
  /** Controls that belong beside the heading — e.g. a Previous/Upcoming toggle. */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);

  return (
    <section
      aria-label={ariaLabel ?? title}
      className={`mt-14 pt-12 pb-4 ${GUTTERS}`}
      style={{ textAlign: "left", borderTop: "1px solid var(--brand-border)" }}
    >
      {/* flex-wrap so a long heading plus a toggle drops to two rows on a phone
          rather than crushing either one. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 min-w-0">
          <h2 className="text-[22px] font-bold text-[var(--brand-text)]">{title}</h2>
          {headerExtra}
        </div>
        <Arrows rail={rail} deps={itemCount} />
      </div>

      {/* items-stretch (the flex default, stated for intent) makes every wrapper
          as tall as the tallest card, and `[&>a]:h-full` (in RAIL_ITEM) makes the
          card fill it — so the rail is equal-height like the home grid's row, not
          ragged.

          The vertical padding is NOT spacing — it is clip room, and it is why the
          negative margins cancel it exactly. `overflow-x: auto` forces the block
          axis to compute to `auto` too (CSS overflow spec: one non-visible axis
          makes the other non-visible), so this scroll container clips vertically
          as well. The cards lift 6px on hover and draw a 2px border, and their
          shadow bleeds ~16px up / ~40px down — all of which was being cut off at
          the rail's edges, most visibly as a MISSING TOP BORDER on hover. The
          home grid never showed this because a grid has no overflow container.
          If you change a card's hover lift or shadow, re-check these numbers. */}
      <div
        ref={rail}
        className="flex items-stretch overflow-x-auto scrollbar-hide snap-x -mt-6 -mb-10"
        style={{ gap: RAIL_GAP, paddingTop: 24, paddingBottom: 40 }}
      >
        {children}
      </div>
    </section>
  );
}

// ─── Arrows ───────────────────────────────────────────────────────────────────

/**
 * Scroll controls for a rail. They render in the section header rather than as
 * overlays on the row, so they never cover a card's own hover controls
 * (share / wishlist).
 */
function Arrows({ rail, deps }: { rail: RefObject<HTMLDivElement | null>; deps: number }) {
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // `sync` is defined INSIDE the effect on purpose: it is used nowhere else, and
  // hoisting it into a useCallback made the React Compiler bail out of
  // optimising this component (its inferred dependency is `rail.current`, not
  // `rail`, so the manual memo could not be preserved).
  useEffect(() => {
    const el = rail.current;
    if (!el) return;

    const sync = () => {
      setAtStart(el.scrollLeft <= 1);
      // 1px of slack: sub-pixel widths leave scrollLeft just short of the end.
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [rail, deps]);

  // Scroll by exactly one card + gap. The card width is responsive, so measure
  // the first card live rather than hard-coding it; fall back to ~90% of the
  // viewport if the rail is somehow empty.
  const scrollBy = (dir: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.getBoundingClientRect().width + RAIL_GAP : el.clientWidth * 0.9;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // Both ends true means the rail does not overflow — there is nothing to scroll.
  if (atStart && atEnd) return null;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <ArrowButton dir={-1} disabled={atStart} onClick={() => scrollBy(-1)} />
      <ArrowButton dir={1} disabled={atEnd} onClick={() => scrollBy(1)} />
    </div>
  );
}

function ArrowButton({
  dir,
  disabled,
  onClick,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? "Scroll to previous cards" : "Scroll to more cards"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
      style={{
        backgroundColor: active ? BRAND.green : BRAND.surface,
        border: `2px solid ${active ? BRAND.green : BRAND.controlBorder}`,
        color: active ? BRAND.onGreen : BRAND.text,
      }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={dir === -1 ? "M15.75 19.5 8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"}
        />
      </svg>
    </button>
  );
}

// ─── Segmented toggle ─────────────────────────────────────────────────────────

/**
 * The two-button switch a rail can carry in its header (Previous / Upcoming).
 *
 * Shape + border rules from apps/web/CLAUDE.md: the track is `rounded-lg` and its items
 * `rounded-md` so the inner radius nests, and BOTH states carry a 2px border so
 * the control does not resize when you click it.
 */
export function RailToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-lg shrink-0"
      style={{ border: `2px solid ${BRAND.controlBorder}`, backgroundColor: BRAND.surface }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="px-3.5 py-1.5 rounded-md text-[15px] font-semibold transition-colors"
            style={{
              backgroundColor: active ? BRAND.green : "transparent",
              color: active ? BRAND.onGreen : BRAND.text,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}