"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerApi } from "@eventmind/api";
import { avatarFor, useAuthStore, useChatUnreadStore, useProfileStore } from "@eventmind/store";
import { CityPicker } from "@/components/CityPicker";
import { isDummyMode } from "@/lib/data-source";
import { BrandLogo } from "@/components/brand";
import { ChatIcon } from "@/components/organizer/ConsoleIcons";
import { BRAND } from "@/lib/theme";
import { hoverCapable } from "@/lib/pointer";
import { useTheme } from "@/providers/theme-provider";

// ── Brand tokens (theme-aware — resolve via CSS vars, see globals.css) ─────────
const GREEN = BRAND.green;
const LINEN = BRAND.surface;    // linen-as-background → surface
const ON_GREEN = BRAND.onGreen; // linen-as-text-on-green → stays light-on-green
const TEXT = BRAND.text;
const BORDER = BRAND.border;
const NAV_BORDER = BRAND.navBorder;
const HINT = BRAND.hint;

type MenuKey = "participants" | "organisers" | "groups" | "avatar" | null;

// ── displayName: "biswajith.gopinathan@gmail.com" → "Biswajith" ──────────────
function displayName(email: string | null): string {
  if (!email) return "";
  const prefix = email.split("@")[0];
  const segment = prefix.includes(".") ? prefix.split(".")[0] : prefix;
  const name = segment || prefix;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// ── Hover button style helpers ────────────────────────────────────────────────
// Using inline style + onMouseEnter/Leave to exactly match Flutter's
// WidgetStateProperty.resolveWith behaviour (bg → green, fg → linen on hover)
function useHoverStyle(defaultBg: string = "transparent", defaultFg: string = TEXT) {
  const [hovered, setHovered] = useState(false);
  return {
    style: {
      backgroundColor: hovered ? GREEN : defaultBg,
      color: hovered ? ON_GREEN : defaultFg,
      transition: "background-color 150ms, color 150ms",
    } as React.CSSProperties,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

// ── Nav item model ────────────────────────────────────────────────────────────
interface NavItem {
  emoji: string;
  label: string;
  onTap: () => void;
}

// ── Dropdown menu item ────────────────────────────────────────────────────────
function DropdownItem({ emoji, label, onTap }: NavItem) {
  const hover = useHoverStyle();
  return (
    <button
      onClick={onTap}
      className="w-full text-left px-4 py-3 text-base font-medium whitespace-nowrap"
      style={{ ...hover.style, color: hover.style.color }}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      {emoji}&nbsp;&nbsp;&nbsp;{label}
    </button>
  );
}

// ── NavDropdown ───────────────────────────────────────────────────────────────
interface NavDropdownProps {
  label: string;
  items: NavItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function NavDropdown({ label, items, isOpen, onOpen, onClose }: NavDropdownProps) {
  const hover = useHoverStyle();

  return (
    <div
      className="relative"
      /* Hover opens/closes ONLY on a device that hovers. A tap synthesises
         mouseenter before click, so without the guard the menu opened on the
         mouseenter and the click below closed it again — one tap, no menu.
         On touch the tap toggle is the whole story; outside-tap close lives on
         the <header> (see the pointerdown effect in Navbar). */
      onMouseEnter={() => { hover.onMouseEnter(); if (hoverCapable()) onOpen(); }}
      onMouseLeave={() => { hover.onMouseLeave(); if (hoverCapable()) onClose(); }}
    >
      {/* Tap toggles as well: the desktop row shows from 1024px, which is an
          iPad, and a hover-only menu cannot be opened there at all. */}
      <button
        className="flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-[16px] font-medium"
        style={hover.style}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
      >
        {label}
        <svg
          className="ml-0.5 w-4 h-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 py-1.5 rounded-lg shadow-xl min-w-[180px] z-50"
          style={{ backgroundColor: LINEN, border: `1px solid ${BORDER}` }}
        >
          {/* invisible bridge fills the mt-1 gap so onMouseLeave doesn't fire mid-travel */}
          <div className="absolute -top-1 inset-x-0 h-1" />
          {items.map((item) => (
            <DropdownItem key={item.label} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Avatar menu ───────────────────────────────────────────────────────────────
interface AvatarMenuProps {
  name: string;
  /** The profile picture, or `""` for the green initial disc. Set on the
   *  dashboard's Profile tab; see `useProfileStore` for where it lives. */
  photo: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
  isOrganizer: boolean;
}

function AvatarMenu({ name, photo, isOpen, onOpen, onClose, onLogout, isOrganizer }: AvatarMenuProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  // First initial of the display name (already capitalised) on a brand-green disc
  // — the fallback whenever there is no picture, which is most accounts.
  const initial = name ? name.charAt(0).toUpperCase() : "";

  return (
    <div
      className="relative"
      /* Same guard as NavDropdown: hover drives the menu only where hover exists. */
      onMouseEnter={() => { setHovered(true); if (hoverCapable()) onOpen(); }}
      onMouseLeave={() => { setHovered(false); if (hoverCapable()) onClose(); }}
    >
      <button
        className="flex items-center rounded-full"
        aria-label={name ? `${name} — account menu` : "Account menu"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
      >
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[16px] font-semibold leading-none select-none"
          style={{
            backgroundColor: GREEN,
            color: ON_GREEN,
            boxShadow: hovered ? `0 0 0 3px color-mix(in srgb, ${GREEN} 22%, transparent)` : "none",
            transition: "box-shadow 150ms",
          }}
        >
          {/* ⚠️ A PLAIN <img>, like every other user-supplied picture in this
              app: the src is a `data:` URL or a link to a host `next/image`
              would refuse. The green stays underneath, so a broken link leaves
              the disc rather than a hole. */}
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 py-1.5 rounded-lg shadow-xl min-w-[200px] z-50"
          style={{ backgroundColor: LINEN, border: `1px solid ${BORDER}` }}
        >
          <div className="absolute -top-1 inset-x-0 h-1" />
          {/* ⚠️ My Wishlist and Organiser Dashboard are NOT missing — they moved
              into the Participants and Organisers dropdowns (Gautham,
              2026-08-21). Do not add either back here: a second door to the same
              page is exactly the drift the audience split was meant to remove. */}
          <DropdownItem emoji="🎟️" label="My Dashboard" onTap={() => { onClose(); router.push("/dashboard"); }} />
          {isOrganizer && (
            <DropdownItem emoji="📋" label="My Organised Events" onTap={() => { onClose(); router.push("/organizer/events"); }} />
          )}
          <div className="my-1 mx-3 h-px" style={{ backgroundColor: BORDER }} />
          <DropdownItem emoji="⚙️" label="Settings" onTap={() => {}} />
          <LogoutItem onLogout={onLogout} />
        </div>
      )}
    </div>
  );
}

function LogoutItem({ onLogout }: { onLogout: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onLogout}
      className="w-full text-left px-4 py-3 text-base font-medium whitespace-nowrap"
      style={{
        backgroundColor: hovered ? GREEN : "transparent",
        color: hovered ? ON_GREEN : GREEN,
        transition: "background-color 150ms, color 150ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      🚪&nbsp;&nbsp;&nbsp;Log Out
    </button>
  );
}

// ── Bell button ───────────────────────────────────────────────────────────────
function BellButton() {
  const hover = useHoverStyle();
  return (
    <button
      className="p-2 rounded-lg"
      style={hover.style}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      title="Notifications"
    >
      <svg
        className="w-[21px] h-[21px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>
    </button>
  );
}

// ── Chat button ───────────────────────────────────────────────────────────────
// Sits beside the bell. Turns green + shows a terracotta dot whenever any chat
// room has unread activity — an organiser receiving a message, or an attendee
// getting a reply. Tapping opens the chat inbox. See ChatPresence.tsx.
function ChatButton({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const hover = useHoverStyle("transparent", hasUnread ? GREEN : TEXT);
  return (
    <button
      onClick={() => router.push("/chat")}
      className="relative p-2 rounded-lg"
      style={hover.style}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      title={hasUnread ? "Messages — new activity" : "Messages"}
      aria-label={hasUnread ? "Messages — new activity" : "Messages"}
    >
      {/* One drawing, two callers — the organiser console's "Unread chats"
          group uses the same glyph. See ConsoleIcons' note on ChatIcon. */}
      <ChatIcon className="w-[21px] h-[21px]" />
      {hasUnread && (
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{
            backgroundColor: "var(--brand-terracotta)",
            boxShadow: "0 0 0 2px var(--brand-surface)",
          }}
        />
      )}
    </button>
  );
}

// ── Theme toggle (sun / moon) ───────────────────────────────────────────────
// Shows a moon in light mode (tap → dark) and a sun in dark mode (tap → light).
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const hover = useHoverStyle();
  const isDark = theme === "dark";
  return (
    <button
      className="p-2 rounded-lg"
      style={hover.style}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      onClick={toggleTheme}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <svg className="w-[21px] h-[21px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        <svg className="w-[21px] h-[21px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg text-base font-medium shadow-lg z-[100]"
      style={{ backgroundColor: GREEN, color: ON_GREEN }}
    >
      {message}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function subFromToken(token: string | null): string {
  if (!token) return "";
  try { return JSON.parse(atob(token.split(".")[1])).sub ?? ""; }
  catch { return ""; }
}

export function Navbar() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const tokens = useAuthStore((s) => s.tokens);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const avatars = useProfileStore((s) => s.avatars);

  const userId = subFromToken(tokens?.access_token ?? null);

  const { data: organizerProfile } = useQuery({
    queryKey: ["organizer-profile", userId],
    queryFn: () => organizerApi.get(userId).then((r) => r.data),
    // ⚠️ NOT FIRED IN DUMMY MODE — it is a live backend call, and dummy mode is
    // the mode you run with no backend at all, so it could only ever reject.
    // Same `enabled` clause `useOrganiser()` carries; the two share this key.
    enabled: isAuthenticated && !!userId && !isDummyMode,
    retry: false,
    staleTime: 5 * 60 * 1000, // cache for 5 min — no re-fetch on every nav
  });

  // ⚠️ THE `isDummyMode` ARM IS LOAD-BEARING (Gautham, 2026-09-11: "wait where
  // is 'My organised events'? i dont see that"). Without it this read `!!profile`
  // alone, so the query above failing — which is ALL it can do with no backend
  // running — silently answered "not an organiser", and every organiser-only
  // item in the menus was hidden on the one setup built for frontend work.
  //
  // Deliberately the SAME rule `useOrganiser().isOrganiser` uses: in dummy mode
  // whoever is signed in IS the organiser of `dummyMyEvents`. Keep the two in
  // step — a navbar that disagrees with the console hides the door to a page
  // that would have let you in.
  const isOrganizer = isDummyMode || !!organizerProfile;

  const unreadRooms = useChatUnreadStore((s) => s.unreadRooms);
  const hasUnread = Object.keys(unreadRooms).length > 0;

  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  function closeAll() { setActiveMenu(null); }
  // The row's other controls close an open menu when the pointer ARRIVES on
  // them — hover semantics, so guarded like the menus' own handlers: on touch
  // a tap on the logo or the search box must not fire it (it would be the
  // synthesised mouseenter), and the outside-tap effect below does that job.
  function closeOnHover() { if (hoverCapable()) closeAll(); }

  // Touch has no mouseleave to close a tapped-open menu, so a tap anywhere
  // outside the header closes it. `pointerdown`, not `click`, so it fires
  // before whatever was tapped handles its own event — the same recipe as the
  // console's FilterSelect. A no-op under a mouse, where mouseleave got there
  // first.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!activeMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) closeAll();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeMenu]);

  // Only navigate after the user has actually typed — avoids redirecting on mount.
  // Searching takes the user to the Explore page with the query pre-filled.
  useEffect(() => {
    if (!hasSearched) return;
    const t = setTimeout(() => {
      const q = searchQuery.trim();
      if (q) { router.push(`/explore?q=${encodeURIComponent(q)}`); setMobileOpen(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, router, hasSearched]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function handleLogout() {
    clearAuth();
    router.push("/auth");
  }

  // ── The row's two audiences (Gautham, 2026-08-21) ──
  // The nav is split by WHO you are, not by what the object is: everything a
  // ticket-holder does sits under Participants, everything an event-runner does
  // under Organisers. Both dropdowns are always visible — the split IS the
  // navigation, so hiding the organiser half from a signed-out visitor would
  // hide half the product's story. Items behind a login route to /auth rather
  // than to a page that bounces.
  const participantItems: NavItem[] = [
    { emoji: "🔍", label: "Explore Events", onTap: () => { closeAll(); router.push("/explore?view=events"); } },
    { emoji: "🎟️", label: "My Tickets",     onTap: () => { closeAll(); router.push(isAuthenticated ? "/dashboard?tab=tickets" : "/auth"); } },
    { emoji: "❤️", label: "My Wishlist",    onTap: () => { closeAll(); router.push(isAuthenticated ? "/dashboard?tab=wishlist" : "/auth"); } },
  ];

  const organiserItems: NavItem[] = [
    { emoji: "➕", label: "Create Event", onTap: () => { closeAll(); router.push(isAuthenticated ? "/organizer/create" : "/auth"); } },
    // ⚠️ The /organizer section this once pointed at no longer exists — it was
    // folded into Events on 2026-09-07 — so the item goes straight to the
    // console's landing section, skipping the redirect. The label was "Organiser
    // Console" for a day; it is "Dashboard" again (Gautham, 2026-09-08), and the
    // Organisers dropdown around it is what says whose dashboard it is.
    { emoji: "📊", label: "Dashboard", onTap: () => { closeAll(); router.push(isAuthenticated ? "/organizer/events" : "/auth"); } },
  ];

  /* PARKED 2026-08-14 (MVP) — the Communities dropdown's items. Communities are
     deferred to Phase 2 and must not appear anywhere users can see them.

  const groupsItems: NavItem[] = [
    { emoji: "🔍", label: "Explore Communities", onTap: () => { closeAll(); router.push("/explore?view=communities"); } },
    { emoji: "➕", label: "Create Community",    onTap: () => { closeAll(); router.push(isAuthenticated ? "/community/create" : "/auth"); } },
    { emoji: "👥", label: "My Community",        onTap: () => { closeAll(); router.push(isAuthenticated ? "/community/create" : "/auth"); } },
  ];

  */

  // PARKED 2026-08-14 (MVP) — was "Find events/communities".
  const searchPlaceholder = "Find events";

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-40"
        style={{ backgroundColor: LINEN, borderBottom: `1px solid ${NAV_BORDER}` }}
      >
        <nav className="flex items-center h-[72px] px-4 sm:px-6 lg:px-12">
          {/* ── Logo + wordmark (always visible; tints via --brand-logo per theme) ── */}
          <div className="flex items-center shrink-0" onMouseEnter={closeOnHover}>
            <Link href="/" className="no-underline" aria-label="NewFind — home">
              {/* markSize 55 → wordmark ~32px (55 × 0.58); visible mark circle
                  ~45px, so it sits comfortably in the 72px navbar. */}
              <BrandLogo markSize={55} gap={16} style={{ color: BRAND.logo }} />
            </Link>
          </div>

          {/* ══════════ Desktop nav (lg and up) ══════════ */}
          {/* min-w-0: without it the row's min-content (the search box's
              intrinsic width, now that the box is elastic) wins over `flex-1`
              and the whole row ran ~60px past the nav at 1024. */}
          <div className="hidden lg:flex items-center flex-1 min-w-0">
            <div className="w-6 shrink-0" />

            {/* ── Search bar ──
                The desktop cluster switches on at lg (1024px), but at its xl
                width the whole row measured ~1135px — so between 1024 and 1280
                every page carried a horizontal scrollbar. The search box is the
                only elastic element in the row, so it takes the difference and
                grows back to its full width at xl.

                Narrowed 280→250 / 440→410 on 2026-08-14 (Gautham's call). Both
                values sit BELOW the pair that fixed the scrollbar bug, so the fit
                is safe by construction at each breakpoint and no re-measure was
                needed — and the two-step is kept precisely because it is what
                holds the 1024px fit.

                ⚠️ lg narrowed 250→170 on 2026-08-21, to pay for a second
                top-level nav item beside the first. That was the
                "Organiser dashboard" link (~180px, authed-only); later the same
                day the row became Participants + Organisers, two dropdowns
                totalling ~265px against the old pair's ~280px — NARROWER, and
                narrowing is safe by construction, so 170 is kept as headroom
                rather than given back. The signed-out row grew instead (both
                dropdowns are always shown), but it carries no chat/bell/avatar,
                so the authed row is still the fullest one. **xl is untouched:**
                at 1280+ there is room for everything, so the box keeps its 410.
                ⚠️ Still the row's only elastic element: WIDENING either number, or
                adding another desktop nav item, means re-measuring at exactly
                1024px. Narrowing never can.

                2026-09-05: the two numbers are now the box's FLOOR (170) and
                CEILING (410) rather than two fixed widths. It grows with a huge
                flex ratio, so it takes the row's slack before the `flex-1`
                spacer after it sees any, and stops at 410 — identical at xl,
                where 410 already fit. Between 1024 and 1279 a fixed 170px box
                left the input ~20px wide once "New York" was in it, and a
                longer city name spilled out of the border. */}
            <div onMouseEnter={closeOnHover} className="flex-[1000_1_0%] min-w-[170px] max-w-[410px]">
              <div
                className="flex items-center w-full h-10 rounded-lg px-3 gap-2"
                style={{ backgroundColor: LINEN, border: `1.5px solid ${GREEN}` }}
                onMouseEnter={() => setSearchActive(true)}
                onMouseLeave={() => setSearchActive(false)}
              >
                <svg
                  className="w-4 h-4 shrink-0 transition-colors"
                  viewBox="0 0 20 20"
                  style={{ fill: searchActive ? GREEN : HINT }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setHasSearched(true); setSearchQuery(e.target.value); }}
                  onFocus={() => setSearchActive(true)}
                  onBlur={() => setSearchActive(false)}
                  placeholder={searchPlaceholder}
                  className="flex-1 text-base bg-transparent outline-none min-w-0"
                  style={{ color: TEXT }}
                />
                <div className="w-px self-stretch shrink-0" style={{ backgroundColor: NAV_BORDER }} />
                <CityPicker variant="inline" />
              </div>
            </div>

            <div className="flex-1" />

            <NavDropdown
              label="Participants"
              items={participantItems}
              isOpen={activeMenu === "participants"}
              onOpen={() => setActiveMenu("participants")}
              onClose={closeAll}
            />
            <div className="w-2" />
            <NavDropdown
              label="Organisers"
              items={organiserItems}
              isOpen={activeMenu === "organisers"}
              onOpen={() => setActiveMenu("organisers")}
              onClose={closeAll}
            />
            {/* PARKED 2026-08-14 (MVP) — the Communities dropdown, together with
                the w-2 spacer that separated it from Events. Removing it only
                takes width out of the desktop row, so the 1024px fit that the
                search box absorbs is unaffected (see the file's header gotcha).

            <div className="w-2" />
            <NavDropdown
              label="Communities"
              items={groupsItems}
              isOpen={activeMenu === "groups"}
              onOpen={() => setActiveMenu("groups")}
              onClose={closeAll}
            />

            */}
            <div className="w-2" />
            <HelpButton onMouseEnter={closeOnHover} />

            <div className="w-2" />
            <div onMouseEnter={closeOnHover}>
              <ThemeToggle />
            </div>

            {isAuthenticated && (
              <>
                <div className="w-2" />
                <div onMouseEnter={closeOnHover}>
                  <ChatButton hasUnread={hasUnread} />
                </div>
                <div className="w-2" />
                <div onMouseEnter={closeOnHover}>
                  <BellButton />
                </div>
              </>
            )}

            <div className="w-3" />

            {!isAuthenticated ? (
              <div onMouseEnter={closeOnHover}>
                <SignInButton />
              </div>
            ) : (
              <AvatarMenu
                name={displayName(userEmail)}
                photo={avatarFor(avatars, userEmail)}
                isOpen={activeMenu === "avatar"}
                onOpen={() => setActiveMenu("avatar")}
                onClose={closeAll}
                isOrganizer={isOrganizer}
                onLogout={handleLogout}
              />
            )}
          </div>

          {/* ══════════ Mobile hamburger (below lg) ══════════ */}
          {/* p-2.5 + the 24px glyph = a 44px tap target. */}
          <button
            className="lg:hidden ml-auto p-2.5 -mr-0.5 rounded-lg"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            style={{ color: TEXT }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>
        </nav>

        {/* ══════════ Mobile dropdown panel ══════════ */}
        {mobileOpen && (
          <div
            className="lg:hidden px-4 sm:px-6 pb-5 pt-1 flex flex-col gap-4 max-h-[calc(100dvh-72px)] overflow-y-auto"
            style={{ backgroundColor: LINEN, borderTop: `1px solid ${BORDER}` }}
          >
            {/* Search + inline city picker — one row, mirrors the desktop bar */}
            <div
              className="flex items-center h-14 rounded-lg px-3 gap-2"
              style={{ backgroundColor: LINEN, border: `1.5px solid ${GREEN}` }}
              onMouseEnter={() => setSearchActive(true)}
              onMouseLeave={() => setSearchActive(false)}
            >
              <svg
                className="w-4 h-4 shrink-0 transition-colors"
                viewBox="0 0 20 20"
                style={{ fill: searchActive ? GREEN : HINT }}
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setHasSearched(true); setSearchQuery(e.target.value); }}
                onFocus={() => setSearchActive(true)}
                onBlur={() => setSearchActive(false)}
                placeholder={searchPlaceholder}
                className="flex-1 text-base bg-transparent outline-none min-w-0"
                style={{ color: TEXT }}
              />
              <div className="w-px self-stretch shrink-0" style={{ backgroundColor: NAV_BORDER }} />
              <CityPicker variant="inline" />
            </div>

            {/* Theme toggle */}
            <MobileThemeRow />

            {/* The same two audiences as the desktop row — one section each. */}
            <MobileNavSection title="Participants" items={participantItems} onNavigate={() => setMobileOpen(false)} />
            <MobileNavSection title="Organisers" items={organiserItems} onNavigate={() => setMobileOpen(false)} />

            {/* PARKED 2026-08-14 (MVP) — the mobile Communities section, twin of
                the desktop dropdown above.

            <MobileNavSection title="Communities" items={groupsItems} onNavigate={() => setMobileOpen(false)} />

            */}

            <div className="h-px" style={{ backgroundColor: BORDER }} />

            {/* Auth section */}
            {!isAuthenticated ? (
              <Link
                href="/auth"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center px-5 py-3 rounded-lg text-base font-semibold no-underline"
                style={{ backgroundColor: GREEN, color: ON_GREEN }}
              >
                Sign In
              </Link>
            ) : (
              <div className="flex flex-col">
                <MobileNavButton emoji="💬" label="Messages" showDot={hasUnread} onTap={() => { setMobileOpen(false); router.push("/chat"); }} />
                {/* Mirrors AvatarMenu — wishlist and the organiser dashboard
                    live in the two sections above, not here. */}
                <MobileNavButton emoji="🎟️" label="My Dashboard" onTap={() => { setMobileOpen(false); router.push("/dashboard"); }} />
                {isOrganizer && (
                  <MobileNavButton emoji="📋" label="My Organised Events" onTap={() => { setMobileOpen(false); router.push("/organizer/events"); }} />
                )}
                <MobileNavButton emoji="🚪" label="Log Out" onTap={() => { setMobileOpen(false); handleLogout(); }} />
              </div>
            )}
          </div>
        )}
      </header>

      {toast && <Toast message={toast} />}
    </>
  );
}

// ── Mobile nav helpers ──────────────────────────────────────────────────────────
function MobileNavSection({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2 text-xs font-bold uppercase tracking-wide" style={{ color: HINT }}>{title}</p>
      {items.map((item) => (
        <MobileNavButton
          key={item.label}
          emoji={item.emoji}
          label={item.label}
          onTap={() => { item.onTap(); onNavigate(); }}
        />
      ))}
    </div>
  );
}

function MobileThemeRow() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-2 py-3 text-base font-medium text-left rounded-lg"
      style={{ color: TEXT }}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="text-lg leading-none">{isDark ? "☀️" : "🌙"}</span>
      {isDark ? "Light theme" : "Dark theme"}
    </button>
  );
}

function MobileNavButton({ emoji, label, onTap, showDot }: { emoji: string; label: string; onTap: () => void; showDot?: boolean }) {
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-3 px-2 py-3 text-base font-medium text-left rounded-lg"
      style={{ color: TEXT }}
    >
      <span className="text-lg leading-none">{emoji}</span>
      {label}
      {showDot && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--brand-terracotta)" }}
        />
      )}
    </button>
  );
}

// ── Help button ───────────────────────────────────────────────────────────────
// (The standalone "Organiser dashboard" link that lived here was replaced by the
// Organisers dropdown on 2026-08-21 — the console is now reached from there.)
function HelpButton({ onMouseEnter }: { onMouseEnter: () => void }) {
  const hover = useHoverStyle();
  return (
    <button
      className="px-4 py-1.5 rounded-lg text-[16px] font-medium"
      style={hover.style}
      onMouseEnter={() => { hover.onMouseEnter(); onMouseEnter(); }}
      onMouseLeave={hover.onMouseLeave}
    >
      Help
    </button>
  );
}

// ── Sign In button ────────────────────────────────────────────────────────────
function SignInButton() {
  return (
    <Link
      href="/auth"
      className="px-[22px] py-[10px] rounded-lg text-base font-semibold no-underline"
      style={{ backgroundColor: GREEN, color: ON_GREEN }}
    >
      Sign In
    </Link>
  );
}
