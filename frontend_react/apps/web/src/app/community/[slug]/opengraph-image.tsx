// The "1b" link-unfurl image for a COMMUNITY (1200×630), mirroring
// app/event/[id]/opengraph-image.tsx. Auto-attached to <meta og:image> by Next's
// file convention, so pasting a community link into any chat/Slack renders this:
// the community's picture on the left, a NewFind-branded text card on the right.
import { ImageResponse } from "next/og";
import { getCommunityForShare } from "@/lib/community-server";
import { communityImageUrl, locationLabel } from "@/lib/event-media";

// ⚠️ PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2.
//
// A metadata route is its own route entry: the parent app/community/layout.tsx
// redirect never wraps it, so without this guard /community/<slug>/opengraph-image
// would still serve a PNG reading "Find your community on NewFind". The guard is
// an early 404; everything below it is intact and still type-checked.
//
// PHASE 2 RESTORE: set PARKED to false (or delete it and its `if` below), and
// put `alt` back to "Community on NewFind".
const PARKED: boolean = true;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NewFind";

// Brand palette (fixed light values — the unfurl is a standalone graphic).
const GREEN = "#184E4A";
const LINEN = "#F2EFEA";
const TEXT = "#111827";
const MUTED = "#6B7280";

// NewFind magnifier mark as a data-URI SVG (reliable inside Satori).
const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F2EFEA" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>`,
)}`;

function memberLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "New community";
  const n = count >= 1000 ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k` : String(count);
  return `${n} members`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  if (PARKED) return new Response(null, { status: 404 }); // see PARKED note at top

  const { slug } = await params;
  const community = await getCommunityForShare(slug);

  const title = community?.name ?? "Find your community on NewFind";
  const metaLine = community
    ? `${community.category} · ${locationLabel(community)} · ${memberLabel(community.member_count)}`
    : "";
  const img = communityImageUrl(community ?? { id: slug }, 700, 630);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: LINEN }}>
        {/* Left — community picture with a member chip */}
        <div style={{ width: 470, height: "100%", position: "relative", display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" width={470} height={630} style={{ width: 470, height: 630, objectFit: "cover" }} />
          {community ? (
            <div
              style={{
                position: "absolute",
                left: 28,
                bottom: 28,
                display: "flex",
                padding: "10px 20px",
                borderRadius: 12,
                backgroundColor: GREEN,
                color: "#FFFFFF",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {memberLabel(community.member_count)}
            </div>
          ) : null}
        </div>

        {/* Right — branded text card */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: GREEN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MARK} alt="" width={30} height={30} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: GREEN }}>NEWFIND</div>
          </div>

          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, lineHeight: 1.08, color: TEXT }}>
            {title}
          </div>

          {metaLine ? (
            <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: MUTED }}>{metaLine}</div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
