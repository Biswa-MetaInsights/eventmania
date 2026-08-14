"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The sidebar card on /community/[slug] — the counterpart to the event page's
//  BookingCard. Same chrome (DetailCard.tsx), community copy:
//
//    who's organising  →  green header
//    the next event    →  date / time / location lines
//    membership        →  member count, event count, price
//    "Join this community"
//
//  ⚠️ Join does nothing yet — there is no membership table, no join endpoint and
//  no notification hook. See TODO.md "Join a community".
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import { organizerApi } from "@eventmind/api";
import type { Community, Event } from "@eventmind/types";
import {
  DETAIL_ICON,
  DetailAccentChip,
  DetailCTA,
  DetailCardBody,
  DetailCardHeader,
  DetailCardShell,
  DetailDivider,
  DetailLine,
  DetailPeopleChip,
  DetailPriceRow,
} from "./DetailCard";
import { CalendarIcon, ClockIcon, LocationPinIcon } from "./EventIcons";
import { formatPrice } from "@/lib/currency";
import { BRAND } from "@/lib/theme";

const GREEN = BRAND.green;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function placeOf(loc: Record<string, unknown> | undefined): string | undefined {
  const pick = (k: string) => {
    const v = loc?.[k];
    return typeof v === "string" && v.trim().length > 0 ? v : undefined;
  };
  return pick("name") ?? pick("address") ?? pick("city");
}

export function CommunityJoinCard({
  community,
  nextEvent,
  eventCount,
  onJoin,
}: {
  community: Community;
  /** The community's soonest upcoming event, if it has one. */
  nextEvent?: Event;
  /** Total events linked to this community, upcoming and past. */
  eventCount: number;
  onJoin: () => void;
}) {
  // A real lookup, unlike the event page's hardcoded organiser (TODO.md §1).
  // Communities seeded without an organiser profile simply return nothing, and
  // the card falls back to the community's own name below.
  const { data: organizer } = useQuery({
    queryKey: ["organizer", community.organizer_id],
    queryFn: () => organizerApi.get(community.organizer_id).then((r) => r.data),
    enabled: !!community.organizer_id,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // A community with no organiser profile IS the organising entity, so its own
  // name is a true answer to "who's organising" — never a placeholder string.
  const organiserName = organizer?.company_name || organizer?.full_name || community.name;
  // "Verified" is a trust claim. It draws ONLY from a real verification status.
  const verified = organizer?.verification_status === "verified";

  // Prefer the real next event; fall back to the community's own next_event_date
  // column, which is all the community cards have.
  const nextIso = nextEvent?.start_date ?? community.next_event_date;
  const nextPlace =
    placeOf(nextEvent?.location as Record<string, unknown> | undefined) ??
    placeOf(community.location as Record<string, unknown> | undefined) ??
    "Location to be announced";

  const price = Number(community.price);
  const isFree = !Number.isFinite(price) || price === 0;

  return (
    <DetailCardShell>
      <DetailCardHeader
        eyebrow="Organised by"
        name={organiserName}
        subline={`${community.member_count.toLocaleString()} member${community.member_count === 1 ? "" : "s"}`}
        verified={verified}
      />

      <DetailCardBody>
        <p className="text-[13px] font-bold tracking-[0.08em] mb-4 text-[var(--brand-hint)]">
          Next event
        </p>

        {nextIso ? (
          <>
            {/* Date + time wrap rather than truncating: stacked on mobile this
                card is the full column, but a long weekday date plus a time is
                still more than a 375px phone holds. */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
              <DetailLine
                icon={<CalendarIcon color={GREEN} className={DETAIL_ICON} />}
                text={fmtDate(nextIso)}
              />
              <DetailLine
                icon={<ClockIcon color={GREEN} className={DETAIL_ICON} />}
                text={fmtTime(nextIso)}
              />
            </div>
            <div className="mt-5">
              <DetailLine
                icon={<LocationPinIcon color={GREEN} className={DETAIL_ICON} />}
                text={nextPlace}
              />
            </div>
          </>
        ) : (
          <DetailLine
            icon={<CalendarIcon color={GREEN} className={DETAIL_ICON} />}
            text="No upcoming events scheduled"
          />
        )}

        <div className="flex items-center justify-between gap-3 mt-7">
          <DetailPeopleChip
            count={community.member_count.toLocaleString()}
            label={community.member_count === 1 ? "member" : "members"}
          />
          {eventCount > 0 && (
            <DetailAccentChip text={`${eventCount} event${eventCount === 1 ? "" : "s"}`} />
          )}
        </div>

        <DetailDivider />

        <DetailPriceRow
          label="Membership"
          amount={isFree ? "Free" : formatPrice(price)}
          suffix={isFree ? undefined : "/ month"}
        />

        <DetailCTA label="Join this community" onClick={onJoin} />
      </DetailCardBody>
    </DetailCardShell>
  );
}