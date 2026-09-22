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
//
// Reads all switch. Of the WRITES, only the event ones do — `create`, `update`
// and `duplicate` below — because each of them can carry the organiser-authored
// extras, and dummy mode is the only place those survive. Payment always hits
// the real API: there is no honest fixture for taking someone's money.
// ─────────────────────────────────────────────────────────────────────────────

import {
  eventsApi,
  communitiesApi,
  communityApi,
  type EventCreateData,
  type EventSearchParams,
  type EventUpdateData,
} from "@eventmind/api";
import { isOnlineEvent, type Event, type Community } from "@eventmind/types";
import { EXTRA_KEYS, type EventExtras } from "./event-extras";
import { dummyEvents, dummyOnlineEvents, dummyMyEvents, DUMMY_ORGANISER_ID } from "./fixtures/events";
import { dummyCommunities, dummyOnlineCommunities } from "./fixtures/communities";
import {
  dummyAttendees, dummyEarnings, dummyPaymentTerms,
  dummyPortfolio, dummyNextEvent,
  type DummyAttendee, type DummyEarningRow, type DummyPaymentTerm,
} from "./fixtures/organizer";

export type DataMode = "dummy" | "real";

// Default to "real" so nothing changes for anyone who hasn't opted in. A frontend
// dev opts into fixtures by adding NEXT_PUBLIC_DATA_MODE=dummy to their .env.local.
export const DATA_MODE: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "dummy" ? "dummy" : "real";
export const isDummyMode = DATA_MODE === "dummy";

/**
 * May an organiser author an agenda, announcements, an FAQ, an offer name or a
 * cover image on this build?
 *
 * ⚠️ Deliberately NOT "is this person an organiser" — that is `useIsEventOwner`.
 * This asks whether a save would SURVIVE, which is a property of the data mode:
 * none of those five has a backend column or an `EventUpdate` field, so in real
 * mode a PATCH carrying one is silently dropped and the organiser watches their
 * work vanish. Every authoring control reads this and disables itself with
 * `EXTRAS_HINT`. Full note: `lib/event-extras.ts`. It lives HERE, beside the
 * other data-mode rules, because that file is imported by this one — declaring
 * it there would close a module cycle. See TODO.md §19.12.
 */
export const EXTRAS_ARE_LOCAL = isDummyMode;

type CommunitySearchParams = { q?: string; category?: string; city?: string };

// Mimic the axios response envelope the real API returns, so `.then((r) => r.data)`
// keeps working identically in dummy mode.
const ok = <T>(data: T): Promise<{ data: T }> => Promise.resolve({ data });

const has = (hay: string, q?: string) =>
  !q || hay.toLowerCase().includes(q.toLowerCase());

// A fixture slug. The real slug is the backend's to mint; this only has to be
// URL-safe and unique enough that `/event/[id]` resolves the row it just made.
const slugify = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "event";

// A Hybrid event is attendable BOTH ways, so it matches an Online filter AND an
// In-Person one — it belongs in the city row and the online row at once. That is
// the case the old `category === "online"` encoding could not represent.
function matchesFormat(event: Event, wanted: string): boolean {
  if ((event.event_type ?? "").toLowerCase() === "hybrid") return true;
  return wanted.toLowerCase() === "online" ? isOnlineEvent(event) : !isOnlineEvent(event);
}

/**
 * A fixture's `start_date` is a full ISO timestamp; a date bound is a LOCAL
 * `YYYY-MM-DD` day (`isoDate` in /explore), and both ends are inclusive — its
 * "Today" preset sets `date_from === date_to`. So the comparison is day against
 * day. Comparing the timestamp itself would read the bound as midnight and drop
 * every event later that day, i.e. "Today" returning nothing.
 */
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// In dummy mode we deliberately IGNORE the geo/city filter (`lat`/`lng`/`radius`)
// so the UI is always populated for beautifying — every fixture is a New York
// event, so honouring it would empty every other city. Everything else matches
// what /event/search does: the online-vs-in-person split (via event_type),
// category, a loose text query, price, dates, organizer_id, and limit.
function dummyEventSearch(params?: EventSearchParams): Event[] {
  // event_type is the format filter; it is INDEPENDENT of category, so
  // { event_type: "Online", category: "Music" } correctly yields online music
  // events.
  let list = discoverableEvents();
  if (params?.event_type) list = list.filter((e) => matchesFormat(e, params.event_type!));
  if (params?.category) {
    const wanted = params.category.toLowerCase();
    list = list.filter((e) => e.category.toLowerCase() === wanted);
  }
  if (params?.q) list = list.filter((e) => has(e.title, params.q));
  // ⚠️ Both bounds are inclusive, and price is compared as a BARE NUMBER with
  // no regard for the event's currency — a $45 fixture matches price_max=500 as
  // readily as a ₹45 one. That mirrors the backend exactly, on purpose: see the
  // same warning on /event/search and TODO.md §25. Do NOT convert here.
  if (typeof params?.price_min === "number") {
    list = list.filter((e) => Number(e.price ?? 0) >= params.price_min!);
  }
  if (typeof params?.price_max === "number") {
    list = list.filter((e) => Number(e.price ?? 0) <= params.price_max!);
  }
  if (params?.date_from) list = list.filter((e) => localDay(e.start_date) >= params.date_from!);
  if (params?.date_to) list = list.filter((e) => localDay(e.start_date) <= params.date_to!);
  if (params?.organizer_id) list = list.filter((e) => e.organizer_id === params.organizer_id);
  if (typeof params?.limit === "number") list = list.slice(0, params.limit);
  return list.map(snapshot);
}

function dummyCommunitySearch(params?: CommunitySearchParams): Community[] {
  let list = params?.category === "online" ? dummyOnlineCommunities : dummyCommunities;
  if (params?.q) list = list.filter((c) => has(c.name, params.q));
  return list;
}

/**
 * Every fixture event, discoverable or not — the pool `get()` resolves an id
 * against. Includes the organiser's drafts and finished events, so the console's
 * "Manage" link opens a real event page for every row it lists.
 *
 * ⚠️ `dummyMyEvents` comes FIRST, and that is deliberate. Dummy mode has no
 * relevance or date ordering, so a search returns fixture order — and the home
 * grid shows only `GRID_LIMIT` cards before the "See all" tile. Appended last,
 * the organiser's own events would never appear on the home page at all, which
 * defeats the point of their being real events: you should be able to open the
 * home page, click the event you are managing, and land on its public page.
 */
const allEvents = () => [...dummyMyEvents, ...dummyEvents, ...dummyOnlineEvents];

/**
 * ⚠️ EVERY DUMMY READ HANDS OUT A COPY, AND THAT IS LOAD-BEARING (Gautham,
 * 2026-09-08: "changing Live → Registration closed isn't dynamically changing").
 *
 * `update` below mutates the fixture IN PLACE, and React Query keeps structural
 * sharing on by default — `setQueryData` runs `replaceEqualDeep(old, new)` and
 * returns the OLD reference whenever the two are deeply equal. Hand the cache
 * the fixture object itself and both halves of that comparison are the same
 * mutated object, so the write is always "no change": **the fixture updates, the
 * mutation succeeds, and nothing re-renders.** Returning `{ ...target }` from
 * `update` cannot fix that on its own — the value it is compared against was
 * already mutated underneath the cache.
 *
 * A copy at READ time is what breaks the aliasing: the cache holds a snapshot
 * taken before the edit, so the post-edit value genuinely differs and the diff
 * is visible. Deep equality still collapses unchanged rows back onto their old
 * references, so this costs no extra renders. Shallow is enough — nothing
 * mutates a nested `location` in place.
 */
const snapshot = <T extends object>(e: T): T => ({ ...e });

/**
 * What a VISITOR can find: published, and not already over.
 *
 * ⚠️ This filter is not decoration. `dummyMyEvents` deliberately carries a draft
 * and three finished events so the console's Drafts and Past tabs have something
 * in them — and a draft appearing in the discovery grid would contradict the
 * entire model (an unpublished event is not for sale), while a finished one
 * would sit in "upcoming events" advertising a date that has passed. The real
 * events endpoint already defaults to `status: "published"`, so this only brings
 * dummy mode into line with it.
 */
const discoverableEvents = () =>
  allEvents().filter(
    (e) =>
      (e.status ?? "").toLowerCase() === "published" &&
      new Date(e.end_date || e.start_date).getTime() >= Date.now(),
  );

const allCommunities = () => [...dummyCommunities, ...dummyOnlineCommunities];

export const eventsSource = {
  search: (params?: EventSearchParams) =>
    isDummyMode ? ok(dummyEventSearch(params)) : eventsApi.search(params),
  get: (id: string) => {
    if (!isDummyMode) return eventsApi.get(id);
    const found = allEvents().find((e) => String(e.id) === String(id));
    return ok((found ? snapshot(found) : null) as Event);
  },
  // Dummy mode counts the fixtures, so the hero's "About N options" line is
  // honest in both modes rather than reporting a backend number no one is serving.
  // It counts what a visitor could actually FIND — a draft is not an option.
  count: () =>
    isDummyMode ? ok({ count: discoverableEvents().length }) : eventsApi.count(),

  /**
   * Create an event — `/organizer/create`.
   *
   * ⚠️ REAL MODE STRIPS THE EXTRAS, exactly as `update` does and for the same
   * reason: `EventCreate` has no `agenda` / `faq` / `announcements` /
   * `offer_name` field, so Pydantic would drop them silently. The create form
   * never sends them in real mode either (its list editors are disabled off
   * `EXTRAS_ARE_LOCAL`); this is the second lock, not the first. **When the
   * columns land, delete this strip along with `update`'s.**
   *
   * ⚠️ Dummy mode pushes onto `dummyMyEvents` rather than POSTing, which is what
   * lets an organiser fill in an agenda at creation time and then see it on the
   * event page — the ONE mode where the extras survive. Same module-memory
   * lifetime as an edit: survives navigation, dies on reload.
   */
  create: (data: EventCreateData & EventExtras): Promise<{ data: Event }> => {
    if (!isDummyMode) {
      // `delete` needs an index signature, which loses the required keys on the
      // way back — hence the double assertion. The keys removed are exactly
      // `EXTRA_KEYS`, none of which `EventCreateData` declares.
      const forApi: Record<string, unknown> = { ...data };
      for (const k of EXTRA_KEYS) delete forApi[k];
      return eventsApi.create(forApi as unknown as EventCreateData);
    }
    const id = `my-evt-new-${Math.random().toString(36).slice(2, 8)}`;
    const created = {
      ...data,
      id,
      slug: `${slugify(data.title)}-${id.slice(-6)}`,
      tickets_sold: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Event;
    dummyMyEvents.push(created);
    return ok(created);
  },

  /**
   * Edit an event — the organiser's own, and only from the organiser view on
   * `/event/[id]`.
   *
   * ⚠️ An edit writes to a row that must ALREADY EXIST, and in dummy mode it
   * does not — a PATCH would 404 on every fixture id. So the dummy branch
   * mutates the fixture object in place, where `create` above could simply push
   * a new one. It is the same event the console lists and the page renders, so
   * both agree immediately. It lives
   * in module memory, which means **a dummy-mode edit survives navigation and
   * dies on reload**. That is the honest behaviour for a fixture; do not add a
   * localStorage layer to make it look persistent.
   *
   * ⚠️ IT ALSO CARRIES THE EXTRAS (agenda, announcements, FAQ, offer name,
   * cover image), and in REAL mode it STRIPS them before calling the API. The
   * backend has no column for any of them, so Pydantic would drop them anyway —
   * stripping here just makes that visible in one place instead of silent in the
   * network tab. The UI never sends them in real mode either (every authoring
   * control is disabled off `EXTRAS_ARE_LOCAL`); this is the second lock, not
   * the first. **When the columns land, delete the strip AND `EXTRA_KEYS` —
   * leaving it would quietly discard the very fields it was added to protect.**
   */
  update: (id: string, patch: EventUpdateData & EventExtras): Promise<{ data: Event }> => {
    if (!isDummyMode) {
      const forApi: Record<string, unknown> = { ...patch };
      for (const k of EXTRA_KEYS) delete forApi[k];
      return eventsApi.update(id, forApi as EventUpdateData);
    }
    const target = allEvents().find((e) => String(e.id) === String(id));
    if (!target) return Promise.reject(new Error(`No fixture event ${id}`));
    Object.assign(target, patch, { updated_at: new Date().toISOString() });
    // ⚠️ A COPY, NOT `target` ITSELF (Gautham, 2026-09-01: a status change
    // "isn't immediately reflected in the page"). Every caller pipes this into
    // `queryClient.setQueryData(["event", id], …)`, and returning `target` would
    // write a value referentially equal to the one already stored.
    //
    // ⚠️ THE SPREAD IS ONLY HALF OF IT, and on its own it fixed NOTHING — the
    // bug came back on the same select (Gautham, 2026-09-08). React Query
    // compares by DEEP equality, not by reference, so a fresh reference around
    // the same values is still "no change". The other half is that dummy reads
    // hand out copies too, so the cache is not holding this very object while we
    // mutate it — see `snapshot` above, and do not remove either half.
    return ok(snapshot(target));
  },

  /**
   * Copy an event into a fresh DRAFT — "Duplicate event".
   *
   * ⚠️ THE COPY IS ALWAYS A DRAFT, never inherits the original's status, and
   * always starts at `tickets_sold: 0`. Duplicating a published event that has
   * sold 42 tickets must not produce a second published event claiming 42 sales;
   * what is being copied is the PLAN, not the trading history. Reviews, the
   * room and the attendee list are the original's and are not copied either —
   * they belong to the event that happened.
   *
   * Real mode goes through `POST /event/` like `/organizer/create` does, because
   * a create writes a row that does not exist yet and so can always reach the
   * backend. Dummy mode pushes onto `dummyMyEvents` — same module-memory
   * lifetime as an edit: survives navigation, dies on reload.
   */
  duplicate: (source: Event, title: string): Promise<{ data: Event }> => {
    const draft = {
      organizer_id: source.organizer_id,
      title,
      description: source.description ?? "",
      category: source.category,
      event_type: source.event_type ?? "In-Person",
      location: { ...(source.location ?? {}) },
      target_audience: source.target_audience,
      tags: source.tags ?? [],
      language: source.language,
      event_website: source.event_website,
      start_date: source.start_date,
      end_date: source.end_date,
      capacity: source.capacity,
      price: source.price,
      currency: source.currency,
      status: "draft",
    };
    if (!isDummyMode) return eventsApi.create(draft);

    const id = `my-evt-copy-${Math.random().toString(36).slice(2, 8)}`;
    const copy: Event = {
      ...source,
      ...draft,
      id,
      slug: `${source.slug ?? "event"}-copy-${id.slice(-6)}`,
      status: "draft",
      tickets_sold: 0,
      // ⚠️ The agenda, the FAQ and the offer name are part of the PLAN and come
      // across (real mode loses them with the rest of the extras — no column).
      // Announcements do NOT: each one was addressed to the people who had
      // booked the original, and re-posting "doors open at 6" under a draft
      // nobody has booked is at best noise and at worst a stale instruction.
      announcements: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Event;
    dummyMyEvents.push(copy);
    return ok(copy);
  },
};

/**
 * Is this signed-in person the organiser of this event — i.e. may they see the
 * organiser view on `/event/[id]`?
 *
 * ⚠️ Dummy mode does NOT compare against the JWT subject, for the same reason
 * `organizerSource.events` ignores it: during development whoever is signed in
 * is the owner of `dummyMyEvents`, and comparing a real token's `sub` against
 * `DUMMY_ORGANISER_ID` would mean no fixture event is ever yours — so the
 * organiser view would be unreachable in the one mode built to exercise it.
 *
 * ⚠️ This is a UI gate, not a permission. What actually protects an event from
 * a stranger's PATCH is the backend, and today **the event service checks
 * nothing** — see TODO.md §20.
 */
export function ownsEvent(event: Pick<Event, "organizer_id"> | null | undefined, organiserId: string): boolean {
  if (!event) return false;
  if (isDummyMode) return event.organizer_id === DUMMY_ORGANISER_ID;
  return !!organiserId && event.organizer_id === organiserId;
}

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

// ── Organiser console ────────────────────────────────────────────────────────
//
// ⚠️ THIS ONE IS NOT A SWITCH BETWEEN TWO WORKING PATHS. Rooms, attendees,
// earnings and organiser settings have NO backend endpoint yet (TODO.md §19),
// so the "real" branch returns EMPTY rather than calling anything. That is
// deliberate: the alternative — serving the fixtures in real mode too — would
// show an organiser fake revenue and fake attendees for their own events.
//
// Every consumer must therefore handle the empty case, and the console's
// sections render a "needs the backend" state instead of a zeroed table. When
// the endpoints land, replace each `[]` here with the real call and the pages
// need no change.
export const organizerSource = {
  /**
   * The signed-in organiser's own events — the ONE part of the console that is
   * real in both modes.
   *
   * ⚠️ Dummy mode returns `dummyMyEvents` ONLY, not every fixture. It still
   * ignores `organiserId` — during development whoever is signed in is treated
   * as the organiser, because filtering by a real user's JWT subject would leave
   * the console empty, which is the opposite of what dummy mode is for. But WHAT
   * they get is one believable portfolio of eight events rather than all
   * thirty-one, so the console shows a person's own events the way it will in
   * production. The other fixtures belong to other organisers and are
   * discoverable, never manageable.
   *
   * ⚠️ Real mode returns PUBLISHED events only, because `eventsApi.search`
   * defaults `status: "published"` and there is no organiser-scoped endpoint
   * that includes drafts. So the Drafts tab is always empty against a live
   * backend — part of TODO.md §19, not a bug in the page.
   */
  events: (organiserId: string): Promise<{ data: Event[] }> =>
    // Copies, for the reason written up on `snapshot` — this is the query the
    // status select invalidates, and handing back the fixture objects themselves
    // would make the refetch deep-equal to what the console is already showing.
    isDummyMode ? ok(dummyMyEvents.map(snapshot)) : eventsApi.search({ organizer_id: organiserId }),

  /** Ticket holders for one event. `eventId` is ignored in dummy mode. */
  attendees: (): Promise<{ data: DummyAttendee[] }> => ok(isDummyMode ? dummyAttendees : []),

  /** Per-event settlement rows. */
  earnings: (): Promise<{ data: DummyEarningRow[] }> => ok(isDummyMode ? dummyEarnings : []),

  /** The payment terms the Earnings page prints under its settlement table. */
  paymentTerms: (): Promise<{ data: DummyPaymentTerm[] }> => ok(isDummyMode ? dummyPaymentTerms : []),

  /** Portfolio roll-ups + the "next up" event the Events hero is built on. */
  overview: (): Promise<{ data: { portfolio: typeof dummyPortfolio; next: typeof dummyNextEvent } | null }> =>
    ok(isDummyMode ? { portfolio: dummyPortfolio, next: dummyNextEvent } : null),
};
