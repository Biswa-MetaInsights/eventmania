"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { communitySource, eventsSource } from "@/lib/data-source";
import { Navbar } from "@/components/navbar/Navbar";
import { CategoryBadge, EventBadges } from "@/components/EventBadges";
import { EventBackButton, EventShareButton, EventWishlistButton } from "@/components/EventActions";
import { CommunityEventsRail } from "@/components/CommunityEventsRail";
import { CommunityJoinCard } from "@/components/CommunityJoinCard";
import { CommunityReviews } from "@/components/CommunityReviews";
import { DetailStickyBar } from "@/components/DetailCard";
import { SimilarCommunities } from "@/components/SimilarCommunities";
import { toCommunityItem } from "@/lib/card-adapters";
import { splitCommunityEvents } from "@/lib/community-events";
import { communityImageUrl, HERO_SCRIM } from "@/lib/event-media";
import { heroTitleSize } from "@/lib/hero-title";
import { GUTTERS } from "@/lib/layout";
import { formatPrice } from "@/lib/currency";
import { BRAND } from "@/lib/theme";

const GREEN = BRAND.green;
const BG = BRAND.bg;
const TEXT = BRAND.text;
const HINT = BRAND.hint;


// PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2. This page is
// left completely intact; the redirect that hides it lives one level up in
// layout.tsx, which runs first on the server so this never renders.
export default function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const { data: communityRes, isLoading: communityLoading } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => communitySource.getBySlug(slug).then((r) => r.data),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["community-events", communityRes?.id],
    queryFn: () =>
      eventsSource
        .search({ community_id: communityRes!.id, limit: 100 })
        .then((r) => r.data),
    enabled: !!communityRes?.id,
  });

  if (communityLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
        </div>
      </div>
    );
  }

  if (!communityRes) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <Navbar />
        <div className="flex flex-col items-center py-24 gap-4">
          <p className="text-[18px] font-semibold" style={{ color: HINT }}>Community not found</p>
          <button
            onClick={() => router.push("/communities")}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-[var(--brand-on-green)]"
            style={{ backgroundColor: GREEN }}
          >
            Explore Communities
          </button>
        </div>
      </div>
    );
  }

  const community = communityRes;
  // The same adapter the cards use, so the wishlist record saved from this page
  // is byte-identical to one saved from a community card.
  const card = toCommunityItem(community);

  // Split ONCE here rather than in each child: the rail needs both lists, the
  // reviews block needs the past ones, and the sidebar card needs the next one.
  const { upcoming, previous } = splitCommunityEvents(events);
  const eventCount = events?.length ?? 0;

  const price = Number(community.price);
  const isFree = !Number.isFinite(price) || price === 0;

  // ⚠️ Joining does nothing yet — there is no membership table, no join endpoint
  // and no notification hook. Gautham asked for the button now and the flow
  // later; the spec lives in TODO.md under "Join a community".
  function handleJoin() {}

  return (
    <div className="min-h-screen text-left" style={{ backgroundColor: BG }}>
      <Navbar />

      {/* ── Hero: full-bleed photo + title overlay ──
          Mirrors /event/[id] exactly — same scrim, same control set and sizes,
          same one-line centred title, same category + status tag row. */}
      <section className="relative flex flex-col justify-end overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={communityImageUrl(community, 1920, 1080)}
          alt={community.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: HERO_SCRIM }} />

        {/* Top row: back / wishlist + share */}
        <div className={`absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 py-6 ${GUTTERS}`}>
          <EventBackButton onClick={() => router.back()} labelSide="bottom" size="lg" />
          <div className="flex items-center gap-2.5 shrink-0">
            <EventWishlistButton item={card} kind="community" labelSide="bottom" size="lg" />
            <EventShareButton item={card} kind="community" labelSide="bottom" size="lg" />
          </div>
        </div>

        {/* Title block */}
        <div className={`relative z-10 pb-12 pt-6 ${GUTTERS}`}>
          <h1
            className="hero-title font-extrabold text-white leading-[1.05] text-center whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: heroTitleSize(community.name) }}
          >
            {community.name}
          </h1>
          <div className="mt-6 flex flex-wrap items-end justify-center gap-1.5">
            {community.category && <CategoryBadge category={community.category} />}
            <EventBadges types={card.badgeType ? [card.badgeType] : undefined} align="center" />
          </div>
        </div>
      </section>

      {/* ── Main content ──
          Same container as /event/[id]'s body (GUTTERS inside a 1400 cap), so
          "About this community" starts on the same line as "About this event". */}
      <div className={`py-10 ${GUTTERS}`} style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Two columns on lg+, stacked below it. The 2.4fr ratio and the order
            swap are the event page's — stacked, the join card comes FIRST so the
            next event date and the CTA are visible without scrolling past the
            description. */}
        <div className="grid grid-cols-1 lg:grid-cols-[2.4fr_1fr] gap-10 lg:gap-16 items-start">

          {/* ── Left column ── */}
          <div className="order-2 lg:order-1" style={{ textAlign: "left" }}>
            <h2 className="text-[22px] font-bold mb-4" style={{ color: TEXT }}>
              About this community
            </h2>
            <p className="text-[18px] leading-relaxed" style={{ color: HINT }}>
              {community.description ?? "No description provided."}
            </p>
            {community.website && (
              <a
                href={community.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-[16px] font-semibold"
                style={{ color: GREEN }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                {community.website.replace(/^https?:\/\//, "")}
              </a>
            )}

            <div className="my-12 h-px" style={{ backgroundColor: BRAND.border }} />

            {/* Reviews. A community has none of its own, so these are aggregated
                from its past events — see CommunityReviews. */}
            <CommunityReviews pastEvents={previous} />
          </div>

          {/* ── Right sidebar: join card ── */}
          <div className="order-1 lg:order-2">
            <CommunityJoinCard
              community={community}
              nextEvent={upcoming[0]}
              eventCount={eventCount}
              onJoin={handleJoin}
            />
          </div>
        </div>

      </div>

      {/* ── Rails ──
          Both are deliberately OUTSIDE the maxWidth:1400 column above: they are
          full-bleed, carrying the home page's gutters, so their cards render at
          exactly the home grid's size and a full row of four fits without
          scrolling. Each carries its own top divider and renders NOTHING when it
          has nothing to show, so an empty rail leaves no orphaned rule behind.
          See components/Rail.tsx for the measurements. */}
      <CommunityEventsRail upcoming={upcoming} previous={previous} isLoading={eventsLoading} />
      <SimilarCommunities community={community} />

      {/* ── Sticky join bar ── */}
      <DetailStickyBar
        caption="Membership"
        amount={isFree ? "Free" : formatPrice(price)}
        cta="Join this community"
        onClick={handleJoin}
        gutters={GUTTERS}
      />

      <div className="h-24" />
    </div>
  );
}
