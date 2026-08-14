"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsSource } from "@/lib/data-source";
// Every <Link> in this file is currently parked (the per-slide CTA and the
// Explore/Publish pair). Restore this import with whichever one comes back.
// import Link from "next/link";
import { EVENT_FORMATS } from "@eventmind/types";

// Local hero images live in apps/web/public/hero/. Paths are served from the public
// root, so "/hero/hero-2.png" → public/hero/hero-2.png. (hero-1 and hero-6 removed.)
//
// The hero has two MODES — Events and Communities — driven by the segmented toggle.
// A mode owns everything on both sides: the left copy AND the five slide CTAs. The
// five photos are shared; only their labels and destinations change, so the carousel
// keeps its position across a toggle.
//
// Each slide's href applies the filter its label promises, so the click delivers what
// it says. For EVENTS, offline/online are the event_type FORMAT filter, never a
// category (format and category are orthogonal; "online" is not a category). For
// COMMUNITIES there is no format filter at all — /explore's community query only
// honours q + category + city — so "online" is expressed with the `Online` pseudo-city
// instead, and the food-market photo takes a category rather than a bogus format.
type Slide = { src: string; label: string; href: string };
type ModeKey = "events" | "communities";

type SubLine = { bold?: string; text: string; textWithCount?: string };

type Mode = {
  toggleLabel: string;
  eyebrow: string;
  // Both are one-line-per-entry, joined by explicit <br />s. The headline is a
  // spoken exchange, so each entry is one TURN and the breaks are meaning, not
  // typography — never let two speakers reflow into each other. Length is free
  // (events runs three turns, communities two).
  headline: string[];
  // A body line. `bold` renders before `text` in <strong>. `textWithCount` is
  // used INSTEAD of `text` once the live event count is known — the pair exists so
  // that a failed or in-flight count degrades to a sentence that still reads, rather
  // than to "About  options". Never bake a hardcoded number into `text`.
  // PARKED 2026-08-14 (MVP) — this was the 2-tuple `[SubLine, SubLine]`. The
  // events mode dropped to a single line when communities were deferred to
  // Phase 2 (its line 2 named them); the communities mode still carries two.
  // The renderer maps over this, so a variable length is fine.
  // PHASE 2 RESTORE: put `[SubLine, SubLine]` back once the events line 2 returns.
  subcopy: SubLine[];
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  slides: Slide[];
};

const EVENTS = "/explore?view=events";
const COMMUNITIES = "/explore?view=communities";

const cat = (base: string, c: string) => `${base}&category=${encodeURIComponent(c)}`;

const IMG = {
  market: "/hero/hero-3.png", // night food market
  videoCall: "/hero/hero-2.png", // woman on a video call
  meditation: "/hero/hero-4.png", // sunrise meditation
  tableTennis: "/hero/hero-5.png", // table tennis match
  painting: "/hero/hero-7.png", // kids painting at easels
} as const;

const MODES: Record<ModeKey, Mode> = {
  events: {
    toggleLabel: "Events",
    eyebrow: "Online & offline",
    // Three spoken turns. ⚠️ The LONGEST is turn 2 ("No idea. What about you?"),
    // not turn 1 — it measures 564px at the 46px cap, and that is what sets the
    // 600px block width. It is a close fit, so **any reword longer than ~26
    // characters needs a re-measure**, not a guess.
    //
    // No non-breaking spaces here, and none needed. The previous copy had a
    // 38-character turn that could not fit at any usable size, so its words were
    // NBSP-bound to control the wrap — and a bound run cannot break, which is
    // what overflowed the page at 320px. Short turns avoid that class of bug
    // entirely. Prefer copy that fits over machinery that forces it to.
    headline: [
      "“What do you want to do?”",
      "“No idea. What about you?”",
      "“Same.”",
    ],
    subcopy: [
      {
        // PARKED 2026-08-14 (MVP) — textWithCount was
        // " About {count} options, near you or online." Gautham's call: name the
        // thing, now that events are the only thing on offer.
        bold: "Leave it with us.",
        text: " Near you or online.",
        textWithCount: " About {count} events, near you or online.",
      },
      // PARKED 2026-08-14 (MVP) — the second subcopy line read "Join a one-off
      // event, or a community." Communities are deferred to Phase 2, so the block
      // is a single line for the MVP.
      // { text: "Join a one-off event, or a community." },
    ],
    primary: { label: "Explore events", href: EVENTS },
    secondary: { label: "Publish an event", href: "/organizer/create" },
    slides: [
      { src: IMG.market, label: "Find offline events", href: `${EVENTS}&event_type=${encodeURIComponent(EVENT_FORMATS.inPerson)}` },
      { src: IMG.videoCall, label: "Find online events", href: `${EVENTS}&event_type=${encodeURIComponent(EVENT_FORMATS.online)}` },
      { src: IMG.meditation, label: "Find wellness events", href: cat(EVENTS, "Health & Wellness") },
      { src: IMG.tableTennis, label: "Find sports events", href: cat(EVENTS, "Sports") },
      { src: IMG.painting, label: "Find workshops", href: cat(EVENTS, "Creative") },
    ],
  },
  communities: {
    toggleLabel: "Communities",
    eyebrow: "Find your people",
    headline: ["Every community", "worth joining."],
    subcopy: [
      { text: "Runners, builders, painters, home cooks and night-owl gamers." },
      { text: "Join a group that meets near you or online — or start your own." },
    ],
    primary: { label: "Explore communities", href: COMMUNITIES },
    secondary: { label: "Publish a community", href: "/community/create" },
    slides: [
      // No format filter exists for communities, so this photo takes the category
      // that actually matches it rather than a fake "offline" filter.
      { src: IMG.market, label: "Find food & drink communities", href: cat(COMMUNITIES, "Food & Drink") },
      { src: IMG.videoCall, label: "Find online communities", href: `${COMMUNITIES}&city=Online` },
      { src: IMG.meditation, label: "Find wellness communities", href: cat(COMMUNITIES, "Health & Wellness") },
      { src: IMG.tableTennis, label: "Find sports communities", href: cat(COMMUNITIES, "Sports") },
      { src: IMG.painting, label: "Find creative communities", href: cat(COMMUNITIES, "Creative") },
    ],
  },
};

const SLIDE_COUNT = MODES.events.slides.length;

const DURATION = 1500;
// DX controls how pronounced the diagonal is (% of width offset between top and bottom edge)
const DX = 8;
// Extra sweep range so the full image is covered at t=1
const SWEEP = 100 + 22 + DX * 2;

// "About N options" is rounded to the nearest 10 (Gautham's call) — an exact live
// number reads as a dashboard stat, and it would tick between page loads.
//
// Returns null below 10 rather than rounding: a catalogue of 4 would round to "0
// options", and "10" would be an overstatement. Null drops the clause entirely, so
// the sentence degrades to "Leave it with us. Near you or online." — true at any size.
function roundOptions(count: number | undefined): number | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 10) return null;
  return Math.round(count / 10) * 10;
}

function renderLine(line: SubLine, options: number | null): string {
  if (options === null || !line.textWithCount) return line.text;
  return line.textWithCount.replace("{count}", String(options));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Diagonal clip-path that mirrors Flutter's ShaderMask wipe:
// bottom-left reveals first, top-right last.
// topEdge is behind bottomEdge, creating the counterclockwise tilt.
function buildClipPath(progress: number): string {
  const gx = progress * SWEEP - 22; // sweeps from -22% to (100 + DX*2)%
  const topEdge = gx - DX;
  const bottomEdge = gx + DX;
  return `polygon(0% 0%, ${topEdge}% 0%, ${bottomEdge}% 100%, 0% 100%)`;
}

export function HeroCarousel() {
  // Pinned to "events" while the mode toggle is parked (see the commented-out
  // segmented control below). Restore `setMode` here when the toggle comes back.
  const [mode] = useState<ModeKey>("events");

  // Live catalogue size for the body's "About N options". `retry: false` because
  // the hero must never block or thrash on this — if it fails, `roundOptions`
  // returns null and the sentence drops the clause instead of showing a number
  // we cannot stand behind. Cached 5 min: the total barely moves, and this fires
  // on every home-page visit.
  const { data: eventCount } = useQuery({
    queryKey: ["event-count"],
    queryFn: () => eventsSource.count().then((r) => r.data.count),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const optionCount = roundOptions(eventCount);
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);

  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const animatingRef = useRef(false);
  const currentRef = useRef(0);

  const runAnimation = useCallback((targetIdx: number) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setNext(targetIdx);
    setAnimating(true);
    setProgress(0);
    startRef.current = performance.now();

    function frame(now: number) {
      const raw = Math.min((now - startRef.current) / DURATION, 1);
      setProgress(easeInOut(raw));
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        currentRef.current = targetIdx;
        setCurrent(targetIdx);
        setAnimating(false);
        setProgress(0);
        animatingRef.current = false;
      }
    }
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  const advance = useCallback(() => {
    if (animatingRef.current) return;
    runAnimation((currentRef.current + 1) % SLIDE_COUNT);
  }, [runAnimation]);

  useEffect(() => {
    timerRef.current = setInterval(advance, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [advance]);

  function goTo(index: number) {
    if (animatingRef.current || index === currentRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    runAnimation(index);
    timerRef.current = setInterval(advance, 4000);
  }

  // The CTA swaps at the wipe's halfway point, so the label matches whichever
  // photo is covering most of the panel. The dots follow the same rule.
  const activeIdx = animating ? (progress > 0.5 ? next : current) : current;
  const m = MODES[mode];
  // Only the parked per-slide CTA consumed this; `activeIdx` still drives the dots.
  // Restore alongside the commented-out <Link> in the image panel.
  // const activeSlide = m.slides[activeIdx];
  const clipPath = buildClipPath(progress);

  return (
    // ⚠️ THE HERO IS THE ONE SURFACE NOT CAPPED AT THE 1400px PAGE COLUMN.
    // Gautham, 2026-08-11: at 1920 the cap left ~260px of dead margin on each side
    // before the gutter even began, and the copy sat marooned against it. The grid
    // now spans the full viewport inside the standard gutters and splits 50/50, so
    // the copy column IS the page's left half. **This is not the rejected edge-bleed
    // variant** — nothing crosses the gutter; the panel still stops where every
    // other section stops. Do not "restore" maxWidth 1400 here.
    <section className="w-full px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
      {/* 50/50: copy left, photo right. Was 1fr_1.35fr inside the capped column. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* ── Right: rotating image panel ──────────────────────────────── */}
        {/* order-2 everywhere: on mobile the copy leads and the image sits below;
            at lg the image takes the wider right column. Fully rounded — it is
            contained now, no off-screen edge.

            ⚠️ The panel is 16/9 at EVERY width because that is the native aspect of
            every photo in /public/hero (1376–1408 × 768). object-cover only crops
            when the panel disagrees with the source, so matching it means nothing is
            cut. The old `lg:h-[min(82vh,820px)]` made the panel near-square (~777×738)
            and threw away ~40% of each photo's width — Gautham's "cut off in the
            middle". Do not pin a height here again; re-crop the source images first. */}
        {/* The 5px green frame is Gautham's explicit call (2026-08-11), not the
            app's border system — it is decoration on a photo, not a control, so
            neither the 2px `--brand-control-border` rule nor `--brand-border`
            applies. Note `aspect-[16/9]` sizes the BORDER box (Tailwind sets
            box-sizing: border-box), so the frame eats 10px of the photo rather
            than growing the panel. */}
        <div
          className="relative w-full overflow-hidden rounded-2xl aspect-[16/9] order-2"
          style={{ backgroundColor: "#111827", border: "5px solid var(--brand-green)" }}
        >
          {/* Outgoing image — static, no animation */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.slides[current].src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => runAnimation((currentRef.current + 1) % SLIDE_COUNT)}
          />

          {/* Incoming image — revealed by diagonal clip-path wipe */}
          {animating && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.slides[next].src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath }}
            />
          )}

          {/* Bottom scrim so the CTA and dots stay legible on any photo */}
          <div
            className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
          />

          {/* PARKED 2026-08-11 at Gautham's request — the per-slide CTA ("Find offline
              events", "Find wellness events", "Find online communities", …). Its label
              and destination swapped with the photo at the wipe's halfway point.

              Not dead: every slide in MODES still carries the `label` + `href` this
              rendered, so restoring it is uncommenting this block, the `activeSlide`
              line above, and the `next/link` import at the top of the file.

          <Link
            href={activeSlide.href}
            className="absolute bottom-5 left-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors"
            style={{ backgroundColor: "var(--brand-terracotta)", color: "var(--brand-on-terracotta)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--brand-terracotta-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--brand-terracotta)"; }}
          >
            {activeSlide.label}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          */}

          {/* Navigation dots — CENTERED. They sat bottom-right to stay clear of the
              per-slide CTA in the bottom-left; with that CTA parked the panel's whole
              bottom edge is free, so they centre. Move them back to `right-5` if the
              CTA ever comes back. */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {m.slides.map((slide, i) => (
              <button
                key={slide.src}
                onClick={() => goTo(i)}
                aria-label={slide.label}
                className="h-1 rounded-full transition-all duration-300"
                // White, not terracotta — the CTA is terracotta now, and two
                // terracotta elements on one photo read as the same control.
                style={{
                  width: activeIdx === i ? 28 : 8,
                  backgroundColor: activeIdx === i ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Left: copy (everything here is mode-driven) ──────────────── */}
        {/* The BLOCK is centred in the page's left half; the LINES stay left-aligned
            (Gautham's call — centred lines lose the common left edge the rest of the
            site reads on). `max-w-[560px]` is what makes centring mean anything: a
            full-width block has nothing to centre. 560 is measured, not chosen — it
            is the LONGEST spoken turn's width at the 46px cap, plus a little air. */}
        <div className="order-1 w-full max-w-[600px] mx-auto">
          {/* PARKED 2026-08-11 at Gautham's request — the Events / Communities
              segmented toggle. Not deleted: the whole `communities` mode is still
              wired and this is the only thing that reaches it. To restore, uncomment
              and put `setMode` back in the useState destructure above.

              ⚠️ UPDATE 2026-08-14 — do NOT restore this on its own. Communities
              were cut from the MVP and deferred to Phase 2 app-wide, so
              MODES.communities now points at routes that redirect to home
              (/explore?view=communities and /community/create). Restoring the
              toggle means un-parking the whole feature: grep `PARKED 2026-08-14`.

          <div
            className="inline-flex p-1 rounded-xl mb-6"
            style={{ backgroundColor: "var(--brand-bg)", border: "2px solid var(--brand-control-border)" }}
          >
            {(Object.keys(MODES) as ModeKey[]).map((key) => {
              const active = key === mode;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  aria-pressed={active}
                  className="px-5 py-2 rounded-lg font-semibold transition-colors"
                  style={{
                    backgroundColor: active ? "var(--brand-green)" : "transparent",
                    color: active ? "var(--brand-on-green)" : "var(--brand-text)",
                  }}
                >
                  {MODES[key].toggleLabel}
                </button>
              );
            })}
          </div>

          */}

          {/* ⚠️ The size formula is a MEASUREMENT, not a taste call — re-measure if
              you touch this copy or the 50/50 split.

              `calc(4.1vw - 6px)` tracks the copy block's own growth. The block is
              `min(600px, half the page)`, so between lg and ~1280px it is the half
              that binds and the font has to shrink with it. The constraint is that
              **each spoken turn holds on one line** (a turn needs ~12.4× the font
              size in px) — a wrapped turn reads as prose, not as someone talking.
              A plain vw with no offset fails it: vw grows faster than the block does
              between lg and ~1280, which is exactly where turns started wrapping.

              46px cap is what that constraint allows inside the 560px block for the
              longest turn. Below lg the layout stacks and the clamp floor takes over;
              at 320px the longest turn wraps, which is unavoidable and harmless. */}
          <h1
            className="font-bold leading-[1.15] mb-5"
            style={{ color: "var(--brand-green)", fontSize: "clamp(26px, calc(4.0vw - 6px), 46px)" }}
          >
            {m.headline.map((turn, i) => (
              <Fragment key={turn}>
                {i > 0 && <br />}
                {turn}
              </Fragment>
            ))}
          </h1>

          {/* PARKED 2026-08-11 at Gautham's request — the terracotta eyebrow.
              The body copy's "near you or online" says what "Online & offline"
              said, and the two sat one line apart. Still on the Mode type and in
              both MODES entries, so this uncomments as-is.

          <p
            className="font-bold tracking-widest uppercase mb-3"
            style={{ color: "var(--brand-terracotta)" }}
          >
            {m.eyebrow}
          </p>

          */}

          {/* mb-0 because the CTA pair below is parked — restore mb-8 with it.
              No max-width: each line is one written sentence and should sit on one
              line, so the block decides the measure. `max-w-md` (448px) used to cap
              it ~100px short and forced both sentences to wrap.

              Left-aligned, so both sentences share one left edge with each other and
              with the exchange above. A centred version was tried on 2026-08-11 and
              reverted the same day — centring gave every line its own start, and
              "Join a one-off event…" no longer lined up under "Leave it with us."

              ⚠️ 24px is a deliberate departure from the 18px page-subtitle standard
              in DESIGN_NOTES §8 — Gautham asked for +6px and called it "for now", so
              treat it as provisional rather than a new site-wide precedent. It is
              the number that makes the first sentence a tight fit (580px in a 600px
              block); anything larger wraps it at every width. */}
          <p className="mb-0" style={{ color: "var(--brand-text)", fontSize: 24, lineHeight: 1.6 }}>
            {m.subcopy.map((line, i) => (
              <Fragment key={line.text}>
                {i > 0 && <br />}
                {line.bold && <strong>{line.bold}</strong>}
                {renderLine(line, optionCount)}
              </Fragment>
            ))}
          </p>

          {/* PARKED 2026-08-11 at Gautham's request — the Explore / Publish pair.
              The per-slide terracotta CTA on the photo already covers "explore", and
              publishing is reachable from the navbar. `primary` / `secondary` stay on
              the Mode type and in MODES so this uncomments as-is.

          <div className="flex flex-wrap gap-3">
            <Link
              href={m.primary.href}
              className="px-7 py-3.5 rounded-xl font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--brand-green)", color: "var(--brand-on-green)" }}
            >
              {m.primary.label}
            </Link>
            <Link
              href={m.secondary.href}
              className="px-7 py-3.5 rounded-xl font-bold transition-colors"
              style={{
                backgroundColor: "var(--brand-surface)",
                color: "var(--brand-text)",
                border: "2px solid var(--brand-control-border)",
              }}
            >
              {m.secondary.label}
            </Link>
          </div>

          */}

        </div>
      </div>
    </section>
  );
}
