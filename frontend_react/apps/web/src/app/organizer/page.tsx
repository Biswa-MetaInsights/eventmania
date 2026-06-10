"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@eventmind/api";
import type { Event } from "@eventmind/types";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";

export default function OrganizerPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, router]);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["my-events"],
    queryFn: () => eventsApi.search().then((r) => r.data),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      {/* ── Header ── */}
      <div className="px-12 pt-10 pb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827]">Organizer Console</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your events and track performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/organizer/create")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[#F2EFEA] text-sm font-bold"
            style={{ backgroundColor: GREEN }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#133d39")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
          >
            <PlusIcon /> Create New Event
          </button>
        </div>
      </div>

      <div className="px-12 pb-16 space-y-10">
        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-6">
          <StatCard label="Total Revenue" value="$12,450" icon={<RevenueIcon />} color="#22C55E" />
          <StatCard label="Total Attendees" value="1,240" icon={<PeopleIcon />} color="#3B82F6" />
          <StatCard label="Active Events" value={String(events.filter(e => e.status === "published").length)} icon={<EventIcon />} color={GREEN} />
        </div>

        {/* ── Events table ── */}
        <div>
          <h2 className="text-[22px] font-bold text-[#111827] mb-6">Your Managed Events</h2>

          <div className="bg-[#F2EFEA] rounded-3xl overflow-hidden" style={{ border: "1px solid #E2DDD5" }}>
            {events.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[#9CA3AF] text-[16px]">You haven&apos;t created any events yet.</p>
                <button
                  onClick={() => router.push("/organizer/create")}
                  className="mt-4 px-6 py-3 rounded-xl text-[#F2EFEA] text-sm font-semibold"
                  style={{ backgroundColor: GREEN }}
                >
                  Create your first event
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold text-[#9CA3AF] uppercase tracking-wide"
                    style={{ borderBottom: "1px solid #E2DDD5" }}>
                    {["Event Name", "Date", "Status", "Sales", "Revenue", "Actions"].map((col) => (
                      <th key={col} className="px-6 py-4">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, i) => (
                    <EventRow key={event.id} event={event} isLast={i === events.length - 1} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event, isLast }: { event: Event; isLast: boolean }) {
  const router = useRouter();
  const revenue = (event.price * 120).toFixed(2);
  const date = new Date(event.start_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <tr style={{ borderBottom: isLast ? "none" : "1px solid #E2DDD5" }}>
      <td className="px-6 py-4 font-semibold text-[#111827] max-w-[240px]">
        <span className="truncate block">{event.title}</span>
      </td>
      <td className="px-6 py-4 text-sm text-[#6B7280]">{date}</td>
      <td className="px-6 py-4"><StatusBadge status={event.status} /></td>
      <td className="px-6 py-4 text-sm text-[#6B7280]">120 / {event.capacity}</td>
      <td className="px-6 py-4 text-sm font-semibold text-[#111827]">${revenue}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <IconBtn title="Edit" onClick={() => {}}>
            <EditIcon />
          </IconBtn>
          <IconBtn title="Analytics" onClick={() => router.push(`/event/${event.id}`)}>
            <AnalyticsIcon />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === "published";
  return (
    <span
      className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
      style={{
        backgroundColor: isPublished ? "#22C55E14" : "#F59E0B14",
        color: isPublished ? "#16A34A" : "#D97706",
      }}
    >
      {status}
    </span>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F2EFEA] transition-colors">
      {children}
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[#F2EFEA] rounded-3xl p-8 flex items-center gap-6" style={{ border: "1px solid #E2DDD5" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}14` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-sm text-[#9CA3AF] mb-1">{label}</p>
        <p className="text-[32px] font-bold text-[#111827]">{value}</p>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function PlusIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>; }
function RevenueIcon() { return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>; }
function PeopleIcon() { return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>; }
function EventIcon() { return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>; }
function EditIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>; }
function AnalyticsIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>; }
