import { redirect } from "next/navigation";
import { GroupListPageClient } from "@/components/modules/Customer/GroupExpenses/GroupListPageClient";
import type { GroupCardData } from "@/components/modules/Customer/GroupExpenses/groupTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { listWorkspaces } from "@/lib/customer/businesses";
import { budgetFor, closedRecordFor, monthRangeOf } from "@/lib/customer/groupDisplay";
import { getGroupMembers, getGroupMonthBudgets, getGroupSettlement, getGroupSettlementHistory } from "@/lib/customer/groupExpenses";
import { getAppToday } from "@/lib/date";

// Not scoped to the active workspace: every GROUP-type workspace the
// person is a member of, each with this month's figures (one settlement
// call per group).
export default async function GroupExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  const range = monthRangeOf(today.slice(0, 7));
  const workspaces = (await listWorkspaces()).filter((b) => b.type === "GROUP");

  const groups: GroupCardData[] = await Promise.all(
    workspaces.map(async (workspace) => {
      const [members, settlement, history, budgets] = await Promise.all([
        getGroupMembers(workspace.id),
        getGroupSettlement(workspace.id, range.from, range.to),
        getGroupSettlementHistory(workspace.id),
        getGroupMonthBudgets(workspace.id),
      ]);
      return { workspace, members, settlement, budget: budgetFor(budgets, range), closed: closedRecordFor(history, range) !== null };
    }),
  );

  return <GroupListPageClient groups={groups} monthKey={range.key} monthEnded={today > range.to} />;
}
