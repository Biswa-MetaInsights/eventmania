// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for an event's shareable media + labels.
//
// Used by the link-unfurl (Open Graph) image, the story image, and the share
// flow so a shared event always shows the SAME picture and copy as its card.
// No `window` / DOM access here — safe to import on both server and client.
// ─────────────────────────────────────────────────────────────────────────────

import type { Event } from "@eventmind/types";
import { formatPrice } from "@/lib/currency";

/**
 * THE darkening wash that goes over a hero photo so light copy reads on it.
 *
 * One definition, three surfaces: the /event/[id] hero, the /community/[slug]
 * hero, and the organiser dashboard's "next up" panel. It lived as a private
 * const in the first two — byte-identical, with a comment in one asking the next
 * person to keep them in step by hand — which is the drift this file exists to
 * prevent. The console needing a third copy is what made it worth lifting.
 *
 * Bottom-heavy on purpose: the title block sits at the foot of a hero, so the
 * gradient is near-opaque there (0.94) and barely present at the top (0.22),
 * which keeps the photograph readable as a photograph.
 */
export const HERO_SCRIM =
  "linear-gradient(to top, rgba(8,17,15,0.94) 0%, rgba(8,17,15,0.75) 32%, rgba(8,17,15,0.42) 62%, rgba(8,17,15,0.22) 100%)";

/**
 * The event's own picture. Prefers a real uploaded/synced image (`image_url`,
 * e.g. Ticketmaster events) and otherwise falls back to the same deterministic
 * picsum placeholder the EventCard uses, so the shared image matches the card.
 */
export function eventImageUrl(event: Pick<Event, "id"> & { image_url?: unknown }, w: number, h: number): string {
  const uploaded = (event as { image_url?: unknown }).image_url;
  if (typeof uploaded === "string" && uploaded.length > 0) return uploaded;
  return `https://picsum.photos/seed/${event.id}/${w}/${h}`;
}

/**
 * Same rule for a community. Communities have no `image_url` column at all yet
 * (see the `Community` type), so in practice this always returns the seeded
 * placeholder — the SAME seed the community cards use, so a community's hero,
 * card and share images are all the same picture.
 */
export function communityImageUrl(community: { id: string }, w: number, h: number): string {
  return eventImageUrl(community as Pick<Event, "id">, w, h);
}

/** "Free" or "₹42" — the short price chip, in the event's own currency. */
export function priceLabel(event: Pick<Event, "price" | "currency">): string {
  return formatPrice(event.price, event.currency);
}

/** Human-readable place for an event. */
export function locationLabel(event: Pick<Event, "location">): string {
  const loc = event.location as Record<string, unknown> | undefined;
  return (
    (loc?.address as string) ??
    (loc?.city as string) ??
    "Online Event"
  );
}

/** "Fri, Aug 15" style short date for the unfurl meta line. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
