"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Similar communities" — the community-page counterpart to SimilarEvents.
//
//  Communities have no coordinates to search around the way events do, so
//  "similar" here means the same CATEGORY, then the same CITY as a second pass.
//  Ordering is the backend's (member_count desc), which is the closest thing to
//  a relevance signal the community service offers.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import type { Community } from "@eventmind/types";
import { communitiesSource } from "@/lib/data-source";
import { toCommunityItem } from "@/lib/card-adapters";
import { CommunityCardItem } from "./CommunityCarousel";
import { SkeletonCard } from "./EventsCarousel";
import { Rail, RAIL_ITEM, RAIL_CARD_BASIS } from "./Rail";

/** Cards shown at most. Beyond this the row stops being browsable and becomes a list. */
const MAX_CARDS = 12;

function cityOf(community: Community): string | undefined {
  const loc = community.location as Record<string, unknown> | undefined;
  const city = loc?.city;
  return typeof city === "string" && city.length > 0 ? city : undefined;
}

export function SimilarCommunities({ community }: { community: Community }) {
  const category = community.category;
  const city = cityOf(community);

  const { data: sameCategory = [], isLoading: categoryLoading } = useQuery({
    queryKey: ["similar-communities", "category", category],
    queryFn: () => communitiesSource.search({ category }).then((r) => r.data),
    enabled: !!category,
  });

  // Second pass so a community in a thin category still has neighbours to show.
  const { data: sameCity = [], isLoading: cityLoading } = useQuery({
    queryKey: ["similar-communities", "city", city],
    queryFn: () => communitiesSource.search({ city }).then((r) => r.data),
    enabled: !!city,
  });

  const isLoading = (!!category && categoryLoading) || (!!city && cityLoading);

  // Category matches first, city matches after, deduped by id — and never
  // suggest the community the user is already looking at.
  const seen = new Set<string>([String(community.id)]);
  const items = [...sameCategory, ...sameCity]
    .filter((c) => {
      const id = String(c.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_CARDS)
    .map(toCommunityItem);

  if (!isLoading && items.length === 0) return null;

  return (
    <Rail title="Similar communities" itemCount={items.length}>
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={RAIL_CARD_BASIS}>
              <SkeletonCard />
            </div>
          ))
        : items.map((c) => (
            <div key={c.id} className={RAIL_ITEM}>
              <CommunityCardItem community={c} />
            </div>
          ))}
    </Rail>
  );
}