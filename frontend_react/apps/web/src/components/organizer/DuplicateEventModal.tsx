"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Duplicate event" — copy this event's plan into a fresh draft.
//
//  ⚠️ THE COPY IS ALWAYS A DRAFT AND ALWAYS STARTS AT ZERO SALES. The arithmetic
//  lives in `eventsSource.duplicate()`; the reason lives here, because this is
//  where an organiser reads it: what is being copied is the PLAN, not the
//  trading history. A duplicate that inherited `published` + `tickets_sold: 42`
//  would put a second live listing on the site claiming forty-two people are
//  coming, and the Earnings page would add its phantom revenue to the total.
//
//  ⚠️ IT KEEPS THE ORIGINAL'S DATES, and that is deliberate rather than an
//  oversight — a repeat of last month's workshop is edited from a known date,
//  and blanking them would force a re-entry every time. The dialog says so, so
//  nobody publishes a copy still sitting on the old weekend.
//
//  The title is the ONE field asked for up front: two events with the same name
//  in the console's Events table are indistinguishable, which is exactly when an
//  organiser edits the wrong one.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@eventmind/types";
import { eventsSource } from "@/lib/data-source";
import { FormField, inputCls } from "@/components/FormControls";
import { ModalShell } from "@/components/ModalShell";
import { agendaOf, faqOf } from "@/lib/event-extras";

export function DuplicateEventModal({
  event,
  open,
  onClose,
}: {
  event: Event;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(`${event.title} (copy)`);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const agendaRows = agendaOf(event).length;
  const faqRows = faqOf(event).length;

  const duplicate = useMutation({
    mutationFn: () => eventsSource.duplicate(event, title.trim()).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.setQueryData(["event", String(created.id)], created);
      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      onClose();
      // Land on the copy, not back on the original — the next thing an organiser
      // wants is to change the date, and the copy is a draft only they can see.
      router.push(`/event/${created.id}`);
    },
    onError: () => setError("Could not duplicate the event. Please try again."),
  });

  function submit() {
    setError(null);
    // The backend's `EventCreate` enforces `min_length=5` on the title; catching
    // it here means a 422 never has to be translated back into a field error.
    if (title.trim().length < 5) {
      setFieldError("Give the copy a title of at least 5 characters.");
      return;
    }
    setFieldError(null);
    duplicate.mutate();
  }

  return (
    <ModalShell
      open={open}
      title="Duplicate this event"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-lg text-[16px] font-bold transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", color: "var(--brand-text)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={duplicate.isPending}
            className="flex-[2] py-3.5 rounded-lg text-[16px] font-bold text-[var(--brand-on-green)] transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-green)" }}
          >
            {duplicate.isPending ? "Duplicating…" : "Create the draft"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormField label="Title of the copy" error={fieldError ?? undefined}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls(!!fieldError)}
          />
        </FormField>

        <div
          className="rounded-lg px-4 py-3 space-y-2"
          style={{ border: "1px solid var(--brand-border)" }}
        >
          <p className="text-[15px] font-bold text-[var(--brand-text)]">What comes across</p>
          <ul className="text-[15px] leading-relaxed list-disc pl-5 text-[var(--brand-text)]">
            <li>
              The description, category, format, venue, capacity and price — and{" "}
              <b>the same dates</b>, so change them before you publish.
            </li>
            {(agendaRows > 0 || faqRows > 0) && (
              <li>
                {agendaRows > 0 && `${agendaRows} agenda ${agendaRows === 1 ? "item" : "items"}`}
                {agendaRows > 0 && faqRows > 0 && " and "}
                {faqRows > 0 && `${faqRows} FAQ ${faqRows === 1 ? "entry" : "entries"}`}.
              </li>
            )}
            <li>
              <b>Not</b> the sales, attendees, reviews or announcements.
            </li>
          </ul>
        </div>

        <p className="text-[15px] leading-relaxed text-[var(--brand-hint)]">
          The copy is a <b>draft</b> — nobody sees it until you publish it.
        </p>

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
        )}
      </div>
    </ModalShell>
  );
}
