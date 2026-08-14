// ─────────────────────────────────────────────────────────────────────────────
// Splitting a community's events into "upcoming" and "previous".
//
// Lives here rather than in the page because three children of
// /community/[slug] need the pieces (the rail needs both lists, the reviews
// block the past ones, the sidebar card the next one), so the page splits ONCE
// and passes them down.
// ─────────────────────────────────────────────────────────────────────────────

import type { Event } from "@eventmind/types";

/**
 * An event is "previous" once it has FINISHED. Prefer `end_date` so a multi-day
 * festival stays in Upcoming while it is still running; fall back to
 * `start_date` for rows that carry no end.
 */
function endsAt(event: Event): number {
  return new Date(event.end_date ?? event.start_date).getTime();
}

function startsAt(event: Event): number {
  return new Date(event.start_date).getTime();
}

export interface SplitEvents {
  /** Soonest first — `upcoming[0]` is the community's next event. */
  upcoming: Event[];
  /** Most recent first. */
  previous: Event[];
}

export function splitCommunityEvents(events: Event[] | undefined): SplitEvents {
  const all = events ?? [];
  const now = Date.now();
  return {
    upcoming: all.filter((e) => endsAt(e) >= now).sort((a, b) => startsAt(a) - startsAt(b)),
    previous: all.filter((e) => endsAt(e) < now).sort((a, b) => startsAt(b) - startsAt(a)),
  };
}
