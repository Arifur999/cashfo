import { redirect } from "next/navigation";
import { ChooseWorkspaceClient } from "@/components/workspace/ChooseWorkspaceClient";
import { getCurrentUser } from "@/lib/auth";

// Deliberately a plain top-level route -- NOT under (auth) or (dashboard), so
// it renders with neither the dashboard's sidebar/topbar chrome nor the auth
// pages' centered-card layout (neither route group has a layout.tsx that
// would otherwise wrap a sibling route). proxy.ts treats this like any other
// protected route (it's not in PUBLIC_PATHS), so an unauthenticated request
// never reaches here in practice -- the redirect below is defense-in-depth
// for the Server Component tree, same reasoning as (dashboard)/layout.tsx's
// own getCurrentUser() check.
//
// A user with only one workspace should notice no change at all from the old
// straight-to-/dashboard behavior -- that's the <= 1 bounce below. More than
// one workspace (their "Personal" one, shown under their own name, plus any
// Business ones) gets the full-page picker every time they log in.
export default async function ChooseWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.businesses.length <= 1) redirect("/dashboard");

  return <ChooseWorkspaceClient user={user} />;
}
