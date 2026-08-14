// ─────────────────────────────────────────────────────────────────────────────
// Data-source switch: DUMMY (local fixtures) vs REAL (live backend API).
//
// Set NEXT_PUBLIC_DATA_MODE in apps/web/.env.local:
//   NEXT_PUBLIC_DATA_MODE=dummy   → serve local fixtures, NO backend needed
//                                   (frontend/beautify work)
//   NEXT_PUBLIC_DATA_MODE=real    → hit the live backend via the gateway
//                                   (default when unset — backend/integration work)
//
// Pages import `eventsSource` / `communitiesSource` instead of `eventsApi` /
// `communitiesApi`. Both expose the SAME method shapes and return the SAME
// `{ data }` envelope, so existing `.then((r) => r.data)` call sites are unchanged.
// Only READ paths are switched — mutations (create/pay) always hit the real API.
// ─────────────────────────────────────────────────────────────────────────────

import {
  eventsApi,
  communitiesApi,
  communityApi,
  type EventSearchParams,
} from "@eventmind/api";
import { isOnlineEvent, type Event, type Community } from "@eventmind/types";
import { dummyEvents, dummyOnlineEvents } from "./fixtures/events";
import { dummyCommunities, dummyOnlineCommunities } from "./fixtures/communities";

export type DataMode = "dummy" | "real";

// Default to "real" so nothing changes for anyone who hasn't opted in. A frontend
// dev opts into fixtures by adding NEXT_PUBLIC_DATA_MODE=dummy to their .env.local.
export const DATA_MODE: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "dummy" ? "dummy" : "real";
export const isDummyMode = DATA_MODE === "dummy";

type CommunitySearchParams = { q?: string; category?: string; city?: string };

// Mimic the axios response envelope the real API returns, so `.then((r) => r.data)`
// keeps working identically in dummy mode.
const ok = <T>(data: T): Promise<{ data: T }> => Promise.resolve({ data });

const has = (hay: string, q?: string) =>
  !q || hay.toLowerCase().includes(q.toLowerCase());

// A Hybrid event is attendable BOTH ways, so it matches an Online filter AND an
// In-Person one — it belongs in the city row and the online row at once. That is
// the case the old `category === "online"` encoding could not represent.
function matchesFormat(event: Event, wanted: string): boolean {
  if ((event.event_type ?? "").toLowerCase() === "hybrid") return true;
  return wanted.toLowerCase() === "online" ? isOnlineEvent(event) : !isOnlineEvent(event);
}

// In dummy mode we deliberately IGNORE geo/city/price/date filters so the UI is
// always populated for beautifying. We honour only: the online-vs-in-person split
// (via event_type), category, a loose text query, organizer_id, and limit.
function dummyEventSearch(params?: EventSearchParams): Event[] {
  // event_type is the format filter; it is INDEPENDENT of category, so
  // { event_type: "Online", category: "Music" } correctly yields online music
  // events.
  let list = allEvents();
  if (params?.event_type) list = list.filter((e) => matchesFormat(e, params.event_type!));
  if (params?.category) {
    const wanted = params.category.toLowerCase();
    list = list.filter((e) => e.category.toLowerCase() === wanted);
  }
  if (params?.q) list = list.filter((e) => has(e.title, params.q));
  if (params?.organizer_id) list = list.filter((e) => e.organizer_id === params.organizer_id);
  if (typeof params?.limit === "number") list = list.slice(0, params.limit);
  return list;
}

function dummyCommunitySearch(params?: CommunitySearchParams): Community[] {
  let list = params?.category === "online" ? dummyOnlineCommunities : dummyCommunities;
  if (params?.q) list = list.filter((c) => has(c.name, params.q));
  return list;
}

const allEvents = () => [...dummyEvents, ...dummyOnlineEvents];
const allCommunities = () => [...dummyCommunities, ...dummyOnlineCommunities];

export const eventsSource = {
  search: (params?: EventSearchParams) =>
    isDummyMode ? ok(dummyEventSearch(params)) : eventsApi.search(params),
  get: (id: string) =>
    isDummyMode
      ? ok((allEvents().find((e) => String(e.id) === String(id)) ?? null) as Event)
      : eventsApi.get(id),
  // Dummy mode counts the fixtures, so the hero's "About N options" line is
  // honest in both modes rather than reporting a backend number no one is serving.
  count: () =>
    isDummyMode ? ok({ count: allEvents().length }) : eventsApi.count(),
};

export const communitiesSource = {
  search: (params?: CommunitySearchParams) =>
    isDummyMode ? ok(dummyCommunitySearch(params)) : communitiesApi.search(params),
  get: (id: string) =>
    isDummyMode
      ? ok((allCommunities().find((c) => String(c.id) === String(id)) ?? null) as Community)
      : communitiesApi.get(id),
};

export const communitySource = {
  getBySlug: (slug: string) =>
    isDummyMode
      ? ok((allCommunities().find((c) => c.slug === slug) ?? null) as Community)
      : communityApi.getBySlug(slug),
};
