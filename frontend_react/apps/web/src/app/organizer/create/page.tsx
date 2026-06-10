"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { eventsApi, organizerApi, communityApi } from "@eventmind/api";
import { useAuthStore, CITIES } from "@eventmind/store";
import type { City } from "@eventmind/store";
import type { Community } from "@eventmind/types";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";

const CATEGORIES = ["Technology", "Creative", "Business", "Summit", "Networking", "Gaming", "Health & Wellness", "Education", "Arts & Culture", "Sports", "Food & Drink", "Other"];
const EVENT_TYPES = ["In-Person", "Online", "Hybrid"] as const;
const LANGUAGES = ["English", "French", "Dutch", "German", "Spanish", "Portuguese", "Arabic", "Hindi", "Other"];
const TARGET_AUDIENCES = [
  "Developers & Engineers",
  "Business & Entrepreneurs",
  "Students & Graduates",
  "Creatives & Designers",
  "Marketing & Sales",
  "HR & People Ops",
  "Investors & VCs",
  "General Public",
];

type EventType = typeof EVENT_TYPES[number];

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

  // Event basics
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technology");
  const [eventType, setEventType] = useState<EventType>("In-Person");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("English");
  const [eventWebsite, setEventWebsite] = useState("");

  // Location
  const [city, setCity] = useState<City>(CITIES[0]);
  const [address, setAddress] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");

  // Timing
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Tickets
  const [capacity, setCapacity] = useState("100");
  const [price, setPrice] = useState("0");

  // Community
  const [community, setCommunity] = useState<Community | null>(null);
  const [communityId, setCommunityId] = useState<string>("");

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [verificationChecked, setVerificationChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/auth"); return; }
    const userId = subFromToken(tokens?.access_token ?? null);
    if (!userId) return;

    organizerApi.get(userId)
      .then(() => {
        setVerificationChecked(true);
        // Check if organizer already has a community
        communityApi.getByOrganizer(userId)
          .then((r) => setCommunity(r.data))
          .catch(() => {/* no community yet */});
      })
      .catch(() => router.replace("/organizer/onboarding"));
  }, [isAuthenticated, router, tokens]);

  if (!isAuthenticated || !verificationChecked) return null;

  function toggleAudience(item: string) {
    setTargetAudience((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (title.trim().length < 5) errors.title = "Title must be at least 5 characters.";
    if (description.trim().length < 20) errors.description = "Description must be at least 20 characters.";
    if (eventType !== "Online" && !address.trim()) errors.address = "Venue address is required for in-person events.";
    if (eventType !== "In-Person" && !onlineUrl.trim()) errors.onlineUrl = "Online link is required for online/hybrid events.";
    if (!startDate) errors.startDate = "Start date is required.";
    if (!endDate) errors.endDate = "End date is required.";
    if (startDate && endDate && new Date(endDate) <= new Date(startDate))
      errors.endDate = "End date must be after start date.";
    if (parseInt(capacity) < 1) errors.capacity = "Capacity must be at least 1.";
    if (parseFloat(price) < 0) errors.price = "Price cannot be negative.";
    if (eventWebsite && !eventWebsite.match(/^https?:\/\/.+/))
      errors.eventWebsite = "Website must start with http:// or https://";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent, mode: "publish" | "draft") {
    e.preventDefault();
    if (!validate()) return;

    setError(null);
    setIsSubmitting(true);
    setSubmitMode(mode);

    try {
      const organizerId = subFromToken(tokens?.access_token ?? null);
      const location: Record<string, unknown> = {
        event_type: eventType,
        latitude: eventType !== "Online" ? city.lat : null,
        longitude: eventType !== "Online" ? city.lng : null,
      };
      if (address.trim()) location.address = address.trim();
      if (onlineUrl.trim()) location.online_url = onlineUrl.trim();

      const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

      await eventsApi.create({
        organizer_id: organizerId,
        title: title.trim(),
        description: description.trim(),
        category,
        event_type: eventType,
        location,
        target_audience: targetAudience.join(", ") || undefined,
        tags: parsedTags,
        language,
        event_website: eventWebsite.trim() || undefined,
        community_id: communityId || undefined,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        capacity: parseInt(capacity) || 100,
        price: parseFloat(price) || 0,
        status: mode === "publish" ? "published" : "draft",
      });

      setSuccess(true);
      setTimeout(() => router.push("/organizer"), 1500);
    } catch {
      setError("Failed to save event. Please check all fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const descMax = 1000;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 py-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "1px solid #E2DDD5", backgroundColor: "#F2EFEA" }}
          >
            <svg className="w-4 h-4" style={{ color: "#6B7280" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: "#111827" }}>Create New Event</h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Fill in the details below to publish or save as draft.</p>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, submitMode)} className="space-y-6">

          {/* ── Event Basics ── */}
          <Section title="Event Basics">
            <FormField label="Event Title" error={fieldErrors.title}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., EventMind AI Summit 2026"
                className={inputCls(!!fieldErrors.title)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-6">
              <FormField label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls(false)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>

              <FormField label="Language">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls(false)}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Event Type">
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #E2DDD5" }}>
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEventType(t)}
                    className="flex-1 py-3 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: eventType === t ? GREEN : "#F2EFEA",
                      color: eventType === t ? "#F2EFEA" : "#111827",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label={`Description (${description.length}/${descMax})`} error={fieldErrors.description}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, descMax))}
                placeholder="What is this event about? What will attendees learn or experience?"
                rows={5}
                className={inputCls(!!fieldErrors.description)}
              />
            </FormField>

            <FormField label="Target Audience" hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                {TARGET_AUDIENCES.map((a) => {
                  const selected = targetAudience.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAudience(a)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? GREEN : "#F2EFEA",
                        color: selected ? "#F2EFEA" : "#374151",
                        border: `1px solid ${selected ? GREEN : "#E2DDD5"}`,
                      }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Tags / Keywords" hint="Comma-separated, helps with search">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., AI, machine learning, startups"
                className={inputCls(false)}
              />
            </FormField>

            <FormField label="Event Website" hint="Optional" error={fieldErrors.eventWebsite}>
              <input
                type="url"
                value={eventWebsite}
                onChange={(e) => setEventWebsite(e.target.value)}
                placeholder="https://myevent.com"
                className={inputCls(!!fieldErrors.eventWebsite)}
              />
            </FormField>
          </Section>

          {/* ── Time & Location ── */}
          <Section title="Time & Location">
            {eventType !== "Online" && (
              <FormField label="City">
                <select
                  value={city.name}
                  onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value) ?? CITIES[0])}
                  className={inputCls(false)}
                >
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}, {c.country}</option>
                  ))}
                </select>
              </FormField>
            )}

            {eventType !== "Online" && (
              <FormField label="Venue Address" error={fieldErrors.address}>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., Tour & Taxis, Avenue du Port 86C, Brussels"
                  className={inputCls(!!fieldErrors.address)}
                />
              </FormField>
            )}

            {eventType !== "In-Person" && (
              <FormField label="Online Event Link" error={fieldErrors.onlineUrl}>
                <input
                  type="url"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="e.g., https://zoom.us/j/..."
                  className={inputCls(!!fieldErrors.onlineUrl)}
                />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-6">
              <FormField label="Start Date & Time" error={fieldErrors.startDate}>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls(!!fieldErrors.startDate)}
                />
              </FormField>
              <FormField label="End Date & Time" error={fieldErrors.endDate}>
                <input
                  type="datetime-local"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls(!!fieldErrors.endDate)}
                />
              </FormField>
            </div>
          </Section>

          {/* ── Tickets & Pricing ── */}
          <Section title="Tickets & Pricing">
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Capacity (max attendees)" error={fieldErrors.capacity}>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="100"
                  className={inputCls(!!fieldErrors.capacity)}
                />
              </FormField>

              <FormField label="Ticket Price (USD)" error={fieldErrors.price}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#9CA3AF" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={`${inputCls(!!fieldErrors.price)} pl-8`}
                  />
                </div>
                {parseFloat(price) === 0 && (
                  <p className="text-xs font-medium mt-1" style={{ color: GREEN }}>This will be a FREE event.</p>
                )}
              </FormField>
            </div>
          </Section>

          {/* ── Community ── */}
          {community && (
            <Section title="Community">
              <p className="text-sm" style={{ color: "#6B7280" }}>
                You have a community called <span className="font-semibold" style={{ color: "#111827" }}>{community.name}</span>.
                Adding this event to your community groups it with your other events on your community page.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setCommunityId(communityId ? "" : community.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: communityId ? GREEN : "#F2EFEA",
                    color: communityId ? "#F2EFEA" : "#374151",
                    border: `1px solid ${communityId ? GREEN : "#E2DDD5"}`,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                  {communityId ? `Added to ${community.name}` : `Add to ${community.name}`}
                </button>
              </div>
            </Section>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm px-4 py-3 rounded-xl bg-red-50 text-red-600 border border-red-200">{error}</p>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl" style={{ color: GREEN, backgroundColor: "#F0F7F6" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {submitMode === "publish" ? "Event published!" : "Draft saved!"} Redirecting…
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || success}
              onClick={() => setSubmitMode("draft")}
              className="flex-1 py-4 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50"
              style={{ border: `2px solid ${GREEN}`, color: GREEN, backgroundColor: "#F2EFEA" }}
            >
              {isSubmitting && submitMode === "draft" ? "Saving…" : "Save as Draft"}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || success}
              onClick={() => setSubmitMode("publish")}
              className="flex-[2] py-4 rounded-2xl text-[#F2EFEA] text-sm font-bold transition-colors disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              {isSubmitting && submitMode === "publish" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" />
                  Publishing…
                </span>
              ) : "Publish Event"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: "#F2EFEA", border: "1px solid #E2DDD5" }}>
      <h2 className="text-[18px] font-bold" style={{ color: "#111827" }}>{title}</h2>
      {children}
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold" style={{ color: "#111827" }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: "#9CA3AF" }}>{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean): string {
  return (
    "w-full px-4 py-3 rounded-xl text-sm transition-colors " +
    "placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 resize-none " +
    (hasError
      ? "border border-red-400 bg-red-50 focus:ring-red-200"
      : "border border-[#E2DDD5] bg-[#F2EFEA] text-[#111827] focus:ring-[#184E4A]/20 focus:border-[#184E4A]")
  );
}
