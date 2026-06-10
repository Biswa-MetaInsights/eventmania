import { redirect } from "next/navigation";

// Communities browsing now lives on the unified Explore page. Keep this route as a
// permanent redirect so old links / bookmarks still land in the right place.
export default function CommunitiesPage() {
  redirect("/explore?view=communities");
}
