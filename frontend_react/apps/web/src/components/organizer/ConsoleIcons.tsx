// ─────────────────────────────────────────────────────────────────────────────
//  Organiser-console chrome glyphs — sidebar nav, stat tiles, row actions.
//
//  This file is the exception EventIcons.tsx names at the top of its own header
//  ("Not in this set (deliberately): … the organiser console's stat glyphs").
//  It holds ONLY glyphs that do not exist there, and only ones that mean
//  something inside the console.
//
//  ⚠️ NEVER draw a calendar, clock, pin, shield or people glyph here — those are
//  EventIcons.tsx's, and the console imports them from it. A second calendar is
//  exactly the drift the one-icon-per-concept rule exists to stop. `EventsIcon`
//  below is an alias re-export of EventIcons' calendar for that reason: the
//  sidebar reads from one list, but the glyph still has one definition.
//
//  Style: OUTLINE at 1.8 stroke on a 24 viewBox, sized by the caller through
//  `className`. That is deliberately not EventIcons' filled family — these are
//  interface chrome (nav, actions) rather than content metadata, and the filled
//  set reads too heavy at nav size on the dark sidebar. Colour is `currentColor`
//  throughout so a nav item's active state tints its icon by changing text
//  colour alone.
// ─────────────────────────────────────────────────────────────────────────────

import type { IconProps } from "@/components/EventIcons";
import { CalendarIcon, PeopleIcon } from "@/components/EventIcons";

const DEFAULT_CLASS = "w-[18px] h-[18px] shrink-0";

/** Shared wrapper — every glyph below is the same stroke weight and viewBox. */
function Outline({ className = DEFAULT_CLASS, color = "currentColor", d }: IconProps & { d: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/* ⚠️ `DashboardIcon` was here and went with the Dashboard section on
   2026-09-07 — the console has three rail items now, none of them a dashboard.
   Do not re-add it speculatively; see ConsoleSidebar's header note. */

/** Earnings — a banknote. Currency-neutral on purpose: the console formats
 *  amounts through lib/currency, so the glyph must not hardcode a ₹ or a $. */
export function EarningsIcon(props: IconProps) {
  return <Outline {...props} d="M3 7.5h18v9H3v-9Zm9 1.8a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4ZM6 10.5v0m12 3v0" />;
}

/** Search — the header field's glyph. */
export function SearchIcon(props: IconProps) {
  return <Outline {...props} d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4" />;
}

/** Plus — "New event". */
export function PlusIcon(props: IconProps) {
  return <Outline {...props} d="M12 5v14M5 12h14" />;
}

/** A clock face with the hands at "waiting" — the header's "N need you" pill. */
export function PendingIcon(props: IconProps) {
  return <Outline {...props} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 1.8" />;
}

/** Check — a cleared room, a checked-in attendee. */
export function CheckIcon(props: IconProps) {
  return <Outline {...props} d="m5 12.5 4.5 4.5L19 7" />;
}

/** Pencil — "Edit", and the dashboard's "no update sent" prompt. */
export function EditIcon(props: IconProps) {
  return <Outline {...props} d="M16.9 4.5a2 2 0 0 1 2.8 2.8L9.9 17.1 6 18l.9-3.9 10-9.6Z" />;
}

/**
 * Circle with a slash — "Cancel event".
 *
 * ⚠️ The OUTLINE sibling of `EventIcons.BanIcon`, which is the filled tag glyph
 * for Sold Out. Two drawings of one shape is normally the drift this file's
 * header forbids, and the exception is the same one that header states: these
 * are chrome, that one is content metadata, and they never appear together —
 * a sold-out pill sits on a card, this sits in an organiser control. **If a
 * third "unavailable" glyph is ever wanted, use one of these two.**
 */
export function CancelIcon(props: IconProps) {
  return <Outline {...props} d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM6 18 18 6" />;
}

/**
 * Two offset sheets — "Duplicate event".
 *
 * The back sheet is drawn as an L rather than a full rectangle, so at 24px the
 * two outlines do not sit on top of each other and read as one thick edge.
 */
export function DuplicateIcon(props: IconProps) {
  return <Outline {...props} d="M9 9h11v11H9V9Zm-5 6V4h11v2" />;
}

/** A ticket stub with a perforation — check-in mode, ticket-type filters. */
export function TicketIcon(props: IconProps) {
  return <Outline {...props} d="M4 8.5V6.5h16v2a2 2 0 0 0 0 7v2H4v-2a2 2 0 0 0 0-7Zm10-2v11" />;
}

/** Tray with a down arrow — "Export CSV", "Download statement". */
export function DownloadIcon(props: IconProps) {
  return <Outline {...props} d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M4.5 17v2.5h15V17" />;
}

/** Horizontal ellipsis — the row overflow menu. */
export function MoreIcon(props: IconProps) {
  return <Outline {...props} d="M6 12h.01M12 12h.01M18 12h.01" />;
}

/**
 * Speech bubble with three dots — a chat, anywhere in the app.
 *
 * ⚠️ **THE NAVBAR IMPORTS THIS ONE.** It was drawn inline inside `ChatButton`
 * until the Events panel grew an "Unread chats" group and needed the same
 * glyph; a second drawing is exactly the drift the one-icon-per-concept rule
 * forbids, so the navbar's copy was deleted and both now read from here.
 * That makes this the one glyph in the file with a caller outside the console —
 * do not "tidy" it back into `Navbar.tsx`.
 */
export function ChatIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
    />
  );
}

/**
 * Chevrons — table pagination, and the list editor's move-up/move-down.
 *
 * ⚠️ FOUR DIRECTIONS, ONE COMPONENT. The vertical pair are the horizontal pair
 * rotated, and they exist here rather than as a second glyph because "chevron"
 * is one concept: an up-arrow drawn separately is precisely the drift the
 * one-icon-per-concept rule forbids. **Need a diagonal? Add it to this map.**
 */
const CHEVRON: Record<"left" | "right" | "up" | "down", string> = {
  left: "M14.5 6 8.5 12l6 6",
  right: "M9.5 6l6 6-6 6",
  up: "M6 14.5 12 8.5l6 6",
  down: "M6 9.5l6 6 6-6",
};

export function ChevronIcon({
  dir = "right",
  ...props
}: IconProps & { dir?: "left" | "right" | "up" | "down" }) {
  return <Outline {...props} d={CHEVRON[dir]} />;
}

/** Downward caret — the filter dropdowns' affordance. */
export function CaretIcon(props: IconProps) {
  return <Outline {...props} d="m7 10 5 5 5-5" />;
}

// Re-exported so the sidebar can build its list from one import without any
// concept getting a second drawing. These ARE EventIcons' glyphs.
export { CalendarIcon as EventsIcon, PeopleIcon as AttendeesIcon };
