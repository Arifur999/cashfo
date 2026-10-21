import type { GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMeal, GroupMember, GroupMonthlyBudget, GroupSettings, GroupSettlementRecord, GroupSettlementResult, WorkspaceListItem } from "@/lib/customer/api";
import type { BudgetStatus, CategorySpend, GroupTab, MonthRange, Transfer } from "@/lib/customer/groupDisplay";

// What the groups list knows about each group: the workspace, its
// members, and its own month's settlement and budget (a group's month can
// start after the 1st), so a card can show the month's figures without
// opening the group.
export interface GroupCardData {
  workspace: WorkspaceListItem;
  members: GroupMember[];
  // The group month on show: today's, by the group's start day.
  range: MonthRange;
  settlement: GroupSettlementResult;
  settings: GroupSettings;
  budget: GroupMonthlyBudget | null;
  closed: boolean;
  // Last month, when it was never closed though something was recorded in
  // it: the card asks for it to be closed.
  openMonth: MonthRange | null;
}

// What a group's page is told by its server page: the month being viewed
// and everything recorded in it, plus the members, categories, budgets and
// closed months.
export interface GroupPageData {
  businessId: string;
  name: string;
  currency: string;
  today: string;
  tab: GroupTab;
  range: MonthRange;
  // The months the picker offers, newest first.
  months: string[];
  closedRecord: GroupSettlementRecord | null;
  // Nothing was ever recorded: the dashboard shows the first steps.
  isNew: boolean;
  members: GroupMember[];
  // This month's entries.
  contributions: GroupContribution[];
  expenses: GroupExpense[];
  // The last six months' expenses, for the trend.
  recentExpenses: GroupExpense[];
  categories: GroupExpenseCategoryOption[];
  settlement: GroupSettlementResult;
  history: GroupSettlementRecord[];
  budgets: GroupMonthlyBudget[];
  settings: GroupSettings;
  // This month's meals.
  meals: GroupMeal[];
}

// Figures every tab reads, derived once by the page client.
export interface GroupView {
  activeMembers: GroupMember[];
  memberById: Record<string, GroupMember>;
  balances: Record<string, number>;
  cash: number;
  transfers: Transfer[];
  budget: BudgetStatus | null;
  byCategory: CategorySpend[];
  byMonth: { month: string; amount: number }[];
  closed: boolean;
  // A brand-new group: the dashboard shows the first steps instead.
  setup: boolean;
  // An established group with nothing in the month on show yet.
  empty: boolean;
  // By-meals costs go into a meal rate (meal counting on, meals marked).
  mealsPooled: boolean;
  // Every cost outside the meal pool is shared equally by everyone, all
  // month long: only then is "shared cost each" one figure for all.
  sharedEqually: boolean;
}

// Entries on a day inside a closed month leave its record as it is, so a
// drawer asks before saving one there (once, while it stays open).
export interface ClosedGuard {
  isClosed: (day: string) => boolean;
  // Resolves true to go ahead (at once for an open day).
  ask: (day: string) => Promise<boolean>;
}
