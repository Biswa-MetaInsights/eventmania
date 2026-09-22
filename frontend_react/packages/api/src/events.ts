import { apiClient } from "./client";
import type { Event, CurrencyCode } from "@eventmind/types";

export interface EventSearchParams {
  q?: string;
  category?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
  /** Inclusive price bounds, compared against the RAW `price` number — the
   *  backend does no currency conversion, so a range is only meaningful within
   *  one currency. See TODO.md §25. */
  price_min?: number;
  price_max?: number;
  community_id?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  organizer_id?: string;
  limit?: number;
}

export interface EventCreateData {
  organizer_id: string;
  title: string;
  description: string;
  category: string;
  event_type: string;
  location: Record<string, unknown>;
  target_audience?: string;
  tags?: string[];
  language?: string;
  event_website?: string;
  community_id?: string;
  start_date: string;
  end_date: string;
  capacity: number;
  price: number;
  /** ISO 4217 code to charge in. Omitted = the backend's INR default. */
  currency?: CurrencyCode;
  status: string;
}

/**
 * A partial event edit — the backend's `EventUpdate` schema, which PATCHes only
 * the keys present.
 *
 * ⚠️ Changing `start_date`, `end_date` or `location` is a POSTPONEMENT, and the
 * backend does not yet treat it as one: nothing notifies or emails the people
 * holding tickets. See TODO.md §20 — do not write copy promising that it does.
 */
export interface EventUpdateData {
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: Record<string, unknown>;
  event_type?: string;
  /* ⚠️ The five below are REAL columns and the backend's `EventUpdate` has
     always accepted them — they were simply missing from this interface until
     2026-09-01, which is why the edit dialog could set none of them while the
     create form set all five. Do not confuse them with the extras in
     `lib/event-extras.ts`, which have no column at all. */
  category?: string;
  target_audience?: string;
  tags?: string[];
  language?: string;
  event_website?: string;
  /**
   * The allowed number of participants.
   *
   * ⚠️ NOT floored at `tickets_sold` (Gautham, 2026-08-24) — an organiser who
   * means to shrink a room below what they have sold may, and the edit dialog
   * warns rather than blocks. Nothing voids the surplus tickets and nobody is
   * told; that is TODO.md §20, same as a postponement.
   */
  capacity?: number;
  /**
   * The ticket price, in `currency`.
   *
   * ⚠️ NO UI SENDS THIS ANY MORE (Gautham, 2026-09-01). Price and currency are
   * chosen once, on `/organizer/create`, and are fixed from then on — the edit
   * dialog renders both read-only. The field stays on the interface because the
   * backend accepts it, not because anything calls it; do not read its presence
   * here as permission to add a price input back without asking.
   */
  price?: number;
  /** ⚠️ Fixed at creation, same as `price` above. */
  currency?: CurrencyCode;
  /** "draft" | "published" | "cancelled" | "completed" — the backend enum. */
  status?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  user_id: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  role: "assistant";
}

export const eventsApi = {
  search: (params?: EventSearchParams) =>
    apiClient.get<Event[]>("/event/search", {
      params: { status: "published", ...params },
    }),

  get: (id: string) => apiClient.get<Event>(`/event/${id}`),

  /** Total published events. A bare number — never fetch the catalogue to count it. */
  count: () => apiClient.get<{ count: number }>("/event/count"),

  create: (data: EventCreateData) => apiClient.post<Event>("/event/", data),

  /** Partial edit. The organiser's own event only — see `ownsEvent` in
   *  apps/web/src/lib/data-source.ts for who is allowed to call this. */
  update: (id: string, data: EventUpdateData) =>
    apiClient.patch<Event>(`/event/${id}`, data),

  chat: (eventId: string, data: ChatRequest) =>
    apiClient.post<ChatResponse>(`/event/${eventId}/chat`, data),
};
