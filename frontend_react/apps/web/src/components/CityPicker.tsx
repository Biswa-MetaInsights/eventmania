"use client";

import { useState, useRef, useEffect } from "react";
import { useLocationStore, CITIES, DEFAULT_CITY } from "@eventmind/store";
import type { City } from "@eventmind/store";

const GREEN = "#184E4A";

// Country flag emoji from ISO code
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

export function CityPicker() {
  const _selectedCity = useLocationStore((s) => s.selectedCity);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);
  const selectedCity = hasHydrated ? _selectedCity : DEFAULT_CITY;
  const setCity = useLocationStore((s) => s.setCity);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
        style={{
          backgroundColor: open ? GREEN : "#ECEAE5",
          color: open ? "white" : "#111827",
          border: "1px solid #E2DDD5",
        }}
      >
        <span className="text-base leading-none">📍</span>
        <span>{selectedCity.name}</span>
        <svg
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-64 rounded-2xl shadow-xl z-50 overflow-hidden"
          style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}
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
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm" style={{ color: "#9CA3AF" }}>No cities found.</li>
            ) : (
              filtered.map((city) => {
                const isSelected = city.name === selectedCity.name;
                return (
                  <li key={city.name}>
                    <button
                      onClick={() => select(city)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors"
                      style={{
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
