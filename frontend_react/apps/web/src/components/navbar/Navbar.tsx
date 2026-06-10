"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { CityPicker } from "@/components/CityPicker";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GREEN = "#184E4A";
const LINEN = "#F2EFEA";
const TEXT = "#111827";
const BORDER = "#E2DDD5";
const NAV_BORDER = "#C8C1B8";
const HINT = "#9CA3AF";

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
function useHoverStyle(defaultBg = "transparent", defaultFg = TEXT) {
  const [hovered, setHovered] = useState(false);
  return {
    style: {
      backgroundColor: hovered ? GREEN : defaultBg,
      color: hovered ? LINEN : defaultFg,
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
  const triggerHover = useHoverStyle();
  const router = useRouter();

  return (
    <div
      className="relative"
      onMouseEnter={() => { triggerHover.onMouseEnter(); onOpen(); }}
      onMouseLeave={() => { triggerHover.onMouseLeave(); onClose(); }}
    >
      <button
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-base font-medium"
        style={triggerHover.style}
      >
        {name && <span className="text-base font-medium">{name}</span>}
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${GREEN}14`,
            border: `1.5px solid ${GREEN}59`,
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
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
        color: hovered ? LINEN : GREEN,
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-base font-medium shadow-lg z-[100]"
      style={{ backgroundColor: GREEN, color: LINEN }}
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

  const groupsItems: NavItem[] = [
    { emoji: "🔍", label: "Explore Communities", onTap: () => { closeAll(); router.push("/explore?view=communities"); } },
    { emoji: "➕", label: "Create Community",    onTap: () => { closeAll(); router.push(isAuthenticated ? "/community/create" : "/auth"); } },
    { emoji: "👥", label: "My Community",        onTap: () => { closeAll(); router.push(isAuthenticated ? "/community/create" : "/auth"); } },
  ];

  const searchPlaceholder = "Search events or communities";

  return (
    <>
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: LINEN, borderBottom: `1px solid ${NAV_BORDER}` }}
      >
        <nav className="flex items-center h-[72px] px-4 sm:px-6 lg:px-12">
          {/* ── Logo + wordmark (always visible) ── */}
          <div className="flex items-center gap-2.5 shrink-0" onMouseEnter={closeAll}>
            <Link href="/" className="flex items-center gap-2.5 no-underline">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold"
                style={{ backgroundColor: GREEN, color: LINEN }}
              >
                E
              </div>
              <span className="text-[19px] font-extrabold tracking-[0.2px]" style={{ color: GREEN }}>
                NewFind
              </span>
            </Link>
          </div>

          {/* ══════════ Desktop nav (lg and up) ══════════ */}
          <div className="hidden lg:flex items-center flex-1">
            <div className="w-6 shrink-0" />

            {/* ── Search bar ── */}
            <div onMouseEnter={closeAll} className="shrink-0">
              <div
                className="flex items-center w-[360px] xl:w-[400px] h-10 rounded-lg px-3 gap-2"
                style={{ backgroundColor: LINEN, border: '1.5px solid rgba(17,24,39,0.5)' }}
                onMouseEnter={() => setSearchActive(true)}
                onMouseLeave={() => setSearchActive(false)}
              >
                <svg
                  className="w-4 h-4 shrink-0 transition-colors"
                  viewBox="0 0 20 20"
                  style={{ fill: searchActive ? TEXT : HINT }}
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
                <div className="w-px self-stretch shrink-0" style={{ backgroundColor: 'rgba(17,24,39,0.5)' }} />
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
            <div className="w-2" />
            <NavDropdown
              label="Communities"
              items={groupsItems}
              isOpen={activeMenu === "groups"}
              onOpen={() => setActiveMenu("groups")}
              onClose={closeAll}
            />
            <div className="w-2" />
            <HelpButton onMouseEnter={closeAll} />

            {isAuthenticated && (
              <>
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
            {/* Search */}
            <div
              className="flex items-center h-11 rounded-lg px-3 gap-2"
              style={{ backgroundColor: LINEN, border: '1.5px solid rgba(17,24,39,0.5)' }}
              onMouseEnter={() => setSearchActive(true)}
              onMouseLeave={() => setSearchActive(false)}
            >
              <svg
                className="w-4 h-4 shrink-0 transition-colors"
                viewBox="0 0 20 20"
                style={{ fill: searchActive ? TEXT : HINT }}
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
            </div>

            {/* City picker */}
            <div className="px-0.5">
              <CityPicker />
            </div>

            {/* Events */}
            <MobileNavSection title="Events" items={eventsItems} onNavigate={() => setMobileOpen(false)} />

            {/* Communities */}
            <MobileNavSection title="Communities" items={groupsItems} onNavigate={() => setMobileOpen(false)} />

            <div className="h-px" style={{ backgroundColor: BORDER }} />

            {/* Auth section */}
            {!isAuthenticated ? (
              <Link
                href="/auth"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center px-5 py-3 rounded-lg text-base font-semibold no-underline"
                style={{ backgroundColor: GREEN, color: LINEN }}
              >
                Sign In
              </Link>
            ) : (
              <div className="flex flex-col">
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

function MobileNavButton({ emoji, label, onTap }: { emoji: string; label: string; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-3 px-2 py-3 text-base font-medium text-left rounded-md"
      style={{ color: TEXT }}
    >
      <span className="text-lg leading-none">{emoji}</span>
      {label}
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
      style={{ backgroundColor: GREEN, color: LINEN }}
    >
      Sign In
    </Link>
  );
}
