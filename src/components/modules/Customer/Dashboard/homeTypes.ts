import type { Transaction } from "@/lib/customer/api";
import type { CategoryMeta } from "@/lib/customer/transactionRows";
import type { DashboardPeriodKey, SpendingSlice } from "./dashboardFigures";

export type { CategoryMeta, SpendingSlice };

// What the Dashboard is told by its server page: figures already derived,
// so the client components only draw.

// The parts of the Dashboard read on their own: one that fails says so in
// its own card and the rest stays up. Its fields below then hold empties.
export type HomePart = "savings" | "assets" | "budget" | "loans";

// A month of the Income vs Expense chart, oldest first.
export interface HomeChartPoint {
  // "YYYY-MM"
  month: string;
  // "Oct", and "October 2026" for the tooltip, in the reader's language,
  // worked out on the server so the browser prints the same.
  label: string;
  name: string;
  income: number;
  expense: number;
}

export interface HomeWallet {
  id: string;
  name: string;
  // cash / bank / mfs
  subtype: string | null;
  balance: number;
}

// A spending category with a limit this month.
export interface HomeBudgetLine {
  // A category's name, or app words (the month's whole budget) to translate.
  name: string;
  translate?: boolean;
  spent: number;
  limit: number;
  percent: number;
}

export interface HomeGoal {
  id: string;
  name: string;
  saved: number;
  target: number;
  percent: number;
}

export interface HomeData {
  businessId: string;
  currency: string;
  // OWNER or ACCOUNTANT: the API lets only them post, so only they see the
  // add buttons and Void.
  canManage: boolean;
  // "YYYY-MM-DD" today in the platform timezone.
  today: string;
  greeting: "Good morning" | "Good afternoon" | "Good evening";
  firstName: string;

  // The profile card: the photo and the
  // month the account was opened ("Jan 2025"; null when the API doesn't say).
  profile: { name: string; avatarUrl: string | null; since: string | null };

  // The period the figures cover, and how it reads ("October 2026").
  period: { key: DashboardPeriodKey; dateFrom: string; dateTo: string; label: string };
  // Last month's short name ("Sep"), for the phone's "vs Sep".
  lastMonthShort: string;

  // What the active wallets hold now, and its change since the 1st.
  balance: number;
  balanceChangePercent: number | null;
  // The period's money in and out, and their change against the stretch
  // the period is compared with (null with nothing there).
  income: number;
  expense: number;
  incomeChange: number | null;
  expenseChange: number | null;

  chart: HomeChartPoint[];
  // This period's spending by category.
  spending: { total: number; slices: SpendingSlice[] };

  recentTransactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;

  // The active wallets, as My wallets lists them.
  wallets: HomeWallet[];

  // This month's limited categories, closest to their limit first (null:
  // the budget couldn't be read).
  budget: { lines: HomeBudgetLine[]; monthName: string; daysLeft: number; hasBudget: boolean } | null;

  savings: { saved: number; target: number; progress: number; count: number; goals: HomeGoal[] };

  // null when Loans is switched off.
  loans: { pawna: number; dena: number; oweYou: number; youOwe: number } | null;
  assets: { value: number; count: number };

  // A new account (no wallet, or no transaction yet): the Dashboard leads
  // with the four setup steps.
  setup: { hasWallet: boolean; hasTransaction: boolean; hasBudget: boolean; hasGoal: boolean } | null;

  // The parts that couldn't be read just now.
  unavailable: HomePart[];
}
