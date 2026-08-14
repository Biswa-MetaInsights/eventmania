// ⚠️ PARKED 2026-08-14 (MVP) — THIS WHOLE FILE IS THE PARK.
//
// Communities are deferred to Phase 2 and must not be visible to users
// anywhere. This layout is the single choke point for every route under
// /community/* — the detail page, the create page, and anything added later.
// It is a server component, so it runs before the (client) pages beneath it and
// they never render. That is why none of those pages needed editing: they sit on
// disk complete and still type-checked, ready for Phase 2.
//
// Covered by this one file:
//   /community/create        → home
//   /community/<slug>        → home
//   /community               → 404 (no page.tsx at this level; nothing to show)
//
// NOT covered — a route handler and a metadata route are separate route entries
// that a layout never wraps, so they are parked in their own files:
//   /community/<slug>/opengraph-image
//   /community/<slug>/story
//
// PHASE 2 RESTORE: delete this file. Nothing else in here depends on it.
import { redirect } from "next/navigation";

// Takes no props on purpose: it never renders its children, and naming an unused
// `children` param only earns a lint warning. A zero-arg component is still a
// valid layout.
export default function ParkedCommunitySegment() {
  redirect("/");
}
