"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerApi } from "@eventmind/api";
import { useAuthStore, useChatUnreadStore } from "@eventmind/store";
import { CityPicker } from "@/components/CityPicker";
import { BrandLogo } from "@/components/brand";
import { BRAND } from "@/lib/theme";
import { useTheme } from "@/providers/theme-provider";

// ── Brand tokens (theme-aware — resolve via CSS vars, see globals.css) ─────────
const GREEN = BRAND.green;
const LINEN = BRAND.surface;    // linen-as-background → surface
const ON_GREEN = BRAND.onGreen; // linen-as-text-on-green → stays light-on-green
const TEXT = BRAND.text;
const BORDER = BRAND.border;
const NAV_BORDER = BRAND.navBorder;
const HINT = BRAND.hint;

type MenuKey = "events" | "groups" | "avatar" | null;

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
      onMouseEnter={() => { hover.onMouseEnter(); onOpen(); }}
      onMouseLeave={() => { hover.onMouseLeave(); onClose(); }}
    >
      <button
        className="flex items-center gap-0.5 px-3 py-1.5 rounded-md text-[16px] font-medium"
        style={hover.style}
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
          className="absolute top-full left-0 mt-1 py-1.5 rounded-xl shadow-xl min-w-[180px] z-50"
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
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
  isOrganizer: boolean;
}

function AvatarMenu({ name, isOpen, onOpen, onClose, onLogout, isOrganizer }: AvatarMenuProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  // First initial of the display name (already capitalised) on a brand-green disc.
  const initial = name ? name.charAt(0).toUpperCase() : "";

  return (
    <div
      className="relative"
      onMouseEnter={() => { setHovered(true); onOpen(); }}
      onMouseLeave={() => { setHovered(false); onClose(); }}
    >
      <button
        className="flex items-center rounded-full"
        aria-label={name ? `${name} — account menu` : "Account menu"}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] font-semibold leading-none select-none"
          style={{
            backgroundColor: GREEN,
            color: ON_GREEN,
            boxShadow: hovered ? `0 0 0 3px color-mix(in srgb, ${GREEN} 22%, transparent)` : "none",
            transition: "box-shadow 150ms",
          }}
        >
          {initial}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 py-1.5 rounded-xl shadow-xl min-w-[200px] z-50"
          style={{ backgroundColor: LINEN, border: `1px solid ${BORDER}` }}
        >
          <div className="absolute -top-1 inset-x-0 h-1" />
          <DropdownItem emoji="🎟️" label="My Dashboard" onTap={() => { onClose(); router.push("/dashboard"); }} />
          <DropdownItem emoji="❤️" label="My Wishlist" onTap={() => { onClose(); router.push("/dashboard?tab=wishlist"); }} />
          {isOrganizer && (
            <DropdownItem emoji="📋" label="My Organised Events" onTap={() => { onClose(); router.push("/organizer/my-events"); }} />
          )}
          <DropdownItem emoji="🎛️" label="Organizer Console" onTap={() => { onClose(); router.push("/organizer"); }} />
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
      className="p-2 rounded-md"
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
      className="relative p-2 rounded-md"
      style={hover.style}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      title={hasUnread ? "Messages — new activity" : "Messages"}
      aria-label={hasUnread ? "Messages — new activity" : "Messages"}
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
          d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
        />
      </svg>
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
      className="p-2 rounded-md"
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-base font-medium shadow-lg z-[100]"
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

  const userId = subFromToken(tokens?.access_token ?? null);

  const { data: organizerProfile } = useQuery({
    queryKey: ["organizer-profile", userId],
    queryFn: () => organizerApi.get(userId).then((r) => r.data),
    enabled: isAuthenticated && !!userId,
    retry: false,
    staleTime: 5 * 60 * 1000, // cache for 5 min — no re-fetch on every nav
  });

  const isOrganizer = !!organizerProfile;

  const unreadRooms = useChatUnreadStore((s) => s.unreadRooms);
  const hasUnread = Object.keys(unreadRooms).length > 0;

  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  function closeAll() { setActiveMenu(null); }

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

  const eventsItems: NavItem[] = [
    { emoji: "🔍", label: "Explore Events", onTap: () => { closeAll(); router.push("/explore?view=events"); } },
    { emoji: "➕", label: "Create Event",   onTap: () => { closeAll(); router.push("/organizer/create"); } },
    { emoji: "📅", label: "My Events",      onTap: () => { closeAll(); router.push(isAuthenticated ? "/dashboard" : "/auth"); } },
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
        className="sticky top-0 z-40"
        style={{ backgroundColor: LINEN, borderBottom: `1px solid ${NAV_BORDER}` }}
      >
        <nav className="flex items-center h-[72px] px-4 sm:px-6 lg:px-12">
          {/* ── Logo + wordmark (always visible; tints via --brand-logo per theme) ── */}
          <div className="flex items-center shrink-0" onMouseEnter={closeAll}>
            <Link href="/" className="no-underline" aria-label="NewFind — home">
              {/* markSize 55 → wordmark ~32px (55 × 0.58); visible mark circle
                  ~45px, so it sits comfortably in the 72px navbar. */}
              <BrandLogo markSize={55} gap={16} style={{ color: BRAND.logo }} />
            </Link>
          </div>

          {/* ══════════ Desktop nav (lg and up) ══════════ */}
          <div className="hidden lg:flex items-center flex-1">
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
                ⚠️ Still the row's only elastic element: WIDENING either number, or
                adding another desktop nav item, means re-measuring at exactly
                1024px. Narrowing never can. */}
            <div onMouseEnter={closeAll} className="shrink-0">
              <div
                className="flex items-center w-[250px] xl:w-[410px] h-10 rounded-lg px-3 gap-2"
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
              label="Events"
              items={eventsItems}
              isOpen={activeMenu === "events"}
              onOpen={() => setActiveMenu("events")}
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
            <HelpButton onMouseEnter={closeAll} />

            <div className="w-2" />
            <div onMouseEnter={closeAll}>
              <ThemeToggle />
            </div>

            {isAuthenticated && (
              <>
                <div className="w-2" />
                <div onMouseEnter={closeAll}>
                  <ChatButton hasUnread={hasUnread} />
                </div>
                <div className="w-2" />
                <div onMouseEnter={closeAll}>
                  <BellButton />
                </div>
              </>
            )}

            <div className="w-3" />

            {!isAuthenticated ? (
              <div onMouseEnter={closeAll}>
                <SignInButton />
              </div>
            ) : (
              <AvatarMenu
                name={displayName(userEmail)}
                isOpen={activeMenu === "avatar"}
                onOpen={() => setActiveMenu("avatar")}
                onClose={closeAll}
                isOrganizer={isOrganizer}
                onLogout={handleLogout}
              />
            )}
          </div>

          {/* ══════════ Mobile hamburger (below lg) ══════════ */}
          <button
            className="lg:hidden ml-auto p-2 rounded-md"
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
            className="lg:hidden px-4 sm:px-6 pb-5 pt-1 flex flex-col gap-4 max-h-[calc(100vh-72px)] overflow-y-auto"
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

            {/* Events */}
            <MobileNavSection title="Events" items={eventsItems} onNavigate={() => setMobileOpen(false)} />

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
                <MobileNavButton emoji="🎟️" label="My Dashboard" onTap={() => { setMobileOpen(false); router.push("/dashboard"); }} />
                <MobileNavButton emoji="❤️" label="My Wishlist" onTap={() => { setMobileOpen(false); router.push("/dashboard?tab=wishlist"); }} />
                {isOrganizer && (
                  <MobileNavButton emoji="📋" label="My Organised Events" onTap={() => { setMobileOpen(false); router.push("/organizer/my-events"); }} />
                )}
                <MobileNavButton emoji="🎛️" label="Organizer Console" onTap={() => { setMobileOpen(false); router.push("/organizer"); }} />
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
      className="flex items-center gap-3 px-2 py-3 text-base font-medium text-left rounded-md"
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
      className="flex items-center gap-3 px-2 py-3 text-base font-medium text-left rounded-md"
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
function HelpButton({ onMouseEnter }: { onMouseEnter: () => void }) {
  const hover = useHoverStyle();
  return (
    <button
      className="px-4 py-1.5 rounded-md text-[16px] font-medium"
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
