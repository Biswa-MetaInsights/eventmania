"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { eventsApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";
const CATEGORIES = ["Technology", "Creative", "Business", "Summit", "Networking", "Gaming"];

// Extract user ID from JWT payload (read-only, no verification needed client-side)
function subFromToken(token: string | null): string {
  if (!token) return "00000000-0000-0000-0000-000000000001";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

export default function CreateEventPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technology");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [price, setPrice] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  async function handlePublish(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const organizerId = subFromToken(tokens?.access_token ?? null);
      await eventsApi.create({
        organizer_id: organizerId,
        title,
        description,
        category,
        location: { address, latitude: 0.0, longitude: 0.0 },
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        capacity: parseInt(capacity) || 100,
        price: parseFloat(price) || 0,
        status: "published",
      });
      setSuccess(true);
      setTimeout(() => router.push("/organizer"), 1500);
    } catch {
      setError("Failed to publish event. Please check all fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="px-12 py-10 max-w-3xl">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2EFEA] transition-colors"
            style={{ border: "1px solid #E2DDD5" }}>
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-[28px] font-bold text-[#111827]">Publish New Event</h1>
        </div>

        <form onSubmit={handlePublish} className="space-y-12">

          {/* ── Event Basics ── */}
          <section>
            <h2 className="text-[22px] font-bold text-[#111827] mb-8">Event Basics</h2>
            <div className="space-y-6">
              <FormField label="Event Title">
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., EventMind AI Summit 2026" className={inputCls} />
              </FormField>

              <FormField label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>

              <FormField label="Description">
                <textarea required value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this event about?" rows={5} className={inputCls} />
              </FormField>
            </div>
          </section>

          {/* ── Time & Location ── */}
          <section>
            <h2 className="text-[22px] font-bold text-[#111827] mb-8">Time & Location</h2>
            <div className="space-y-6">
              <FormField label="Venue Address">
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Tech Lane, San Francisco" className={inputCls} />
              </FormField>

              <div className="grid grid-cols-2 gap-6">
                <FormField label="Start Date & Time">
                  <input type="datetime-local" required value={startDate}
                    onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </FormField>
                <FormField label="End Date & Time">
                  <input type="datetime-local" required value={endDate}
                    onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                </FormField>
              </div>

              <FormField label="Capacity">
                <input type="number" required min="1" value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Max number of attendees" className={inputCls} />
              </FormField>
            </div>
          </section>

          {/* ── Ticket Pricing ── */}
          <section>
            <h2 className="text-[22px] font-bold text-[#111827] mb-8">Ticket Pricing</h2>
            <FormField label="Price (USD)">
              <input type="number" required min="0" step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00 for FREE events" className={inputCls} />
            </FormField>
          </section>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {success && (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: GREEN }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Event published! Redirecting to your console…
            </div>
          )}

          <button type="submit" disabled={isSubmitting || success}
            className="w-full py-5 rounded-2xl text-white text-[18px] font-bold transition-colors disabled:opacity-60"
            style={{ backgroundColor: GREEN }}
            onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = "#133d39")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-white" />
                Publishing…
              </span>
            ) : "Publish Event Now"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-[#111827]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-[#E2DDD5] bg-white text-[#111827] text-sm " +
  "placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#184E4A]/20 " +
  "focus:border-[#184E4A] transition-colors resize-none";
