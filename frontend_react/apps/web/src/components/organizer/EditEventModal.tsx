"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Edit details" — the organiser's edit dialog on their own event page.
//
//  ⚠️ IT MIRRORS `/organizer/create` (Gautham, 2026-09-01). The rule is that
//  anything an organiser sets on the create form they can change here, and
//  anything `/event/[id]` renders they can set in both places. Three fields are
//  the deliberate exceptions, each read-only and each SAYING SO on the surface —
//  a field that is absent reads as a feature nobody built, one that is shown and
//  locked reads as a decision. **Do not make any of the three editable, and do
//  not delete them either.**
//
//  ⚠️ TITLE — SHOWN, NOT EDITABLE (Gautham, 2026-09-01). It is the one field a
//  ticket, a share image and a calendar entry all carry a copy of. It used to be
//  absent entirely; it is displayed now so an organiser can see the dialog is
//  about the right event.
//
//  ⚠️ PRICE AND CURRENCY — SHOWN, NOT EDITABLE (Gautham, 2026-09-01). This
//  REVERSES the 2026-08-24 decision that made the price editable with a warning:
//  a price is what a ticket, a receipt and every Earnings total were written in,
//  and the mixed-currency problem in TODO.md §19.10 is the same problem a moved
//  price has in miniature. Both are chosen once, on the create form. **Do not
//  re-add a price input without asking.**
//
//  ⚠️ CAPACITY IS STILL FREELY EDITABLE, including BELOW `tickets_sold`
//  (Gautham, 2026-08-24) — free edit, warning only. What the dialog owes the
//  organiser there is an honest sentence about who that affects, not a block.
//  **Do not add a floor**, and do not delete the warning either; it is the whole
//  of the guardrail.
//
//  ⚠️ THE SCHEDULE AND VENUE FIELDS ARE A POSTPONEMENT. Moving the date, the
//  time or the venue is not an edit to a listing, it is a change to an event
//  people have arranged their day around, and the backend does not treat it as
//  one yet: nothing notifies or emails the ticket holders. The dialog therefore
//  SAYS SO rather than implying someone else will handle it. **Do not soften
//  that line into "attendees will be notified" until TODO.md §20 is built** — it
//  would be a promise to an organiser that quietly costs their attendees the
//  event.
//
//  ⚠️ THE OFFER NAME AND THE COVER IMAGE HAVE NO BACKEND COLUMN. They are
//  disabled off `EXTRAS_ARE_LOCAL` and explain themselves with `EXTRAS_HINT` —
//  see `lib/event-extras.ts` and TODO.md §19.12. Everything else in this dialog
//  is real in both data modes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CITIES, isOnlineCity, type City } from "@eventmind/store";
import type { Event } from "@eventmind/types";
import { EXTRAS_ARE_LOCAL, eventsSource } from "@/lib/data-source";
import { EXTRAS_HINT } from "@/lib/event-extras";
import {
  CATEGORIES,
  EVENT_TYPES,
  LANGUAGES,
  TARGET_AUDIENCES,
  normaliseEventType,
  parseAudience,
  withCurrent,
  type EventType,
} from "@/lib/event-options";
import { formatPrice } from "@/lib/currency";
import { IMAGE_SRC_ERROR, isImageSrc } from "@/lib/image-upload";
import { DateTimeInput, FormField, inputCls } from "@/components/FormControls";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ModalShell } from "@/components/ModalShell";
import { CoverImageField } from "@/components/organizer/CoverImageField";
import { AudienceChip } from "@/components/organizer/AudienceChip";

/** Real cities only — "Online" is the pseudo-city the picker uses for a format,
 *  and a venue is never in it. Format comes from the event's own `event_type`. */
const REAL_CITIES = CITIES.filter((c) => !isOnlineCity(c));

/**
 * ISO → the `datetime-local` input's format, in LOCAL time.
 *
 * `toISOString().slice(0,16)` is the tempting one-liner and it is wrong: it
 * converts to UTC first, so an organiser in IST opens the dialog to find their
 * 7pm event showing as 1:30pm. Read the local parts instead.
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

/** A section heading inside the dialog. The form is five groups now, not one
 *  list — an unlabelled run of nine fields is where an organiser edits the
 *  wrong one. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3
        className="text-[15px] font-bold pb-2"
        style={{ color: "var(--brand-text)", borderBottom: "1px solid var(--brand-border)" }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * A field that is SHOWN and cannot be changed — title, price, currency.
 *
 * ⚠️ Deliberately NOT a `<input disabled>`. A greyed-out input reads as
 * "temporarily unavailable", which is what the extras controls in this dialog
 * genuinely are; these three are permanent by decision, and `why` is the
 * sentence that tells the two apart. Same geometry as `inputCls` so the locked
 * rows still line up with the editable ones beside them.
 */
function ReadOnly({ label, value, why }: { label: string; value: string; why: string }) {
  return (
    <FormField label={label} hint="cannot be changed">
      <div
        className="w-full px-4 py-3 rounded-lg text-sm font-medium"
        style={{
          border: "1px solid var(--brand-border)",
          backgroundColor: "color-mix(in srgb, var(--brand-hint) 6%, transparent)",
          color: "var(--brand-text)",
        }}
      >
        {value}
      </div>
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--brand-hint)" }}>{why}</p>
    </FormField>
  );
}

export function EditEventModal({
  event,
  open,
  onClose,
  focusField,
}: {
  event: Event;
  open: boolean;
  onClose: () => void;
  /**
   * Which field the caret lands in when the dialog opens.
   *
   * ⚠️ THIS EXISTS BECAUSE THE DIALOG HAS MORE THAN ONE DOOR (Gautham,
   * 2026-09-02). Opened from the hero's round control it is "edit the event",
   * and the top of the form is the right place to start. Opened from the pencil
   * beside **About this event**, the organiser has already said which paragraph
   * they mean — landing them at the top and making them scroll past six fields
   * to find it would throw that away. Undefined = no autofocus, the hero's
   * behaviour, unchanged.
   *
   * **Add a value here rather than a second dialog** if another section ever
   * grows its own pencil.
   */
  focusField?: "description";
}) {
  const queryClient = useQueryClient();
  const loc = event.location ?? {};
  const sold = event.tickets_sold ?? 0;

  /**
   * The event's current city as a picker option.
   *
   * ⚠️ An event's city is NOT guaranteed to be one of `CITIES` — a
   * Ticketmaster-synced event can sit in any city the provider serves. Falling
   * back to `CITIES[1]` would silently relocate it to New York on the first
   * save, so an unknown city is added to the list as its own option, carrying
   * the event's own coordinates.
   */
  const cityOptions = useMemo(() => {
    const current = str(loc.city);
    const known = REAL_CITIES.some((c) => c.name.toLowerCase() === current.toLowerCase());
    if (!current || known) return REAL_CITIES;
    return [
      { name: current, country: "", lat: num(loc.latitude) ?? 0, lng: num(loc.longitude) ?? 0 } as City,
      ...REAL_CITIES,
    ];
  }, [loc.city, loc.latitude, loc.longitude]);

  const initialCity =
    cityOptions.find((c) => c.name.toLowerCase() === str(loc.city).toLowerCase()) ?? cityOptions[0];
  const initialVenue = str(loc.address) || str(loc.name);
  const initialLink = str(loc.online_url) || str(loc.url);
  const initialFormat = normaliseEventType(event.event_type);

  /* ⚠️ Every choice list below is run through `withCurrent`. An event's own
     value is not guaranteed to be in ours — a Ticketmaster row carries whatever
     the provider sent — and a `<select>` given a value it has no `<option>` for
     silently displays option zero, so the first save would rewrite the event's
     category to "Technology". Same trap as `cityOptions` above.

     Audience is the same problem in list form: an unrecognised value that drew
     no chip would be deleted by the next save, because the chips ARE the value. */
  const categoryOptions = useMemo(() => withCurrent(CATEGORIES, event.category), [event.category]);
  const languageOptions = useMemo(() => withCurrent(LANGUAGES, event.language), [event.language]);
  const audienceOptions = useMemo(() => {
    const chosen = parseAudience(event.target_audience);
    return chosen.reduce((list, a) => withCurrent(list, a), TARGET_AUDIENCES);
  }, [event.target_audience]);

  const [category, setCategory] = useState(event.category ?? categoryOptions[0]);
  const [eventType, setEventType] = useState<EventType>(initialFormat);
  const [language, setLanguage] = useState(event.language ?? "English");
  const [targetAudience, setTargetAudience] = useState<string[]>(parseAudience(event.target_audience));
  const [tags, setTags] = useState((event.tags ?? []).join(", "));
  const [eventWebsite, setEventWebsite] = useState(event.event_website ?? "");
  const [description, setDescription] = useState(event.description ?? "");

  /**
   * Put the caret in the description box when the pencil beside "About this
   * event" is what opened the dialog.
   *
   * ⚠️ A `ref` + effect, NOT `autoFocus`. Two reasons, both load-bearing:
   * `autoFocus` drops the caret at position 0, so the organiser would be typing
   * in FRONT of their own description; and the dialog is portalled and its body
   * scrolls, so the field has to be scrolled into view as well as focused.
   * `setSelectionRange(end, end)` does the first, `scrollIntoView` the second.
   *
   * ⚠️ This is a DOM side effect, which is what an effect is for — it is not the
   * `react-hooks/set-state-in-effect` pattern this repo lints against, and it
   * must not be "fixed" into one. `[]` deps: the dialog is mounted only while
   * open (see its call site), so this runs exactly once per opening.
   */
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusField !== "description") return;
    const el = descriptionRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const end = el.value.length;
    el.setSelectionRange(end, end);
    el.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [startDate, setStartDate] = useState(toLocalInput(event.start_date));
  const [endDate, setEndDate] = useState(toLocalInput(event.end_date));
  const [city, setCity] = useState<City>(initialCity);
  // Fixtures and organiser-created events name the venue differently
  // (`name` vs `address`); prefill from whichever exists and always SAVE to
  // `address`, which is the key `/event/[id]` and the cards actually read.
  const [address, setAddress] = useState(initialVenue);
  const [onlineUrl, setOnlineUrl] = useState(initialLink);
  // Capacity is kept as a STRING while editing. A `number` state cannot hold the
  // empty field an organiser passes through on the way from "150" to "200" — it
  // becomes NaN or snaps to 0 under their cursor.
  const [capacity, setCapacity] = useState(String(event.capacity ?? 0));
  const [offerName, setOfferName] = useState(event.offer_name ?? "");
  const [imageUrl, setImageUrl] = useState(event.image_url ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  /* Which location fields apply — driven by the FORMAT CONTROL, not by
     `event.event_type`, now that the format is editable here. Switching an
     in-person event online has to swap the venue fields for a link in the same
     render, or the organiser is asked for an address they no longer have. */
  const needsVenue = eventType !== "Online";
  const needsLink = eventType !== "In-Person";

  /** Has anything that constitutes a POSTPONEMENT been touched? Drives the
   *  warning below — shown when it is true rather than always, so it reads as a
   *  consequence of what you just did instead of boilerplate. */
  const postponing =
    startDate !== toLocalInput(event.start_date) ||
    endDate !== toLocalInput(event.end_date) ||
    city.name !== initialCity.name ||
    address !== initialVenue ||
    onlineUrl !== initialLink ||
    // A format switch IS a venue change — moving an in-person event online is
    // the largest one there is, not a listing tweak.
    eventType !== initialFormat;

  const capacityNum = Number(capacity);
  const capacityMoved = Number.isFinite(capacityNum) && capacityNum !== (event.capacity ?? 0);
  /** The case the guardrail was traded away for — say it plainly. */
  const cutsBelowSold = Number.isFinite(capacityNum) && capacityNum < sold;
  const priceNum = event.price ?? 0;

  const save = useMutation({
    mutationFn: () => {
      const location: Record<string, unknown> = { ...loc };
      // ⚠️ DELETE the keys the new format has no use for. The spread above
      // carries the whole of the old location forward, so an event switched to
      // Online would keep its street address and go on rendering it as the
      // venue on `/event/[id]`, which reads the address first.
      if (!needsVenue) {
        delete location.address;
        delete location.name;
      }
      if (!needsLink) {
        delete location.online_url;
        delete location.url;
      }
      if (needsVenue) {
        location.address = address.trim();
        // ⚠️ Coordinates move ONLY when the city does. `City.lat/lng` is a city
        // CENTROID; an event carries its venue's own point, which is what
        // "Similar events" searches a radius around. Writing the centroid on
        // every save would drag each event a couple of kilometres towards the
        // city centre for the crime of having its description edited.
        if (city.name !== initialCity.name) {
          location.city = city.name;
          location.latitude = city.lat;
          location.longitude = city.lng;
        }
      }
      if (needsLink) location.online_url = onlineUrl.trim();

      return eventsSource
        .update(String(event.id), {
          description: description.trim(),
          category,
          event_type: eventType,
          language,
          // Stored as ONE comma-joined string, exactly as `/organizer/create`
          // writes it — `parseAudience` is the reader for both.
          target_audience: targetAudience.join(", "),
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          event_website: eventWebsite.trim(),
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          location,
          capacity: capacityNum,
          // ⚠️ NO `price` AND NO `currency` (Gautham, 2026-09-01). Both are
          // fixed at creation; see the file header before adding either back.
          // ⚠️ Only sent where a save can keep them. In real mode the controls
          // are disabled, so these still hold the event's own values and
          // `eventsSource.update` strips them anyway — belt and braces, because
          // a field that silently reverts is worse than one that is greyed out.
          ...(EXTRAS_ARE_LOCAL
            ? { offer_name: offerName.trim() || undefined, image_url: imageUrl.trim() || undefined }
            : {}),
        })
        .then((r) => r.data);
    },
    onSuccess: (updated) => {
      // Write straight into the page's own cache entry so the hero, the booking
      // card and the sticky bar all show the new details without a refetch.
      queryClient.setQueryData(["event", String(event.id)], updated);
      // The console lists this event too; let its rows re-derive their bucket.
      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      onClose();
    },
    onError: () => setError("Could not save your changes. Please try again."),
  });

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (description.trim().length < 20) errors.description = "Description must be at least 20 characters.";
    if (!startDate) errors.startDate = "Start date is required.";
    if (!endDate) errors.endDate = "End date is required.";
    if (startDate && endDate && new Date(endDate) <= new Date(startDate))
      errors.endDate = "End date must be after start date.";
    if (needsVenue && !address.trim()) errors.address = "Venue address is required for in-person events.";
    if (needsLink && !onlineUrl.trim()) errors.onlineUrl = "Online link is required for online events.";

    // Not-a-number and negative are errors; "fewer places than you have sold" is
    // deliberately NOT one — that is the warning below, by design.
    if (!Number.isFinite(capacityNum) || !Number.isInteger(capacityNum) || capacityNum < 0)
      errors.capacity = "Enter a whole number of places, 0 or more.";
    // Same test the create form applies to this field, worded the same way.
    if (eventWebsite.trim() && !/^https?:\/\/.+/.test(eventWebsite.trim()))
      errors.eventWebsite = "Website must start with http:// or https://";
    // The create form's test, and now literally its function — an uploaded
    // cover is a `data:` URL, which an http(s)-only test would reject.
    if (imageUrl.trim() && !isImageSrc(imageUrl)) errors.imageUrl = IMAGE_SRC_ERROR;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function submit() {
    setError(null);
    if (!validate()) return;
    save.mutate();
  }

  function toggleAudience(item: string) {
    setTargetAudience((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }

  const descMax = 1000;
  const extrasOff = !EXTRAS_ARE_LOCAL;

  return (
    <ModalShell
      open={open}
      title="Edit event details"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-lg text-[16px] font-bold transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", color: "var(--brand-text)" }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={save.isPending}
            className="flex-[2] py-3.5 rounded-lg text-[16px] font-bold text-[var(--brand-on-green)] transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-green)" }}
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="space-y-7">
        <Group title="About">
          <ReadOnly
            label="Event Title"
            value={event.title}
            why="The title is printed on every ticket already issued and baked into the share image and any calendar entry an attendee saved. To run this under a different name, duplicate the event instead."
          />

          {/* Category and Language sit side by side, same pairing and same
              order as `/organizer/create`'s Event Basics. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls(false)}
              >
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <FormField label="Language">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputCls(false)}
              >
                {languageOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </FormField>
          </div>

          {/* ⚠️ The same segmented control as the create form, and it drives the
              "Where" group below — see `needsVenue` / `needsLink`. Changing it
              also trips the postponement notice. */}
          <FormField label="Event Type">
            <SegmentedControl
              options={EVENT_TYPES}
              value={eventType}
              onChange={setEventType}
              ariaLabel="Event Type"
              fill
            />
          </FormField>

          <FormField label={`About this event (${description.length}/${descMax})`} error={fieldErrors.description}>
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, descMax))}
              rows={5}
              placeholder="What is this event about? What will attendees learn or experience?"
              className={inputCls(!!fieldErrors.description)}
            />
          </FormField>

          <FormField label="Target Audience" hint="Select all that apply">
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map((a) => (
                <AudienceChip
                  key={a}
                  label={a}
                  selected={targetAudience.includes(a)}
                  onToggle={() => toggleAudience(a)}
                />
              ))}
            </div>
          </FormField>

          <FormField label="Tags / Keywords" hint="Comma-separated, helps with search">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., AI, machine learning, startups"
              className={inputCls(false)}
            />
          </FormField>

          <FormField label="Event Website" hint="Optional" error={fieldErrors.eventWebsite}>
            <input
              type="url"
              value={eventWebsite}
              onChange={(e) => setEventWebsite(e.target.value)}
              placeholder="https://myevent.com"
              className={inputCls(!!fieldErrors.eventWebsite)}
            />
          </FormField>
        </Group>

        <Group title="When">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField label="Start Date & Time" error={fieldErrors.startDate}>
              <DateTimeInput
                type="datetime-local"
                value={startDate}
                onChange={setStartDate}
                hasError={!!fieldErrors.startDate}
              />
            </FormField>
            <FormField label="End Date & Time" error={fieldErrors.endDate}>
              <DateTimeInput
                type="datetime-local"
                value={endDate}
                min={startDate}
                onChange={setEndDate}
                hasError={!!fieldErrors.endDate}
              />
            </FormField>
          </div>
        </Group>

        {(needsVenue || needsLink) && (
          <Group title="Where">
            {needsVenue && (
              <>
                <FormField label="City">
                  <select
                    value={city.name}
                    onChange={(e) => setCity(cityOptions.find((c) => c.name === e.target.value) ?? cityOptions[0])}
                    className={inputCls(false)}
                  >
                    {cityOptions.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.country ? `${c.name}, ${c.country}` : c.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Venue Address" error={fieldErrors.address}>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., Tour & Taxis, Avenue du Port 86C, Brussels"
                    className={inputCls(!!fieldErrors.address)}
                  />
                </FormField>
              </>
            )}

            {needsLink && (
              <FormField label="Online Event Link" error={fieldErrors.onlineUrl}>
                <input
                  type="url"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="e.g., https://zoom.us/j/..."
                  className={inputCls(!!fieldErrors.onlineUrl)}
                />
              </FormField>
            )}
          </Group>
        )}

        {/* The honest version of "attendees will be notified". Read the file
            header before rewording it. */}
        {postponing && (
          <Notice>
            <b>This counts as postponing the event.</b> Ticket holders booked the old details and
            are not told — contact them yourself.
          </Notice>
        )}

        <Group title="Tickets">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* ⚠️ ONE read-only row for BOTH price and currency — they are one
                decision, taken once on the create form. `formatPrice` renders
                the code alongside the symbol so it is unambiguous which
                currency is locked in. */}
            <ReadOnly
              label="Ticket price"
              value={`${formatPrice(priceNum, event.currency)} ${event.currency ?? "INR"}`}
              why="Every ticket, receipt and earnings total is written in it, so it is fixed once the event is created."
            />

            <FormField
              label="Allowed number of participants"
              hint={sold > 0 ? `${sold} sold` : undefined}
              error={fieldErrors.capacity}
            >
              <input
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputCls(!!fieldErrors.capacity)}
              />
            </FormField>
          </div>

          {/* An offer name on a free event names a discount off nothing.
              ⚠️ It IS still editable, unlike the price it labels: renaming
              "Early bird" costs nobody anything. */}
          {priceNum > 0 && (
            <FormField
              label="Offer name"
              hint={extrasOff ? "needs the backend" : "shown above the price"}
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
          )}
        </Group>

        {/* ⚠️ There used to be a third branch here, for a moved PRICE. It went
            with the price input on 2026-09-01 — the field is read-only now, so
            the warning has nothing left to warn about. */}
        {capacityMoved && (
          <Notice>
            {cutsBelowSold ? (
              <>
                <b>
                  {capacityNum} {capacityNum === 1 ? "place" : "places"} on an event that has sold{" "}
                  {sold}.
                </b>{" "}
                The extra tickets stay valid and nobody is told — contact them yourself.
              </>
            ) : (
              <>
                <b>Changing the capacity tells nobody.</b> It only changes the places left on sale.
              </>
            )}
          </Notice>
        )}

        {/* ⚠️ THE SAME CONTROL `/organizer/create` USES — preview, upload and
            pasted link all live in `CoverImageField`. An organiser who can
            upload a picture when they create the event and only paste a link
            when they edit it has lost the feature, not just the button. */}
        <Group title="Cover image">
          <CoverImageField
            value={imageUrl}
            onChange={setImageUrl}
            error={fieldErrors.imageUrl}
            disabled={extrasOff}
            disabledTitle={EXTRAS_HINT}
            note="It replaces the photo at the top of this page and the one on the event cards."
          />
        </Group>

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
        )}
      </div>
    </ModalShell>
  );
}

/**
 * The consequence block. Three of them can appear at once.
 *
 * ⚠️ IT CARRIES A BORDER, NOT A FILL (Gautham, 2026-09-08). It used to be a 12%
 * terracotta wash; the dialog bodies are brand white / brand dark now, with no
 * accent tint anywhere but the buttons. The sibling blocks in
 * `CancelEventModal`, `PublishEventModal` and `DuplicateEventModal` were moved
 * with it — **do not tint one of the four back on its own.**
 */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[15px] leading-relaxed rounded-lg px-4 py-3"
      style={{ border: "1px solid var(--brand-border)", color: "var(--brand-text)" }}
    >
      {children}
    </p>
  );
}
