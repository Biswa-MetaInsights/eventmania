import type { Event, Community } from "@eventmind/types";
import type { CarouselEvent } from "@/components/EventsCarousel";
import type { CommunityItem } from "@/components/CommunityCarousel";

// Returns true when the event starts within today (inclusive) through today+6 days (inclusive).
function isThisWeek(startDate: Date): boolean {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return startDate >= todayStart && startDate <= weekEnd;
}

// Adapts an API Event into the home-page CarouselEvent card shape.
export function toCarouselEvent(event: Event): CarouselEvent {
  const start = new Date(event.start_date);
  const date = start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
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
    price: isFree ? "Free" : `₹${price.toLocaleString("en-IN")} onwards`,
    imageUrl: `https://picsum.photos/seed/${event.id}/800/450`,
    badge: badgeTypes[0] ? LABELS[badgeTypes[0]] : undefined,
    badgeTypes: badgeTypes.length ? badgeTypes : undefined,
    isSoldOut,
    startDate: event.start_date,
    category: event.category.toLowerCase(),
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
    price: isFree ? "Free" : `₹${price.toLocaleString("en-IN")}/month onwards`,
    memberCount,
    imageUrl: `https://picsum.photos/seed/${community.id}/800/450`,
    badge: isFree ? "Free" : undefined,
    badgeType: isFree ? "free" : undefined,
    category: community.category.toLowerCase(),
  };
}
