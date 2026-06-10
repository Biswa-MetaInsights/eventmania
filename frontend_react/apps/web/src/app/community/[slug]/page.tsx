"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { communityApi, eventsApi } from "@eventmind/api";
import { Navbar } from "@/components/navbar/Navbar";
import { EventCardItem } from "@/components/EventsCarousel";
import { toCarouselEvent } from "@/lib/card-adapters";

const GREEN = "#184E4A";

export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const { data: communityRes, isLoading: communityLoading } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => communityApi.getBySlug(slug).then((r) => r.data),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["community-events", communityRes?.id],
    queryFn: () =>
      eventsApi
        .search({ community_id: communityRes!.id, limit: 100 })
        .then((r) => r.data),
    enabled: !!communityRes?.id,
  });

  const isLoading = communityLoading || eventsLoading;

  if (communityLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
        </div>
      </div>
    );
  }

  if (!communityRes) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
        <Navbar />
        <div className="flex flex-col items-center py-24 gap-4">
          <p className="text-[18px] font-semibold" style={{ color: "#6B7280" }}>Community not found</p>
          <button
            onClick={() => router.push("/communities")}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-[#F2EFEA]"
            style={{ backgroundColor: GREEN }}
          >
            Explore Communities
          </button>
        </div>
      </div>
    );
  }

  const community = communityRes;
  const initial = community.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      {/* Hero banner */}
      <div className="px-12 py-12" style={{ backgroundColor: GREEN }}>
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#F2EFEA" }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[30px] font-extrabold text-[#F2EFEA]">{community.name}</h1>
              {community.category && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#F2EFEA" }}>
                  {community.category}
                </span>
              )}
            </div>
            {community.description && (
              <p className="text-sm leading-relaxed mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                {community.description}
              </p>
            )}
            {community.website && (
              <a
                href={community.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                {community.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Events section */}
      <div className="px-12 py-10 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-[22px] font-bold" style={{ color: "#111827" }}>Events</h2>
            <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
              {isLoading ? "Loading…" : `${events?.length ?? 0} event${events?.length !== 1 ? "s" : ""} from this community`}
            </p>
          </div>
          <button
            onClick={() => router.push(`/explore?community_id=${community.id}`)}
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: GREEN }}
          >
            View all
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        {eventsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 rounded-2xl"
            style={{ backgroundColor: "#F2EFEA", border: "1px solid #E2DDD5" }}>
            <svg className="w-9 h-9" style={{ color: "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-[14px] font-semibold" style={{ color: "#6B7280" }}>No events yet</p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              The organiser hasn&apos;t linked any events to this community yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {events.map((event) => (
              <EventCardItem
                key={event.id}
                event={toCarouselEvent(event)}
                onBookNow={(id) => router.push(`/event/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
