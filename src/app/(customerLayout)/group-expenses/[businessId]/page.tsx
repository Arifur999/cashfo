import { redirect } from "next/navigation";
import { GroupPageClient } from "@/components/modules/Customer/GroupExpenses/GroupPageClient";
import type { GroupPageData } from "@/components/modules/Customer/GroupExpenses/groupTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { getWorkspace } from "@/lib/customer/businesses";
import { closedRecordFor, groupTabFrom, inMonth, monthChoices, monthKeyFrom, monthRangeOf, shiftMonth } from "@/lib/customer/groupDisplay";
import { getGroupContributions, getGroupExpenseCategories, getGroupExpenses, getGroupMembers, getGroupMonthBudgets, getGroupSettlement, getGroupSettlementHistory } from "@/lib/customer/groupExpenses";
import { getAppToday } from "@/lib/date";

// A group, one month at a time. businessId comes from the URL, not the
// active-workspace cookie: groups open from the list, whatever workspace
// is active.
export default async function GroupWorkspacePage({ params, searchParams }: PageProps<"/group-expenses/[businessId]">) {
  const { businessId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Missing, someone else's, or not a group: back to the list. An outage
  // throws to the error screen instead.
  const business = await getWorkspace(businessId);
  if (!business || business.type !== "GROUP") redirect("/group-expenses");

  const today = getAppToday();
  const range = monthRangeOf(monthKeyFrom(sp.month, today));
  const sixFrom = monthRangeOf(shiftMonth(range.key, -5)).from;

  const [members, contributions, recentExpenses, categories, settlement, history, budgets] = await Promise.all([
    getGroupMembers(businessId),
    getGroupContributions(businessId, { from: range.from, to: range.to }),
    getGroupExpenses(businessId, { from: sixFrom, to: range.to }),
    getGroupExpenseCategories(businessId),
    getGroupSettlement(businessId, range.from, range.to),
    getGroupSettlementHistory(businessId),
    getGroupMonthBudgets(businessId),
  ]);

  // The picker goes back to the earliest closed month, at least a year, and
  // always includes the month in the URL.
  const earliest = [...history.map((h) => h.periodStart.slice(0, 10)), range.from].sort()[0];
  const months = monthChoices(today, earliest);
  if (!months.includes(range.key)) months.push(range.key);

  const data: GroupPageData = {
    businessId,
    name: business.name,
    currency: business.currency,
    today,
    tab: groupTabFrom(sp.tab),
    range,
    months,
    closedRecord: closedRecordFor(history, range),
    members,
    contributions,
    expenses: inMonth(recentExpenses, range),
    recentExpenses,
    categories,
    settlement,
    history,
    budgets,
  };

  return <GroupPageClient data={data} />;
}
