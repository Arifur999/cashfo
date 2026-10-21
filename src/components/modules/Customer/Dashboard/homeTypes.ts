import type { BudgetCategorySummary, HabitMonthTracker, LoanDashboard, SkillsOverview, Transaction } from "@/lib/customer/api";
import type { CategoryMeta } from "@/lib/customer/transactionRows";

export type { CategoryMeta };

// What the Home page is told by its server page: figures already derived,
// so the client components only draw.

// The parts of Home read on their own: one that fails says so in its own
// card and the rest of Home stays up. Its fields below then hold empties.
export type HomePart = "savings" | "assets" | "budget" | "loans" | "namaz" | "challenges" | "books" | "skills" | "vault";

// A month of the "Income and what you kept" chart, oldest first.
export interface HomeChartPoint {
  // "YYYY-MM"
  month: string;
  // "Oct" and "October" in the reader's language, worked out on the
  // server so the browser prints the same.
  label: string;
  name: string;
  income: number;
  // Income minus expense; below zero when more went out than came in.
  kept: number;
}

export interface HomeData {
  businessId: string;
  firstName: string;
  currency: string;
  // OWNER or ACCOUNTANT: the API lets only them post, so only they see the
  // add buttons.
  canManage: boolean;
  // "YYYY-MM-DD" today in the platform timezone.
  today: string;
  greeting: "Good morning" | "Good afternoon" | "Good evening";
  // "Friday, 2 October" and its Hijri date, for the eyebrow.
  dates: { day: string; hijri: string };
  // "October", and last month as "September" and "Sep".
  monthName: string;
  lastMonthName: string;
  lastMonthShort: string;

  // What the active wallets hold, and how many there are (archived ones
  // left out, as My wallets counts them).
  balance: number;
  walletCount: number;
  // The change since the 1st, as a share of what the wallets held then.
  balanceChangePercent: number | null;
  income: number;
  expense: number;
  savingsRate: number | null;
  lastSavingsRate: number | null;
  // Nothing was recorded before this month (the ring then says so).
  firstMonthOnRecord: boolean;

  chart: HomeChartPoint[];
  recentTransactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;

  // Every savings goal together, as Savings › Goals counts them.
  savingsSaved: number;
  savingsTarget: number;
  savingsProgress: number;
  goalCount: number;

  assetsValue: number;
  assetsGain: number;
  assetCount: number;

  // The budget category closest to (or past) its limit this month.
  budgetFocus: BudgetCategorySummary | null;
  hasBudget: boolean;
  daysLeftInMonth: number;

  // null when Loans is switched off (or couldn't be read: see unavailable).
  loans: LoanDashboard | null;
  loanCounts: { oweYou: number; youOwe: number };

  namaz: HabitMonthTracker | null;
  // Challenges still going today.
  challengesRunning: number;
  reading: { title: string; pagesRead: number; totalPages: number } | null;
  skills: (Pick<SkillsOverview, "streak"> & { practisedToday: boolean; hasSkills: boolean }) | null;

  vault: { hasVaultPassword: boolean; entryCount?: number } | null;

  topIncome: { name: string; percent: number } | null;
  // delta: against the same days of last month; null when that couldn't
  // be read.
  topExpense: { name: string; percent: number; amount: number; delta: number | null } | null;

  // No wallet, or no transaction yet: Home leads with the setup steps.
  setup: { hasWallet: boolean; hasTransaction: boolean } | null;

  // The parts that couldn't be read just now.
  unavailable: HomePart[];
}
