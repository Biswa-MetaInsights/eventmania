"use client";

import { Suspense, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// PARKED 2026-08-14 (MVP) — `communitiesSource` dropped from this import.
import { eventsSource } from "@/lib/data-source";
import { useLocationStore, DEFAULT_CITY, CITIES, isOnlineCity } from "@eventmind/store";
import type { City } from "@eventmind/store";
import { EVENT_FORMATS, DEFAULT_CURRENCY, type Event, type Community } from "@eventmind/types";
import { formatPrice, currencySymbol } from "@/lib/currency";
import { Navbar } from "@/components/navbar/Navbar";
import { EventCardItem } from "@/components/EventsCarousel";
import { SegmentedControl } from "@/components/SegmentedControl";
// PARKED 2026-08-14 (MVP) — import { CommunityCardItem } from "@/components/CommunityCarousel";
// PARKED 2026-08-14 (MVP) — `toCommunityItem` dropped from this import.
import { toCarouselEvent } from "@/lib/card-adapters";

const GREEN = "var(--brand-green)";

const CATEGORIES = [
  "All",
  "Technology", "Business", "Creative", "Summit",
  "Networking", "Gaming", "Health & Wellness",
  "Education", "Arts & Culture", "Sports", "Food & Drink",
];

// No "Hybrid" chip on purpose. A hybrid event is attendable both ways, and the
// event service already folds it into BOTH the In-Person and the Online filter
// (see the event_type branch in event_endpoints.py), so a third chip would only
// ever narrow the list to hybrid-only — which is not a thing anyone browses for.
const EVENT_TYPES = ["All", "In-Person", "Online"];

// Search radius, in km, around the selected city. 25 keeps results genuinely
// local — the old 200 reached well past the chosen city into other towns, which
// is not what picking a city means. 200 is still one chip away.
const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];
const DEFAULT_RADIUS = 25;

// ─── Price range ─────────────────────────────────────────────────────────────
// ⚠️ The amounts here are compared as BARE NUMBERS against `Event.price`,
// whatever currency that event is priced in — the backend's price_min/price_max
// do exactly the same. The labels say ₹ because India is the launch market
// (Gautham, 2026-09-08), so a $45 event still matches "Up to ₹500". Making that
// honest needs an FX layer, which is TODO.md §25 — do NOT fake a conversion
// here, and do not "fix" the labels to a currency-neutral "Min"/"Max" without
// asking: the symbol is a deliberate launch-market choice, not an oversight.
const PRICE_CURRENCY = DEFAULT_CURRENCY;

/** "₹0", "₹2,000" — a filter bound, so 0 formats as an amount, not "Free". */
const money = (n: number) => formatPrice(n, PRICE_CURRENCY, { freeLabel: null });

// The slider's right-hand stop. It is a CAP, not a maximum price: parked at the
// far right the handle means "no upper bound" (and reads "₹10,000+"), so an
// event priced above it is never hidden by a limit nobody deliberately set.
const PRICE_SLIDER_MAX = 10000;
const PRICE_STEP = 100;

// `max` is inclusive (the query is `price <= max`), hence "Up to", not "Under".
//
// ⚠️ **Free is a PRESET, not a separate control** (Gautham, 2026-09-08). It used
// to be a toggle switch above this row, which made it a second thing that owned
// `price_max` and had to be kept mutually exclusive with the range by hand. It
// is simply the range 0 → 0, so it is a chip like any other and the whole
// exclusivity problem is gone. **Do not put a Free toggle back.**
const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Free", min: 0, max: 0 },
  { label: `Up to ${money(500)}`, min: null, max: 500 },
  { label: `${money(500)} – ${money(2000)}`, min: 500, max: 2000 },
  { label: `${money(2000)}+`, min: 2000, max: null },
];

/** A URL price bound → a number, or null for absent/negative/nonsense. */
function parsePrice(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** "₹500 → ₹2,000", "₹2,000+", "Up to ₹500" — the Active chip's wording for a
 *  range that matches no preset.
 *
 *  ⚠️ It must handle the both-null case, even though the chip only renders when
 *  a range is set: it is computed on every render, and the first version reached
 *  for `money(max!)` with nothing set and took the page down with it. */
function priceRangeLabel(min: number | null, max: number | null): string {
  if (min === 0 && max === 0) return "Free";
  // A floor of zero constrains nothing, so it is not worth saying — "₹0 →
  // ₹4,000" is "Up to ₹4,000" with extra words. It arises for real: pick Free,
  // then drag the upper handle out.
  if (min === 0) min = null;
  if (min !== null && max !== null) return `${money(min)} → ${money(max)}`;
  if (min !== null) return `${money(min)}+`;
  if (max !== null) return `Up to ${money(max)}`;
  return "Any price"; // unreachable via the chip, which renders only for a set range
}

// Same rule as matchingPreset() for dates: a chip lights up only while the range
// still matches exactly what it would set.
function matchingPricePreset(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  return PRICE_PRESETS.find((p) => p.min === min && p.max === max)?.label ?? null;
}

// ─── Date presets ────────────────────────────────────────────────────────────────
// The chips are pure sugar over dateFrom/dateTo — every preset resolves to a
// concrete [from, to] pair, so the query layer never learns about presets at all.
// All of them start at today: "this week" means the rest of this week, not a week
// that has already partly gone by.
type DatePreset = "today" | "week" | "month";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

// The page opens pre-filtered to this week rather than to everything — a wall of
// events six months out is not what someone browsing has come for. "All events"
// is a chip away, and the Active row names the constraint so it never looks like
// the catalogue is simply empty.
const DEFAULT_PRESET: DatePreset = "week";

// Local-date ISO (YYYY-MM-DD). toISOString() would shift the day for anyone
// east/west of UTC, which is exactly the bug that makes "Today" return nothing.
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "2026-07-21" → "21/07/26", for DISPLAY only — state and the API stay on ISO.
// Split rather than `new Date(iso)`, which parses a bare date as UTC midnight and
// would show the previous day for anyone west of Greenwich.
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y.slice(2)}` : iso;
};

const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

function presetRange(preset: DatePreset): [string, string] {
  const today = new Date();
  const dow = today.getDay(); // 0 = Sunday
  switch (preset) {
    case "today":
      return [isoDate(today), isoDate(today)];
    case "week":
      return [isoDate(today), isoDate(addDays(today, (7 - dow) % 7))]; // → Sunday
    case "month": {
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [isoDate(today), isoDate(end)];
    }
  }
}

// A preset chip lights up only while the dates still match what it would set —
// nudge either input by a day and the selection drops back to "custom".
function matchingPreset(from: string, to: string): DatePreset | null {
  if (!from && !to) return null;
  return DATE_PRESETS.find((p) => {
    const [f, t] = presetRange(p.value);
    return f === from && t === to;
  })?.value ?? null;
}

// Which content to show. "both" was the default — neither toggle forced a single mode.
//
// ⚠️ PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2, so Explore is
// events-only. The View machinery below is deliberately left FULLY TYPED rather
// than deleted: every derived value downstream (showEvents, showCommunities,
// showEventFilters, noun, countLabel, the `items` memo, the result grid's
// ternary) reads `view` and keeps compiling untouched, so Phase 2 is a pure
// uncomment with no type surgery. parseView is the single choke point — it now
// ignores ?view= and always answers "events", which switches everything else off
// on its own.
type View = "events" | "communities" | "both";

/* PARKED 2026-08-14 (MVP) — the segmented view switch's options.

const VIEW_SEGMENTS: { value: View; label: string }[] = [
  { value: "events", label: "View Events" },
  { value: "communities", label: "View Communities" },
  { value: "both", label: "View Both" },
];

*/

function parseView(raw: string | null): View {
  // PHASE 2 RESTORE: delete the `void` line and the `return "events"`, then
  // uncomment the original below. The signature is kept intact so the call site
  // needs no change either way; `void` just marks the arg as deliberately unused.
  void raw;
  return "events";
  // return raw === "events" || raw === "communities" ? raw : "both";
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

// Same test as toCarouselEvent's "sold-out" badge — keep the two in step, or the
// grid will sink a card to the bottom without the tag that explains why.
const itemSoldOut = (i: Item) =>
  i.kind === "event" && i.ev.capacity > 0 && i.ev.tickets_sold >= i.ev.capacity;

// Same test as toCarouselEvent's "selling-fast" badge — the Availability filter
// below exists to select exactly the cards carrying that tag, so if the 70%
// threshold moves in card-adapters.ts it MUST move here too, or the filter will
// return events with no Selling Fast tag on them (and hide ones that have it).
const itemSellingFast = (i: Item) =>
  i.kind === "event" &&
  !itemSoldOut(i) &&
  i.ev.capacity > 0 &&
  i.ev.tickets_sold / i.ev.capacity > 0.7;

/** Sold-out events sink below everything still bookable, whatever the chosen
 *  sort. filter() is stable, so within each half the sort order is untouched. */
function soldOutLast(items: Item[]): Item[] {
  return [...items.filter((i) => !itemSoldOut(i)), ...items.filter(itemSoldOut)];
}

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
  // PARKED 2026-08-14 (MVP) — was `const [view, setView] = …`. With the view
  // switch parked nothing sets it, so the setter is dropped (same pattern as the
  // pinned `mode` in HeroCarousel.tsx). PHASE 2 RESTORE: put `setView` back.
  const [view] = useState<View>(parseView(searchParams.get("view")));
  const [sort, setSort] = useState<Sort>(parseSort(searchParams.get("sort")));
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");
  const [eventType, setEventType] = useState(searchParams.get("event_type") ?? "All");
  const [city, setCity] = useState<City>(
    CITIES.find((c) => c.name === searchParams.get("city")) ?? selectedCity
  );
  // Either end may be null, which means "unbounded that way" — not 0, and not
  // PRICE_SLIDER_MAX. Both are read from the URL so a filtered search is
  // shareable, exactly like ?category= above.
  //
  // `?free=true` is the old Free-events toggle's parameter, kept as an alias for
  // the range it always meant so a link shared before 2026-09-08 still lands on
  // free events. Nothing writes it any more.
  const [priceMin, setPriceMin] = useState<number | null>(() =>
    searchParams.get("free") === "true" ? 0 : parsePrice(searchParams.get("price_min"))
  );
  const [priceMax, setPriceMax] = useState<number | null>(() =>
    searchParams.get("free") === "true" ? 0 : parsePrice(searchParams.get("price_max"))
  );
  const [sellingFast, setSellingFast] = useState(searchParams.get("selling_fast") === "true");
  const [radius, setRadius] = useState(Number(searchParams.get("radius")) || DEFAULT_RADIUS);
  // Lazy initialiser so presetRange() runs once, not on every render. A URL that
  // carries either date wins outright — including a deliberately empty one, so a
  // shared "All events" link doesn't silently snap back to this week.
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get("date_from") ?? (searchParams.has("date_to") ? "" : presetRange(DEFAULT_PRESET)[0])
  );
  const [dateTo, setDateTo] = useState(
    () => searchParams.get("date_to") ?? (searchParams.has("date_from") ? "" : presetRange(DEFAULT_PRESET)[1])
  );

  const online = isOnlineCity(city);
  const showEvents = view !== "communities";
  // PARKED 2026-08-14 (MVP) — its only reader was the community query's `enabled`.
  // const showCommunities = view !== "events";

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

  /* PARKED 2026-08-14 (MVP) — the view switch's handler.

  function selectView(next: View) {
    setView(next);
    updateUrl({ view: next === "both" ? null : next });
  }

  */

  function selectSort(next: Sort) {
    setSort(next);
    updateUrl({ sort: next === "relevance" ? null : next });
  }

  // When "Online" is the selected city, events are queried by FORMAT
  // (event_type) rather than a geographic radius — online events live at lat/lng
  // 0,0. Because format is independent of category, the category filter still
  // applies here: picking Online + Music now gives online music events, where the
  // old category="online" query silently threw the category selection away.
  const buildEventParams = useCallback(() => {
    if (online) {
      return {
        q: q || undefined,
        category: category !== "All" ? category : undefined,
        event_type: EVENT_FORMATS.online,
        price_min: priceMin ?? undefined,
        price_max: priceMax ?? undefined,
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
      radius,
      // Free is the range 0 → 0, so it needs no parameter of its own.
      price_min: priceMin ?? undefined,
      price_max: priceMax ?? undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
  }, [online, q, category, eventType, city, priceMin, priceMax, dateFrom, dateTo, radius]);

  /* PARKED 2026-08-14 (MVP) — community query params. Communities have no format
     filter, so "online" is expressed as a category here (the documented exception
     to the online-is-a-format rule — see HANDOVER.md).

  const buildCommunityParams = useCallback(() => {
    if (online) return { q: q || undefined, category: "online" };
    return {
      q: q || undefined,
      category: category !== "All" ? category : undefined,
      city: city.name,
    };
  }, [online, q, category, city]);

  */

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["explore-events", online, q, category, eventType, city.name, priceMin, priceMax, dateFrom, dateTo, radius],
    queryFn: () => eventsSource.search(buildEventParams()).then((r) => r.data),
    enabled: showEvents,
  });

  /* PARKED 2026-08-14 (MVP) — the community fetch. Not merely hidden at the
     render site: no request is made at all.

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["explore-communities", online, q, category, city.name],
    queryFn: () => communitiesSource.search(buildCommunityParams()).then((r) => r.data),
    enabled: showCommunities,
  });

  */

  // Build the (sorted) unified list. In "both" view events + communities are mixed
  // into a single bunch — no separate sections.
  const items = useMemo<Item[]>(() => {
    // Availability is the one filter the API cannot do: "selling fast" is derived
    // from capacity vs tickets_sold, and /event/search takes no such parameter —
    // so it narrows the fetched rows here rather than the query. Communities are
    // deliberately untouched, exactly like the price/date/format filters: they
    // have no capacity, and dropping them all from "View Both" the moment this
    // chip is pressed would look like the filter had broken the other half.
    const sourceEvents = sellingFast
      ? (events ?? []).filter((ev) => itemSellingFast({ kind: "event", id: String(ev.id), ev }))
      : (events ?? []);
    const eventItems: Item[] = sourceEvents.map((ev) => ({ kind: "event", id: String(ev.id), ev }));
    // PARKED 2026-08-14 (MVP) — no community is ever constructed, so the "both"
    // and "communities" branches below resolve to an empty list. The Item union
    // keeps its community arm on purpose: that is what lets the accessors, the
    // sorts and the grid ternary stay untouched.
    // PHASE 2 RESTORE: uncomment the original line below.
    const communityItems: Item[] = [];
    // const communityItems: Item[] = (communities ?? []).map((co) => ({ kind: "community", id: String(co.id), co }));

    // soldOutLast wraps EVERY branch — it outranks the chosen sort, so a sold-out
    // event stays at the bottom even under "Date: soonest".
    if (view === "events") return soldOutLast(sortItems(eventItems, sort));
    if (view === "communities") return soldOutLast(sortItems(communityItems, sort));
    // both
    if (sort === "relevance") return soldOutLast(interleave(eventItems, communityItems));
    return soldOutLast(sortItems([...eventItems, ...communityItems], sort));
    // PARKED 2026-08-14 (MVP) — `communities` dropped from the dep list.
  }, [events, view, sort, sellingFast]);

  // PARKED 2026-08-14 (MVP) — was `(showEvents && eventsLoading) || (showCommunities && communitiesLoading)`.
  const isLoading = showEvents && eventsLoading;

  // Format/date/price filters only constrain events, so hide them in communities-only view.
  const showEventFilters = view !== "communities";

  // A date range counts as ONE filter, not two — "1 Jan → 5 Jan" is a single
  // choice to the user, and counting both ends made the badge read 4 for what
  // the Active row shows as 3 chips.
  const hasDateFilter = !!dateFrom || !!dateTo;

  // Same rule for the same reason: a range is one choice, so it counts once and
  // shows as one Active chip.
  //
  // ⚠️ A LOWER bound of 0 on its own is not a filter — it is "any price" typed
  // out — so it must not light the Active row or the count. A max of 0 is the
  // Free preset and very much is one, hence the asymmetry.
  const hasPriceRange = (priceMin !== null && priceMin > 0) || priceMax !== null;
  const pricePreset = matchingPricePreset(priceMin, priceMax);

  // Radius is meaningless for the Online pseudo-city — those events sit at
  // lat/lng 0,0 and are queried by FORMAT, not by a geographic search — so the
  // control hides rather than sitting there doing nothing.
  const showRadius = showEventFilters && !online;

  // 3-up, not the 4-up used elsewhere in the app: the always-present sidebar
  // takes 300px + a 24px gap out of the row, which is almost exactly one card's
  // worth, so three cells here are the same width as four on the home grid.
  const resultGridCls = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5";

  const activeFiltersCount = [
    category !== "All",
    showEventFilters && eventType !== "All",
    showEventFilters && sellingFast,
    showEventFilters && hasPriceRange,
    showEventFilters && hasDateFilter,
    showRadius && radius !== DEFAULT_RADIUS,
  ].filter(Boolean).length;

  const datePreset = matchingPreset(dateFrom, dateTo);

  function selectDatePreset(preset: DatePreset) {
    if (datePreset === preset) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const [from, to] = presetRange(preset);
    setDateFrom(from);
    setDateTo(to);
  }

  function clearDates() {
    setDateFrom("");
    setDateTo("");
  }

  // The single writer for both ends, and the reason the slider and the fields
  // can never disagree: all three controls (slider, fields, preset chips) call
  // this, and all three render from the same two numbers.
  function setPriceRange(min: number | null, max: number | null) {
    setPriceMin(min);
    setPriceMax(max);
  }

  function clearPrice() {
    setPriceRange(null, null);
  }

  function selectPricePreset(preset: (typeof PRICE_PRESETS)[number]) {
    // Pressing the lit chip clears it, same as a date preset.
    if (pricePreset === preset.label) clearPrice();
    else setPriceRange(preset.min, preset.max);
  }

  function clearFilters() {
    setCategory("All");
    setEventType("All");
    setSellingFast(false);
    setRadius(DEFAULT_RADIUS);
    clearPrice();
    clearDates();
  }

  const dateChipLabel = datePreset
    ? DATE_PRESETS.find((p) => p.value === datePreset)!.label
    : dateFrom && dateTo
      ? `${shortDate(dateFrom)} → ${shortDate(dateTo)}`
      : dateFrom
        ? `From ${shortDate(dateFrom)}`
        : `Until ${shortDate(dateTo)}`;

  // A price range is ONE filter, not two, for the same reason a date range is.
  const priceChipLabel = pricePreset ?? priceRangeLabel(priceMin, priceMax);

  const noun = view === "events" ? "event" : view === "communities" ? "community" : "result";
  const countLabel = (n: number) =>
    n === 1
      ? `1 ${noun === "community" ? "community" : noun}`
      : `${n} ${noun === "community" ? "communities" : noun + "s"}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />

      <div className="px-4 sm:px-6 lg:px-12 pt-10 pb-4">
        {/* Page title + search */}
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-[32px] font-extrabold tracking-tight" style={{ color: "var(--brand-text)" }}>
            Explore
          </h1>
          <p className="text-[18px]" style={{ color: "var(--brand-hint)" }}>
            {/* PARKED 2026-08-14 (MVP) — was "Discover events and communities near you or across the world" */}
            Discover events near you or across the world
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Search input */}
          <div className="relative flex-1 max-w-xl">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--brand-hint)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              // PARKED 2026-08-14 (MVP) — was "Search events or communities…"
              placeholder="Search events…"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                border: "2px solid var(--brand-control-border)",
                backgroundColor: "var(--brand-bg)",
                color: "var(--brand-text)",
              }}
            />
          </div>

          {/* City picker */}
          <select
            value={city.name}
            onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value) ?? selectedCity)}
            className="px-4 py-3 rounded-lg text-sm focus:outline-none"
            style={{ border: "2px solid var(--brand-control-border)", backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}
          >
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.country ? `${c.name}, ${c.country}` : c.name}
              </option>
            ))}
          </select>

          {/* Sort by */}
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
            style={{ border: "2px solid var(--brand-control-border)", backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}>
            <span className="font-medium whitespace-nowrap" style={{ color: "var(--brand-hint)" }}>Sort by</span>
            <select
              value={sort}
              onChange={(e) => selectSort(e.target.value as Sort)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
              style={{ color: "var(--brand-text)" }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

        </div>

        {/* Create button. It used to share this row with the Events/Communities/Both
            view switch, and was contextual on it — now Explore is events-only, so
            the button is unconditional and sits alone, right-aligned. */}
        <div className="mt-4 flex items-center justify-end gap-3 flex-wrap">
          {/* PARKED 2026-08-14 (MVP) — the segmented view switch (View Events /
              View Communities / View Both) and the Create Community button.
              Communities are deferred to Phase 2; a one-option switch reads as
              broken, so the whole track goes rather than losing a segment.

              To restore: uncomment both blocks below, restore `justify-end` above
              to `justify-between`, put the `view === "events" &&` guard back on
              Create Event, and un-park VIEW_SEGMENTS, selectView, setView and
              parseView further up.

          <div className="flex w-full sm:w-auto sm:inline-flex rounded-lg p-1 gap-1" style={{ border: "2px solid var(--brand-control-border)", backgroundColor: "var(--brand-surface)" }}>
            {VIEW_SEGMENTS.map((seg) => {
              const active = view === seg.value;
              return (
                <button
                  key={seg.value}
                  onClick={() => selectView(seg.value)}
                  aria-pressed={active}
                  className="flex-1 min-w-0 sm:flex-none px-2 sm:px-4 py-1.5 rounded-md text-[18px] font-bold transition-all duration-150 active:scale-[0.98]"
                  style={{
                    backgroundColor: active ? GREEN : "transparent",
                    color: active ? "var(--brand-on-green)" : "var(--brand-text)",
                  }}
                >
                  {seg.label}
                </button>
              );
            })}
          </div>

          {view === "communities" && (
            <CreateButton label="Create Community" onClick={() => router.push("/community/create")} />
          )}

          */}

          <CreateButton label="Create Event" onClick={() => router.push("/organizer/create")} />
        </div>

      </div>

      {/* ─── Body: filter sidebar + results ────────────────────────────────────
          The sidebar deliberately does NOT scroll internally and is NOT pinned:
          it sizes to its content and the whole PAGE scrolls to reach the bottom
          of it. Those two go together — a sticky column taller than the viewport
          pins its top and makes its lower half permanently unreachable, since the
          page scrolling past it no longer moves it. Gautham's call.
          `items-start` keeps it from stretching to the height of the results
          column; below lg it stacks above the results instead. */}
      <div className="px-4 sm:px-6 lg:px-12 pb-20 flex flex-col lg:flex-row items-start gap-6">
          <aside
            className="w-full lg:w-[300px] lg:shrink-0 rounded-lg overflow-hidden"
            style={{ backgroundColor: "var(--brand-surface)", border: "2px solid var(--brand-control-border)" }}
          >
            <div>
              {/* Header: count + clear all */}
              <div
                className="flex items-center justify-between gap-3 px-5 py-3.5 border-b"
                style={{ borderColor: "var(--brand-border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" style={{ color: "var(--brand-hint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M6.75 12h10.5m-7.5 5.25h4.5" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--brand-text)" }}>
                    Filters
                  </span>
                  {activeFiltersCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: GREEN, color: "var(--brand-on-green)" }}
                    >
                      {activeFiltersCount}
                    </span>
                  )}
                </div>

                {/* Bordered because it did not read as clickable without one
                    (Gautham, 2026-09-08) — it was bare text in a header row. It
                    takes the sidebar CHIP's silhouette (2px
                    --brand-control-border, rounded-lg, transparent ground)
                    rather than inventing a third outline width.
                    Hover FILLS green with a linen label (Gautham, 2026-09-09) —
                    the house hover rule. Greening only the label was too quiet
                    to read as a button: in light mode --brand-hint is #111827
                    and the hover green #184E4A, so near-black moved to dark
                    green and almost nothing appeared to happen. */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = GREEN;
                      e.currentTarget.style.color = "var(--brand-on-green)";
                      e.currentTarget.style.borderColor = GREEN;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--brand-hint)";
                      e.currentTarget.style.borderColor = "var(--brand-control-border)";
                    }}
                    className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg text-sm font-bold transition-colors"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--brand-hint)",
                      border: "2px solid var(--brand-control-border)",
                    }}
                  >
                    <CloseGlyph />
                    Clear all
                  </button>
                )}
              </div>

              {/* Sections */}
              <FilterSection label="Category" first>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </FilterSection>

              {showEventFilters && (
                <>
                  {/* The green pill SLIDES between the three formats — the
                      track, the pill and the curve all live in
                      components/SegmentedControl.tsx. It used to be three
                      `.nf-chip`s each painting its own background, which
                      cross-faded and popped; a switch with a moving part reads
                      as a switch. The forms' Event Type field is the same
                      component, so a change here changes both. */}
                  <FilterSection label="Format">
                    <SegmentedControl
                      options={EVENT_TYPES}
                      value={eventType}
                      onChange={setEventType}
                      ariaLabel="Format"
                    />
                  </FilterSection>

                  {/* Availability — the card's status tags, as filters. Only
                      "Selling Fast" lives here: Free is a Price preset below and
                      This Week is a Date Range preset, so nothing has two
                      homes, and Sold Out is not something anyone browses FOR
                      (those cards already sink to the bottom via soldOutLast).
                      It is NOT a Category chip — an event is Music *and* selling
                      fast, and Category is single-select, so filing it there
                      would make the two mutually exclusive. */}
                  <FilterSection label="Availability">
                    <div className="flex flex-wrap gap-2">
                      <Chip active={!sellingFast} onClick={() => setSellingFast(false)}>
                        All
                      </Chip>
                      <Chip active={sellingFast} onClick={() => setSellingFast(true)}>
                        Selling Fast
                      </Chip>
                    </div>
                  </FilterSection>

                  {showRadius && (
                    <FilterSection
                      label={
                        <>
                          Within <span style={{ color: GREEN }}>{radius} km</span> of {city.name}
                        </>
                      }
                    >
                      <div className="flex flex-wrap gap-2">
                        {RADIUS_OPTIONS.map((r) => (
                          <Chip key={r} active={radius === r} onClick={() => setRadius(r)}>
                            {r} km
                          </Chip>
                        ))}
                      </div>
                    </FilterSection>
                  )}

                  <FilterSection label="Date Range">
                    <div className="flex items-center gap-2">
                      <DateField value={dateFrom} onChange={setDateFrom} placeholder="Start" />
                      <span className="text-sm shrink-0" style={{ color: "var(--brand-hint)" }}>→</span>
                      <DateField value={dateTo} min={dateFrom} onChange={setDateTo} placeholder="End" />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* "All events" is the absence of a date filter, not a range
                          of its own, so it clears rather than setting anything. */}
                      <Chip active={!hasDateFilter} onClick={clearDates}>All events</Chip>
                      {DATE_PRESETS.map((p) => (
                        <Chip key={p.value} active={datePreset === p.value} onClick={() => selectDatePreset(p.value)}>
                          {p.label}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>

                  {/* ⚠️ THREE CONTROLS, ONE RANGE (Gautham, 2026-09-08). The
                      slider, the two fields and the preset chips are not
                      alternatives — they all call `setPriceRange` and all render
                      from `priceMin`/`priceMax`, so dragging a handle retypes the
                      fields, typing an amount moves the handles, and a chip does
                      both. **Never give one of them its own state**; that is the
                      only way they can ever disagree.

                      Order is deliberate and Gautham's: the slider reads the
                      range at a glance and comes first, directly under the label;
                      the fields are for an exact figure the slider's 100-step
                      cannot hit. There is no "Any price" chip — the range starts
                      cleared, and the Active chip's × or Clear all removes it. */}
                  <FilterSection label="Price">
                    <PriceSlider min={priceMin} max={priceMax} onChange={setPriceRange} />

                    <div className="flex items-center gap-2 mt-4">
                      <PriceField
                        value={priceMin}
                        onChange={(v) => setPriceRange(v, priceMax)}
                        placeholder="Min"
                      />
                      <span className="text-sm shrink-0" style={{ color: "var(--brand-hint)" }}>→</span>
                      <PriceField
                        value={priceMax}
                        onChange={(v) => setPriceRange(priceMin, v)}
                        placeholder="Max"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {PRICE_PRESETS.map((p) => (
                        <Chip
                          key={p.label}
                          active={pricePreset === p.label}
                          onClick={() => selectPricePreset(p)}
                        >
                          {p.label}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                </>
              )}

              {/* Active chips — every applied filter, individually removable */}
              {activeFiltersCount > 0 && (
                <div className="px-5 py-4 border-t" style={{ borderColor: "var(--brand-border)" }}>
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: "var(--brand-hint)" }}>
                    Active
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {category !== "All" && (
                      <ActiveChip label={`Category · ${category}`} onRemove={() => setCategory("All")} />
                    )}
                    {showEventFilters && eventType !== "All" && (
                      <ActiveChip label={`Format · ${eventType}`} onRemove={() => setEventType("All")} />
                    )}
                    {showEventFilters && sellingFast && (
                      <ActiveChip label="Selling Fast" onRemove={() => setSellingFast(false)} />
                    )}
                    {showRadius && radius !== DEFAULT_RADIUS && (
                      <ActiveChip label={`Within ${radius} km`} onRemove={() => setRadius(DEFAULT_RADIUS)} />
                    )}
                    {showEventFilters && hasDateFilter && (
                      <ActiveChip label={dateChipLabel} onRemove={clearDates} />
                    )}
                    {showEventFilters && hasPriceRange && (
                      <ActiveChip label={priceChipLabel} onRemove={clearPrice} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

        {/* Results — a single unified grid (events + communities mixed in "both" view) */}
        <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-semibold" style={{ color: "var(--brand-hint)" }}>
            {isLoading ? "Searching…" : `${countLabel(items.length)} found`}
          </span>
          {q && (
            <span className="text-sm" style={{ color: "var(--brand-hint)" }}>
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
            <svg className="w-10 h-10" style={{ color: "var(--brand-hint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
            <p className="text-[18px] font-semibold" style={{ color: "var(--brand-hint)" }}>Nothing matches your search</p>
            <p className="text-[16px]" style={{ color: "var(--brand-hint)" }}>Try widening your search or clearing some filters.</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm font-bold px-4 py-2 rounded-lg transition-all duration-150 active:scale-[0.98]"
                style={{ backgroundColor: GREEN, color: "var(--brand-on-green)" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={resultGridCls}>
            {items.map((item) =>
              item.kind === "event" ? (
                <EventCardItem
                  key={`e-${item.id}`}
                  event={toCarouselEvent(item.ev)}
                  onBookNow={(id) => router.push(`/event/${id}`)}
                />
              ) : (
                /* PARKED 2026-08-14 (MVP) — the community card. `items` never
                   contains a community now (see communityItems above), so this
                   branch is unreachable; it renders null rather than being
                   deleted, which keeps the Item union and every accessor intact.

                <CommunityCardItem
                  key={`c-${item.id}`}
                  community={toCommunityItem(item.co)}
                />

                */
                null
              )
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/** Proportioned to match the event card's "View details" CTA: 20px bold on 6px
 *  of vertical padding. The old 15px-on-10px inverted that ratio — small text
 *  floating in a roomy box, which is what made it read as tentative. */
function CreateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[20px] font-bold text-[var(--brand-on-green)] transition-all duration-150 active:scale-[0.98]"
      style={{ backgroundColor: GREEN }}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {label}
    </button>
  );
}

/** One stacked block of the filter sidebar, separated from the one above by a
 *  rule. `first` drops that rule so the top section doesn't double up with the
 *  header's own bottom border. */
function FilterSection({ label, first, children }: { label: React.ReactNode; first?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`px-5 py-4 ${first ? "" : "border-t"}`}
      style={{ borderColor: "var(--brand-border)" }}
    >
      <span className="block text-xs font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--brand-hint)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`nf-chip ${active ? "nf-chip-selected" : ""} px-3.5 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap`}
      style={{
        backgroundColor: active ? GREEN : "transparent",
        color: active ? "var(--brand-on-green)" : "var(--brand-text)",
        border: `2px solid ${active ? GREEN : "var(--brand-control-border)"}`,
      }}
    >
      {children}
    </button>
  );
}

/** An applied filter. Deliberately the SAME green-filled look as a selected Chip
 *  above — it represents the same selection, just in a second location, so a
 *  tinted "removable" variant would have read as a different kind of control.
 *  The × is the only thing that distinguishes it. */
function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-lg text-sm font-bold"
      style={{ backgroundColor: GREEN, color: "var(--brand-on-green)", border: `2px solid ${GREEN}` }}
    >
      {label}
      {/* The glyph is 14px; the padding (given back by the negative margin, so
          the chip's geometry is unchanged) makes the hit area 26px under a mouse
          and 38px under a finger. Without it the × was a 14px tap target. */}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="p-1.5 -m-1.5 [@media(pointer:coarse)]:p-3 [@media(pointer:coarse)]:-m-3 transition-opacity hover:opacity-60"
      >
        <CloseGlyph />
      </button>
    </span>
  );
}

/** A whole-rupee amount field with the currency symbol printed inside it. It is
 *  `type="text"` + `inputMode="numeric"`, not `type="number"`: a number input
 *  brings spinners, accepts "1e5" and silently reports "" for a value the
 *  browser considers invalid, none of which a filter bound wants. Non-digits are
 *  stripped as you type, so the field can only ever hold a valid amount. */
function PriceField({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <span className="relative flex-1 min-w-0">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
        style={{ color: "var(--brand-hint)" }}
      >
        {currencySymbol(PRICE_CURRENCY)}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value === null ? "" : String(value)}
        placeholder={placeholder}
        aria-label={`${placeholder} price`}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "");
          onChange(digits === "" ? null : Number(digits));
        }}
        className="w-full pl-7 pr-3 py-2 rounded-lg text-sm font-bold border-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)]
          border-[var(--brand-control-border)] bg-[var(--brand-bg)] text-[var(--brand-text)]"
      />
    </span>
  );
}

/** Two native range inputs stacked on one track. Native is deliberate: it is
 *  keyboard- and screen-reader-operable for free, and a slider library would be
 *  a dependency (which needs asking) for something 40 lines can do. The stack
 *  only works because BOTH inputs are
 *  `pointer-events-none` and only their thumbs take pointer events back — with
 *  the inputs live, the top one would swallow every click on the bottom one.
 *
 *  ⚠️ The handles are `rounded-full`, which the shape rules otherwise reserve.
 *  A slider handle is in the same family as a toggle knob (not a
 *  button-with-a-label), but it IS an addition to that list — flagged to
 *  Gautham, 2026-09-08. */
function PriceSlider({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  // null → the ends of the track. A typed value above the cap (option A can set
  // one) clamps for DISPLAY only; the filter itself keeps the real number.
  const lo = Math.min(min ?? 0, PRICE_SLIDER_MAX);
  const hi = Math.min(max ?? PRICE_SLIDER_MAX, PRICE_SLIDER_MAX);
  const pct = (v: number) => (v / PRICE_SLIDER_MAX) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold" style={{ color: "var(--brand-text)" }}>{money(lo)}</span>
        {/* The right-hand stop is a cap, not a ceiling — say so, or "₹10,000"
            would read as a claim that nothing costs more. */}
        <span className="text-sm font-bold" style={{ color: "var(--brand-text)" }}>
          {max === null ? `${money(PRICE_SLIDER_MAX)}+` : money(hi)}
        </span>
      </div>

      {/* 24px of grab band under a mouse, 44px under a finger — the inputs are
          inset-0, so the row's height IS the vertical hit area. The track spans
          stay where they are (top-1/2), so the mouse geometry is unchanged. */}
      <span className="relative block h-6 [@media(pointer:coarse)]:h-11">
        <span
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--brand-muted)" }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{ backgroundColor: GREEN, left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={0}
          max={PRICE_SLIDER_MAX}
          step={PRICE_STEP}
          value={lo}
          aria-label="Minimum price"
          // One step of clearance is kept between the handles so they can never
          // cross or stack, and 0 means "no lower bound" rather than "free".
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - PRICE_STEP);
            onChange(v <= 0 ? null : v, max);
          }}
          className={RANGE_INPUT_CLS}
        />
        <input
          type="range"
          min={0}
          max={PRICE_SLIDER_MAX}
          step={PRICE_STEP}
          value={hi}
          aria-label="Maximum price"
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + PRICE_STEP);
            onChange(min, v >= PRICE_SLIDER_MAX ? null : v);
          }}
          className={RANGE_INPUT_CLS}
        />
      </span>
    </div>
  );
}

/** The thumb has to be styled per-engine — there is no cross-browser selector
 *  for it — and the track is left transparent because the two spans behind these
 *  inputs draw the real one. */
const RANGE_INPUT_CLS =
  "absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none focus:outline-none " +
  "[&::-webkit-slider-runnable-track]:bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--brand-green)] " +
  "[&::-webkit-slider-thumb]:bg-[var(--brand-surface)] [&::-webkit-slider-thumb]:cursor-pointer " +
  "[@media(pointer:coarse)]:[&::-webkit-slider-thumb]:w-7 [@media(pointer:coarse)]:[&::-webkit-slider-thumb]:h-7 " +
  "[&::-moz-range-track]:bg-transparent " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--brand-green)] " +
  "[&::-moz-range-thumb]:bg-[var(--brand-surface)] [&::-moz-range-thumb]:cursor-pointer " +
  "[@media(pointer:coarse)]:[&::-moz-range-thumb]:w-7 [@media(pointer:coarse)]:[&::-moz-range-thumb]:h-7";

/** A date input that shows a word ("Start") instead of the browser's mm/dd/yyyy
 *  until it's focused or filled — `type="text"` has a placeholder, `type="date"`
 *  ignores one, so the type flips on focus. The native picker indicator is
 *  stretched over the whole field and hidden, so clicking anywhere opens it —
 *  which is also why this field draws NO glyph of its own: two of these sit in
 *  one narrow sidebar row either side of an arrow, and a calendar in each would
 *  cost the words "Start" and "End" the room they need. It is therefore not a
 *  `FormControls.DateTimeInput`, which is the app's glyphed date field. */
function DateField({
  value,
  min,
  onChange,
  placeholder,
}: {
  value: string;
  min?: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Open the calendar on the FIRST click. Without this it took two: the field
  // starts as type="text" (so it can show a word instead of mm/dd/yyyy), and a
  // text input has no picker indicator to hit — the first click only flipped it
  // to type="date", and the second finally landed on the indicator. showPicker()
  // can't run until that flip has painted, hence the rAF. It throws on a text
  // input and where unsupported, so it's guarded and degrades to typing.
  function openPicker() {
    setFocused(true);
    requestAnimationFrame(() => {
      try {
        ref.current?.showPicker();
      } catch {
        /* no picker here — the field still accepts a typed date */
      }
    });
  }

  return (
    <span className="relative flex-1 min-w-0">
      <input
        ref={ref}
        // A native date input renders its value in the BROWSER's locale format —
        // no attribute or CSS changes that. So the field only becomes type="date"
        // while it's focused (for the picker); at rest it's a read-only text box
        // showing our own dd/mm/yy, or the placeholder when empty.
        type={focused ? "date" : "text"}
        value={focused ? value : value ? shortDate(value) : ""}
        readOnly={!focused}
        min={min}
        placeholder={placeholder}
        onFocus={openPicker}
        onClick={openPicker}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm font-bold border-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)]
          border-[var(--brand-control-border)] bg-[var(--brand-bg)] text-[var(--brand-text)]
          [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0
          [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full
          [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
    </span>
  );
}

function CloseGlyph() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
