"use client";

import type { Event } from "@eventmind/types";

const GREEN = "#184E4A";
// Use event ID as seed so each card gets a unique but consistent placeholder image
function cardImg(id: string) {
  return `https://picsum.photos/seed/${id}/400/300`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface Props {
  event: Event;
  onTap: () => void;
}

export function EventCard({ event, onTap }: Props) {
  const isFree = event.price === 0;
  const location =
    (event.location?.address as string) ??
    (event.location?.city as string) ??
    "Online";

  return (
    <div
      onClick={onTap}
      className="group bg-white rounded-2xl overflow-hidden cursor-pointer flex flex-col"
      style={{ border: "1px solid #E2E8F0" }}
    >
      {/* Image */}
      <div className="relative w-full" style={{ height: 180 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImg(event.id)}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        {/* Price badge */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
          style={{
            backgroundColor: isFree ? GREEN : "white",
            color: isFree ? "white" : GREEN,
          }}
        >
          {isFree ? "FREE" : `$${event.price.toFixed(0)}`}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3.5 pb-3.5 flex flex-col gap-1.5 flex-1">
        <span
          className="text-[11px] font-bold tracking-[1px] uppercase"
          style={{ color: GREEN }}
        >
          {event.category}
        </span>

        <h3
          className="text-[16px] font-bold leading-snug text-[#0A0F1A] line-clamp-2"
        >
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
          <CalendarIcon />
          <span>{formatDate(event.start_date)} · {formatTime(event.start_date)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
          <LocationIcon />
          <span className="truncate">{location}</span>
        </div>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[14px] font-bold" style={{ color: GREEN }}>
            {isFree ? "Free Entry" : `$${event.price.toFixed(2)}`}
          </span>
          <span className="flex items-center gap-1 text-[12px] font-medium text-[#94A3B8]">
            Register <ArrowIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3 h-3 shrink-0 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-3 h-3 shrink-0 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}
