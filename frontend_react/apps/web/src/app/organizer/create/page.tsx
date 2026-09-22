"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
// PARKED 2026-08-14 (MVP) — `communityApi` dropped from this import.
import { organizerApi } from "@eventmind/api";
import { useAuthStore, CITIES } from "@eventmind/store";
import type { City } from "@eventmind/store";
// PARKED 2026-08-14 (MVP) — `Community` dropped from this import.
import type { CurrencyCode } from "@eventmind/types";
import { CURRENCIES, DEFAULT_CURRENCY } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";
import {
  ClockFace,
  DateTimeInput,
  FormField,
  FormSection as Section,
  formRow as row,
  GLYPH_PAD,
  GLYPH_POS,
  inputCls,
} from "@/components/FormControls";
import {
  DetailStickyCTA,
  DetailStickyShell,
  STICKY_BAR_HEIGHT_COMPACT,
} from "@/components/DetailCard";
import { ClockIcon } from "@/components/EventIcons";
import { SegmentedControl } from "@/components/SegmentedControl";
import { CoverImageModal } from "@/components/organizer/CoverImageModal";
import { AudienceChip } from "@/components/organizer/AudienceChip";
import {
  ListSummary,
  SPEC,
  blankRow,
  toPatch,
  type ListKind,
  type Row,
} from "@/components/organizer/ListEditor";
import { ListEditorModal } from "@/components/organizer/ListEditorModal";
import { OUTLINE_BUTTON } from "@/lib/controls";
import { currencySymbol } from "@/lib/currency";
import { EXTRAS_ARE_LOCAL, eventsSource } from "@/lib/data-source";
import { SKIP_ORGANIZER_VERIFICATION } from "@/lib/dev-flags";
import { EXTRAS_HINT } from "@/lib/event-extras";
import {
  CATEGORIES,
  EVENT_TYPES,
  LANGUAGES,
  TARGET_AUDIENCES,
  type EventType,
} from "@/lib/event-options";
import { isUploadedImage } from "@/lib/image-upload";
import { GUTTERS } from "@/lib/layout";
import { hoverCapable } from "@/lib/pointer";

const GREEN = "var(--brand-green)";

/* ⚠️ `ACTION_BTN` USED TO LIVE HERE and is gone for good (Gautham,
   2026-09-11). It was this form's own submit-button look — first a green
   outline, then a green slab hand-matched to "Manage attendees". Both were the
   bug: the two buttons now ARE that control, imported as `DetailStickyCTA`. If
   you find yourself wanting a local class string for them again, add a prop to
   `components/DetailCard.tsx` instead. */

/* `Section` and `row()` — the bordered card and the left-packed field row —
   were declared here until 2026-09-11. They are `FormSection` / `formRow` in
   `components/FormControls.tsx` now, imported under their old names, because
   `/organizer/onboarding` wears the identical layout and two copies would
   drift. The gap and breakpoint reasoning moved with them. */

/* ⚠️ EVERY MENU ON THIS PAGE IS ALPHABETICAL (Gautham, 2026-09-08) — a reader
   scans a list of names, they do not recall the order someone typed them in.
   `CATEGORIES` and `LANGUAGES` are sorted at their source in `lib/event-options`
   (the edit dialog reads the same two lists and must agree with this form).
   These two are sorted HERE instead, because both are shared packages whose
   declared order other surfaces depend on: `CITIES[0]` is this form's own
   default city, and `CURRENCIES` leads with the platform's home currency.

   The segmented Event Type control and the audience chips are deliberately NOT
   sorted — neither is a menu, and "Hybrid, In-Person, Online" would put the
   default in the middle of a three-button row. */
const CITY_OPTIONS = [...CITIES].sort((a, b) => a.name.localeCompare(b.name));
const CURRENCY_OPTIONS = [...CURRENCIES].sort((a, b) => a.code.localeCompare(b.code));

/* CATEGORIES / EVENT_TYPES / LANGUAGES / TARGET_AUDIENCES were declared here
   until 2026-09-01. They moved to `lib/event-options.ts` when the edit dialog
   gained the same four controls — one list or the two forms drift, which is the
   same reason `FormField` left this file. */

/**
 * How long the event runs — the two boxes behind the Duration field.
 *
 * ⚠️ LOCAL TO THIS FORM ON PURPOSE, unlike the four lists in
 * `lib/event-options`. Those are shared because the edit dialog offers the same
 * choices and a divergence loses an organiser their value; duration is not a
 * stored field at all — it is only how this form asks for the end date, and the
 * edit dialog asks for the end date directly. Nothing to keep in step.
 *
 * ⚠️ IT IS A CLOCK, NOT A MENU (Gautham, 2026-09-11). This was a `select` of 23
 * preset lengths, which made every duration the list did not happen to hold —
 * 100 minutes, 26 hours — unsayable, and buried the common ones in a scroll.
 * `DurationInput` below is the replacement: hours and minutes, typed or
 * stepped. **Do not restore the preset menu.**
 *
 * Four days is the cap the preset list topped out at and it stays the cap —
 * anything longer is a festival season, not an event, and an organiser who
 * fat-fingers a third digit should not publish a four-month booking window.
 */
const MAX_DURATION_HOURS = 96;

/* Empty, not "2h 00m" — Duration starts unset the same way Start Time does,
   as placeholder digits ("0h 00m" via `DurationInput`'s own placeholders)
   rather than a value the organiser has to notice and overwrite. `validate`
   already refuses an empty/zero duration on submit, same as Start Time. */
const DEFAULT_HOURS = "";
const DEFAULT_MINUTES = "";

/** The two boxes as one number, which is the only form the wire ever sees. */
function totalMinutes(hours: string, minutes: string): number {
  return (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
}

/** Digits only, at most two, never above `max`. `""` survives — see `validate`. */
function clampSegment(raw: string, max: number): string {
  const cleaned = raw.replace(/\D/g, "").slice(0, 2);
  return cleaned === "" ? "" : String(Math.min(parseInt(cleaned), max));
}

/** One number box inside the duration field — no edge of its own, the shell
 *  draws that. `2.5ch` holds two digits and the caret after them. */
const SEGMENT =
  "w-[2.5ch] bg-transparent text-center outline-none tabular-nums " +
  "text-[var(--brand-text)] placeholder:text-[var(--brand-muted)]";

/**
 * A length of time as hours and minutes, wearing the app's clock.
 *
 * ⚠️ NOT `DateTimeInput` WITH `type="time"`, tempting as that is — a native
 * time field is a WALL CLOCK. It renders "02:30 AM" wherever the locale is
 * 12-hour, which is nonsense for a length, and it cannot hold more than 23:59,
 * which loses every multi-day event. Two plain numeric segments say hours and
 * minutes in every locale and run to `MAX_DURATION_HOURS`.
 *
 * ⚠️ IT STILL OPENS THE SAME ROUND CLOCK AS START TIME (Gautham, 2026-09-11) —
 * `ClockFace` in its `units` mode: the two-ring face reads as 0–23 hours, then
 * minutes, and the header says "hours" / "minutes" under the figures. A click
 * on the shell or the glyph opens it on a mouse; on touch the glyph focuses the
 * hours box as before. A length past 23 hours is typed — the face has no number
 * for it — and the dial then shows no hand until a smaller hour is picked.
 *
 * The border is `inputCls`'s, written out rather than called: the element that
 * draws the edge is the WRAPPER and the element that takes focus is one of the
 * segments inside it, so every `focus:` becomes `focus-within:`. **Keep it in
 * step with `inputCls` by hand** — the classes have to appear literally in the
 * source for Tailwind to emit them, so they cannot be derived from it.
 */
function DurationInput({
  hours,
  minutes,
  onHours,
  onMinutes,
  hasError = false,
}: {
  hours: string;
  minutes: string;
  onHours: (v: string) => void;
  onMinutes: (v: string) => void;
  hasError?: boolean;
}) {
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  /* The clock is the desktop answer; a finger gets the hours box to type in. */
  function openClock() {
    if (hoverCapable()) setOpen(true);
    else hoursRef.current?.select();
  }

  /* Arrow keys step the segment under the caret, the one thing a `select` did
     give you for free. Minutes move in fives because that is the grain event
     lengths actually come in; both CLAMP rather than carry, so holding Up on
     the minutes never silently adds an hour behind your back. */
  function stepper(value: string, max: number, step: number, set: (v: string) => void) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      const delta = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
      if (!delta) return;
      e.preventDefault();
      set(String(Math.min(Math.max((parseInt(value) || 0) + delta, 0), max)));
    };
  }

  return (
    <div className="relative" ref={root}>
      {/* The app's one clock, the same glyph the cards, `/event/[id]` and the
          Start Time box above use, over the shared `GLYPH_POS`/`GLYPH_PAD` so
          the two fields line up. It opens the dial, as Start Time's does. */}
      <span
        aria-hidden="true"
        onClick={openClock}
        className={`${GLYPH_POS} cursor-pointer`}
        style={{ color: "var(--brand-hint)" }}
      >
        <ClockIcon />
      </span>
      <div
        onClick={() => { if (hoverCapable()) setOpen(true); }}
        className={
          `${GLYPH_PAD} w-full px-4 py-3 rounded-lg text-sm transition-colors border-2 flex items-center ` +
          (hasError
            ? "border-red-400 bg-red-50 focus-within:ring-2 focus-within:ring-red-200"
            : "border-[var(--brand-control-border)] bg-[var(--brand-bg)] text-[var(--brand-text)] focus-within:ring-2 focus-within:ring-[var(--brand-green)]/20 focus-within:border-[var(--brand-green)]")
        }
      >
        <input
          ref={hoursRef}
          type="text"
          inputMode="numeric"
          aria-label="Duration in hours"
          value={hours}
          onChange={(e) => {
            onHours(clampSegment(e.target.value, MAX_DURATION_HOURS));
            // Two digits is as many as the box holds, so hand the caret on
            // rather than making the organiser reach for Tab mid-number.
            if (e.target.value.replace(/\D/g, "").length >= 2) minutesRef.current?.select();
          }}
          onKeyDown={stepper(hours, MAX_DURATION_HOURS, 1, onHours)}
          placeholder="0"
          className={SEGMENT}
        />
        <span aria-hidden="true" className="ml-0.5" style={{ color: "var(--brand-hint)" }}>h</span>
        <input
          ref={minutesRef}
          type="text"
          inputMode="numeric"
          aria-label="Duration in minutes"
          value={minutes}
          onChange={(e) => onMinutes(clampSegment(e.target.value, 59))}
          // Pad on the way out, not on the way in: "0" is what a half-typed
          // "05" looks like, and rewriting it under the caret fights the typist.
          onBlur={() => onMinutes(minutes === "" ? "" : minutes.padStart(2, "0"))}
          onKeyDown={stepper(minutes, 59, 5, onMinutes)}
          placeholder="00"
          className={`${SEGMENT} ml-3`}
        />
        <span aria-hidden="true" className="ml-0.5" style={{ color: "var(--brand-hint)" }}>m</span>
      </div>

      {open && (
        <ClockFace
          hour={hours === "" ? null : parseInt(hours)}
          minute={minutes === "" ? null : parseInt(minutes)}
          twelveHour={false}
          units
          anchor={root}
          onChange={(h, m) => {
            onHours(String(h));
            onMinutes(String(m).padStart(2, "0"));
          }}
          onClose={() => {
            setOpen(false);
            hoursRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

/**
 * The leading line inside one of the three optional cards — what the thing is,
 * or why it cannot be saved in real mode.
 *
 * It is `ListEditor`'s own intro paragraph, to the pixel: those two surfaces
 * said the same sentence in the same place until the editors moved into dialogs,
 * and a card whose type is a step off the dialog it opens reads as two products.
 */
function ExtraNote({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-[var(--brand-hint)]">{children}</p>;
}

/**
 * The one control on an optional card, and the only way into its dialog.
 *
 * ⚠️ `type="button"`, AND IT MATTERS. A bare `<button>` inside a `<form>`
 * submits it — this one would publish the event instead of opening the agenda.
 *
 * Geometry is `ListEditor`'s add button; the edge and the green hover are the
 * shared `OUTLINE_BUTTON`. Disabled rather than hidden in real mode, with the
 * reason on the tooltip: a missing control looks like a missing feature.
 */
function OpenDialogButton({
  label,
  onClick,
  disabled,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full py-3 rounded-lg text-[16px] font-bold ${OUTLINE_BUTTON}`}
    >
      {label}
    </button>
  );
}

function subFromToken(token: string | null): string {
  if (!token) return "00000000-0000-0000-0000-000000000001";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

export default function CreateEventPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);

  // Event basics
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technology");
  const [eventType, setEventType] = useState<EventType>("In-Person");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  /* Who is putting the event on. It is what `/event/[id]` prints under
     "Organised by" — the ORGANISATION, not the signed-in person (Gautham,
     2026-09-01), and until now that line was a hardcoded placeholder because
     nothing ever asked for the name.

     ⚠️ NOT GATED ON `EXTRAS_ARE_LOCAL`, unlike the offer name, the agenda, the
     FAQ and the cover image — it is required in every mode. There is no column
     for it yet either, so a real-mode create drops it and the event page falls
     back to its placeholder; that fallback is what makes the exception safe.
     The reasoning is written up in full in `lib/event-extras.ts`. */
  const [organizationName, setOrganizationName] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("English");
  const [eventWebsite, setEventWebsite] = useState("");

  // Location
  const [city, setCity] = useState<City>(CITIES[0]);
  const [address, setAddress] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");

  /* Timing — the DAY, the TIME and HOW LONG, as three controls (Gautham,
     2026-09-09). This was two `datetime-local` inputs; an organiser writing an
     event knows "Saturday, 10am, runs about three hours" and had to do the
     arithmetic to state the end as a second wall-clock instant. The end is
     derived from these three at submit, so `end_date` on the wire is unchanged.

     ⚠️ The EDIT dialog still shows a start and an end. That is deliberate and
     not drift: an event that has been published has a fixed end date organisers
     move directly, and re-deriving it from a duration would silently shift it
     every time someone corrected the start by five minutes. */
  const [startDay, setStartDay] = useState("");
  const [startTime, setStartTime] = useState("");
  /* The duration lives here as the two RAW STRINGS the boxes show, not as a
     number, for the same reason capacity and price do: a box the organiser has
     cleared has to stay cleared while they type the replacement, and a number
     has no way to say "empty". `validate` is what refuses it. */
  const [durationHours, setDurationHours] = useState(DEFAULT_HOURS);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_MINUTES);

  // Tickets
  const [capacity, setCapacity] = useState("100");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  /* The two extras the EDIT dialog has always had and this form did not, added
     2026-09-01 so an organiser can author on the way in rather than publishing
     and immediately opening "Edit details". Both are read straight off the
     event by `/event/[id]` — `image_url` is the hero photo, `offer_name` is the
     caption above the price in the booking card.

     ⚠️ Same `EXTRAS_ARE_LOCAL` gate as the agenda and FAQ editors below, for the
     same reason: neither survives a real-mode create (`EXTRA_KEYS` in
     lib/event-extras.ts). `image_url` is the cheapest of the six to make real —
     it is a column already, just missing from the backend schemas. */
  const [offerName, setOfferName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  /* The two optional authored lists an organiser can seed at creation time.
     Both start EMPTY — an event with no agenda is normal, and a pre-added blank
     row would read as something you must fill in.

     ⚠️ ANNOUNCEMENTS ARE DELIBERATELY NOT HERE (Gautham, 2026-08-31). An
     announcement is an update posted to an event people have already booked,
     dated and rendered newest-first; there is nothing to update at the moment
     the event is being written. They stay where they belong — the organiser
     view on `/event/[id]`.

     ⚠️ Neither list survives a real-mode create: `EventCreate` has no column for
     them (TODO.md §19.12), so both editors are disabled off `EXTRAS_ARE_LOCAL`,
     the same gate every other authoring control in the app reads. */
  const [agendaRows, setAgendaRows] = useState<Row[]>([]);
  const [faqRows, setFaqRows] = useState<Row[]>([]);

  /* ── The three optional extras are edited in DIALOGS, not in the cards ──
     (Gautham, 2026-09-11). The agenda and FAQ editors and the cover-image
     control used to sit open inside their cards; they now open the same centred
     dialog with the same "Save changes" button that `/event/[id]` opens, and
     the cards show what has been written so far. One authoring experience for
     an organiser whether they write the agenda at create or a week later.

     ONE piece of state for the two lists — they are one component
     (`ListEditorModal`), only one can be open, and two booleans would be two
     ways to say the same thing plus a state where both are true. It carries the
     rows to open on, because `openList` makes them in the click handler: they go
     through `blankRow`, which `react-hooks/purity` flags in render. */
  const [editingList, setEditingList] = useState<{ kind: ListKind; rows: Row[] } | null>(null);
  const [editingCover, setEditingCover] = useState(false);

  /* PARKED 2026-08-14 (MVP) — the whole "add this event to my community" feature.
     Communities are deferred to Phase 2. These five pieces are interdependent —
     the state, the lookup, the payload field and the form section — so they park
     as one set; leaving any one live breaks the others.

  // Community
  const [community, setCommunity] = useState<Community | null>(null);
  const [communityId, setCommunityId] = useState<string>("");

  */

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  /* Starts true under the dev bypass — the gate is then already open on the first
     render. Setting it from inside the effect instead would trip
     `react-hooks/set-state-in-effect` and cost a throwaway render. */
  const [verificationChecked, setVerificationChecked] = useState(SKIP_ORGANIZER_VERIFICATION);

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/auth"); return; }
    if (SKIP_ORGANIZER_VERIFICATION) return;
    const userId = subFromToken(tokens?.access_token ?? null);
    if (!userId) return;

    organizerApi.get(userId)
      .then(() => {
        setVerificationChecked(true);
        /* PARKED 2026-08-14 (MVP) — the organiser's community lookup. See the
           parked state block above. setVerificationChecked stays: it gates the
           whole form, not just this section.

        // Check if organizer already has a community
        communityApi.getByOrganizer(userId)
          .then((r) => setCommunity(r.data))
          .catch(() => {});

        */
      })
      .catch(() => router.replace("/organizer/onboarding"));
  }, [isAuthenticated, router, tokens]);

  if (!isAuthenticated || !verificationChecked) return null;

  /**
   * Open a list dialog on the rows written so far — or on ONE BLANK ROW when
   * there are none, so "Add an item" lands on the fields rather than on an empty
   * editor whose only control repeats the words just pressed. That is the rule
   * `/event/[id]` already follows; see `EditListModal.extraRow`.
   *
   * ⚠️ `blankRow` goes through `extraId()` and must be called from an event
   * handler, never in render — `react-hooks/purity` flags it. This is that
   * handler; the dialog only receives finished rows.
   */
  function openList(kind: ListKind) {
    const rows = kind === "agenda" ? agendaRows : faqRows;
    setEditingList({ kind, rows: rows.length > 0 ? rows : [blankRow(kind)] });
  }

  function toggleAudience(item: string) {
    setTargetAudience((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }

  /**
   * ⚠️ IT CHECKS NO AGENDA OR FAQ ROW, AND THAT IS NOT AN OVERSIGHT (Gautham,
   * 2026-09-11). The only way a row reaches this page's state is
   * `ListEditorModal`'s Save, which drops the blank rows and refuses to close on
   * a missing required field — so by the time a row is here it has already
   * passed exactly the check this function used to repeat, and a second copy
   * would have nowhere to draw its message now that the editor lives in a
   * dialog. Same for the cover image, which `CoverImageModal` validates with
   * `isImageSrc` before it hands the value over. **Open an authoring control
   * anywhere outside those dialogs and the checks come back here with it.**
   */
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (title.trim().length < 5) errors.title = "Title must be at least 5 characters.";
    if (!organizationName.trim()) errors.organizationName = "Organisation name is required.";
    if (description.trim().length < 20) errors.description = "Description must be at least 20 characters.";
    if (eventType !== "Online" && !address.trim()) errors.address = "Venue address is required for in-person events.";
    if (eventType !== "In-Person" && !onlineUrl.trim()) errors.onlineUrl = "Online link is required for online/hybrid events.";
    /* Two messages, not one, because they are two controls — a form that says
       "start is required" while the day is already filled in tells the
       organiser nothing about which box to go back to. The end date needs no
       check of its own any more: it is the start plus a duration, so it cannot
       land before the start. */
    if (!startDay) errors.startDay = "Start date is required.";
    if (!startTime) errors.startTime = "Start time is required.";
    /* An event that runs for no time at all is the one duration the clock can
       express and the calendar cannot — both boxes can be cleared, and 0h 00m
       would put the end instant on the start. The menu this replaced could not
       reach that state, so this check is new with it. */
    if (totalMinutes(durationHours, durationMinutes) < 1)
      errors.duration = "Duration must be at least a minute.";
    /* ⚠️ THE EMPTY CASE IS ITS OWN BRANCH, AND IT HAS TO BE (Gautham,
       2026-09-11). Both boxes ship with a value and both can be cleared, and
       `parseInt("")` is NaN — every comparison against NaN is false, so the old
       single range test waved an empty box straight through while the field
       said "(required)". A mark the form does not enforce is the lie
       `FormControls` warns about.

       A price of 0 is legitimate and common — it is how a free event is
       written — so only a BLANK box is refused here, never a zero. */
    if (!capacity.trim()) errors.capacity = "Capacity is required.";
    else if (!(parseInt(capacity) >= 1)) errors.capacity = "Capacity must be at least 1.";
    if (!price.trim()) errors.price = "Ticket price is required — enter 0 for a free event.";
    else if (!(parseFloat(price) >= 0)) errors.price = "Price cannot be negative.";
    if (eventWebsite && !eventWebsite.match(/^https?:\/\/.+/))
      errors.eventWebsite = "Website must start with http:// or https://";
    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent, mode: "publish" | "draft") {
    e.preventDefault();

    // The two lists need no pruning or checking here — `ListEditorModal` did
    // both before it handed the rows over. See `validate`.
    if (!validate()) return;

    setError(null);
    setIsSubmitting(true);
    setSubmitMode(mode);

    try {
      const organizerId = subFromToken(tokens?.access_token ?? null);
      const location: Record<string, unknown> = {
        event_type: eventType,
        latitude: eventType !== "Online" ? city.lat : null,
        longitude: eventType !== "Online" ? city.lng : null,
      };
      if (address.trim()) location.address = address.trim();
      if (onlineUrl.trim()) location.online_url = onlineUrl.trim();

      /* `"2026-11-14T09:30"` is parsed as LOCAL time, which is what the two
         `datetime-local` inputs used to hand over — the organiser types the
         wall clock at the venue and the ISO string carries their offset. Safe
         to build unguarded: `validate` has already refused an empty half. */
      const startsAt = new Date(`${startDay}T${startTime}`);

      const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      // Sent unconditionally; `eventsSource.create` strips them in real mode,
      // where the backend has no column for either (TODO.md §19.12). Both are
      // empty there anyway — the editors below are disabled.
      const now = new Date().toISOString();

      await eventsSource.create({
        organizer_id: organizerId,
        title: title.trim(),
        description: description.trim(),
        category,
        event_type: eventType,
        location,
        target_audience: targetAudience.join(", ") || undefined,
        tags: parsedTags,
        language,
        event_website: eventWebsite.trim() || undefined,
        // PARKED 2026-08-14 (MVP) — community_id: communityId || undefined,
        // The field stays nullable on the event model, so omitting it is valid.
        start_date: startsAt.toISOString(),
        end_date: new Date(
          startsAt.getTime() + totalMinutes(durationHours, durationMinutes) * 60_000
        ).toISOString(),
        capacity: parseInt(capacity) || 100,
        price: parseFloat(price) || 0,
        currency,
        status: mode === "publish" ? "published" : "draft",
        // Both stripped in real mode alongside the two lists, where the
        // controls that set them are disabled and these are empty anyway.
        offer_name: offerName.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        // Stripped in real mode with the rest of `EXTRA_KEYS`, unlike the two
        // above it is required and enabled there anyway — `/event/[id]` has a
        // placeholder to fall back to. See lib/event-extras.ts.
        organization_name: organizationName.trim() || undefined,
        ...toPatch("agenda", agendaRows, now),
        ...toPatch("faq", faqRows, now),
      });

      setSuccess(true);
      setTimeout(() => router.push("/organizer/events"), 1500);
    } catch {
      setError("Failed to save event. Please check all fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const descMax = 1000;
  const extrasOff = !EXTRAS_ARE_LOCAL;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />

      {/* ⚠️ 1536px, WIDER THAN THE 1400px HOUSE COLUMN (Gautham, 2026-09-09).
          Every field on this page carries its label BESIDE it rather than above,
          so a field costs its label plus its control before the next one can
          start; the extra width is what buys that back. Nothing is stretched to
          fill it — the fields pack left and the column simply decides how many
          fit on a line. This is the one page that deviates; the organiser
          console and the public pages keep `PAGE_MAX_WIDTH`. */}
      {/* ⚠️ THE BOTTOM PADDING IS THE STICKY BAR'S HEIGHT PLUS THE 32px THIS
          column already had. The bar is `fixed`, so it is painted over the end
          of the document and pads nothing itself; without this the Cover image
          section sits underneath it and its two buttons cannot be clicked. Read
          from `STICKY_BAR_HEIGHT_COMPACT` rather than typed, so the day that bar
          changes height this follows it. */}
      <div
        className={`pt-8 max-w-[1536px] mx-auto ${GUTTERS}`}
        style={{ paddingBottom: STICKY_BAR_HEIGHT_COMPACT + 32 }}
      >
        {/* DEV ONLY — the return half of the create ⇄ onboarding round trip, and
            the twin of the strip at the top of /organizer/onboarding. The back
            arrow below already walks there under the bypass, but it reads as a
            back button, so it is not a door anyone can SPOT — with both the
            create-page redirect and the console's "Become an organiser" empty
            state switched off by the dev flags, the onboarding page had no
            visible way in at all (Gautham, 2026-09-11). Same TERRACOTTA edge as
            its twin, for the same reason: nothing else on this page is outlined
            in the annotation colour, and this product has no dashed borders
            anywhere (Gautham, 2026-09-09). Dropped from the bundle entirely when
            the flag is off — see lib/dev-flags.ts. */}
        {SKIP_ORGANIZER_VERIFICATION && (
          <div
            className="mb-6 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
            style={{
              border: "2px solid var(--brand-terracotta)",
              backgroundColor: "var(--brand-surface)",
            }}
          >
            <p style={{ color: "var(--brand-hint)" }}>
              Dev bypass on — verification is not being enforced.
            </p>
            <button
              type="button"
              onClick={() => router.push("/organizer/onboarding")}
              className="px-4 py-2 rounded-lg font-bold transition-colors bg-[var(--brand-green)] hover:bg-[var(--brand-green-hover)]"
              style={{ color: "var(--brand-on-green)" }}
            >
              ← Organiser registration
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {/* Under the dev bypass this walks to /organizer/onboarding rather than
              into history, so the two pages can be reviewed as a pair. For a real
              organiser it stays plain history — they reach this form from the
              console, and sending them to a verification page they have already
              completed would be a bug, not a shortcut. */}
          <button
            onClick={() =>
              SKIP_ORGANIZER_VERIFICATION
                ? router.push("/organizer/onboarding")
                : router.back()
            }
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", backgroundColor: "var(--brand-bg)" }}
          >
            <svg className="w-4 h-4" style={{ color: "var(--brand-hint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold" style={{ color: "var(--brand-text)" }}>Create New Event</h1>
            {/* No legend about the marking any more: the fields say "(required)"
                in words, and a key at the top of a page only ever existed to
                translate a symbol. */}
            <p className="text-[18px]" style={{ color: "var(--brand-hint)" }}>
              Fill in the details below to publish or save as draft.
            </p>
          </div>
        </div>

        {/* ⚠️ ONE COLUMN, READ TOP TO BOTTOM (Gautham, 2026-09-09). The cover
            photo and the publish buttons spent a day in a sticky 340px rail
            beside the form; they are back in the sequence, last, where the
            organiser meets them after they have finished writing the event. A
            side rail turned one form into two things to track at once, and it
            put the primary action level with the title field, which is the one
            moment it should not be reachable.

            ⚠️ The two submits now live in a fixed bar across the foot of the
            viewport (2026-09-11) and that reopens none of the above — a bar
            takes no width from the fields, it is the same one `/event/[id]`
            mounts, and the cover photo stayed here in the sequence rather than
            travelling with the buttons. The reasoning is on the bar itself.

            ⚠️ The three OPTIONAL sections sit side by side from `xl`
            (2026-09-11) and that reopens none of the above either. They are the
            tail of the sequence, not a rail beside it: nothing required moves,
            the publish buttons stay in the bar, and below `xl` the three stack
            back into the same order they always read in. The reasoning is on
            that grid.

            Density is not lost with the rail gone: from `lg` the fields inside a
            section queue up from the left and wrap when the next one will not
            fit, so a wide window fits three or four to a line without any of
            them being stretched to get there. See `row()`. */}
        <form onSubmit={(e) => handleSubmit(e, submitMode)} className="space-y-6">

          {/* ── Event Basics ── */}
          <Section title="Event Basics">
            {/* ⚠️ LEFT-PACKED FROM `lg`, NOT A COLUMN GRID (Gautham,
                2026-09-09). Every field is as wide as its own `width` says and
                they queue up from the left, wrapping when the next one does not
                fit. An equal-column grid did the opposite: it stretched each
                cell to a third of the card and then left the short controls
                floating in it, so a menu ended up nearer the NEXT field's label
                than its own. `row()` is that layout, shared by every section.

                Below `lg` the labels are stacked above their inputs and the
                fields go back to a plain two-column grid — hugging means nothing
                when a label already sits on its own line. */}
            <div className={row()}>
              {/* ⚠️ TITLE · CATEGORY · LANGUAGE · EVENT TYPE IS ONE LINE FROM
                  ~1600px (Gautham, 2026-09-11), and the four widths are what
                  buy it. The title came down from `lg` to `md` and the two
                  menus from `sm` to `xs` and then to `xs`/`xxs`: a category and
                  a language are picked from a menu, and 280px of box for
                  "English" was the widest thing on the page saying the least.
                  Widen any of the four and Event Type drops back to a line of
                  its own.

                  ⚠️ THE TITLE IS NOT THE FIELD THAT GIVES (Gautham,
                  2026-09-11). The four fit on a 1600px window with ~25px to
                  spare and NOT on a 1440px one, where Event Type leads the
                  second line instead — that is the accepted outcome, not a bug
                  to fix by cutting the title. It is the longest thing typed on
                  this page and it keeps `md`; the menus are what were measured
                  down, each to its own longest option (see `FieldWidth`).
                  Event Type keeps `sm` because "In-Person" across three equal
                  segments needs ~220px of track before the words touch the
                  edges — three 66.5px labels plus the switch's own 20px of
                  chrome (a 2px border, 4px of inset and two 4px gaps). */}
              <FormField label="Event Title" required inline width="md" error={fieldErrors.title}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., NewFind AI Summit 2026"
                  className={inputCls(!!fieldErrors.title)}
                />
              </FormField>

              {/* ⚠️ A MENU IS MARKED "(required)" WITHOUT A `validate()` BRANCH
                  BEHIND IT, AND THAT IS NOT THE LIE `FormControls` WARNS ABOUT
                  (Gautham, 2026-09-11). Category, Language, Event Type, City
                  and Currency all open on a real value and have no empty
                  option, so there is no state in which the form would accept
                  one blank — the mark is enforced by the control rather than by
                  a check. **Add an empty option to any of them and you owe it a
                  branch in `validate()` the same day.** Duration was on this
                  list until it stopped being a menu; a clock can be cleared, so
                  it has a branch now. */}
              <FormField label="Category" required inline width="xs">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls(false)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>

              <FormField label="Language" required inline width="xxs">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls(false)}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </FormField>

              {/* ⚠️ EVENT TYPE CLOSES THE FIRST LINE WHERE THERE IS ROOM AND
                  LEADS THE SECOND WHERE THERE IS NOT (Gautham, 2026-09-11).
                  Nothing here forces either — the row simply packs left and
                  wraps, so the same markup gives four fields on a 1600px window
                  and three on a 1440px one. Do not add a spacer to pin it to
                  one line or the other.

                  It was `lg`, sized to a 520px switch; three words in three
                  segments do not need 560px. At today's `sm` each segment gets
                  73px against a 66.5px bold "In-Person" (Roboto 15/700,
                  measured 2026-09-11), which is the tightest this control can
                  honestly go — `sm` came down to 240 on 2026-09-11 and there is
                  nothing left in it, and adopting `/explore`'s track spent 20
                  of the 26px that were spare. 3px a side remains, so the
                  segments carry NO horizontal padding of their own (see
                  `SegmentedControl`'s `fill`): add any and "In-Person" either
                  clips or pushes the track past its field.
                  `width` rather than an inner
                  cap because the field's width IS what the row packs against —
                  a 560px slot holding a 520px switch would leave 40px of
                  nothing before the next label.

                  ⚠️ Both hints go BELOW their label (`hintBelow`), which is
                  what makes the line fit. Beside the label, "(comma-separated)"
                  pushes "Tags / Keywords" into the 240px label cap and spends
                  100px per field on nothing. */}
              {/* ⚠️ THIS IS `/explore`'s FORMAT FILTER, NOT A SECOND SWITCH
                  (Gautham, 2026-09-11). It was a flush strip of three buttons
                  each painting its own background; it is now the same
                  `SegmentedControl` the Format filter uses — one bordered track
                  on `--brand-bg` with a green pill that slides between the
                  choices. Do not re-style it here: the component is the shared
                  one, so anything this field needs, the filter needs too.

                  `fill` gives the three segments equal widths, which is what
                  keeps a 240px field honest — see the width note above. */}
              <FormField label="Event Type" required inline width="sm">
                <SegmentedControl
                  options={EVENT_TYPES}
                  value={eventType}
                  onChange={setEventType}
                  ariaLabel="Event Type"
                  fill
                />
              </FormField>

              {/* ⚠️ THE NAME UNDER "Organised by" ON `/event/[id]`, AND THE
                  FIRST TIME ANYTHING HAS ASKED FOR IT (Gautham, 2026-09-11).
                  That line has been a hardcoded placeholder since the page was
                  built; it now reads this when the event carries one. It is the
                  ORGANISATION, not the signed-in person — an event is put on by
                  a collective, a company or a venue, and the person who happens
                  to be typing is not what an attendee needs to trust.

                  It sits between Event Type and Tags because that is where the
                  organiser is still answering "who and what", before the
                  discovery fields.

                  ⚠️ `smd`, NOT `md` (Gautham, 2026-09-11). An organisation name
                  is a short phrase — "NewFind Collective" measures 130px — but
                  `sm` read tight for a name people type in full, so this field
                  is what the 320px step was added for. `md` is still wrong: at
                  `md` all three of Organisation Name, Tags and Event Website
                  came to ~1450 against a 1440 card and Event Website was left
                  alone on a line of its own with 1000px beside it. The 80px
                  this adds comes out of that same line's slack, so **re-measure
                  the line before widening anything else on it.** The title
                  keeps `md` because it is the longest thing typed here; this is
                  not. */}
              <FormField
                label="Organisation Name"
                required
                inline
                width="smd"
                error={fieldErrors.organizationName}
              >
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g., NewFind Collective"
                  className={inputCls(!!fieldErrors.organizationName)}
                />
              </FormField>

              <FormField label="Tags / Keywords" optional hint="comma-separated" inline width="sm">
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., AI, machine learning"
                  className={inputCls(false)}
                />
              </FormField>

              <FormField label="Event Website" optional inline width="sm" error={fieldErrors.eventWebsite}>
                <input
                  type="url"
                  value={eventWebsite}
                  onChange={(e) => setEventWebsite(e.target.value)}
                  placeholder="https://myevent.com"
                  className={inputCls(!!fieldErrors.eventWebsite)}
                />
              </FormField>

              {/* ⚠️ THE ONE UNCAPPED FIELD ON THE PAGE (Gautham, 2026-09-09). No
                  `width`, so the box takes the whole line it is given — a
                  description is the longest thing anyone types here and it was
                  being written through a 560px slot. Three rows rather than
                  five, because the width bought the lines back.

                  The counter goes BELOW the label (`hintBelow`) rather than
                  beside it: it is the only hint on the page that changes as you
                  type, and alongside the label it shoves "Description" sideways
                  each time the count gains a digit. */}
              <div className="sm:col-span-2 lg:w-full">
                <FormField
                  label="Description"
                  hint={`${description.length}/${descMax}`}
                  hintBelow
                  required
                  inline
                  error={fieldErrors.description}
                >
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, descMax))}
                    placeholder="What is this event about? What will attendees learn or experience?"
                    rows={3}
                    className={inputCls(!!fieldErrors.description)}
                  />
                </FormField>
              </div>

              {/* ⚠️ `hintBelow` HERE IS A LAYOUT FIX, NOT A STYLE CHOICE
                  (Gautham, 2026-09-09). Beside the label, "Target Audience
                  (select all that apply)" is wider than the 240px label cap, so
                  it wrapped to two lines and the label block held the full
                  240px — leaving ~120px of dead space between the short word
                  "Target Audience" and the first chip. Stacked, the block hugs
                  the wider of the two lines and the chips start beside it. */}
              <div className="sm:col-span-2 lg:w-full">
                <FormField label="Target Audience" optional hint="select all that apply" inline>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_AUDIENCES.map((a) => (
                      <AudienceChip
                        key={a}
                        label={a}
                        selected={targetAudience.includes(a)}
                        onToggle={() => toggleAudience(a)}
                      />
                    ))}
                  </div>
                </FormField>
              </div>
            </div>
          </Section>

          {/* ── Time & Location ── */}
          <Section title="Time & Location">
            {/* ⚠️ THE ORDER IS CHOSEN SO EVERY FORMAT PACKS (Gautham,
                2026-09-09). Where · When · Link means: Hybrid fills both lines,
                Online drops the whole first line and opens on the date, and
                In-Person ends after the duration. Moving the online link back
                above the dates puts a hole in the middle of the section for two
                of the three formats. */}
            <div className={row()}>
              {/* ⚠️ CITY AND VENUE ADDRESS OWN A WHOLE LINE (Gautham,
                  2026-09-09) — that is what this nested `row()` is for, and it
                  is the only nested one on the page. The two used to sit in the
                  section's single flex row, where the start date packed in
                  beside them and the address, which grows into the leftovers,
                  was left holding "Tour & Taxis, Avenue du Port 86C, Brussels"
                  through about 300px. On its own `lg:w-full` line the city menu
                  takes its own width and the address takes everything else.

                  ⚠️ The city menu is `sm`, not `xs` like the other short menus
                  (Gautham, 2026-09-11). "Thiruvananthapuram, IN" wants 208px
                  and had been ellipsised at every width this field has ever
                  had; `sm` is the first step that holds it. It costs nothing —
                  the address beside it simply grows a little less.

                  ONE conditional around both, not two: an empty wrapper on an
                  Online event would still be a full-width flex line, so the
                  section would open with a blank band. */}
              {eventType !== "Online" && (
                <div className={`sm:col-span-2 lg:w-full ${row()}`}>
                  {/* ⚠️ The MENU is sorted; `CITIES` itself is not — see
                      CITY_OPTIONS at the top. The lookup below still reads the
                      unsorted export, because `CITIES[0]` is this form's
                      declared default. */}
                  <FormField label="City" required inline width="sm">
                    <select
                      value={city.name}
                      onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value) ?? CITIES[0])}
                      className={inputCls(false)}
                    >
                      {CITY_OPTIONS.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}, {c.country}</option>
                      ))}
                    </select>
                  </FormField>

                  {/* No `width`, so it asks for 420px and then takes the whole
                      rest of the line: a venue line is a building, a street, a
                      number and a city, and it is the only field on the page
                      with no natural length. */}
                  <FormField label="Venue Address" required inline error={fieldErrors.address}>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g., Tour & Taxis, Avenue du Port 86C, Brussels"
                      className={inputCls(!!fieldErrors.address)}
                    />
                  </FormField>
                </div>
              )}

              {/* ⚠️ THE DAY AND THE CLOCK ARE TWO BOXES (Gautham, 2026-09-09).
                  One `datetime-local` hides a date picker and a time spinner
                  behind a single caret, so an organiser correcting only the hour
                  has to tab through the date to reach it. Split, each control is
                  the size of the thing it holds and either can be fixed alone. */}
              <FormField label="Start Date" required inline width="xs" error={fieldErrors.startDay}>
                <DateTimeInput
                  type="date"
                  value={startDay}
                  onChange={setStartDay}
                  hasError={!!fieldErrors.startDay}
                />
              </FormField>

              <FormField label="Start Time" required inline width="xs" error={fieldErrors.startTime}>
                <DateTimeInput
                  type="time"
                  value={startTime}
                  onChange={setStartTime}
                  hasError={!!fieldErrors.startTime}
                />
              </FormField>

              {/* ⚠️ DURATION REPLACED "End Date & Time" (Gautham, 2026-09-09).
                  An organiser knows their event runs three hours; they did not
                  know without arithmetic that it therefore ends at 13:30 on the
                  same Saturday — and a second DATE box invited them to get the
                  day wrong, which is how an event ends before it starts. The end
                  instant still goes on the wire; it is computed in
                  `handleSubmit` now rather than typed.

                  ⚠️ `xs`, matching Start Date and Start Time either side of it
                  (Gautham, 2026-09-11). It was `sm` while it was a menu, which
                  had to hold "2 hours 30 minutes"; a clock holds four digits and
                  a `sm` box would leave the row visibly uneven. */}
              <FormField label="Duration" required inline width="xs" error={fieldErrors.duration}>
                <DurationInput
                  hours={durationHours}
                  minutes={durationMinutes}
                  onHours={setDurationHours}
                  onMinutes={setDurationMinutes}
                  hasError={!!fieldErrors.duration}
                />
              </FormField>

              {eventType !== "In-Person" && (
                <FormField label="Online Event Link" required inline width="sm" error={fieldErrors.onlineUrl}>
                  <input
                    type="url"
                    value={onlineUrl}
                    onChange={(e) => setOnlineUrl(e.target.value)}
                    placeholder="e.g., https://zoom.us/j/..."
                    className={inputCls(!!fieldErrors.onlineUrl)}
                  />
                </FormField>
              )}
            </div>
          </Section>

          {/* ── Tickets & Pricing ── */}
          <Section title="Tickets & Pricing">
            {/* Capacity · Currency · Price, in `row()` like every other section.
                The three-column grid below `lg` is this section's own: these are
                the shortest controls on the page and a phone is the only width
                where they need a line each. */}
            <div className={row("sm:grid-cols-3")}>
              <FormField label="Capacity (max attendees)" required inline width="xs" error={fieldErrors.capacity}>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="100"
                  className={inputCls(!!fieldErrors.capacity)}
                />
              </FormField>

              {/* Currency the attendee is charged in. Stored on the event, so
                  every surface renders this event's price with THIS symbol —
                  see lib/currency.ts. Defaults to INR, the platform's home
                  currency; the field sits before Price so the price input's
                  prefix is already showing the right symbol as you type. */}
              <FormField label="Currency" required inline width="sm">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className={inputCls(false)}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Ticket Price" required inline width="xs" error={fieldErrors.price}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--brand-hint)" }}>
                    {currencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={`${inputCls(!!fieldErrors.price)} pl-8`}
                  />
                </div>
                {parseFloat(price) === 0 && (
                  <p className="text-xs font-medium mt-1" style={{ color: "var(--brand-terracotta)" }}>Free event</p>
                )}
              </FormField>
            </div>

            {/* An offer name on a free event names a discount off nothing —
                same condition the edit dialog uses. */}
            {parseFloat(price) > 0 && (
              <div className="w-full sm:w-auto">
                <FormField
                  label="Offer name"
                  optional
                  hint={extrasOff ? "needs the backend" : "shown above the price"}
                  inline
                  width="sm"
                >
                  <input
                    type="text"
                    value={offerName}
                    disabled={extrasOff}
                    title={extrasOff ? EXTRAS_HINT : undefined}
                    onChange={(e) => setOfferName(e.target.value.slice(0, 40))}
                    placeholder="e.g., Early bird"
                    className={`${inputCls(false)} ${extrasOff ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </FormField>
              </div>
            )}
          </Section>

          {/* ── The three optional sections, SIDE BY SIDE (Gautham, 2026-09-11) ──

              Agenda, FAQ and Cover image are one row of three equal-height cards
              from `xl` and stack in the usual sequence below it. They earn the
              treatment the required sections do not: all three are skippable,
              none of them feeds another, and stacked they pushed the publish
              buttons a screen and a half below the last required field.

              ⚠️ EQUAL HEIGHT IS THE GRID'S DEFAULT, NOT AN `h-full` ON THE CARD.
              Grid items stretch to their row, so `Section` needs no change and
              the three edges line up however many agenda rows have been added.

              ⚠️ `xl`, NOT `lg`. A third of this 1536px column is ~427px of card
              interior at the top end and ~341px at 1280px; at `lg` it would be
              ~250px, which is narrower than one of these textareas can honestly
              be. Both are built-in screens, so they sort by width — see the
              breakpoint-order trap in apps/web/CLAUDE.md before adding an
              arbitrary variant here.

              ⚠️ NOTHING IS AUTHORED IN THESE THREE CARDS ANY MORE (Gautham,
              2026-09-11). Each one states what the thing is, shows what has been
              written so far, and offers ONE control that opens the same centred
              dialog `/event/[id]` opens for the same list — `ListEditorModal`
              for the agenda and the FAQ, `CoverImageModal` for the photo, both
              with a "Save changes" button at the foot. The editors used to sit
              open in the cards, which is why the note about inline labels below
              existed and why `CoverImageField` needed a `hidePreview`: a third
              of this column is not enough width to write an agenda in. The
              dialog has the width, and an organiser now meets the same editor
              here as they will a week later on the event page.

              ⚠️ The dialogs themselves are mounted AFTER the form, not here —
              see the note there. */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── Agenda (optional) ── */}
            <Section title="Agenda" optional>
              <ExtraNote>
                {extrasOff ? `An agenda cannot be saved yet. ${EXTRAS_HINT}` : SPEC.agenda.intro}
              </ExtraNote>
              {agendaRows.length > 0 && <ListSummary kind="agenda" rows={agendaRows} />}
              <OpenDialogButton
                label={agendaRows.length === 0 ? SPEC.agenda.addLabel : "Edit the agenda"}
                onClick={() => openList("agenda")}
                disabled={extrasOff}
                title={extrasOff ? EXTRAS_HINT : undefined}
              />
            </Section>

            {/* ── FAQ (optional) ── */}
            <Section title="Frequently asked questions" optional>
              <ExtraNote>
                {extrasOff ? `An FAQ cannot be saved yet. ${EXTRAS_HINT}` : SPEC.faq.intro}
              </ExtraNote>
              {faqRows.length > 0 && <ListSummary kind="faq" rows={faqRows} />}
              <OpenDialogButton
                label={faqRows.length === 0 ? SPEC.faq.addLabel : "Edit the questions"}
                onClick={() => openList("faq")}
                disabled={extrasOff}
                title={extrasOff ? EXTRAS_HINT : undefined}
              />
            </Section>

            {/* ── Cover image (optional) ── */}
            <Section title="Cover image" optional>
              <ExtraNote>
                {extrasOff
                  ? `A cover image cannot be saved yet. ${EXTRAS_HINT}`
                  : "It becomes the photo at the top of the event page and the photo in the event cards."}
              </ExtraNote>
              {/* ⚠️ NO PREVIEW IN THE CARD, deliberately — the picture is shown
                  full width inside the dialog, and a third-of-a-column thumbnail
                  beside two text cards would be the only image on the form. A
                  LINE saying what is attached is what this card owes the
                  organiser; `break-all` because a pasted URL has no spaces to
                  wrap at and would otherwise widen its card. */}
              {!!imageUrl.trim() && (
                <p className="text-[15px] break-all" style={{ color: "var(--brand-hint)" }}>
                  {isUploadedImage(imageUrl)
                    ? "A picture from this device is attached."
                    : imageUrl.trim()}
                </p>
              )}
              <OpenDialogButton
                label={imageUrl.trim() ? "Change the cover image" : "Add a cover image"}
                onClick={() => setEditingCover(true)}
                disabled={extrasOff}
                title={extrasOff ? EXTRAS_HINT : undefined}
              />
            </Section>

          </div>

          {/* ── PARKED 2026-08-14 (MVP): the Community section ──
              An opt-in "Add to {community}" toggle, shown only to organisers who
              already had a community. Deferred to Phase 2 with the rest of the
              feature; see the parked state block near the top of this file.

          {community && (
            <Section title="Community">
              <p className="text-sm" style={{ color: "var(--brand-hint)" }}>
                You have a community called <span className="font-semibold" style={{ color: "var(--brand-text)" }}>{community.name}</span>.
                Adding this event to your community groups it with your other events on your community page.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setCommunityId(communityId ? "" : community.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: communityId ? GREEN : "var(--brand-surface)",
                    color: communityId ? "var(--brand-on-green)" : "var(--brand-text)",
                    border: `2px solid ${communityId ? GREEN : "var(--brand-control-border)"}`,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                  {communityId ? `Added to ${community.name}` : `Add to ${community.name}`}
                </button>
              </div>
            </Section>
          )}

          */}

          {/* ── Whatever the save had to say, last in the sequence ──
              The two buttons used to sit in a bordered card here with these two
              messages. The buttons left for the fixed bar below; the messages
              stayed, because an 88px bar has no room for a sentence beside two
              buttons and a failure the organiser cannot read is worse than one
              they have to look down for. They land where the buttons were, which
              is where the eye already is after pressing one. */}
          {error && (
            <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-lg" style={{ color: GREEN, backgroundColor: "color-mix(in srgb, var(--brand-green) 10%, transparent)" }}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {submitMode === "publish" ? "Event published!" : "Draft saved!"} Redirecting…
            </div>
          )}

          {/* ── The two submits, in `/event/[id]`'s OWN sticky bar ──

              ⚠️ THIS IS THE SHARED BAR, NOT A COPY OF IT (Gautham, 2026-09-11).
              He asked for these two to look like "Manage attendees" at the foot
              of an organiser's own event page, so they are literally that bar's
              shell and that bar's button, imported. **Do not restyle either
              here** — anything this form wants from them belongs in
              `components/DetailCard.tsx` as a prop.

              ⚠️ `compact` IS THE ONE THING THAT DIFFERS, and it is deliberate
              (Gautham, same day, after seeing it): 72px of bar carrying 48px
              buttons, against the public bar's 88 and 59, and a 2px top edge
              rather than a 1px one because the 1px read as no edge at all.
              **`/event/[id]` and `/community/[slug]` stay at the taller size.**
              Those pages are settled and a public surface does not get restyled
              to suit a console one; if the short bar is ever wanted everywhere,
              the flag comes OUT of `DetailStickyShell` rather than being passed
              from three call sites.

              ⚠️ THIS IS NOT THE 340px RAIL COMING BACK. That rail was a second
              COLUMN beside the form, which put the primary action level with the
              title field and made the page two things to track at once. A bar
              along the bottom is what `/event/[id]` already does, it takes no
              width from the fields, and the cover photo stays in the sequence
              above rather than travelling with the buttons.

              ⚠️ IT SITS INSIDE THE `<form>` AND HAS TO. `position: fixed` moves
              where a button is PAINTED, not where it lives in the document, and
              a submit button is bound to its form by ancestry — lift these two
              out to be tidy and neither one submits anything.

              `ml-auto` because the shell is `justify-between` and a lone child
              lands left. `share` is what makes two of these fit a 320px phone;
              from `sm` up it changes nothing. */}
          <DetailStickyShell gutters={GUTTERS} compact>
            <div className="ml-auto flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <DetailStickyCTA
                type="submit"
                share
                compact
                disabled={isSubmitting || success}
                onClick={() => setSubmitMode("publish")}
                label={
                  isSubmitting && submitMode === "publish" ? (
                    <span className="flex items-center justify-center gap-2">
                      {/* `border-current` so the ring follows the label's tone —
                          linen on the green body, in both themes. */}
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Publishing…
                    </span>
                  ) : "Publish Event"
                }
              />

              <DetailStickyCTA
                type="submit"
                share
                compact
                disabled={isSubmitting || success}
                onClick={() => setSubmitMode("draft")}
                label={isSubmitting && submitMode === "draft" ? "Saving…" : "Save as Draft"}
              />
            </div>
          </DetailStickyShell>

        </form>

        {/* ── The three optional extras' dialogs ──

            ⚠️ MOUNTED ONLY WHILE OPEN, and both read their starting value ON
            MOUNT — that is what makes "Save changes" the only way a change
            reaches this page, and Escape / ✕ / a click outside the way back with
            the draft discarded.

            ⚠️ OUTSIDE THE `<form>`, unlike the sticky bar above, and for the
            mirror-image reason. The bar holds SUBMIT buttons, which are bound to
            their form by ancestry and must stay inside it. These hold ordinary
            fields and a Save that is not a submit; a stray Enter in one of them
            has no business publishing the event, and being outside the form
            element is the guarantee rather than something each dialog has to
            remember. (`ModalShell` portals to `<body>` either way, so this is
            about the React tree, not about where the panel is painted.) */}
        {editingList && (
          <ListEditorModal
            kind={editingList.kind}
            initialRows={editingList.rows}
            open
            onClose={() => setEditingList(null)}
            /* ⚠️ `showAdd`, unlike `/event/[id]`'s call site. A whole agenda is
               written here, and the card outside only opens the dialog — with
               the foot button off, every extra item would cost a Save and a
               reopen. */
            showAdd
            onSave={(rows) => {
              if (editingList.kind === "agenda") setAgendaRows(rows);
              else setFaqRows(rows);
              setEditingList(null);
            }}
          />
        )}

        {editingCover && (
          <CoverImageModal
            value={imageUrl}
            open
            onClose={() => setEditingCover(false)}
            disabled={extrasOff}
            disabledTitle={EXTRAS_HINT}
            onSave={(next) => {
              setImageUrl(next);
              setEditingCover(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// `FormField` and `inputCls` used to live here. They moved to
// `components/FormControls.tsx` when the organiser's edit dialog needed the same
// fields — one definition, so the two forms cannot drift. `Section` and `row()`
// followed them on 2026-09-11 for `/organizer/onboarding`.
