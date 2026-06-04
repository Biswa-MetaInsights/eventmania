"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";

function subFromToken(token: string | null): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? "";
  } catch {
    return "";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function MyOrganisedEventsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);

  const organizerId = subFromToken(tokens?.access_token ?? null);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, router]);

  const { data: events, isLoading } = useQuery({
    queryKey: ["my-events", organizerId],
    queryFn: () =>
      eventsApi
        .search({ organizer_id: organizerId, status: "published" } as Parameters<typeof eventsApi.search>[0])
        .then((r) => r.data),
    enabled: !!organizerId,
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 py-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: "#111827" }}>My Organised Events</h1>
            <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
              Events you have published on EventMind
            </p>
          </div>
          <button
            onClick={() => router.push("/organizer/create")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: GREEN }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create New Event
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-5 rounded-2xl"
            style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: "#F2EFEA" }}>
              📋
            </div>
            <div className="text-center">
              <p className="text-[17px] font-bold mb-1" style={{ color: "#111827" }}>No events yet</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Events you create will appear here.
              </p>
            </div>
            <button
              onClick={() => router.push("/organizer/create")}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: GREEN }}
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E2DDD5" }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#F9F8F6", borderBottom: "1px solid #E2DDD5" }}>
                  {["Event", "City", "Date", "Type", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wide"
                      style={{ color: "#6B7280" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "white" }}>
                {events.map((ev, i) => {
                  const loc = ev.location as Record<string, unknown>;
                  const cityName = (loc?.address as string)?.split(",").slice(-2).join(",").trim() ?? "—";
                  const isOnline = loc?.event_type === "online" || loc?.event_type === "Online";
                  return (
                    <tr
                      key={ev.id}
                      style={{ borderBottom: i < events.length - 1 ? "1px solid #E2DDD5" : "none" }}
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold" style={{ color: "#111827" }}>{ev.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{ev.category}</p>
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#6B7280" }}>
                        {isOnline ? "Online" : cityName || "—"}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#6B7280" }}>
                        {formatDate(ev.start_date)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{
                            backgroundColor: isOnline ? "#EEF2FF" : "#F0F7F6",
                            color: isOnline ? "#4F46E5" : GREEN,
                          }}>
                          {isOnline ? "Online" : "In-Person"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{ backgroundColor: "#F0FDF4", color: "#16A34A" }}>
                          {ev.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => router.push(`/event/${ev.id}`)}
                          className="text-xs font-semibold"
                          style={{ color: GREEN }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
