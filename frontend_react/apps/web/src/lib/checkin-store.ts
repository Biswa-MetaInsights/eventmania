// Who has walked in — the door state behind the Attendees page's check-in
// controls.
//
// ⚠️ THIS IS THE BROWSER'S MEMORY, NOT THE TICKETING SERVICE'S. There is no
// check-in endpoint (TODO.md §19.3), so a check-in lives in localStorage under
// `eventmind-checkins` — attendee id → the ISO time they were checked in. It
// survives a reload and a trip to another section, which is the least a door
// control can do, but it is one device's record: a second phone at the same
// door sees nothing. When §19.3 lands, `setCheckedIn` posts and this file goes.
//
// ⚠️ NEVER SEEDED. It only ever holds ids the organiser clicked, so in real
// data mode — where the attendee list is empty — it holds nothing, and it can
// never invent an arrival for a real event. That is the line `data-source.ts`
// draws for every console figure, and this store stays on the right side of it.
//
// `useSyncExternalStore` rather than a state + effect pair: the server snapshot
// is the empty map, so hydration matches, and there is no
// `set-state-in-effect` for the lint to flag.

import { useSyncExternalStore } from "react";

const KEY = "eventmind-checkins";

/** attendee id → ISO timestamp of the check-in */
export type CheckIns = Readonly<Record<string, string>>;

const EMPTY: CheckIns = {};
let cache: CheckIns | null = null;
const listeners = new Set<() => void>();

function read(): CheckIns {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === "object" ? (parsed as CheckIns) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The live map. Re-renders the caller whenever any check-in changes. */
export function useCheckIns(): CheckIns {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function setCheckedIn(attendeeId: string, on: boolean) {
  const next: Record<string, string> = { ...read() };
  if (on) next[attendeeId] = new Date().toISOString();
  else delete next[attendeeId];
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: the in-memory copy still drives this page.
  }
  listeners.forEach((l) => l());
}
