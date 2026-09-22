// Organiser console — Attendees.
//
// Who is coming, what they paid, and who walked in. The action column is the
// point of the page: a refund to review, a payment to chase, a door to run.
//
// ⚠️ THE DOOR IS LOCAL. "Start check-in mode" and every row's "Check in" work,
// but they write to `lib/checkin-store.ts` — this browser's localStorage — not
// to the ticketing service, which has no check-in records (TODO.md §19.3). A
// check-in survives a reload and a trip to another section, and is invisible
// to a second device at the same door. The store's header says what changes
// when the endpoint lands. "Review" and "Remind" still have nowhere to post and
// stay disabled with their reason in the tooltip.
//
// Check-in mode is a way of holding the same table, not a different one: the
// "Check in" action goes solid green so it is the one thing on the row, rows
// sort by name so a person at the door can be found by the name they give, and
// the footer counts arrivals. Nothing is hidden — the stat tiles keep telling
// the truth about unpaid and refund rows while the door is open.
//
// ⚠️ ALL THREE FILTERS ARE IN THE URL — `?event=<id>`, `?ticket=`, `?status=`.
// `event` is how `/event/[id]`'s organiser card links here ("Manage
// attendees"); arriving from one event and landing on every event's attendees
// means re-finding your way, so the param is what makes that link a
// destination rather than a section. The other two ride along so a filtered
// view can be shared or bookmarked. All three WRITE BACK with `router.replace`,
// not `push`, or the back button walks the user through every filter they
// tried instead of leaving the page. They filter the rows already in memory —
// the `FilterSelect` rule in ConsoleUI — and wait on no endpoint.
//
// ⚠️ Export CSV serialises the rows on screen — after the filters, with a
// "Checked in" column carrying the local door time. `lib/csv.ts` owns the
// escaping — read its header before hand-rolling a join.

"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerSource } from "@/lib/data-source";
import { formatPrice } from "@/lib/currency";
import { csvFilename, downloadCsv } from "@/lib/csv";
import { useCheckIns, setCheckedIn } from "@/lib/checkin-store";
import type { DummyAttendee } from "@/lib/fixtures/organizer";
import { useOrganiser, useOrganiserEvents } from "@/components/organizer/useOrganiser";
import {
  Card, Pill, StatTile, FilterSelect, ConsoleButton, EmptyState, NotBuiltYet,
  RowAction, RowMenu, TableScroller, TableHead, TableRow, TableFooter,
} from "@/components/organizer/ConsoleUI";
import type { FilterOption, RowMenuItem } from "@/components/organizer/ConsoleUI";
import { TicketIcon, DownloadIcon } from "@/components/organizer/ConsoleIcons";

/** Widened with the type scale — see the note on the Events page's TEMPLATE. */
const TEMPLATE = "1.7fr 1.7fr 0.9fr 0.8fr 0.9fr 1.1fr 132px";

/** The "no filter" value for the event and ticket-type dropdowns. Not `""` — an
 *  empty string is indistinguishable from a missing param, and `FilterSelect`
 *  compares it against `defaultValue`. */
const ALL = "all";

/**
 * The status dropdown's values — URL-safe slugs, never the display strings.
 * "Checked in" is a status of this page's own making (the local door record),
 * layered over the fixture's three: a checked-in attendee is still Confirmed,
 * so "Confirmed" includes them and "Checked in" narrows to them.
 */
type StatusFilter = "any" | "confirmed" | "checked-in" | "refund" | "unpaid";
const STATUS_OPTIONS: readonly FilterOption<StatusFilter>[] = [
  { value: "any", label: "Any status" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked-in", label: "Checked in" },
  { value: "refund", label: "Refund requested" },
  { value: "unpaid", label: "Awaiting payment" },
];
const isStatusFilter = (v: string | null): v is StatusFilter =>
  STATUS_OPTIONS.some((o) => o.value === v);

const ROUTE = "/organizer/attendees";

export default function ConsoleAttendeesPage() {
  // `useSearchParams` needs a Suspense boundary — the pattern /explore,
  // /dashboard and /chat/[roomId] already use.
  return (
    <Suspense>
      <AttendeesInner />
    </Suspense>
  );
}

function AttendeesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const picked = params.get("event") ?? ALL;
  const ticket = params.get("ticket") ?? ALL;
  const statusParam = params.get("status");
  const status: StatusFilter = isStatusFilter(statusParam) ? statusParam : "any";

  const { organiserId } = useOrganiser();
  const { data: events = [] } = useOrganiserEvents(organiserId);
  const checkIns = useCheckIns();
  const [door, setDoor] = useState(false);

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["organizer-attendees"],
    queryFn: () => organizerSource.attendees().then((r) => r.data),
  });

  const titleOf = useMemo(() => {
    const m = new Map(events.map((e) => [String(e.id), e.title]));
    return (id: string) => m.get(id) ?? id;
  }, [events]);

  /**
   * One option per event that actually HAS attendees, plus the current
   * selection even when it has none.
   *
   * ⚠️ That last part matters: an organiser clicking "Manage attendees" on an
   * event nobody has booked would otherwise land on a control whose trigger
   * reads "All events" while the table below shows nothing — the filter saying
   * one thing and the rows another. Keeping the option means the page can say
   * "nobody has booked *this* event" instead.
   */
  const eventOptions = useMemo(() => {
    const ids = Array.from(new Set(attendees.map((a) => a.eventId)));
    if (picked !== ALL && !ids.includes(picked)) ids.push(picked);
    return [
      { value: ALL, label: "All events" },
      ...ids.map((id) => ({ value: id, label: titleOf(id) })),
    ];
  }, [attendees, picked, titleOf]);

  const ofEvent = useMemo(
    () => (picked === ALL ? attendees : attendees.filter((a) => a.eventId === picked)),
    [attendees, picked],
  );

  /** The ticket types the PICKED event sold, in the order they first appear;
   *  the current pick is kept for the same reason the event option is. */
  const ticketOptions = useMemo(() => {
    const names = Array.from(new Set(ofEvent.map((a) => a.ticket)));
    if (ticket !== ALL && !names.includes(ticket)) names.push(ticket);
    return [
      { value: ALL, label: "All ticket types" },
      ...names.map((t) => ({ value: t, label: t })),
    ];
  }, [ofEvent, ticket]);

  const rows = useMemo(() => {
    const list = ofEvent.filter((a) => {
      if (ticket !== ALL && a.ticket !== ticket) return false;
      const arrived = a.id in checkIns;
      switch (status) {
        case "confirmed": return a.status === "Confirmed";
        case "checked-in": return arrived;
        case "refund": return a.status === "Refund requested";
        case "unpaid": return a.status === "Awaiting payment";
        default: return true;
      }
    });
    // Door mode: the person in front of you gives a name, not a booking date.
    return door ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [ofEvent, ticket, status, checkIns, door]);

  const stats = useMemo(() => {
    const confirmed = rows.filter((a) => a.status === "Confirmed").length;
    const checkedIn = rows.filter((a) => a.id in checkIns).length;
    const repeat = rows.filter((a) => a.repeat).length;
    const needsAction = rows.filter((a) => a.status !== "Confirmed");
    return {
      confirmed,
      checkedIn,
      repeat,
      repeatPct: rows.length ? Math.round((repeat / rows.length) * 100) : 0,
      needsAction,
      refunds: needsAction.filter((a) => a.status === "Refund requested").length,
      unpaid: needsAction.filter((a) => a.status === "Awaiting payment").length,
    };
  }, [rows, checkIns]);

  function setParam(key: "event" | "ticket" | "status", value: string, none: string) {
    const next = new URLSearchParams(params.toString());
    if (value === none) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${ROUTE}?${qs}` : ROUTE, { scroll: false });
  }

  function exportCsv() {
    downloadCsv(
      csvFilename("attendees", picked === ALL ? "all-events" : titleOf(picked)),
      ["Event", "Name", "Email", "Phone", "Ticket", "Paid", "Currency", "Booked", "Status", "Repeat", "Checked in"],
      rows.map((a) => [
        titleOf(a.eventId),
        a.name,
        a.email,
        a.phone,
        a.ticket,
        // The bare number plus a separate currency column — a formatted "₹1,400"
        // is a string a spreadsheet cannot sum, and this file exists to be summed.
        a.paid,
        a.currency,
        a.booked,
        a.status,
        a.repeat,
        checkIns[a.id] ?? "",
      ]),
    );
  }

  // ⚠️ Tested against the UNFILTERED list. A filter that matches nothing is an
  // empty result, not a missing backend, and the two must not print the same
  // page — one is fixed by clearing the filter, the other by building an
  // endpoint.
  if (!isLoading && attendees.length === 0) {
    return <NotBuiltYet what="Attendee lists" todo="TODO.md §19" />;
  }

  const narrowed = ticket !== ALL || status !== "any";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* All three filter rows already in memory, so all three WORK — the
              rule in ConsoleUI's FilterSelect note. `align="start"`: these lead
              their row, so the menu grows rightward, under the trigger. */}
          <FilterSelect
            label="Event"
            value={picked}
            options={eventOptions}
            onChange={(v) => setParam("event", v, ALL)}
            defaultValue={ALL}
            align="start"
          />
          <FilterSelect
            label="Ticket type"
            value={ticket}
            options={ticketOptions}
            onChange={(v) => setParam("ticket", v, ALL)}
            defaultValue={ALL}
            align="start"
          />
          <FilterSelect
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(v) => setParam("status", v, "any")}
            defaultValue="any"
            align="start"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brand green at rest (Gautham, 2026-09-11) — it was the terracotta
              `accent`, the ink panel's primary, on a page with no ink panel.
              While the door is open it steps back to the outline so the row's
              solid "Check in" is the only green fill on the page. */}
          <ConsoleButton
            tone={door ? "outline" : "green"}
            onClick={() => setDoor((d) => !d)}
            title={
              door
                ? "Back to the ordinary list"
                : "Sort by name and make Check in the one action on every row"
            }
          >
            <TicketIcon className="w-5 h-5" /> {door ? "End check-in mode" : "Start check-in mode"}
          </ConsoleButton>
          <ConsoleButton
            tone="outline"
            onClick={exportCsv}
            disabled={rows.length === 0}
            title={
              rows.length === 0
                ? "Nothing to export with this filter"
                : `Download ${rows.length} row${rows.length === 1 ? "" : "s"} as a spreadsheet`
            }
          >
            <DownloadIcon className="w-5 h-5" /> Export CSV
          </ConsoleButton>
        </div>
      </div>

      {rows.length === 0 ? (
        narrowed ? (
          <EmptyState
            title="Nobody matches these filters"
            body="Clear the ticket type or status filter to see the rest of the list."
          />
        ) : (
          <EmptyState
            title={`Nobody has booked ${titleOf(picked)} yet`}
            body="When someone buys a ticket they appear here, with what they paid and how to reach them."
          />
        )
      ) : (
        <>
          <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Confirmed" value={stats.confirmed} sub={`of ${rows.length} booked`} />
            {/* A number, not the em dash the Events page draws: this page DOES
                record arrivals — on this device, via lib/checkin-store.ts — so
                "0" here honestly means nobody has been checked in from it. */}
            <StatTile
              label="Checked in"
              value={stats.checkedIn}
              sub={`of ${stats.confirmed} confirmed · this device`}
              tone={stats.checkedIn > 0 ? "good" : "neutral"}
            />
            <StatTile label="Repeat attendees" value={stats.repeat} sub={`${stats.repeatPct}% came before`} tone="good" />
            <StatTile
              label="Needs action"
              value={stats.needsAction.length}
              sub={`${stats.refunds} refund · ${stats.unpaid} unpaid`}
              tone={stats.needsAction.length > 0 ? "warn" : "good"}
            />
          </div>

          <Card padded={false}>
            <TableScroller minWidth={1000}>
              <TableHead
                template={TEMPLATE}
                columns={["Attendee", "Contact", "Ticket", "Paid", "Booked", "Status", <span key="a" className="text-right block">Actions</span>]}
              />
              {rows.map((a) => (
                <AttendeeRow key={a.id} attendee={a} checkedInAt={checkIns[a.id]} door={door} />
              ))}
            </TableScroller>
            <TableFooter
              note={
                door
                  ? `Check-in mode · ${stats.checkedIn} of ${stats.confirmed} confirmed checked in`
                  : `${rows.length} attendee${rows.length === 1 ? "" : "s"} · ${stats.refunds} refund request${stats.refunds === 1 ? "" : "s"}`
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function AttendeeRow({
  attendee: a, checkedInAt, door,
}: {
  attendee: DummyAttendee;
  /** ISO time from the local door record, or undefined if they have not arrived. */
  checkedInAt?: string;
  door: boolean;
}) {
  const confirmed = a.status === "Confirmed";
  const arrived = confirmed && !!checkedInAt;
  const firstName = a.name.split(" ")[0];

  const menu: RowMenuItem[] = [
    ...(confirmed
      ? [{
          label: arrived ? "Undo check-in" : "Check in",
          onSelect: () => setCheckedIn(a.id, !arrived),
        }]
      : []),
    { label: "Copy email address", onSelect: () => { void navigator.clipboard?.writeText(a.email); } },
    { label: `Email ${firstName}`, href: `mailto:${a.email}` },
  ];

  return (
    <TableRow template={TEMPLATE}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-[15px] font-bold"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand-green) 14%, transparent)", color: "var(--brand-green)" }}
        >
          {a.initials}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-[17px] font-semibold truncate" style={{ color: "var(--brand-text)" }}>{a.name}</span>
          {a.repeat && (
            <span className="text-[15px]" style={{ color: "var(--brand-green)" }}>{a.repeat}</span>
          )}
        </span>
      </div>

      <div className="min-w-0 text-[17px]" style={{ color: "var(--brand-hint)" }}>
        <div className="truncate">{a.email}</div>
        <div className="text-[15px] opacity-80">{a.phone}</div>
      </div>

      <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{a.ticket}</div>
      {/* The attendee's own currency — the event they bought into priced it.
          Never a literal here; see the rule in lib/currency.ts. */}
      <div className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>
        {formatPrice(a.paid, a.currency, { freeLabel: null })}
      </div>
      <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{a.booked}</div>
      <div className="flex flex-col items-start gap-1">
        {arrived ? (
          <>
            <Pill tone="good">Checked in</Pill>
            <span className="text-[15px]" style={{ color: "var(--brand-hint)" }}>at {timeOf(checkedInAt)}</span>
          </>
        ) : (
          <Pill tone={confirmed ? "good" : "warn"}>{a.status}</Pill>
        )}
      </div>

      <div className="flex justify-end items-center gap-1.5">
        {a.status === "Refund requested" && (
          <RowAction disabled title="Refund review arrives with the payments backend">Review</RowAction>
        )}
        {a.status === "Awaiting payment" && (
          <RowAction disabled title="Payment reminders arrive with the payments backend">Remind</RowAction>
        )}
        {confirmed && !arrived && (
          <RowAction
            tone={door ? "green" : "outline"}
            onClick={() => setCheckedIn(a.id, true)}
            title={`Mark ${firstName} as arrived`}
          >
            Check in
          </RowAction>
        )}
        {arrived && (
          <RowAction onClick={() => setCheckedIn(a.id, false)} title="Take the check-in back">
            Undo
          </RowAction>
        )}
        <RowMenu items={menu} label={`More actions for ${a.name}`} />
      </div>
    </TableRow>
  );
}
