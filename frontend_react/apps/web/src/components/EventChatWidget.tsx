"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { eventsApi } from "@eventmind/api";
import type { ChatMessage } from "@eventmind/api";
import { useAuthStore, useTicketsStore } from "@eventmind/store";
import type { Event } from "@eventmind/types";

const GREEN = "var(--brand-green)";
const LINEN = "var(--brand-surface)";
// The floating launcher is terracotta so it reads as a distinct accent against
// the green CTAs (Book Now, booking card) rather than competing with them.
const TERRACOTTA = "var(--brand-terracotta)";
const ON_TERRACOTTA = "var(--brand-on-terracotta)";

function subFromToken(token: string | null): string {
  if (!token) return "";
  try {
    return JSON.parse(atob(token.split(".")[1])).sub ?? "";
  } catch {
    return "";
  }
}

type AccessState = "loading" | "no_auth" | "no_access" | "organizer" | "attendee";

interface Props {
  event: Event;
}

export function EventChatWidget({ event }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);
  const tickets = useTicketsStore((s) => s.tickets);

  const userId = subFromToken(tokens?.access_token ?? null);

  // Determine access level
  const access: AccessState = (() => {
    if (!isAuthenticated || !userId) return "no_auth";
    if (userId === event.organizer_id) return "organizer";
    if (tickets.some((t) => t.event_id === event.id)) return "attendee";
    return "no_access";
  })();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && access !== "no_auth" && access !== "no_access") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, access]);

  // Greeting on first open
  useEffect(() => {
    if (open && messages.length === 0 && (access === "organizer" || access === "attendee")) {
      const greeting =
        access === "organizer"
          ? `Hi! I'm your event assistant for "${event.title}". As the organiser, you can ask me anything about your event — schedule, venue, attendee FAQs, or how to present key details.`
          : `Hi! I'm your event assistant for "${event.title}". Ask me anything — what to bring, where to go, what to expect, and more.`;
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, access, event.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await eventsApi.chat(event.id, {
        user_id: userId,
        message: text,
        history: messages, // send history before the new message
      });
      setMessages([...updatedHistory, { role: "assistant", content: res.data.reply }]);
    } catch {
      setError("Could not get a response. Please try again.");
      // Keep the user message visible but mark error
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, event.id, userId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const badgeLabel = access === "organizer" ? "Organiser" : "Attendee";
  const canChat = access === "organizer" || access === "attendee";

  return (
    // Position: above the sticky booking bar (h-88 = 88px) with 16px gap → bottom-[112px]
    <div className="fixed bottom-[112px] right-4 sm:right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="flex flex-col rounded-lg overflow-hidden shadow-2xl"
          style={{
            // A flat 340×500 panel runs past the left edge of a 375px phone and
            // past the top of a short landscape viewport; both cap to the space
            // actually available, so the panel never has to be scrolled to.
            width: "min(340px, calc(100vw - 32px))",
            height: "min(500px, calc(100dvh - 200px))",
            backgroundColor: "var(--brand-surface)",
            border: "1px solid var(--brand-border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: GREEN }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--brand-on-green)]/20">
                <svg className="w-4 h-4 text-[var(--brand-on-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--brand-on-green)] leading-none">Event Assistant</p>
                <p className="text-[11px] text-[var(--brand-on-green)]/70 truncate mt-0.5" style={{ maxWidth: 180 }}>
                  {event.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              /* 28px under a mouse; 40px under a finger, with the growth given
                 back by the negative margin so the header row's height holds. */
              className="w-7 h-7 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:-m-1.5 rounded-lg flex items-center justify-center bg-[var(--brand-on-green)]/15 hover:bg-[var(--brand-on-green)]/25 transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--brand-on-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* No auth state */}
            {access === "no_auth" && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, var(--brand-green) 8%, transparent)` }}>
                  <svg className="w-7 h-7" style={{ color: GREEN }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[14px]" style={{ color: "var(--brand-text)" }}>Sign in to chat</p>
                  <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--brand-hint)" }}>
                    The event assistant is available to registered attendees and the event organiser.
                  </p>
                </div>
              </div>
            )}

            {/* No access state */}
            {access === "no_access" && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
                  <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[14px]" style={{ color: "var(--brand-text)" }}>Attendees only</p>
                  <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--brand-hint)" }}>
                    Register for this event to unlock the AI event assistant.
                  </p>
                </div>
              </div>
            )}

            {/* Chat messages */}
            {canChat && (
              <>
                {/* Access badge */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, var(--brand-green) 8%, transparent)`, color: GREEN }}>
                    {badgeLabel} · Event Assistant
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))}

                  {loading && <TypingIndicator />}

                  {error && (
                    <p className="text-[11px] text-center px-2 py-1 rounded-lg text-red-500 bg-red-50">
                      {error}
                    </p>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 px-3 py-3 border-t" style={{ borderColor: "var(--brand-border)" }}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: "1px solid var(--brand-border)", backgroundColor: LINEN }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about this event…"
                      className="flex-1 text-[13px] bg-transparent outline-none"
                      style={{ color: "var(--brand-text)" }}
                      disabled={loading}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || loading}
                      aria-label="Send"
                      /* Same coarse-pointer bump as the close button above. */
                      className="w-7 h-7 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:-m-1.5 shrink-0 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: GREEN }}
                    >
                      <svg className="w-3.5 h-3.5 text-[var(--brand-on-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[10px] text-center mt-1.5" style={{ color: "var(--brand-hint)" }}>
                    AI-powered · Responses may not reflect live updates
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 relative"
        style={{ backgroundColor: TERRACOTTA, color: ON_TERRACOTTA }}
        title="Event Assistant"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
        )}

        {/* Unread dot — shown when closed and user hasn't opened yet */}
        {!open && canChat && messages.length === 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 animate-pulse"
            style={{ backgroundColor: "#22C55E", borderColor: ON_TERRACOTTA }}
          />
        )}
      </button>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5"
          style={{ backgroundColor: `color-mix(in srgb, var(--brand-green) 8%, transparent)` }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: GREEN }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </div>
      )}
      <div
        className="max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed"
        style={{
          backgroundColor: isUser ? GREEN : "var(--brand-surface)",
          color: isUser ? "var(--brand-on-green)" : "var(--brand-text)",
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ── Typing indicator (three dots) ─────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5"
        style={{ backgroundColor: `color-mix(in srgb, var(--brand-green) 8%, transparent)` }}
      >
        <svg className="w-3.5 h-3.5" style={{ color: GREEN }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      </div>
      <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: "var(--brand-surface)", borderBottomLeftRadius: 4 }}>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: "var(--brand-muted)", animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
