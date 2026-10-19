import { redirect } from "next/navigation";
import { GroupListPageClient } from "@/components/modules/Customer/GroupExpenses/GroupListPageClient";
import type { GroupCardData } from "@/components/modules/Customer/GroupExpenses/groupTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { listWorkspaces } from "@/lib/customer/businesses";
import { budgetFor, closedRecordFor, monthKeyFrom, monthRangeOf } from "@/lib/customer/groupDisplay";
import { getGroupMembers, getGroupMonthBudgets, getGroupSettings, getGroupSettlement, getGroupSettlementHistory } from "@/lib/customer/groupExpenses";
import { getAppToday } from "@/lib/date";

// Not scoped to the active workspace: every GROUP-type workspace the
// person is a member of, each with this month's figures (one settlement
// call per group).
export default async function GroupExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  // The calendar month the list is about; each group reads its own month.
  const range = monthRangeOf(today.slice(0, 7));
  const workspaces = (await listWorkspaces()).filter((b) => b.type === "GROUP");

  const groups: GroupCardData[] = await Promise.all(
    workspaces.map(async (workspace) => {
      // Each group's month starts on its own day.
      const settings = await getGroupSettings(workspace.id);
      const own = monthRangeOf(monthKeyFrom(undefined, today, settings.monthStartDay), settings.monthStartDay);
      const [members, settlement, history, budgets] = await Promise.all([
        getGroupMembers(workspace.id),
        getGroupSettlement(workspace.id, own.from, own.to),
        getGroupSettlementHistory(workspace.id),
        getGroupMonthBudgets(workspace.id),
      ]);
      return { workspace, members, settlement, settings, budget: budgetFor(budgets, own), closed: closedRecordFor(history, own) !== null };
    }),
  );

  return <GroupListPageClient groups={groups} monthKey={range.key} monthEnded={today > range.to} />;
}
