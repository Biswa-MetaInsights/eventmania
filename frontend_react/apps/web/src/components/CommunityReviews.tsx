"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Attendee reviews on /community/[slug].
//
//  ⚠️ A community has NO reviews of its own — the review service is event-scoped
//  (`/review/event/{id}`), and there is no community review table. So this block
//  aggregates the reviews of the community's own PAST events client-side, and
//  the subtitle says exactly that. It is not a community rating and must not be
//  labelled as one.
//
//  One request per event, so the event list is capped (MAX_EVENTS) at the most
//  recent past events — the ones people actually reviewed.
// ─────────────────────────────────────────────────────────────────────────────

import { useQueries } from "@tanstack/react-query";
import { reviewsApi, type Review } from "@eventmind/api";
import type { Event } from "@eventmind/types";
import { ReviewsSection } from "./Reviews";

/** How many past events we'll fan out review requests to. One request each. */
const MAX_EVENTS = 6;

/** Reviews rendered. The rest still count towards the average and the total. */
const MAX_REVIEWS = 5;

export function CommunityReviews({ pastEvents }: { pastEvents: Event[] }) {
  // Most recent first — pastEvents arrives newest-last-run first from the page.
  const ids = pastEvents.slice(0, MAX_EVENTS).map((e) => String(e.id));

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["reviews", id],
      queryFn: () => reviewsApi.forEvent(id).then((r) => r.data),
      // The review service 404s for an event with no reviews; that is a normal
      // answer here, not a failure worth retrying six times over.
      retry: false,
    })),
  });

  const all: Review[] = results
    .flatMap((r) => r.data ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const count = all.length;
  const average = count > 0 ? all.reduce((sum, r) => sum + r.rating, 0) / count : undefined;

  return (
    <ReviewsSection
      subtitle={
        count > 0
          ? "From attendees of this community's past events"
          : undefined
      }
      reviews={all.slice(0, MAX_REVIEWS)}
      average={average}
      count={count || undefined}
      emptyText={
        pastEvents.length === 0
          ? "This community hasn't run an event yet — reviews will appear here once it has."
          : "No reviews yet. Attend an event from this community and be the first to share your experience!"
      }
    />
  );
}