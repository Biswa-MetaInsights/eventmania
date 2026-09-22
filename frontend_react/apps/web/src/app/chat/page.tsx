"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore, useTicketsStore, useChatUnreadStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { isDummyMode, organizerSource } from "@/lib/data-source";
import { GUTTERS } from "@/lib/layout";
import { subFromToken } from "@/lib/chat";

const GREEN = "var(--brand-green)";

interface Room {
  id: string;      // room id == event id
  title: string;
  /** Where this room came from — shown as a small subtitle. */
  role: "attendee" | "organiser";
}

export default function ChatInboxPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const tokens = useAuthStore((s) => s.tokens);
  const tickets = useTicketsStore((s) => s.tickets);
  const unreadRooms = useChatUnreadStore((s) => s.unreadRooms);

  const userId = subFromToken(tokens?.access_token ?? null);

  // Gate on hydration, not just isAuthenticated — otherwise a hard load
  // redirects before zustand rehydrates the session (see HANDOVER.md #12).
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace("/auth");
  }, [hasHydrated, isAuthenticated, router]);

  const { data: organised, isLoading: loadingOrganised } = useQuery({
    queryKey: ["chat-rooms-organised", userId],
    // ⚠️ `organizerSource.events`, not a bare `eventsApi.search` — a live API
    // call here left the ORGANISER half of this inbox empty in dummy mode, so a
    // room for an event you run never appeared and only the events you hold a
    // ticket for did. `eventsSource.search({ organizer_id })` would not fix it
    // either: dummy mode matches that filter literally, and the fixtures belong
    // to `DUMMY_ORGANISER_ID`, never to the signed-in person's JWT subject.
    // `organizerSource.events` is the one that knows to ignore the id there.
    queryFn: () => organizerSource.events(userId).then((r) => r.data),
    // The id is the real gate in real mode only; dummy mode ignores it, so
    // waiting on it there would leave the inbox permanently loading.
    enabled: hasHydrated && isAuthenticated && (isDummyMode || !!userId),
    staleTime: 5 * 60 * 1000,
  });

  // Ticketed events ∪ organised events, deduped by id. A room the user both
  // holds a ticket for and organises is shown once, labelled "organiser".
  const rooms = useMemo<Room[]>(() => {
    const byId = new Map<string, Room>();
    tickets.forEach((t) =>
      byId.set(t.event_id, { id: t.event_id, title: t.event_title, role: "attendee" })
    );
    (organised ?? []).forEach((e) =>
      byId.set(e.id, { id: e.id, title: e.title, role: "organiser" })
    );
    return Array.from(byId.values());
  }, [tickets, organised]);

  // Unread rooms first, then the rest, so anything new floats to the top.
  const sorted = useMemo(
    () => [...rooms].sort((a, b) => (unreadRooms[b.id] ? 1 : 0) - (unreadRooms[a.id] ? 1 : 0)),
    [rooms, unreadRooms]
  );

  if (!hasHydrated || (!isAuthenticated && hasHydrated)) {
    // Show the loader while hydrating; the effect above handles the redirect.
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />

      <div className={`py-10 max-w-3xl mx-auto ${GUTTERS}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "1px solid var(--brand-border)", backgroundColor: "var(--brand-surface)" }}
            title="Back to Home"
          >
            <svg className="w-4 h-4" style={{ color: "var(--brand-hint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: "var(--brand-text)" }}>Messages</h1>
            <p className="text-[18px] mt-1" style={{ color: "var(--brand-hint)" }}>
              Your event chat rooms
            </p>
          </div>
        </div>

        {/* Content */}
        {loadingOrganised && rooms.length === 0 ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-5 rounded-lg"
            style={{ backgroundColor: "var(--brand-bg)", border: "1px solid var(--brand-border)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: "var(--brand-surface)" }}>
              💬
            </div>
            <div className="text-center">
              <p className="text-[18px] font-bold mb-1" style={{ color: "var(--brand-text)" }}>No conversations yet</p>
              <p className="text-[16px] max-w-sm" style={{ color: "var(--brand-hint)" }}>
                Get a ticket to an event, or publish your own — each event has its own chat room, and they show up here.
              </p>
            </div>
            <button
              onClick={() => router.push("/explore")}
              className="px-6 py-3 rounded-lg text-sm font-bold text-[var(--brand-on-green)]"
              style={{ backgroundColor: GREEN }}
            >
              Explore events
            </button>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--brand-border)" }}>
            {sorted.map((room, i) => {
              const unread = !!unreadRooms[room.id];
              return (
                <button
                  key={room.id}
                  onClick={() => router.push(`/chat/${room.id}?name=${encodeURIComponent(room.title)}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--brand-surface)]"
                  style={{
                    backgroundColor: "var(--brand-bg)",
                    borderBottom: i < sorted.length - 1 ? "1px solid var(--brand-border)" : "none",
                  }}
                >
                  {/* Room avatar — event initial on a green disc */}
                  <div
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-semibold leading-none select-none"
                    style={{ backgroundColor: GREEN, color: "var(--brand-on-green)" }}
                  >
                    {room.title.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[16px]"
                      style={{ color: "var(--brand-text)", fontWeight: unread ? 700 : 500 }}
                    >
                      {room.title}
                    </p>
                    <p className="truncate text-[13px] mt-0.5" style={{ color: "var(--brand-hint)" }}>
                      {room.role === "organiser" ? "Event you organise" : "Event chat"}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {unread ? (
                    <span
                      className="w-2.5 h-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--brand-terracotta)" }}
                      title="New messages"
                    />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" style={{ color: "var(--brand-hint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
