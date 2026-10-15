import type { GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupMonthlyBudget, GroupSettlementRecord, GroupSettlementResult, WorkspaceListItem } from "@/lib/customer/api";
import type { BudgetStatus, CategorySpend, GroupTab, MonthRange, Transfer } from "@/lib/customer/groupDisplay";

// What the groups list knows about each group: the workspace, its
// members, and this month's settlement and budget, so a card can show the
// month's figures without opening the group.
export interface GroupCardData {
  workspace: WorkspaceListItem;
  members: GroupMember[];
  settlement: GroupSettlementResult;
  budget: GroupMonthlyBudget | null;
  closed: boolean;
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
  // Nothing recorded yet: the dashboard shows the first steps instead.
  setup: boolean;
}
