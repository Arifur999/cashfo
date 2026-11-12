import { redirect } from "next/navigation";
import { GroupPageClient } from "@/components/modules/Customer/GroupExpenses/GroupPageClient";
import type { GroupPageData } from "@/components/modules/Customer/GroupExpenses/groupTypes";
import type { GroupActivityAction } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { getWorkspace, listWorkspaces } from "@/lib/customer/businesses";
import { closedRecordFor, groupMonthOf, groupPickerMonths, groupTabFrom, type GroupTab, inMonth, isNewGroup, monthKeyFrom, monthRangeOf, shiftMonth } from "@/lib/customer/groupDisplay";
import {
  getGroupActivity,
  getGroupCashbook,
  getGroupContributions,
  getGroupExpenseCategories,
  getGroupExpenses,
  getGroupMeals,
  getGroupMembers,
  getGroupMonthBudgets,
  getGroupMonthTotals,
  getGroupSettings,
  getGroupSettlement,
  getGroupSettlementHistory,
} from "@/lib/customer/groupExpenses";
import { type GroupPeriod, type GroupPeriodKind, groupPeriodFrom, periodRange } from "@/lib/customer/groupPeriod";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params, searchParams }: PageProps<"/group-expenses/[businessId]">) {
  const [{ businessId }, query] = await Promise.all([params, searchParams]);
  return customerPageMetadata(`/group-expenses/${businessId}`, { query });
}

// Each page's own period choices (the v7 boards' dropdowns), and its default.
const PERIODS: Partial<Record<GroupTab, { options: readonly GroupPeriodKind[]; fallback: GroupPeriod }>> = {
  expenses: { options: ["today", "week", "month", "year", "custom"], fallback: { kind: "month" } },
  cashbook: { options: ["month", "year", "all", "custom"], fallback: { kind: "month" } },
  categories: { options: ["month", "year", "custom"], fallback: { kind: "month" } },
};

// All time: from long before any group's first record.
const EVER = "2000-01-01";

const ACTIVITY_ACTIONS: readonly GroupActivityAction[] = ["ADDED", "EDITED", "DELETED"];

// A group, one page at a time. businessId comes from the URL, not the
// active-workspace cookie: groups open from the list, whatever workspace
// is active. Every page has the group month on show (?month=, this one by
// default) for its live balances; the pages with a period dropdown also
// load what their period covers.
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
  const tab = groupTabFrom(sp.tab);
  // The group's month starts on its own day (the 1st unless set).
  const settings = await getGroupSettings(businessId);
  const startDay = settings.monthStartDay;
  const range = monthRangeOf(monthKeyFrom(sp.month, today, startDay), startDay);
  const sixFrom = monthRangeOf(shiftMonth(range.key, -5), startDay).from;
  const choice = PERIODS[tab];
  const period = choice ? groupPeriodFrom(sp, choice.options, choice.fallback) : null;
  const span = period ? periodRange(period, today, startDay, EVER) : null;
  const activityAction = typeof sp.action === "string" && (ACTIVITY_ACTIONS as readonly string[]).includes(sp.action) ? (sp.action as GroupActivityAction) : undefined;
  const activityPage = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const accountantId = typeof sp.accountant === "string" && sp.accountant ? sp.accountant : undefined;

  const [members, contributions, recentExpenses, categories, settlement, history, budgets, meals, workspaces, monthTotals] = await Promise.all([
    getGroupMembers(businessId),
    getGroupContributions(businessId, { from: range.from, to: range.to }),
    getGroupExpenses(businessId, { from: sixFrom, to: range.to }),
    getGroupExpenseCategories(businessId),
    getGroupSettlement(businessId, range.from, range.to),
    getGroupSettlementHistory(businessId),
    getGroupMonthBudgets(businessId),
    getGroupMeals(businessId, range.from, range.to),
    listWorkspaces(),
    getGroupMonthTotals(businessId),
  ]);

  // What the page on show needs beyond the month.
  const [periodExpenses, periodContributions, periodSettlement, allExpenses, cashbook, activity] = await Promise.all([
    span && (tab === "dashboard" || tab === "expenses" || tab === "categories" || tab === "contributions") ? getGroupExpenses(businessId, span) : null,
    span && tab === "contributions" ? getGroupContributions(businessId, span) : null,
    span && tab === "dashboard" ? getGroupSettlement(businessId, span.from, span.to) : null,
    tab === "budget" ? getGroupExpenses(businessId, { from: EVER, to: monthRangeOf(shiftMonth(groupMonthOf(today, startDay), 1), startDay).to }) : null,
    span && tab === "cashbook" ? getGroupCashbook(businessId, accountantId, span.from, span.to) : null,
    tab === "activity" ? getGroupActivity(businessId, activityAction, activityPage) : null,
  ]);

  const data: GroupPageData = {
    businessId,
    name: business.name,
    currency: business.currency,
    // The list names the customer's role; a group they reached is theirs to use.
    role: workspaces.find((workspace) => workspace.id === businessId)?.role ?? "OWNER",
    groups: workspaces.filter((workspace) => workspace.type === "GROUP").map(({ id, name }) => ({ id, name })),
    today,
    tab,
    startDay,
    range,
    period,
    periodRange: span,
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
    periodExpenses,
    periodContributions,
    periodSettlement,
    allExpenses,
    cashbook,
    cashbookAccountant: accountantId ?? null,
    activity,
    activityAction: activityAction ?? null,
    monthTotals: Object.fromEntries(monthTotals.map((row) => [row.month, Number(row.spent)])),
  };

  return <GroupPageClient data={data} />;
}
