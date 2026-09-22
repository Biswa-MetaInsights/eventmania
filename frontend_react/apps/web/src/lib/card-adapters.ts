import type { Event, Community } from "@eventmind/types";
import { formatPrice } from "@/lib/currency";
import { eventImageUrl } from "@/lib/event-media";
import type { CarouselEvent } from "@/components/EventsCarousel";
import type { CommunityItem } from "@/components/CommunityCarousel";

/**
 * THE card picture for a community. Communities have no `image_url` column
 * yet (see the `Community` type), so this is always the seeded placeholder —
 * there is nothing real to prefer. An event's card uses `eventImageUrl()`
 * instead (see `toCarouselEvent` below), which DOES prefer a real cover
 * image and falls back to this same seed when there is none.
 *
 * Exported because the ORGANISER CONSOLE draws a community row's thumbnail
 * with it too. Keep every community-card surface on this one function; a
 * second hand-written picsum URL is how they drift.
 */
export function cardImageUrl(id: string | number, w: number, h: number): string {
  return `https://picsum.photos/seed/${id}/${w}/${h}`;
}

// Returns true when the event starts within today (inclusive) through today+6 days (inclusive).
function isThisWeek(startDate: Date): boolean {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return startDate >= todayStart && startDate <= weekEnd;
}

/**
 * THE card's date and time strings — "Fri, 11 Sep" and "07:00 pm". Exported
 * because /dashboard's ticket card draws a `StoredTicket` (an ISO start, no
 * card fields) on the same card, and its date row must read like every other
 * card's. Never format a card date by hand elsewhere.
 */
export function cardDateTime(iso: string): { date: string; time: string } {
  const start = new Date(iso);
  return {
    date: start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    time: start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

// Adapts an API Event into the home-page CarouselEvent card shape.
export function toCarouselEvent(event: Event): CarouselEvent {
  const start = new Date(event.start_date);
  const { date, time } = cardDateTime(event.start_date);
  const venue = (event.location as Record<string, string>)?.name ?? "Venue TBC";
  const price = Number(event.price);
  const isFree = price === 0;
  const isSoldOut = event.capacity > 0 && event.tickets_sold >= event.capacity;
  const sellingFast = !isSoldOut && event.capacity > 0 && event.tickets_sold / event.capacity > 0.7;
  const thisWeek = !isSoldOut && isThisWeek(start);

  // sold-out is exclusive; all other applicable badges accumulate
  const badgeTypes = isSoldOut
    ? (["sold-out" as const])
    : [
        ...(sellingFast ? ["selling-fast" as const] : []),
        ...(thisWeek    ? ["this-week"    as const] : []),
        ...(isFree      ? ["free"         as const] : []),
      ];

  const LABELS: Record<string, string> = { "sold-out": "Sold Out", "selling-fast": "Selling Fast", "this-week": "This Week", "free": "Free" };

  return {
    id: String(event.id),
    title: event.title,
    date,
    time,
    venue,
    price: isFree ? "Free" : `${formatPrice(price, event.currency)} onwards`,
    imageUrl: eventImageUrl(event, 800, 450),
    badge: badgeTypes[0] ? LABELS[badgeTypes[0]] : undefined,
    badgeTypes: badgeTypes.length ? badgeTypes : undefined,
    isSoldOut,
    startDate: event.start_date,
    category: event.category.toLowerCase(),
    // Format, carried separately from category so an online event keeps its real
    // category (Music, Technology, …) instead of being categorised as "online".
    eventType: event.event_type,
  };
}

// Adapts an API Community into the home-page CommunityItem card shape.
export function toCommunityItem(community: Community): CommunityItem {
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
    // Communities have no currency column of their own — they are always
    // native, so they take the platform default rather than a per-row code.
    price: isFree ? "Free" : `${formatPrice(price)}/month onwards`,
    memberCount,
    imageUrl: cardImageUrl(community.id, 800, 450),
    badge: isFree ? "Free" : undefined,
    badgeType: isFree ? "free" : undefined,
    category: community.category.toLowerCase(),
  };
}
