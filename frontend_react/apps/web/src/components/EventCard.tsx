"use client";

import type { Event } from "@eventmind/types";
import { BRAND } from "@/lib/theme";
import { formatPrice } from "@/lib/currency";
import { ShareButton } from "./ShareButton";
import { CalendarIcon as SharedCalendarIcon, LocationPinIcon as SharedLocationPinIcon } from "./EventIcons";

const GREEN = BRAND.green;
const SURFACE = BRAND.surface;
const ON_GREEN = BRAND.onGreen;
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
      // data-keep-type: opts this card out of the global 15px font-size floor so
      // its intentional 11/12/14px type is preserved exactly. Do not remove.
      data-keep-type
      className="group bg-[var(--brand-surface)] rounded-lg overflow-hidden cursor-pointer flex flex-col"
      style={{ border: "1px solid var(--brand-border)" }}
    >
      {/* Image */}
      <div className="relative w-full" style={{ height: 180 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImg(event.id)}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        {/* Share button (does not trigger the card's navigation) */}
        <ShareButton
          event={event}
          stopPropagation
          iconClassName="w-4 h-4"
          className="absolute top-3 left-3 w-8 h-8 shadow-sm bg-[var(--brand-surface)] text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)]"
        />
        {/* Price badge */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm"
          style={{
            backgroundColor: isFree ? GREEN : SURFACE,
            color: isFree ? ON_GREEN : GREEN,
          }}
        >
          {formatPrice(event.price, event.currency)}
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
          className="text-[16px] font-bold leading-snug text-[var(--brand-text)] line-clamp-2"
        >
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[12px] text-[var(--brand-hint)]">
          <CalendarIcon />
          <span>{formatDate(event.start_date)} · {formatTime(event.start_date)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-[var(--brand-hint)]">
          <LocationIcon />
          <span className="truncate">{location}</span>
        </div>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[14px] font-bold" style={{ color: GREEN }}>
            {isFree ? "Free Entry" : formatPrice(event.price, event.currency, { decimals: true })}
          </span>
          <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--brand-hint)]">
            Register <ArrowIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

const ICON = "w-3 h-3 shrink-0 text-[var(--brand-hint)]";

function CalendarIcon() {
  return <SharedCalendarIcon className={ICON} />;
}

function LocationIcon() {
  return <SharedLocationPinIcon className={ICON} />;
}

function ArrowIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}
