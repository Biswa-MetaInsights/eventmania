// ─────────────────────────────────────────────────────────────────────────────
//  The organiser console's section nav.
//
//  ONE list of sections (`CONSOLE_NAV`) renders two ways:
//    · lg+  — the rail down the left.
//    · <lg  — a horizontal scrolling strip above the content. A 248px column on
//             a 375px phone leaves ~140px for a seven-column table, so the rail
//             is not a layout that narrows; it is one that changes shape.
//
//  ⚠️ The rail is a THEMED SURFACE, not a coloured block (Gautham, 2026-08-21).
//  It takes `--brand-surface` — linen in light, the dark ground in dark — so it
//  is the same material as the navbar and the cards. In LIGHT mode
//  --brand-surface equals --brand-bg, so the right-hand border is the only thing
//  separating the rail from the page: it uses --brand-nav-border, the stronger
//  card token, and **must not be dropped or softened to --brand-border.**
//  (`--brand-ink` still fills the Events and Earnings HERO panels; it is no
//  longer the rail's colour.)
//
//  ⚠️ NO "New event" BUTTON in the rail (Gautham, 2026-08-21). The green CTA that
//  sat under the nav list was removed. The remaining always-available door to
//  `/organizer/create` is the navbar's **Organisers** dropdown, one row up; the
//  console's own create CTA lives in the Events EMPTY STATE only, so an organiser
//  who already has events reaches it via the navbar. Do not add the rail button
//  back without asking.
//
//  ⚠️ NO "Dashboard" ITEM either (Gautham, 2026-09-07). Events is the console's
//  landing section and carries the overview band the Dashboard used to hold; the
//  two were showing the same rows off the same `toConsoleRows`. `/organizer` is
//  now a redirect to `/organizer/events`. Do not add a fifth item back.
//
//  The rail sits UNDER the app's 72px navbar rather than replacing it — search,
//  theme toggle, chat and the avatar menu stay reachable, and the way back out
//  of the console is where it is everywhere else. That is why its height is
//  `calc(100vh - 72px)` and its `top` is 72px: change the navbar's height and
//  both numbers move.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconProps } from "@/components/EventIcons";
import { EventsIcon, AttendeesIcon, EarningsIcon } from "./ConsoleIcons";

/** The navbar's height. The rail hangs off it — see the header note. */
export const NAVBAR_H = 72;

export interface ConsoleSection {
  href: string;
  label: string;
  Icon: (props: IconProps) => React.ReactElement;
}

export const CONSOLE_NAV: ConsoleSection[] = [
  { href: "/organizer/events", label: "Events", Icon: EventsIcon },
  { href: "/organizer/attendees", label: "Attendees", Icon: AttendeesIcon },
  { href: "/organizer/earnings", label: "Earnings", Icon: EarningsIcon },
];

/**
 * `startsWith`, so a future `/organizer/events/[id]` keeps its section lit.
 *
 * ⚠️ It is only safe because no href here is a prefix of another. The bare
 * `/organizer` used to be, which is why this needed an exact-match special case
 * until the Dashboard went — **if you ever add a section whose path nests under
 * an existing one, that case has to come back.**
 */
function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

/** Counts shown against a section, keyed by href. Absent = no badge. */
export type NavBadges = Partial<Record<string, number>>;

export function ConsoleSidebar({ badges = {} }: { badges?: NavBadges }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── lg+ : the rail ── */}
      <aside
        className="hidden lg:flex flex-col gap-5 shrink-0 w-[248px] px-4 py-6 sticky self-start"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderRight: "1px solid var(--brand-nav-border)",
          top: NAVBAR_H,
          // dvh, not vh: an iPad in landscape shows this rail, and Safari's
          // toolbar makes 100vh taller than the visible screen (CLAUDE.md).
          height: `calc(100dvh - ${NAVBAR_H}px)`,
        }}
      >
        <nav className="flex flex-col gap-0.5">
          {CONSOLE_NAV.map((s) => (
            <RailItem key={s.href} section={s} active={isActive(pathname, s.href)} badge={badges[s.href]} />
          ))}
        </nav>
      </aside>

      {/* ── <lg : the strip ── */}
      <div
        className="lg:hidden sticky z-30"
        style={{
          top: NAVBAR_H,
          backgroundColor: "var(--brand-surface)",
          borderBottom: "1px solid var(--brand-nav-border)",
        }}
      >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-2.5">
          {CONSOLE_NAV.map((s) => (
            <StripItem key={s.href} section={s} active={isActive(pathname, s.href)} badge={badges[s.href]} />
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * The count beside a section — unanswered questions, event totals.
 *
 * ⚠️ **Bare type in both states — no chip, no wash** (Gautham, 2026-08-21). The
 * linen pill that used to sit behind the active count read as a second object
 * stuck to the rail. The count's only distinction is now its colour, and the
 * console follows one rule for that everywhere (see `CountBadge` in
 * `ConsoleUI.tsx`, which is the same decision on the tab counts):
 *
 *   · terracotta by default — the app's attention accent;
 *   · linen (`--brand-on-green`) ONLY on a SOLID green fill, where terracotta
 *     is ~2.4:1 and all but disappears.
 *
 * The active rail item is the one solid-green surface a count lands on. A tab
 * chip and a selected room row are 12% / 8% green TINTS over the page, so they
 * stay terracotta — linen on those would be the invisible one.
 */
function Badge({ children, active }: { children: number; active: boolean }) {
  return (
    <span
      className="text-[15px] font-bold shrink-0"
      style={{ color: active ? "var(--brand-on-green)" : "var(--brand-terracotta)" }}
    >
      {children}
    </span>
  );
}

function RailItem({ section, active, badge }: { section: ConsoleSection; active: boolean; badge?: number }) {
  const { href, label, Icon } = section;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-[17px] transition-colors"
      style={{
        backgroundColor: active ? "var(--brand-green)" : "transparent",
        color: active ? "var(--brand-on-green)" : "var(--brand-hint)",
        fontWeight: active ? 700 : 500,
      }}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-5 h-5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {typeof badge === "number" && badge > 0 && <Badge active={active}>{badge}</Badge>}
    </Link>
  );
}

function StripItem({ section, active, badge }: { section: ConsoleSection; active: boolean; badge?: number }) {
  const { href, label, Icon } = section;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[17px] whitespace-nowrap shrink-0"
      style={{
        backgroundColor: active ? "var(--brand-green)" : "transparent",
        color: active ? "var(--brand-on-green)" : "var(--brand-hint)",
        fontWeight: active ? 700 : 500,
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {typeof badge === "number" && badge > 0 && <Badge active={active}>{badge}</Badge>}
    </Link>
  );
}
