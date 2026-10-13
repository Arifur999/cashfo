import { redirect } from "next/navigation";
import { GroupWorkspaceListPageClient } from "@/components/modules/Customer/GroupExpenses/GroupWorkspaceListPageClient";
import { listWorkspaces } from "@/lib/customer/businesses";
import { getCurrentUser } from "@/lib/customer/auth";

// Not scoped to the "active" workspace at all -- lists every GROUP-type
// Business the user is a member of, straight from GET /api/businesses
// (which already returns every type, unfiltered). See Sidebar.tsx's comment
// on this item for why Group Expense bypasses the single-active-workspace
// system entirely.
export default async function GroupExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groupWorkspaces = (await listWorkspaces()).filter((b) => b.type === "GROUP");

  return <GroupWorkspaceListPageClient workspaces={groupWorkspaces} />;
}
