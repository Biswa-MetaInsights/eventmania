"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@eventmind/api";
import { useAuthStore, useTicketsStore, useChatUnreadStore } from "@eventmind/store";
import { isDummyMode } from "@/lib/data-source";
import { CHAT_WS_BASE, subFromToken } from "@/lib/chat";

/**
 * App-wide, invisible listener that lights the navbar chat button when a message
 * arrives in one of the rooms the signed-in user belongs to.
 *
 * ⚠️ FRONTEND-ONLY MVP (see chat-unread-store.ts). A chat room is an event, and
 * the user "belongs to" a room if they hold a ticket for that event OR they
 * organise it — covering both cases asked for: an organiser receiving a message,
 * and an attendee getting a reply. It opens one WebSocket per room while the app
 * is open; messages received while the app is closed cannot be detected, and
 * there is no persistence behind this. Replace with a backend unread-count
 * endpoint when the chat service starts persisting messages + read state.
 */
export function ChatPresence() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const tokens = useAuthStore((s) => s.tokens);
  const tickets = useTicketsStore((s) => s.tickets);
  const markUnread = useChatUnreadStore((s) => s.markUnread);
  const activeRoom = useChatUnreadStore((s) => s.activeRoom);

  const userId = subFromToken(tokens?.access_token ?? null);
  const ready = isDummyMode && hasHydrated && isAuthenticated && !!userId;

  // Events this user organises — these rooms are theirs even without a ticket.
  const { data: organised } = useQuery({
    queryKey: ["chat-rooms-organised", userId],
    queryFn: () => eventsApi.search({ organizer_id: userId }).then((r) => r.data),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
  });

  // Distinct room ids = ticketed events ∪ organised events, MINUS the room the
  // user is currently viewing. The room page already holds a socket there, and
  // the backend keys connections by user id within a room — a second socket for
  // the same user would evict the room page's own (connection_manager.py), so
  // the open chat would stop receiving. useMemo keeps the array referentially
  // stable so the socket effect only re-runs when the set actually changes.
  const roomIds = useMemo(() => {
    const ids = new Set<string>();
    tickets.forEach((t) => ids.add(t.event_id));
    (organised ?? []).forEach((e) => ids.add(e.id));
    if (activeRoom) ids.delete(activeRoom);
    // Cap: the MVP opens one socket per room — a sane ceiling for dev.
    return Array.from(ids).slice(0, 30);
  }, [tickets, organised, activeRoom]);

  useEffect(() => {
    if (!ready || roomIds.length === 0) return;

    const sockets: WebSocket[] = [];
    for (const roomId of roomIds) {
      try {
        const ws = new WebSocket(`${CHAT_WS_BASE}/${roomId}/${userId}`);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            // Only someone else's messages count — never my own echoes.
            if (msg?.sender_id && msg.sender_id !== userId) markUnread(roomId);
          } catch {
            // ignore malformed / system frames
          }
        };
        // Backend down? The glow simply stays off — this must never throw.
        ws.onerror = () => {};
        sockets.push(ws);
      } catch {
        // WebSocket construction can throw on a bad URL; ignore.
      }
    }

    return () => {
      sockets.forEach((ws) => {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      });
    };
  }, [ready, userId, roomIds, markUnread]);

  return null;
}
