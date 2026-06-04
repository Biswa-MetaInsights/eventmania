"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi, communitiesApi } from "@eventmind/api";
import type { Event, Community } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventsCarousel, type CarouselEvent } from "@/components/EventsCarousel";
import { CommunityCarousel, type CommunityItem } from "@/components/CommunityCarousel";

function toCarouselEvent(event: Event): CarouselEvent {
  const start = new Date(event.start_date);
  const date = start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const venue = (event.location as Record<string, string>)?.name ?? "Venue TBC";
  const price = Number(event.price);
  const isFree = price === 0;
  const isSoldOut = event.capacity > 0 && event.tickets_sold >= event.capacity;
  const sellingFast = !isSoldOut && event.capacity > 0 && event.tickets_sold / event.capacity > 0.7;

  return {
    id: String(event.id),
    title: event.title,
    date,
    time,
    venue,
    price: isFree ? "Free" : `₹${price.toLocaleString("en-IN")} onwards`,
    imageUrl: `https://picsum.photos/seed/${event.id}/800/450`,
    badge: isSoldOut ? "Sold Out" : sellingFast ? "Selling Fast" : isFree ? "Free" : undefined,
    badgeType: isSoldOut ? "sold-out" : sellingFast ? "selling-fast" : isFree ? "free" : undefined,
    isSoldOut,
    category: event.category.toLowerCase(),
  };
}

function toCommunityItem(community: Community): CommunityItem {
  const location = community.location as Record<string, string>;
  const venue = location?.name ?? "Venue TBC";
  const price = Number(community.price);
  const isFree = price === 0;

  let date = "";
  let time = "";
  if (community.next_event_date) {
    const next = new Date(community.next_event_date);
    date = next.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    time = next.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  const count = community.member_count;
  const memberCount = count >= 1000
    ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k`
    : String(count);

  return {
    id: String(community.id),
    title: community.name,
    date,
    time,
    venue,
    price: isFree ? "Free" : `₹${price.toLocaleString("en-IN")}/month onwards`,
    memberCount,
    imageUrl: `https://picsum.photos/seed/${community.id}/800/450`,
    badge: isFree ? "Free" : undefined,
    badgeType: isFree ? "free" : undefined,
    category: community.category.toLowerCase(),
  };
}

// Wrapped in Suspense because useSearchParams requires it in Next.js App Router
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

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", q],
    queryFn: () => eventsApi.search({ q }).then((r) => r.data),
  });

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["communities", q],
    queryFn: () => communitiesApi.search({ q }).then((r) => r.data),
  });

  const carouselEvents = (events ?? []).map(toCarouselEvent);
  const carouselCommunities = (communities ?? []).map(toCommunityItem);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />
      <HeroCarousel />

      <EventsCarousel
        events={carouselEvents}
        location="Thiruvananthapuram"
        seeAllHref="/events/thiruvananthapuram"
        isLoading={eventsLoading}
        onBookNow={(id) => router.push(`/event/${id}`)}
      />

      <CommunityCarousel
        communities={carouselCommunities}
        location="Thiruvananthapuram"
        seeAllHref="/communities/thiruvananthapuram"
        isLoading={communitiesLoading}
      />
    </div>
  );
}
