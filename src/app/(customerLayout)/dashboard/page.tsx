import { redirect, unstable_rethrow } from "next/navigation";
import { HomeNoWorkspace } from "@/components/modules/Customer/Dashboard/HomeNoWorkspace";
import { HomePageClient } from "@/components/modules/Customer/Dashboard/HomePageClient";
import type { HomeData, HomePart } from "@/components/modules/Customer/Dashboard/homeTypes";
import { getLedger, getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { API_BASE_URL, type WalletOverviewRow, type WalletsOverview } from "@/lib/customer/api";
import { customerApi } from "@/lib/customer/apiClient";
import { getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview } from "@/lib/customer/books";
import { getBudgetCategoryNames, getBudgetOverview } from "@/lib/customer/budgets";
import { challengeWindow } from "@/lib/customer/challengeDisplay";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { isFeatureOn } from "@/lib/customer/features";
import { greetingFor, greetingName, homeDates, hourIn } from "@/lib/customer/greeting";
import { getHabitTrackers, getPrayerSettings } from "@/lib/customer/habits";
import {
  balanceAsOfTotal,
  balanceChangePercent,
  categoryDelta,
  daysLeftInMonth,
  isFirstMonthOnRecord,
  loanCounts,
  monthColumn,
  previousMonthEnd,
  sameDaysLastMonth,
  savingsRate,
  savingsTotals,
  topShare,
  windowStart,
} from "@/lib/customer/homeInsights";
import { monthName, monthRates } from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getPlatform } from "@/lib/customer/platform";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";
import { getCategoryBreakdown, getMonthlyBreakdown } from "@/lib/customer/reports";
import { getSavingsGoals } from "@/lib/customer/savingsGoals";
import { getSkillsOverview } from "@/lib/customer/skills";
import { categoryIndex } from "@/lib/customer/transactionRows";
import { getTransactions } from "@/lib/customer/transactions";
import { getVaultStatus } from "@/lib/customer/vault";
import { APP_TIME_ZONE, getAppToday, toDateInputValue } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/dashboard");

// The chart's months, this one included.
const CHART_MONTHS = 6;
const RECENT_ROWS = 5;
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
// outage, a timeout, the throttle), so that part of Home says it couldn't
// load and the rest stays up. Next's own redirects (maintenance mode, a PIN
// lock) still go through.
async function part<T>(read: () => Promise<T>): Promise<Part<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false };
  }
}

// Home. Everything it shows comes from calls the feature pages already
// make; the figures are derived here, on the server, once. The wallets,
// this month's money and the newest transactions are its core: without
// them Home shows the error screen. Every other part is read on its own.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const now = new Date();
  const greeting = greetingFor(hourIn(APP_TIME_ZONE, now));
  const firstName = greetingName(user.name);
  const prayerSettings = await getPrayerSettings();
  const dates = homeDates(now, locale, APP_TIME_ZONE, prayerSettings.hijriAdjust);

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  // No personal or business workspace to open (only groups, or theirs was
  // removed). Every page sends such a customer here, so Home says what they
  // can do rather than sending them round again.
  if (!activeBusinessId) {
    return <HomeNoWorkspace greeting={greeting} firstName={firstName} day={dates.day} hasGroup={user.businesses.some((b) => b.type === "GROUP")} />;
  }

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const today = getAppToday();
  const { year, month } = appYearMonth();
  const monthStart = `${today.slice(0, 7)}-01`;
  const chartFrom = windowStart(today, CHART_MONTHS);
  const lastSameDays = sameDaysLastMonth(today);
  // The layout has read it already; this is the same answer.
  const loansOn = isFeatureOn((await getPlatform()).flags, "loan_management");

  const walletsRead = getWalletsOverview(activeBusinessId);
  // What the active wallets held when the month began: their balances when
  // last month's final day ended, in one call beside the wallets' own. A
  // backend from before asOf (no balanceAsOf on the rows, or a refusal)
  // falls back to each wallet's balance brought forward to the 1st.
  const asOfRead = getWalletsAsOf(activeBusinessId, previousMonthEnd(today)).catch(() => null);
  const startRead = part(async () => {
    const active = (await walletsRead).accounts.filter((wallet) => wallet.status !== "ARCHIVED");
    if (active.length === 0) return null;
    const asOfById = new Map((await asOfRead)?.accounts.map((wallet) => [wallet.id, { balanceAsOf: wallet.balanceAsOf }] as const) ?? []);
    const asOfTotal = balanceAsOfTotal(active.map((wallet) => asOfById.get(wallet.id) ?? {}));
    if (asOfTotal !== null) return asOfTotal;
    if (active.length > MAX_LEDGER_TREND_WALLETS) return null;
    const ledgers = await Promise.all(active.map((wallet) => getLedger(activeBusinessId, wallet.id, { dateFrom: monthStart, limit: 1 })));
    return ledgers.reduce((sum, ledger) => sum + Number(ledger.balanceBroughtForward), 0);
  });

  const [walletsOverview, income, expense, recent, start, incomeNames, lastSpend, goals, assets, budget, loanDashboard, namazTrackers, challengeTrackers, booksOverview, skillsOverview, vault] =
    await Promise.all([
      walletsRead,
      // This month, last month and the chart, in two calls: one column per
      // month, this month up to today.
      getMonthlyBreakdown(activeBusinessId, "INCOME", chartFrom, today),
      getMonthlyBreakdown(activeBusinessId, "EXPENSE", chartFrom, today),
      getTransactions(activeBusinessId, { limit: RECENT_ROWS }),
      startRead,
      // Income categories' icons for the rows (the budget below brings the
      // expense ones); without them the rows fall back to plain icons.
      part(() => getBudgetCategoryNames(activeBusinessId, "INCOME")),
      part(() => getCategoryBreakdown(activeBusinessId, "EXPENSE", lastSameDays.dateFrom, lastSameDays.dateTo)),
      part(() => getSavingsGoals(activeBusinessId)),
      part(() => getAssets(activeBusinessId)),
      part(() => getBudgetOverview(activeBusinessId, month, year)),
      loansOn ? part(() => getLoanDashboard(activeBusinessId)) : null,
      part(() => getHabitTrackers("Namaz")),
      part(() => getHabitTrackers("Others")),
      part(() => getBooksOverview()),
      part(() => getSkillsOverview()),
      part(() => getVaultStatus()),
    ]);

  const unavailable: HomePart[] = [];
  // A part's value, or `empty` (and the part listed as unavailable) when it
  // couldn't be read.
  const read = <T,>(name: HomePart, result: Part<T>, empty: T): T => {
    if (result.ok) return result.value;
    unavailable.push(name);
    return empty;
  };

  const rates = monthRates(income, expense);
  const current = rates.length - 1;
  const incomeTotal = rates[current]?.income ?? 0;
  const expenseTotal = rates[current]?.expense ?? 0;
  const thisIncome = monthColumn(income, income.months.length - 1);
  const thisExpense = monthColumn(expense, expense.months.length - 1);
  const topIncome = topShare(thisIncome);
  const topExpense = topShare(thisExpense);

  const activeWallets = walletsOverview.accounts.filter((wallet) => wallet.status !== "ARCHIVED");
  const balance = Number(walletsOverview.availableBalance);
  const savings = savingsTotals(read("savings", goals, []));
  const assetList = read("assets", assets, []).filter((a) => a.status === "ACTIVE");
  const assetsValue = assetList.reduce((sum, a) => sum + Number(a.currentValue), 0);
  const assetsCost = assetList.reduce((sum, a) => sum + Number(a.purchasePrice), 0);
  const budgetOverview = read("budget", budget, null);
  // Every expense category, with its limit and what went against it.
  const expenseCategories = budgetOverview?.categories ?? [];
  const limited = expenseCategories.filter((c) => c.monthlyLimit !== null && Number(c.monthlyLimit) > 0);
  const budgetFocus = [...limited].sort((a, b) => b.percent - a.percent)[0] ?? null;
  const loans = loanDashboard ? read("loans", loanDashboard, null) : null;
  const namaz = read("namaz", namazTrackers, []);
  const challenges = read("challenges", challengeTrackers, []);
  const books = read("books", booksOverview, null);
  const skills = read("skills", skillsOverview, null);
  const readingBooks = books?.books.filter((b) => b.status === "READING") ?? [];
  const practisedToday = Boolean(skills?.week.find((d) => d.date === today && (d.minutes > 0 || d.lessons > 0)));
  const incomeCategories = incomeNames.ok ? incomeNames.value : [];
  const hasWallet = walletsOverview.totalAccounts > 0;
  const hasTransaction = recent.data.length > 0;

  const data: HomeData = {
    businessId: activeBusinessId,
    firstName,
    currency,
    canManage,
    today,
    greeting,
    dates,
    monthName: monthName(today.slice(0, 7), locale),
    lastMonthName: monthName(lastSameDays.dateFrom.slice(0, 7), locale),
    lastMonthShort: monthName(lastSameDays.dateFrom.slice(0, 7), locale, "short"),
    balance,
    walletCount: activeWallets.length,
    balanceChangePercent: balanceChangePercent(balance, start.ok ? start.value : null),
    income: incomeTotal,
    expense: expenseTotal,
    savingsRate: savingsRate(incomeTotal, expenseTotal),
    lastSavingsRate: current > 0 ? savingsRate(rates[current - 1].income, rates[current - 1].expense) : null,
    firstMonthOnRecord: isFirstMonthOnRecord({
      earlier: rates.slice(0, -1),
      recentDays: recent.data.map((tx) => toDateInputValue(tx.transactionDate)),
      total: recent.meta.total,
      monthStart,
    }),
    chart: rates.map((rate) => ({ month: rate.month, label: monthName(rate.month, locale, "short"), name: monthName(rate.month, locale), income: rate.income, kept: rate.kept })),
    recentTransactions: recent.data,
    categoriesById: categoryIndex([...incomeCategories, ...expenseCategories]),
    savingsSaved: savings.saved,
    savingsTarget: savings.target,
    savingsProgress: savings.progress,
    goalCount: savings.count,
    assetsValue,
    // To the paisa, so a value that is exactly what was paid reads as 0.
    assetsGain: Math.round((assetsValue - assetsCost) * 100) / 100,
    assetCount: assetList.length,
    budgetFocus,
    // A limit on a category, or a total for the month.
    hasBudget: limited.length > 0 || Number(budgetOverview?.totalBudget ?? 0) > 0,
    daysLeftInMonth: daysLeftInMonth(today),
    loans,
    loanCounts: loanCounts(loans?.rows ?? []),
    namaz: namaz.find((tr) => tr.todayDay !== null) ?? null,
    challengesRunning: challenges.filter((tr) => challengeWindow(tr, today).status === "going").length,
    reading: readingBooks[0] ? { title: readingBooks[0].title, pagesRead: readingBooks[0].pagesRead, totalPages: readingBooks[0].totalPages } : null,
    skills: skills ? { streak: skills.streak, practisedToday, hasSkills: skills.skills.length > 0 } : null,
    vault: read("vault", vault, null),
    topIncome: topIncome ? { name: topIncome.name, percent: topIncome.percent } : null,
    topExpense: topExpense ? { ...topExpense, delta: lastSpend.ok ? categoryDelta(thisExpense, lastSpend.value, topExpense.name) : null } : null,
    setup: hasWallet && hasTransaction ? null : { hasWallet, hasTransaction },
    unavailable,
  };

  return <HomePageClient data={data} />;
}
