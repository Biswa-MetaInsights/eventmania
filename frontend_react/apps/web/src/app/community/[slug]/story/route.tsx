// The "1c" story image for a COMMUNITY (1080×1920 portrait), mirroring
// app/event/[id]/story/route.tsx so a shared community looks like a shared
// event. Returned as a PNG so the client share flow can hand it to the native
// share sheet ("post to a story") or offer it as a download.
//
// Differences from the event story, all deliberate: the eyebrow reads JOIN THE
// COMMUNITY rather than YOU'RE INVITED, the top-right chip shows the member
// count instead of a price, and the meta line is "category · place".
import { ImageResponse } from "next/og";
import { getCommunityForShare } from "@/lib/community-server";
import { communityImageUrl, locationLabel } from "@/lib/event-media";

const GREEN = "#184E4A";
const LINEN = "#F2EFEA";

const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F2EFEA" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>`,
)}`;

const ARROW = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#184E4A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></svg>`,
)}`;

/** "1.2k members" / "842 members" — same compaction the cards use. */
function memberLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "New community";
  const n = count >= 1000 ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k` : String(count);
  return `${n} members`;
}

// ⚠️ PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2.
//
// A route handler is its own route entry: the parent app/community/layout.tsx
// redirect never wraps it, so without this guard /community/<slug>/story would
// still serve a 1080×1920 PNG with "JOIN THE COMMUNITY" across it. The guard is
// an early 404; everything below it is intact and still type-checked.
//
// PHASE 2 RESTORE: set PARKED to false, or delete it and the `if` below.
const PARKED: boolean = true;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (PARKED) return new Response(null, { status: 404 }); // see PARKED note above

  const { slug } = await params;
  const community = await getCommunityForShare(slug);

  const title = community?.name ?? "Find your people";
  const subtitle = community ? `${community.category} · ${locationLabel(community)}` : "";
  const members = community ? memberLabel(community.member_count) : "";
  const img = communityImageUrl(community ?? { id: slug }, 1080, 1920);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: "#0B1F1D" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt=""
          width={1080}
          height={1920}
          style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1920, objectFit: "cover" }}
        />
        {/* Darkening gradient so text stays legible */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: 1920,
            display: "flex",
            backgroundImage:
              "linear-gradient(to bottom, rgba(11,31,29,0.55) 0%, rgba(11,31,29,0.05) 32%, rgba(11,31,29,0.35) 62%, rgba(11,31,29,0.92) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            width: 1080,
            height: 1920,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 80,
          }}
        >
          {/* Top bar: brand + member count */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 15,
                  backgroundColor: GREEN,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 20,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MARK} alt="" width={34} height={34} />
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, color: LINEN }}>NewFind</div>
            </div>
            {members ? (
              <div
                style={{
                  display: "flex",
                  padding: "14px 30px",
                  borderRadius: 16,
                  backgroundColor: GREEN,
                  color: "#FFFFFF",
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                {members}
              </div>
            ) : null}
          </div>

          {/* Bottom block: invite */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 6, color: "#C9D6D2" }}>
              JOIN THE COMMUNITY
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 110, fontWeight: 800, lineHeight: 1.02, color: "#FFFFFF" }}>
              {title}
            </div>
            {subtitle ? (
              <div style={{ display: "flex", marginTop: 28, fontSize: 44, color: "#DDE6E3" }}>{subtitle}</div>
            ) : null}

            {/* Join button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 56,
                padding: "34px 48px",
                borderRadius: 26,
                backgroundColor: LINEN,
              }}
            >
              <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: GREEN }}>Join on NewFind</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ARROW} alt="" width={44} height={44} />
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
