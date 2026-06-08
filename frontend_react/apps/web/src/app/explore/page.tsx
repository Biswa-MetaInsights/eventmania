"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@eventmind/api";
import { useLocationStore, DEFAULT_CITY, CITIES } from "@eventmind/store";
import type { City } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { EventCard } from "@/components/EventCard";

const GREEN = "#184E4A";

const CATEGORIES = [
  "All",
  "Technology", "Business", "Creative", "Summit",
  "Networking", "Gaming", "Health & Wellness",
  "Education", "Arts & Culture", "Sports", "Food & Drink",
];

const EVENT_TYPES = ["All", "In-Person", "Online", "Hybrid"];

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const _selectedCity = useLocationStore((s) => s.selectedCity);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);
  const selectedCity = hasHydrated ? _selectedCity : DEFAULT_CITY;

  // Filter state — initialise from URL so links are shareable
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");
  const [eventType, setEventType] = useState(searchParams.get("event_type") ?? "All");
  const [city, setCity] = useState<City>(
    CITIES.find((c) => c.name === searchParams.get("city")) ?? selectedCity
  );
  const [freeOnly, setFreeOnly] = useState(searchParams.get("free") === "true");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const buildParams = useCallback(() => ({
    q: q || undefined,
    category: category !== "All" ? category : undefined,
    event_type: eventType !== "All" ? eventType : undefined,
    lat: city.lat,
    lng: city.lng,
    radius: 200,
    price_max: freeOnly ? 0 : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [q, category, eventType, city, freeOnly, dateFrom, dateTo]);

  const { data: events, isLoading } = useQuery({
    queryKey: ["explore", q, category, eventType, city.name, freeOnly, dateFrom, dateTo],
    queryFn: () => eventsApi.search(buildParams()).then((r) => r.data),
  });

  const activeFiltersCount = [
    category !== "All",
    eventType !== "All",
    freeOnly,
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  function clearFilters() {
    setCategory("All");
    setEventType("All");
    setFreeOnly(false);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 pt-10 pb-4">
        {/* Page title + search */}
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-[32px] font-extrabold tracking-tight" style={{ color: "#111827" }}>
            Explore Events
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Discover events near you or search across the world
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* Search input */}
          <div className="relative flex-1 max-w-xl">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events by name or keyword…"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{
                border: "1px solid #E2DDD5",
                backgroundColor: "white",
                color: "#111827",
              }}
            />
          </div>

          {/* City picker */}
          <select
            value={city.name}
            onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value) ?? selectedCity)}
            className="px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ border: "1px solid #E2DDD5", backgroundColor: "white", color: "#111827" }}
          >
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}, {c.country}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              border: `1px solid ${activeFiltersCount > 0 ? GREEN : "#E2DDD5"}`,
              backgroundColor: activeFiltersCount > 0 ? GREEN : "white",
              color: activeFiltersCount > 0 ? "white" : "#374151",
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-4 p-6 rounded-2xl space-y-6" style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Category */}
              <FilterGroup label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectCls}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FilterGroup>

              {/* Event type */}
              <FilterGroup label="Format">
                <div className="flex flex-col gap-1">
                  {EVENT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="eventType"
                        checked={eventType === t}
                        onChange={() => setEventType(t)}
                        className="accent-[#184E4A]"
                      />
                      <span style={{ color: "#374151" }}>{t}</span>
                    </label>
                  ))}
                </div>
              </FilterGroup>

              {/* Date range */}
              <FilterGroup label="Date Range">
                <div className="space-y-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={selectCls}
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={selectCls}
                    placeholder="To"
                  />
                </div>
              </FilterGroup>

              {/* Price */}
              <FilterGroup label="Price">
                <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={freeOnly}
                    onChange={(e) => setFreeOnly(e.target.checked)}
                    className="accent-[#184E4A] w-4 h-4"
                  />
                  <span style={{ color: "#374151" }}>Free events only</span>
                </label>
              </FilterGroup>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold"
                style={{ color: "#EF4444" }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-12 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-semibold" style={{ color: "#6B7280" }}>
            {isLoading ? "Searching…" : `${events?.length ?? 0} event${events?.length !== 1 ? "s" : ""} found`}
          </span>
          {q && (
            <span className="text-sm" style={{ color: "#9CA3AF" }}>
              for &ldquo;{q}&rdquo;
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <svg className="w-10 h-10" style={{ color: "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
            <p className="text-[15px] font-semibold" style={{ color: "#6B7280" }}>No events match your filters</p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Try widening your search or clearing some filters.</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ backgroundColor: GREEN, color: "white" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onTap={() => router.push(`/event/${event.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "#6B7280" }}>{label}</label>
      {children}
    </div>
  );
}

const selectCls =
  "w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#184E4A]/20 focus:border-[#184E4A]" +
  " border-[#E2DDD5] bg-white text-[#111827]";
