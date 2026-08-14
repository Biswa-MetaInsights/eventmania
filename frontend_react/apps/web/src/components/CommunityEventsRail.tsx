"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Events in this community" — the full-bleed rail on /community/[slug] that
//  takes the place of "Similar events" on /event/[id].
//
//  One rail, two tabs: Upcoming and Previous. The events are fetched ONCE by the
//  page (it needs the next upcoming one for the sidebar card anyway) and split
//  there, so this component only picks which list to show.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toCarouselEvent } from "@/lib/card-adapters";
import { EventCardItem, SkeletonCard } from "./EventsCarousel";
import { Rail, RailToggle, RAIL_ITEM, RAIL_CARD_BASIS } from "./Rail";
import type { Event } from "@eventmind/types";

type Tab = "upcoming" | "previous";

const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "previous", label: "Previous" },
];

export function CommunityEventsRail({
  upcoming,
  previous,
  isLoading,
}: {
  upcoming: Event[];
  previous: Event[];
  isLoading: boolean;
}) {
  const router = useRouter();
  // `null` means "the user hasn't picked yet", so the default below is DERIVED
  // rather than synced in with an effect. A community whose events have all
  // already happened would otherwise open on an empty Upcoming tab and look
  // broken; it lands on Previous instead. Once the user clicks, their choice
  // wins — even if the tab they picked is the empty one.
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (upcoming.length === 0 && previous.length > 0 ? "previous" : "upcoming");

  const events = tab === "upcoming" ? upcoming : previous;

  // Nothing at all in either list — render nothing, divider included, so the
  // page doesn't carry an orphaned rule.
  if (!isLoading && upcoming.length === 0 && previous.length === 0) return null;

  return (
    <Rail
      title="Events in this community"
      itemCount={events.length}
      headerExtra={
        <RailToggle options={TABS} value={tab} onChange={setPicked} />
      }
    >
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={RAIL_CARD_BASIS}>
            <SkeletonCard />
          </div>
        ))
      ) : events.length === 0 ? (
        // The other tab has cards, so the section stays — say why this one is
        // empty rather than collapsing the rail out from under the toggle.
        <p className="text-[16px] py-8 text-[var(--brand-hint)]">
          {tab === "upcoming"
            ? "No upcoming events scheduled yet."
            : "This community hasn't run any events yet."}
        </p>
      ) : (
        events.map((e) => (
          <div key={e.id} className={RAIL_ITEM}>
            <EventCardItem
              event={toCarouselEvent(e)}
              onBookNow={(id) => router.push(`/event/${id}`)}
            />
          </div>
        ))
      )}
    </Rail>
  );
}