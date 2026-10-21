import { redirect } from "next/navigation";
import { GroupListPageClient } from "@/components/modules/Customer/GroupExpenses/GroupListPageClient";
import type { GroupCardData } from "@/components/modules/Customer/GroupExpenses/groupTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { listWorkspaces } from "@/lib/customer/businesses";
import { budgetFor, closedRecordFor, hasActivity, monthKeyFrom, monthRangeOf, unclosedPreviousMonth } from "@/lib/customer/groupDisplay";
import { getGroupMembers, getGroupMonthBudgets, getGroupSettings, getGroupSettlement, getGroupSettlementHistory } from "@/lib/customer/groupExpenses";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/group-expenses");

// Not scoped to the active workspace: every GROUP-type workspace the
// person is a member of, each with its own month's figures (one settlement
// call per group, and one more for a last month left open).
export default async function GroupExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  const workspaces = (await listWorkspaces()).filter((b) => b.type === "GROUP");

  const groups: GroupCardData[] = await Promise.all(
    workspaces.map(async (workspace) => {
      // Each group's month starts on its own day, so each card names its own.
      const settings = await getGroupSettings(workspace.id);
      const range = monthRangeOf(monthKeyFrom(undefined, today, settings.monthStartDay), settings.monthStartDay);
      const [members, settlement, history, budgets] = await Promise.all([
        getGroupMembers(workspace.id),
        getGroupSettlement(workspace.id, range.from, range.to),
        getGroupSettlementHistory(workspace.id),
        getGroupMonthBudgets(workspace.id),
      ]);
      // Last month never closed: worth a reminder only when something was
      // recorded in it.
      const previous = unclosedPreviousMonth(history, members, range);
      const openMonth = previous && hasActivity(await getGroupSettlement(workspace.id, previous.from, previous.to)) ? previous : null;
      return { workspace, members, range, settlement, settings, budget: budgetFor(budgets, range), closed: closedRecordFor(history, range) !== null, openMonth };
    }),
  );

  return <GroupListPageClient groups={groups} />;
}
