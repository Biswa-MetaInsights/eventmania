// The "1c" story image (1080×1920 portrait). Returned as a PNG so the client
// share flow can hand it to the native share sheet ("post to a story") or offer
// it as a download. The event's own picture fills the frame; a NewFind-branded
// overlay carries the invite copy.
import { ImageResponse } from "next/og";
import { getEventForShare } from "@/lib/event-server";
import { eventImageUrl, locationLabel, priceLabel } from "@/lib/event-media";

const GREEN = "#184E4A";
const LINEN = "#F2EFEA";
const RED = "#C1443A";

const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F2EFEA" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>`,
)}`;

const ARROW = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#184E4A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></svg>`,
)}`;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventForShare(id);

  const title = event?.title ?? "You're invited";
  const subtitle = event ? `${event.category} · ${locationLabel(event)}` : "";
  const price = event ? priceLabel(event) : "Free";
  const isFree = event ? event.price === 0 : true;
  const img = eventImageUrl(event ?? { id }, 1080, 1920);

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
          {/* Top bar: brand + price */}
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
            <div
              style={{
                display: "flex",
                padding: "14px 30px",
                borderRadius: 16,
                backgroundColor: isFree ? RED : GREEN,
                color: "#FFFFFF",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              {price}
            </div>
          </div>

          {/* Bottom block: invite */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 6, color: "#C9D6D2" }}>
              YOU&apos;RE INVITED
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
