import { redirect } from "next/navigation";

// PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2 and must not be
// visible to users anywhere. This route used to send browsers to the Explore
// page's communities view; that view no longer exists, so it lands on home.
//
// PHASE 2 RESTORE: change the target back to "/explore?view=communities".
export default function CommunitiesPage() {
  redirect("/");
}
