"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Local hero images live in apps/web/public/hero/. Paths are served from the public
// root, so "/hero/hero-2.png" → public/hero/hero-2.png. (hero-1 and hero-6 removed.)
const IMAGES = [
  "/hero/hero-2.png",
  "/hero/hero-3.png",
  "/hero/hero-4.png",
  "/hero/hero-5.png",
  "/hero/hero-7.png",
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
    <div
      className="relative w-full overflow-hidden"
      style={{
        // Hero images are 16:9 — match that ratio so the full image shows without
        // cropping. maxHeight keeps it from dominating on very wide / ultrawide screens.
        aspectRatio: "16 / 9",
        maxHeight: "85vh",
        backgroundColor: "#111827",
      }}
    >
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
