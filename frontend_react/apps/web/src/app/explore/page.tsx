"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi, communitiesApi } from "@eventmind/api";
import { useLocationStore, DEFAULT_CITY, CITIES, isOnlineCity } from "@eventmind/store";
import type { City } from "@eventmind/store";
import type { Event, Community } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";
import { EventCardItem } from "@/components/EventsCarousel";
import { CommunityCardItem } from "@/components/CommunityCarousel";
import { toCarouselEvent, toCommunityItem } from "@/lib/card-adapters";

const GREEN = "#184E4A";

const CATEGORIES = [
  "All",
  "Technology", "Business", "Creative", "Summit",
  "Networking", "Gaming", "Health & Wellness",
  "Education", "Arts & Culture", "Sports", "Food & Drink",
];

const EVENT_TYPES = ["All", "In-Person", "Online", "Hybrid"];

// Which content to show. "both" is the default — neither toggle forces a single mode.
type View = "events" | "communities" | "both";
const VIEW_SEGMENTS: { value: View; label: string }[] = [
  { value: "events", label: "View Events" },
  { value: "communities", label: "View Communities" },
  { value: "both", label: "View Both" },
];

function parseView(raw: string | null): View {
  return raw === "events" || raw === "communities" ? raw : "both";
}

type Sort = "relevance" | "date" | "name" | "price" | "popularity";
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Date: soonest" },
  { value: "name", label: "Name: A–Z" },
  { value: "price", label: "Price: low to high" },
  { value: "popularity", label: "Popularity" },
];

function parseSort(raw: string | null): Sort {
  return (SORT_OPTIONS.some((o) => o.value === raw) ? raw : "relevance") as Sort;
}

// ─── Unified result item (an event or a community), with sort accessors ──────────

type Item =
  | { kind: "event"; id: string; ev: Event }
  | { kind: "community"; id: string; co: Community };

const itemName = (i: Item) => (i.kind === "event" ? i.ev.title : i.co.name);
const itemDate = (i: Item) => {
  const d = i.kind === "event" ? i.ev.start_date : i.co.next_event_date;
  return d ? new Date(d).getTime() : Number.POSITIVE_INFINITY; // undated items sort last
};
const itemPrice = (i: Item) => Number(i.kind === "event" ? i.ev.price : i.co.price) || 0;
const itemPopularity = (i: Item) =>
  i.kind === "event" ? i.ev.tickets_sold ?? 0 : i.co.member_count ?? 0;

function sortItems(items: Item[], sort: Sort): Item[] {
  const arr = [...items];
  switch (sort) {
    case "name": arr.sort((a, b) => itemName(a).localeCompare(itemName(b))); break;
    case "date": arr.sort((a, b) => itemDate(a) - itemDate(b)); break;
    case "price": arr.sort((a, b) => itemPrice(a) - itemPrice(b)); break;
    case "popularity": arr.sort((a, b) => itemPopularity(b) - itemPopularity(a)); break;
    default: break; // relevance — preserve incoming order
  }
  return arr;
}

// Alternate two lists so events and communities visually mix in the "both" view.
function interleave(a: Item[], b: Item[]): Item[] {
  const out: Item[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

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

  // View + filter state — initialise from URL so links are shareable
  const [view, setView] = useState<View>(parseView(searchParams.get("view")));
  const [sort, setSort] = useState<Sort>(parseSort(searchParams.get("sort")));
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

  const online = isOnlineCity(city);
  const showEvents = view !== "communities";
  const showCommunities = view !== "events";

  // Keep the URL in sync so the page is shareable / bookmarkable.
  const updateUrl = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
    },
    [router, searchParams]
  );

  function selectView(next: View) {
    setView(next);
    updateUrl({ view: next === "both" ? null : next });
  }
  function selectSort(next: Sort) {
    setSort(next);
    updateUrl({ sort: next === "relevance" ? null : next });
  }

  // When "Online" is the selected city, both events and communities are queried by
  // category="online" rather than a geographic radius (online items live at lat/lng 0,0).
  const buildEventParams = useCallback(() => {
    if (online) {
      return {
        q: q || undefined,
        category: "online",
        price_max: freeOnly ? 0 : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
    }
    return {
      q: q || undefined,
      category: category !== "All" ? category : undefined,
      event_type: eventType !== "All" ? eventType : undefined,
      lat: city.lat,
      lng: city.lng,
      radius: 200,
      price_max: freeOnly ? 0 : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
  }, [online, q, category, eventType, city, freeOnly, dateFrom, dateTo]);

  const buildCommunityParams = useCallback(() => {
    if (online) return { q: q || undefined, category: "online" };
    return {
      q: q || undefined,
      category: category !== "All" ? category : undefined,
      city: city.name,
    };
  }, [online, q, category, city]);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["explore-events", online, q, category, eventType, city.name, freeOnly, dateFrom, dateTo],
    queryFn: () => eventsApi.search(buildEventParams()).then((r) => r.data),
    enabled: showEvents,
  });

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["explore-communities", online, q, category, city.name],
    queryFn: () => communitiesApi.search(buildCommunityParams()).then((r) => r.data),
    enabled: showCommunities,
  });

  // Build the (sorted) unified list. In "both" view events + communities are mixed
  // into a single bunch — no separate sections.
  const items = useMemo<Item[]>(() => {
    const eventItems: Item[] = (events ?? []).map((ev) => ({ kind: "event", id: String(ev.id), ev }));
    const communityItems: Item[] = (communities ?? []).map((co) => ({ kind: "community", id: String(co.id), co }));

    if (view === "events") return sortItems(eventItems, sort);
    if (view === "communities") return sortItems(communityItems, sort);
    // both
    if (sort === "relevance") return interleave(eventItems, communityItems);
    return sortItems([...eventItems, ...communityItems], sort);
  }, [events, communities, view, sort]);

  const isLoading =
    (showEvents && eventsLoading) || (showCommunities && communitiesLoading);

  // Format/date/price filters only constrain events, so hide them in communities-only view.
  const showEventFilters = view !== "communities";

  const activeFiltersCount = [
    category !== "All",
    showEventFilters && eventType !== "All",
    showEventFilters && freeOnly,
    showEventFilters && !!dateFrom,
    showEventFilters && !!dateTo,
  ].filter(Boolean).length;

  function clearFilters() {
    setCategory("All");
    setEventType("All");
    setFreeOnly(false);
    setDateFrom("");
    setDateTo("");
  }

  const noun = view === "events" ? "event" : view === "communities" ? "community" : "result";
  const countLabel = (n: number) =>
    n === 1
      ? `1 ${noun === "community" ? "community" : noun}`
      : `${n} ${noun === "community" ? "communities" : noun + "s"}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-4 sm:px-6 lg:px-12 pt-10 pb-4">
        {/* Page title + search */}
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-[32px] font-extrabold tracking-tight" style={{ color: "#111827" }}>
            Explore
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Discover events and communities near you or across the world
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
              placeholder="Search events or communities…"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{
                border: "1px solid #E2DDD5",
                backgroundColor: "#F2EFEA",
                color: "#111827",
              }}
            />
          </div>

          {/* City picker */}
          <select
            value={city.name}
            onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value) ?? selectedCity)}
            className="px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ border: "1px solid #E2DDD5", backgroundColor: "#F2EFEA", color: "#111827" }}
          >
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.country ? `${c.name}, ${c.country}` : c.name}
              </option>
            ))}
          </select>

          {/* Sort by */}
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ border: "1px solid #E2DDD5", backgroundColor: "#F2EFEA", color: "#374151" }}>
            <span className="font-medium whitespace-nowrap" style={{ color: "#6B7280" }}>Sort by</span>
            <select
              value={sort}
              onChange={(e) => selectSort(e.target.value as Sort)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
              style={{ color: "#111827" }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              border: `1px solid ${activeFiltersCount > 0 ? GREEN : "#E2DDD5"}`,
              backgroundColor: activeFiltersCount > 0 ? GREEN : "#F2EFEA",
              color: activeFiltersCount > 0 ? "#F2EFEA" : "#374151",
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </button>
        </div>

        {/* View switch + contextual Create button. The switch sits just below search. */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex rounded-xl p-1 gap-1" style={{ border: "1px solid #E2DDD5", backgroundColor: "#ECEAE5" }}>
            {VIEW_SEGMENTS.map((seg) => {
              const active = view === seg.value;
              return (
                <button
                  key={seg.value}
                  onClick={() => selectView(seg.value)}
                  aria-pressed={active}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: active ? GREEN : "transparent",
                    color: active ? "#F2EFEA" : "#374151",
                  }}
                >
                  {seg.label}
                </button>
              );
            })}
          </div>

          {/* Create button — only in a single-content view (none in "View Both"). */}
          {view === "events" && (
            <CreateButton label="Create Event" onClick={() => router.push("/organizer/create")} />
          )}
          {view === "communities" && (
            <CreateButton label="Create Community" onClick={() => router.push("/community/create")} />
          )}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-4 p-6 rounded-2xl space-y-6" style={{ backgroundColor: "#F2EFEA", border: "1px solid #E2DDD5" }}>
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

              {showEventFilters && (
                <>
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
                </>
              )}
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

      {/* Results — a single unified grid (events + communities mixed in "both" view) */}
      <div className="px-4 sm:px-6 lg:px-12 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-semibold" style={{ color: "#6B7280" }}>
            {isLoading ? "Searching…" : `${countLabel(items.length)} found`}
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <svg className="w-10 h-10" style={{ color: "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
            <p className="text-[15px] font-semibold" style={{ color: "#6B7280" }}>Nothing matches your search</p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Try widening your search or clearing some filters.</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ backgroundColor: GREEN, color: "#F2EFEA" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {items.map((item) =>
              item.kind === "event" ? (
                <EventCardItem
                  key={`e-${item.id}`}
                  event={toCarouselEvent(item.ev)}
                  onBookNow={(id) => router.push(`/event/${id}`)}
                />
              ) : (
                <CommunityCardItem
                  key={`c-${item.id}`}
                  community={toCommunityItem(item.co)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#F2EFEA]"
      style={{ backgroundColor: GREEN }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {label}
    </button>
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
  " border-[#E2DDD5] bg-[#F2EFEA] text-[#111827]";
