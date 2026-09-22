// Time-of-day greeting for the organiser console header.
//
// ⚠️ It used to carry a `label` too — "Friday 11 September" — printed above the
// console's h1. That line went on 2026-09-11 (Gautham); do not add it back here
// or in the layout.
//
// This looks like a job for `useState` + `useEffect`, and it is not. The value
// only exists in the browser — the server and the client can straddle noon
// or sit in different timezones, so rendering a greeting in both is a hydration
// mismatch. `useSyncExternalStore` is React's own answer to exactly that: it
// takes a separate server snapshot, so the server renders nothing and the
// browser fills it in on hydration, with no setState inside an effect (which
// the react-hooks/set-state-in-effect rule rejects, correctly).

"use client";

import { useSyncExternalStore } from "react";

export interface Today {
  /** "Good morning" / "Good afternoon" / "Good evening" */
  greeting: string;
}

function build(d: Date): Today {
  const hour = d.getHours();
  return {
    greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
  };
}

// Nothing to subscribe to — the value is fixed for the life of the page.
const subscribe = () => () => {};

/**
 * ⚠️ Computed ONCE per page load, then frozen. `getSnapshot` must return a
 * referentially stable value or React re-renders in a loop, so this deliberately
 * does not recompute per call. The cost is that a tab left open across noon
 * keeps saying "Good morning" — a fair trade, and invisible in practice.
 */
let cached: Today | null = null;
const getSnapshot = (): Today | null => (cached ??= build(new Date()));

/** No user clock during SSR, so the server renders the header with the fallback greeting. */
const getServerSnapshot = (): Today | null => null;

export function useToday(): Today | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
