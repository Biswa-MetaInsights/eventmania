"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The "Attendee Reviews" block shared by /event/[id] and /community/[slug].
//
//  The event page reviews ONE event. The community page has no reviews of its
//  own — the review service is event-scoped — so it aggregates the reviews of
//  the community's events and says so in the subtitle. Both render through this
//  component, so a review looks the same wherever it appears.
// ─────────────────────────────────────────────────────────────────────────────

import type { Review } from "@eventmind/api";
import { BRAND } from "@/lib/theme";

const GREEN = BRAND.green;

/** Rating gold. Semantic, not a brand colour — intentionally not themed. */
const STAR = "#F59E0B";

export function ReviewsSection({
  title = "Attendee Reviews",
  subtitle,
  reviews,
  average,
  count,
  emptyText,
}: {
  title?: string;
  /** Small line under the heading — used to say where aggregated reviews came from. */
  subtitle?: string;
  reviews: Review[];
  /** Mean rating. Omit when there is nothing to average — the block hides rather than showing 0.0. */
  average?: number;
  count?: number;
  emptyText: string;
}) {
  const hasAggregate = typeof average === "number" && !!count;

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold text-[var(--brand-text)]">{title}</h2>
          {subtitle && <p className="text-[16px] mt-1 text-[var(--brand-hint)]">{subtitle}</p>}
        </div>
        {hasAggregate && (
          <div className="flex items-center gap-1.5 shrink-0">
            <RatingStar className="w-6 h-6" />
            <span className="text-[18px] font-bold text-[var(--brand-text)]">
              {Number(average).toFixed(1)}
            </span>
            <span className="text-[var(--brand-hint)]">({count})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-[var(--brand-hint)] text-[16px]">{emptyText}</p>
      ) : (
        <div className="space-y-8">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div style={{ textAlign: "left" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "color-mix(in srgb, var(--brand-green) 8%, transparent)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"
              />
            </svg>
          </div>
          <span className="font-bold text-[var(--brand-text)]">Verified Attendee</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <RatingStar key={i} className="w-4 h-4" filled={i < review.rating} />
          ))}
        </div>
      </div>
      <p className="text-[16px] leading-relaxed text-[var(--brand-hint)]">{review.content}</p>
    </div>
  );
}

/**
 * The rating star. Deliberately NOT `EventIcons.StarIcon` — that one is the
 * sharp 5-point "Recommended" tag glyph; this is the rounded review star. Two
 * concepts, two shapes.
 */
function RatingStar({ className, filled = true }: { className: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? STAR : "var(--brand-border)"} aria-hidden="true">
      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.543 2.826c-.999.625-2.227-.276-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
    </svg>
  );
}