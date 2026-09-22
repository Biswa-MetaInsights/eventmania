// Dummy events for frontend development ("dummy" data mode — see lib/data-source.ts).
//
// These are API-shaped `Event` objects (identical to what the backend returns), so
// they flow through `toCarouselEvent()` and every card/detail component unchanged.
// They exist purely so the UI has something to display while beautifying the site,
// with NO backend running. Edit freely — nothing here ships to production.
//
// Dates are computed relative to "now" at load time so the Today / This Week /
// Selling Fast badges stay meaningful no matter when you run the dev server.
//
// ⚠️ THREE ARRAYS, TWO OWNERS. `dummyEvents` and `dummyOnlineEvents` belong to
// other organisers — a visitor discovers them and nothing more. `dummyMyEvents`
// belongs to whoever is signed in during development, and it is the ONE list the
// organiser console draws (see `organizerSource.events` in lib/data-source.ts).
// That is why the console's rooms, attendees, earnings and roll-ups all key off
// event ids from that third array: there is one set of events in this app, seen
// from two sides, never two invented worlds. `lib/fixtures/organizer.ts` derives
// every organiser-side figure from it — do not hand-write a title or a total
// there that does not correspond to an event here.

import { EVENT_FORMATS, type Event } from "@eventmind/types";

const DAY = 24 * 60 * 60 * 1000;

/**
 * The organiser id every event in `dummyMyEvents` carries.
 *
 * In dummy mode the console ignores the signed-in user's real JWT subject and
 * serves this owner's events instead — during development anyone on the dummy
 * setup IS the organiser. In real mode the id comes from the token and nothing
 * here is reachable. See `organizerSource.events` and TODO.md §19.
 */
export const DUMMY_ORGANISER_ID = "dummy-organiser-me";

// ISO timestamp `days` from now, at a fixed hour (local-ish; fine for dummy data).
function at(days: number, hour = 19): string {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function ev(e: Partial<Event> & Pick<Event, "id" | "title" | "category" | "start_date">): Event {
  return {
    organizer_id: "dummy-org",
    slug: e.id,
    description: "Dummy event for frontend development.",
    event_type: EVENT_FORMATS.inPerson,
    location: { name: "Venue TBC", city: "New York", latitude: 40.7128, longitude: -74.006 },
    end_date: e.start_date,
    capacity: 200,
    tickets_sold: 40,
    price: 0,
    // These are New York events priced in dollars, so they SAY so. A missing
    // currency falls back to INR (packages/types → DEFAULT_CURRENCY), which is
    // how a $45 jazz night rendered as ₹45 on every card. `dummyMyEvents` below
    // overrides this to INR, because those events really are priced in rupees.
    currency: "USD",
    status: "published",
    ...e,
  } as Event;
}

// ── Offline / city events (shown for any selected city in dummy mode) ────────────
export const dummyEvents: Event[] = [
  ev({
    id: "dummy-evt-1", title: "Midnight Jazz at the Blue Room", category: "Music",
    location: { name: "The Blue Room", city: "New York", latitude: 40.73, longitude: -73.99 },
    start_date: at(2, 21), capacity: 150, tickets_sold: 118, price: 45, // selling fast
  }),
  ev({
    id: "dummy-evt-2", title: "Street Food Night Market", category: "Food & Drink",
    location: { name: "Riverside Yards", city: "New York", latitude: 40.71, longitude: -74.01 },
    start_date: at(0, 18), price: 0, // today + free
  }),
  ev({
    id: "dummy-evt-3", title: "FutureStack — AI & Cloud Summit", category: "Technology",
    location: { name: "Metro Convention Center", city: "New York", latitude: 40.75, longitude: -73.99 },
    start_date: at(9, 9), capacity: 800, tickets_sold: 260, price: 299,
  }),
  ev({
    id: "dummy-evt-4", title: "Contemporary Art After Dark", category: "Arts & Culture",
    location: { name: "Halcyon Gallery", city: "New York", latitude: 40.72, longitude: -73.98 },
    start_date: at(4, 19), price: 0, // this week + free
  }),
  ev({
    id: "dummy-evt-5", title: "City Marathon Finals", category: "Sports",
    location: { name: "Grand Stadium", city: "New York", latitude: 40.69, longitude: -73.97 },
    start_date: at(12, 8), capacity: 100, tickets_sold: 100, price: 25, // sold out
  }),
  ev({
    id: "dummy-evt-6", title: "Founders & Funders Networking Night", category: "Networking",
    location: { name: "Skyline Rooftop", city: "New York", latitude: 40.74, longitude: -73.99 },
    start_date: at(3, 18), capacity: 120, tickets_sold: 95, price: 15, // selling fast + this week
  }),
  ev({
    id: "dummy-evt-7", title: "Stand-Up Comedy Showcase", category: "Arts & Culture",
    location: { name: "The Laugh Cellar", city: "New York", latitude: 40.73, longitude: -74.0 },
    start_date: at(0, 20), capacity: 90, tickets_sold: 70, price: 20, // today
  }),
  ev({
    id: "dummy-evt-8", title: "Sunrise Yoga & Wellness Retreat", category: "Health & Wellness",
    location: { name: "Greenfield Park", city: "New York", latitude: 40.78, longitude: -73.96 },
    start_date: at(6, 7), price: 0, // this week + free
  }),
  ev({
    id: "dummy-evt-9", title: "Indie Film Premiere Night", category: "Arts & Culture",
    location: { name: "Roxy Cinema", city: "New York", latitude: 40.72, longitude: -74.0 },
    start_date: at(15, 20), capacity: 200, tickets_sold: 60, price: 18,
  }),
  ev({
    id: "dummy-evt-10", title: "Craft Beer & Vinyl Festival", category: "Food & Drink",
    location: { name: "Warehouse 9", city: "New York", latitude: 40.7, longitude: -73.95 },
    start_date: at(8, 16), capacity: 400, tickets_sold: 210, price: 30,
  }),

  // ── Depth for the /event/[id] "Similar events" rail ───────────────────────
  // That rail shows same-category events, so with only one or two events per
  // category it could never fill its four-across row and its scroll arrows were
  // unreachable. These deepen two categories on purpose:
  //   Music         → 5 total, so viewing one shows exactly 4 = a full row, no scroll
  //   Arts & Culture→ 7 total, so viewing one shows 6 = the row overflows and the
  //                   arrows appear
  // Keep those counts in mind before deleting any of these. `dummyMyEvents` adds
  // one more DISCOVERABLE Arts & Culture event (its other three are a draft and
  // two finished ones, which the search filters out), so that case is 8 today —
  // still comfortably past the overflow it is there to demonstrate.
  ev({
    id: "dummy-evt-11", title: "Basement Vinyl Soul Session", category: "Music",
    location: { name: "Sub Rosa", city: "New York", latitude: 40.72, longitude: -73.98 },
    start_date: at(5, 20), capacity: 120, tickets_sold: 34, price: 22,
  }),
  ev({
    id: "dummy-evt-12", title: "Symphony Under the Stars", category: "Music",
    location: { name: "Meadow Bandshell", city: "New York", latitude: 40.77, longitude: -73.97 },
    start_date: at(11, 19), capacity: 900, tickets_sold: 700, price: 0, // free + selling fast
  }),
  ev({
    id: "dummy-evt-13", title: "Warehouse Techno All-Nighter", category: "Music",
    location: { name: "Dock 12", city: "New York", latitude: 40.69, longitude: -73.99 },
    start_date: at(7, 23), capacity: 600, tickets_sold: 480, price: 35, // selling fast
  }),
  ev({
    id: "dummy-evt-14", title: "Ceramics & Clay Open Studio", category: "Arts & Culture",
    location: { name: "Kiln House", city: "New York", latitude: 40.71, longitude: -73.96 },
    start_date: at(4, 11), capacity: 40, tickets_sold: 12, price: 28,
  }),
  ev({
    id: "dummy-evt-15", title: "Poetry Slam & Spoken Word", category: "Arts & Culture",
    location: { name: "The Annex", city: "New York", latitude: 40.73, longitude: -73.97 },
    start_date: at(2, 19), capacity: 110, tickets_sold: 88, price: 0, // this week + free
  }),
  ev({
    id: "dummy-evt-16", title: "Vintage Photography Exhibition", category: "Arts & Culture",
    location: { name: "Foundry Loft", city: "New York", latitude: 40.74, longitude: -74.01 },
    start_date: at(13, 10), capacity: 300, tickets_sold: 95, price: 14,
  }),
];

// ── Online events (event_type "Online", location-independent) ────────────────────
//  Note these carry REAL categories (Technology, Music, …) exactly like the city
//  events above — "online" is a FORMAT, not a category, so an online event is
//  still a Music event. Each one below deliberately picks a different category,
//  so the Online Events row exercises a spread of category chips.
export const dummyOnlineEvents: Event[] = [
  ev({
    id: "dummy-online-evt-1", title: "Live Webinar: Designing for Scale", category: "Technology",
    event_type: EVENT_FORMATS.online, location: { name: "Online", latitude: 0, longitude: 0 },
    start_date: at(1, 17), price: 0,
  }),
  ev({
    id: "dummy-online-evt-2", title: "Virtual Producer Livestream Set", category: "Music",
    event_type: EVENT_FORMATS.online, location: { name: "Online", latitude: 0, longitude: 0 },
    start_date: at(5, 20), capacity: 5000, tickets_sold: 3800, price: 12,
  }),
  ev({
    id: "dummy-online-evt-3", title: "Remote Watercolour Workshop", category: "Arts & Culture",
    event_type: EVENT_FORMATS.online, location: { name: "Online", latitude: 0, longitude: 0 },
    start_date: at(3, 15), price: 0,
  }),
  ev({
    id: "dummy-online-evt-4", title: "Esports Open — Online Qualifiers", category: "Gaming",
    event_type: EVENT_FORMATS.online, location: { name: "Online", latitude: 0, longitude: 0 },
    start_date: at(7, 18), capacity: 256, tickets_sold: 190, price: 10,
  }),
  ev({
    id: "dummy-online-evt-5", title: "AMA: Careers in Data Science", category: "Education",
    event_type: EVENT_FORMATS.online, location: { name: "Online", latitude: 0, longitude: 0 },
    start_date: at(2, 16), price: 0,
  }),
  ev({
    id: "dummy-online-evt-6", title: "Global Startup Pitch Night (Virtual)", category: "Business",
    event_type: EVENT_FORMATS.online, location: { name: "Online", latitude: 0, longitude: 0 },
    start_date: at(10, 19), capacity: 1000, tickets_sold: 640, price: 5,
  }),
  // Hybrid — attendable in person AND online, which the old one-field model could
  // not express at all. It must appear in BOTH the city row and the online row.
  ev({
    id: "dummy-online-evt-7", title: "Founders Summit (In-Person + Stream)", category: "Networking",
    event_type: EVENT_FORMATS.hybrid,
    location: { name: "Pier 27", city: "New York", latitude: 40.75, longitude: -74.0 },
    start_date: at(6, 18), capacity: 800, tickets_sold: 610, price: 25,
  }),
];

// ── The signed-in organiser's OWN events ─────────────────────────────────────
//
// One small, believable portfolio: a Mumbai print studio that also runs two
// networking evenings. Eight events across all four console buckets, because the
// console has a tab for each and a bucket with nothing in it shows none of its
// design:
//
//   live      Cyanotype Lab (5d) · Founders' Coffee (8d) · Alumni Mixer (17d)
//   upcoming  Letterpress Weekend (45d — past LIVE_WINDOW_DAYS)
//   drafts    Cyanotype Lab — September
//   past      Cyanotype Lab July (-24d) · Zine Fair (-38d) · Darkroom (-60d)
//
// ⚠️ These are priced in INR while everything above is USD, and that is the
// point, not an oversight: it is the mixed-currency case the app must survive
// (real Ticketmaster rows carry USD/GBP/EUR beside native INR ones), and it is
// why the console reads each row's own currency instead of naming one. Keep all
// eight on ONE currency, though — the console SUMS them on the dashboard and the
// Earnings page, and a total across two currencies is a lie. `assertOneCurrency`
// in lib/fixtures/organizer.ts fails loudly if that ever stops being true.
//
// ⚠️ Only the four future, published ones reach discovery — `dummyEventSearch`
// filters drafts and finished events out, the same way the real events endpoint
// does. The past and draft rows are still resolvable by id, so the console's
// "Manage" link opens a real event page for every row it lists.
//
// ⚠️ The numbers here are LOAD-BEARING. Every figure the console shows —
// tickets sold, revenue, refunds, check-in rate, the earnings table and its
// totals — is derived from `tickets_sold × price` on these eight events plus the
// per-event extras in lib/fixtures/organizer.ts. Change a capacity or a price
// and the dashboard changes with it, which is exactly the point. Nothing is
// typed in twice.
function mine(
  e: Partial<Event> & Pick<Event, "id" | "title" | "category" | "start_date">,
): Event {
  return ev({
    organizer_id: DUMMY_ORGANISER_ID,
    currency: "INR",
    ...e,
  });
}

export const dummyMyEvents: Event[] = [
  mine({
    id: "my-evt-cyanotype",
    title: "Sunday Print Studio: Cyanotype Lab",
    category: "Arts & Culture",
    description:
      "A three-hour introduction to cyanotype printing. We coat the paper, expose it in daylight and wash the prints together — you leave with everything you make, dry and ready to frame. No experience needed; aprons and chemistry are provided, but wear something you don't mind splashing.",
    location: { name: "Bandra Workshop Annexe", address: "Hill Road, Bandra West", city: "Mumbai", latitude: 19.0596, longitude: 72.8295 },
    start_date: at(5, 10),
    end_date: at(5, 13),
    capacity: 60, tickets_sold: 42, price: 1400,
  }),
  mine({
    id: "my-evt-founders",
    title: "Founders' Coffee",
    category: "Business",
    description:
      "Forty seats, one hour, no pitching. Everyone introduces themselves in a sentence and then it is just coffee and conversation. Free to attend — we start at 08:30 sharp because most people have somewhere to be by ten.",
    location: { name: "Kala Ghoda Coffee", address: "Ropewalk Lane, Fort", city: "Mumbai", latitude: 18.9286, longitude: 72.8324 },
    start_date: at(8, 8),
    end_date: at(8, 10),
    capacity: 40, tickets_sold: 31, price: 0,
  }),
  mine({
    id: "my-evt-alumni",
    title: "Alumni Mixer '26",
    category: "Networking",
    description:
      "The annual get-together, open to every batch. Dinner, a short set from the college band, and enough room to actually hear each other. Plus-ones are welcome — bring one if you like, the ticket covers both of you at the door.",
    location: { name: "Sea Breeze Banquet", address: "Juhu Tara Road", city: "Mumbai", latitude: 19.0968, longitude: 72.8264 },
    start_date: at(17, 19),
    end_date: at(17, 23),
    capacity: 120, tickets_sold: 88, price: 1500,
  }),
  mine({
    id: "my-evt-letterpress",
    title: "Letterpress Weekend Intensive",
    category: "Creative",
    description:
      "Two days on a working Heidelberg platen. Saturday is setting type and lock-up, Sunday is printing an edition of your own — a short run of cards or a broadside you design on the first day. Fourteen places only, because there are fourteen composing sticks.",
    location: { name: "Saligao Press", address: "Bardez", city: "Goa", latitude: 15.5527, longitude: 73.7828 },
    start_date: at(45, 10),
    end_date: at(46, 17),
    capacity: 14, tickets_sold: 9, price: 4500,
  }),
  mine({
    id: "my-evt-cyanotype-sep",
    title: "Sunday Print Studio: Cyanotype Lab — September",
    category: "Arts & Culture",
    description:
      "The September batch of the cyanotype workshop. Same three hours, same studio; dates are held but not confirmed, so this one is not on sale yet.",
    location: { name: "Bandra Workshop Annexe", address: "Hill Road, Bandra West", city: "Mumbai", latitude: 19.0596, longitude: 72.8295 },
    start_date: at(38, 10),
    end_date: at(38, 13),
    capacity: 60, tickets_sold: 0, price: 1400,
    // The one draft. `bucketOf` reads anything that is not "published" as a
    // draft, and `dummyEventSearch` keeps it out of discovery entirely.
    status: "draft",
  }),
  mine({
    id: "my-evt-cyanotype-jul",
    title: "Sunday Print Studio: Cyanotype Lab — July",
    category: "Arts & Culture",
    description:
      "July's cyanotype batch. Sold out; photos from the session are up and the September batch opens next.",
    location: { name: "Bandra Workshop Annexe", address: "Hill Road, Bandra West", city: "Mumbai", latitude: 19.0596, longitude: 72.8295 },
    start_date: at(-24, 10),
    end_date: at(-24, 13),
    capacity: 60, tickets_sold: 60, price: 1400,
  }),
  mine({
    id: "my-evt-zine",
    title: "Zine Fair & Swap",
    category: "Arts & Culture",
    description:
      "Bring what you have made, take home what someone else has. A free afternoon of small-press zines, photocopied comics and a long table to trade across.",
    location: { name: "Dadar Parsi Colony Hall", address: "Jame Jamshed Road", city: "Mumbai", latitude: 19.0176, longitude: 72.8433 },
    start_date: at(-38, 15),
    end_date: at(-38, 19),
    capacity: 40, tickets_sold: 34, price: 0,
  }),
  mine({
    id: "my-evt-darkroom",
    title: "Monsoon Darkroom Open House",
    category: "Creative",
    description:
      "The darkroom, open to anyone curious about it, for one wet afternoon. Developing tanks, an enlarger demonstration and a first contact sheet to take away.",
    location: { name: "Matunga Darkroom", address: "Telang Road, Matunga East", city: "Mumbai", latitude: 19.0270, longitude: 72.8570 },
    start_date: at(-60, 16),
    end_date: at(-60, 19),
    capacity: 50, tickets_sold: 45, price: 700,
  }),
];
