// TEMPORARY preview — not linked from anywhere, safe to delete.
// Renders all 8 palette colours through the real tag chrome (TAG_SHAPE + the
// same padding/glyph EventBadge uses) so the colours can be eyeballed as tags,
// linen label vs black label, on both the hero's dark scrim and a light card.
// Delete this route (src/app/badge-preview/) once the palette is settled.

import { TAG_SHAPE } from "@/components/EventBadges";
import {
  CalendarIcon,
  ClockIcon,
  FlameIcon,
  StarIcon,
  TagIcon,
  LeafIcon,
  GlobeIcon,
  type EventIcon,
} from "@/components/EventIcons";

const LINEN = "#F2EFEA";
const BLACK = "#000000";

// name, hex, whether it is currently assigned to a live tag, and its linen ratio.
const PALETTE: { name: string; hex: string; assigned: string | null; linen: number; icon: EventIcon }[] = [
  { name: "Mustard", hex: "#B3982B", assigned: "This Week", linen: 2.46, icon: CalendarIcon },
  { name: "Olive", hex: "#7E8B3A", assigned: null, linen: 3.25, icon: LeafIcon },
  { name: "Coral", hex: "#C6503F", assigned: "Selling Fast", linen: 3.96, icon: FlameIcon },
  { name: "Sky", hex: "#4E82C0", assigned: "Today", linen: 3.47, icon: ClockIcon },
  { name: "Iris", hex: "#7C6FC0", assigned: "Recommended", linen: 3.74, icon: StarIcon },
  { name: "Plum", hex: "#A05FA0", assigned: "Free", linen: 3.95, icon: TagIcon },
  { name: "Berry", hex: "#BC5675", assigned: null, linen: 3.87, icon: GlobeIcon },
];

const TAG = `${TAG_SHAPE} gap-1.5 font-bold px-2.5 py-1 text-[16px]`;
const GLYPH = "w-3.5 h-3.5 shrink-0";

function Tag({ hex, label, Icon, textColor }: { hex: string; label: string; Icon: EventIcon; textColor: string }) {
  return (
    <span className={TAG} style={{ backgroundColor: hex, color: textColor }}>
      <Icon color={textColor} className={GLYPH} />
      {label}
    </span>
  );
}

function Panel({ bg, label, textColor }: { bg: string; label: string; textColor: string }) {
  return (
    <div className="rounded-lg p-8" style={{ backgroundColor: bg, border: "1px solid rgba(128,128,128,0.25)" }}>
      <p className="text-[13px] font-bold uppercase tracking-[0.1em] mb-6" style={{ color: "var(--brand-hint)" }}>
        {label}
      </p>
      <div className="flex flex-col gap-6">
        {PALETTE.map((c) => (
          <div key={c.name} className="flex items-center gap-4 flex-wrap">
            {/* linen label + black label of the same colour, side by side */}
            <Tag hex={c.hex} label={c.assigned ?? c.name} Icon={c.icon} textColor={LINEN} />
            <Tag hex={c.hex} label={c.assigned ?? c.name} Icon={c.icon} textColor={BLACK} />
            <span className="text-[14px]" style={{ color: textColor }}>
              <b>{c.name}</b> {c.hex}
              {c.assigned ? ` · ${c.assigned}` : " · reserve"}
              {" · "}
              <span style={{ color: c.linen >= 4.5 ? "#4ADE80" : "#F59E0B" }}>
                linen {c.linen.toFixed(2)}:1 {c.linen >= 4.5 ? "AA" : "fails AA"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BadgePreviewPage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-16" style={{ backgroundColor: "var(--brand-bg)" }}>
      <div className="mx-auto flex flex-col gap-10" style={{ maxWidth: 900 }}>
        <div>
          <h1 className="text-[28px] font-extrabold mb-2" style={{ color: "var(--brand-text)" }}>
            Palette tag preview
          </h1>
          <p className="text-[16px]" style={{ color: "var(--brand-hint)" }}>
            Every palette colour as a tag. Each row shows the <b>linen label</b> (left) and the{" "}
            <b>black label</b> (right) of the same colour. Assigned tags use their real name; reserves
            are labelled with the colour name. Delete <code>src/app/badge-preview/</code> when done.
          </p>
        </div>
        {/* The dark panel mimics the /event/[id] hero photo scrim, where these
            tags actually render; the light panel is the event-card body. */}
        <Panel bg="#0F1F1C" label="On the hero's dark scrim (real context)" textColor="#F2EFEA" />
        <Panel bg="var(--brand-surface)" label="On a light card surface" textColor="var(--brand-text)" />
      </div>
    </div>
  );
}
