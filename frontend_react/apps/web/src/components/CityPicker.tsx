"use client";

import { useState, useRef, useEffect } from "react";
import { useLocationStore, CITIES, DEFAULT_CITY } from "@eventmind/store";
import type { City } from "@eventmind/store";

const GREEN = "#184E4A";

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
        <span className="relative inline-flex items-center">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Edit location"
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: open ? GREEN : "#9CA3AF" }}
            onMouseEnter={(e) => { if (!open) e.currentTarget.style.color = GREEN; }}
            onMouseLeave={(e) => { if (!open) e.currentTarget.style.color = "#9CA3AF"; }}
          >
            <svg className="w-4 h-4" viewBox="0 -0.5 21 21" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd"
                d="M0,20 L20.616532,20 L20.616532,18.042095 L0,18.042095 L0,20 Z M7.215786,13.147332 L7.215786,10.51395 L13.094591,5.344102 L15.146966,7.493882 L9.903151,13.147332 L7.215786,13.147332 Z M16.244797,2.64513 L18.059052,4.363191 L16.645788,5.787567 L14.756283,3.993147 L16.244797,2.64513 Z M21,4.64513 L16.132437,0 L5.154133,9.687714 L5.154133,15.105237 L10.78657,15.105237 L21,4.64513 Z"
              />
            </svg>
          </button>
          {/* Hover tooltip — relative to the button wrapper above */}
          {hovered && !open && (
            <span
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded-full shadow-lg z-50 pointer-events-none"
              style={{ backgroundColor: "#F2EFEA", color: "#184E4A", border: "1px solid #E2DDD5" }}
            >
              Click here to change your location
            </span>
          )}
        </span>
      ) : variant === "inline" ? (
        // Inline trigger for the navbar "Add Location" slot — pin + selected city
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 shrink-0"
          aria-label="Select city"
          style={{ color: hovered || open ? GREEN : "#111827" }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" />
            <circle cx="12" cy="9" r="2.6" fill="#F2EFEA" />
          </svg>
          <span className="text-base whitespace-nowrap">
            {selectedCity.name}
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: open ? GREEN : "#ECEAE5",
            color: open ? "#F2EFEA" : "#111827",
            border: "1px solid #E2DDD5",
          }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" />
            <circle cx="12" cy="9" r="2.6" fill="#F2EFEA" />
          </svg>
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
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded-full shadow-lg z-50 pointer-events-none"
          style={{ backgroundColor: "#F2EFEA", color: "#184E4A", border: "1px solid #E2DDD5" }}
        >
          Click here to change your location
        </span>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute top-full mt-2 w-64 rounded-2xl shadow-xl z-50 overflow-hidden ${variant === "icon" ? "left-[-8px]" : "left-0"}`}
          style={{ backgroundColor: "#F2EFEA", border: "1px solid #E2DDD5" }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: "1px solid #E2DDD5" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#F2EFEA" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#9CA3AF" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city…"
                className="bg-transparent text-sm w-full focus:outline-none"
                style={{ color: "#111827" }}
              />
            </div>
          </div>

          {/* City list */}
          <ul className="max-h-64 overflow-y-auto py-1" style={{ fontFamily: "'Roboto', sans-serif" }}>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-base" style={{ color: "#9CA3AF" }}>No cities found.</li>
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
                        backgroundColor: isSelected ? "#F0F7F6" : "transparent",
                        color: isSelected ? GREEN : "#111827",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#F9F8F6"; }}
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
