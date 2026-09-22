"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The segmented switch: a bordered track holding one green pill that TRAVELS
//  between the choices.
//
//  ⚠️ ONE CONTROL, TWO PLACES (Gautham, 2026-09-11). `/explore`'s Format filter
//  and the forms' Event Type switch are the same control and must look the same:
//  a 2px `--brand-control-border` track on `--brand-bg`, 4px of inset, and a
//  green `rounded-md` pill under the chosen label. The forms used to draw a
//  flush three-button strip with each segment painting its own background —
//  same idea, different silhouette, and nothing slid. `/explore` is the
//  reference surface, so the forms moved to it.
//
//  ⚠️ THE PILL IS ONE ELEMENT, AND THAT IS THE WHOLE POINT. Painting the
//  background on the chosen button can only ever cross-fade — the old green
//  disappears here while a new one appears there. A single positioned pill has
//  somewhere to travel FROM, which is what makes the switch read as dragged
//  rather than re-lit. It is measured from the live buttons rather than computed
//  from an index because the segments are not all the same width on `/explore`
//  ("All" against "In-Person"), and on a narrow sidebar the track may wrap — so
//  `top` is animated alongside `left`.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Thumb = { left: number; top: number; width: number; height: number };

/* The pill is placed from a real measurement, so it has to be positioned before
   the browser paints — but a layout effect on the server is a React warning and
   these pages prerender. There is nothing to measure there anyway: the pill
   renders only once `thumb` exists, so the server and the client's first pass
   both draw a bare track and hydration matches. */
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fill,
  ariaLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /**
   * Equal-width segments filling the line, for a form field whose width is set
   * by the row around it. Without it the segments take their natural width and
   * the track hugs them, which is what `/explore`'s sidebar wants.
   */
  fill?: boolean;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState<Thumb | null>(null);
  // The pill must not travel in from the corner on first paint: it is placed
  // once with no transition, and only then armed for the slide.
  const [armed, setArmed] = useState(false);

  const index = options.indexOf(value);

  useMeasureEffect(() => {
    const measure = () => {
      const el = buttonRefs.current[index];
      if (!el || !trackRef.current) return;
      // offsetLeft/offsetTop are relative to the track, which is `relative`.
      setThumb({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    };

    measure();

    // A resized sidebar, a wrapped track or a late webfont all move the
    // segments under the pill; re-measuring keeps it on top of its label.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    for (const el of buttonRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [index, options]);

  useMeasureEffect(() => {
    if (!thumb || armed) return;
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, [thumb, armed]);

  return (
    <div
      ref={trackRef}
      role="group"
      aria-label={ariaLabel}
      className={`relative rounded-lg p-1 gap-1 ${fill ? "flex w-full" : "inline-flex flex-wrap"}`}
      style={{ border: "2px solid var(--brand-control-border)", backgroundColor: "var(--brand-bg)" }}
    >
      {thumb && (
        <span
          aria-hidden
          className={`absolute rounded-md ${armed ? "nf-seg-thumb" : ""}`}
          style={{
            left: thumb.left,
            top: thumb.top,
            width: thumb.width,
            height: thumb.height,
            backgroundColor: "var(--brand-green)",
          }}
        />
      )}

      {options.map((option, i) => {
        const active = option === value;
        return (
          <button
            key={option}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={
              "nf-seg-label relative rounded-md text-sm font-bold whitespace-nowrap " +
              // No horizontal padding when the segments are already equal: at
              // `sm` the Event Type field leaves 73px a segment against a
              // 66.5px "In-Person", and padding is what would spend it. The
              // 8px of vertical (`py-2`) is not free either — it is what puts
              // the track at the same 49px as a form input beside it.
              (fill ? "flex-1 min-w-0 py-2" : "px-3.5 py-1.5")
            }
            style={{ color: active ? "var(--brand-on-green)" : "var(--brand-text)" }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
