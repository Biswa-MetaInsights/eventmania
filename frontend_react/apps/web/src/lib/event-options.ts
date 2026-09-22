// ─────────────────────────────────────────────────────────────────────────────
//  The choice lists behind the event form: category, format, language, audience.
//
//  Lifted out of `app/organizer/create/page.tsx` on 2026-09-01, when the edit
//  dialog gained the same four controls. They are the same lists or they are a
//  bug: an organiser who picks "Health & Wellness" at create and cannot find it
//  again in edit has lost the field, not just the option.
//
//  ⚠️ AN EVENT'S OWN VALUE IS NOT GUARANTEED TO BE IN ANY OF THESE. A
//  Ticketmaster-synced row carries whatever the provider sent, and an event
//  written before a list changed carries the old word. `withCurrent` is the fix
//  and every edit control uses it — without it the select silently shows option
//  zero and the first save rewrites the event's category to "Technology". Same
//  trap, same shape, as `EditEventModal`'s `cityOptions`.
// ─────────────────────────────────────────────────────────────────────────────

/* ⚠️ ALPHABETICAL, WITH "Other" PINNED LAST (Gautham, 2026-09-08). A menu of a
   dozen words has no meaningful order but the one a reader can scan, and "Other"
   is not a peer of the others — it is the escape hatch, so it sits at the foot
   rather than between "Networking" and "Sports". Same rule in LANGUAGES below.
   Keep new entries in place; do not re-sort by "importance". */
export const CATEGORIES = [
  "Arts & Culture",
  "Business",
  "Creative",
  "Education",
  "Food & Drink",
  "Gaming",
  "Health & Wellness",
  "Networking",
  "Sports",
  "Summit",
  "Technology",
  "Other",
];

/** ⚠️ FORMAT, not category — the two axes are orthogonal (HANDOVER.md). */
export const EVENT_TYPES = ["In-Person", "Online", "Hybrid"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Alphabetical, "Other" last — see the note on CATEGORIES. */
export const LANGUAGES = [
  "Arabic",
  "Dutch",
  "English",
  "French",
  "German",
  "Hindi",
  "Portuguese",
  "Spanish",
  "Other",
];

export const TARGET_AUDIENCES = [
  "Developers & Engineers",
  "Business & Entrepreneurs",
  "Students & Graduates",
  "Creatives & Designers",
  "Marketing & Sales",
  "HR & People Ops",
  "Investors & VCs",
  "General Public",
];

/**
 * `list`, with the event's own value prepended when the list does not already
 * hold it. Case-insensitive, because the same word arrives capitalised
 * differently depending on who wrote the row.
 *
 * Prepended rather than appended so the value the control is about to display is
 * the first thing in the menu, not the last of thirteen.
 */
export function withCurrent(list: string[], current?: string | null): string[] {
  const value = (current ?? "").trim();
  if (!value) return list;
  return list.some((o) => o.toLowerCase() === value.toLowerCase()) ? list : [value, ...list];
}

/**
 * An event's format as one of `EVENT_TYPES`.
 *
 * The segmented control has no "nothing selected" state, so an unrecognised
 * `event_type` has to resolve to something; In-Person is the backend's own
 * default (`EventCreate.event_type`), which makes this the same fallback the
 * row would have had.
 */
export function normaliseEventType(value?: string | null): EventType {
  const v = (value ?? "").trim().toLowerCase();
  return EVENT_TYPES.find((t) => t.toLowerCase() === v) ?? "In-Person";
}

/** The stored `target_audience` string → the chips that should read as chosen. */
export function parseAudience(value?: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}
