// ─────────────────────────────────────────────────────────────────────────────
//  The organiser-authored extras: agenda, announcements, FAQ, offer name, cover
//  image, organisation name — the fields the backend cannot store yet.
//
//  ⚠️ READ THIS BEFORE ADDING AN AUTHORING CONTROL. There is no column for any
//  of them (`backend/services/event/app/models/event.py`), and neither
//  `EventCreate` nor `EventUpdate` accepts them, so a real-mode POST or PATCH
//  carrying one is dropped silently
//  by Pydantic — the organiser would type an agenda, press Save, watch the
//  server's reply overwrite the cache, and see their work disappear with no
//  error. That is the exact failure the console's `NotBuiltYet` exists to
//  prevent, so the rule here is the same one: **do not show a control that
//  cannot work.** Every editor disables itself off `EXTRAS_ARE_LOCAL` and
//  carries `EXTRAS_HINT` as its tooltip.
//
//  ⚠️ `EXTRAS_ARE_LOCAL` LIVES IN `data-source.ts`, not here, and that is
//  deliberate: this file is imported BY data-source (for `EXTRA_KEYS`), so
//  importing `isDummyMode` back out of it would close a module cycle and the
//  `const` would be read inside its own temporal dead zone — a hard crash at
//  import time, not a lint warning. Keep the arrow pointing one way.
//
//  ⚠️ `organization_name` IS THE ONE EXCEPTION TO THE RULE ABOVE (Gautham,
//  2026-09-11). Its control on `/organizer/create` is NOT disabled off
//  `EXTRAS_ARE_LOCAL` — it is a required field in every mode, because the
//  frontend for "Organised by" is being built ahead of the column it needs. The
//  loss is bounded and visible rather than silent: `/event/[id]` falls back to
//  its own placeholder name whenever the field is absent, which is every event
//  today and every real-mode event until the column lands. **Do not copy this
//  exception onto the other five** — an agenda that vanishes has no fallback to
//  land on. Column spec: TODO.md §19.12.
//
//  ⚠️ `image_url` IS a real column — it is only in this set because it is
//  missing from `EventUpdate`, which is a one-line backend change rather than a
//  migration. When that line lands, take it out of `EXTRA_KEYS` first; it is the
//  cheapest of the six to make real. Spec for the rest: TODO.md §19.12.
//
//  The readers below exist because the backend returns Events WITHOUT these
//  keys, and a `.map()` over `undefined` throws. Every consumer goes through
//  them; never read `event.agenda` directly.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgendaItem, Announcement, Event, FaqItem } from "@eventmind/types";

/** The tooltip every disabled authoring control carries. One wording. */
export const EXTRAS_HINT =
  "The events backend has no column for this yet (TODO.md §19.12) — set NEXT_PUBLIC_DATA_MODE=dummy in apps/web/.env.local to author it against sample data.";

/** The keys this file speaks for — `data-source`'s `create()` AND `update()`
 *  both strip them in real mode, so one can never reach the API by accident.
 *  ⚠️ There are TWO strips; delete both when the columns land. */
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
