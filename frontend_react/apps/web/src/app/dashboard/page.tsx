"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useTicketsStore } from "@eventmind/store";
import type { StoredTicket } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";


const MOCK_INTERESTS = ["Technology", "AI", "Venture Capital"];

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}&color=184E4A`;
}

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const tickets = useTicketsStore((s) => s.tickets);
  const [activeTab, setActiveTab] = useState<"tickets" | "profile">("tickets");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const displayName = userEmail ? userEmail.split("@")[0].split(".")[0] : "User";
  const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      {/* ── Page header ── */}
      <div className="px-12 pt-10 pb-0">
        <h1 className="text-[28px] font-bold text-[#111827]">My Dashboard</h1>
      </div>

      {/* ── Tabs ── */}
      <div className="px-12 mt-6 flex gap-1 border-b border-[#E2DDD5]">
        {(["tickets", "profile"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-3 text-sm font-semibold transition-colors relative"
            style={{ color: activeTab === tab ? GREEN : "#6B7280" }}
          >
            {tab === "tickets" ? "My Tickets" : "Networking Profile"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: GREEN }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-12 py-8">
        {activeTab === "tickets" ? (
          <TicketsTab tickets={tickets} />
        ) : (
          <ProfileTab name={capitalized} email={userEmail ?? ""} interests={MOCK_INTERESTS} />
        )}
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
        <p className="text-[18px] text-[#9CA3AF]">No tickets found.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
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
    <div className="bg-white rounded-3xl overflow-hidden flex" style={{ border: "1px solid #E2DDD5" }}>
      {/* QR section */}
      <div className="flex items-center justify-center p-8 shrink-0"
        style={{ backgroundColor: "#F9F9F9", borderRight: "1px solid #E2DDD5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl(ticket.qr_hash)} alt="QR Code" width={150} height={150} />
      </div>

      {/* Info section */}
      <div className="p-8 flex flex-col justify-between flex-1">
        <div>
          <p className="text-[13px] font-bold mb-3" style={{ color: GREEN }}>
            ✓ CONFIRMED TICKET #{ticket.id.substring(ticket.id.length - 8).toUpperCase()}
          </p>
          <h3 className="text-[24px] font-bold text-[#111827] mb-2">{ticket.event_title}</h3>
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <CalIcon /> <span>{date} · {time}</span>
          </div>
          <p className="text-sm text-[#6B7280]">{ticket.seat_info}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: GREEN }}>
            {isFree ? "Free Entry" : `$${ticket.price_paid.toFixed(2)}`}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => router.push(`/event/${ticket.event_id}`)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
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
      <div className="flex items-center gap-8 mb-10">
        <div className="w-28 h-28 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${GREEN}14` }}>
          <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
          </svg>
        </div>
        <div>
          <h2 className="text-[32px] font-bold text-[#111827]">{name}</h2>
          <p className="text-[18px] text-[#6B7280]">{email}</p>
        </div>
      </div>

      <div className="h-px bg-[#E2DDD5] mb-8" />

      <h3 className="text-[24px] font-bold text-[#111827] mb-2">My Networking Interests</h3>
      <p className="text-[#6B7280] mb-8">
        These interests power our AI Agent to match you with suitable event discovery and networking sessions.
      </p>

      <div className="flex flex-wrap gap-3 mb-12">
        {interests.map((interest) => (
          <span key={interest}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white"
            style={{ border: `1px solid ${GREEN}33`, color: GREEN }}>
            {interest}
          </span>
        ))}
      </div>

      <button
        className="px-10 py-4 rounded-2xl text-white font-bold"
        style={{ backgroundColor: GREEN }}
      >
        Update AI Profile
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TicketIcon() {
  return <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" /></svg>;
}
function CalIcon() {
  return <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" /></svg>;
}
