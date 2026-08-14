"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { reviewsApi } from "@eventmind/api";
import { eventsSource } from "@/lib/data-source";
import type { Review, ReviewAggregates } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { EventChatWidget } from "@/components/EventChatWidget";
import { EventBackButton, EventShareButton, EventWishlistButton } from "@/components/EventActions";
import { CategoryBadge, EventBadges } from "@/components/EventBadges";
import { CalendarIcon, ClockIcon, LocationPinIcon } from "@/components/EventIcons";
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
  DetailStickyBar,
} from "@/components/DetailCard";
import { ReviewsSection } from "@/components/Reviews";
import { SimilarEvents } from "@/components/SimilarEvents";
import { toCarouselEvent } from "@/lib/card-adapters";
import { eventImageUrl } from "@/lib/event-media";
import { heroTitleSize } from "@/lib/hero-title";
import { GUTTERS } from "@/lib/layout";
import { formatPrice } from "@/lib/currency";

const GREEN = "var(--brand-green)";

const HERO_SCRIM =
  "linear-gradient(to top, rgba(8,17,15,0.94) 0%, rgba(8,17,15,0.75) 32%, rgba(8,17,15,0.42) 62%, rgba(8,17,15,0.22) 100%)";

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", opts);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsSource.get(id).then((r) => r.data),
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["reviews", id],
    queryFn: () => reviewsApi.forEvent(id).then((r) => r.data),
    retry: false,
  });

  const { data: aggregates } = useQuery<ReviewAggregates>({
    queryKey: ["review-aggregates", id],
    queryFn: () => reviewsApi.aggregates(id).then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--brand-bg)" }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: `${GREEN} transparent transparent transparent` }}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--brand-bg)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg font-medium text-[var(--brand-hint)]">Event not found.</p>
        </div>
      </div>
    );
  }

  const isFree = event.price === 0;
  const category = event.category ?? "General";
  // The shared card controls speak CarouselEvent, so a wishlist save from here is
  // byte-identical to one from a card and renders the same in /dashboard.
  const card = toCarouselEvent(event);
  const location =
    (event.location?.address as string) ??
    (event.location?.city as string) ??
    "Online Event";

  function handleBookNow() {
    router.push(isAuthenticated ? `/checkout/${id}` : "/auth");
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-left">
      <Navbar />

      {/* ── Hero: full-bleed photo + title overlay ── */}
      <section className="relative flex flex-col justify-end overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eventImageUrl(event, 1920, 1080)}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: HERO_SCRIM }} />

        {/* Top row: back / wishlist + share */}
        <div className={`absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 py-6 ${GUTTERS}`}>
          {/* All three labels drop BELOW their button here. A side label would
              either collide with the neighbouring control or run past the 48px
              gutter into the hero's overflow-hidden edge; dropping it keeps the
              three buttons pinned no matter which one is hovered. */}
          <EventBackButton onClick={() => router.back()} labelSide="bottom" size="lg" />
          {/* Same controls as the event cards, one size up so they hold their own
              against a full-bleed photo. */}
          <div className="flex items-center gap-2.5 shrink-0">
            <EventWishlistButton item={card} labelSide="bottom" size="lg" />
            <EventShareButton item={card} labelSide="bottom" size="lg" />
          </div>
        </div>

        {/* Title block */}
        <div className={`relative z-10 pb-12 pt-6 ${GUTTERS}`}>
          {/* One line, centred, on lg+. overflow-hidden is the last-resort guard:
              a title long enough to defeat heroTitleSize() clips instead of
              wrapping or pushing the page into a horizontal scroll. BELOW lg the
              `hero-title` class (globals.css) lets it wrap to 3 lines instead —
              shrink-to-one-line hits the 20px floor on a phone and truncates the
              title away. */}
          <h1
            className="hero-title font-extrabold text-white leading-[1.05] text-center whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: heroTitleSize(event.title) }}
          >
            {event.title}
          </h1>
          {/* Category then every status tag that applies, centred under the
              title. Tags come from EventBadges so they match the cards exactly.
              gap-1.5 matches EventBadges' own internal gap, so the space between
              the category chip and the first status tag is identical to the space
              between two status tags — change both together or they drift. */}
          {/* items-end (not -center) so the category chip shares the BOTTOM line
              when three tags split the block into two rows. */}
          <div className="mt-6 flex flex-wrap items-end justify-center gap-1.5">
            <CategoryBadge category={category} />
            <EventBadges types={card.badgeTypes} align="center" />
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <div className={`py-10 ${GUTTERS}`} style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Two-column grid on lg+, stacked below it. */}
        {/* 2.4fr (not 2fr) pulls the booking card's left edge further right; its
            right edge stays on the gutter line shared with the navbar + sticky bar.
            Stacked, the booking card comes FIRST (order-1/order-2 below) so price,
            date and Book Now are visible without scrolling past the description. */}
        <div className="grid grid-cols-1 lg:grid-cols-[2.4fr_1fr] gap-10 lg:gap-16 items-start">

          {/* ── Left column ── */}
          <div className="order-2 lg:order-1" style={{ textAlign: "left" }}>
            <h2 className="text-[22px] font-bold text-[var(--brand-text)] mb-4">
              About this event
            </h2>
            <p className="text-[18px] leading-relaxed text-[var(--brand-hint)]">
              {event.description ?? "No description provided."}
            </p>

            <div className="my-12 h-px bg-[var(--brand-border)]" />

            {/* Reviews — same block the community page renders. */}
            <ReviewsSection
              reviews={reviews}
              average={aggregates ? Number(aggregates.average_rating) : undefined}
              count={aggregates?.review_count}
              emptyText="No reviews yet. Be the first to attend and share your experience!"
            />
          </div>

          {/* ── Right sidebar: booking card ── */}
          <div className="order-1 lg:order-2">
            <BookingCard
              dateLabel={fmt(event.start_date, { weekday: "long", month: "short", day: "numeric" })}
              timeLabel={fmtTime(event.start_date)}
              location={location}
              organizer="EventMind Collective"
              price={event.price}
              currency={event.currency}
              isFree={isFree}
              going={event.tickets_sold}
              left={Math.max(0, event.capacity - event.tickets_sold)}
              onBook={handleBookNow}
            />
          </div>
        </div>

      </div>

      {/* ── Similar events ── */}
      {/* Deliberately OUTSIDE the maxWidth:1400 column above: it is full-bleed,
          carrying the home page's own `px-4 sm:px-6 lg:px-12` gutters, so its
          cards render at exactly the home grid's size and a full row of four
          fits without scrolling. Inside the capped column four cards could only
          fit by shrinking to ~311px — narrower than home at every width. The
          trade is that above 1400px its edges sit outside the column above it;
          the full-width divider it carries is what makes that read as a
          deliberate section break rather than a misalignment. It carries its own
          top divider and renders NOTHING when there is nothing to suggest, so an
          empty rail leaves no orphaned rule behind. */}
      <SimilarEvents event={event} />

      {/* ── AI Event Assistant widget ── */}
      <EventChatWidget event={event} />

      {/* ── Sticky booking bar ── */}
      <DetailStickyBar
        caption="Starting from"
        amount={formatPrice(event.price, event.currency)}
        cta="Book Now"
        onClick={handleBookNow}
        gutters={GUTTERS}
      />

      <div className="h-24" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * The right-column card. Chrome comes from `components/DetailCard.tsx`, which
 * /community/[slug] renders too — so the two detail pages cannot drift. Only the
 * copy and the data are this page's own.
 */
function BookingCard({
  dateLabel,
  timeLabel,
  location,
  organizer,
  price,
  currency,
  isFree,
  going,
  left,
  onBook,
}: {
  dateLabel: string;
  timeLabel: string;
  location: string;
  organizer: string;
  price: number;
  currency?: string;
  isFree: boolean;
  going: number;
  left: number;
  onBook: () => void;
}) {
  const soldOut = left <= 0;
  return (
    <DetailCardShell>
      {/* ⚠️ The organiser name and the trust line are BOTH hardcoded at the call
          site — there is no organiser lookup on this page. Logged as TODO.md §1;
          "Verified" cannot ship to real users as-is. */}
      <DetailCardHeader
        eyebrow="Organised by"
        name={organizer}
        subline="Verified · 40+ events"
        verified
      />

      <DetailCardBody>
        {/* Date + time row wraps rather than truncating: in the stacked mobile
            layout the card is the full column, but a long weekday date plus a
            time is still more than a 375px phone holds. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <DetailLine icon={<CalendarIcon color={GREEN} className={DETAIL_ICON} />} text={dateLabel} />
          <DetailLine icon={<ClockIcon color={GREEN} className={DETAIL_ICON} />} text={timeLabel} />
        </div>
        <div className="mt-5">
          <DetailLine icon={<LocationPinIcon color={GREEN} className={DETAIL_ICON} />} text={location} />
        </div>

        {/* Social proof + scarcity. */}
        <div className="flex items-center justify-between gap-3 mt-7">
          <DetailPeopleChip count={going} label="going" />
          {!soldOut && <DetailAccentChip text={`${left} spots left`} />}
        </div>

        <DetailDivider />

        <DetailPriceRow
          label="Starting from"
          amount={formatPrice(price, currency)}
          suffix={isFree ? undefined : "/ ticket"}
        />

        <DetailCTA
          label={soldOut ? "Sold Out" : "Book Now"}
          onClick={onBook}
          disabled={soldOut}
        />
      </DetailCardBody>
    </DetailCardShell>
  );
}
