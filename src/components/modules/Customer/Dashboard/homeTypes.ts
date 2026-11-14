import type { ActiveMonth, Transaction } from "@/lib/customer/api";
import type { SocialEventType } from "@/lib/customer/eventsTypes";
import type { PickedPeriod } from "@/lib/customer/period";
import type { CategoryMeta } from "@/lib/customer/transactionRows";
import type { DashboardPeriodKey, SpendingSlice } from "./dashboardFigures";
import type { MoneyFlow, WorthParts } from "./dashboardWorth";

export type { CategoryMeta, SpendingSlice };

// What the Dashboard is told by its server page: figures already derived,
// so the client components only draw.

// The parts of the Dashboard read on their own: one that fails says so in
// its own card and the rest stays up. Its fields below then hold empties.
export type HomePart = "savings" | "assets" | "investments" | "budget" | "loans";

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
  // The account card colour (balanceDisplay accountColor), for its tile.
  color: string;
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
  // Today in the Hijri calendar ("21 Rabiʻ II 1448"), for a reader who
  // asked for it beside dates (Settings › App preferences).
  hijri?: string | null;
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
  // key: the phone chips' period; picked: the desktop period picker's.
  period: { key: DashboardPeriodKey; picked: PickedPeriod; dateFrom: string; dateTo: string; label: string; isMonth: boolean };
  // The months with any income or expense, for the picker.
  activeMonths: ActiveMonth[] | null;
  // The month before a month on show (the cards' "vs September"), else null.
  compare: { label: string; income: number; expense: number } | null;
  // A month's income target and spending budget (Budget Planning), null
  // when none is set or the period isn't a month.
  targets: { income: number | null; budget: number | null };
  // Net worth today: its parts, how far it moved since last month ended,
  // and how many accounts, goals, assets and people make it up.
  worth: { parts: WorthParts; change: number | null; since: string; counts: { accounts: number; goals: number; assets: number; investments: number; pawna: number; dena: number } };
  // Where the period's money went; null when it couldn't be read.
  flow: MoneyFlow | null;
  // The next invitations and own events; null when they can't be shown.
  events: { id: string; title: string; date: string; time: string | null; place: string | null; type: SocialEventType }[] | null;
  biggestSpend: { name: string; amount: number } | null;
  // color: the goal's card colour (its own, else its place in the list's).
  goalRows: { id: string; name: string; saved: number; target: number; paused: boolean; color: string }[];
  loanPeople: { id: string; name: string; balance: number }[];
  assetRows: { id: string; name: string; category: string; value: number; cost: number }[];
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
