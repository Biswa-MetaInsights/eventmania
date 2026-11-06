"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocationStore, DEFAULT_CITY } from "@eventmind/store";
import { GUTTERS } from "@/lib/layout";
import { LocationPinIcon } from "./EventIcons";
import { LocationSelector } from "./LocationSelector";

export function CityPicker({ variant = "pill", label }: { variant?: "pill" | "icon" | "inline"; label?: string } = {}) {
  const ready = useLocationStore(s => s._hasHydrated);
  const selected = useLocationStore(s => s.selectedCity);
  const setCity = useLocationStore(s => s.setCity);
  const city = ready ? selected : DEFAULT_CITY;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    // Handle the nested picker before the parent mobile menu.
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  return (
    <div className="relative min-w-0" ref={ref}>
      <button ref={trigger} type="button" onClick={() => setOpen(value => !value)}
        aria-label={label || `Select city, currently ${city.name}`} aria-expanded={open} aria-controls={open ? popupId : undefined}
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 py-2 max-w-[180px] hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-text)]">
        <LocationPinIcon className="w-4 h-4 shrink-0" />
        {variant !== "icon" && <span className="truncate">{label || city.name}</span>}
      </button>
      {open && (
        <div id={popupId} role="region" aria-label="Choose search location"
          className="absolute right-0 top-full mt-2 p-4 w-[320px] max-w-[calc(100vw-32px)] max-h-[70dvh] overflow-y-auto overscroll-contain rounded-lg shadow-xl z-[90] border border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <LocationSelector value={city} onChange={next => { setCity(next); setOpen(false); trigger.current?.focus(); }} />
        </div>
      )}
    </div>
  );
}

export function LocationPrompt() {
  const ready = useLocationStore(s => s._hasHydrated);
  const confirmed = useLocationStore(s => s.hasSelectedCity);
  const city = useLocationStore(s => s.selectedCity);
  // Preserve existing users' non-default selections from older store versions.
  if (!ready || confirmed || city.lat !== DEFAULT_CITY.lat || city.lng !== DEFAULT_CITY.lng) return null;
  return (
    <section aria-label="Set your search location" className={`${GUTTERS} pb-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 text-[var(--brand-text)]">
        <div className="min-w-0 flex-1 basis-60">
          <p className="font-bold">Find events near you</p>
          <p className="mt-1 text-sm">New York is the starting location. Choose your city or use your location to explore events within 200 km.</p>
        </div>
        <CityPicker label="Choose city" />
      </div>
    </section>
  );
}
