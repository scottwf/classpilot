import { redirect } from "next/navigation";

// Class management moved into Settings (see app/settings/page.tsx) —
// redirect any stray links/bookmarks instead of leaving a duplicate page.
export default function ClassesRoute() {
  redirect("/settings");
}
