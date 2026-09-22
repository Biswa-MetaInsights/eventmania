"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ShareFallback } from "@/lib/share-event";

const GREEN = "var(--brand-green)";

interface Props {
  fallback: ShareFallback | null;
  onClose: () => void;
}

/**
 * Desktop fallback for the share flow: previews the story card and offers
 * "Download image" + "Copy link". Shown only when the native share sheet
 * isn't available.
 *
 * Portalled to <body>: the share button that opens this lives inside an event
 * card / the event hero, which clip (`overflow-hidden`), fade (`opacity-0` when
 * un-hovered) and transform their children. A transformed ancestor becomes the
 * containing block for `position: fixed`, so rendering in place would pin this
 * overlay inside the card and clip it away instead of covering the viewport.
 */
export function ShareModal({ fallback, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setCopied(false);
    if (!fallback) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fallback, onClose]);

  if (!fallback || !mounted) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fallback!.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg overflow-hidden"
        style={{ backgroundColor: "var(--brand-surface)", border: "1px solid var(--brand-border)" }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-[18px] font-bold text-[var(--brand-text)]">
            Share this {fallback.kind}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--brand-green)_8%,transparent)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Story preview */}
        <div className="px-6">
          <div
            className="mx-auto rounded-lg overflow-hidden"
            style={{ width: 200, aspectRatio: "9 / 16", border: "1px solid var(--brand-border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fallback.storyUrl} alt="Story preview" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex flex-col gap-3">
          <a
            href={fallback.storyUrl}
            download={`${fallback.title}-newfind.png`}
            className="w-full py-3.5 rounded-lg text-[16px] font-bold text-center text-[var(--brand-on-green)] transition-colors"
            style={{ backgroundColor: GREEN }}
          >
            Download image
          </a>
          <button
            onClick={copyLink}
            className="w-full py-3.5 rounded-lg text-[16px] font-bold transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", color: "var(--brand-text)" }}
          >
            {copied ? "Link copied ✓" : "Copy link"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
