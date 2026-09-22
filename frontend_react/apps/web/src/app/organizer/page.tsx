// ─────────────────────────────────────────────────────────────────────────────
//  /organizer — a redirect, not a page.
//
//  The console's Dashboard section was folded into Events on 2026-09-07
//  (Gautham): the two carried the same table, and the overview band — the ink
//  "next up" hero, the "needs you today" column and the five portfolio tiles —
//  now sits at the top of /organizer/events. Nothing was left here to render.
//
//  ⚠️ THIS FILE IS DELIBERATELY OUTSIDE THE (console) GROUP. Inside it, the
//  console shell would mount its auth guard and fire the organiser queries only
//  to throw them away one line later. Out here the redirect is the whole
//  response. It also means `app/organizer/(console)/page.tsx` must NOT come
//  back — two files resolving to /organizer is a build error, not a warning.
//
//  It stays a redirect rather than a deletion because /organizer is a URL people
//  already hold: the footer's "Organizer Console", the navbar's organiser menu,
//  the FeatureBand link, and anything bookmarked before today. Those in-app
//  links now point straight at /organizer/events; this catches the rest.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

export default function OrganizerConsoleRedirect() {
  redirect("/organizer/events");
}
