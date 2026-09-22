"use client";

import { useEffect, useState, Suspense, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { avatarFor, useAuthStore, useProfileStore, useTicketsStore, useWishlistStore } from "@eventmind/store";
import type { StoredTicket, WishlistItem } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { ProfilePictureModal } from "@/components/ProfilePictureModal";
import type { BadgeType } from "@/components/EventBadges";
import { CARD_CTA, CARD_GRID, EventCardItem, SkeletonCard, type CarouselEvent } from "@/components/EventsCarousel";
import { useOrganiser, useOrganiserEvents } from "@/components/organizer/useOrganiser";
import { cardDateTime, toCarouselEvent } from "@/lib/card-adapters";
import { formatPrice } from "@/lib/currency";
import { GUTTERS } from "@/lib/layout";
import { REMOVE_BUTTON } from "@/lib/controls";

const GREEN = "var(--brand-green)";


const MOCK_INTERESTS = ["Technology", "AI", "Venture Capital"];

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}&color=184E4A`;
}

/**
 * Every card here IS `EventCardItem` — the home-page card, on the home-page
 * grid, with its hover lift (Gautham, 2026-09-11: "4 in a row, same size, same
 * animation on hover, except the contents and the images"). A tab changes only
 * the card's slots: `lines` for its extra facts, `action` for its button, and
 * `media` where a ticket shows its QR code instead of the photo.
 *
 * ⚠️ The whole card is a <Link> to the event, so a slot's button is a <button>
 * that stops the click — never a nested <Link>, which is an anchor inside an
 * anchor. `stop()` is that guard; every action here goes through it.
 */
function stop(e: MouseEvent, then: () => void) {
  e.preventDefault();
  e.stopPropagation();
  then();
}

/** The default CTA's look — solid green, linen label — for a slot button that
 *  is not destructive. Classes, not an inline style, so hover could be added. */
const CTA_FILL = "bg-[var(--brand-green)] text-[var(--brand-on-green)]";

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

type TabId = "tickets" | "wishlist" | "events" | "profile";

const TAB_LABELS: Record<TabId, string> = {
  tickets: "My Tickets",
  wishlist: "My Wishlist",
  events: "My Events",
  // "Participant Profile" until 2026-09-11 (Gautham). Every tab here is already
  // a participant's, and the word only made the row wider on a phone.
  profile: "Profile",
};

/**
 * ⚠️ "My Events" IS ORGANISER-ONLY, and the gate is the list itself rather than
 * a `hidden` class — a tab nobody can fill would otherwise sit there promising
 * an empty panel to every participant. Its data is `useOrganiserEvents`, the
 * SAME query the console reads, so the two can never disagree about what this
 * person runs.
 *
 * Order matters: the two participant tabs, then the organiser one, then the
 * profile. The profile stays last because it is about the person rather than
 * about a list of things.
 */
function tabsFor(isOrganiser: boolean): TabId[] {
  return isOrganiser
    ? ["tickets", "wishlist", "events", "profile"]
    : ["tickets", "wishlist", "profile"];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const tickets = useTicketsStore((s) => s.tickets);
  const wishlistItems = useWishlistStore((s) => s.items);

  // Who is signed in, and do they run events? Shares the console's query keys,
  // so opening the dashboard costs no extra fetch once the console has loaded.
  const { organiserId, isOrganiser } = useOrganiser();
  const tabs = tabsFor(isOrganiser);

  // ⚠️ The URL is the source of truth, NOT local state (2026-08-21). The navbar's
  // Participants dropdown links straight at ?tab=tickets AND ?tab=wishlist, and a
  // query-only change does not remount this component — so a `useState` seeded
  // once from `searchParams` left the second link doing visibly nothing. Reading
  // the param on every render also makes every tab deep-linkable and Back-able.
  //
  // Validated against `tabs`, not against the whole `TabId` union: a participant
  // who follows a `?tab=events` link someone sent them has no such tab, and
  // falling back to Tickets is better than rendering a panel with no tab above it.
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = tabs.includes(tabParam as TabId) ? (tabParam as TabId) : "tickets";

  // `replace`, not `push` — flipping tabs shouldn't stack history entries that
  // the Back button then has to walk out of one at a time.
  const setActiveTab = (tab: TabId) => router.replace(`/dashboard?tab=${tab}`, { scroll: false });

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const displayName = userEmail ? userEmail.split("@")[0].split(".")[0] : "User";
  const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />

      {/* ── Page header ── */}
      <div className={`pt-10 pb-0 ${GUTTERS}`}>
        <h1 className="text-[28px] font-bold text-[var(--brand-text)]">My Dashboard</h1>
      </div>

      {/* ── Tabs ── */}
      {/* The three tabs plus a wishlist count do not fit across a 375px phone, so
          the row scrolls instead of the labels wrapping mid-word. */}
      <div className={`mt-6 flex gap-1 border-b border-[var(--brand-border)] overflow-x-auto scrollbar-hide ${GUTTERS}`}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap shrink-0"
            style={{ color: activeTab === tab ? GREEN : "var(--brand-hint)" }}
          >
            {TAB_LABELS[tab]}
            {tab === "wishlist" && wishlistItems.length > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: GREEN, color: "var(--brand-on-green)" }}
              >
                {wishlistItems.length}
              </span>
            )}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: GREEN }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className={`py-8 ${GUTTERS}`}>
        {activeTab === "tickets" ? (
          <TicketsTab tickets={tickets} />
        ) : activeTab === "wishlist" ? (
          <WishlistTab items={wishlistItems} />
        ) : activeTab === "events" ? (
          <MyEventsTab organiserId={organiserId} />
        ) : (
          <ProfileTab name={capitalized} email={userEmail ?? ""} interests={MOCK_INTERESTS} />
        )}
      </div>
    </div>
  );
}

// ── Wishlist tab ──────────────────────────────────────────────────────────────

function WishlistTab({ items: allItems }: { items: WishlistItem[] }) {
  const router = useRouter();
  const removeItem = useWishlistStore((s) => s.removeItem);

  // PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2. A wishlist
  // saved before the cut can still hold `kind: "community"` entries in
  // localStorage, and those would render a "View Community" card. They stay in
  // the store (nothing is destroyed, so Phase 2 gets them back) but are filtered
  // out of the view. The filter is applied HERE, above the empty-state check, so
  // a wishlist of nothing but communities shows "Your wishlist is empty" rather
  // than a blank panel.
  // PHASE 2 RESTORE: drop this line and rename the prop back to `items`.
  const items = allItems.filter((i) => i.kind === "event");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 gap-4">
        <svg className="w-16 h-16 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
        <p className="text-[18px] text-[var(--brand-hint)]">Your wishlist is empty.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-lg text-[var(--brand-on-green)] text-sm font-semibold"
          style={{ backgroundColor: GREEN }}
        >
          Explore Events
        </button>
      </div>
    );
  }

  return (
    <div className={CARD_GRID}>
      {items.map((item) => (
        <WishlistCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
      ))}
    </div>
  );
}

/**
 * A saved event on the home-page card. The picture, tags, share and wishlist
 * heart are the card's own — the heart is already filled here and un-saving
 * through it works — and the one slot filled is the action: **Remove**, in
 * `REMOVE_BUTTON`'s colours, because the card itself is the link to the event
 * so a "View" button would say what the whole card already says.
 */
function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const card: CarouselEvent = {
    id: item.id,
    title: item.title,
    date: item.date,
    time: item.time,
    venue: item.venue,
    price: item.price,
    imageUrl: item.imageUrl,
    category: item.category,
    isSoldOut: item.isSoldOut,
    // A wishlist row written before 2026-09-11 kept only the FIRST tag, so fall
    // back to it rather than showing a saved event no tags at all. See the note
    // on `WishlistItem` — this store is persisted, so old rows outlive the change.
    badgeTypes: (item.badgeTypes ?? (item.badgeType ? [item.badgeType] : [])) as BadgeType[],
  };

  return (
    <EventCardItem
      event={card}
      href={item.kind === "event" ? `/event/${item.id}` : `/community/${item.id}`}
      action={
        // `-my-0.5` cancels REMOVE_BUTTON's 2px border top and bottom, so this
        // button's box is the exact height of the filled "View details" it
        // replaces and the price row does not grow by 4px on this one tab.
        <button
          onClick={(e) => stop(e, onRemove)}
          aria-label={`Remove ${item.title} from wishlist`}
          className={`${CARD_CTA} ${REMOVE_BUTTON} -my-0.5`}
        >
          Remove
        </button>
      }
    />
  );
}

// ── My Events tab (organisers) ────────────────────────────────────────────────

/**
 * The events this person RUNS, on the home-page card.
 *
 * ⚠️ `toCarouselEvent` is what makes the tags right: it is the ONE place that
 * decides which status tags an event gets (Free / Selling Fast / This Week /
 * Sold Out), so a card here carries exactly the tags that event's home-page
 * card carries. Do not re-derive them — see the header of EventBadges.tsx.
 */
function MyEventsTab({ organiserId }: { organiserId: string }) {
  const router = useRouter();
  const { data: events, isLoading } = useOrganiserEvents(organiserId);

  if (isLoading) {
    return (
      <div className={CARD_GRID}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 gap-4">
        <CalendarEmptyIcon />
        <p className="text-[18px] text-[var(--brand-hint)]">You have not created any events yet.</p>
        <button
          onClick={() => router.push("/organizer/create")}
          className="px-6 py-3 rounded-lg text-[var(--brand-on-green)] text-sm font-semibold"
          style={{ backgroundColor: GREEN }}
        >
          Create your first event
        </button>
      </div>
    );
  }

  return (
    <div className={CARD_GRID}>
      {events.map((ev) => {
        // Anything not on sale says so in words. A draft has no audience and a
        // cancelled event has no tags worth reading, so the status carries the
        // line the price would otherwise have to explain.
        const status = (ev.status ?? "").toLowerCase();
        const note = status === "published" ? undefined : status.charAt(0).toUpperCase() + status.slice(1);
        return (
          <EventCardItem
            key={ev.id}
            event={toCarouselEvent(ev)}
            lines={note && <p className="text-[18px] font-semibold" style={{ color: GREEN }}>{note}</p>}
            action={
              <button
                onClick={(e) => stop(e, () => router.push("/organizer/events"))}
                aria-label={`Manage ${ev.title}`}
                className={`${CARD_CTA} ${CTA_FILL}`}
              >
                Manage
              </button>
            }
          />
        );
      })}
    </div>
  );
}

// ── Tickets tab ───────────────────────────────────────────────────────────────

function TicketsTab({ tickets }: { tickets: StoredTicket[] }) {
  const router = useRouter();

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 gap-4">
        <TicketIcon />
        <p className="text-[18px] text-[var(--brand-hint)]">No tickets found.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-lg text-[var(--brand-on-green)] text-sm font-semibold"
          style={{ backgroundColor: GREEN }}
        >
          Browse Events
        </button>
      </div>
    );
  }

  return (
    <div className={CARD_GRID}>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}

/**
 * A ticket on the home-page card, with the QR code in the picture slot.
 *
 * A `StoredTicket` carries no photo, category or tags, so the picture slot is
 * the one place the card genuinely differs: the QR on a light green wash, at
 * the card's own 16:9 so the row stays level with the other tabs. The facts a
 * ticket has and an event does not — its number and seat — go in `lines`, and
 * the button is Join Chat: the card itself already opens the event.
 */
function TicketCard({ ticket }: { ticket: StoredTicket }) {
  const router = useRouter();
  const isFree = ticket.price_paid === 0;
  const number = ticket.id.substring(ticket.id.length - 8).toUpperCase();
  const card: CarouselEvent = {
    id: ticket.event_id,
    title: ticket.event_title,
    ...cardDateTime(ticket.start_date),
    venue: "",
    price: isFree ? "Free" : formatPrice(ticket.price_paid, ticket.currency, { decimals: true }),
    imageUrl: "",
    category: "",
  };

  return (
    <EventCardItem
      event={card}
      media={
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand-green) 8%, transparent)" }}
        >
          {/* An external QR render — `next/image` would need the host in
              `remotePatterns` for a picture that is never cached or resized.
              Sized by the slot's height, not a fixed 150px, so it scales with
              the card from a phone to the 4-across grid. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl(ticket.qr_hash)}
            alt={`QR code for ticket ${number}`}
            className="h-[82%] w-auto rounded-lg"
          />
        </div>
      }
      lines={
        <>
          <p className="text-[18px] font-semibold" style={{ color: GREEN }}>✓ Confirmed · #{number}</p>
          <p className="text-[18px] line-clamp-1" style={{ color: "var(--brand-text)" }}>{ticket.seat_info}</p>
        </>
      }
      action={
        <button
          onClick={(e) => stop(e, () => router.push(`/chat/${ticket.event_id}?name=${encodeURIComponent(ticket.event_title)}`))}
          aria-label={`Join the chat for ${ticket.event_title}`}
          className={`${CARD_CTA} ${CTA_FILL}`}
        >
          Join Chat
        </button>
      }
    />
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

/**
 * ⚠️ THE PICTURE IS PICKED IN A DIALOG, NOT HERE (Gautham, 2026-09-11): the disc
 * carries a camera badge, and that badge opens `ProfilePictureModal`, which
 * wraps the SAME `CoverImageField` an organiser picks a cover photo with. The
 * badge is always visible rather than revealed on hover — a phone has no hover,
 * and CLAUDE.md's rule is that a hover-revealed control must exist on touch too.
 *
 * Where the picture is STORED, and why it is not on the user service, is written
 * up on `useProfileStore`.
 */
function ProfileTab({ name, email, interests }: { name: string; email: string; interests: string[] }) {
  const avatars = useProfileStore((s) => s.avatars);
  const setAvatar = useProfileStore((s) => s.setAvatar);
  const [picking, setPicking] = useState(false);
  const avatar = avatarFor(avatars, email);

  return (
    <div className="max-w-2xl">
      {/* Avatar + name */}
      <div className="flex items-center gap-5 sm:gap-8 mb-10">
        <div className="relative shrink-0">
          <div
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, var(--brand-green) 8%, transparent)` }}
          >
            {avatar ? (
              /* ⚠️ A PLAIN <img>. `next/image` refuses a host that is not in
                 next.config.ts's `remotePatterns`, and this src is either a
                 pasted link to anywhere or a `data:` URL. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 sm:w-14 sm:h-14" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
              </svg>
            )}
          </div>

          {/* The ring is `--brand-bg`, the page behind it, so the badge reads as
              sitting ON the disc rather than welded to its edge. */}
          <button
            type="button"
            onClick={() => setPicking(true)}
            aria-label={avatar ? "Change your profile picture" : "Add a profile picture"}
            className={`absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
              border-2 border-[var(--brand-bg)] transition-transform hover:scale-110 ${CTA_FILL}`}
          >
            <CameraIcon />
          </button>
        </div>

        <div className="min-w-0">
          <h2 className="text-[26px] sm:text-[32px] font-bold text-[var(--brand-text)]">{name}</h2>
          <p className="text-[18px] text-[var(--brand-hint)] truncate">{email}</p>
        </div>
      </div>

      {/* Mounted only while open, so each visit starts from the saved value —
          see the note at the top of the dialog. */}
      {picking && (
        <ProfilePictureModal
          open
          value={avatar}
          onClose={() => setPicking(false)}
          onSave={(next) => {
            setAvatar(email, next);
            setPicking(false);
          }}
        />
      )}

      <div className="h-px bg-[var(--brand-border)] mb-8" />

      <h3 className="text-[24px] font-bold text-[var(--brand-text)] mb-2">My Networking Interests</h3>
      <p className="text-[var(--brand-hint)] mb-8">
        These interests power our AI Agent to match you with suitable event discovery and networking sessions.
      </p>

      <div className="flex flex-wrap gap-3 mb-12">
        {interests.map((interest) => (
          <span key={interest}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--brand-bg)]"
            style={{ border: `1px solid ${GREEN}33`, color: GREEN }}>
            {interest}
          </span>
        ))}
      </div>

      {/* "Update Profile", not "Update AI Profile" (Gautham, 2026-09-11) — the
          interests above already say what they power, and the button is the
          ordinary one that saves this tab. It still has no handler: the
          interests above are hardcoded and there is no profile storage behind
          them yet (TODO.md §11, "Participant Profile"). */}
      <button
        className="px-10 py-4 rounded-lg text-[var(--brand-on-green)] font-bold"
        style={{ backgroundColor: GREEN }}
      >
        Update Profile
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

/** The My Events empty state. A calendar, at the same 64px/1px weight as the
 *  wishlist heart and the ticket above — one empty state, three drawings. */
function CalendarEmptyIcon() {
  return <svg className="w-16 h-16 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;
}

/** The camera on the profile picture's badge. Smaller and heavier than the empty
 *  states above — it sits on a 36px green disc, not in 64px of white space. */
function CameraIcon() {
  return <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>;
}

function TicketIcon() {
  return <svg className="w-16 h-16 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" /></svg>;
}
