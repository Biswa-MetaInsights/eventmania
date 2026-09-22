// ─────────────────────────────────────────────────────────────────────────────
//  Organiser console shell — the sidebar, the page header, and the auth guard
//  every section shares.
//
//  ⚠️ WHY THIS IS IN A (console) ROUTE GROUP. `/organizer/create` and
//  `/organizer/onboarding` are siblings that are NOT part of this console —
//  they render their own <Navbar/>. (`/organizer/my-events` used to as well;
//  it's now a pure redirect to `/organizer/events`, alongside the `/organizer`
//  redirect.) A layout at `app/organizer/layout.tsx` would wrap them too and
//  give each a second navbar plus a sidebar they have no use for. The group
//  applies the shell to the three console sections only, and changes no URL.
//
//  The section titles live here rather than in each page because the header is
//  one continuous element across the console — a page that set its own would
//  drift in size or spacing the first time one of them was edited.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar/Navbar";
import { GUTTERS, PAGE_MAX_WIDTH } from "@/lib/layout";
import { useToday } from "@/lib/use-today";
import { isDummyMode } from "@/lib/data-source";
import { ConsoleSidebar } from "@/components/organizer/ConsoleSidebar";
import { ConsoleButton, EmptyState } from "@/components/organizer/ConsoleUI";
import { useOrganiser, useOrganiserEvents } from "@/components/organizer/useOrganiser";
import { SearchIcon } from "@/components/organizer/ConsoleIcons";

/**
 * Title + standfirst per section. `null` sub = the section needs no explaining.
 *
 * ⚠️ `/organizer/events` is the console's LANDING section since the Dashboard
 * was folded into it (Gautham, 2026-09-07), so it wears the greeting rather than
 * a section title — `HOME` below, resolved against the user's clock in the
 * component. Its old "Events / Everything you've created…" pair went with the
 * split: the rail already names the section, and the overview band that now
 * opens the page says more than a standfirst could. **Do not put a title back
 * on it** — the greeting and an h1 saying "Events" cannot both be the h1.
 */
const HOME = "/organizer/events";

const SECTIONS: Record<string, { title: string; sub: string | null }> = {
  [HOME]: { title: "", sub: null }, // greeting — filled in below
  "/organizer/attendees": {
    title: "Attendees",
    sub: "Who's coming, what they paid, and who walked in. Filter to one event to run the door.",
  },
  "/organizer/earnings": { title: "Earnings", sub: null },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { organiserId, name, ready, isOrganiser, organiserKnown } = useOrganiser();
  const { data: events = [] } = useOrganiserEvents(organiserId);

  // Browser-only: the server has no user clock. See lib/use-today.ts.
  const today = useToday();

  const section = SECTIONS[pathname] ?? SECTIONS[HOME];
  const title =
    section.title || `${today?.greeting ?? "Welcome"}, ${name.split(" ")[0]}`;

  // Nothing until zustand has rehydrated AND we know whether this person is an
  // organiser — see useOrganiser. Rendering the shell first would flash a
  // signed-in console at a signed-out visitor on the way to /auth, flash an
  // empty sidebar at a signed-in one on every refresh, and flash the
  // "not an organiser" page at an organiser while their profile loads.
  if (!ready || !organiserKnown) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
        <Navbar />
      </div>
    );
  }

  // Signed in, but not an organiser. No rail and no sections — there is nothing
  // behind them for this person — just what the console is and the one door into
  // it. See the two-gates note in useOrganiser.
  if (!isOrganiser) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
        <Navbar />
        <main className={`${GUTTERS} py-12`}>
          <div className="mx-auto" style={{ maxWidth: 720 }}>
            <EmptyState
              title="The organiser console is for organisers"
              body="This is where you'd manage the events you run — tickets sold, questions from attendees, who walked in, and what you earned. Set yourself up as an organiser and it opens, showing only your own events."
              action={
                <Link href="/organizer/onboarding">
                  <ConsoleButton tone="green">Become an organiser</ConsoleButton>
                </Link>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />

      {/* Column below lg so ConsoleSidebar's scrolling strip sits ABOVE the
          content; a row only from lg, where the strip yields to the rail.
          As a plain row the strip was a flex sibling of <main> and, with
          `flex-1` (basis 0) on main, took every pixel — the console rendered
          as a ~0px-wide column on phones. */}
      <div className="flex flex-col lg:flex-row lg:items-start">
        <ConsoleSidebar badges={{ "/organizer/events": events.length }} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-7 lg:py-8">
          <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: PAGE_MAX_WIDTH }}>
            {/* ── Page header ── */}
            <header className="flex items-end justify-between gap-5 flex-wrap">
              <div className="min-w-0">
                {/* ⚠️ NO DATE LINE ABOVE THE HEADING (Gautham, 2026-09-11). A
                    "Friday 11 September" eyebrow used to sit here, on every
                    console section. It went: the person reading the console
                    knows what day it is, and the line only pushed the h1 down.
                    The greeting still reads the user's clock — see useToday. */}
                {/* ⚠️ THE SITE'S SECTION-HEADING RECIPE, not a dashboard title
                    (Gautham, 2026-08-22): `font-extrabold` + `-0.5px` tracking +
                    a clamp, exactly as EventsCarousel sets "Events in {city}"
                    and one step larger because this is an h1 over a whole
                    section rather than a row. It was `text-[28px] font-bold
                    tracking-[-0.01em]` — near enough to the public heading to
                    look like a mistake rather than a difference. */}
                <h1
                  className="font-extrabold tracking-[-0.5px]"
                  style={{ fontSize: "clamp(24px, 4vw, 32px)", color: "var(--brand-text)" }}
                >
                  {title}
                </h1>
                {section.sub && (
                  <p
                    className="text-[17px] mt-1.5 max-w-[680px]"
                    style={{ color: "var(--brand-hint)", textWrap: "pretty" }}
                  >
                    {section.sub}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Inert until there is an organiser-scoped search endpoint —
                    a box that swallows a query is worse than one that says it
                    is not ready. Disabled, not hidden, so the header keeps its
                    designed shape. */}
                <div
                  className="hidden sm:flex items-center gap-2 rounded-lg px-3.5 py-2.5 min-w-[296px]"
                  style={{
                    backgroundColor: "var(--brand-surface)",
                    /* Brand black, not the pale nav-border grey (Gautham,
                       2026-09-11) — the box sits on --brand-surface, which
                       equals the page ground in light mode, so a 1.55:1 line
                       left it floating. --brand-text follows the theme, so it
                       is the linen-safe near-black here and the warm off-white
                       in dark mode. */
                    border: "1px solid var(--brand-text)",
                    color: "var(--brand-muted)",
                    opacity: 0.85,
                  }}
                  title="Console search arrives with the organiser backend"
                >
                  <SearchIcon className="w-[18px] h-[18px] shrink-0" />
                  <span className="text-[17px]">Search events, attendees…</span>
                </div>

                {/* ⚠️ No "N need you" pill here — removed 2026-09-02 (Gautham).
                    It was a <span>, not a link, so it named a number of chores
                    and gave you nowhere to go, while the "Notifications"
                    column on the Events hero said the same thing WITH links one
                    screen below. Its two signals (refund requested, unpaid)
                    are owed to the navbar's notification bell instead —
                    TODO.md §24. Do not reinstate a counter here. */}
              </div>
            </header>

            {children}

            {isDummyMode && (
              <p className="text-[15px]" style={{ color: "var(--brand-hint)", opacity: 0.75 }}>
                Sample data — <code>NEXT_PUBLIC_DATA_MODE=dummy</code>. Figures here are made up.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
