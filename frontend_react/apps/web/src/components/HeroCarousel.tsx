"use client";

import { useState, useEffect, useRef, useCallback, Fragment, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsSource } from "@/lib/data-source";
// Every <Link> in this file is currently parked (the per-slide CTA and the
// Explore/Publish pair). Restore this import with whichever one comes back.
// import Link from "next/link";
import { GUTTERS } from "@/lib/layout";
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
  const [tones, setTones] = useState<Record<string, "light" | "dark">>({});
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  function measureTone(image: HTMLImageElement) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 16;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      // Sample the left side where the copy lives, not the overall photo hue.
      context.drawImage(image, 0, 0, image.naturalWidth * 0.65, image.naturalHeight, 0, 0, 24, 16);
      const pixels = context.getImageData(0, 0, 24, 16).data;
      let brightness = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        brightness += (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
      }
      const tone = brightness / (pixels.length / 4) > 0.43 ? "dark" : "light";
      const source = image.getAttribute("src")!;
      setTones(previous => previous[source] === tone ? previous : { ...previous, [source]: tone });
    } catch {
      // A missing/foreign image keeps the safe light-text/dark-scrim fallback.
    }
  }

  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const animatingRef = useRef(false);
  const currentRef = useRef(0);

  const runAnimation = useCallback((targetIdx: number) => {
    if (animatingRef.current) return;
    if (reducedMotion) {
      currentRef.current = targetIdx;
      setCurrent(targetIdx);
      return;
    }
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
  }, [reducedMotion]);

  const advance = useCallback(() => {
    if (animatingRef.current) return;
    runAnimation((currentRef.current + 1) % SLIDE_COUNT);
  }, [runAnimation]);

  useEffect(() => {
    if (!paused && !reducedMotion) timerRef.current = setInterval(advance, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advance, paused, reducedMotion]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function goTo(index: number) {
    if (animatingRef.current || index === currentRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    runAnimation(index);
    if (!paused && !reducedMotion) timerRef.current = setInterval(advance, 4000);
  }

  // The CTA swaps at the wipe's halfway point, so the label matches whichever
  // photo is covering most of the panel. The dots follow the same rule.
  const activeIdx = animating ? (progress > 0.5 ? next : current) : current;
  const m = MODES[mode];
  // Only the parked per-slide CTA consumed this; `activeIdx` still drives the dots.
  // Restore alongside the commented-out <Link> in the image panel.
  // const activeSlide = m.slides[activeIdx];
  const clipPath = buildClipPath(progress);

  const tone = tones[m.slides[activeIdx].src] ?? "light";
  const heroStyle = {
    "--hero-foreground": tone === "light" ? "#F2EFEA" : "#0F1A18",
    "--hero-wash": tone === "light" ? "15, 26, 24" : "242, 239, 234",
  } as CSSProperties;

  return (
    <section aria-label="Discover NewFind" aria-roledescription="carousel"
      className="nf-home-hero relative isolate w-full overflow-hidden" style={heroStyle}>
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        {/* The existing diagonal wipe requires img rather than next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.slides[current].src} alt="" fetchPriority="high" loading="eager"
          className="absolute inset-0 h-full w-full object-cover" onLoad={event => measureTone(event.currentTarget)} />
        {animating && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.slides[next].src} alt="" className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath }} onLoad={event => measureTone(event.currentTarget)} />
        )}
      </div>
      {/* The wash guarantees contrast even on a bright patch or during a wipe.
          Its color changes atomically with the text, never through muddy gray. */}
      <div className="nf-home-hero-wash absolute inset-0 -z-10 pointer-events-none" aria-hidden="true" />
      <div className={`${GUTTERS} relative mx-auto flex min-h-[420px] w-full items-center py-16 pb-24 sm:min-h-[460px] lg:min-h-[520px] lg:py-24`}>
        <div className="w-full max-w-[650px]">
          <h1 className="nf-hero-title mb-5" style={{ color: "var(--hero-foreground)" }}>
            {m.headline.map((turn, index) => (
              <Fragment key={turn}>{index > 0 && <br />}{turn}</Fragment>
            ))}
          </h1>
          <p className="nf-body mb-0" style={{ color: "var(--hero-foreground)" }}>
            {m.subcopy.map((line, index) => (
              <Fragment key={line.text}>
                {index > 0 && <br />}
                {line.bold && <strong>{line.bold}</strong>}{renderLine(line, optionCount)}
              </Fragment>
            ))}
          </p>
        </div>
      </div>
      <div className={`${GUTTERS} absolute inset-x-0 bottom-4 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-1 rounded-lg bg-black/65 px-2" aria-label="Choose hero image">
          {m.slides.map((slide, index) => (
            <button key={slide.src} type="button" onClick={() => goTo(index)} aria-label={slide.label}
              aria-pressed={activeIdx === index}
              className="flex h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-white">
              <span className="block h-1 rounded-full bg-white" style={{ width: activeIdx === index ? 28 : 8, opacity: activeIdx === index ? 1 : 0.6 }} />
            </button>
          ))}
        </div>
        {!reducedMotion && (
          <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}
            aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
            className="min-h-11 rounded-lg bg-black/65 px-4 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-white">
            {paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>
    </section>
  );
}
