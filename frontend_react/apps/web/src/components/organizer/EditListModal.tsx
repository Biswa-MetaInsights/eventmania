"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The SAVE behind all three organiser-authored lists on `/event/[id]` — the
//  agenda, the announcements and the FAQ.
//
//  ⚠️ THE DIALOG ITSELF IS `ListEditorModal`, and the rows inside it are
//  `ListEditor`. This file is only what "Save changes" means on the event page:
//  one mutation against the event, straight into the page's cache entry.
//  `/organizer/create` mounts the same dialog and spends its save on local
//  state instead. **Add a list, a field type or a validation rule in
//  `ListEditor`; change the dialog in `ListEditorModal`; neither belongs here.**
//
//  ⚠️ THREE DIALOGS WERE THE OBVIOUS BUILD AND ARE THE WRONG ONE. The lists
//  differ only in their field names and whether order is meaningful; three
//  copies would drift on the things that actually matter — the add/remove
//  affordance, the validation, the empty-row rule, the save path — which is the
//  drift CLAUDE.md's consistency section exists to stop.
//
//  ⚠️ IT SAVES THE WHOLE ARRAY, not a diff. These live in one JSON-ish field on
//  the event, so a partial write has no meaning — and because the dialog is
//  mounted only while open (see the note at its call site in
//  `app/event/[id]/page.tsx`), it always opens on the event's current rows —
//  plus the one blank `extraRow` the call site hands it for an empty list.
//
//  ⚠️ NONE OF THIS PERSISTS AGAINST THE REAL BACKEND — there is no column for
//  any of the three (`lib/event-extras.ts`, TODO.md §19.12). The page never
//  opens this dialog in real mode; every entry point is disabled with
//  `EXTRAS_HINT`. **Do not add a call site that skips that check.**
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event } from "@eventmind/types";
import { eventsSource } from "@/lib/data-source";
import { ListEditorModal } from "@/components/organizer/ListEditorModal";
import { toPatch, toRows, type ListKind, type Row } from "@/components/organizer/ListEditor";

export type { ListKind };

export function EditListModal({
  event,
  kind,
  extraRow,
  open,
  onClose,
}: {
  event: Event;
  kind: ListKind;
  /**
   * A blank row to open on, ON TOP of whatever the event already holds.
   *
   * ⚠️ THE CALL SITE MAKES IT, IN THE CLICK HANDLER, and that is not ceremony:
   * `blankRow` goes through `extraId()`, which is exactly the impurity
   * `react-hooks/purity` flags in render — including inside a `useState`
   * initialiser. Passing the finished row in keeps the impure call in the event
   * handler where it belongs.
   *
   * The page passes one when the list is EMPTY, so pressing "Post an
   * announcement" lands on the composer rather than on an empty state offering
   * the same words a second time (Gautham, 2026-09-02). A list that already has
   * rows was opened with "Edit" and opens on those rows, unchanged.
   */
  extraRow?: Row | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Pure, and only read once — `ListEditorModal` seeds its draft on mount.
  const existing = toRows(kind, event);
  const initialRows = extraRow ? [...existing, extraRow] : existing;

  const save = useMutation({
    mutationFn: (next: Row[]) =>
      eventsSource
        .update(String(event.id), toPatch(kind, next, new Date().toISOString()))
        .then((r) => r.data),
    onSuccess: (updated) => {
      // Straight into the page's cache entry, so the section below re-renders
      // without a refetch — the same write `EditEventModal` does.
      queryClient.setQueryData(["event", String(event.id)], updated);
      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      onClose();
    },
    onError: () => setError("Could not save. Please try again."),
  });

  return (
    <ListEditorModal
      kind={kind}
      initialRows={initialRows}
      open={open}
      onClose={onClose}
      onSave={(rows) => {
        setError(null);
        save.mutate(rows);
      }}
      saving={save.isPending}
      error={error}
    />
  );
}
