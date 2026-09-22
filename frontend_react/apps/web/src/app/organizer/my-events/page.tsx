// ─────────────────────────────────────────────────────────────────────────────
//  /organizer/my-events — a redirect, not a page.
//
//  This page's table (Event / City / Date / Type / Status) duplicated the
//  console's own Events section at /organizer/events, which already carries
//  drafts alongside published events, search, and everything else this page
//  lacked. Removed 2026-09-11 (Gautham) rather than kept as a second, thinner
//  view of the same list.
//
//  It stays a redirect rather than a deletion because /organizer/my-events is
//  a URL people already hold: the navbar's "My Organised Events" item used to
//  point here (it now points straight at /organizer/events), and anything
//  bookmarked before today. This catches the rest.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

export default function MyOrganisedEventsRedirect() {
  redirect("/organizer/events");
}
