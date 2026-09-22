"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { reviewsApi } from "@eventmind/api";
import { eventsSource } from "@/lib/data-source";
import type { Review, ReviewAggregates } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { EventChatWidget } from "@/components/EventChatWidget";
import {
  EventBackButton,
  EventCancelButton,
  EventDuplicateButton,
  EventEditButton,
  EventShareButton,
  EventWishlistButton,
} from "@/components/EventActions";
import { useIsEventOwner } from "@/components/organizer/useOrganiser";
import { OrganiserViewToggle, type EventViewMode } from "@/components/organizer/OrganiserViewToggle";
import { EventStatusChip, lifecycleOf } from "@/components/organizer/EventStatus";
import {
  OrganiserEventCard,
  manageAttendeesHref,
} from "@/components/organizer/OrganiserEventCard";
import { EditEventModal } from "@/components/organizer/EditEventModal";
import { CancelEventModal } from "@/components/organizer/CancelEventModal";
import { DuplicateEventModal } from "@/components/organizer/DuplicateEventModal";
import { PublishEventModal } from "@/components/organizer/PublishEventModal";
import { EditListModal, type ListKind } from "@/components/organizer/EditListModal";
import { blankRow, type Row } from "@/components/organizer/ListEditor";
import {
  AgendaSection,
  AnnouncementsSection,
  FaqSection,
  SectionDivider,
  showsSection,
} from "@/components/EventSections";
import { EditPencil } from "@/components/EditPencil";
import { EXTRAS_ARE_LOCAL } from "@/lib/data-source";
import { EXTRAS_HINT, agendaOf, announcementsOf, faqOf } from "@/lib/event-extras";
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
import { eventImageUrl, HERO_SCRIM } from "@/lib/event-media";
import { heroTitleSize } from "@/lib/hero-title";
import { GUTTERS } from "@/lib/layout";
import { formatPrice } from "@/lib/currency";

const GREEN = "var(--brand-green)";

/**
 * ⚠️ PLACEHOLDER, and it feeds BOTH sidebar cards (Gautham, 2026-09-01).
 *
 * The organiser block reads identically in the participant and organiser views —
 * same eyebrow, same name, same trust line — so toggling the preview never
 * changes it. That is only possible while ONE string answers for both, which is
 * why it lives here rather than at either call site.
 *
 * It is a FALLBACK as of 2026-09-11, not the only answer: `/organizer/create`
 * now asks for the organisation's name and an event that carries one prints it
 * instead (`organiserNameOf` below). This still shows for every event written
 * before that field existed, and for every real-mode event until the column
 * lands — there is no organiser lookup on this page either way.
 *
 * ⚠️ It is the ORGANISATION's name that belongs here (Gautham, 2026-09-01), not
 * the signed-in person's, and "Verified · 40+ events" in `BookingCard` /
 * `OrganiserEventCard` has to become real at the same time. Logged as TODO.md §1.
 */
const ORGANISER_NAME = "NewFind Collective";

/** The organisation to print under "Organised by". Blank and whitespace-only
 *  both fall through to the placeholder — an empty heading is worse than a
 *  stand-in. */
function organiserNameOf(event: { organization_name?: string }): string {
  return event.organization_name?.trim() || ORGANISER_NAME;
}

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

  // ── Organiser view ─────────────────────────────────────────────────────────
  // ⚠️ An organiser opening their OWN event lands in the ORGANISER view
  // (Gautham, 2026-08-21) and previews the participant's deliberately. The mode
  // is local state, so it resets to organiser on every visit — that is the
  // intent, not a missing persistence layer.
  // `useIsEventOwner` redirects nobody — a signed-out visitor just gets false.
  const isOwner = useIsEventOwner(event);
  const [viewMode, setViewMode] = useState<EventViewMode>("organiser");
  // ⚠️ NOT a boolean — the edit dialog has two doors and they open it at
  // different places. `null` is closed; the value says where the caret lands.
  // "top" is the hero's round control (no autofocus, the original behaviour);
  // "description" is the pencil beside the About heading, which has already
  // named the paragraph the organiser means. See `EditEventModal.focusField`.
  const [editing, setEditing] = useState<"top" | "description" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // ONE piece of state for the three list editors — they are one component
  // (`EditListModal`) and only one can be open, so three booleans would be three
  // ways to say the same thing plus a state where two are true. It carries the
  // blank row too, because `openList` below has to make that row here.
  const [editingList, setEditingList] = useState<{ kind: ListKind; extraRow: Row | null } | null>(
    null,
  );
  const organiserView = isOwner && viewMode === "organiser";

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
  const eventId = String(event.id);
  // The organiser-authored blocks. Read through the helpers, never off the
  // event directly — the real backend serves these keys as `undefined` and a
  // `.map()` over that throws (`lib/event-extras.ts`).
  const announcements = announcementsOf(event);
  const agenda = agendaOf(event);
  const faq = faqOf(event);
  // Authoring is gated on the DATA MODE as well as on ownership: there is no
  // column behind any of the three, so in real mode the controls are shown
  // disabled with the reason rather than hidden — a missing control looks like
  // a missing feature, a disabled one that explains itself does not.
  const extrasHint = EXTRAS_ARE_LOCAL ? undefined : EXTRAS_HINT;
  // Opening an EMPTY list lands on a blank row, so "Post an announcement" /
  // "Add an agenda" / "Add an FAQ" go straight to the fields instead of to an
  // empty state whose only control repeats the words just pressed (Gautham,
  // 2026-09-02). A list that already has rows was opened with "Edit" and opens
  // on those rows alone.
  //
  // ⚠️ `blankRow` must be called from an event handler, never in render — it
  // goes through `extraId()`, which `react-hooks/purity` flags. This is that
  // handler; the dialog only receives the finished row.
  const openList = (kind: ListKind, count: number) =>
    setEditingList({ kind, extraRow: count === 0 ? blankRow(kind) : null });
  // A cancelled event keeps its page — a link already shared has to explain
  // itself rather than 404 — but everything that would sell a ticket is off,
  // and the page wears the same greyed-out treatment as a sold-out card
  // (EventsCarousel: `grayscale opacity-60`). One visual language for "this is
  // not available", so a visitor reads it without being told twice.
  // Through `lifecycleOf`, not a bare `===`: `status` is a plain string that
  // arrives in whatever case the row was written with, and that helper is the
  // one place that decides what each value means.
  const lifecycle = lifecycleOf(event);
  const cancelled = lifecycle === "cancelled";
  // ⚠️ "Registration closed" is NOT dimmed and gets NO banner. The event is
  // still happening and its page is still the reference for everyone holding a
  // ticket — only the join is off. The grey-out and the band are reserved for
  // an event that will not take place at all; using them here would tell a
  // ticket holder their event was called off.
  const registrationClosed = lifecycle === "registration_closed";
  const bookable = !cancelled && !registrationClosed;
  const DIMMED = cancelled ? "grayscale opacity-60" : "";
  // The shared card controls speak CarouselEvent, so a wishlist save from here is
  // byte-identical to one from a card and renders the same in /dashboard.
  const card = toCarouselEvent(event);
  const location =
    (event.location?.address as string) ??
    (event.location?.city as string) ??
    "Online Event";

  function handleBookNow() {
    if (!bookable) return;
    router.push(isAuthenticated ? `/checkout/${id}` : "/auth");
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-left">
      <Navbar />

      {/* ⚠️ NEITHER ORGANISER BAND EXISTS ANY MORE (Gautham, 2026-08-31). The
          mode switch and the lifecycle status were both full-width strips
          stacked under the navbar; both are now controls in the hero row below
          — `OrganiserViewToggle` on the right, `EventStatusChip` beside the
          back button. `CancelledBanner` is the one remaining band, and it is
          not an organiser control: it is the page's public statement, which
          every visitor gets. */}
      {cancelled && <CancelledBanner />}

      {/* ── Hero: full-bleed photo + title overlay ── */}
      <section className="relative flex flex-col justify-end overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eventImageUrl(event, 1920, 1080)}
          alt={event.title}
          className={`absolute inset-0 w-full h-full object-cover ${DIMMED}`}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: HERO_SCRIM }} />

        {/* Top row: back + status on the left, view toggle + actions on the
            right. ⚠️ It WRAPS: the organiser's half of this row is two labelled
            controls and a chip, not just round buttons, and a draft at 375px
            has no honest single line. Wrapped, the left group keeps the line
            and the right cluster drops beneath it, still right-aligned. */}
        {/* ⚠️ `z-20`, AND THE TITLE BLOCK BELOW MUST STAY BELOW IT (Gautham,
            2026-09-01: the status tooltip was "shown behind the main caption").
            Both were `z-10`, and the title comes LATER in the DOM, so it won
            the tie — and no z-index inside this row could overrule it, because
            a child's `z-20` only orders it WITHIN this row's stacking context,
            never against a sibling of the row. Every dropped label and the
            status menu hang off controls in here, so the row as a whole has to
            outrank the title. **Raise this, not the label.** */}
        <div className={`absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 py-6 ${GUTTERS}`}>
          {/* All labels in this row drop BELOW their control. A side label would
              either collide with the neighbour or run past the 48px gutter into
              the hero's overflow-hidden edge; dropping it keeps the row pinned
              no matter which control is hovered. */}
          <EventBackButton onClick={() => router.back()} labelSide="bottom" size="lg" />
          {/* Same controls as the event cards, one size up so they hold their own
              against a full-bleed photo.

              ⚠️ In the ORGANISER view the pair is REPLACED, not extended: Edit,
              Duplicate and Cancel take the places of wishlist and share. An
              organiser wishlisting or sharing their own event is not what this
              view is for. Switch back to the participant view to get them —
              that is what the toggle at the head of this row is for.

              ⚠️ THREE IS THE CEILING here (Gautham, 2026-08-24). They sit in a
              48px gutter with their labels dropped below; a fourth starts
              crowding it at 375px. A further organiser action goes in the
              sidebar card, not in this row.

              ⚠️ DUPLICATE STAYS LIVE ON A CANCELLED EVENT, and the other two do
              not. Re-running an event that was called off is exactly when you
              want a copy of it; editing or re-cancelling one is not.

              ⚠️ THE ORGANISER'S HALF READS LEFT TO RIGHT AS state → lens →
              actions (Gautham, 2026-08-31): the lifecycle chip, then the view
              toggle, then the three round controls. Both labelled controls were
              full-width bands under the navbar until that date.

              ⚠️ The view TOGGLE shows in BOTH modes — it is how you get back, so
              hiding it in the participant preview would strand the organiser.
              The status chip shows in both too (Gautham, 2026-09-01), but as
              two different controls: a SELECT for the organiser, a FIXED chip
              for the participant. An organiser previewing gets the fixed one —
              the page a participant actually sees, which is the whole point.
              `EventStatus` owns that split; do not branch on it here.

              ⚠️ The cluster WRAPS rather than shrinking — three of its members
              are labelled controls, not 48px circles, and a draft at 375px has
              no honest single line. `shrink-0` on the cluster is what would
              break that. */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {organiserView ? (
              <EventStatusChip
                event={event}
                onPublish={() => setPublishing(true)}
                onCancel={() => setCancelling(true)}
              />
            ) : (
              <EventStatusChip event={event} view="participant" />
            )}
            {isOwner && <OrganiserViewToggle mode={viewMode} onChange={setViewMode} />}
            {organiserView ? (
              <>
                <EventEditButton
                  onClick={() => setEditing("top")}
                  disabled={cancelled}
                  labelSide="bottom"
                  size="lg"
                />
                <EventDuplicateButton
                  onClick={() => setDuplicating(true)}
                  labelSide="bottom"
                  size="lg"
                />
                <EventCancelButton
                  onClick={() => setCancelling(true)}
                  disabled={cancelled}
                  labelSide="bottom"
                  size="lg"
                />
              </>
            ) : (
              <>
                <EventWishlistButton item={card} labelSide="bottom" size="lg" />
                <EventShareButton item={card} labelSide="bottom" size="lg" />
              </>
            )}
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
            {/* ⚠️ The pencil is the SAME control the home page puts beside the
                city name (`EditPencil`), on purpose (Gautham, 2026-09-02) — one
                glyph, one tooltip shape, one meaning: "the text next to me is
                editable, click to edit it". It opens the same "Edit details"
                dialog as the hero's round control, but with the caret already in
                the description box, because this pencil has already said which
                paragraph is meant.

                It is `inline-flex` INSIDE the h2 rather than a flex row wrapping
                it, so the glyph sits on the heading's own baseline box and the
                `mb-4` below stays the heading's — a wrapper row would need its
                own margin and would drift from the three authored sections'
                heading spacing underneath. */}
            <h2 className="text-[22px] font-bold text-[var(--brand-text)] mb-4 flex items-center gap-1">
              About this event
              {organiserView && (
                <EditPencil
                  tooltip="Click here to edit the event details"
                  label="Edit the event details"
                  onClick={() => setEditing("description")}
                />
              )}
            </h2>
            <p className="text-[18px] leading-relaxed text-[var(--brand-hint)]">
              {event.description ?? "No description provided."}
            </p>

            {/* ── The organiser-authored blocks ──
                ⚠️ PUBLIC — a participant reads all three; only the Edit control
                is gated on `organiserView`. Each renders NOTHING when it is
                empty and the reader cannot edit it, which is why every divider
                is behind the same `showsSection` test the section itself uses:
                an unconditional rule would leave a horizontal line hanging over
                nothing on every event that never used the feature.

                Announcements lead because they are the time-sensitive one — a
                returning visitor is looking for what changed, not for the
                running order they already read. */}
            {showsSection(announcements.length, organiserView) && (
              <>
                <SectionDivider />
                <AnnouncementsSection
                  items={announcements}
                  canEdit={organiserView}
                  onEdit={() => openList("announcements", announcements.length)}
                  editHint={extrasHint}
                />
              </>
            )}

            {showsSection(agenda.length, organiserView) && (
              <>
                <SectionDivider />
                <AgendaSection
                  items={agenda}
                  canEdit={organiserView}
                  onEdit={() => openList("agenda", agenda.length)}
                  editHint={extrasHint}
                />
              </>
            )}

            {showsSection(faq.length, organiserView) && (
              <>
                <SectionDivider />
                <FaqSection
                  items={faq}
                  canEdit={organiserView}
                  onEdit={() => openList("faq", faq.length)}
                  editHint={extrasHint}
                />
              </>
            )}

            <SectionDivider />

            {/* Reviews — same block the community page renders. */}
            <ReviewsSection
              reviews={reviews}
              average={aggregates ? Number(aggregates.average_rating) : undefined}
              count={aggregates?.review_count}
              emptyText="No reviews yet. Be the first to attend and share your experience!"
            />
          </div>

          {/* ── Right sidebar ──
              ⚠️ The organiser gets a DIFFERENT CARD, not a disabled booking one
              (Gautham, 2026-08-24): they cannot buy a ticket to their own event,
              so the CTA slot is where "Manage attendees" and "Manage revenue"
              go instead. See `OrganiserEventCard`.

              ⚠️ And it is NOT dimmed on a cancelled event. The grey-out is the
              page telling a visitor "this is not available"; the organiser is
              the one person who still has work to do here, and greying out
              their attendee list is the opposite of helpful. */}
          <div className={`order-1 lg:order-2 ${organiserView ? "" : DIMMED}`}>
            {organiserView ? (
              <OrganiserEventCard event={event} organiserName={organiserNameOf(event)} />
            ) : (
              <BookingCard
                cancelled={cancelled}
                registrationClosed={registrationClosed}
                dateLabel={fmt(event.start_date, { weekday: "long", month: "short", day: "numeric" })}
                timeLabel={fmtTime(event.start_date)}
                location={location}
                organizer={organiserNameOf(event)}
                price={event.price}
                currency={event.currency}
                offerName={event.offer_name}
                isFree={isFree}
                going={event.tickets_sold}
                left={Math.max(0, event.capacity - event.tickets_sold)}
                onBook={handleBookNow}
              />
            )}
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

      {/* ── Sticky bar ──
          ⚠️ It follows the sidebar: the organiser's says what they came to find
          out (how many have booked) and goes where the card's primary link
          goes. A "Book Now" pinned to the bottom of an organiser's own event is
          the same mistake as the booking card, made twice on one screen. */}
      {organiserView ? (
        <DetailStickyBar
          caption="Tickets sold"
          amount={
            event.capacity > 0
              ? `${event.tickets_sold} / ${event.capacity}`
              : String(event.tickets_sold)
          }
          cta="Manage attendees"
          href={manageAttendeesHref(eventId)}
          gutters={GUTTERS}
        />
      ) : (
        <DetailStickyBar
          caption="Starting from"
          amount={formatPrice(event.price, event.currency)}
          // Same priority as the booking card's CTA below, and for the same
          // reason: cancelled outranks closed outranks full.
          cta={cancelled ? "Event cancelled" : registrationClosed ? "Registration closed" : "Book Now"}
          onClick={handleBookNow}
          disabled={!bookable}
          gutters={GUTTERS}
        />
      )}

      {/* ── Organiser dialogs ── */}
      {/* Mounted only while open, so each one opens on the event's CURRENT
          values: they all seed their form state from props on mount, and a
          permanently-mounted dialog would still be holding whatever the event
          said the first time this page rendered. */}
      {editing && (
        <EditEventModal
          event={event}
          open
          focusField={editing === "description" ? "description" : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {cancelling && <CancelEventModal event={event} open onClose={() => setCancelling(false)} />}
      {duplicating && <DuplicateEventModal event={event} open onClose={() => setDuplicating(false)} />}
      {publishing && <PublishEventModal event={event} open onClose={() => setPublishing(false)} />}
      {editingList && (
        <EditListModal
          event={event}
          kind={editingList.kind}
          extraRow={editingList.extraRow}
          open
          onClose={() => setEditingList(null)}
        />
      )}

      <div className="h-24" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * The full-width strip a cancelled event wears, for everyone who opens the page.
 *
 * ⚠️ It says nothing about refunds, because nothing issues one — see
 * `CancelEventModal` and TODO.md §20. "Contact the organiser" is the only true
 * next step today; do not upgrade it to a promise.
 */
function CancelledBanner() {
  return (
    <div
      className="w-full"
      style={{
        backgroundColor: "color-mix(in srgb, var(--brand-terracotta) 14%, transparent)",
        borderBottom: "1px solid var(--brand-border)",
      }}
    >
      <div className={`py-3 ${GUTTERS}`}>
        <p className="text-[16px] font-bold text-[var(--brand-text)]">
          This event has been cancelled.
        </p>
        <p className="text-[16px] text-[var(--brand-hint)]">
          It can no longer be booked. If you were holding a ticket, contact the organiser.
        </p>
      </div>
    </div>
  );
}

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
  offerName,
  isFree,
  going,
  left,
  cancelled = false,
  registrationClosed = false,
  onBook,
}: {
  dateLabel: string;
  timeLabel: string;
  location: string;
  organizer: string;
  price: number;
  currency?: string;
  /** The organiser's own name for this price — "Early bird". Optional, and
   *  absent on every event the real backend serves (`lib/event-extras.ts`). */
  offerName?: string;
  isFree: boolean;
  going: number;
  left: number;
  /** The organiser called it off. Outranks sold-out on the CTA — a cancelled
   *  event that also happens to be full is cancelled, not full. */
  cancelled?: boolean;
  /** Still happening, no longer taking joins. Sits BETWEEN the two above: it
   *  outranks sold-out (a closed event that is also full is closed, and "Sold
   *  Out" would suggest more seats would fix it) and loses to cancelled. */
  registrationClosed?: boolean;
  onBook: () => void;
}) {
  const soldOut = left <= 0;
  return (
    <DetailCardShell>
      {/* ⚠️ The name comes from `organiserNameOf` — the event's own organisation
          name, or `ORGANISER_NAME` when it has none. The TRUST LINE below is
          still hardcoded and there is still no organiser lookup on this page.
          Logged as TODO.md §1; "Verified" cannot ship to real users as-is.

          ⚠️ `OrganiserEventCard` renders this SAME header, deliberately. Change
          the eyebrow or the subline in one and change it in the other. */}
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

        {/* Social proof + scarcity. flex-wrap: both chips are nowrap TAG_SHAPE,
            and together they outgrow the stacked card on a 320–375px phone —
            the shell is overflow-hidden, so without it the second chip was
            silently clipped. */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-7">
          <DetailPeopleChip count={going} label="going" />
          {/* ⚠️ Hidden once registration is closed. The card is NOT dimmed in
              that state (unlike a cancelled one), so "12 spots left" would sit
              directly above a disabled "Registration closed" button and read as
              a bug — scarcity copy only makes sense while the seats are
              claimable. */}
          {!soldOut && !registrationClosed && <DetailAccentChip text={`${left} spots left`} />}
        </div>

        <DetailDivider />

        <DetailPriceRow
          // The offer takes over the caption when there is one: "Early bird"
          // above the figure says more than "Starting from" and is what the
          // organiser typed it for. A free event never has one.
          label={offerName?.trim() || "Starting from"}
          amount={formatPrice(price, currency)}
          suffix={isFree ? undefined : "/ ticket"}
        />

        {/* ⚠️ `outline`, not a green fill (Gautham, 2026-08-31) — the same skin
            the section edit controls and the organiser card's two links wear,
            so every full-width control on this page reads as one system. The
            sticky bar below keeps the green fill; it is a different surface. */}
        <DetailCTA
          label={
            cancelled
              ? "Event cancelled"
              : registrationClosed
                ? "Registration closed"
                : soldOut
                  ? "Sold Out"
                  : "Book Now"
          }
          onClick={onBook}
          disabled={cancelled || registrationClosed || soldOut}
          variant="outline"
        />
      </DetailCardBody>
    </DetailCardShell>
  );
}
