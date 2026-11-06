// The "1b" link-unfurl image (1200×630). Auto-attached to <meta og:image> by
// Next's file convention, so pasting an event link into any chat/Slack renders
// this: the event's own picture on the left, a NewFind-branded text card on the
// right (mark → title → "place · date · price").
import { ImageResponse } from "next/og";
import { getEventForShare } from "@/lib/event-server";
import { eventImageUrl, locationLabel, priceLabel, shortDate } from "@/lib/event-media";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Event on NewFind";

// Brand palette (fixed light values — the unfurl is a standalone graphic).
const GREEN = "#184E4A";
const LINEN = "#F2EFEA";
const TEXT = "#111827";
const MUTED = "#6B7280";
const RED = "#C1443A";

// NewFind magnifier mark as a data-URI SVG (reliable inside Satori).
const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F2EFEA" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>`,
)}`;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventForShare(id);

  const title = event?.title ?? "Discover events on NewFind";
  const place = event ? locationLabel(event) : "";
  const price = event ? priceLabel(event) : "Free";
  const metaLine = event ? `${place} · ${shortDate(event.start_date)} · ${price}` : "";
  const img = eventImageUrl(event ?? { id }, 700, 630);
  const isFree = event ? event.price === 0 : true;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: LINEN }}>
        {/* Left — event picture with a price chip */}
        <div style={{ width: 470, height: "100%", position: "relative", display: "flex" }}>
          { }
          <img src={img} alt="" width={470} height={630} style={{ width: 470, height: 630, objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              left: 28,
              bottom: 28,
              display: "flex",
              padding: "10px 20px",
              borderRadius: 12,
              backgroundColor: isFree ? RED : GREEN,
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {price}
          </div>
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
              { }
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
