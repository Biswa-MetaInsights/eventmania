"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// PARKED 2026-08-14 (MVP) â€” `communitiesSource` dropped from this import.
import { eventsSource } from "@/lib/data-source";
import { useLocationStore, DEFAULT_CITY } from "@eventmind/store";
import { EVENT_FORMATS } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventsCarousel } from "@/components/EventsCarousel";
// PARKED 2026-08-14 (MVP) â€” import { CommunityCarousel } from "@/components/CommunityCarousel";
import { FeatureBand } from "@/components/FeatureBand";
import { CategoryGrid } from "@/components/CategoryGrid";
import { CityPicker } from "@/components/CityPicker";
import { Footer } from "@/components/Footer";
// PARKED 2026-08-14 (MVP) â€” `toCommunityItem` dropped from this import.
import { toCarouselEvent } from "@/lib/card-adapters";

const RADIUS_KM = 100;

// The private server sync populates external listings. Discovery only reads saved
// provider/native events; it never generates fictional events when a city is empty.

// "View all" on the home carousels lands on the unified Explore page, scoped to the
// selected city (matched by name on the Explore side) and the relevant view.
// PARKED 2026-08-14 (MVP) â€” the param was `view: "events" | "communities"`;
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

  /* PARKED 2026-08-14 (MVP) â€” communities are deferred to Phase 2, so the city
     community query is not fired at all (not merely hidden at the render site).

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["communities", q, selectedCity.name],
    queryFn: () => communitiesSource.search({ q, city: selectedCity.name }).then((r) => r.data),
  });

  */

  // Online events are location-independent (stored at lat/lng 0,0), so the city-radius
  // query above filters them out. Fetch them separately so the "Online Events" row fills.
  // Filtered by FORMAT, not category â€” these events carry their own real categories
  // (Music, Technology, â€¦), so the row shows a spread of category chips.
  const { data: onlineEvents, isLoading: onlineLoading } = useQuery({
    queryKey: ["events", "online", q],
    queryFn: () =>
      eventsSource.search({ q, event_type: EVENT_FORMATS.online, limit: 24 }).then((r) => r.data),
  });

  /* PARKED 2026-08-14 (MVP) â€” the online-communities query, twin of the city one
     above. Online communities are city-independent, which is why this was a
     second fetch rather than a filter.

  const { data: onlineCommunities, isLoading: onlineCommLoading } = useQuery({
    queryKey: ["communities", "online", q],
    queryFn: () => communitiesSource.search({ q, category: "online" }).then((r) => r.data),
  });

  */

  const carouselEvents = [
    ...(events ?? []).map(toCarouselEvent),
    ...(onlineEvents ?? []).map(toCarouselEvent),
  ];
  /* PARKED 2026-08-14 (MVP) â€” the community merge that fed <CommunityCarousel>.

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

      {/* PARKED 2026-08-14 (MVP) â€” the community carousel ("Communities in {city}"
          + the "Online Communities" row). Communities are deferred to Phase 2 and
          the word must not appear anywhere users can see it.

          To restore: uncomment this block plus, above, the two community queries,
          the carouselCommunities merge, and the three parked imports â€” then widen
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

      <FeatureBand />

      <CategoryGrid />

      <Footer />
    </div>
  );
}
