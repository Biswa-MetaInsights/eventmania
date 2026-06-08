"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { communityApi } from "@eventmind/api";
import { Navbar } from "@/components/navbar/Navbar";
import type { Community } from "@eventmind/types";

const GREEN = "#184E4A";

const CATEGORIES = [
  "All",
  "Technology", "Business", "Creative", "Networking",
  "Health & Wellness", "Education", "Arts & Culture",
  "Gaming", "Sports", "Food & Drink", "Other",
];

export default function CommunitiesPage() {
  return (
    <Suspense>
      <CommunitiesContent />
    </Suspense>
  );
}

function CommunitiesContent() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");

  const { data: communities, isLoading } = useQuery({
    queryKey: ["communities", q, category],
    queryFn: () =>
      communityApi
        .search({ q: q || undefined, category: category !== "All" ? category : undefined })
        .then((r) => r.data),
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 pt-10 pb-4">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-[32px] font-extrabold tracking-tight" style={{ color: "#111827" }}>
            Explore Communities
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Discover organisers and follow their events in one place
          </p>
        </div>

        {/* Search + category row */}
        <div className="flex gap-3 items-center mb-8">
          <div className="relative flex-1 max-w-xl">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search communities…"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid #E2DDD5", backgroundColor: "white", color: "#111827" }}
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ border: "1px solid #E2DDD5", backgroundColor: "white", color: "#111827" }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => router.push("/community/create")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: GREEN }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Community
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="px-12 pb-20">
        <p className="text-sm font-semibold mb-6" style={{ color: "#6B7280" }}>
          {isLoading ? "Loading…" : `${communities?.length ?? 0} communit${communities?.length !== 1 ? "ies" : "y"} found`}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
          </div>
        ) : !communities || communities.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <svg className="w-10 h-10" style={{ color: "#D1D5DB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <p className="text-[15px] font-semibold" style={{ color: "#6B7280" }}>No communities found</p>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Be the first to create one!</p>
            <button
              onClick={() => router.push("/community/create")}
              className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ backgroundColor: GREEN }}
            >
              Create a Community
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                onTap={() => router.push(`/community/${community.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommunityCard({ community, onTap }: { community: Community; onTap: () => void }) {
  const initial = community.name.charAt(0).toUpperCase();
  return (
    <button
      onClick={onTap}
      className="text-left rounded-2xl p-6 flex flex-col gap-4 transition-shadow hover:shadow-md"
      style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ backgroundColor: GREEN }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[15px] truncate" style={{ color: "#111827" }}>{community.name}</p>
          {community.category && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#E8F0EF", color: GREEN }}>
              {community.category}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {community.description && (
        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "#6B7280" }}>
          {community.description}
        </p>
      )}

      {/* Website */}
      {community.website && (
        <p className="text-xs truncate" style={{ color: GREEN }}>
          {community.website.replace(/^https?:\/\//, "")}
        </p>
      )}

      <div className="flex items-center gap-1 mt-auto text-xs font-semibold" style={{ color: GREEN }}>
        View community
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  );
}
