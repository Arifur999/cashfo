import { redirect } from "next/navigation";
import { GroupPageClient } from "@/components/modules/Customer/GroupExpenses/GroupPageClient";
import type { GroupPageData } from "@/components/modules/Customer/GroupExpenses/groupTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { getWorkspace } from "@/lib/customer/businesses";
import { closedRecordFor, groupPickerMonths, groupTabFrom, inMonth, isNewGroup, monthKeyFrom, monthRangeOf, shiftMonth } from "@/lib/customer/groupDisplay";
import { getGroupContributions, getGroupExpenseCategories, getGroupExpenses, getGroupMeals, getGroupMembers, getGroupMonthBudgets, getGroupSettings, getGroupSettlement, getGroupSettlementHistory } from "@/lib/customer/groupExpenses";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params, searchParams }: PageProps<"/group-expenses/[businessId]">) {
  const [{ businessId }, query] = await Promise.all([params, searchParams]);
  return customerPageMetadata(`/group-expenses/${businessId}`, { query });
}

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
  // The group's month starts on its own day (the 1st unless set).
  const settings = await getGroupSettings(businessId);
  const startDay = settings.monthStartDay;
  const range = monthRangeOf(monthKeyFrom(sp.month, today, startDay), startDay);
  const sixFrom = monthRangeOf(shiftMonth(range.key, -5), startDay).from;

  const [members, contributions, recentExpenses, categories, settlement, history, budgets, meals] = await Promise.all([
    getGroupMembers(businessId),
    getGroupContributions(businessId, { from: range.from, to: range.to }),
    getGroupExpenses(businessId, { from: sixFrom, to: range.to }),
    getGroupExpenseCategories(businessId),
    getGroupSettlement(businessId, range.from, range.to),
    getGroupSettlementHistory(businessId),
    getGroupMonthBudgets(businessId),
    getGroupMeals(businessId, range.from, range.to),
  ]);

  const data: GroupPageData = {
    businessId,
    name: business.name,
    currency: business.currency,
    today,
    tab: groupTabFrom(sp.tab),
    range,
    // A year back at least, so a group that never closed a month can still
    // open the months before this one.
    months: groupPickerMonths(today, history, range, startDay),
    closedRecord: closedRecordFor(history, range),
    // Only a group that never recorded anything is new: an empty month in
    // a running group keeps its dashboard.
    isNew: isNewGroup({ history, recentExpenses, contributions, meals }),
    members,
    contributions,
    expenses: inMonth(recentExpenses, range),
    recentExpenses,
    categories,
    settlement,
    history,
    budgets,
    settings,
    meals,
  };

  return <GroupPageClient data={data} />;
}
