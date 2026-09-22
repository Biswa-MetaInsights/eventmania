// Organiser console — Earnings.
//
// ⚠️ THE HEADLINE FIGURE IS "SETTLED TO YOU", NOT A BALANCE. Attendees pay the
// organiser directly at checkout — the platform never holds the money, so there
// is nothing here to withdraw. The explaining paragraph under the figure, and
// the ink panel it sat on, were removed on 2026-09-11 (Gautham): the four
// figures are now four identical `StatTile`s, and "where does my money land" is
// answered once, in the Payments card at the foot of the page. Do not put the
// paragraph or the dark panel back.
//
// ⚠️ THE 2% IS THE BUYER'S, NOT A DEDUCTION FROM THE ORGANISER. The imported
// design showed `net = gross - fee - refunds`, i.e. the organiser paying the
// platform. That is the model TODO.md §13 explicitly says NOT to build: Gautham
// amended the pricing on 2026-08-19 so the convenience fee is added on top of
// the ticket price at checkout and the organiser is made whole — and the home
// page's pricing card already promises that to users. So `net = gross -
// refunds`, and the fee column is kept but relabelled "Buyer fee", informational
// only. Do not "restore" it to a subtraction.
//
// ⚠️ THE RATE ITSELF IS PRINTED IN THE TABLE ONLY (Gautham, 2026-09-11). The
// column head still reads "Buyer fee 2%", because that is where the figure it
// describes is; the tiles above say who pays it, not what it is. Do not put
// `feePct` back into a tile label or sub-line.
//
// Every row shows gross → buyer fee → refunds → net, so the arithmetic is
// visible rather than asserted. The totals row adds the columns actually
// rendered; it is not a separate stored figure that could drift from them.
//
// ⚠️ `?event=<id>` PRESELECTS ONE EVENT — how `/event/[id]`'s organiser card
// links here ("Manage revenue"), the mirror of the Attendees page. A settlement
// row's `id` IS the event id (see `dummyEarnings`), so no lookup table is
// needed. The control writes back to the URL with `router.replace`, not `push`,
// so the back button leaves the page rather than replaying every filter tried.
//
// ⚠️ THE TOTALS ROW SUMS WHAT IS ON SCREEN, so filtering to one event makes the
// totals that event's own. That is the intended reading and the reason the
// arithmetic is rendered rather than stored — but it does mean the headline
// figure is NOT the portfolio total while a filter is applied, which is why the
// hero says which it is showing.
//
// ⚠️ THE PAYMENT TERMS AT THE FOOT OF THIS PAGE ARE THE WHOLE OF THE FORMER
// SETTINGS SECTION. The console's Settings section was deleted on 2026-09-01
// (Gautham) — profile, event defaults and team went with it, and its four
// payment rows moved here, because "where does my money land" is a question
// asked while looking at what you earned. They are READ-ONLY and NOT filtered:
// they describe the account, not the rows above them, so they render under a
// per-event filter unchanged. Nothing saves — TODO.md §19.5.

"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerSource } from "@/lib/data-source";
import { CONVENIENCE_FEE_RATE, type DummyPaymentTerm } from "@/lib/fixtures/organizer";
import { formatPrice } from "@/lib/currency";
import {
  Card, StatTile, FilterButton, FilterSelect, ConsoleButton,
  EmptyState, NotBuiltYet,
  TableScroller, TableHead, TableRow,
} from "@/components/organizer/ConsoleUI";
import { DownloadIcon } from "@/components/organizer/ConsoleIcons";
import { useOrganiser, useOrganiserEvents } from "@/components/organizer/useOrganiser";

const TEMPLATE = "2fr 1fr 1fr 1fr 1fr 1fr";
const feePct = `${Math.round(CONVENIENCE_FEE_RATE * 100)}%`;

/** The "no event filter" value — see the note on the Attendees page's `ALL`. */
const ALL = "all";

export default function ConsoleEarningsPage() {
  // `useSearchParams` needs a Suspense boundary — the pattern /explore,
  // /dashboard and /chat/[roomId] already use.
  return (
    <Suspense>
      <EarningsInner />
    </Suspense>
  );
}

function EarningsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const picked = params.get("event") ?? ALL;

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ["organizer-earnings"],
    queryFn: () => organizerSource.earnings().then((r) => r.data),
  });

  // Unfiltered on purpose — see the header note. Empty in real mode, where the
  // card does not render at all rather than printing an invented account.
  const { data: paymentTerms = [] } = useQuery({
    queryKey: ["organizer-payment-terms"],
    queryFn: () => organizerSource.paymentTerms().then((r) => r.data),
  });

  // Only for naming an event the URL points at that has no settlement row yet —
  // the same shared query key the console's rail and Events table use, so it
  // costs no extra fetch.
  const { organiserId } = useOrganiser();
  const { data: events = [] } = useOrganiserEvents(organiserId);

  const options = useMemo(() => {
    const opts = [
      { value: ALL, label: "All events" },
      ...allRows.map((r) => ({ value: String(r.id), label: r.title })),
    ];
    // ⚠️ Keep the current selection as an option even when it has no row, or
    // the trigger reads "All events" while the page below talks about one — the
    // filter and the content disagreeing, which is worse than either state.
    if (picked !== ALL && !opts.some((o) => o.value === picked)) {
      const title = events.find((e) => String(e.id) === picked)?.title ?? "this event";
      opts.push({ value: picked, label: title });
    }
    return opts;
  }, [allRows, events, picked]);

  const rows = useMemo(
    () => (picked === ALL ? allRows : allRows.filter((r) => String(r.id) === picked)),
    [allRows, picked],
  );

  /** The event named by the URL has no settlement row at all. Loading is not
   *  that state — an empty list mid-fetch would flash the empty page. */
  const pickedIsMissing = !isLoading && picked !== ALL && rows.length === 0;
  const filtered = picked !== ALL;

  function selectEvent(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === ALL) next.delete("event");
    else next.set("event", value);
    const qs = next.toString();
    router.replace(qs ? `/organizer/earnings?${qs}` : "/organizer/earnings", { scroll: false });
  }

  /**
   * The currency every figure on this page is printed in.
   *
   * ⚠️ Read off the ROWS, never hardcoded — the rule in lib/currency.ts, and a
   * literal "INR" here was labelling whatever the organiser priced in as rupees.
   * The totals row adds the columns up, so it can only be honest if the rows
   * agree; the fixtures assert that (`assertOneCurrency`), and a real
   * multi-currency organiser needs the totals split per currency before this
   * page can serve them — TODO.md §19.
   */
  const currency = rows[0]?.currency;
  const money = (n: number) => (n === 0 ? "—" : formatPrice(n, currency, { freeLabel: null }));

  // Summed from the rows on screen, never stored separately — see the header.
  const total = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          tickets: acc.tickets + r.tickets,
          gross: acc.gross + r.gross,
          buyerFee: acc.buyerFee + r.buyerFee,
          refunds: acc.refunds + r.refunds,
          net: acc.net + r.net,
        }),
        { tickets: 0, gross: 0, buyerFee: 0, refunds: 0, net: 0 },
      ),
    [rows],
  );

  const paidTickets = rows.filter((r) => r.gross > 0).reduce((n, r) => n + r.tickets, 0);
  const avgTicket = paidTickets ? Math.round(total.gross / paidTickets) : 0;
  const refundedRows = rows.filter((r) => r.refunds > 0).length;

  // ⚠️ Tested against the UNFILTERED list, for the reason the Attendees page
  // records: "no endpoint" and "no rows matched" are different statements and
  // must not print the same page.
  if (!isLoading && allRows.length === 0) {
    return <NotBuiltYet what="Earnings" todo="TODO.md §19" />;
  }

  if (pickedIsMissing) {
    return (
      <div className="flex flex-col gap-4">
        <FilterSelect label="Event" value={picked} options={options} onChange={selectEvent} defaultValue={ALL} />
        <EmptyState
          title="This event has not settled anything yet"
          body="An event gets a row here once it has sold a ticket. A draft never does — it was never on sale."
        />
        <PaymentTerms rows={paymentTerms} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {/* ⚠️ The label NAMES WHAT IS BEING SUMMED. The totals add the rows on
            screen, so under a filter this figure is one event's settlement, not
            the portfolio's — and an unqualified "Settled to you" over a filtered
            number is the kind of plausible-but-wrong figure TODO.md §19.9 warns
            about. */}
        <StatTile
          label={filtered ? `Settled to you · ${rows[0]?.title ?? "this event"}` : "Settled to you"}
          value={money(total.net)}
          sub="sales minus refunds"
        />

        <StatTile
          label="Buyer fee collected"
          value={money(total.buyerFee)}
          sub="paid by attendees, on top"
        />
        <StatTile
          label="Refunds issued"
          value={money(total.refunds)}
          sub={refundedRows > 0 ? `across ${refundedRows} event${refundedRows === 1 ? "" : "s"}` : "none issued"}
          tone={total.refunds > 0 ? "warn" : "good"}
        />
        <StatTile label="Avg. ticket" value={money(avgTicket)} sub="across paid events" />
      </div>

      <Card padded={false}>
        <div
          className="flex items-center justify-between gap-4 flex-wrap px-5 py-4"
          style={{ borderBottom: "1px solid var(--brand-border)" }}
        >
          <h2 className="text-[20px] font-bold" style={{ color: "var(--brand-text)" }}>Per event</h2>
          <div className="flex gap-2 flex-wrap">
            {/* The rows are already in memory, so this one WORKS — the rule in
                ConsoleUI's FilterSelect note. The date range still waits on a
                backend and stays inert. */}
            <FilterSelect
              label="Event"
              value={picked}
              options={options}
              onChange={selectEvent}
              defaultValue={ALL}
            />
            <FilterButton>This financial year</FilterButton>
            <ConsoleButton tone="outline">
              <DownloadIcon className="w-5 h-5" /> Download statement
            </ConsoleButton>
          </div>
        </div>

        <TableScroller minWidth={980}>
          <TableHead
            template={TEMPLATE}
            columns={[
              "Event", "Tickets", "Ticket sales", `Buyer fee ${feePct}`, "Refunds",
              <span key="n" className="text-right block">Net to you</span>,
            ]}
          />
          {rows.map((r) => (
            <TableRow key={r.id} template={TEMPLATE}>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[18px] font-bold" style={{ color: "var(--brand-text)" }}>{r.title}</span>
                <span className="text-[15px]" style={{ color: "var(--brand-hint)", opacity: 0.8 }}>
                  {r.when}
                </span>
              </div>
              <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{r.tickets}</div>
              <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{money(r.gross)}</div>
              {/* Not deducted below — the buyer paid it. See the header note. */}
              <div className="text-[17px]" style={{ color: "var(--brand-hint)", opacity: 0.75 }}>{money(r.buyerFee)}</div>
              <div
                className="text-[17px]"
                style={{ color: r.refunds > 0 ? "var(--brand-terracotta)" : "var(--brand-hint)", opacity: r.refunds > 0 ? 1 : 0.6 }}
              >
                {money(r.refunds)}
              </div>
              <div className="text-[18px] font-bold text-right" style={{ color: "var(--brand-text)" }}>
                {money(r.net)}
              </div>
            </TableRow>
          ))}

          <div
            className="grid gap-3.5 px-5 py-4 text-[17px] font-bold"
            style={{
              gridTemplateColumns: TEMPLATE,
              backgroundColor: "color-mix(in srgb, var(--brand-nav-border) 25%, transparent)",
              color: "var(--brand-text)",
            }}
          >
            <div>Total</div>
            <div>{total.tickets}</div>
            <div>{money(total.gross)}</div>
            <div style={{ opacity: 0.75 }}>{money(total.buyerFee)}</div>
            <div>{money(total.refunds)}</div>
            <div className="text-right">{money(total.net)}</div>
          </div>
        </TableScroller>
      </Card>

      <PaymentTerms rows={paymentTerms} />
    </div>
  );
}

/**
 * The payment terms — the console's whole surviving Settings section.
 *
 * Rows sit in a two-column grid rather than one full-width list: a label pinned
 * left and its value pinned right across 1200px is two facts with a corridor
 * between them, which is the layout the half-width settings cards never had.
 *
 * ⚠️ **Read-only, and no input.** There is no organiser preferences endpoint
 * (TODO.md §19.5), and the refund window and approver are not settled policy
 * (TODO.md §21) — a control here would promise a save that cannot happen and a
 * rule that has not been decided. The one thing an organiser CAN edit today is
 * their company details, so that is the only link.
 */
function PaymentTerms({ rows }: { rows: DummyPaymentTerm[] }) {
  if (rows.length === 0) return null;

  return (
    <Card>
      <h2 className="text-[20px] font-bold" style={{ color: "var(--brand-text)" }}>Payments</h2>
      <p className="text-[17px] mt-1 leading-relaxed" style={{ color: "var(--brand-hint)", textWrap: "pretty" }}>
        Where the money lands and the terms attached to it. Attendees pay you directly at
        checkout — NewFind never holds it.
      </p>

      <dl className="mt-3 grid sm:grid-cols-2 gap-x-10">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-4 py-2.5"
            style={{ borderTop: "1px solid var(--brand-border)" }}
          >
            <dt className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{r.label}</dt>
            <dd
              className="text-[17px] font-semibold text-right"
              style={{ color: r.good ? "var(--brand-green)" : "var(--brand-text)" }}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-[17px] mt-3.5" style={{ color: "var(--brand-hint)", textWrap: "pretty" }}>
        These are read-only for now — changing them needs the organiser preferences endpoint. Your
        company details are editable today on the{" "}
        <Link href="/organizer/onboarding" className="font-semibold underline" style={{ color: "var(--brand-green)" }}>
          organiser profile
        </Link>{" "}
        form.
      </p>
    </Card>
  );
}
