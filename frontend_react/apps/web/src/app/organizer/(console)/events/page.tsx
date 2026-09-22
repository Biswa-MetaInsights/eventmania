// ─────────────────────────────────────────────────────────────────────────────
//  Organiser console — Events. The console's landing page and its only events
//  surface.
//
//  ⚠️ THIS ABSORBED THE DASHBOARD on 2026-09-07 (Gautham). There were two
//  sections rendering the same rows off the same `toConsoleRows` — a five-row
//  preview with a "See all events →" link, and this table — so the Dashboard was
//  removed and its overview band moved to the top of this one. `/organizer` is
//  now a redirect here (see app/organizer/page.tsx). **Do not split them back
//  apart**, and do not re-add a truncated events table anywhere.
//
//  Three bands, in the order an organiser actually needs them:
//    1. The NEXT event, on the white panel inside its brand-green border, with
//       the things waiting on them beside it. The answer to "what do I have to
//       do today" should not require a click.
//       ⚠️ **THE PANEL HAS ONE ACCENT AND IT IS GREEN** (Gautham, 2026-09-11).
//       Every terracotta mark on it went: the chip beside the title, the
//       sold-percentage, the progress bar, the "Notifications" label, the todo
//       glyphs and the solid "Open event page" button. Its five inner blocks
//       went from solid green to white cards at the same time. Do not
//       reintroduce a second accent here — the rest of the console still uses
//       terracotta and this band deliberately does not.
//    2. Portfolio roll-ups.
//    3. The full table — every event, filterable and sortable.
//
//  The hero and the notifications column read from `organizerSource.overview()`,
//  which is fixtures in dummy mode and null in real mode — so in real mode the
//  hero falls back to the organiser's genuine next event and the column says
//  plainly that it has nothing to read from yet. Nothing here invents a figure:
//  see the note on NotBuiltYet in ConsoleUI. The "Unread chats" group under it
//  is the one part with a live source in both modes — see `buildUnreadChats`.
//
//  Eight columns have no honest narrow layout, so the table keeps its width and
//  scrolls inside the card — the standing rule in CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { CurrencyCode } from "@eventmind/types";
import { useChatUnreadStore } from "@eventmind/store";
import { organizerSource, isDummyMode } from "@/lib/data-source";
import { formatPrice } from "@/lib/currency";
import {
  CONSOLE_TABS, PRICE_FILTERS, ROW_SORTS,
  bucketCounts, filterAndSortRows, toConsoleRows,
} from "@/lib/organizer-rows";
import type { PriceFilter, RowSort, ConsoleRow } from "@/lib/organizer-rows";
import { useOrganiser, useOrganiserEvents } from "@/components/organizer/useOrganiser";
import { TAG_SHAPE } from "@/components/EventBadges";
import {
  Card, InkPanel, InkStatTile, StatTile, MicroLabel, Pill, Tabs, ProgressBar,
  FilterSelect, ConsoleButton, EventThumb, RowAction, RowMenu,
  TableScroller, TableHead, TableRow, TableFooter, EmptyState,
} from "@/components/organizer/ConsoleUI";
import { EarningsIcon, EditIcon, ChatIcon } from "@/components/organizer/ConsoleIcons";

/** Wider first column + minWidth than before: the rows carry a 56px thumbnail
 *  and the type sits on the site's scale rather than at the 15px floor. */
const TEMPLATE = "2.5fr 1fr 1fr 1fr 1fr 0.8fr 116px";

export default function ConsoleEventsPage() {
  const { organiserId } = useOrganiser();
  const { data: events = [], isLoading } = useOrganiserEvents(organiserId);
  const { data: overview } = useQuery({
    queryKey: ["organizer-overview"],
    queryFn: () => organizerSource.overview().then((r) => r.data),
  });
  const { data: attendees = [] } = useQuery({
    queryKey: ["organizer-attendees"],
    queryFn: () => organizerSource.attendees().then((r) => r.data),
  });

  // "live", not "all" — see the note on CONSOLE_TABS, whose first entry this
  // must stay in step with.
  const [tab, setTab] = useState<string>("live");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<RowSort>("soonest");

  // toConsoleRows captures ONE clock reading for the whole list — see its note.
  const rows = useMemo(() => toConsoleRows(events), [events]);

  // Counts sit on the TABS, so they count the bucket only — the price filter and
  // the sort must not change them, or picking "Free" would read as events having
  // disappeared rather than as a filter being on. The footer's "N of M" below is
  // where the filter's effect is stated.
  const counts = useMemo(() => bucketCounts(rows), [rows]);
  const inTab = useMemo(
    () => (tab === "all" ? rows : rows.filter((r) => r.bucket === tab)),
    [rows, tab],
  );
  const visible = useMemo(() => filterAndSortRows(inTab, price, sort), [inTab, price, sort]);

  // The real next event: the soonest one that has not finished. Used as the
  // hero's subject in real mode, where there is no overview fixture.
  const nextReal = useMemo(
    () =>
      rows
        .filter((r) => !r.finished && r.bucket !== "drafts")
        .sort((a, b) => a.when.localeCompare(b.when))[0],
    [rows],
  );

  const todos = buildTodos(attendees);

  // Live in BOTH modes, unlike everything else on this panel — the unread map
  // is the navbar chat button's own source. See `buildUnreadChats`.
  const unreadRooms = useChatUnreadStore((s) => s.unreadRooms);
  const unreadChats = useMemo(() => buildUnreadChats(unreadRooms, rows), [unreadRooms, rows]);

  if (!isLoading && events.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        body="Everything you publish shows up here — tickets sold, revenue, refunds and who walked in."
        action={
          <Link href="/organizer/create">
            <ConsoleButton tone="green">Create your first event</ConsoleButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {overview ? (
        <NextUpHero overview={overview} todos={todos} unreadChats={unreadChats} />
      ) : nextReal ? (
        <RealNextUpHero row={nextReal} />
      ) : null}

      {/* ── Portfolio ── */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {overview ? (
          <>
            <StatTile label="Events run" value={overview.portfolio.eventsRun}
              sub={`${overview.portfolio.live} live · ${overview.portfolio.drafts} draft`} />
            <StatTile label="Tickets sold" value={overview.portfolio.ticketsSold}
              sub={`↑ ${overview.portfolio.ticketsSoldThisWeek} this week`} tone="good" />
            {/* Ticket sales minus refunds. NOT minus the 2% — the buyer pays
                that on top, so it never leaves the organiser. See TODO.md §13
                and the header note on the Earnings page.
                ⚠️ The currency comes from the ORGANISER'S OWN EVENTS, never a
                literal — that is the rule in lib/currency.ts, and it is what a
                hardcoded "INR" here was quietly breaking. A roll-up can only
                carry one code, so the source asserts its events agree. */}
            <StatTile label="Revenue" value={formatPrice(overview.portfolio.netRevenue, overview.portfolio.currency, { freeLabel: null })}
              sub="after refunds" />
            <StatTile label="Check-in rate" value={`${overview.portfolio.checkInRate}%`}
              sub={`${overview.portfolio.checkedIn} of ${overview.portfolio.pastCapacity} past`} tone="good" />
            <StatTile label="Refunds" value={formatPrice(overview.portfolio.refunded, overview.portfolio.currency, { freeLabel: null })}
              sub={`${overview.portfolio.refundedTickets} of ${overview.portfolio.ticketsSold} tickets`} tone="warn" />
          </>
        ) : (
          <>
            {/* Real mode: only the figures the events endpoint genuinely supports. */}
            <StatTile label="Events run" value={events.length}
              sub={`${counts.live} live · ${counts.drafts} draft`} />
            <StatTile label="Tickets sold" value={events.reduce((n, e) => n + (e.tickets_sold || 0), 0)}
              sub="across all events" />
            <StatTile label="Live now" value={counts.live} sub="on sale in the next 30 days" />
            <StatTile label="Check-in rate" value="—" sub="needs the check-in backend" />
            <StatTile label="Refunds" value="—" sub="needs the payments backend" />
          </>
        )}
      </div>

      {/* ── The table ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs
            items={CONSOLE_TABS.map((t) => ({ ...t, count: counts[t.key] ?? 0 }))}
            active={tab}
            onSelect={setTab}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              label="Filter by price"
              value={price}
              options={PRICE_FILTERS}
              defaultValue="all"
              onChange={setPrice}
            />
            <FilterSelect label="Sort by date" value={sort} options={ROW_SORTS} onChange={setSort} />
          </div>
        </div>

        <Card padded={false}>
          <TableScroller minWidth={1160}>
            <TableHead
              template={TEMPLATE}
              columns={["Event", "When", "Where", "Sold", "Revenue", "Check-ins", <span key="a" className="text-right block">Actions</span>]}
            />
            {visible.map((r) => (
              <TableRow key={r.id} template={TEMPLATE}>
                {/* The event's own picture — the same one its card shows on home
                    and /explore. alt="" because the title sits right beside it. */}
                <div className="flex items-center gap-3 min-w-0">
                  <EventThumb src={r.image} alt="" />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-[20px] font-bold leading-snug" style={{ color: "var(--brand-text)" }}>
                      {r.title}
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {/* Both chips are `EventBadge`s in all but name — solid tag
                          palette, linen label. The state's colour comes from the
                          bucket, the price's from whether it IS a price: "Free"
                          wears the same Plum the card's own Free tag does. */}
                      <Pill type={r.bucket}>{r.status}</Pill>
                      <Pill type={r.free ? "free" : "paid"}>{r.price}</Pill>
                    </span>
                  </div>
                </div>
                <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>
                  {r.when}
                  <div className="text-[15px] opacity-80">{r.whenSub}</div>
                </div>
                <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{r.place}</div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>{r.sold}</span>
                  <ProgressBar pct={r.pct} muted={r.finished} />
                </div>
                <div className="text-[17px] font-semibold" style={{ color: "var(--brand-text)" }}>{r.revenue}</div>
                <div className="text-[17px]" style={{ color: "var(--brand-hint)" }}>{r.checkins}</div>
                <div className="flex justify-end items-center gap-1.5">
                  <RowAction href={`/event/${r.id}`}>Manage</RowAction>
                  {/* Inert until the row actions below have somewhere to post to. */}
                  <RowMenu disabled title="Row actions arrive with the organiser backend" />
                </div>
              </TableRow>
            ))}
          </TableScroller>

          {!isLoading && visible.length === 0 && (
            <p className="px-5 py-10 text-center text-[17px]" style={{ color: "var(--brand-hint)" }}>
              {/* A filtered-to-nothing tab must say so — otherwise an organiser
                  reads "Nothing in this tab" as their events being gone. */}
              {inTab.length > 0
                ? `No ${price === "free" ? "free" : "paid"} events in this tab.`
                : tab === "drafts" && !isDummyMode
                  ? "The events endpoint only returns published events, so drafts cannot be listed yet — TODO.md §19."
                  : "Nothing in this tab."}
            </p>
          )}

          <TableFooter note={`${visible.length} of ${rows.length} events`} />
        </Card>

        <p className="text-[17px]" style={{ color: "var(--brand-hint)", textWrap: "pretty" }}>
          Row actions (⋯) will cover duplicate, unpublish, cancel &amp; refund all, download the
          attendee list, and copy the shareable link.
        </p>
      </div>
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

type Overview = NonNullable<Awaited<ReturnType<typeof organizerSource.overview>>["data"]>;

/**
 * The band's title AND the event's own — one heading, inside the panel, reading
 * "Upcoming event: {title}" (Gautham, 2026-09-11).
 *
 * ⚠️ **IT MOVED INTO THE PANEL, AND IT ABSORBED THE EVENT'S TITLE.** It sat
 * above the panel from 2026-09-09, on the home page's section-heading recipe,
 * with the event's name as a separate `h2` inside — two headings a hair apart
 * saying two halves of one sentence. Now there is one line and one `h2`. **Do
 * not split them back apart**, and do not add a second heading above the panel.
 *
 * The label half is `--brand-hint` so the event's name still carries the weight:
 * a reader is looking for which event, not for the word "upcoming". Both halves
 * are the same size, because they are the same sentence.
 *
 * The "in N days" that used to trail the meta line under this is now the chip
 * beside it — see `NextUpHero`.
 */
function HeroHeading({ title }: { title: string }) {
  return (
    <h2
      className="font-extrabold leading-tight tracking-[-0.5px]"
      style={{ fontSize: "clamp(24px, 3.4vw, 32px)", color: "var(--brand-text)" }}
    >
      <span style={{ color: "var(--brand-hint)" }}>Upcoming event: </span>
      {title}
    </h2>
  );
}

/**
 * ⚠️ **THE FRONT END SHOULD NOT BE COUNTING THESE DAYS** — TODO.md §19.13.
 * `overview.next.inDays` is a fixture figure today, and in real mode there is no
 * overview at all. A countdown computed in the browser is wrong for anyone whose
 * clock or timezone differs from the event's, which on this platform is most
 * people. This helper only spells the number the backend owes us.
 */
function inDaysLabel(days: number) {
  if (days <= 0) return "today";
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function NextUpHero({
  overview,
  todos,
  unreadChats,
}: {
  overview: Overview;
  todos: Todo[];
  unreadChats: UnreadChat[];
}) {
  const { next } = overview;
  const pct = Math.round((next.sold / next.capacity) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* ⚠️ No `image`. `tone="paper"` drops the photograph — see InkPanel. */}
      <InkPanel tone="paper">
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_300px]">
        {/* Left: the event */}
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            {/* ⚠️ THE CHIP SAYS "in N days", NOT "Paid" (Gautham, 2026-09-11).
                Whether an event is paid is already on its row in the table
                below and on its own page; how long the organiser has left is
                the one thing this band exists to answer, and it was buried at
                the tail of the meta line underneath. **Do not put "Paid" back
                here** — and do not restore the duplicate in the meta line
                either, which is where this text used to live.

                It carries EventBadge's own recipe (TAG_SHAPE, gap-1.5,
                font-bold, leading-5, px-2.5 py-1.5, 16px) so it is the same
                object as the tags on this event's card and on its public hero.
                Green, like everything else on this panel. */}
            <div className="flex items-center gap-3 flex-wrap">
              <HeroHeading title={next.title} />
              <span
                className={`${TAG_SHAPE} gap-1.5 font-bold leading-5 px-2.5 py-1.5 text-[16px]`}
                style={{ color: "var(--brand-green)", border: "1px solid var(--brand-green)" }}
              >
                {inDaysLabel(next.inDays)}
              </span>
            </div>
            <p className="text-[17px] mt-1.5" style={{ color: "var(--brand-hint)" }}>
              {next.when}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[17px]" style={{ color: "var(--brand-hint)" }}>Tickets sold</span>
              <span className="text-[17px] font-semibold" style={{ color: "var(--brand-green)" }}>
                {next.sold} of {next.capacity} · {pct}%
              </span>
            </div>
            <ProgressBar pct={pct} hero />
          </div>

          {/* ⚠️ THREE TILES, NOT FOUR. The fourth was "Questions · unanswered",
              read off the event room's unread count; the Event rooms section
              went on 2026-09-01 and nothing counts questions any more, so the
              tile went with it rather than printing a permanent zero — the
              NotBuiltYet rule in ConsoleUI. */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {/* The event's own currency, not a literal — see the note on the
                Revenue tile below. */}
            <InkStatTile surface="box" label="Revenue" value={formatPrice(next.revenue, next.currency, { freeLabel: null })} sub="ticket sales" />
            <InkStatTile surface="box" label="Check-ins" value={`${next.checkedIn} / ${next.sold}`} sub="opens on the day" />
            <InkStatTile surface="box" label="Refunds" value={next.refunds} sub={`${formatPrice(next.refundValue, next.currency, { freeLabel: null })} returned`} />
          </div>

          {/* ⚠️ "Open event room" and "Message attendees" both pointed at
              /organizer/rooms and both went with it. They are NOT replaced by a
              link into /chat: talking to attendees is a chat-surface job the
              backend does not do for organisers yet (TODO.md §19.1), and a
              button into a room that answers nobody is worse than no button.
              The primary now matches RealNextUpHero's — the event's own page.

              ⚠️ BOTH ARE `outline` (Gautham, 2026-09-11). "Open event page" was
              a solid terracotta `accent` and was the loudest thing on the panel
              while being the same kind of navigation as the button beside it.
              They are now the one control: brand surface with the page's own
              type, filling green under the pointer — the app-wide hover rule.
              **Do not promote either back to a solid fill.** */}
          <div className="flex gap-2.5 flex-wrap mt-1">
            <Link href={`/event/${next.eventId}`}>
              <ConsoleButton tone="outline">Open event page</ConsoleButton>
            </Link>
            <Link href="/organizer/attendees">
              {/* `outline`, not `onInk` — the onInk tone is a transparent button
                  with LINEN type, which is invisible on the white panel. */}
              <ConsoleButton tone="outline">Check-in mode</ConsoleButton>
            </Link>
          </div>
        </div>

        {/* Right: what is waiting.

            ⚠️ NO RULE ABOVE THIS COLUMN (Gautham, 2026-09-11). It carried a
            `borderTop` that showed only in the stacked layout, so the panel read
            as two boxed halves on a phone and as one panel on a desktop. The
            `pt-5 lg:pt-0` alone is the separation now. **Do not put the border
            back**, and do not add a `borderLeft` for the wide layout either —
            the `lg:pl-6` gap is the whole separation there. */}
        <div className="flex flex-col gap-3 lg:pl-6 pt-5 lg:pt-0">
          {/* ⚠️ "Notifications", NOT "Needs you today" (Gautham, 2026-09-11).
              The column now carries two groups, and unread chats are not chores
              — the older label described only the first half. */}
          <MicroLabel color="var(--brand-green)">Notifications</MicroLabel>
          {todos.map((t) => (
            <WaitingCard key={t.title} href={t.href} Icon={t.Icon} title={t.title} sub={t.sub} />
          ))}
          {todos.length === 0 ? (
            <p className="text-[15px]" style={{ color: "var(--brand-hint)" }}>
              Nothing is waiting on you.
            </p>
          ) : null}

          {/* ⚠️ A SECOND LABELLED GROUP, not more cards in the first (Gautham,
              2026-09-11). A refund and a message are different kinds of work and
              the organiser triages them separately, so they get their own
              heading rather than being interleaved by count. */}
          <MicroLabel color="var(--brand-green)">Unread chats</MicroLabel>
          {unreadChats.map((c) => (
            <WaitingCard
              key={c.roomId}
              href={`/chat/${c.roomId}?name=${encodeURIComponent(c.title)}`}
              Icon={ChatIcon}
              title={c.title}
              sub={`${c.count} new message${c.count === 1 ? "" : "s"}`}
            />
          ))}
          {unreadChats.length === 0 ? (
            <p className="text-[15px]" style={{ color: "var(--brand-hint)" }}>
              No unread messages.
            </p>
          ) : null}
        </div>
      </div>
      </InkPanel>
    </div>
  );
}

/**
 * The real-mode hero. Same panel, but built only from what the events endpoint
 * actually returns — no check-ins, no refunds, because neither has a source yet.
 */
function RealNextUpHero({ row }: { row: ConsoleRow }) {
  return (
    // Same band as the dummy-mode hero above — same heading, same white panel on
    // its green border, and no photograph. Only the earnings hero is still `INK`.
    <div className="flex flex-col gap-4">
      <InkPanel tone="paper">
        <div className="flex flex-col gap-4">
          <div>
            {/* ⚠️ NO "in N days" CHIP HERE, and that is deliberate. The dummy
                hero's countdown comes from `overview.next.inDays`; real mode has
                no overview, and a figure this page worked out from the browser's
                own clock is exactly what TODO.md §19.13 says not to ship. */}
            <HeroHeading title={row.title} />
            <p className="text-[17px] mt-1.5" style={{ color: "var(--brand-hint)" }}>
              {row.when} · {row.whenSub} · {row.place}
            </p>
          </div>
          <div className="flex flex-col gap-2 max-w-[420px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[17px]" style={{ color: "var(--brand-hint)" }}>Tickets sold</span>
              <span className="text-[17px] font-semibold" style={{ color: "var(--brand-green)" }}>{row.sold} · {row.pct}%</span>
            </div>
            <ProgressBar pct={row.pct} hero />
          </div>
          {/* ⚠️ ONE button, not two. The second was "All events", which pointed at
              this very page while the hero lived on the Dashboard. The table it
              offered is now directly below. `outline` matches the dummy hero's
              pair — see the note there. */}
          <div className="flex gap-2.5 flex-wrap">
            <Link href={`/event/${row.id}`}>
              <ConsoleButton tone="outline">Open event page</ConsoleButton>
            </Link>
          </div>
          <p className="text-[15px]" style={{ color: "var(--brand-hint)" }}>
            Check-ins and refunds appear here once the organiser backend serves them — TODO.md §19.
          </p>
        </div>
      </InkPanel>
    </div>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────

/**
 * One row of the notifications column — a chore or an unread chat.
 *
 * ⚠️ **BOTH GROUPS RENDER THIS.** They are the same object and must stay the
 * same object; a second copy for the chats is exactly the copy-paste drift the
 * consistency rule in `apps/web/CLAUDE.md` opens with. Anything that needs to
 * differ takes a prop.
 *
 * White cards on the white panel, the same object as the stat tiles beside them
 * — see InkStatTile's `surface="box"`, which is where the border is explained.
 *
 * ⚠️ EVERY COLOUR HERE IS A CLASS, and the card is a `group`. The hover is the
 * app-wide rule — green ground, linen copy — which an inline `style` would
 * silently beat, the trap `BUTTON_TONE` in ConsoleUI writes up at length. It
 * replaced a `brightness(1.25)` filter that worked only because the resting fill
 * was a solid dark green; on white a brightness lift does nothing at all.
 */
function WaitingCard({
  href,
  Icon,
  title,
  sub,
}: {
  href: string;
  Icon: typeof EarningsIcon;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg p-3 text-left border transition-colors bg-[var(--brand-surface)] border-[var(--brand-nav-border)] hover:bg-[var(--brand-green)] hover:border-[var(--brand-green)]"
    >
      {/* A SOLID chip, not a wash — the glyph carries meaning, it is what
          separates a refund from an unpaid booking from a message, and a
          coloured mark on a wash of the same colour is ~2.8:1 and all but gone.
          It INVERTS on hover: the card's ground becomes green, so the chip takes
          linen and the glyph goes green, or a green chip on green would
          disappear. */}
      <span className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 mt-0.5 transition-colors bg-[var(--brand-green)] text-[var(--brand-on-green)] group-hover:bg-[var(--brand-on-green)] group-hover:text-[var(--brand-green)]">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="flex flex-col gap-1 min-w-0">
        <span className="text-[17px] font-semibold leading-snug transition-colors text-[var(--brand-text)] group-hover:text-[var(--brand-on-green)]">
          {title}
        </span>
        <span className="text-[15px] leading-snug transition-colors text-[var(--brand-hint)] group-hover:text-[var(--brand-on-green)]">
          {sub}
        </span>
      </span>
    </Link>
  );
}

interface Todo {
  title: string;
  sub: string;
  href: string;
  Icon: typeof EarningsIcon;
}

/**
 * Derived from the data on screen, never hardcoded — so an organiser with a
 * clear queue sees an empty column rather than three invented chores.
 *
 * ⚠️ There used to be a third source: unanswered questions in the busiest event
 * room. The Event rooms section went on 2026-09-01 — attendee conversation
 * belongs to the chat surfaces and has no organiser-side backend yet
 * (TODO.md §19.1) — so this reads attendees alone. **Do not put a question item
 * back until something can actually count them.**
 */
function buildTodos(
  attendees: { status: string; name: string; paid: number; currency?: CurrencyCode }[],
): Todo[] {
  const todos: Todo[] = [];

  const refunds = attendees.filter((a) => a.status === "Refund requested");
  if (refunds.length > 0) {
    todos.push({
      title: `${refunds.length} refund request${refunds.length === 1 ? "" : "s"} pending`,
      sub: `${refunds[0].name} · ${formatPrice(refunds[0].paid, refunds[0].currency, { freeLabel: null })}`,
      href: "/organizer/attendees",
      Icon: EarningsIcon,
    });
  }

  const unpaid = attendees.filter((a) => a.status === "Awaiting payment");
  if (unpaid.length > 0) {
    todos.push({
      title: `${unpaid.length} booking${unpaid.length === 1 ? "" : "s"} awaiting payment`,
      sub: "Remind them before the seat is held any longer",
      href: "/organizer/attendees",
      Icon: EditIcon,
    });
  }

  return todos;
}

// ── "Unread chats" ───────────────────────────────────────────────────────────

interface UnreadChat {
  /** Room id, which IS the event id — see `chat-unread-store`. */
  roomId: string;
  title: string;
  count: number;
}

/**
 * The unread map is the navbar chat button's own source, so this group is real
 * in dummy and real mode alike — it does not read `organizerSource.overview()`
 * and does not go blank in real mode the way the figures around it do.
 *
 * ⚠️ **THE COUNT IS THIS SESSION'S, NOT A TRUE UNREAD HISTORY** — the chat
 * backend persists no read state, so `chat-unread-store` only knows what arrived
 * over the socket while the app was open. That is the same thing the navbar's
 * glow has always claimed, which is why this reuses it rather than inventing a
 * second, better-looking number the backend cannot honour (the NotBuiltYet rule
 * in ConsoleUI). **When the backend grows read receipts — TODO.md §19.1 — this
 * is one of the two call sites to move.**
 *
 * A room the organiser does not own still shows, titled generically: they hold a
 * ticket to it, the messages are genuinely unread, and silently dropping them
 * would make this column disagree with the navbar sitting above it.
 */
function buildUnreadChats(
  unreadRooms: Record<string, number>,
  rows: ConsoleRow[],
): UnreadChat[] {
  const titleById = new Map(rows.map((r) => [r.id, r.title]));
  return Object.entries(unreadRooms)
    .filter(([, count]) => count > 0)
    .map(([roomId, count]) => ({
      roomId,
      title: titleById.get(roomId) ?? "Event chat",
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
