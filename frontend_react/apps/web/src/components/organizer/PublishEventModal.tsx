"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Publish event" — the confirmation a draft passes through on its way to being
//  findable by strangers.
//
//  ⚠️ IT SETS `status: "published"` AND NOTHING ELSE — the mirror of
//  `CancelEventModal`. No announcement goes out, no room is opened, nobody is
//  told (TODO.md §19.1, §20). The dialog says so rather than letting an
//  organiser assume a launch happened.
//
//  ⚠️ THE CAPACITY WARNING IS NOT PEDANTRY. `/event/[id]` computes
//  `left = capacity - tickets_sold` and renders "Sold Out" with a disabled CTA
//  at zero — so publishing an event whose capacity is still 0 produces a live
//  listing nobody can book, which looks like a bug in the product rather than a
//  blank field. It warns and still allows it: an organiser may be publishing to
//  hold the URL. **Do not turn it into a hard block without asking.**
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@eventmind/types";
import { eventsSource } from "@/lib/data-source";
import { formatPrice } from "@/lib/currency";
import { ModalShell } from "@/components/ModalShell";

export function PublishEventModal({
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
  const noCapacity = (event.capacity ?? 0) <= 0;

  const publish = useMutation({
    mutationFn: () =>
      eventsSource.update(String(event.id), { status: "published" }).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["event", String(event.id)], updated);
      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      onClose();
    },
    onError: () => setError("Could not publish the event. Please try again."),
  });

  return (
    <ModalShell
      open={open}
      title="Publish this event?"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-lg text-[16px] font-bold transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", color: "var(--brand-text)" }}
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={() => { setError(null); publish.mutate(); }}
            disabled={publish.isPending}
            className="flex-[2] py-3.5 rounded-lg text-[16px] font-bold text-[var(--brand-on-green)] transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-green)" }}
          >
            {publish.isPending ? "Publishing…" : "Yes, publish it"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[16px] leading-relaxed text-[var(--brand-text)]">
          <b>{event.title}</b> appears in search and on the home page, and anyone can book it at{" "}
          <b>{formatPrice(event.price, event.currency)}</b>.
        </p>

        {noCapacity && (
          <div className="rounded-lg px-4 py-3" style={{ border: "1px solid var(--brand-border)" }}>
            <p className="text-[15px] leading-relaxed text-[var(--brand-text)]">
              <b>The allowed number of participants is 0.</b> The page will show <i>Sold Out</i> and
              nobody can book. Set a capacity in <i>Edit details</i> first.
            </p>
          </div>
        )}

        {/* Stated plainly BECAUSE it is not built. See the file header. */}
        <div
          className="rounded-lg px-4 py-3 space-y-2"
          style={{ border: "1px solid var(--brand-border)" }}
        >
          <p className="text-[15px] font-bold text-[var(--brand-text)]">What this does not do</p>
          <ul className="text-[15px] leading-relaxed list-disc pl-5 text-[var(--brand-text)]">
            <li>Nobody is notified — there is no announcement on publish.</li>
            <li>You can still edit or cancel afterwards.</li>
          </ul>
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
        )}
      </div>
    </ModalShell>
  );
}
