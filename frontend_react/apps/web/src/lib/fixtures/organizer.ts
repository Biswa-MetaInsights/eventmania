// Dummy organiser-console data ("dummy" data mode — see lib/data-source.ts).
//
// The organiser console shows three things the backend does not serve yet:
// attendee lists, earnings, and the payment terms on the Earnings page.
// In dummy mode the console renders these fixtures so the design is fully
// visible with no backend running; in REAL mode `organizerSource` returns
// nothing and each section renders an honest "not available yet" state rather
// than inventing a figure. See TODO.md §19 for the endpoints this is waiting on.
//
// ⚠️ NOTHING HERE INVENTS AN EVENT. Every earnings row and roll-up below
// is DERIVED from `dummyMyEvents` in ./events — the same eight `Event` objects
// the console's tables list and the site's event pages render. This file used to
// hand-write its own five events (a Mumbai print studio the rest of the app had
// never heard of), so the console hero talked about "Cyanotype Lab" while the
// table underneath it listed New York jazz nights. One set of events, two views
// of it: an event's title, date, capacity, tickets sold, price and currency are
// read from the event, never restated here.
//
// What IS written by hand is only what an event object cannot carry: the
// per-event extras below (refunds, arrivals), the attendee list, and the payment
// terms. Those are the things that need the endpoints in TODO.md §19.
//
// Everything here is made up. Nothing in this file ships to production.

import type { CurrencyCode, Event } from "@eventmind/types";
import { dummyMyEvents } from "./events";

/** A date formatted the way the console prints dates. */
function fmt(date: string | number | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/** Midnight local time on the day `d` falls in — for counting calendar days. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const isDraft = (e: Event) => (e.status ?? "").toLowerCase() !== "published";
const finishedAt = (e: Event) => new Date(e.end_date || e.start_date).getTime();
const isPast = (e: Event) => finishedAt(e) < Date.now();
const grossOf = (e: Event) => e.tickets_sold * e.price;

// ── Per-event extras ─────────────────────────────────────────────────────────
//
// The organiser-side facts an `Event` has no column for. Keyed by event id, so a
// row here without a matching event is a typo you will notice immediately rather
// than a phantom event that quietly appears in one section of the console.
//
// ⚠️ `checkedIn` is `null`, NEVER 0, for an event that has not happened. The
// console draws an em dash for a missing check-in figure precisely because "no
// one has arrived" and "we do not record arrivals" are different statements —
// see the note on NotBuiltYet in ConsoleUI.tsx.

interface OrganiserExtras {
  /** Amount refunded, in the event's own currency. */
  refunds: number;
  refundedTickets: number;
  /** Arrivals recorded on the door — `null` until the event has happened. */
  checkedIn: number | null;
}

const EXTRAS: Record<string, OrganiserExtras> = {
  "my-evt-cyanotype": { refunds: 1400, refundedTickets: 1, checkedIn: null },
  "my-evt-founders": { refunds: 0, refundedTickets: 0, checkedIn: null },
  "my-evt-alumni": { refunds: 0, refundedTickets: 0, checkedIn: null },
  "my-evt-letterpress": { refunds: 0, refundedTickets: 0, checkedIn: null },
  "my-evt-cyanotype-sep": { refunds: 0, refundedTickets: 0, checkedIn: null },
  "my-evt-cyanotype-jul": { refunds: 2800, refundedTickets: 2, checkedIn: 54 },
  "my-evt-zine": { refunds: 0, refundedTickets: 0, checkedIn: 31 },
  "my-evt-darkroom": { refunds: 0, refundedTickets: 0, checkedIn: 41 },
};

const NO_EXTRAS: OrganiserExtras = { refunds: 0, refundedTickets: 0, checkedIn: null };
const extrasFor = (id: string) => EXTRAS[id] ?? NO_EXTRAS;

/**
 * The currency every figure in the console is reported in.
 *
 * The Events page and the Earnings page SUM across events, and a total that adds
 * dollars to rupees is simply wrong — so the organiser's own events are all on
 * one currency and this reads it off them rather than naming one. If a mixed
 * portfolio ever needs supporting, the totals have to be split per currency
 * first; this throws rather than quietly producing a meaningless number.
 */
function assertOneCurrency(events: Event[]): CurrencyCode {
  const codes = new Set(events.map((e) => e.currency ?? "INR"));
  if (codes.size > 1) {
    throw new Error(
      `dummyMyEvents mixes currencies (${[...codes].join(", ")}). The console sums across ` +
        `events, so a portfolio total would be meaningless. Put them all on one currency, ` +
        `or teach the Events and Earnings pages to total per currency first.`,
    );
  }
  return ([...codes][0] as CurrencyCode) ?? "INR";
}

export const DUMMY_CURRENCY = assertOneCurrency(dummyMyEvents);

// ── Attendees ────────────────────────────────────────────────────────────────
//
// ⚠️ A SAMPLE, not the full list. These six hold tickets to the Cyanotype Lab —
// the event the console hero is built around — which is why their refund
// matches its `refunds` entry in EXTRAS. The event has sold 42; a fixture file
// listing all 42 would be noise. The real page shows every ticket holder once
// the endpoint in TODO.md §19 exists.

export type AttendeeStatus = "Confirmed" | "Refund requested" | "Awaiting payment";

export interface DummyAttendee {
  id: string;
  /** The event they hold a ticket to — an id from `dummyMyEvents`. */
  eventId: string;
  name: string;
  initials: string;
  email: string;
  /** Deliberately part-masked, the way a real attendee list would render it. */
  phone: string;
  ticket: string;
  paid: number;
  /** The currency `paid` is in — the event's own. Never assume one here. */
  currency: CurrencyCode;
  booked: string;
  status: AttendeeStatus;
  /** "2nd event", "3rd event" — empty for a first-timer. */
  repeat: string;
}

const ATTENDEE_EVENT = "my-evt-cyanotype";
const DAY = 24 * 60 * 60 * 1000;
const bookedDaysAgo = (days: number) => fmt(Date.now() - days * DAY);

function attendee(
  a: Omit<DummyAttendee, "eventId" | "currency" | "booked"> & { bookedDaysAgo: number },
): DummyAttendee {
  const { bookedDaysAgo: days, ...rest } = a;
  return {
    ...rest,
    eventId: ATTENDEE_EVENT,
    currency: DUMMY_CURRENCY,
    booked: bookedDaysAgo(days),
  };
}

export const dummyAttendees: DummyAttendee[] = [
  attendee({ id: "a1", name: "Aarav Shirke", initials: "AS", email: "aarav.shirke@gmail.com", phone: "+91 98•• ••32", ticket: "General", paid: 1400, bookedDaysAgo: 18, status: "Refund requested", repeat: "" }),
  attendee({ id: "a2", name: "Nikita Rao", initials: "NR", email: "nikita.rao@outlook.com", phone: "+91 91•• ••07", ticket: "General", paid: 1400, bookedDaysAgo: 16, status: "Confirmed", repeat: "2nd event" }),
  attendee({ id: "a3", name: "Devika Menon", initials: "DM", email: "d.menon@work.co", phone: "+91 90•• ••18", ticket: "Early bird", paid: 1100, bookedDaysAgo: 23, status: "Confirmed", repeat: "3rd event" }),
  attendee({ id: "a4", name: "Rohan Bhatt", initials: "RB", email: "rohanbhatt@gmail.com", phone: "+91 99•• ••44", ticket: "General", paid: 1400, bookedDaysAgo: 11, status: "Confirmed", repeat: "" }),
  attendee({ id: "a5", name: "Fatima Sheikh", initials: "FS", email: "fatima.s@studio.in", phone: "+91 88•• ••61", ticket: "Pair pass", paid: 2600, bookedDaysAgo: 9, status: "Confirmed", repeat: "2nd event" }),
  attendee({ id: "a6", name: "Yash Kulkarni", initials: "YK", email: "yash.k@proton.me", phone: "+91 70•• ••29", ticket: "General", paid: 1400, bookedDaysAgo: 6, status: "Awaiting payment", repeat: "" }),
];

// ── Earnings ─────────────────────────────────────────────────────────────────

export interface DummyEarningRow {
  id: string;
  title: string;
  when: string;
  tickets: number;
  gross: number;
  /** What BUYERS paid on top. Informational — never subtracted from `net`. */
  buyerFee: number;
  refunds: number;
  net: number;
  /** The event's own currency — the Earnings page formats with this. */
  currency: CurrencyCode;
}

/**
 * The convenience fee on a priced ticket.
 *
 * ⚠️ THE PARTICIPANT PAYS THIS, NOT THE ORGANISER (Gautham, amended 2026-08-19
 * — TODO.md §13, and the promise is already live on the home page's pricing
 * card). It is added on top of the ticket price at checkout, so the buyer's
 * total is `price + 2%` and the organiser is made whole. Free events cost both
 * sides nothing, ever.
 *
 * That is why `net = gross - refunds` below and the fee is NOT in that sum. The
 * imported design deducted it from the organiser's payout, which is the model
 * §13 explicitly says not to build; the column is kept, relabelled, so an
 * organiser can still see what their attendees were charged.
 *
 * "Convenience fee" is the home page's own wording — do not invent a third name.
 */
export const CONVENIENCE_FEE_RATE = 0.02;

/**
 * One settlement row per event that has actually sold something.
 *
 * A draft has no sales and no row — it would only ever be a line of dashes. The
 * gross is `tickets_sold × price` from the event itself, which is the SAME
 * arithmetic `toConsoleRow` uses for its Revenue column, so the Events table and
 * the Earnings table cannot disagree about one event.
 */
export const dummyEarnings: DummyEarningRow[] = dummyMyEvents
  .filter((e) => !isDraft(e) && e.tickets_sold > 0)
  .sort((a, b) => grossOf(b) - grossOf(a))
  .map((e) => {
    const gross = grossOf(e);
    const { refunds } = extrasFor(e.id);
    return {
      id: e.id,
      title: e.title,
      when: `${fmt(e.start_date)} · ${isPast(e) ? "closed" : "on sale"}`,
      tickets: e.tickets_sold,
      gross,
      buyerFee: Math.round(gross * CONVENIENCE_FEE_RATE),
      refunds,
      // The organiser keeps the full ticket price — see CONVENIENCE_FEE_RATE.
      net: gross - refunds,
      currency: (e.currency ?? DUMMY_CURRENCY) as CurrencyCode,
    };
  });

// ── Payments ─────────────────────────────────────────────────────────────────
//
// The terms attached to the money — where it lands, what it costs, and who
// decides a refund. These four rows are the ONLY survivors of the console's
// Settings section, which was deleted on 2026-09-01 (Gautham) along with its
// organiser-profile, event-defaults and team groups. They live on the Earnings
// page now: an organiser asks where their money goes while looking at what they
// earned, not in a separate section four rows long.
//
// ⚠️ STILL READ-ONLY, and still not policy. Nothing saves — there is no
// organiser preferences endpoint (TODO.md §19.5) — and the refund window and the
// approver are fixture values standing in for decisions nobody has taken
// (TODO.md §21). Do not put an input beside one and do not quote them as
// settled.

export interface DummyPaymentTerm {
  label: string;
  value: string;
  /** Reads in green — a term that is in the organiser's favour. */
  good?: boolean;
}

export const dummyPaymentTerms: DummyPaymentTerm[] = [
  { label: "Receiving account", value: "HDFC ••4471" },
  // Derived, not typed: the Earnings page prints the same rate three inches
  // above this row, and "Convenience fee" is the home page's own name for it —
  // "platform fee", which this row used to say, is the framing where the
  // ORGANISER pays it. They do not. See CONVENIENCE_FEE_RATE.
  {
    label: "Convenience fee",
    value: `${Math.round(CONVENIENCE_FEE_RATE * 100)}% per paid ticket, paid by the buyer`,
    good: true,
  },
  { label: "Refund window", value: "Up to 48h before" },
  { label: "Who approves refunds", value: "You" },
];

// ── Roll-ups the Events page header and hero read ────────────────────────────
//
// ⚠️ EVERY FIGURE HERE IS COMPUTED, none is typed in. That is the difference
// between an overview that demonstrates a design and one that contradicts the
// table three inches below it: change an event's `tickets_sold` in ./events and
// the tile, the table row and the earnings line all move together.

const soldTickets = (list: Event[]) => list.reduce((n, e) => n + e.tickets_sold, 0);

const published = dummyMyEvents.filter((e) => !isDraft(e));
const pastEvents = published.filter(isPast);
const liveEvents = published.filter(
  (e) => !isPast(e) && new Date(e.start_date).getTime() - Date.now() <= 30 * DAY,
);

const totalGross = published.reduce((n, e) => n + grossOf(e), 0);
const totalRefunds = published.reduce((n, e) => n + extrasFor(e.id).refunds, 0);
const paidTickets = published.filter((e) => e.price > 0).reduce((n, e) => n + e.tickets_sold, 0);
const checkedInTotal = pastEvents.reduce((n, e) => n + (extrasFor(e.id).checkedIn ?? 0), 0);
const pastTickets = soldTickets(pastEvents);

export const dummyPortfolio = {
  eventsRun: dummyMyEvents.length,
  live: liveEvents.length,
  drafts: dummyMyEvents.filter(isDraft).length,
  ticketsSold: soldTickets(dummyMyEvents),
  /** Tickets booked in the last 7 days — the one figure an event object cannot carry. */
  ticketsSoldThisWeek: 14,
  /** Gross ticket sales minus refunds. The 2% is the buyer's, not a deduction. */
  netRevenue: totalGross - totalRefunds,
  /** Arrivals as a share of tickets sold to events that have HAPPENED. */
  checkInRate: pastTickets ? Math.round((checkedInTotal / pastTickets) * 100) : 0,
  checkedIn: checkedInTotal,
  pastCapacity: pastTickets,
  refunded: totalRefunds,
  refundedTickets: published.reduce((n, e) => n + extrasFor(e.id).refundedTickets, 0),
  avgTicket: paidTickets ? Math.round(totalGross / paidTickets) : 0,
  /** What all of the above is denominated in. See `assertOneCurrency`. */
  currency: DUMMY_CURRENCY,
};

/**
 * The "next up" event the console hero is built around — the soonest published
 * event that has not finished. Derived, so it can never drift out of date or
 * name an event the table below it does not list.
 */
function nextUp(): Event {
  const upcoming = published
    .filter((e) => !isPast(e))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  // `published` is never empty in practice; the fallback keeps the type honest.
  return upcoming[0] ?? dummyMyEvents[0];
}

const next = nextUp();
const nextExtras = extrasFor(next.id);
const nextStart = new Date(next.start_date);

export const dummyNextEvent = {
  eventId: next.id,
  title: next.title,
  when: `${fmt(next.start_date)} · ${nextStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · ${
    (next.location as Record<string, string>)?.name ?? "Venue TBC"
  }, ${(next.location as Record<string, string>)?.city ?? ""}`,
  // CALENDAR days, not elapsed ones. An event at 10:00 five days from now is
  // "in 5 days" to a reader looking at a calendar; dividing the raw millisecond
  // gap and rounding up calls it 6 from mid-afternoon onwards.
  inDays: Math.max(0, Math.round((startOfDay(nextStart) - startOfDay(new Date())) / DAY)),
  /** Has an admission fee. The hero's chip reads "Paid". */
  paid: next.price > 0,
  sold: next.tickets_sold,
  capacity: next.capacity,
  revenue: grossOf(next),
  checkedIn: nextExtras.checkedIn ?? 0,
  refunds: nextExtras.refundedTickets,
  refundValue: nextExtras.refunds,
  currency: (next.currency ?? DUMMY_CURRENCY) as CurrencyCode,
};
