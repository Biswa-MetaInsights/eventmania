"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi, recommendationsApi } from "@eventmind/api";
import { useLocationStore, DEFAULT_CITY } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventCard } from "@/components/EventCard";
import { CityPicker } from "@/components/CityPicker";

const GREEN = "#184E4A";
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

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", q, selectedCity.name],
    queryFn: () =>
      eventsApi
        .search({ q, lat: selectedCity.lat, lng: selectedCity.lng, radius: RADIUS_KM })
        .then((r) => r.data),
  });

  useEffect(() => {
    if (!hasHydrated || q) return;
    if (inProgressRef.current.has(selectedCity.name)) return;

    // Skip if already ingested in a previous session
    if (getIngestedCities().has(selectedCity.name)) return;

    inProgressRef.current.add(selectedCity.name);

    recommendationsApi
      .ingestCity(selectedCity.name, selectedCity.lat, selectedCity.lng, RADIUS_KM)
      .then(() => {
        markCityIngested(selectedCity.name); // persist so we never re-ingest this city
        queryClient.invalidateQueries({ queryKey: ["events", q, selectedCity.name] });

        // Fall back to AI only if city is still empty after ingestion
        setTimeout(async () => {
          const fresh = queryClient.getQueryData<typeof events>(["events", q, selectedCity.name]);
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />
      <HeroCarousel />

      {/* ── Section header ── */}
      <div className="flex items-end justify-between px-12 pt-8 pb-7">
        <div>
          <h2 className="font-extrabold tracking-[-0.5px]" style={{ fontSize: 26, color: "#111827" }}>
            Upcoming Events
          </h2>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Showing events within {RADIUS_KM} km of{" "}
            <span className="font-semibold" style={{ color: "#111827" }}>{selectedCity.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CityPicker />
          <button className="flex items-center gap-1 text-sm font-semibold" style={{ color: GREEN }}>
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Event grid ── */}
      <div className="px-12 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <svg className="w-10 h-10" style={{ color: "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-[15px] font-semibold" style={{ color: "#6B7280" }}>
              No events found near {selectedCity.name}
            </p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              Try a different city or check back soon.
            </p>
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
