"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const IMAGES = [
  "https://images.unsplash.com/photo-1540575861501-7ad060e39fe1?w=1000&q=75",
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1000&q=75",
  "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1000&q=75",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000&q=75",
];

const DURATION = 1500;
// DX controls how pronounced the diagonal is (% of width offset between top and bottom edge)
const DX = 8;
// Extra sweep range so the full image is covered at t=1
const SWEEP = 100 + 22 + DX * 2;

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
    runAnimation((currentRef.current + 1) % IMAGES.length);
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

  const activeDot = animating ? (progress > 0.5 ? next : current) : current;
  const clipPath = buildClipPath(progress);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 560, backgroundColor: "#111827" }}>
      {/* Outgoing image — static, no animation */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={IMAGES[current]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => runAnimation((currentRef.current + 1) % IMAGES.length)}
      />

      {/* Incoming image — revealed by diagonal clip-path wipe */}
      {animating && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={IMAGES[next]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath }}
        />
      )}

      {/* Left gradient for text legibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, transparent 75%)",
        }}
      />

      {/* Text overlay */}
      <div className="absolute left-16 top-0 bottom-14 w-[520px] flex flex-col justify-center">
        <div
          className="self-start px-3.5 py-1.5 rounded-full text-white text-[13px] font-semibold tracking-[0.3px] mb-[22px]"
          style={{
            backgroundColor: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          ✦&nbsp;&nbsp;AI-Powered Event Discovery
        </div>

        <h1
          className="text-white font-extrabold tracking-[-1px] mb-4"
          style={{ fontSize: 58, lineHeight: 1.08 }}
        >
          Experience the<br />Extraordinary.
        </h1>

        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
          Discover events, summits & networking<br />near you — curated by AI.
        </p>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 pointer-events-none">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="h-1 rounded-full transition-all duration-300 pointer-events-auto"
            style={{
              width: activeDot === i ? 28 : 8,
              backgroundColor: activeDot === i ? "white" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
