"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi, communitiesApi, recommendationsApi } from "@eventmind/api";
import { useLocationStore, DEFAULT_CITY, isOnlineCity } from "@eventmind/store";
import type { Event } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventsCarousel } from "@/components/EventsCarousel";
import { CommunityCarousel } from "@/components/CommunityCarousel";
import { CityPicker } from "@/components/CityPicker";
import { Footer } from "@/components/Footer";
import { toCarouselEvent, toCommunityItem } from "@/lib/card-adapters";

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
function exploreHref(view: "events" | "communities", cityName: string): string {
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

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", q, selectedCity.name],
    queryFn: () =>
      eventsApi
        .search({ q, lat: selectedCity.lat, lng: selectedCity.lng, radius: RADIUS_KM })
        .then((r) => r.data),
  });

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["communities", q, selectedCity.name],
    queryFn: () => communitiesApi.search({ q, city: selectedCity.name }).then((r) => r.data),
  });

  // Online events are location-independent (stored at lat/lng 0,0), so the city-radius
  // query above filters them out. Fetch them separately so the "Online Events" row fills.
  const { data: onlineEvents, isLoading: onlineLoading } = useQuery({
    queryKey: ["events", "online", q],
    queryFn: () => eventsApi.search({ q, category: "online", limit: 24 }).then((r) => r.data),
  });

  // Likewise online communities are city-independent — fetch separately so the
  // "Online Communities" row fills regardless of the selected city.
  const { data: onlineCommunities, isLoading: onlineCommLoading } = useQuery({
    queryKey: ["communities", "online", q],
    queryFn: () => communitiesApi.search({ q, category: "online" }).then((r) => r.data),
  });

  // Auto-ingest events for the selected city from Ticketmaster (once per city, ever).
  useEffect(() => {
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
  // Merge city communities with online communities, de-duping by id (an online
  // community could also match the city query if it ever carries a city tag).
  const seenCommunityIds = new Set<string>();
  const carouselCommunities = [...(communities ?? []), ...(onlineCommunities ?? [])]
    .filter((c) => {
      const id = String(c.id);
      if (seenCommunityIds.has(id)) return false;
      seenCommunityIds.add(id);
      return true;
    })
    .map(toCommunityItem);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
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

      <CommunityCarousel
        communities={carouselCommunities}
        location={selectedCity.name}
        seeAllHref={exploreHref("communities", selectedCity.name)}
        onlineSeeAllHref={exploreHref("communities", "Online")}
        isLoading={communitiesLoading || onlineCommLoading}
        locationSlot={<CityPicker variant="icon" />}
      />

      <Footer />
    </div>
  );
}
