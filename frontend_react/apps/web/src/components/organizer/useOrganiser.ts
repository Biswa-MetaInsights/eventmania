// Who is running the console, and are they allowed in.
//
// Kept out of the layout so every console section can read the same organiser
// without re-deriving the JWT claim. The `_hasHydrated` gate is the pattern
// HANDOVER.md points at (`/chat`, `app/page.tsx`): zustand rehydrates from
// localStorage AFTER first render, so a guard that reads `isAuthenticated`
// straight away bounces a signed-in user to /auth on every refresh.
//
// ⚠️ THERE ARE TWO GATES HERE, and they answer different questions.
//   1. Signed in?      → not, and you go to /auth. Always enforced.
//   2. An organiser?   → not, and the console explains itself instead of
//                        rendering (see `isOrganiser` below).
//
// The second is what keeps the console private once this is deployed: an
// organiser profile is what `/organizer/onboarding` creates, and every section
// is already scoped to `organizer_id`, so an organiser sees their own events,
// their own attendees' contact details and their own revenue — never anyone
// else's. In DUMMY mode gate 2 is off on purpose: during development anyone on
// the dummy setup is the organiser, and the events they get are the fixed
// portfolio in `dummyMyEvents`.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import type { Event } from "@eventmind/types";
import { isDummyMode, organizerSource, ownsEvent } from "@/lib/data-source";

function subFromToken(token: string | null): string {
  if (!token) return "";
  try {
    return JSON.parse(atob(token.split(".")[1])).sub ?? "";
  } catch {
    return "";
  }
}

/**
 * "gautham.k@studio.in" → "Gautham K" — the fallback when there is no organiser
 * profile to read a real `full_name` from.
 *
 * ⚠️ Navbar.tsx has its own `displayName` doing the same job, and deliberately
 * keeps only the FIRST segment ("Gautham") because it labels an avatar. This one
 * keeps all of them; the console's greeting takes `.split(" ")[0]` and so agrees
 * with the navbar. If a real shared helper is ever wanted, that is the pair to
 * merge.
 */
function nameFromEmail(email: string | null): string {
  if (!email) return "Organiser";
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function useOrganiser() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const tokens = useAuthStore((s) => s.tokens);
  const userEmail = useAuthStore((s) => s.userEmail);

  const organiserId = subFromToken(tokens?.access_token ?? null);

  useEffect(() => {
    // Only decide once the persisted state is actually loaded.
    if (hasHydrated && !isAuthenticated) router.replace("/auth");
  }, [hasHydrated, isAuthenticated, router]);

  // The SAME query key the navbar uses, so the two share one fetch and can never
  // disagree about whether this person is an organiser.
  const profileQuery = useQuery({
    queryKey: ["organizer-profile", organiserId],
    queryFn: () => organizerApi.get(organiserId).then((r) => r.data),
    enabled: !!organiserId && !isDummyMode,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const profile = profileQuery.data;

  // ⚠️ ALWAYS the signed-in person, in BOTH data modes (Gautham, 2026-08-21).
  // The console is one organiser's private view of their own events — revenue,
  // attendee contact details, refunds — so a fixture name here would put someone
  // else's identity on the page and undercut exactly the thing it is meant to
  // say: this is yours, and only you see it. The dummy FIGURES stay made up; the
  // person never is.
  const name = profile?.full_name || nameFromEmail(userEmail);

  return {
    organiserId,
    name,
    // `isVerified` used to be returned here for the Settings page's verification
    // row; both went on 2026-09-01. If a console surface ever needs the badge
    // again, read `profile.verification_status` — and remember the rule
    // DetailCardHeader carries: a verified badge is a TRUST CLAIM and may only
    // be shown for a genuine one.
    /** False until zustand has rehydrated — render nothing rather than flashing. */
    ready: hasHydrated && isAuthenticated,

    /**
     * May this person run an organiser console at all?
     *
     * Having an organiser profile IS being an organiser — it is what
     * `/organizer/onboarding` creates and what `/organizer/create` already
     * requires before it will let anyone publish. In dummy mode this is always
     * true: the developer signed in IS the organiser of `dummyMyEvents`.
     */
    isOrganiser: isDummyMode ? true : !!profile,

    /**
     * Has the question above actually been ANSWERED yet?
     *
     * Needed because "no profile loaded" and "profile still loading" look
     * identical from `profile` alone, and showing a "you are not an organiser"
     * page to an organiser for half a second is worse than showing nothing.
     * A disabled query never settles, so a missing `organiserId` — a token with
     * no `sub`, which we could not scope events by anyway — counts as answered.
     */
    organiserKnown:
      isDummyMode || !organiserId || profileQuery.isSuccess || profileQuery.isError,
  };
}

/**
 * Am I looking at MY OWN event? — the gate on the organiser view of
 * `/event/[id]` (the preview/organiser bar and its Edit / Cancel controls).
 *
 * ⚠️ NOT `useOrganiser()`. That hook redirects a signed-out visitor to `/auth`,
 * which is right for the console and catastrophic on a public event page: every
 * anonymous visitor would be bounced to the login screen. This one reads the
 * same token claim and redirects nobody.
 *
 * Returns false until zustand has rehydrated, so the bar appears once rather
 * than flashing in — the `_hasHydrated` pattern HANDOVER.md points at.
 */
export function useIsEventOwner(event: Event | null | undefined): boolean {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);

  if (!hasHydrated || !isAuthenticated) return false;
  return ownsEvent(event, subFromToken(tokens?.access_token ?? null));
}

// ⚠️ `useOwnerName()` lived here and was DELETED (Gautham, 2026-09-01). It named
// the signed-in PERSON on the organiser view of `/event/[id]`, and that card now
// shows the same "Organised by" block the participant's does — one organisation
// name, identical in both views, from `ORGANISER_NAME` in that page. The person
// is not the answer there even once real data lands; the organisation is.

/**
 * The organiser's events, on ONE query key.
 *
 * The layout (for its nav count), the Events hero and the events table all want
 * this list. Sharing the key means React Query serves them from a single fetch
 * — and, more importantly, means the count in the sidebar can never disagree
 * with the number of rows in the table.
 */
export function useOrganiserEvents(organiserId: string) {
  return useQuery({
    queryKey: ["organizer-events", organiserId],
    queryFn: () => organizerSource.events(organiserId).then((r) => r.data),
    // Dummy mode ignores the id, so it must not gate the fetch there.
    enabled: isDummyMode || !!organiserId,
  });
}
