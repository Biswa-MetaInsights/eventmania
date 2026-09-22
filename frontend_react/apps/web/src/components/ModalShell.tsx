"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The dialog chassis: overlay, panel, title row, close button, Escape and
//  click-outside. Content and footer are the caller's.
//
//  Portalled to <body>, for the reason written up in `ShareModal.tsx`: these
//  dialogs open from controls inside the event hero, which clips
//  (`overflow-hidden`) and transforms its children — and a transformed ancestor
//  becomes the containing block for `position: fixed`, so a dialog rendered in
//  place is pinned inside the hero and clipped away.
//
//  ⚠️ `ShareModal.tsx` predates this and still hand-rolls the same chassis. The
//  values here are copied from it exactly so the three dialogs look identical
//  today; the two should become one. Logged in TODO.md §11 — do not add a
//  FOURTH hand-rolled dialog in the meantime.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  /** Wider than the share dialog's `max-w-md` where the content is a form. */
  width = "max-w-md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ⚠️ NOT ShareModal's `mounted` state. That guard exists because
  // `createPortal(…, document.body)` cannot run on the server — but it buys it
  // with a setState-in-effect, which this repo's lint (rightly) flags. A dialog
  // only ever opens from a click, so `open` is already false through SSR and
  // the first hydration pass; testing for `document` is the same guard with no
  // render cycle and no lint error. Do not copy the state back in.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      {/* max-h + overflow so a long form scrolls INSIDE the panel: the edit
          dialog is taller than a laptop viewport once the venue fields show. */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        /* 90dvh, not 90vh: on a phone the URL bar makes 100vh taller than the
           visible screen, and a 90vh panel put its footer buttons under it. */
        className={`w-full ${width} rounded-lg overflow-hidden flex flex-col max-h-[90dvh]`}
        style={{ backgroundColor: "var(--brand-surface)", border: "1px solid var(--brand-border)" }}
      >
        {/* px-4 below sm: on a 320px phone the panel is 288px wide, and 48px of
            side padding left the form only 240px. */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-[18px] font-bold text-[var(--brand-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--brand-green)_8%,transparent)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 pb-2 overflow-y-auto">{children}</div>

        {footer && <div className="p-4 sm:p-6 pt-4 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
