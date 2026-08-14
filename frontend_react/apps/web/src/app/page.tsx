"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recommendationsApi } from "@eventmind/api";
// PARKED 2026-08-14 (MVP) — `communitiesSource` dropped from this import.
import { eventsSource, isDummyMode } from "@/lib/data-source";
import { useLocationStore, DEFAULT_CITY, isOnlineCity } from "@eventmind/store";
import { EVENT_FORMATS, type Event } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventsCarousel } from "@/components/EventsCarousel";
// PARKED 2026-08-14 (MVP) — import { CommunityCarousel } from "@/components/CommunityCarousel";
import { CategoryGrid } from "@/components/CategoryGrid";
import { CityPicker } from "@/components/CityPicker";
import { Footer } from "@/components/Footer";
// PARKED 2026-08-14 (MVP) — `toCommunityItem` dropped from this import.
import { toCarouselEvent } from "@/lib/card-adapters";

const RADIUS_KM = 100;
const INGESTED_KEY = "eventmind-ingested-cities"; // localStorage key

function getIngestedCities(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(INGESTED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markCityIngested(city: string) {
  if (typeof window === "undefined") return;
  try {
    const cities = getIngestedCities();
    cities.add(city);
    localStorage.setItem(INGESTED_KEY, JSON.stringify([...cities]));
  } catch {}
}

// "View all" on the home carousels lands on the unified Explore page, scoped to the
// selected city (matched by name on the Explore side) and the relevant view.
// PARKED 2026-08-14 (MVP) — the param was `view: "events" | "communities"`;
// narrowed to "events" while communities are deferred to Phase 2.
function exploreHref(view: "events", cityName: string): string {
  return `/explore?view=${view}&city=${encodeURIComponent(cityName)}`;
}

export default function Home() {
  return (
    <Suspense>
      <DiscoveryPage />
    </Suspense>
  );
}

function DiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? undefined;

  const _selectedCity = useLocationStore((s) => s.selectedCity);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);
  const selectedCity = hasHydrated ? _selectedCity : DEFAULT_CITY;

  const queryClient = useQueryClient();
  const inProgressRef = useRef<Set<string>>(new Set()); // prevent double-fire in same session

  // event_type keeps the city row to events you can physically attend (In-Person
  // + Hybrid). The geo radius alone is not enough: online events sit at lat/lng
  // 0,0 in real mode, but dummy mode ignores geo entirely, so without this the
  // online events would leak into the city row there.
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", q, selectedCity.name],
    queryFn: () =>
      eventsSource
        .search({
          q,
          event_type: EVENT_FORMATS.inPerson,
          lat: selectedCity.lat,
          lng: selectedCity.lng,
          radius: RADIUS_KM,
        })
        .then((r) => r.data),
  });

  /* PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2, so the city
     community query is not fired at all (not merely hidden at the render site).

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["communities", q, selectedCity.name],
    queryFn: () => communitiesSource.search({ q, city: selectedCity.name }).then((r) => r.data),
  });

  */

  // Online events are location-independent (stored at lat/lng 0,0), so the city-radius
  // query above filters them out. Fetch them separately so the "Online Events" row fills.
  // Filtered by FORMAT, not category — these events carry their own real categories
  // (Music, Technology, …), so the row shows a spread of category chips.
  const { data: onlineEvents, isLoading: onlineLoading } = useQuery({
    queryKey: ["events", "online", q],
    queryFn: () =>
      eventsSource.search({ q, event_type: EVENT_FORMATS.online, limit: 24 }).then((r) => r.data),
  });

  /* PARKED 2026-08-14 (MVP) — the online-communities query, twin of the city one
     above. Online communities are city-independent, which is why this was a
     second fetch rather than a filter.

  const { data: onlineCommunities, isLoading: onlineCommLoading } = useQuery({
    queryKey: ["communities", "online", q],
    queryFn: () => communitiesSource.search({ q, category: "online" }).then((r) => r.data),
  });

  */

  // Auto-ingest events for the selected city from Ticketmaster (once per city, ever).
  useEffect(() => {
    if (isDummyMode) return; // dummy mode serves local fixtures — never hit the ingestion backend
    if (!hasHydrated || q) return;
    if (isOnlineCity(selectedCity)) return; // "Online" is not a geographic city — nothing to ingest
    if (inProgressRef.current.has(selectedCity.name)) return;
    if (getIngestedCities().has(selectedCity.name)) return;

    inProgressRef.current.add(selectedCity.name);

    recommendationsApi
      .ingestCity(selectedCity.name, selectedCity.lat, selectedCity.lng, RADIUS_KM)
      .then(() => {
        markCityIngested(selectedCity.name); // persist so we never re-ingest this city
        queryClient.invalidateQueries({ queryKey: ["events", q, selectedCity.name] });

        // Fall back to AI only if city is still empty after ingestion
        setTimeout(async () => {
          const fresh = queryClient.getQueryData<Event[]>(["events", q, selectedCity.name]);
          if (!fresh || fresh.length === 0) {
            await recommendationsApi
              .generateEventsForCity(selectedCity.name, selectedCity.lat, selectedCity.lng)
              .catch(() => {});
            queryClient.invalidateQueries({ queryKey: ["events", q, selectedCity.name] });
          }
        }, 3000);
      })
      .catch(() => inProgressRef.current.delete(selectedCity.name));
  }, [hasHydrated, selectedCity.name, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const carouselEvents = [
    ...(events ?? []).map(toCarouselEvent),
    ...(onlineEvents ?? []).map(toCarouselEvent),
  ];
  /* PARKED 2026-08-14 (MVP) — the community merge that fed <CommunityCarousel>.

     Merge city communities with online communities, de-duping by id (an online
     community could also match the city query if it ever carries a city tag).

  const seenCommunityIds = new Set<string>();
  const carouselCommunities = [...(communities ?? []), ...(onlineCommunities ?? [])]
    .filter((c) => {
      const id = String(c.id);
      if (seenCommunityIds.has(id)) return false;
      seenCommunityIds.add(id);
      return true;
    })
    .map(toCommunityItem);

  */

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />
      <HeroCarousel />

      <EventsCarousel
        events={carouselEvents}
        location={selectedCity.name}
        seeAllHref={exploreHref("events", selectedCity.name)}
        onlineSeeAllHref={exploreHref("events", "Online")}
        isLoading={eventsLoading || onlineLoading}
        onBookNow={(id) => router.push(`/event/${id}`)}
        locationSlot={<CityPicker variant="icon" />}
      />

      {/* PARKED 2026-08-14 (MVP) — the community carousel ("Communities in {city}"
          + the "Online Communities" row). Communities are deferred to Phase 2 and
          the word must not appear anywhere users can see it.

          To restore: uncomment this block plus, above, the two community queries,
          the carouselCommunities merge, and the three parked imports — then widen
          exploreHref's `view` param back to "events" | "communities".

      <CommunityCarousel
        communities={carouselCommunities}
        location={selectedCity.name}
        seeAllHref={exploreHref("communities", selectedCity.name)}
        onlineSeeAllHref={exploreHref("communities", "Online")}
        isLoading={communitiesLoading || onlineCommLoading}
        locationSlot={<CityPicker variant="icon" />}
      />

      */}

      <CategoryGrid />

      <Footer />
    </div>
  );
}
