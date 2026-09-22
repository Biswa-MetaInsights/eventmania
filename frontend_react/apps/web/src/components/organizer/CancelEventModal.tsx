"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Cancel event" — the confirmation an organiser passes through before their
//  event stops being an event.
//
//  ⚠️ IT SETS `status: "cancelled"` AND NOTHING ELSE. No refunds are issued, no
//  ticket is voided and nobody is told — the backend for all three is TODO.md
//  §20. So the dialog lists what will and will not happen, in those words. An
//  organiser who believes their attendees were emailed, and finds out at the
//  door that they were not, was misled by this dialog and not by the backlog.
//
//  The confirm button is TERRACOTTA, not green: it is the one destructive
//  action on the event page, and green is the app's colour for "yes, go ahead".
//  There is no red token in the palette and this is not the place to introduce
//  one — terracotta is already the app's second accent.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@eventmind/types";
import { eventsSource } from "@/lib/data-source";
import { ModalShell } from "@/components/ModalShell";

export function CancelEventModal({
  event,
  open,
  onClose,
}: {
  event: Event;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const sold = event.tickets_sold ?? 0;

  const cancel = useMutation({
    mutationFn: () =>
      eventsSource.update(String(event.id), { status: "cancelled" }).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["event", String(event.id)], updated);
      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      onClose();
    },
    onError: () => setError("Could not cancel the event. Please try again."),
  });

  return (
    <ModalShell
      open={open}
      title="Cancel this event?"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-lg text-[16px] font-bold transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", color: "var(--brand-text)" }}
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={() => { setError(null); cancel.mutate(); }}
            disabled={cancel.isPending}
            className="flex-[2] py-3.5 rounded-lg text-[16px] font-bold transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-terracotta)", color: "var(--brand-on-terracotta)" }}
          >
            {cancel.isPending ? "Cancelling…" : "Yes, cancel this event"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[16px] leading-relaxed text-[var(--brand-text)]">
          <b>{event.title}</b> drops out of search and the home page, and nobody can book it.
        </p>

        {/* Stated plainly BECAUSE it is not built. See the file header. */}
        <div
          className="rounded-lg px-4 py-3 space-y-2"
          style={{ border: "1px solid var(--brand-border)" }}
        >
          <p className="text-[15px] font-bold text-[var(--brand-text)]">What this does not do</p>
          <ul className="text-[15px] leading-relaxed list-disc pl-5 text-[var(--brand-text)]">
            <li>
              {sold > 0
                ? `The ${sold} ticket ${sold === 1 ? "holder is" : "holders are"} not told — contact them yourself.`
                : "Nobody is notified."}
            </li>
            <li>No refunds are issued.</li>
          </ul>
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
        )}
      </div>
    </ModalShell>
  );
}
