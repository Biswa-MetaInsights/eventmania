"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@eventmind/store";

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
}

function AvatarMenu({ name, isOpen, onOpen, onClose, onLogout }: AvatarMenuProps) {
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
export function Navbar() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  function closeAll() { setActiveMenu(null); }

  // Only navigate after the user has actually typed — avoids redirecting on mount
  useEffect(() => {
    if (!hasSearched) return;
    const t = setTimeout(() => {
      const q = searchQuery.trim();
      router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
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
    { emoji: "🔍", label: "Explore Events", onTap: () => { closeAll(); router.push("/"); } },
    { emoji: "➕", label: "Create Event",   onTap: () => { closeAll(); router.push("/organizer/create"); } },
    { emoji: "📅", label: "My Events",      onTap: () => { closeAll(); router.push(isAuthenticated ? "/dashboard" : "/auth"); } },
  ];

  const groupsItems: NavItem[] = [
    { emoji: "🔍", label: "Explore Communities", onTap: () => showToast("Communities — coming soon!") },
    { emoji: "➕", label: "Create Community",    onTap: () => showToast("Communities — coming soon!") },
    { emoji: "👥", label: "My Communities",      onTap: () => showToast("Communities — coming soon!") },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-40 flex items-center h-[72px] px-12"
        style={{
          backgroundColor: LINEN,
          borderBottom: `1px solid ${NAV_BORDER}`,
        }}
      >
        {/* ── Logo + wordmark ── */}
        <div
          className="flex items-center gap-2.5 shrink-0"
          onMouseEnter={closeAll}
        >
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold"
              style={{ backgroundColor: GREEN, color: LINEN }}
            >
              E
            </div>
            <span
              className="text-[19px] font-extrabold tracking-[0.2px]"
              style={{ color: GREEN }}
            >
              NewFind
            </span>
          </Link>
        </div>

        <div className="w-6 shrink-0" />

        {/* ── Search bar ── */}
        <div onMouseEnter={closeAll} className="shrink-0">
          <div
            className="flex items-center w-[400px] h-10 rounded-lg px-3 gap-2"
            style={{ backgroundColor: LINEN, border: '1.5px solid rgba(17,24,39,0.5)' }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill={HINT}>
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
              placeholder="Search events or communities"
              className="flex-1 text-base bg-transparent outline-none min-w-0"
              style={{ color: TEXT }}
            />
            <div className="w-px self-stretch shrink-0" style={{ backgroundColor: 'rgba(17,24,39,0.5)' }} />
            <div className="flex items-center gap-1 shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={HINT}>
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.992 17 10A7 7 0 1 0 3 10c0 2.992 1.698 5.327 3.354 6.585.83.8 1.654 1.38 2.274 1.766.311.192.571.337.757.433a5.741 5.741 0 0 0 .281.14l.018.008.006.003ZM10 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-base" style={{ color: HINT }}>
                Add Location
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* ── Events dropdown ── */}
        <NavDropdown
          label="Events"
          items={eventsItems}
          isOpen={activeMenu === "events"}
          onOpen={() => setActiveMenu("events")}
          onClose={closeAll}
        />
        <div className="w-2" />

        {/* ── Community dropdown ── */}
        <NavDropdown
          label="Communities"
          items={groupsItems}
          isOpen={activeMenu === "groups"}
          onOpen={() => setActiveMenu("groups")}
          onClose={closeAll}
        />
        <div className="w-2" />

        {/* ── Help ── */}
        <HelpButton onMouseEnter={closeAll} />

        {/* ── Bell (logged in only) ── */}
        {isAuthenticated && (
          <>
            <div className="w-2" />
            <div onMouseEnter={closeAll}>
              <BellButton />
            </div>
          </>
        )}

        <div className="w-3" />

        {/* ── Sign In or Avatar ── */}
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
            onLogout={handleLogout}
          />
        )}
      </nav>

      {toast && <Toast message={toast} />}
    </>
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
