import { redirect, unstable_rethrow } from "next/navigation";
import { readDashboardPeriod, changePercent, spendingSlices } from "@/components/modules/Customer/Dashboard/dashboardFigures";
import { HomeNoWorkspace } from "@/components/modules/Customer/Dashboard/HomeNoWorkspace";
import { HomePageClient } from "@/components/modules/Customer/Dashboard/HomePageClient";
import type { HomeData, HomePart } from "@/components/modules/Customer/Dashboard/homeTypes";
import { getLedger, getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { API_BASE_URL, type CategoryBreakdown, type WalletOverviewRow, type WalletsOverview } from "@/lib/customer/api";
import { customerApi } from "@/lib/customer/apiClient";
import { getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBudgetCategoryNames, getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { isFeatureOn } from "@/lib/customer/features";
import { greetingFor, greetingName, homeDates, hourIn } from "@/lib/customer/greeting";
import { getPrayerSettings } from "@/lib/customer/habits";
import { balanceAsOfTotal, balanceChangePercent, daysLeftInMonth, loanCounts, previousMonthEnd, savingsTotals, windowStart } from "@/lib/customer/homeInsights";
import { monthName, monthRates, rangeLabel } from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getPlatform } from "@/lib/customer/platform";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";
import { getCategoryBreakdown, getMonthlyBreakdown } from "@/lib/customer/reports";
import { getSavingsGoals } from "@/lib/customer/savingsGoals";
import { categoryIndex } from "@/lib/customer/transactionRows";
import { getTransactions, getTransactionsSummary } from "@/lib/customer/transactions";
import { APP_TIME_ZONE, getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/dashboard");

// The chart's months, this one included.
const CHART_MONTHS = 6;
const RECENT_ROWS = 8;
// The goals the Savings card names under its total.
const GOAL_ROWS = 2;
// The categories the Monthly budget card shows.
const BUDGET_ROWS = 3;
// Only for a backend from before wallets-overview?asOf: the hero's trend
// then reads each wallet's ledger, and past this many wallets it is left
// out rather than spend that many calls on one chip.
const MAX_LEDGER_TREND_WALLETS = 8;

type Part<T> = { ok: true; value: T } | { ok: false };

type WalletsAsOf = Omit<WalletsOverview, "accounts"> & { accounts: (WalletOverviewRow & { balanceAsOf?: string | null })[] };

// wallets-overview with ?asOf (a Dhaka day): each wallet also carries what
// it held when that day ended, so the hero's trend costs one call however
// many wallets there are. Any failure is the caller's to fall back from.
async function getWalletsAsOf(businessId: string, asOf: string): Promise<WalletsAsOf> {
  const response = await customerApi.get<WalletsAsOf>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/wallets-overview`, { params: { asOf } });
  return response.data;
}

// A side part's read: what it found, or { ok: false } when it failed (an
// outage, a timeout, the throttle), so that card says it couldn't load and
// the rest stays up. Next's own redirects (maintenance mode, a PIN lock)
// still go through.
async function part<T>(read: () => Promise<T>): Promise<Part<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false };
  }
}

// Money in and out over a stretch of days: every income and expense, from
// the transactions summary; a backend without one gives the categories'
// totals instead.
async function moneyInOut(businessId: string, dateFrom: string, dateTo: string, expenseBreakdown?: Promise<CategoryBreakdown>): Promise<{ income: number; expense: number }> {
  const summary = await getTransactionsSummary(businessId, { transactionTypes: ["INCOME", "EXPENSE"], dateFrom, dateTo });
  if (summary) return { income: Number(summary.totals.INCOME), expense: Number(summary.totals.EXPENSE) };
  const [income, expense] = await Promise.all([getCategoryBreakdown(businessId, "INCOME", dateFrom, dateTo), expenseBreakdown ?? getCategoryBreakdown(businessId, "EXPENSE", dateFrom, dateTo)]);
  return { income: Number(income.total), expense: Number(expense.total) };
}

// The Money Tracker's Dashboard. Everything it shows comes from calls the
// feature pages already make; the figures are derived here, on the server,
// once. The wallets, the period's money and the newest transactions are its
// core: without them it shows the error screen. Every other card is read
// on its own.
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const now = new Date();
  const greeting = greetingFor(hourIn(APP_TIME_ZONE, now));
  const firstName = greetingName(user.name);

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  // No personal or business workspace to open (only groups, or theirs was
  // removed). Every page sends such a customer here, so the Dashboard says
  // what they can do rather than sending them round again.
  if (!activeBusinessId) {
    const prayerSettings = await getPrayerSettings();
    const dates = homeDates(now, locale, APP_TIME_ZONE, prayerSettings.hijriAdjust);
    return <HomeNoWorkspace greeting={greeting} firstName={firstName} day={dates.day} hasGroup={user.businesses.some((b) => b.type === "GROUP")} />;
  }

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const today = getAppToday();
  const { year, month } = appYearMonth();
  const monthStart = `${today.slice(0, 7)}-01`;
  const chartFrom = windowStart(today, CHART_MONTHS);
  const text = (value: unknown) => (typeof value === "string" ? value : undefined);
  const period = readDashboardPeriod({ period: text(params.period), from: text(params.from), to: text(params.to) }, today);
  // The layout has read it already; this is the same answer.
  const loansOn = isFeatureOn((await getPlatform()).flags, "loan_management");

  // The wallets, each also carrying what it held when last month's final
  // day ended (the hero's trend since the 1st), in one call. A backend from
  // before asOf refuses it or leaves balanceAsOf off: the plain overview is
  // read then (it still throws on an outage, to the error screen), and the
  // trend falls back to each wallet's balance brought forward to the 1st.
  const walletsRead: Promise<WalletsAsOf> = getWalletsAsOf(activeBusinessId, previousMonthEnd(today)).catch((error: unknown) => {
    unstable_rethrow(error);
    return getWalletsOverview(activeBusinessId);
  });
  const startRead = part(async () => {
    const active = (await walletsRead).accounts.filter((wallet) => wallet.status !== "ARCHIVED");
    if (active.length === 0) return null;
    const asOfTotal = balanceAsOfTotal(active);
    if (asOfTotal !== null) return asOfTotal;
    if (active.length > MAX_LEDGER_TREND_WALLETS) return null;
    const ledgers = await Promise.all(active.map((wallet) => getLedger(activeBusinessId, wallet.id, { dateFrom: monthStart, limit: 1 })));
    return ledgers.reduce((sum, ledger) => sum + Number(ledger.balanceBroughtForward), 0);
  });
  const spendingRead = getCategoryBreakdown(activeBusinessId, "EXPENSE", period.dateFrom, period.dateTo);

  const [walletsOverview, chartIncome, chartExpense, spending, money, before, recent, start, incomeNames, goals, assets, budget, loanDashboard] = await Promise.all([
    walletsRead,
    // The chart, in two calls: one column per month, this month up to today.
    getMonthlyBreakdown(activeBusinessId, "INCOME", chartFrom, today),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", chartFrom, today),
    spendingRead,
    moneyInOut(activeBusinessId, period.dateFrom, period.dateTo, spendingRead),
    moneyInOut(activeBusinessId, period.compare.dateFrom, period.compare.dateTo),
    getTransactions(activeBusinessId, { limit: RECENT_ROWS }),
    startRead,
    // Income categories' icons for the rows (the budget below brings the
    // expense ones); without them the rows fall back to plain icons.
    part(() => getBudgetCategoryNames(activeBusinessId, "INCOME")),
    part(() => getSavingsGoals(activeBusinessId)),
    part(() => getAssets(activeBusinessId)),
    part(() => getBudgetOverview(activeBusinessId, month, year)),
    loansOn ? part(() => getLoanDashboard(activeBusinessId)) : null,
  ]);

  const unavailable: HomePart[] = [];
  // A part's value, or `empty` (and the part listed as unavailable) when it
  // couldn't be read.
  const read = <T,>(name: HomePart, result: Part<T>, empty: T): T => {
    if (result.ok) return result.value;
    unavailable.push(name);
    return empty;
  };

  const activeWallets = walletsOverview.accounts.filter((wallet) => wallet.status !== "ARCHIVED");
  const balance = Number(walletsOverview.availableBalance);
  const goalList = read("savings", goals, []);
  const savings = savingsTotals(goalList);
  const assetList = read("assets", assets, []).filter((a) => a.status === "ACTIVE");
  const budgetOverview = read("budget", budget, null);
  // Every expense category, with its limit and what went against it.
  const expenseCategories = budgetOverview?.categories ?? [];
  const limited = expenseCategories.filter((c) => c.monthlyLimit !== null && Number(c.monthlyLimit) > 0);
  const hasBudget = limited.length > 0 || Number(budgetOverview?.totalBudget ?? 0) > 0;
  const loans = loanDashboard ? read("loans", loanDashboard, null) : null;
  const counts = loanCounts(loans?.rows ?? []);
  const incomeCategories = incomeNames.ok ? incomeNames.value : [];
  const hasWallet = walletsOverview.totalAccounts > 0;
  const hasTransaction = recent.data.length > 0;
  const lastMonthKey = previousMonthEnd(today).slice(0, 7);

  const periodLabel =
    period.key === "this-year"
      ? toLocaleDigits(String(year), locale)
      : period.key === "custom"
        ? rangeLabel(period.dateFrom, period.dateTo, locale)
        : monthName(period.dateFrom.slice(0, 7), locale, "long", true);

  const data: HomeData = {
    businessId: activeBusinessId,
    currency,
    canManage,
    today,
    greeting,
    firstName,
    profile: {
      name: user.name,
      avatarUrl: user.avatarUrl,
      since: user.createdAt ? monthName(user.createdAt.slice(0, 7), locale, "short", true) : null,
    },
    period: { key: period.key, dateFrom: period.dateFrom, dateTo: period.dateTo, label: periodLabel },
    lastMonthShort: monthName(lastMonthKey, locale, "short"),
    balance,
    balanceChangePercent: balanceChangePercent(balance, start.ok ? start.value : null),
    income: money.income,
    expense: money.expense,
    incomeChange: changePercent(money.income, before.income),
    expenseChange: changePercent(money.expense, before.expense),
    chart: monthRates(chartIncome, chartExpense).map((rate) => ({
      month: rate.month,
      label: monthName(rate.month, locale, "short"),
      name: monthName(rate.month, locale, "long", true),
      income: rate.income,
      expense: rate.expense,
    })),
    spending: { total: Number(spending.total), slices: spendingSlices(spending) },
    recentTransactions: recent.data,
    categoriesById: categoryIndex([...incomeCategories, ...expenseCategories]),
    wallets: activeWallets.map((wallet) => ({ id: wallet.id, name: locale === "bn" && wallet.nameBn ? wallet.nameBn : wallet.name, subtype: wallet.accountSubtype, balance: Number(wallet.currentBalance) })),
    budget: budgetOverview
      ? {
          lines: [...limited]
            .sort((a, b) => b.percent - a.percent)
            .slice(0, BUDGET_ROWS)
            .map((c) => ({ name: c.name, spent: Number(c.spent), limit: Number(c.monthlyLimit), percent: c.percent })),
          monthName: monthName(today.slice(0, 7), locale),
          daysLeft: daysLeftInMonth(today),
          hasBudget,
        }
      : null,
    savings: {
      ...savings,
      // The goals still being saved for, furthest along first.
      goals: goalList
        .filter((goal) => goal.status === "ACTIVE" || goal.status === "PAUSED")
        .sort((a, b) => b.progressPercent - a.progressPercent)
        .slice(0, GOAL_ROWS)
        .map((goal) => ({ id: goal.id, name: goal.name, saved: Number(goal.currentAmount), target: Number(goal.targetAmount), percent: goal.progressPercent })),
    },
    loans: loansOn ? { pawna: Math.abs(Number(loans?.totalPawna ?? 0)), dena: Math.abs(Number(loans?.totalDena ?? 0)), ...counts } : null,
    assets: { value: assetList.reduce((sum, a) => sum + Number(a.currentValue), 0), count: assetList.length },
    setup: hasWallet && hasTransaction ? null : { hasWallet, hasTransaction, hasBudget, hasGoal: savings.count > 0 },
    unavailable,
  };

  return <HomePageClient data={data} />;
}
