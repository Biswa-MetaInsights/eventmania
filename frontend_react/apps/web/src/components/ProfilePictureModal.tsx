"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The dialog a participant picks their profile picture in.
//
//  ⚠️ IT IS THE DIALOG, NOT THE CONTROL — the same split as `CoverImageModal`,
//  and for the same reason. Upload, the pasted link, Remove and every size cap
//  are `CoverImageField`'s (with `kind="avatar"`, which is the whole of the
//  difference); this only holds the draft until "Save changes". **Add nothing to
//  the picture control here** — a second copy of that control is how the create
//  form and the edit dialog drifted apart before.
//
//  ⚠️ It validates with the SAME `isImageSrc` the event forms use, because an
//  uploaded picture is a `data:` URL and an http(s)-only test would refuse the
//  file the picker had just accepted.
//
//  `value` is read ONCE, on mount: the call site mounts this only while it is
//  open, and re-seeding a draft mid-edit would throw away the pick.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ModalShell } from "@/components/ModalShell";
import { CoverImageField } from "@/components/organizer/CoverImageField";
import { IMAGE_SRC_ERROR, isImageSrc } from "@/lib/image-upload";

export function ProfilePictureModal({
  value,
  open,
  onClose,
  onSave,
}: {
  value: string;
  open: boolean;
  onClose: () => void;
  /** The trimmed value. `""` when they removed the picture. */
  onSave: (next: string) => void;
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
      title="Profile picture"
      onClose={onClose}
      width="max-w-lg"
      footer={
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
        kind="avatar"
        value={draft}
        onChange={(next) => {
          setDraft(next);
          // Cleared as they type, not only on the next Save: a message about a
          // link that has since been replaced is worse than none.
          setError(undefined);
        }}
        error={error}
        note="It shows on your profile and beside the account menu. Square pictures look best."
      />
    </ModalShell>
  );
}
