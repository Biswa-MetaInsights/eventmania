// Author-authored event content is persisted by the event API in both real and dummy modes.
import type { AgendaItem, Announcement, Event, FaqItem } from "@eventmind/types";

/** The tooltip every disabled authoring control carries. One wording. */
export const EXTRAS_HINT = 'Event content is temporarily unavailable. Please try again.';

/** Author-authored content keys supported by create and update. */
export const EXTRA_KEYS = [
  "agenda",
  "announcements",
  "faq",
  "offer_name",
  "image_url",
  "organization_name",
] as const;

export type EventExtras = Partial<Pick<Event, (typeof EXTRA_KEYS)[number]>>;

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const agendaOf = (e?: Event | null): AgendaItem[] => list<AgendaItem>(e?.agenda);
export const faqOf = (e?: Event | null): FaqItem[] => list<FaqItem>(e?.faq);

/**
 * Announcements, NEWEST FIRST.
 *
 * Sorted on read rather than on write, so the order cannot depend on which
 * surface last touched the array — and an undated row sorts to the END, the
 * same rule `lib/organizer-rows.ts` uses, because letting a NaN through `a - b`
 * makes the comparator inconsistent and scrambles the whole list rather than
 * just that row.
 */
export function announcementsOf(e?: Event | null): Announcement[] {
  const ms = (a: Announcement) => {
    const t = new Date(a.posted_at ?? "").getTime();
    return Number.isNaN(t) ? -Infinity : t;
  };
  return list<Announcement>(e?.announcements).slice().sort((a, b) => ms(b) - ms(a));
}

/**
 * An id for a newly added row.
 *
 * ⚠️ Call this from an EVENT HANDLER, never a component body — `randomUUID` and
 * `Date.now()` are exactly the impurity `react-hooks/purity` flags, which is why
 * this app keeps both out of render everywhere else too.
 */
export function extraId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Old Safari / non-secure origins. Only needs to be unique within one array.
  return `x-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
