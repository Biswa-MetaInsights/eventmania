"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The cover-image control: preview, upload, or a pasted link.
//
//  ⚠️ ONE COMPONENT, THREE SURFACES — `EditEventModal` and `CoverImageModal`
//  (which is how `/organizer/create` reaches it), plus `ProfilePictureModal` on
//  the dashboard's Profile tab. An organiser who uploads a picture at create and
//  can only paste a link when they edit has lost the feature, not just the
//  button, which is the drift CLAUDE.md's consistency section exists to stop.
//  **Need it to look different somewhere? Add a prop; do not fork the file.**
//
//  ⚠️ `kind` IS THE ONLY DIFFERENCE A PROFILE PICTURE MAKES: a circular preview
//  instead of a 16:9 box, and `fileToAvatarDataUrl`'s smaller cap instead of the
//  cover one. Upload, the pasted link, Remove and every message are shared.
//
//  ⚠️ `hidePreview` LIVED HERE AND WAS DELETED (Gautham, 2026-09-11). It
//  dropped the picture box for `/organizer/create`, whose card was a third of
//  the page wide. That card no longer holds this control at all — it opens
//  `CoverImageModal`, where there is room for the preview — so both call sites
//  show it. Do not reintroduce it for a narrow surface.
//
//  ⚠️ The "upload" is browser-side — see `lib/image-upload.ts` for what that
//  means and why the size caps matter. Both call sites validate the value with
//  `isImageSrc` from that same file, because a `data:` URL has to pass.
//
//  ⚠️ TWO BUTTONS, NOT A BUTTON + A LABELLED FIELD (Gautham, 2026-09-11). "Or
//  paste an image link" used to be an always-visible FormField under the
//  buttons; it is now a second button, and the url input only appears once
//  "Paste an image link" is clicked (or a link is already the value). The
//  parent Section already marks the whole field "optional", so the per-field
//  "(optional)"/hint microcopy that field carried is gone too — it was saying
//  the same thing twice.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { inputCls } from "@/components/FormControls";
import { fileToAvatarDataUrl, fileToCoverDataUrl, isUploadedImage } from "@/lib/image-upload";
import { OUTLINE_BUTTON, REMOVE_BUTTON } from "@/lib/controls";

/** This control's geometry over the shared outline colours. */
const BUTTON = `flex-1 py-3 px-4 rounded-lg text-[16px] font-bold ${OUTLINE_BUTTON}`;

export function CoverImageField({
  value,
  onChange,
  error,
  disabled,
  disabledTitle,
  note,
  kind = "cover",
}: {
  value: string;
  onChange: (next: string) => void;
  /** The call site's validation error for this field. */
  error?: string;
  /** True when a save could not survive — renders the whole control read-only. */
  disabled?: boolean;
  /** Why it is disabled; hung on the controls as a tooltip. */
  disabledTitle?: string;
  // ⚠️ `inlineLabel` lived here and was DELETED (Gautham, 2026-09-11) — it put
  // "Or paste an image link" beside its input on `/organizer/create`. That
  // section is now a third of the page wide, and the label alone would take
  // most of the row, so both call sites stack. See the same note on
  // `ListEditor`.
  /** The leading explanation. Differs per surface — create says what the
   *  picture becomes, the edit dialog says what it replaces. */
  note: React.ReactNode;
  /** What the picture is FOR. Drives the preview's shape and the size cap the
   *  picked file is squeezed into; nothing else. */
  kind?: "cover" | "avatar";
}) {
  const isAvatar = kind === "avatar";
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const src = value.trim();
  const uploaded = isUploadedImage(src);
  const showPreview = !!src && !error;
  // A link already in `value` shows its box with no extra click; a fresh,
  // empty field waits for "Paste an image link".
  const showLinkInput = !uploaded && (linkOpen || !!src);

  async function accept(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setBusy(true);
    const result = await (isAvatar ? fileToAvatarDataUrl(file) : fileToCoverDataUrl(file));
    setBusy(false);
    if (result.ok) onChange(result.dataUrl);
    else setUploadError(result.message);
  }

  function remove() {
    onChange("");
    setUploadError(null);
    setLinkOpen(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--brand-hint)" }}>
        {note}
      </p>

      {/* ⚠️ A PLAIN <img>, and it must stay one — `next/image` refuses a host
          that is not in next.config.ts's `remotePatterns`, and the whole point
          of this field is that an organiser brings their own. The event hero
          renders it the same way, for the same reason. */}
      {showPreview ? (
        /* The avatar previews as the circle it will be shown in, centred and at
           the dashboard's own size, so what is cropped out is visible BEFORE
           Save rather than after. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={
            isAvatar
              ? "w-40 h-40 mx-auto object-cover rounded-full"
              : "w-full aspect-video object-cover rounded-lg"
          }
          style={{ border: "2px solid var(--brand-control-border)" }}
        />
      ) : isAvatar ? (
        <div
          className="w-40 h-40 mx-auto rounded-full flex items-center justify-center px-4 text-center"
          style={{
            border: "2px solid var(--brand-control-border)",
            backgroundColor: "var(--brand-surface)",
          }}
        >
          <span className="text-[15px]" style={{ color: "var(--brand-hint)" }}>
            No picture yet
          </span>
        </div>
      ) : (
        /* Capped, unlike the preview: 16:9 of the edit dialog's full width is
           350px of empty box, and this control is used in a narrow dialog as
           well as on the wide create page.

           ⚠️ NO DASHED BORDER (Gautham, 2026-09-09) — there are none anywhere in
           this product. An empty slot is told apart from a filled one by the
           tinted surface behind it, not by the edge. */
        <div
          className="w-full aspect-video max-h-[220px] rounded-lg flex items-center justify-center px-4 text-center"
          style={{
            border: "2px solid var(--brand-control-border)",
            backgroundColor: "var(--brand-surface)",
          }}
        >
          <span className="text-[15px]" style={{ color: "var(--brand-hint)" }}>
            No cover image yet
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          title={disabled ? disabledTitle : undefined}
          onClick={() => fileRef.current?.click()}
          className={BUTTON}
        >
          {busy ? "Preparing…" : src ? "Replace image" : "Upload an image"}
        </button>

        {/* Hidden once a file is uploaded — pasting a link only makes sense
            after Remove clears the upload, same as the old field's rule. */}
        {!uploaded && (
          <button
            type="button"
            disabled={disabled || busy}
            title={disabled ? disabledTitle : undefined}
            onClick={() => setLinkOpen(true)}
            className={BUTTON}
          >
            Paste an image link
          </button>
        )}

        {/* The shared `REMOVE_BUTTON` look — the same edge and label colour as the
            upload control beside it, terracotta only under the pointer. The border
            is a CLASS here, not the inline one it used to carry, so the hover can
            recolour it. */}
        {!!src && (
          <button
            type="button"
            disabled={disabled}
            onClick={remove}
            className={`px-4 py-3 rounded-lg text-[16px] font-bold ${REMOVE_BUTTON}`}
          >
            Remove
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Cleared so picking the SAME file again still fires a change.
            e.target.value = "";
            void accept(file);
          }}
        />
      </div>

      {uploadError && (
        <p className="text-xs" style={{ color: "#EF4444" }}>{uploadError}</p>
      )}

      {/* An uploaded picture lives in the value as a few hundred KB of base64 —
          putting THAT in a text input is unreadable and one stray keystroke from
          a broken image, so the link box only exists while there is no upload. */}
      {uploaded ? (
        <p className="text-[15px]" style={{ color: "var(--brand-hint)" }}>
          Uploaded from this device. Remove it to paste a link instead.
        </p>
      ) : showLinkInput ? (
        <div className="space-y-1">
          <input
            type="url"
            value={value}
            disabled={disabled}
            title={disabled ? disabledTitle : undefined}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            className={`${inputCls(!!error)} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          />
          {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
        </div>
      ) : null}
    </div>
  );
}
