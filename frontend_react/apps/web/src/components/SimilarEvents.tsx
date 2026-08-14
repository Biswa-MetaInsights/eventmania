"use client";

import { useQuery } from "@tanstack/react-query";
import { EVENT_FORMATS, type Event } from "@eventmind/types";
import { useLocationStore } from "@eventmind/store";
import { eventsSource } from "@/lib/data-source";
import { toCarouselEvent } from "@/lib/card-adapters";
import { EventCardItem, SkeletonCard, type CarouselEvent } from "./EventsCarousel";
import { Rail, RAIL_ITEM, RAIL_CARD_BASIS } from "./Rail";

// Same radius the home page uses for its city row, so "near this event" means
// the same distance everywhere in the app.
const RADIUS_KM = 100;

/** Cards shown at most. Beyond this the row stops being browsable and becomes a list. */
const MAX_CARDS = 12;

/**
 * Coordinates of the event being viewed. Ticketmaster rows that failed geocoding
 * are stored at 0,0 (see CLAUDE.md), which is a real point in the Atlantic — a
 * radius search around it returns nothing useful, so treat it as "no coords".
 */
function eventCoords(event: Event): { lat: number; lng: number } | null {
  const loc = event.location as Record<string, unknown> | undefined;
  const lat = Number(loc?.latitude);
  const lng = Number(loc?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function SimilarEvents({ event }: { event: Event }) {
  const selectedCity = useLocationStore((s) => s.selectedCity);
  const category = event.category;

  // Anchor the geo search on the event itself, so a Berlin event suggests Berlin
  // events regardless of what the city picker says. The picker is only the
  // fallback for events with no usable coordinates.
  const coords = eventCoords(event) ?? { lat: selectedCity.lat, lng: selectedCity.lng };

  const { data: nearby = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ["similar-events", "nearby", category, coords.lat, coords.lng],
    queryFn: () =>
      eventsSource
        .search({ category, lat: coords.lat, lng: coords.lng, radius: RADIUS_KM, limit: 24 })
        .then((r) => r.data),
  });

  // Online events sit outside any radius (they carry no real coordinates), so
  // they need their own query — the same split the home page makes.
  const { data: online = [], isLoading: onlineLoading } = useQuery({
    queryKey: ["similar-events", "online", category],
    queryFn: () =>
      eventsSource
        .search({ category, event_type: EVENT_FORMATS.online, limit: 24 })
        .then((r) => r.data),
  });

  const isLoading = nearbyLoading || onlineLoading;

  // Nearby first, then online. A Hybrid event matches both queries, so dedupe by
  // id — and never suggest the event the user is already looking at.
  const seen = new Set<string>([String(event.id)]);
  const events: CarouselEvent[] = [...nearby, ...online]
    .filter((e) => {
      const id = String(e.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_CARDS)
    .map(toCarouselEvent);

  // Render NOTHING — including the divider — when there is nothing to suggest,
  // so an empty rail leaves no orphaned rule behind.
  if (!isLoading && events.length === 0) return null;

  return (
    <Rail title="Similar events" itemCount={events.length}>
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={RAIL_CARD_BASIS}>
              <SkeletonCard />
            </div>
          ))
        : events.map((e) => (
            <div key={e.id} className={RAIL_ITEM}>
              <EventCardItem event={e} />
            </div>
          ))}
    </Rail>
  );
}