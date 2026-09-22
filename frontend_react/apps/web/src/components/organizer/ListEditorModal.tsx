"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The centred dialog every organiser-authored list is edited in — the agenda,
//  the announcements and the FAQ — on `/event/[id]` AND on `/organizer/create`.
//
//  ⚠️ IT OWNS THE DRAFT, NOT THE SAVE. The rows live here until "Save changes";
//  the call site decides what that means. `EditListModal` spends it on a
//  mutation against the event, `/organizer/create` spends it on a `useState`
//  the create payload is built from later. **That split is the whole reason
//  this file exists** — the two surfaces must add, remove, reorder and validate
//  a row identically, and the create form had the same editor inline in a card
//  with no dialog at all until 2026-09-11 (Gautham: the create form's Add
//  controls should open the same middle-of-the-screen menu the event page's do).
//
//  ⚠️ `initialRows` IS READ ONCE, ON MOUNT. Both call sites mount this only
//  while it is open, so it always opens on the caller's current rows; a later
//  prop change is ignored on purpose, or a re-render mid-edit would throw away
//  what the organiser has typed.
//
//  ⚠️ IT VALIDATES BEFORE IT HANDS ANYTHING BACK. `onSave` receives rows with
//  the blank ones dropped and every required field filled, which is what lets
//  `/organizer/create` skip list validation at submit entirely.
//
//  The rows themselves are `ListEditor`'s — add a list, a field type or a
//  validation rule THERE, never here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ModalShell } from "@/components/ModalShell";
import {
  ListEditor,
  SPEC,
  dropBlankRows,
  rowErrors,
  type ListKind,
  type Row,
} from "@/components/organizer/ListEditor";

export function ListEditorModal({
  kind,
  initialRows,
  open,
  onClose,
  onSave,
  saving = false,
  error = null,
  showAdd = false,
}: {
  kind: ListKind;
  /** Seeded on mount — see the note above. */
  initialRows: Row[];
  open: boolean;
  onClose: () => void;
  /** Blank rows already dropped, required fields already checked. */
  onSave: (rows: Row[]) => void;
  /** True while the call site's save is in flight. */
  saving?: boolean;
  /** Whatever that save had to say when it failed. */
  error?: string | null;
  /**
   * The "add another row" button at the foot of the editor.
   *
   * ⚠️ OFF BY DEFAULT, because `/event/[id]` opens this from a control that
   * already said "Post an announcement" and a second button repeating those
   * words inside it is the same question asked twice (Gautham, 2026-09-02).
   * **`/organizer/create` turns it ON and needs it:** that form is where a
   * whole agenda is written, and its card outside only ever opens the dialog.
   */
  showAdd?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    // A row added and then left completely blank is an accident, not data.
    const kept = dropBlankRows(kind, rows);
    const found = rowErrors(kind, kept);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setRows(kept);
    onSave(kept);
  }

  return (
    <ModalShell
      open={open}
      title={SPEC[kind].title}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        // ⚠️ SAVE IS THE ONLY BUTTON HERE (Gautham, 2026-09-02). Discard was the
        // third way out of a dialog that already has two — the title row's ✕ and
        // `ModalShell`'s Escape / click-outside — and it read as a decision to
        // make rather than the way back. **Do not add it back, and do not put a
        // Cancel in its place**; the other organiser dialogs keep their pair
        // because each commits something destructive or irreversible.
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="w-full py-3.5 rounded-lg text-[16px] font-bold text-[var(--brand-on-green)] transition-colors disabled:opacity-60"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      <div className="space-y-5">
        <ListEditor kind={kind} rows={rows} onChange={setRows} errors={errors} showAdd={showAdd} />

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
        )}
      </div>
    </ModalShell>
  );
}
