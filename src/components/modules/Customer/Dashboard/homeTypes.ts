import type { BudgetCategorySummary, HabitMonthTracker, IncomeVsSavingsPoint, LoanDashboard, SkillsOverview, Transaction } from "@/lib/customer/api";
import type { CategoryMeta } from "@/lib/customer/transactionRows";

export type { CategoryMeta };

// What the Home page is told by its server page: figures already derived,
// so the client components only draw.

export interface HomeData {
  businessId: string;
  firstName: string;
  currency: string;
  // "YYYY-MM-DD" today in the platform timezone.
  today: string;
  greeting: "Good morning" | "Good afternoon" | "Good evening";
  dateLine: string;
  monthName: string;
  lastMonthName: string;

  balance: number;
  walletCount: number;
  // This month's net flow as a share of the starting balance.
  balanceChangePercent: number | null;
  income: number;
  expense: number;
  savingsRate: number | null;
  lastSavingsRate: number | null;

  trend: IncomeVsSavingsPoint[];
  recentTransactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;

  savingsSaved: number;
  savingsTarget: number;
  savingsProgress: number;
  goalCount: number;

  assetsValue: number;
  assetsGain: number;
  assetCount: number;

  // The budget category closest to (or past) its limit this month.
  budgetFocus: BudgetCategorySummary | null;
  daysLeftInMonth: number;

  loans: LoanDashboard | null;
  loanCounts: { oweYou: number; youOwe: number };

  namaz: HabitMonthTracker | null;
  dailyChallenges: number;
  reading: { title: string; pagesRead: number; totalPages: number } | null;
  readingCount: number;
  skills: Pick<SkillsOverview, "streak"> & { practisedToday: boolean } | null;

  vault: { hasVaultPassword: boolean } | null;

  topIncome: { name: string; percent: number } | null;
  topExpense: { name: string; percent: number; amount: number; delta: number } | null;

  // No wallet, or no transaction yet: Home shows the setup steps instead.
  setup: { hasWallet: boolean; hasTransaction: boolean } | null;
}
