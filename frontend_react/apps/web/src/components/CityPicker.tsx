"use client";

import { useState, useRef, useEffect } from "react";
import { useLocationStore, CITIES, DEFAULT_CITY } from "@eventmind/store";
import type { City } from "@eventmind/store";
import { BRAND } from "@/lib/theme";
import { LocationPinIcon } from "./EventIcons";
import { EditPencil } from "./EditPencil";

// Theme-aware tokens (resolve via CSS vars, see globals.css)
const GREEN = BRAND.green;
const SURFACE = BRAND.surface;
const ON_GREEN = BRAND.onGreen;
const TEXT = BRAND.text;
const BORDER = BRAND.border;
const HINT = BRAND.hint;
// Subtle brand-tinted fills for the selected/hover list rows (adapt to theme).
const SEL_BG = "color-mix(in srgb, var(--brand-green) 12%, transparent)";
const HOVER_BG = "color-mix(in srgb, var(--brand-green) 8%, transparent)";

// Country flag emoji from ISO code (globe for the flag-less "Online" pseudo-city)
function countryFlag(code: string): string {
  if (!code) return "🌐";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

export function CityPicker({ variant = "pill" }: { variant?: "pill" | "icon" | "inline" } = {}) {
  const _selectedCity = useLocationStore((s) => s.selectedCity);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);
  const selectedCity = hasHydrated ? _selectedCity : DEFAULT_CITY;
  const setCity = useLocationStore((s) => s.setCity);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.country.toLowerCase().includes(query.toLowerCase())
      )
    : CITIES;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function select(city: City) {
    setCity(city);
    setOpen(false);
    setQuery("");
  }

  return (
    <div
      className={`${variant === "icon" ? "" : "relative"} inline-flex items-center`}
      ref={dropdownRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Trigger */}
      {variant === "icon" ? (
        // Pencil "edit location" trigger — relative wrapper is kept here for the tooltip only;
        // the dropdown uses the nearest positioned ancestor (EventsCarousel heading wrapper)
        // so it opens left-aligned to the city name text.
        // ⚠️ `EditPencil` IS this trigger, lifted out verbatim on 2026-09-02 so
        // /event/[id]'s "edit the event details" pencil is the same object
        // rather than a second copy of the same path and tooltip. The rendered
        // markup is unchanged — the glyph moved to `EventIcons.PencilLineIcon`
        // and the hover state now lives on the button instead of this
        // component's root, which is equivalent here because the root holds
        // nothing else while the dropdown is closed.
        <EditPencil
          tooltip="Click here to change your location"
          label="Edit location"
          onClick={() => setOpen((v) => !v)}
          active={open}
        />
      ) : variant === "inline" ? (
        // Inline trigger for the navbar "Add Location" slot — pin + selected city
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 shrink-0"
          aria-label="Select city"
          style={{ color: hovered || open ? GREEN : TEXT }}
        >
          <LocationPinIcon />
          <span className="text-base whitespace-nowrap truncate max-w-[160px]">
            {selectedCity.name}
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: open ? GREEN : SURFACE,
            color: open ? ON_GREEN : TEXT,
            border: `2px solid var(--brand-control-border)`,
          }}
        >
          <LocationPinIcon />
          <span>{selectedCity.name}</span>
          <svg
            className="w-3.5 h-3.5 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}

      {/* Hover tooltip (non-icon variants only — icon variant has its own nested tooltip above) */}
      {variant !== "icon" && hovered && !open && (
        <span
          /* lg+ only: it opens rightward from a trigger that sits near the right
             edge of the mobile panel, so below lg it ran off the viewport. Also
             off on any no-hover device (an iPad is lg): a tap fires mouseenter
             with no mouseleave to follow, so it would stick open. */
          className="hidden lg:block [@media(hover:none)]:hidden absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg z-50 pointer-events-none"
          style={{ backgroundColor: SURFACE, color: GREEN, border: `1px solid ${BORDER}` }}
        >
          Click here to change your location
        </span>
      )}

      {/* Dropdown */}
      {open && (
        <div
          /* Below lg the inline trigger sits at the RIGHT end of the navbar's
             mobile search row, so the 256px menu anchors right there; on the
             desktop row it is left-anchored as before. */
          className={`absolute top-full mt-2 w-64 max-w-[calc(100vw-32px)] rounded-lg shadow-xl z-50 overflow-hidden ${variant === "icon" ? "left-[-8px]" : "right-0 lg:right-auto lg:left-0"}`}
          style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: SURFACE }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: HINT }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city…"
                className="bg-transparent text-sm w-full focus:outline-none"
                style={{ color: TEXT }}
              />
            </div>
          </div>

          {/* City list */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-base" style={{ color: HINT }}>No cities found.</li>
            ) : (
              filtered.map((city) => {
                const isSelected = city.name === selectedCity.name;
                return (
                  <li key={city.name}>
                    <button
                      onClick={() => select(city)}
                      className="w-full flex items-center justify-between px-4 py-2.5 transition-colors"
                      style={{
                        fontSize: "16px",
                        backgroundColor: isSelected ? SEL_BG : "transparent",
                        color: isSelected ? GREEN : TEXT,
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = HOVER_BG; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">{countryFlag(city.country)}</span>
                        <span className="font-medium">{city.name}</span>
                      </span>
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
