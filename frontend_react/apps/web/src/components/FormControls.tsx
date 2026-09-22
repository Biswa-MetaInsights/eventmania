"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The form primitives: a labelled field with an optional hint and error, and
//  the input class string every text/select/textarea in a form wears.
//
//  Lifted out of `app/organizer/create/page.tsx`, which is where they were born
//  and which now imports them from here. The organiser's edit dialog needs the
//  same field twice over, and a second copy of `inputCls` is exactly how two
//  forms that should be indistinguishable start drifting.
//
//  ⚠️ These are the FORM controls, not the console's. `ConsoleUI.tsx` owns the
//  organiser console's own shapes (cards, tabs, filter selects) and does not
//  read from here.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, ClockIcon } from "./EventIcons";
import { hoverCapable } from "@/lib/pointer";

/**
 * ⚠️ EVERY ANNOTATION IS BRACKETED TERRACOTTA (Gautham, 2026-09-09). A field
 * says "(required)" or "(optional)" — one or the other, never neither — and an
 * aside about how to fill it in ("leave blank for the default photo",
 * "comma-separated") is the same bracketed orange, so the two kinds of
 * annotation read as one system rather than as grey noise beside the label.
 * Pass a hint WITHOUT its brackets; this renders them.
 *
 * ⚠️ WHERE it sits is a breakpoint rule as of 2026-09-11 — under the label from
 * `lg`, beside it below — and the reasoning is on `heading` in `FormField`.
 *
 * ⚠️ The `*` this replaced (2026-09-08 → 2026-09-09) is GONE, and so is the
 * legend on `/organizer/create` that had to explain it. A word says what it
 * means where it is; a symbol sends the reader to a key at the top of the page.
 * **Do not reinstate the asterisk.**
 *
 * Terracotta rather than green because green is the *chosen* state everywhere
 * else in these forms (a picked chip, a selected format) — an annotation that
 * wore it would read as a selection.
 */
/**
 * How much room a control is ALLOWED, as a cap — never a fixed width, so a
 * narrow column still shrinks it.
 *
 * ⚠️ SIX SIZES, AND THAT IS THE POINT (Gautham, 2026-09-09). A form whose every
 * input stretches to the column is a wall of identical bars that says nothing
 * about what goes in them; a form where each input is measured to its own
 * content is a ragged edge. Six widths, reused, gives an input a length that
 * means something while still lining up down the page. **Pick the nearest size;
 * do not add a seventh.**
 *
 *   xxs a menu whose longest choice is one word — language
 *   xs  a number, a date, a time, or a short menu — capacity, price, category,
 *       the start day and the start time
 *   sm  a longer menu, a short phrase, or a segmented control — city, currency,
 *       duration, tags, a URL, the event type switch
 *   smd a longer typed phrase — the organisation name
 *   md  a title
 *   lg  a sentence or longer — the description
 *
 * ⚠️ EVERY WIDTH HERE IS MEASURED, NOT CHOSEN (Gautham, 2026-09-11), and the
 * three small steps were cut to the millimetre on 2026-09-11 so that Event Type
 * could join the title line. A `<select>` shows the option that is CHOSEN, not
 * the default, so its step has to clear the longest one in the list or a real
 * choice ends up ellipsised. In Roboto 15, inside `inputCls`'s 16px padding and
 * with ~16px left for the native arrow, the binding cases are:
 *
 *   xxs 132  "Portuguese" 77            xs  176  "Health & Wellness" 121
 *   sm  240  "A$ AUD — Australian Dollar" 181, "Thiruvananthapuram, IN" 160,
 *            and "In-Person" across three equal segments, ~205 of track
 *
 * ⚠️ `smd` IS THE ONE STEP THAT IS NOT A MEASURED MINIMUM (Gautham,
 * 2026-09-11). It exists because the organisation name asked for more room than
 * `sm` and `md` was the next thing on the scale — a 75% jump for a field that
 * wanted a little. 320 is `sm` plus one comfortable phrase, and it is the only
 * step here sized by what a field is worth rather than by what a menu needs.
 * **A `<select>` does not belong at this step:** a menu's step is set by its
 * longest option, so measure it and take `sm` or `md`.
 *
 * **Measure before you move anything down a step.** The lists are in
 * `lib/event-options.ts` and `packages/store/src/location-store.ts` — the city
 * menu is why that second file matters, and why it is the one short menu at
 * `sm`.
 *
 * An ADDRESS takes no `width` at all: it is the one field with no natural
 * length, so it grows into whatever the rest of its line leaves.
 */
export type FieldWidth = "xxs" | "xs" | "sm" | "smd" | "md" | "lg";

const WIDTH: Record<FieldWidth, string> = {
  xxs: "max-w-[132px]",
  xs: "max-w-[176px]",
  sm: "max-w-[240px]",
  smd: "max-w-[320px]",
  md: "max-w-[420px]",
  lg: "max-w-[560px]",
};

/**
 * The same sizes as DEFINITE widths, for the inline layout's flex row.
 *
 * ⚠️ A cap is not enough there and that is the whole point (Gautham,
 * 2026-09-09). A flex item with `max-width` alone is sized by its content, and
 * the content is a `w-full` input whose intrinsic width is ~20 characters — so
 * the sizes would stop meaning anything and the row would come out ragged.
 * A definite width makes the item exactly as wide as its size says, which is
 * what lets the fields pack left with an even gap between them.
 */
const INLINE_WIDTH: Record<FieldWidth, string> = {
  xxs: "lg:w-[132px]",
  xs: "lg:w-[176px]",
  sm: "lg:w-[240px]",
  smd: "lg:w-[320px]",
  md: "lg:w-[420px]",
  lg: "lg:w-[560px]",
};

export function FormField({
  label,
  hint,
  hintBelow,
  required,
  optional,
  error,
  inline,
  labelColumn,
  width,
  children,
}: {
  label: string;
  hint?: string;
  /**
   * Put the hint on its OWN line under the label rather than beside it.
   *
   * For a hint that changes as you type — the description's `0/1000` counter —
   * where sitting beside the label means the label shifts left and right by a
   * character as the count crosses 9, 99, 999. Below it, the label holds still.
   * (Gautham, 2026-09-09.)
   */
  hintBelow?: boolean;
  /** Renders "(required)", and puts the annotation on its own line from `lg`.
   *  Reserve it for a field `validate()` actually blocks on — a marked field
   *  the form would happily accept empty is a lie. A `<select>` that always
   *  holds a value counts: it cannot be submitted empty, so the mark is true. */
  required?: boolean;
  /**
   * Renders "(optional)", the same bracketed terracotta and the same placement
   * as `required`.
   *
   * ⚠️ EVERY FIELD SAYS ONE OR THE OTHER (Gautham, 2026-09-11). Marking only
   * the required ones leaves the rest ambiguous — an organiser cannot tell a
   * field nobody has marked from one somebody forgot to mark. Pass this rather
   * than `hint="optional"`: a hint sits beside the label on narrow screens and
   * would break the alignment `required` keeps.
   */
  optional?: boolean;
  error?: string;
  /**
   * Label BESIDE the control instead of above it, from `lg` up (Gautham,
   * 2026-09-09).
   *
   * ⚠️ OPT-IN, AND IT STAYS OPT-IN. `/organizer/create` is a wide, standalone
   * page and turns it on for every field; `EditEventModal` is a narrow dialog
   * where a 180px label column would leave the inputs unusable, so it keeps the
   * stacked default. Anything rendered in BOTH — `CoverImageField`, the agenda
   * and FAQ row editors — forwards this as a prop rather than deciding for
   * itself, so the dialog is never dragged along by the page.
   *
   * Below `lg` this collapses back to the stacked layout: two columns of fields
   * on a tablet leave ~300px per field, which is the label column plus nothing.
   */
  inline?: boolean;
  /**
   * Put the inline label in a FIXED 180px column instead of letting it hug its
   * control (Gautham, 2026-09-09).
   *
   * ⚠️ HUGGING IS THE DEFAULT, AND THE DEFAULT IS THE RULE. A label parked in a
   * fixed column leaves up to 140px of nothing between a short word like "City"
   * and the menu it names, and on a row of two or three fields that dead space
   * reads as though the control belongs to the NEXT label along. Hugging, plus a
   * wide gap between fields, groups each label with its own control instead.
   *
   * Turn it on only where several inline fields are STACKED one above another
   * and nothing shares their line — the agenda and FAQ row editors — so their
   * inputs start on one left edge. On a row of side-by-side fields it is the bug
   * described above; do not set it there.
   */
  labelColumn?: boolean;
  /** How wide the control may grow — a cap when stacked, the field's actual
   *  width when inline. Omit for a control that should take the rest of its line
   *  — a band of chips, a description box. See `FieldWidth`. */
  width?: FieldWidth;
  children: React.ReactNode;
}) {
  /* "(required)" / "(optional)" leads, then the hint — the one thing that
     decides whether the organiser must stop here comes before the aside about
     how to fill it in. `required` wins if a caller passes both, because a field
     cannot be neither and a stray `optional` must not soften a blocking one. */
  const notes = [
    required ? "required" : optional ? "optional" : null,
    hint ?? null,
  ].filter(Boolean) as string[];

  /* An annotated field puts its annotation on its own line — see the placement
     note below for why that is a `lg:` rule and not an unconditional one. */
  const below = hintBelow || !!required || !!optional;

  /* ⚠️ flex-WRAP, not a plain row: a hint of any length ("comma-separated,
     helps with search") otherwise squeezes the label beside it into two words
     per line. It takes its own line instead.
   *
   * ⚠️ THE ANNOTATION DROPS TO ITS OWN LINE ONLY FROM `lg` (Gautham,
   * 2026-09-11). From `lg` the label sits BESIDE its control, so "(required)"
   * on the label's line pushes the control right and breaks the row — that is
   * the whole reason it was stacked in the first place. Below `lg` none of that
   * is true: the label is already on its own line above a full-width input, and
   * stacking there buys nothing while adding a line of height to every field on
   * the page. So it rides beside the label on phones and tablets and drops
   * underneath on a full screen. **Do not "simplify" this back to one
   * unconditional `flex-col`.** */
  const heading = (
    <div
      className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${
        below ? "lg:flex-col lg:flex-nowrap lg:items-start" : ""
      }`}
    >
      <label className="text-sm font-semibold" style={{ color: "var(--brand-text)" }}>
        {label}
      </label>
      {notes.length > 0 && (
        <span className="flex flex-wrap gap-x-2 text-xs" style={{ color: "var(--brand-terracotta)" }}>
          {notes.map((n) => (
            <span key={n}>({n})</span>
          ))}
        </span>
      )}
    </div>
  );

  const message = error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>;
  const capped = width ? WIDTH[width] : "";

  if (inline) {
    /* No `width` means "take what is left of the line" — the description, the
       audience chips, an address.

       ⚠️ THE GROW GOES ON THE FIELD, NOT ON THE CONTROL (Gautham, 2026-09-09).
       It sat on the inner track until then, where it did nothing a caller could
       see: the field itself is the flex item of the enclosing row, so a track
       growing inside a content-sized field only ever filled a box already
       measured to its own content. The venue address is the field this was
       written for and it was coming out ~150px wide on a line with 900px spare.
       The inner `lg:grow` is what hands the field's leftover width to the
       control rather than to the label beside it.

       `basis` rather than a bare `grow`: a grow-only item starts at zero, so
       flex-wrap would squeeze it onto a line it does not belong on and only then
       let it expand. 420px is what it asks for before the row breaks; the growth
       is what it does with the leftovers. */
    const track = width ? INLINE_WIDTH[width] : "lg:grow";
    const field = width ? "" : "lg:grow lg:basis-[420px] min-w-0";

    return (
      // `items-start` + the label's own top padding rather than `items-center`:
      // the control beside it may be a five-row textarea or a wrapped band of
      // chips, and a vertically centred label against those reads as unattached.
      // `pt-3` is `inputCls`'s own `py-3`, so the two texts sit on one line.
      <div
        className={`grid grid-cols-1 gap-x-2.5 gap-y-2 lg:items-start ${
          labelColumn ? "lg:grid-cols-[180px_minmax(0,1fr)]" : `lg:flex ${field}`
        }`}
      >
        {/* Capped so that one long label ("Capacity (max attendees)") wraps to a
            second line instead of pushing its own input off the row. */}
        <div className={`lg:pt-3 ${labelColumn ? "" : "lg:shrink-0 lg:max-w-[240px]"}`}>
          {heading}
        </div>
        {/* min-w-0: without it a long placeholder or a `datetime-local` widens
            this track past its share and pushes the field out of the card. */}
        <div className={`min-w-0 space-y-1 w-full ${capped} ${labelColumn ? "" : track}`}>
          {children}
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {heading}
      <div className={`min-w-0 space-y-1 ${capped}`}>
        {children}
        {message}
      </div>
    </div>
  );
}

/* `RequiredStar` lived here until 2026-09-09 and went with the asterisk it
   drew. `/organizer/create`'s subtitle used it for a legend explaining what the
   symbol meant; a spelt-out "(required)" needs no legend, so both are gone. */

/**
 * The bordered card one group of fields sits in — "Event Basics", "Company
 * Details". `optional` marks a section the organiser may skip entirely, said
 * once in the heading rather than on every field inside it: terracotta and
 * bracketed, the same treatment `FormField` gives a note.
 *
 * ⚠️ LIFTED OUT OF `/organizer/create` ON 2026-09-11, when `/organizer/onboarding`
 * was rebuilt to look exactly like it (Gautham). Two pages wearing the same
 * card from two copies of these classes is how they drift; both import this.
 *
 * ⚠️ The card edge matches `/explore`'s filter panel exactly — 2px
 * `--brand-control-border`, `rounded-lg` — and matches `inputCls` inside it.
 * See the note on `inputCls`: on linen the 1px `--brand-border` these used to
 * wear is 1.24:1 and effectively invisible. Move all three together.
 */
export function FormSection({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-5 sm:p-6 space-y-5"
      style={{ backgroundColor: "var(--brand-bg)", border: "2px solid var(--brand-control-border)" }}
    >
      <h2 className="text-[18px] font-bold" style={{ color: "var(--brand-text)" }}>
        {title}
        {optional && (
          <span className="ml-2 font-medium" style={{ color: "var(--brand-terracotta)" }}>(Optional)</span>
        )}
      </h2>
      {children}
    </div>
  );
}

/**
 * A row of inline fields inside a `FormSection`.
 *
 * ⚠️ THE TWO GAPS ARE THE DESIGN (Gautham, 2026-09-09). A label sits 10px from
 * the control it names (`FormField`'s own gap) and 32px from the next field
 * along, so the eye groups each label with its own input rather than with
 * whatever happens to sit to its left. **Keep the field gap at least three times
 * the label gap** — close them up and the row reads as one undifferentiated
 * strip of boxes, which is what it did when every field was stretched to a third
 * of the card.
 *
 * ⚠️ BOTH CAME DOWN TOGETHER, 12/40 → 10/32, AND THAT IS WHY (Gautham,
 * 2026-09-11). Event Type joining the title line needed ~70px that the field
 * widths alone could not give back; the ratio is what had to survive the trim,
 * not the numbers. **If you ever need width again, move both or neither** — 32px
 * beside a 12px label gap is 2.7× and reads as the undifferentiated strip above.
 *
 * Grid below `lg`, flex-wrap above it: only the wide layout puts a label beside
 * its control, and only there does packing left mean anything. Fields that need
 * a whole line of their own take `lg:w-full`; the grid half still reads
 * `sm:col-span-N`.
 *
 * ⚠️ Takes the tablet column count as an ARGUMENT rather than letting a section
 * append its own `sm:grid-cols-3`. Two conflicting column utilities on one
 * element are decided by their order in the compiled stylesheet, not by the
 * order they were written in — the trap `CLAUDE.md` documents for breakpoints,
 * and it applies to any two utilities setting the same property.
 *
 * Lifted out of `/organizer/create` with `FormSection`, for the same reason.
 */
export const formRow = (sm: "sm:grid-cols-2" | "sm:grid-cols-3" = "sm:grid-cols-2") =>
  `grid grid-cols-1 ${sm} gap-x-5 gap-y-6 lg:flex lg:flex-wrap lg:gap-x-8`;

/**
 * ⚠️ 2px `--brand-control-border`, NOT 1px `--brand-border` (Gautham,
 * 2026-09-09). A form input outlined in `--brand-border` measures 1.24:1
 * against linen — on a page whose surface and background are the same colour it
 * is very nearly invisible, which is what prompted this. `/explore`'s own filter
 * inputs and its filter panel already wear exactly this edge, so forms now match
 * the reference surface rather than inventing a third weight.
 *
 * **The whole page moves together or not at all.** An input at 2px inside a card
 * at 1px reads as a mistake, so the cards on `/organizer/create` carry the same
 * edge. Keep them in step.
 */
export function inputCls(hasError: boolean): string {
  return (
    "w-full px-4 py-3 rounded-lg text-sm transition-colors border-2 " +
    "placeholder:text-[var(--brand-muted)] focus:outline-none focus:ring-2 resize-none " +
    (hasError
      ? "border-red-400 bg-red-50 focus:ring-red-200"
      : "border-[var(--brand-control-border)] bg-[var(--brand-bg)] text-[var(--brand-text)] focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)]")
  );
}

/** The leading glyph's own width plus the field's `px-4`, so the text starts
 *  clear of it. Exported because `/organizer/create`'s Duration menu wears the
 *  same clock over a `select`, which is not an input and so cannot use the
 *  component below. */
export const GLYPH_PAD = "pl-10";

/** Where the glyph sits in any field that carries one. */
export const GLYPH_POS = "absolute left-4 top-1/2 -translate-y-1/2 flex";

/**
 * A date / time / datetime field wearing the APP'S calendar and clock rather
 * than the browser's.
 *
 * ⚠️ ONE GLYPH PER CONCEPT (Gautham, 2026-09-11). Chrome paints its own grey
 * picker indicator inside every `type="date"`, `type="time"` and
 * `type="datetime-local"` field, which is how the forms ended up showing a
 * different calendar from the one on the event cards, on `/event/[id]` and in
 * the dashboard. The native indicator is hidden and `EventIcons`' calendar or
 * clock is drawn on the left instead — the same two glyphs the whole app uses
 * for a date and a time. **Do not hand-draw another one.**
 *
 * Hiding the indicator takes the picker's only click target with it, so the
 * glyph opens it via `showPicker()`. That is guarded: it throws where the
 * browser has no picker, and the field still accepts a typed value there.
 * Keyboard users reach the picker exactly as before, so the glyph is
 * `aria-hidden` and not a tab stop.
 *
 * ⚠️ A TIME FIELD OPENS A ROUND CLOCK, NOT THE BROWSER'S PICKER AND NOT A
 * LIST (Gautham, 2026-09-11). Clicking anywhere in a `type="time"` field — the
 * box or the glyph — drops `ClockFace` under it: the Material-style dial where
 * you click an hour on the ring, the ring flips to minutes, and you click a
 * minute. Before this, a click only lit one of the native hour/minute segments
 * and nothing visibly opened; `showPicker()` gave Chrome's grey list, Firefox
 * nothing and Safari nothing. **A dropdown list of quarter-hours was tried the
 * same day and rejected** — he asked for the clock. The native input stays
 * underneath, so a time can still be TYPED, and the value on the wire is still
 * `HH:mm`.
 *
 * ⚠️ 12-HOUR OR 24-HOUR IS THE BROWSER'S CALL, NOT OURS. The dial follows the
 * locale's hour cycle (`Intl`), which is what the native field beside it
 * already prints — twelve numbers plus an AM/PM switch on an en-IN or en-US
 * machine, the two-ring 24-hour dial on an en-GB or German one. Hard-coding
 * either would put the clock in a different cycle from the box it fills in.
 *
 * ⚠️ MOUSE ONLY. Under a finger the clock is not built: a phone already opens
 * its own dial or wheel the moment a time input is tapped, and a second one
 * behind it would be two pickers for one field. `hoverCapable()` is the gate.
 */
export function DateTimeInput({
  type,
  value,
  onChange,
  min,
  hasError = false,
}: {
  type: "date" | "time" | "datetime-local";
  value: string;
  onChange: (v: string) => void;
  /** Earliest allowed value — the edit dialog pins the end after the start. */
  min?: string;
  hasError?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const Glyph = type === "time" ? ClockIcon : CalendarIcon;
  const hasClock = type === "time";

  function showNative() {
    try {
      ref.current?.showPicker();
    } catch {
      /* no picker here — the field still accepts a typed value */
    }
  }

  /* The clock is the desktop answer; the native picker is the touch one. */
  function openPicker() {
    if (hasClock && hoverCapable()) setOpen(true);
    else showNative();
  }

  function close() {
    setOpen(false);
    // Put focus back on the field so Tab carries on from here rather than
    // from the document body.
    ref.current?.focus();
  }

  /* Read on the client at mount: the hour cycle is the BROWSER's locale, and a
     module-scope value would be computed once on the server with Node's. Only
     the clock reads it, and the clock is never server-rendered. */
  const twelveHour = useMemo(() => localeIsTwelveHour(), []);
  const [h, m] = value ? value.split(":").map(Number) : [NaN, NaN];

  return (
    <div className="relative" ref={root}>
      <span
        aria-hidden="true"
        onClick={openPicker}
        className={`${GLYPH_POS} cursor-pointer`}
        style={{ color: "var(--brand-hint)" }}
      >
        <Glyph />
      </span>
      <input
        ref={ref}
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        // A click in the box opens the clock where there is one; on touch the
        // tap has already opened the native picker, so nothing to add.
        onClick={hasClock ? () => { if (hoverCapable()) setOpen(true); } : undefined}
        aria-haspopup={hasClock ? "dialog" : undefined}
        className={`${inputCls(hasError)} ${GLYPH_PAD} [&::-webkit-calendar-picker-indicator]:hidden`}
      />

      {open && (
        <ClockFace
          hour={Number.isNaN(h) ? null : h}
          minute={Number.isNaN(m) ? null : m}
          twelveHour={twelveHour}
          anchor={root}
          onChange={(hh, mm) => onChange(`${pad2(hh)}:${pad2(mm)}`)}
          onClose={close}
        />
      )}
    </div>
  );
}

/* ── The clock ─────────────────────────────────────────────────────────────── */

/** Dial geometry, in px. The face is `DIAL` square; the numbers sit on a ring
 *  `OUTER` from the centre (the 24-hour dial adds a second ring at `INNER`),
 *  each in a `TIP`-wide circle — the same circle the hand ends in. */
const DIAL = 232;
const OUTER = 96;
const INNER = 62;
const TIP = 36;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Whether the browser's locale writes the time of day with AM/PM. */
function localeIsTwelveHour(): boolean {
  const r = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
  return r.hour12 ?? (r.hourCycle === "h12" || r.hourCycle === "h11");
}

/**
 * A round clock to pick a time on — the Material Design time picker, which is
 * the one every Android phone and Google product shows and the one Gautham
 * asked for by name (2026-09-11).
 *
 * How it reads: the header is the time so far, hours and minutes as two big
 * figures; the one being set is green, and clicking the other flips the dial
 * to it. With `twelveHour` an AM/PM switch stands beside them; without it the
 * dial has two rings (13–00 inside). The dial shows the hours with a hand from
 * the centre to the chosen one; click an hour and the ring becomes minutes, in
 * fives; click a minute and the clock closes. The value is written on every
 * click, so the field behind it updates live and closing early — Escape, a
 * click outside — loses nothing.
 *
 * ⚠️ IT IS ALSO THE DURATION FIELD'S CLOCK (Gautham, 2026-09-11) — he asked for
 * the same clock on both. `units` is that mode: the two-ring face reads as
 * 0–23 HOURS rather than as a time of day, the header captions its figures
 * "hours" / "minutes", and there is no AM/PM. A length past 23 hours is typed
 * into the field, not dialled — a ring of twelve cannot say "26", and the
 * hand simply stays off the face while the hours box holds such a number.
 *
 * Closing is the clock's own job: outside pointerdown, Escape and Tab call
 * `onClose` — the same recipe as `FilterSelect` and `EventStatus`. `anchor` is
 * the field it hangs under, so a click on that field (or on the clock, which
 * sits inside it) is not "outside".
 *
 * Any point on the dial is a valid click, not just the numbers: the angle from
 * the centre decides. A press snaps to the nearest number; a DRAG in minute
 * mode moves the hand one minute at a time, which is how 10:07 is set without
 * typing it. Pointer capture keeps the drag alive when the pointer leaves the
 * face.
 *
 * ⚠️ `rounded-full` IS THE FACE, NOT A BUTTON SHAPE. The dial, the centre dot
 * and the hand's tip are the geometry of a clock — a hand that rotates has to
 * end in a circle — and they sit with the slider handles and switch knobs the
 * shape rule already allows, not with the labelled pills it forbids. The
 * numbers under the tip carry no shape of their own. Only the AM/PM switch is
 * a labelled control, and it is `rounded-lg`.
 *
 * ⚠️ THE FACE IS SOLID BRAND GREEN WITH LINEN NUMBERS (Gautham, 2026-09-11) —
 * he asked for exactly that, over the 8% wash it opened with. So the hand, its
 * tip and the centre dot are linen (`--brand-on-green`) to stand off the face,
 * and the chosen number turns GREEN where the linen tip covers it. The inner
 * 24-hour ring is the same linen at 70%, so the two rings read as two. Nothing
 * on the face hovers, so its inline `style` colours are safe — the hover trap
 * `apps/web/CLAUDE.md` warns about needs a `hover:` rule to beat.
 */
export function ClockFace({
  hour: h,
  minute: m,
  twelveHour,
  units = false,
  anchor,
  onChange,
  onClose,
}: {
  /** What the field holds so far; `null` for an empty box. */
  hour: number | null;
  minute: number | null;
  /** Twelve numbers and an AM/PM switch, or the two-ring 24-hour face. */
  twelveHour: boolean;
  /** Duration mode — see the note above. Implies the 24-hour face. */
  units?: boolean;
  /** The field the clock hangs under; a click inside it does not close the clock. */
  anchor: React.RefObject<HTMLElement | null>;
  onChange: (hour: number, minute: number) => void;
  /** The minute has been chosen, or the organiser has clicked away. */
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const dial = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const hourKnown = h !== null;
  const minuteKnown = m !== null;
  const pm = twelveHour && hourKnown && h >= 12;
  // A typed duration past the face's 23 hours has no number to point at.
  const hourOnFace = hourKnown && (twelveHour || h < 24);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!anchor.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  function commit(hour: number, minute: number) {
    onChange(hour, minute);
  }

  /** The hour or minute under the pointer, from its angle round the centre. */
  function readPointer(e: React.PointerEvent, minuteStep: number) {
    const el = dial.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // 0° at twelve o'clock, clockwise.
    const deg = (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;

    if (mode === "hour") {
      const idx = Math.round(deg / 30) % 12; // 0 is the "12" position
      let hour: number;
      if (twelveHour) {
        hour = idx + (pm ? 12 : 0);
      } else {
        // Two rings: outer 12, 1–11; inner 00, 13–23 — the Android layout.
        const inner = Math.hypot(dx, dy) < (OUTER + INNER) / 2;
        hour = inner ? (idx === 0 ? 0 : idx + 12) : idx === 0 ? 12 : idx;
      }
      commit(hour, m ?? 0);
    } else {
      const minute = (Math.round(deg / (6 * minuteStep)) * minuteStep) % 60;
      commit(h ?? 0, minute);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault(); // keep focus where it is; nothing here takes it
    dial.current?.setPointerCapture(e.pointerId);
    dragging.current = true;
    readPointer(e, 5);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragging.current) readPointer(e, 1);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (mode === "hour") setMode("minute");
    else onClose();
  }

  /* The numbers on the ring(s). `on` is the one the hand points at. A duration
     reads "3" and "14", a time of day "03" and "14". */
  const fmt = units ? String : pad2;
  type Mark = { label: string; ring: number; deg: number; on: boolean };
  const marks: Mark[] = [];
  if (mode === "hour") {
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      if (twelveHour) {
        const hour = i + (pm ? 12 : 0);
        marks.push({ label: String(i === 0 ? 12 : i), ring: OUTER, deg, on: h === hour });
      } else {
        const outer = i === 0 ? 12 : i;
        const inner = i === 0 ? 0 : i + 12;
        marks.push({ label: fmt(outer), ring: OUTER, deg, on: h === outer });
        marks.push({ label: fmt(inner), ring: INNER, deg, on: h === inner });
      }
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const minute = i * 5;
      marks.push({ label: pad2(minute), ring: OUTER, deg: i * 30, on: m === minute });
    }
  }

  /* Where the hand points, and how far it reaches (the inner ring is shorter). */
  const handDeg =
    mode === "hour" ? (hourOnFace ? (h % 12) * 30 : null) : minuteKnown ? m * 6 : null;
  const handLen =
    !twelveHour && mode === "hour" && hourKnown && (h === 0 || h > 12) ? INNER : OUTER;

  const segment = (on: boolean) =>
    `text-[32px] font-extrabold tracking-[-0.5px] tabular-nums leading-none rounded-lg px-1 transition-colors ${
      on ? "text-[var(--brand-green)]" : "text-[var(--brand-text)]"
    }`;
  const caption = (text: string) => (
    <span className="text-xs font-medium" style={{ color: "var(--brand-hint)" }}>{text}</span>
  );
  const meridiem = (on: boolean) =>
    `px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-colors ${
      on
        ? "bg-[var(--brand-green)] border-[var(--brand-green)] text-[var(--brand-on-green)]"
        : "border-[var(--brand-control-border)] text-[var(--brand-text)] hover:bg-[var(--brand-green)] hover:border-[var(--brand-green)] hover:text-[var(--brand-on-green)]"
    }`;

  return (
    <div
      role="dialog"
      aria-label={units ? "Pick a duration" : "Pick a time"}
      className="absolute top-full left-0 mt-1.5 p-4 rounded-lg shadow-xl w-max z-40 select-none"
      style={{ backgroundColor: "var(--brand-surface)", border: "1px solid var(--brand-nav-border)" }}
    >
      {/* Header: the time so far, and which half the dial is setting. */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="flex items-start">
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => setMode("hour")} className={segment(mode === "hour")} aria-label="Set the hours">
              {hourKnown ? (units ? String(h) : pad2(twelveHour ? h % 12 || 12 : h)) : "--"}
            </button>
            {units && caption("hours")}
          </div>
          <span className="text-[32px] font-extrabold leading-none" style={{ color: "var(--brand-hint)" }}>:</span>
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => setMode("minute")} className={segment(mode === "minute")} aria-label="Set the minutes">
              {minuteKnown ? pad2(m) : "--"}
            </button>
            {units && caption("minutes")}
          </div>
        </div>
        {twelveHour && (
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => hourKnown && pm && commit(h - 12, m ?? 0)} className={meridiem(hourKnown && !pm)}>AM</button>
            <button type="button" onClick={() => hourKnown && !pm && commit(h + 12, m ?? 0)} className={meridiem(pm)}>PM</button>
          </div>
        )}
      </div>

      {/* The dial. Everything inside is positioned from the centre. */}
      <div
        ref={dial}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative rounded-full cursor-pointer touch-none"
        style={{ width: DIAL, height: DIAL, backgroundColor: "var(--brand-green)" }}
      >
        {handDeg !== null && (
          <>
            {/* The hand: a 2px bar from the centre, rotated about its foot. */}
            <div
              className="absolute left-1/2 top-1/2 w-0.5 origin-bottom -translate-x-1/2"
              style={{
                height: handLen,
                marginTop: -handLen,
                transform: `translateX(-50%) rotate(${handDeg}deg)`,
                backgroundColor: "var(--brand-on-green)",
              }}
            />
            {/* Its tip, on the chosen number — or between two, mid-drag. */}
            <div
              className="absolute rounded-full"
              style={{
                width: TIP,
                height: TIP,
                left: DIAL / 2 + handLen * Math.sin((handDeg * Math.PI) / 180) - TIP / 2,
                top: DIAL / 2 - handLen * Math.cos((handDeg * Math.PI) / 180) - TIP / 2,
                backgroundColor: "var(--brand-on-green)",
              }}
            />
            {/* Centre dot. */}
            <div
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: "var(--brand-on-green)" }}
            />
          </>
        )}
        {marks.map((mk) => (
          <span
            key={`${mk.ring}-${mk.label}`}
            className={`absolute flex items-center justify-center text-sm font-semibold tabular-nums pointer-events-none ${
              mk.on ? "text-[var(--brand-green)]" : mk.ring === INNER ? "text-[var(--brand-on-green)] opacity-70" : "text-[var(--brand-on-green)]"
            }`}
            style={{
              width: TIP,
              height: TIP,
              left: DIAL / 2 + mk.ring * Math.sin((mk.deg * Math.PI) / 180) - TIP / 2,
              top: DIAL / 2 - mk.ring * Math.cos((mk.deg * Math.PI) / 180) - TIP / 2,
            }}
          >
            {mk.label}
          </span>
        ))}
      </div>
    </div>
  );
}
