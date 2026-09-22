"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The centred dialog `/organizer/create` picks its cover photo in.
//
//  ⚠️ IT IS THE DIALOG, NOT THE CONTROL. Upload, the pasted link, Remove and
//  every size cap are `CoverImageField`'s, exactly as they are inside
//  `EditEventModal` — this only holds the draft until "Save changes" and hands
//  the finished value back. **Add nothing to the picture control here.**
//
//  ⚠️ `EditEventModal` DOES NOT USE THIS and must not: that dialog already has
//  a Save of its own, and a dialog inside a dialog is two Saves for one photo.
//  It keeps `CoverImageField` inline.
//
//  ⚠️ IT VALIDATES BEFORE IT HANDS ANYTHING BACK, with the same `isImageSrc` the
//  create form's submit uses — so a link that could never render is refused
//  where it was typed rather than at the foot of a long form. That is what lets
//  the create page's card render no error of its own.
//
//  `value` is read ONCE, on mount: the call site mounts this only while it is
//  open, and re-seeding a draft mid-edit would throw away the organiser's pick.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ModalShell } from "@/components/ModalShell";
import { CoverImageField } from "@/components/organizer/CoverImageField";
import { IMAGE_SRC_ERROR, isImageSrc } from "@/lib/image-upload";

export function CoverImageModal({
  value,
  open,
  onClose,
  onSave,
  disabled,
  disabledTitle,
}: {
  value: string;
  open: boolean;
  onClose: () => void;
  /** The trimmed value. `""` when the organiser removed the picture. */
  onSave: (next: string) => void;
  /** True when a save could not survive — see `lib/event-extras.ts`. */
  disabled?: boolean;
  /** Why it is disabled; hung on the controls as a tooltip. */
  disabledTitle?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | undefined>(undefined);

  function submit() {
    const next = draft.trim();
    if (next && !isImageSrc(next)) {
      setError(IMAGE_SRC_ERROR);
      return;
    }
    onSave(next);
  }

  return (
    <ModalShell
      open={open}
      title="Cover image"
      onClose={onClose}
      width="max-w-lg"
      footer={
        // The list dialogs' button, to the letter — same single way out, same
        // reasoning. See `ListEditorModal`.
        <button
          type="button"
          onClick={submit}
          className="w-full py-3.5 rounded-lg text-[16px] font-bold text-[var(--brand-on-green)] transition-colors disabled:opacity-60"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          Save changes
        </button>
      }
    >
      <CoverImageField
        value={draft}
        onChange={(next) => {
          setDraft(next);
          // Cleared as they type, not only on the next Save: a message about a
          // link that has since been replaced is worse than none.
          setError(undefined);
        }}
        error={error}
        disabled={disabled}
        disabledTitle={disabledTitle}
        note="It becomes the photo at the top of the event page and the photo in the event cards."
      />
    </ModalShell>
  );
}
