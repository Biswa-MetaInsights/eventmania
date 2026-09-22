"use client";

import { use, useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, useChatUnreadStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import { GUTTERS } from "@/lib/layout";
import { BRAND } from "@/lib/theme";
import { CHAT_WS_BASE } from "@/lib/chat";

const GREEN = BRAND.green;
const SURFACE = BRAND.surface;
const ON_GREEN = BRAND.onGreen;
const TEXT = BRAND.text;
const BORDER = BRAND.border;
const WS_BASE = CHAT_WS_BASE;

interface Message {
  sender_id: string;
  content: string;
  message_type: string;
  timestamp?: string;
}

function subFromToken(token: string | null): string {
  if (!token) return "00000000-0000-0000-0000-000000000001";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  return (
    <Suspense>
      <ChatPageInner roomId={roomId} />
    </Suspense>
  );
}

function ChatPageInner({ roomId }: { roomId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomName = searchParams.get("name") ?? "Event Chat";

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);
  const userId = subFromToken(tokens?.access_token ?? null);

  const setActiveRoom = useChatUnreadStore((s) => s.setActiveRoom);
  const markRead = useChatUnreadStore((s) => s.markRead);

  // While this room is open it is never "unread": mark it active + read, and
  // release it on unmount so the navbar glow reflects only OTHER rooms.
  useEffect(() => {
    setActiveRoom(roomId);
    markRead(roomId);
    return () => setActiveRoom(null);
  }, [roomId, setActiveRoom, markRead]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/auth"); return; }

    const ws = new WebSocket(`${WS_BASE}/${roomId}/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setConnectionError(true);
    ws.onmessage = (e) => {
      try {
        const msg: Message = JSON.parse(e.data);
        setMessages((prev) => [...prev, { ...msg, timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, [roomId, userId, isAuthenticated, router]);

  function sendMessage() {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: input.trim(), message_type: "text" }));
    setInput("");
  }

  if (!isAuthenticated) return null;

  return (
    // dvh, not vh: with 100vh the composer sits under a phone's URL bar.
    <div className="flex flex-col h-[100dvh] bg-[var(--brand-bg)]">
      <Navbar />

      {/* ── Chat header ── */}
      <div className={`flex items-center justify-between py-4 border-b border-[var(--brand-border)] shrink-0 ${GUTTERS}`}>
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => router.back()}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-[var(--brand-surface)] transition-colors border border-[var(--brand-border)]">
            <svg className="w-4 h-4 text-[var(--brand-hint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[18px] font-bold text-[var(--brand-text)] truncate">{roomName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-[12px] text-[var(--brand-hint)]">{isConnected ? "Live Chat" : "Connecting…"}</span>
            </div>
          </div>
        </div>
        <button className="p-2 shrink-0 rounded-lg hover:bg-[var(--brand-surface)] transition-colors text-[var(--brand-hint)]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </button>
      </div>

      {/* ── Messages ── */}
      <div className={`flex-1 overflow-y-auto py-6 space-y-6 ${GUTTERS}`}>
        {connectionError && (
          <div className="text-center py-8">
            <p className="text-[var(--brand-hint)]">Could not connect to the chat service.</p>
            <p className="text-sm text-[var(--brand-hint)] mt-1">Make sure the backend is running on port 8007.</p>
          </div>
        )}

        {!connectionError && messages.length === 0 && isConnected && (
          <div className="text-center py-8">
            <p className="text-[var(--brand-hint)]">No messages yet. Say hello! 👋</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <p className="text-[12px] font-bold text-[var(--brand-hint)] mb-1 ml-3">
                  Attendee {msg.sender_id.substring(0, 4).toUpperCase()}
                </p>
              )}
              <div
                className="px-5 py-3 rounded-lg max-w-[85%] sm:max-w-[60%] text-[16px] leading-relaxed break-words"
                style={{
                  backgroundColor: isMe ? GREEN : "color-mix(in srgb, var(--brand-text) 7%, transparent)",
                  color: isMe ? ON_GREEN : TEXT,
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: isMe ? undefined : 4,
                }}
              >
                {msg.content}
              </div>
              {msg.timestamp && (
                <p className="text-[10px] text-[var(--brand-hint)] mt-1 mx-1">{msg.timestamp}</p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className={`py-5 border-t border-[var(--brand-border)] shrink-0 ${GUTTERS}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Send a message to attendees…"
            disabled={!isConnected}
            className="flex-1 px-5 py-3.5 rounded-lg text-sm outline-none disabled:opacity-50"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !input.trim()}
            className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-[var(--brand-on-green)] transition-colors disabled:opacity-40"
            style={{ backgroundColor: GREEN }}
          >
            <svg className="w-5 h-5 -translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
