"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@eventmind/api";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { EventCard } from "@/components/EventCard";
import { EventsCarousel, SAMPLE_EVENTS } from "@/components/EventsCarousel";
import { CommunityCarousel, SAMPLE_COMMUNITIES } from "@/components/CommunityCarousel";

const GREEN = "#184E4A";

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

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", q],
    queryFn: () => eventsApi.search({ q }).then((r) => r.data),
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />
      <HeroCarousel />

      {/* ── Horizontal event carousel ── */}
      <EventsCarousel
        events={SAMPLE_EVENTS}
        location="Thiruvananthapuram"
        seeAllHref="/events/thiruvananthapuram"
      />

      {/* ── Community carousel ── */}
      <CommunityCarousel
        communities={SAMPLE_COMMUNITIES}
        location="Thiruvananthapuram"
        seeAllHref="/communities/thiruvananthapuram"
      />

      {/* ── Section header ── */}
      <div className="flex items-end justify-between px-12 pt-8 pb-7">
        <div>
          <h2
            className="font-extrabold tracking-[-0.5px]"
            style={{ fontSize: 26, color: "#111827" }}
          >
            Upcoming Events
          </h2>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Discover what&apos;s happening around you
          </p>
        </div>
        <button
          className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: GREEN }}
        >
          View All
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* ── Event grid ── */}
      <div className="px-12 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div
              className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }}
            />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
            </svg>
            <p className="text-[16px]" style={{ color: "#94A3B8" }}>
              No events found. Try searching above.
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
