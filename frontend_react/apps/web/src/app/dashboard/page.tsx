"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, useTicketsStore, useWishlistStore } from "@eventmind/store";
import type { StoredTicket, WishlistItem } from "@eventmind/store";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar/Navbar";
import { CalendarIcon, ClockIcon } from "@/components/EventIcons";
import { formatPrice } from "@/lib/currency";
import { GUTTERS } from "@/lib/layout";

const GREEN = "var(--brand-green)";


const MOCK_INTERESTS = ["Technology", "AI", "Venture Capital"];

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}&color=184E4A`;
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

type TabId = "tickets" | "wishlist" | "profile";

const TAB_LABELS: Record<TabId, string> = {
  tickets: "My Tickets",
  wishlist: "My Wishlist",
  profile: "Networking Profile",
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const tickets = useTicketsStore((s) => s.tickets);
  const wishlistItems = useWishlistStore((s) => s.items);

  const initialTab = (searchParams.get("tab") as TabId | null) ?? "tickets";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

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
        {(["tickets", "wishlist", "profile"] as TabId[]).map((tab) => (
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
          className="px-6 py-3 rounded-xl text-[var(--brand-on-green)] text-sm font-semibold"
          style={{ backgroundColor: GREEN }}
        >
          Explore Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <WishlistCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
      ))}
    </div>
  );
}

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const href = item.kind === "event" ? `/event/${item.id}` : `/community/${item.id}`;

  return (
    <div
      className="rounded-2xl overflow-hidden flex gap-0"
      style={{ backgroundColor: "var(--brand-bg)", border: "1px solid var(--brand-border)" }}
    >
      {/* Thumbnail */}
      <div className="relative w-28 sm:w-40 shrink-0 self-stretch overflow-hidden">
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 112px, 160px"
        />
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase"
          style={{ backgroundColor: GREEN, color: "var(--brand-on-green)" }}
        >
          {item.kind}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between flex-1 p-4 sm:p-5 min-w-0">
        <div>
          <h3 className="text-[18px] font-bold text-[var(--brand-text)] mb-1 line-clamp-2">{item.title}</h3>
          <p className="text-sm text-[var(--brand-hint)]">
            {item.date} · {item.time} · {item.venue}
          </p>
          {item.kind === "community" && item.memberCount && (
            <p className="text-sm mt-0.5" style={{ color: GREEN }}>
              {item.memberCount} members
            </p>
          )}
          <p className="text-sm font-semibold mt-1" style={{ color: GREEN }}>{item.price}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link
            href={href}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-[var(--brand-on-green)]"
            style={{ backgroundColor: GREEN }}
          >
            {item.kind === "event" ? "View Event" : "View Community"}
          </Link>
          <button
            onClick={onRemove}
            className="px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ border: `2px solid var(--brand-control-border)`, color: "var(--brand-hint)" }}
          >
            Remove
          </button>
        </div>
      </div>
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
          className="px-6 py-3 rounded-xl text-[var(--brand-on-green)] text-sm font-semibold"
          style={{ backgroundColor: GREEN }}
        >
          Browse Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: StoredTicket }) {
  const router = useRouter();
  const isFree = ticket.price_paid === 0;
  const date = new Date(ticket.start_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const time = new Date(ticket.start_date).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="bg-[var(--brand-bg)] rounded-3xl overflow-hidden flex flex-col sm:flex-row" style={{ border: "1px solid var(--brand-border)" }}>
      {/* QR section. The divider is a bottom border when stacked and a right
          border side-by-side, so it always separates the two halves. */}
      <div className="flex items-center justify-center p-6 sm:p-8 shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--brand-border)]"
        style={{ backgroundColor: "var(--brand-surface)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl(ticket.qr_hash)} alt="QR Code" width={150} height={150} />
      </div>

      {/* Info section */}
      <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <p className="text-[13px] font-bold mb-3" style={{ color: GREEN }}>
            ✓ CONFIRMED TICKET #{ticket.id.substring(ticket.id.length - 8).toUpperCase()}
          </p>
          <h3 className="text-[22px] sm:text-[24px] font-bold text-[var(--brand-text)] mb-2">{ticket.event_title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--brand-hint)] mb-1">
            <CalendarIcon /> <span>{date}</span>
            <ClockIcon /> <span>{time}</span>
          </div>
          <p className="text-sm text-[var(--brand-hint)]">{ticket.seat_info}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: GREEN }}>
            {isFree ? "Free Entry" : formatPrice(ticket.price_paid, ticket.currency, { decimals: true })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => router.push(`/event/${ticket.event_id}`)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[var(--brand-on-green)]"
            style={{ backgroundColor: GREEN }}
          >
            View Event
          </button>
          <button
            onClick={() => router.push(`/chat/${ticket.event_id}?name=${encodeURIComponent(ticket.event_title)}`)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: `1px solid ${GREEN}40`, color: GREEN }}
          >
            Join Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ name, email, interests }: { name: string; email: string; interests: string[] }) {
  return (
    <div className="max-w-2xl">
      {/* Avatar + name */}
      <div className="flex items-center gap-5 sm:gap-8 mb-10">
        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, var(--brand-green) 8%, transparent)` }}>
          <svg className="w-10 h-10 sm:w-14 sm:h-14" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
          </svg>
        </div>
        <div className="min-w-0">
          <h2 className="text-[26px] sm:text-[32px] font-bold text-[var(--brand-text)]">{name}</h2>
          <p className="text-[18px] text-[var(--brand-hint)] truncate">{email}</p>
        </div>
      </div>

      <div className="h-px bg-[var(--brand-border)] mb-8" />

      <h3 className="text-[24px] font-bold text-[var(--brand-text)] mb-2">My Networking Interests</h3>
      <p className="text-[var(--brand-hint)] mb-8">
        These interests power our AI Agent to match you with suitable event discovery and networking sessions.
      </p>

      <div className="flex flex-wrap gap-3 mb-12">
        {interests.map((interest) => (
          <span key={interest}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--brand-bg)]"
            style={{ border: `1px solid ${GREEN}33`, color: GREEN }}>
            {interest}
          </span>
        ))}
      </div>

      <button
        className="px-10 py-4 rounded-2xl text-[var(--brand-on-green)] font-bold"
        style={{ backgroundColor: GREEN }}
      >
        Update AI Profile
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TicketIcon() {
  return <svg className="w-16 h-16 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" /></svg>;
}
