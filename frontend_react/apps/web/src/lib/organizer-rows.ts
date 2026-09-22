// ─────────────────────────────────────────────────────────────────────────────
//  An `Event` → the row the organiser console draws.
//
//  This is the ONE place that decides which bucket an event falls in and what
//  its money column says, so the Events table and the "next up" hero above it
//  can never disagree about the same event. (Until 2026-09-07 it also kept that
//  table honest against the Dashboard's five-row preview of it; the Dashboard
//  went, but one definition is still the reason a figure cannot drift.) It lives
//  in lib/ rather
//  than in a page because it reads the clock, and calling `Date.now()` in a
//  component body trips the `react-hooks/purity` lint rule (same reason
//  lib/community-events.ts exists).
//
//  ⚠️ The buckets are DERIVED, not stored. The backend has no "on sale" flag, so:
//    drafts   status is anything other than "published"
//    past     the event has finished (end_date, falling back to start_date, so a
//             multi-day event stays current while it is still running — the same
//             rule splitCommunityEvents() uses)
//    live     published, not finished, starting within LIVE_WINDOW_DAYS
//    upcoming published, not finished, starting later than that
//  If a real on-sale flag ever lands, replace `bucketOf` and nothing else moves.
// ─────────────────────────────────────────────────────────────────────────────

import type { Event } from "@eventmind/types";
import { isOnlineEvent } from "@eventmind/types";
import { eventImageUrl } from "./event-media";
import { formatPrice } from "./currency";

/** How far ahead an event still counts as actively selling rather than scheduled. */
export const LIVE_WINDOW_DAYS = 30;

export type EventBucket = "live" | "upcoming" | "drafts" | "past";

/** ⚠️ "Live" is FIRST and is the Events page's default tab (Gautham,
 *  2026-09-09), with "All" immediately to its right. The console opens on the
 *  events actually selling; an organiser with nothing in the next 30 days sees
 *  an empty Live table and the "All" tab one click away. Keep the two in step:
 *  this order and `useState("live")` there. */
export const CONSOLE_TABS: { key: EventBucket | "all"; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "drafts", label: "Drafts" },
  { key: "past", label: "Past" },
];

const DAY = 24 * 60 * 60 * 1000;

export function bucketOf(event: Event, now = Date.now()): EventBucket {
  if ((event.status ?? "").toLowerCase() !== "published") return "drafts";
  const ends = new Date(event.end_date || event.start_date).getTime();
  if (ends < now) return "past";
  const starts = new Date(event.start_date).getTime();
  return starts - now <= LIVE_WINDOW_DAYS * DAY ? "live" : "upcoming";
}

export interface ConsoleRow {
  id: string;
  title: string;
  /**
   * The event's own card picture — `eventImageUrl`, so a console row's
   * thumbnail is the SAME image the event's card shows on home and /explore.
   * Never write a second URL rule here; see that function.
   */
  image: string;
  bucket: EventBucket;
  /** "On sale" / "Scheduled" / "Draft" / "Completed" — the status pill's label. */
  status: string;
  when: string;
  whenSub: string;
  place: string;
  price: string;
  /** Free vs paid, for the Events page's price filter. `price` is display copy. */
  free: boolean;
  /**
   * `start_date` as a timestamp, for sorting. **NaN when the event has no date**
   * (a draft can be saved without one) — a sort must decide where those go
   * rather than let NaN comparisons scramble the list.
   */
  startsAt: number;
  sold: string;
  pct: number;
  revenue: string;
  checkins: string;
  finished: boolean;
}

const STATUS_LABEL: Record<EventBucket, string> = {
  live: "On sale",
  upcoming: "Scheduled",
  drafts: "Draft",
  past: "Completed",
};

function placeOf(event: Event): string {
  if (isOnlineEvent(event)) return "Online";
  const loc = event.location as Record<string, unknown>;
  const city = (loc?.city as string) ?? "";
  const name = (loc?.name as string) ?? "";
  return city || name || "—";
}

export function toConsoleRow(event: Event, now = Date.now()): ConsoleRow {
  const bucket = bucketOf(event, now);
  const start = new Date(event.start_date);
  const capacity = event.capacity || 0;
  const sold = event.tickets_sold || 0;
  const isDraft = bucket === "drafts";
  const free = !event.price;

  return {
    id: event.id,
    title: event.title,
    // 2× the 56px the tables draw it at, for a retina row.
    image: eventImageUrl(event, 112, 112),
    bucket,
    status: STATUS_LABEL[bucket],
    // ⚠️ There is no visibility field here, and a row draws no Public/Private
    // badge. The backend has no visibility column and every event it serves is
    // discoverable, so the console used to stamp a hardcoded "Public" chip on
    // every single row — a badge that can only ever say one thing carries no
    // information, and the copy around it promised an invite-only mode that
    // does not exist (Gautham, 2026-08-21). If a real visibility column ever
    // lands, add the field back HERE and let the pill and a filter read it —
    // never reintroduce a hardcoded one.
    when: isDraft && !event.start_date
      ? "No date set"
      : start.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }),
    whenSub: isDraft
      ? "draft"
      : bucket === "past"
        ? "closed"
        : start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    place: placeOf(event),
    price: formatPrice(event.price, event.currency),
    free,
    startsAt: start.getTime(),
    sold: capacity ? `${sold} / ${capacity}` : String(sold),
    pct: capacity ? Math.round((sold / capacity) * 100) : 0,
    // Gross, not net: it is `tickets sold × ticket price`, in the currency the
    // organiser priced in. The platform fee is applied on the Earnings page,
    // which is the one surface that claims to show what reaches them.
    //
    // ⚠️ A DRAFT gets an em dash, never a zero. It has never been on sale, so
    // "₹0" would state that it earned nothing when the truth is that it could
    // not have — the same distinction `checkins` makes below, and the one
    // `NotBuiltYet` exists to protect. A published event that genuinely has not
    // sold a ticket yet DOES show its zero; that figure is real.
    revenue: isDraft ? "—" : free ? "Free" : formatPrice(sold * event.price, event.currency, { freeLabel: null }),
    // No check-in records exist yet — an em dash, never a 0. See TODO.md §19.
    checkins: "—",
    finished: bucket === "past",
  };
}

/**
 * Map a whole list against ONE clock reading.
 *
 * Call this rather than mapping `toConsoleRow` yourself: it captures `now` once,
 * so two events either side of a bucket boundary cannot be sorted by different
 * milliseconds within a single render. It also keeps `Date.now()` in lib/, where
 * the `react-hooks/purity` rule allows it — the same reason
 * lib/community-events.ts exists.
 */
export function toConsoleRows(events: Event[]): ConsoleRow[] {
  const now = Date.now();
  return events.map((e) => toConsoleRow(e, now));
}

// ── The Events page's filter and sort ────────────────────────────────────────
//
// Both run over rows already in memory — `useOrganiserEvents` has fetched the
// organiser's whole list, so there is nothing to wait on a backend for and no
// reason for either control to be inert. Options live here beside `CONSOLE_TABS`
// so the labels and the logic that honours them cannot drift.
//
// ⚠️ There is no public/private control, and there must not be one until the
// backend grows a visibility column: every event it serves is discoverable, so a
// filter offering "Private" would offer a state no event can be in. Same reason
// `toConsoleRow` hardcodes `privacy` — see the note there and TODO.md §19.

export type PriceFilter = "paid" | "free" | "all";
export type RowSort = "soonest" | "latest";

export const PRICE_FILTERS: { value: PriceFilter; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "free", label: "Free" },
  { value: "all", label: "Paid & free" },
];

export const ROW_SORTS: { value: RowSort; label: string }[] = [
  { value: "soonest", label: "Date · soonest first" },
  { value: "latest", label: "Date · latest first" },
];

/**
 * Filter by price, then sort by date. Returns a new array — `rows` is the
 * memoised output of `toConsoleRows` and must not be sorted in place.
 *
 * Undated rows (drafts saved without a date) sort to the END in both
 * directions. They have no position on a date axis, and letting a NaN through
 * `a - b` makes the comparator inconsistent, which scrambles the whole list
 * rather than just those rows.
 */
export function filterAndSortRows(
  rows: ConsoleRow[],
  price: PriceFilter,
  sort: RowSort,
): ConsoleRow[] {
  const kept = price === "all" ? rows : rows.filter((r) => (price === "free" ? r.free : !r.free));
  return [...kept].sort((a, b) => {
    const aDated = Number.isFinite(a.startsAt);
    const bDated = Number.isFinite(b.startsAt);
    if (!aDated || !bDated) return aDated === bDated ? 0 : aDated ? -1 : 1;
    return sort === "soonest" ? a.startsAt - b.startsAt : b.startsAt - a.startsAt;
  });
}

/** Row counts per tab, for the tab badges. */
export function bucketCounts(rows: ConsoleRow[]): Record<string, number> {
  const counts: Record<string, number> = { live: 0, upcoming: 0, drafts: 0, past: 0, all: rows.length };
  for (const r of rows) counts[r.bucket] += 1;
  return counts;
}
