"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  The three organiser-authored blocks in the LEFT column of /event/[id]:
//  Announcements, Agenda of the programme, and FAQ.
//
//  ⚠️ THESE ARE PUBLIC (Gautham, 2026-08-24). A participant reads all three —
//  an agenda nobody can see is not an agenda. What is organiser-only is the
//  EDIT control, and the gate on it is the page's `organiserView`, exactly the
//  same one the hero's Edit/Duplicate/Cancel controls use.
//
//  ⚠️ AN EMPTY SECTION RENDERS NOTHING FOR A PARTICIPANT — no heading, no
//  divider, no "no agenda yet". The page must not grow three empty rules for
//  every event that never used the feature, and a visitor learns nothing from
//  being told an organiser did not write an FAQ. The organiser sees the heading
//  and a prompt, because they are the one who can fill it.
//
//  ⚠️ THE CHROME IS `/event/[id]`'s OWN, NOT THE CONSOLE'S. 22px bold heading,
//  18px body, `my-12 h-px --brand-border` divider — the same recipe "About this
//  event" and `ReviewsSection` already use on this page. **Do not reach for
//  `ConsoleUI`'s `Card` here**: these sections sit between two plain blocks of
//  page copy, and a bordered console card between them reads as an embedded
//  admin panel on a public page.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgendaItem, Announcement, FaqItem } from "@eventmind/types";
import { ConsoleButton } from "@/components/organizer/ConsoleUI";

/** The page's own divider, so a section cannot drift from "About this event". */
export function SectionDivider() {
  return <div className="my-12 h-px bg-[var(--brand-border)]" />;
}

/**
 * Does this section appear at all?
 *
 * ⚠️ THE PAGE NEEDS THE SAME ANSWER `Section` DOES, because it decides whether
 * to draw the divider ABOVE the section — and a rule stated in two places is
 * how a page ends up with an orphaned horizontal line over nothing. One export,
 * both callers.
 */
export const showsSection = (count: number, canEdit: boolean) => count > 0 || canEdit;

/**
 * Heading + optional organiser control, and the empty-state rule in one place.
 *
 * Returns `null` when there is nothing to show and nobody who could add
 * anything — that single condition is what keeps a participant's page clean.
 */
function Section({
  title,
  count,
  canEdit,
  editLabel,
  onEdit,
  editHint,
  emptyPrompt,
  children,
}: {
  title: string;
  /** How many rows the caller is about to render. 0 switches to the prompt. */
  count: number;
  canEdit: boolean;
  editLabel: string;
  onEdit: () => void;
  /** Non-empty = the control is disabled and this says why. */
  editHint?: string;
  emptyPrompt: string;
  children: React.ReactNode;
}) {
  if (!showsSection(count, canEdit)) return null;

  return (
    <section>
      {/* The control sits on the heading's line and wraps beneath it on a phone
          rather than squeezing a 22px heading. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-[22px] font-bold text-[var(--brand-text)]">{title}</h2>
        {canEdit && (
          <ConsoleButton
            tone="outline"
            onClick={onEdit}
            disabled={!!editHint}
            title={editHint}
          >
            {count === 0 ? editLabel : "Edit"}
          </ConsoleButton>
        )}
      </div>

      {count === 0 ? (
        <p className="text-[18px] leading-relaxed text-[var(--brand-hint)]">{emptyPrompt}</p>
      ) : (
        children
      )}
    </section>
  );
}

/** Props every one of the three shares. */
interface SectionProps {
  /** True only in the organiser view of the organiser's own event. */
  canEdit: boolean;
  onEdit: () => void;
  /** Set when authoring cannot persist — see `lib/event-extras.ts`. */
  editHint?: string;
}

// ── Announcements ────────────────────────────────────────────────────────────

/**
 * ⚠️ Newest first, and the caller must pass `announcementsOf(event)` rather than
 * `event.announcements` — that helper does the sort and copes with the key being
 * absent entirely, which it is on every event the real backend serves.
 */
export function AnnouncementsSection({
  items,
  ...rest
}: SectionProps & { items: Announcement[] }) {
  return (
    <Section
      title="Announcements"
      count={items.length}
      editLabel="Post an announcement"
      emptyPrompt="Post an update here — a change of plan, what to bring, where to meet. Everyone who opens this page sees it."
      {...rest}
    >
      <div className="space-y-4">
        {items.map((a) => (
          <article
            key={a.id}
            className="rounded-lg px-5 py-4"
            style={{ border: "1px solid var(--brand-border)" }}
          >
            {/* The date leads: an announcement's first question is "how old is
                this". `PostedAt` degrades to nothing rather than to "Invalid Date". */}
            <PostedAt iso={a.posted_at} />
            {a.title && (
              <h3 className="text-[18px] font-bold text-[var(--brand-text)] mt-1.5">{a.title}</h3>
            )}
            {/* whitespace-pre-line so an organiser's own line breaks survive —
                they typed them into a textarea and meant them. */}
            <p className="text-[18px] leading-relaxed text-[var(--brand-hint)] mt-1.5 whitespace-pre-line">
              {a.body}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function PostedAt({ iso }: { iso: string }) {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return null;
  return (
    <p className="text-[15px] font-semibold" style={{ color: "var(--brand-green)" }}>
      {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
    </p>
  );
}

// ── Agenda ───────────────────────────────────────────────────────────────────

/**
 * The programme, in the order the organiser arranged it.
 *
 * ⚠️ NOT SORTED. `time` is free text ("10:00 AM", "Day 2 · morning", "After the
 * break") because a two-day festival and a 90-minute workshop cannot share one
 * timestamp format — so the array order IS the running order, and the editor is
 * what lets an organiser move a row.
 */
export function AgendaSection({ items, ...rest }: SectionProps & { items: AgendaItem[] }) {
  return (
    <Section
      title="Agenda of the programme"
      count={items.length}
      editLabel="Add an agenda"
      emptyPrompt="Add a running order so people know what happens when. Optional — plenty of events do fine without one."
      {...rest}
    >
      <ol className="space-y-0">
        {items.map((row, i) => (
          <li
            key={row.id}
            // Two columns from `sm` up, stacked below it: a 375px phone cannot
            // hold a time column and a title on one line without hyphenating
            // both. The rule between rows is the page's divider token at its
            // normal 1px weight, not the section break's.
            className={`grid grid-cols-1 sm:grid-cols-[minmax(96px,150px)_1fr] gap-x-5 gap-y-1 py-4 ${
              i > 0 ? "border-t border-[var(--brand-border)]" : "pt-0"
            }`}
          >
            <span className="text-[18px] font-bold" style={{ color: "var(--brand-green)" }}>
              {row.time}
            </span>
            <div>
              <h3 className="text-[18px] font-bold text-[var(--brand-text)]">{row.title}</h3>
              {row.detail && (
                <p className="text-[18px] leading-relaxed text-[var(--brand-hint)] mt-1 whitespace-pre-line">
                  {row.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

/**
 * ⚠️ FLAT Q&A, NOT AN ACCORDION. Every answer is visible, so the page is
 * readable straight down, searchable with the browser's own find, and reachable
 * with no interaction at all. An accordion would hide the answers behind a
 * click for no gain on a page this short — and the app has no disclosure widget
 * to reuse, so one would have to be invented here.
 */
export function FaqSection({ items, ...rest }: SectionProps & { items: FaqItem[] }) {
  return (
    <Section
      title="Frequently asked questions"
      count={items.length}
      editLabel="Add an FAQ"
      emptyPrompt="Answer the questions you keep getting asked — parking, refunds, what to bring. It saves you repeating yourself in the chat."
      {...rest}
    >
      <dl className="space-y-0">
        {items.map((row, i) => (
          <div
            key={row.id}
            className={`py-4 ${i > 0 ? "border-t border-[var(--brand-border)]" : "pt-0"}`}
          >
            <dt className="text-[18px] font-bold text-[var(--brand-text)]">{row.question}</dt>
            <dd className="text-[18px] leading-relaxed text-[var(--brand-hint)] mt-1.5 whitespace-pre-line">
              {row.answer}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
