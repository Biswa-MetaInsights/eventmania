"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  What state an event is in — EDITABLE for its organiser, FIXED for everyone
//  else — and the one control that moves it.
//
//  ⚠️ IT IS A CHIP IN THE HERO ROW, NOT A BAND (Gautham, 2026-08-31). It shipped
//  as a full-width strip under the navbar, moved beside the back button, and
//  then to the head of the right-hand cluster — immediately LEFT of the view
//  toggle, where the page's organiser controls now live. **Do not put the band
//  back** — the page carried two stacked full-width bands before this, and a
//  status is a word, not a row.
//
//  ⚠️ IT IS A CONTROL, not a console tag: `HERO_CONTROL` + `HERO_EDGE` from
//  `EventActions`, on the linen ground of the round buttons, 48px tall like
//  everything else in that row, with a `--brand-hint` label that goes green
//  under the pointer — exactly what those buttons do with their glyphs. It is
//  deliberately NOT `ConsoleUI`'s `Pill` (a 16px table tag whose fill is a 12%
//  wash, and a 12% wash over a photograph is no fill at all).
//
//  ⚠️ IT NO LONGER CARRIES A TONE COLOUR (Gautham, 2026-08-31 — it wore
//  `toneColor`, green for published and terracotta for a draft). Matching the
//  row outranked it: four controls side by side, one of them coloured, read as
//  a stray. **The word IS the signal here** — "Draft", "Cancelled" — backed by
//  the hover label. If a warn state ever needs its colour back, bring it back
//  for `draft` and `cancelled` ONLY, and say why here.
//
//  ⚠️ THE SENTENCE MOVED INTO THE HOVER LABEL, shortened. The band could print
//  it permanently; a chip cannot, and the label is how every other control in
//  that row explains itself. It is `EventActions`' own `ActionLabel`, imported —
//  do not restyle a second pill to match it. It is passed `wide` because the
//  copy below is a sentence and that pill does not wrap without it.
//
//  ⚠️ EVERY VISITOR SEES IT NOW (Gautham, 2026-09-01). It was organiser-view
//  only until then. Two shapes, one component:
//    · `view="organiser"` — a SELECT. The trigger carries a caret, the menu
//      lists all four states with their organiser copy, and only the legal
//      transitions out of the current state are enabled (`ALLOWED`).
//    · `view="participant"` — a FIXED chip, participant copy, no menu, no
//      caret, nothing clickable. **Do not give it one.** An organiser
//      previewing the participant view gets this, which is the whole point.
//  A DRAFT renders NOTHING in the participant view — `participant: null` — and
//  that is not an oversight: a participant cannot reach a draft, and a chip
//  reading "only organisers can see this" on a page a participant is looking at
//  says the opposite of what is true.
//
//  ⚠️ `CancelledBanner` on `/event/[id]` STILL EXISTS and is NOT this. The chip
//  is a word in a control row; the banner is the page's full statement to
//  someone holding a ticket, including what to do next. **Do not merge them.**
//
//  ⚠️ "Finished" IS GONE (Gautham, 2026-09-01) — there are four states, not
//  five. The backend enum still has `completed`, so `lifecycleOf` maps it onto
//  `registration_closed`: a finished event is visible and not taking joins,
//  which is exactly what that state says, and the alternative (falling through
//  to the `draft` default) would tell a participant the page is invisible to
//  them while they are reading it.
//
//  ⚠️ "Registration closed" HAS NO BACKEND (Gautham chose frontend-first,
//  2026-09-01). `EventStatus` in `backend/services/event/app/models/event.py`
//  is draft/published/cancelled/completed, and `/event/search` defaults to
//  `status=published` — so a real-mode PATCH would 422, and even if it landed
//  the event would drop out of discovery, which is the opposite of what the
//  state promises. The option is therefore DISABLED off dummy mode with the
//  reason shown, the same shape `lib/event-extras.ts` uses for the authored
//  extras. **When the enum and the search default land, delete
//  `REGISTRATION_CLOSED_IS_LOCAL` and its hint** — TODO.md §23.
//
//  ⚠️ THE STATUS COPY DESCRIBES WHAT IS TRUE, NOT WHAT WILL HAPPEN — with ONE
//  exception, and it is Gautham's own wording (2026-09-01): the cancelled
//  organiser line promises a cancellation notification that **nothing sends**
//  (TODO.md §20), and `CancelEventModal`, one click away, says in as many words
//  that nobody is told. Flagged at the time, kept as specified. **Everything
//  else here must stay descriptive** — no refund claim, no notification claim.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@eventmind/types";
import { eventsSource, isDummyMode } from "@/lib/data-source";
import {
  ActionLabel,
  HERO_CONTROL,
  HERO_EDGE,
  HERO_EDGE_HOVER,
} from "@/components/EventActions";
import { CaretIcon } from "@/components/organizer/ConsoleIcons";

/** The four states an event can be in, as the UI names them.
 *
 *  ⚠️ `live` IS NOT THE STORED VALUE — the backend calls it `published`, and
 *  `STATUS_VALUE` below is the only place that translation happens. Read a row
 *  with `lifecycleOf`, write one with `statusValueOf`, and never compare
 *  `event.status` to a literal. */
export type EventLifecycle = "draft" | "live" | "registration_closed" | "cancelled";

/** UI state → the string written to `event.status`. */
const STATUS_VALUE: Record<EventLifecycle, string> = {
  draft: "draft",
  live: "published",
  registration_closed: "registration_closed",
  cancelled: "cancelled",
};

export function statusValueOf(state: EventLifecycle): string {
  return STATUS_VALUE[state];
}

/**
 * ⚠️ `status` is a bare string on the frontend `Event` type and arrives in
 * whatever case — and whatever separator — the row was written with, so read it
 * through here, never with a bare `===`. Anything unrecognised is treated as a
 * draft: an event whose state we cannot name is one that should not be
 * presented as on sale.
 */
export function lifecycleOf(event: Pick<Event, "status">): EventLifecycle {
  const s = (event.status ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "published" || s === "live") return "live";
  // `completed` folds in here rather than defaulting to draft — see the header.
  if (s === "registration_closed" || s === "completed") return "registration_closed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "draft";
}

/** The word on the chip, and the sentence under it — one per audience.
 *  `participant: null` means participants never see this state at all. */
const COPY: Record<
  EventLifecycle,
  { label: string; organiser: string; participant: string | null }
> = {
  draft: {
    label: "Draft",
    organiser:
      'Only organisers can see this page. Set status to "Live" for participants to find and join it.',
    participant: null,
  },
  live: {
    label: "Live",
    organiser: "The event is visible to participants and open for new joins.",
    participant: "This event is open. You can join it.",
  },
  registration_closed: {
    label: "Registration closed",
    // ⚠️ "Participants who already joined keep their spot." was CUT (Gautham,
    // 2026-09-01). Do not restore it: it is implied by the event staying
    // visible, and it was the sentence that pushed this label to three lines.
    organiser: "The event stays visible to participants, but new participants can no longer join.",
    participant: "This event is no longer accepting new participants.",
  },
  cancelled: {
    label: "Cancelled",
    // ⚠️ The notification is NOT built. Gautham's wording, kept — see header.
    organiser:
      "The event will not happen. All participants who joined will get a cancellation notification.",
    participant: "The organiser has cancelled this event.",
  },
};

/** Menu order — the lifecycle read start to end, not alphabetical. */
const ORDER: readonly EventLifecycle[] = ["draft", "live", "registration_closed", "cancelled"];

/**
 * Which moves are legal from each state.
 *
 * ⚠️ NOTHING LEAVES `cancelled`, and nothing returns to `draft`. Un-cancelling
 * would silently re-open an event whose ticket holders were told it was off,
 * and un-publishing would hide a page from the people already holding a ticket
 * to it. Both are the same mistake: a state change that strands somebody. This
 * matches the round `EventCancelButton`, which is already `disabled` on a
 * cancelled event. **Do not widen this without a plan for the people already in
 * the room.**
 */
const ALLOWED: Record<EventLifecycle, readonly EventLifecycle[]> = {
  draft: ["live", "cancelled"],
  live: ["registration_closed", "cancelled"],
  registration_closed: ["live", "cancelled"],
  cancelled: [],
};

/** See the header: no column, no enum value, no search default. */
const REGISTRATION_CLOSED_IS_LOCAL = isDummyMode;
const REGISTRATION_CLOSED_HINT = "Not available yet — the backend has no such status.";

/**
 * How wide the hover label may grow: it starts at the chip's LEFT edge — lined
 * up with the control it explains (Gautham, 2026-09-01) — and runs right to the
 * browser's right edge, less the page gutter.
 *
 * ⚠️ LEFT-ALIGNED TO THE CHIP IS THE DECISION, and a right-anchored version
 * that grew leftward was built and REJECTED on the same day. It was wider —
 * the chip leads a cluster pinned to the right gutter, so there is more page to
 * its left than to its right — but a label that starts nowhere near the control
 * it belongs to does not read as that control's label. **Do not re-derive the
 * right-anchored one from the width arithmetic; it was tried.**
 *
 * ⚠️ IT HAS TO BE MEASURED, and this is the whole reason why: the label is
 * absolutely positioned inside the chip, so **every length CSS can offer it is
 * relative to the chip, not to the page**. `100vw` is the viewport, but the
 * chip's own x is the missing term — and the chip sits in a cluster that WRAPS,
 * so that x moves with the viewport, the view mode, and even the length of the
 * status word. One `getBoundingClientRect()` answers all of it.
 *
 * ⚠️ Measured in the POINTER HANDLER, never in an effect. `react-hooks/
 * set-state-in-effect` is an eslint ERROR in this repo, and a layout effect here
 * would also measure on every render rather than on the one event that can
 * change the answer.
 */
const LABEL_GUTTER = 16;
const LABEL_MIN_WIDTH = 240;
const LABEL_MAX_WIDTH = 560;

function labelMaxWidth(el: HTMLElement | null): number | undefined {
  if (!el) return undefined;
  const room = window.innerWidth - el.getBoundingClientRect().left - LABEL_GUTTER;
  return Math.min(
    LABEL_MAX_WIDTH,
    // The floor matters where the cluster has wrapped and pushed the chip far
    // right: the honest room can be narrower than any readable pill, and a
    // slight overhang past the gutter beats a two-words-per-line column.
    Math.max(LABEL_MIN_WIDTH, Math.round(room)),
    // …but never wider than the page, or that overhang leaves the viewport and
    // the hero's `overflow-hidden` eats it.
    Math.round(window.innerWidth - 2 * LABEL_GUTTER),
  );
}

export function EventStatusChip({
  event,
  view = "organiser",
  onPublish,
  onCancel,
}: {
  event: Event;
  /** Which side of the page is looking. Fixed for a participant. */
  view?: "organiser" | "participant";
  /** Draft → Live goes through `PublishEventModal`, owned by the page. Absent =
   *  the move is offered but does nothing, so pass it whenever `view` is
   *  organiser. */
  onPublish?: () => void;
  /** → Cancelled goes through `CancelEventModal`, same ownership. */
  onCancel?: () => void;
}) {
  const state = lifecycleOf(event);

  if (view === "participant") return <FixedStatusChip state={state} />;

  return (
    <div className="flex items-center gap-2.5">
      <StatusSelect event={event} state={state} onPublish={onPublish} onCancel={onCancel} />

      {/* ⚠️ THE GREEN BUTTON STAYS, even though the select can now make the same
          move (Gautham, 2026-09-01). A draft's whole purpose is to become live,
          and burying the one action the page exists for inside a menu makes an
          organiser hunt for it. The menu is the complete list of states; this is
          the obvious next one. Both land in `PublishEventModal`. */}
      {state === "draft" && onPublish && (
        <button
          type="button"
          onClick={onPublish}
          // Colours as CLASSES, not an inline style — an inline colour outranks
          // the `hover:` rule and the darker fill would never appear. Fourth
          // time this has bitten the repo; see CLAUDE.md's hover section.
          className={`${HERO_CONTROL} shrink-0 rounded-lg px-4 py-[11px]
                      bg-[var(--brand-green)] text-[var(--brand-on-green)]
                      hover:bg-[var(--brand-green-hover)]`}
          style={{ border: HERO_EDGE }}
        >
          Publish event
        </button>
      )}
    </div>
  );
}

// ── The participant's chip ────────────────────────────────────────────────────

/** Identical chrome to the organiser's trigger MINUS the caret and the button —
 *  same height, same edge, same hover tone — so the two views do not read as two
 *  different controls when an organiser flips between them. */
function FixedStatusChip({ state }: { state: EventLifecycle }) {
  const [hovered, setHovered] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const text = COPY[state].participant;

  // A draft has nothing honest to say to a participant. See the header.
  if (!text) return null;

  return (
    <div
      className="relative flex items-center"
      ref={root}
      onMouseEnter={() => {
        setWidth(labelMaxWidth(root.current));
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <ActionLabel side="bottom-start" wide maxWidth={width}>
          {text}
        </ActionLabel>
      )}
      <span
        className={`${HERO_CONTROL} inline-flex items-center rounded-lg px-3.5 py-[11px]`}
        style={{
          color: hovered ? "var(--brand-green)" : "var(--brand-hint)",
          backgroundColor: "var(--brand-surface)",
          border: hovered ? HERO_EDGE_HOVER : HERO_EDGE,
        }}
      >
        {COPY[state].label}
      </span>
    </div>
  );
}

// ── The organiser's select ────────────────────────────────────────────────────

/**
 * The trigger is the chip; the menu is `FilterSelect`'s, deliberately — same
 * radius, same surface, same `--brand-nav-border` hairline, same close-on-
 * outside-pointerdown-and-Escape. It is NOT that component because the trigger
 * has to be the hero row's 48px `HERO_CONTROL` chip rather than the console's
 * `nf-chip`, and a `trigger` render-prop to bridge two surfaces is more machinery
 * than the shared body is worth. **If a third select ever needs the hero chrome,
 * that is the point at which to extract one.**
 *
 * ⚠️ THE SELECTION IS A FILLED ROW, AND NO ROW TAKES A HOVER COLOUR
 * (Gautham, 2026-09-01). The picked option takes the solid
 * `--brand-green` / `--brand-on-green` body — the app's own hover treatment,
 * spent here on *state* instead — and the tick that used to mark it is gone,
 * along with green label text and `transition-colors`. **That is why there is no
 * hover fill: it would be the identical green**, so pointing at an unpicked row
 * would make it look picked. `FilterSelect`'s menu still hovers because its
 * selection is only tinted text; **do not "restore" this one to match it.**
 * The pointer is answered by the DESCRIPTION appearing instead — see the row.
 *
 * ⚠️ Colour is still CLASSES, not an inline `style`, even with no `hover:` rule
 * left to lose — the trap written up on `FeatureBand`'s audience badge,
 * `FilterSelect`'s menu and the console's rows. Keep it that way, or the next
 * person to add a pointer state here inherits a dead one.
 */
function StatusSelect({
  event,
  state,
  onPublish,
  onCancel,
}: {
  event: Event;
  state: EventLifecycle;
  onPublish?: () => void;
  onCancel?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const setStatus = useMutation({
    mutationFn: (next: EventLifecycle) =>
      eventsSource
        .update(String(event.id), { status: statusValueOf(next) })
        .then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["event", String(event.id)], updated);
      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
    },
    onError: () => {
      // The error takes the label's slot, and it can land with the pointer
      // elsewhere — so measure here too rather than relying on a hover that
      // may never come.
      setWidth(labelMaxWidth(root.current));
      setError("Could not change the status. Please try again.");
    },
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** ⚠️ The two CONFIRMED moves keep their dialogs. Publishing warns about a
   *  zero capacity and cancelling lists what it does not do; routing them
   *  through a one-click menu item would drop both warnings on the floor. */
  function choose(next: EventLifecycle) {
    setOpen(false);
    setError(null);
    if (next === state) return;
    if (next === "cancelled") return onCancel?.();
    if (next === "live" && state === "draft") return onPublish?.();
    setStatus.mutate(next);
  }

  function reasonFor(option: EventLifecycle): string | null {
    if (option === state) return null;
    if (option === "registration_closed" && !REGISTRATION_CLOSED_IS_LOCAL)
      return REGISTRATION_CLOSED_HINT;
    if (!ALLOWED[state].includes(option)) {
      return state === "cancelled"
        ? "A cancelled event cannot be reopened."
        : "Not a move this event can make from here.";
    }
    return null;
  }

  const pending = setStatus.isPending;
  const lit = hovered || open;

  return (
    <div className="relative flex items-center" ref={root}>
      {/* Suppressed while the menu is open — the menu drops into exactly the
          space the label occupies, and two overlapping explanations of the same
          control is worse than either. The error takes the same slot, because a
          failed save has to say so somewhere and the chip has no room. */}
      {(error || (hovered && !open)) && (
        <ActionLabel side="bottom-start" wide maxWidth={width}>
          {error ?? COPY[state].organiser}
        </ActionLabel>
      )}

      <button
        type="button"
        aria-label="Event status"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen((o) => !o);
        }}
        onMouseEnter={() => {
          setWidth(labelMaxWidth(root.current));
          setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        className={`${HERO_CONTROL} inline-flex items-center gap-2 rounded-lg px-3.5 py-[11px] disabled:opacity-60`}
        style={{
          color: lit ? "var(--brand-green)" : "var(--brand-hint)",
          backgroundColor: "var(--brand-surface)",
          border: lit ? HERO_EDGE_HOVER : HERO_EDGE,
        }}
      >
        {pending ? "Saving…" : COPY[state].label}
        {/* Wrapped, not styled directly: IconProps takes className and colour
            only — the same wrapper `FilterSelect` uses for this caret. */}
        <span className={`inline-flex transition-transform ${open ? "rotate-180" : ""}`}>
          <CaretIcon className="w-4 h-4 shrink-0" />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Event status"
          // `left-0`, not `right-0`: the chip is the LEFTMOST member of a cluster
          // pinned to the right gutter, and a menu this wide anchored right runs
          // off the hero's `overflow-hidden` edge at 1024px and below.
          // `px-1.5` insets the rows so the selected one's green fill sits
          // INSIDE the menu's `rounded-lg` corners instead of squaring them off;
          // the row's own `rounded-md` nests one step tighter, which is
          // CLAUDE.md's rule for an item inside a rounded track.
          className="absolute top-full left-0 mt-1.5 p-1.5 rounded-lg shadow-xl w-[min(340px,80vw)] z-40"
          style={{
            backgroundColor: "var(--brand-surface)",
            border: "1px solid var(--brand-nav-border)",
          }}
        >
          {ORDER.map((option) => {
            const on = option === state;
            const reason = reasonFor(option);
            const blocked = !on && reason !== null;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={on}
                disabled={blocked}
                onClick={() => choose(option)}
                className={`group block w-full text-left rounded-md px-4 py-2.5
                            ${blocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                            ${on
                              ? "bg-[var(--brand-green)] text-[var(--brand-on-green)]"
                              : "text-[var(--brand-text)]"}`}
              >
                <span className="block text-[17px] font-semibold">{COPY[option].label}</span>
                {/* ⚠️ ON HOVER ONLY (Gautham, 2026-09-01) — the menu is four
                    words at rest, and the sentence is there when you ask for it.
                    It is ALSO the row's only pointer feedback now that the green
                    fill belongs to the selection, which is what makes a menu
                    with no hover colour still answer the pointer.

                    ⚠️ The row GROWS DOWNWARD, which is what keeps this stable:
                    the hovered row is the one that expands, so the pointer stays
                    inside it, and the rows below merely shift down. Moving
                    between rows, the one you left collapses by ~22px while the
                    one you entered expands to ~48px — the pointer lands well
                    inside it either way. **Do not reserve the space instead**:
                    that is the compact menu this replaced.

                    `hidden` + `group-hover:block` is an ordinary pseudo-class
                    variant, emitted after the plain utility — not the media-
                    variant sort trap CLAUDE.md documents on breakpoints.

                    The description INHERITS the row's colour rather than setting
                    its own, so it goes linen with the label on the green fill
                    instead of staying dark on green.

                    On a device with NO hover (`hover: none`) it is simply always
                    shown: a finger cannot hover, so the menu would otherwise be
                    four bare words, and a row that grows under the finger that
                    tapped it is worse than a taller menu. */}
                <span className="hidden group-hover:block [@media(hover:none)]:block text-[15px] leading-snug opacity-80">
                  {reason ?? COPY[option].organiser}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
