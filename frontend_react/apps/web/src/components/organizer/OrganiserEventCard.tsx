"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The right-column card an organiser sees INSTEAD OF the booking card on their
//  own /event/[id] (Gautham, 2026-08-24).
//
//  ⚠️ INSTEAD OF, NOT ALONGSIDE. An organiser has no use for a Book Now button
//  on their own event — they cannot buy a ticket to it, and a disabled one would
//  say nothing. The slot the CTA occupied is where "Manage attendees" and
//  "Manage revenue" go, which is the whole point of the card in this view.
//
//  ⚠️ CHROME COMES FROM `components/DetailCard.tsx`, the same primitives the
//  participant's `BookingCard` and `CommunityJoinCard` are built from. Only the
//  copy and the figures are this file's own. **Do not hand-roll a third card** —
//  and do not reach for `ConsoleUI`'s `Card` either, which would put a console
//  surface in a public page's sidebar and make the two views look like two
//  products.
//
//  ⚠️ THE TWO LINKS GO TO THE CONSOLE SCOPED TO THIS EVENT
//  (`/organizer/attendees?event=<id>`), not to the unfiltered section. An
//  organiser arriving from one event's page and landing on every event's
//  attendees has to re-find their way; both pages read that param and preselect
//  the filter.
//
//  ⚠️ REVENUE IS AN EM DASH FOR A DRAFT, NEVER `0` — the rule `lib/organizer-rows.ts`
//  states and this card must not contradict: an event that was never on sale did
//  not earn nothing, it could not have earned anything. A published event that
//  has genuinely sold nothing does show its zero; that figure is real.
// ─────────────────────────────────────────────────────────────────────────────

import type { Event } from "@eventmind/types";
import {
  DetailCTA,
  DetailCardBody,
  DetailCardHeader,
  DetailCardShell,
  DetailDivider,
} from "@/components/DetailCard";
import { lifecycleOf } from "@/components/organizer/EventStatus";
import { formatPrice } from "@/lib/currency";

/** Where each console section is reached from an event page. One definition. */
export const manageAttendeesHref = (eventId: string) =>
  `/organizer/attendees?event=${encodeURIComponent(eventId)}`;
export const manageRevenueHref = (eventId: string) =>
  `/organizer/earnings?event=${encodeURIComponent(eventId)}`;

export function OrganiserEventCard({
  event,
  organiserName,
}: {
  event: Event;
  organiserName: string;
}) {
  const id = String(event.id);
  const state = lifecycleOf(event);
  const sold = event.tickets_sold ?? 0;
  const capacity = event.capacity ?? 0;
  const left = Math.max(0, capacity - sold);
  // ⚠️ Over-sold is possible now that capacity is editable downwards with no
  // floor (Gautham, 2026-08-24). Say so rather than clamping it away — a
  // silent `0 left` would hide the fact that more tickets exist than seats.
  const overSold = sold > capacity;
  const pct = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;

  // Gross, the same arithmetic `toConsoleRow` uses, so this card and the
  // console's Revenue column cannot disagree about one event.
  const gross = sold * (event.price ?? 0);
  const revenue = state === "draft" ? "—" : formatPrice(gross, event.currency, { freeLabel: null });

  return (
    <DetailCardShell>
      {/* ⚠️ THE SAME HEADER THE PARTICIPANT'S `BookingCard` SHOWS — same eyebrow,
          same name, same trust line (Gautham, 2026-09-01). The organiser block is
          the one part of the card that must NOT change when the view toggles;
          only the body below it is this file's own. Both names come from one
          `ORGANISER_NAME` in `app/event/[id]/page.tsx`, which is what keeps the
          two in step — change the eyebrow or the subline in one card and change
          it in the other.

          ⚠️ `verified` is still a claim nothing backs: there is no real
          `verification_status` on this page, and "40+ events" is a literal.
          Logged as TODO.md §1 for BOTH cards now, not just the booking one. */}
      <DetailCardHeader
        eyebrow="Organised by"
        name={organiserName}
        subline="Verified · 40+ events"
        verified
      />

      <DetailCardBody>
        <Row label="Tickets sold" value={capacity > 0 ? `${sold} of ${capacity}` : String(sold)} />

        {capacity > 0 && (
          <div className="mt-3">
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "color-mix(in srgb, var(--brand-green) 12%, transparent)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: overSold ? "var(--brand-terracotta)" : "var(--brand-green)",
                }}
              />
            </div>
            <p className="text-[15px] mt-2 text-[var(--brand-hint)]">
              {overSold
                ? `${sold - capacity} more sold than the ${capacity} places allowed.`
                : left === 0
                  ? "Full — no places left."
                  : `${left} ${left === 1 ? "place" : "places"} still available.`}
            </p>
          </div>
        )}

        <DetailDivider />

        <Row
          label="Ticket price"
          value={formatPrice(event.price, event.currency)}
          // The organiser's own name for the current price, if they set one.
          note={event.offer_name}
        />
        <div className="mt-4">
          <Row label="Revenue so far" value={revenue} note={state === "draft" ? "never on sale" : undefined} />
        </div>

        {/* ⚠️ BOTH are `outline` (Gautham, 2026-08-31) — neither is the primary.
            An organiser reading their own event is as likely to want one as the
            other, and a green fill on "Manage attendees" claimed a precedence
            that isn't real. Do not "restore" this one to solid. */}
        <DetailCTA label="Manage attendees" href={manageAttendeesHref(id)} variant="outline" />
        <DetailCTA label="Manage revenue" href={manageRevenueHref(id)} variant="outline" />
      </DetailCardBody>
    </DetailCardShell>
  );
}

/** Label left, figure right — the card's own row, not a console `StatTile`. */
function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[16px] font-semibold text-[var(--brand-hint)]">{label}</p>
      <div className="text-right min-w-0">
        <p className="text-[20px] font-bold text-[var(--brand-text)]">{value}</p>
        {note && <p className="text-[15px] text-[var(--brand-hint)] truncate">{note}</p>}
      </div>
    </div>
  );
}
