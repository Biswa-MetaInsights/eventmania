// ─────────────────────────────────────────────────────────────────────────────
//  CURRENCY — the data contract. Formatting lives in apps/web/src/lib/currency.
//
//  Every price in the app is a bare number PLUS the event's own `currency`.
//  Never render a price without reading its currency: the platform's home
//  currency is INR, but Ticketmaster-synced events carry real USD/GBP/EUR
//  amounts, so assuming one symbol mislabels the other's data.
//
//  Codes must match the backend's VARCHAR(3) column exactly (ISO 4217, upper
//  case). Import these constants; never hand-write the literal.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham", locale: "en-AE" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar", locale: "en-SG" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar", locale: "en-CA" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

/** The platform's home currency — the fallback for any event missing one. */
export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "attendee" | "organizer" | "admin";
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORGANISER-AUTHORED EXTRAS — agenda, announcements, FAQ, offer name.
//
//  ⚠️ THE BACKEND HAS NO COLUMN FOR ANY OF THESE. They are declared here so the
//  feature is typed end to end, but `EventUpdate` in
//  backend/services/event/app/schemas/event_schemas.py does not accept them and
//  `EventOut` never returns them — a real-mode PATCH carrying one is silently
//  dropped by Pydantic, which would look like a save that worked and then
//  vanished. So they are **writable in DUMMY MODE ONLY**, gated by
//  `EXTRAS_ARE_LOCAL` in apps/web/src/lib/event-extras.ts, which is also the one
//  place that decides whether an authoring control is live. Endpoint spec:
//  TODO.md §19.12. **Do not wire these into `EventUpdateData` until it exists.**
// ─────────────────────────────────────────────────────────────────────────────

/** One row of "Agenda of the programme" — a schedule, so it is ORDERED. */
export interface AgendaItem {
  id: string;
  /** Free text, not a timestamp: "10:00 AM", "Day 2 · morning", "After lunch". */
  time: string;
  title: string;
  detail?: string;
}

/** An organiser post on the event page. Newest first when rendered. */
export interface Announcement {
  id: string;
  title?: string;
  body: string;
  /** ISO. Stamped when posted, never re-derived — an edit is not a repost. */
  posted_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  event_type?: string;
  location: Record<string, unknown>;
  target_audience?: string;
  tags?: string[];
  language?: string;
  event_website?: string;
  community_id?: string;
  start_date: string;
  end_date: string;
  capacity: number;
  tickets_sold: number;
  price: number;
  /** ISO 4217 code the organiser priced in. Absent on rows written before the
   *  column existed — treat a missing value as DEFAULT_CURRENCY, never as USD. */
  currency?: CurrencyCode;
  status: string;
  /** The cover photo. A REAL column on the events table, but absent from the
   *  backend's `EventUpdate` schema, so it is read-only over the API today —
   *  which puts it in the same bucket as the four fields below. */
  image_url?: string;
  /** "Early bird", "Launch week" — the organiser's own name for the current
   *  price. ⚠️ No backend column; see the block above `AgendaItem`. */
  offer_name?: string;
  /**
   * Who is putting the event on — the ORGANISATION, not the signed-in person.
   * It is what `/event/[id]` prints under "Organised by" (Gautham, 2026-09-11);
   * that page falls back to its own placeholder while this is absent, which is
   * every event written before the field existed.
   *
   * ⚠️ No backend column yet; see the block above `AgendaItem`. The create form
   * asks for it regardless — the frontend is being built ahead of the column —
   * so in real mode it is stripped on the way out and the fallback shows.
   */
  organization_name?: string;
  /** ⚠️ No backend column; see the block above `AgendaItem`. */
  agenda?: AgendaItem[];
  /** ⚠️ No backend column; see the block above `AgendaItem`. */
  announcements?: Announcement[];
  /** ⚠️ No backend column; see the block above `AgendaItem`. */
  faq?: FaqItem[];
  content_generated?: Record<string, unknown>;
  moderation_score?: number;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Event FORMAT (`event_type`) — orthogonal to `category`.
//
//  An event has ONE category (Music, Sports, …) AND ONE format (online or not).
//  They are separate fields on purpose: an online event is still a Music event.
//  Do NOT go back to encoding the format as `category === "online"` — that made
//  the two mutually exclusive, so an online event could never carry a real
//  category.
//
//  The strings must match the backend exactly — `event_type` is a plain
//  String(20) column (see backend/services/event/app/models/event.py) filtered
//  with `==`, so a casing mismatch silently returns zero rows rather than
//  erroring. Import these constants; never hand-write the literal.
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_FORMATS = {
  inPerson: "In-Person",
  online: "Online",
  hybrid: "Hybrid",
} as const;

export type EventFormat = (typeof EVENT_FORMATS)[keyof typeof EVENT_FORMATS];

/**
 * Is this event attendable online? True for both Online and Hybrid.
 *
 * Case-insensitive, and falls back to the legacy `category === "online"`
 * encoding, because rows created before the split still carry it — a dev DB
 * that has not been backfilled would otherwise lose every online event from the
 * "Online Events" row. Drop the fallback once the backfill has run everywhere.
 */
export function isOnlineEvent(event: { event_type?: string; category?: string }): boolean {
  const format = (event.event_type ?? "").toLowerCase();
  if (format === "online" || format === "hybrid") return true;
  return (event.category ?? "").toLowerCase() === "online";
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "confirmed" | "cancelled";
  purchased_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Community {
  id: string;
  organizer_id: string;
  name: string;
  slug?: string;
  description?: string;
  category: string;
  location: Record<string, unknown>;
  website?: string;
  next_event_date?: string;
  member_count: number;
  price: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type VerificationStatus = "unverified" | "pending" | "verified";

export interface OrganizerProfile {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string;
  company_address: string;
  company_email: string;
  company_website?: string;
  country: string;
  registration_number: string;
  bank_name: string;
  bank_account_number: string;
  verification_status: VerificationStatus;
}
