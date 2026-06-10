"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi, reviewsApi } from "@eventmind/api";
import type { Review, ReviewAggregates } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { EventChatWidget } from "@/components/EventChatWidget";

const GREEN = "#184E4A";

function heroImg(id: string) {
  return `https://picsum.photos/seed/${id}/1200/450`;
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", opts);
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id).then((r) => r.data),
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["reviews", id],
    queryFn: () => reviewsApi.forEvent(id).then((r) => r.data),
    retry: false,
  });

  const { data: aggregates } = useQuery<ReviewAggregates>({
    queryKey: ["review-aggregates", id],
    queryFn: () => reviewsApi.aggregates(id).then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F2EFEA" }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: `${GREEN} transparent transparent transparent` }}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F2EFEA" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg font-medium text-gray-500">Event not found.</p>
        </div>
      </div>
    );
  }

  const isFree = event.price === 0;
  const location =
    (event.location?.address as string) ??
    (event.location?.city as string) ??
    "Online Event";

  function handleBookNow() {
    router.push(isAuthenticated ? `/checkout/${id}` : "/auth");
  }

  return (
    <div className="min-h-screen bg-[#F2EFEA] text-left">
      <Navbar />

      {/* ── Hero image ── */}
      <div className="relative w-full overflow-hidden" style={{ height: 450 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg(id)} alt={event.title} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }}
        />
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-[#F2EFEA] flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="px-12 py-10" style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Full-width centered title */}
        <div className="text-center mb-10">
          <span
            className="inline-block px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-wide mb-5"
            style={{ backgroundColor: `${GREEN}14`, color: GREEN }}
          >
            {(event.category ?? "GENERAL").toUpperCase()}
          </span>
          <h1
            className="font-extrabold leading-[1.1]"
            style={{ fontSize: 48, color: "#0A0F1A" }}
          >
            {event.title}
          </h1>
        </div>

        <div className="mb-10 h-px bg-[#E2DDD5]" />

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 64, alignItems: "start" }}>

          {/* ── Left column ── */}
          <div style={{ textAlign: "left" }}>
            <h2 className="text-[22px] font-bold text-[#111827] mb-4">
              About this event
            </h2>
            <p className="text-[18px] leading-relaxed text-[#4B5563]">
              {event.description ?? "No description provided."}
            </p>

            <div className="my-12 h-px bg-[#E2DDD5]" />

            {/* Reviews */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[22px] font-bold text-[#111827]">Attendee Reviews</h2>
              {aggregates && (
                <div className="flex items-center gap-1.5">
                  <StarIcon />
                  <span className="text-[18px] font-bold text-[#111827]">
                    {Number(aggregates.average_rating).toFixed(1)}
                  </span>
                  <span className="text-[#6B7280]">({aggregates.review_count})</span>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="text-[#94A3B8] text-[16px]">
                No reviews yet. Be the first to attend and share your experience!
              </p>
            ) : (
              <div className="space-y-8">
                {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div>
            <div
              className="rounded-3xl p-8"
              style={{ border: "1px solid #E2DDD5", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}
            >
              <SidebarItem icon={<CalendarIcon />} title="Date & Time"
                value={`${fmt(event.start_date, { weekday: "long", month: "short", day: "numeric" })}\n${fmt(event.start_date, { hour: "numeric", minute: "2-digit" })}`}
              />
              <div className="my-6 h-px bg-[#E2DDD5]" />
              <SidebarItem icon={<LocationIcon />} title="Location" value={location} />
              <div className="my-6 h-px bg-[#E2DDD5]" />
              <SidebarItem icon={<OrganizerIcon />} title="Organizer" value="EventMind" />
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Event Assistant widget ── */}
      <EventChatWidget event={event} />

      {/* ── Sticky booking bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-12 bg-[#F2EFEA] z-30"
        style={{ height: 88, borderTop: "1px solid #E2DDD5" }}
      >
        <div style={{ textAlign: "left" }}>
          <p className="text-sm text-[#6B7280]">Starting from</p>
          <p className="text-[28px] font-bold text-[#0A0F1A]">
            {isFree ? "FREE" : `$${event.price}`}
          </p>
        </div>
        <button
          onClick={handleBookNow}
          className="px-16 py-4 rounded-2xl text-[18px] font-bold text-[#F2EFEA] transition-colors"
          style={{ backgroundColor: GREEN }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#133d39")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
        >
          Book Now
        </button>
      </div>

      <div className="h-24" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarItem({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${GREEN}0d` }}
      >
        {icon}
      </div>
      <div style={{ textAlign: "left" }}>
        <p className="text-sm font-bold text-[#9CA3AF] mb-1">{title}</p>
        <p className="text-[16px] font-semibold text-[#111827] whitespace-pre-line">{value}</p>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div style={{ textAlign: "left" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${GREEN}14` }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
          </div>
          <span className="font-bold text-[#111827]">Verified Attendee</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} className="w-4 h-4" viewBox="0 0 24 24" fill={i < review.rating ? "#F59E0B" : "#E2E8F0"}>
              <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.543 2.826c-.999.625-2.227-.276-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
            </svg>
          ))}
        </div>
      </div>
      <p className="text-[16px] leading-relaxed text-[#4B5563]">{review.content}</p>
    </div>
  );
}

function StarIcon() {
  return <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#F59E0B"><path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.543 2.826c-.999.625-2.227-.276-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" /></svg>;
}
function CalendarIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;
}
function LocationIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>;
}
function OrganizerIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>;
}
