"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { communityApi, eventsApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";

const CATEGORIES = [
  "Technology", "Business", "Creative", "Networking",
  "Health & Wellness", "Education", "Arts & Culture",
  "Gaming", "Sports", "Food & Drink", "Other",
];

function subFromToken(token: string | null): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? "";
  } catch {
    return "";
  }
}

type PageState = "checking" | "ineligible" | "already_has" | "ready";

export default function CreateCommunityPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const tokens = useAuthStore((s) => s.tokens);

  const [pageState, setPageState] = useState<PageState>("checking");
  const [publishedEventCount, setPublishedEventCount] = useState(0);
  const [existingCommunitySlug, setExistingCommunitySlug] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Technology");
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) { router.replace("/auth"); return; }
    const userId = subFromToken(tokens?.access_token ?? null);
    if (!userId) return;

    Promise.all([
      communityApi.getByOrganizer(userId).catch(() => null),
      eventsApi.search({ organizer_id: userId, limit: 100 }).catch(() => null),
    ]).then(([communityRes, eventsRes]) => {
      if (communityRes) {
        setExistingCommunitySlug(communityRes.data.slug);
        setPageState("already_has");
        return;
      }
      const publishedCount = eventsRes?.data?.filter((e) => e.status === "published").length ?? 0;
      setPublishedEventCount(publishedCount);
      setPageState(publishedCount >= 2 ? "ready" : "ineligible");
    });
  }, [isAuthenticated, hasHydrated, router, tokens]);

  if (!isAuthenticated || pageState === "checking") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
        </div>
      </div>
    );
  }

  if (pageState === "already_has") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
        <Navbar />
        <div className="px-12 py-20 max-w-lg mx-auto text-center">
          <div className="text-5xl mb-6">🏠</div>
          <h1 className="text-[26px] font-bold mb-3" style={{ color: "#111827" }}>
            You already have a community
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#6B7280" }}>
            Each organiser can have one community. Visit your community page to manage it or update its details.
          </p>
          <button
            onClick={() => router.push(`/community/${existingCommunitySlug}`)}
            className="px-8 py-4 rounded-2xl text-sm font-bold text-white"
            style={{ backgroundColor: GREEN }}
          >
            View My Community
          </button>
        </div>
      </div>
    );
  }

  if (pageState === "ineligible") {
    const needed = 2 - publishedEventCount;
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
        <Navbar />
        <div className="px-12 py-20 max-w-lg mx-auto">
          <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}>
            <div className="text-5xl mb-6">🔒</div>
            <h1 className="text-[24px] font-bold mb-3" style={{ color: "#111827" }}>
              Not eligible yet
            </h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#6B7280" }}>
              To create a community, you need at least <span className="font-semibold" style={{ color: "#111827" }}>2 published events</span>.
              You currently have <span className="font-semibold" style={{ color: "#111827" }}>{publishedEventCount}</span>.
              Publish {needed} more event{needed !== 1 ? "s" : ""} to unlock this feature.
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full mb-6" style={{ backgroundColor: "#E2DDD5" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${(publishedEventCount / 2) * 100}%`, backgroundColor: GREEN }}
              />
            </div>
            <p className="text-xs font-semibold mb-8" style={{ color: "#9CA3AF" }}>
              {publishedEventCount} / 2 events published
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/organizer/create")}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: GREEN }}
              >
                Create an Event
              </button>
              <button
                onClick={() => router.push("/organizer")}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: `2px solid ${GREEN}`, color: GREEN, backgroundColor: "white" }}
              >
                My Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // pageState === "ready"
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (name.trim().length < 3) errors.name = "Community name must be at least 3 characters.";
    if (description.trim().length < 20) errors.description = "Description must be at least 20 characters.";
    if (website && !website.match(/^https?:\/\/.+/))
      errors.website = "Website must start with http:// or https://";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const userId = subFromToken(tokens?.access_token ?? null);
      const res = await communityApi.create(userId, {
        name: name.trim(),
        description: description.trim(),
        category,
        website: website.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push(`/community/${res.data.slug}`), 1500);
    } catch {
      setError("Failed to create community. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const descMax = 500;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 py-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: "1px solid #E2DDD5", backgroundColor: "white" }}
          >
            <svg className="w-4 h-4" style={{ color: "#6B7280" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: "#111827" }}>Create Your Community</h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              Group all your events under one community brand.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}>
            <FormField label="Community Name" error={fieldErrors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Tech Events"
                className={inputCls(!!fieldErrors.name)}
              />
            </FormField>

            <FormField label={`Description (${description.length}/${descMax})`} error={fieldErrors.description}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, descMax))}
                placeholder="What is your community about? What kind of events do you organise?"
                rows={4}
                className={inputCls(!!fieldErrors.description)}
              />
            </FormField>

            <FormField label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls(false)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <FormField label="Community Website" hint="Optional" error={fieldErrors.website}>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://mycommunity.com"
                className={inputCls(!!fieldErrors.website)}
              />
            </FormField>
          </div>

          {/* Info callout */}
          <div className="flex gap-3 mt-4 px-4 py-3 rounded-xl text-xs leading-relaxed"
            style={{ backgroundColor: "#E8F0EF", color: "#374151" }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GREEN }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <span>
              Your community will appear on the Explore Communities page. When creating future events,
              you can choose to add them to this community so attendees can discover all your events in one place.
            </span>
          </div>

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl mt-4 bg-red-50 text-red-600 border border-red-200">{error}</p>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl mt-4"
              style={{ color: GREEN, backgroundColor: "#F0F7F6" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Community created! Redirecting…
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || success}
            className="w-full mt-6 py-4 rounded-2xl text-white text-sm font-bold transition-colors disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" />
                Creating…
              </span>
            ) : "Launch Community"}
          </button>
        </form>
      </div>
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
    "w-full px-4 py-3 rounded-xl text-sm transition-colors resize-none " +
    "placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 " +
    (hasError
      ? "border border-red-400 bg-red-50 focus:ring-red-200"
      : "border border-[#E2DDD5] bg-white text-[#111827] focus:ring-[#184E4A]/20 focus:border-[#184E4A]")
  );
}
