import { redirect, unstable_rethrow } from "next/navigation";
import { readDashboardPeriod, changePercent, spendingSlices, type DashboardPeriodKey } from "@/components/modules/Customer/Dashboard/dashboardFigures";
import { HomeNoWorkspace } from "@/components/modules/Customer/Dashboard/HomeNoWorkspace";
import { HomePageClient } from "@/components/modules/Customer/Dashboard/HomePageClient";
import type { HomeData, HomePart } from "@/components/modules/Customer/Dashboard/homeTypes";
import { getLedger, getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { accountColor } from "@/lib/customer/balanceDisplay";
import { API_BASE_URL, type CategoryBreakdown, type WalletOverviewRow, type WalletsOverview } from "@/lib/customer/api";
import { customerApi } from "@/lib/customer/apiClient";
import { getAssets } from "@/lib/customer/assets";
import { getInvestments } from "@/lib/customer/investments";
import { getCurrentUser } from "@/lib/customer/auth";
import { getEventsOverview } from "@/lib/customer/events";
import { getBudgetCategoryNames, getBudgetOverview, getMonthlyPlan } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { isFeatureOn } from "@/lib/customer/features";
import { getFmt } from "@/lib/customer/fmt";
import { greetingFor, greetingName, homeDates, hourIn } from "@/lib/customer/greeting";
import { getPrayerSettings } from "@/lib/customer/habits";
import { balanceAsOfTotal, balanceChangePercent, daysLeftInMonth, loanCounts, previousMonthEnd, savingsTotals, windowStart } from "@/lib/customer/homeInsights";
import { monthName, monthRates, rangeLabel } from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type Period, periodRange, readPickedPeriod, type YearMonth } from "@/lib/customer/period";
import { getPlatform } from "@/lib/customer/platform";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";
import { getActiveMonths, getCategoryBreakdown, getMonthlyBreakdown, getMoneyFlow } from "@/lib/customer/reports";
import { goalColor } from "@/lib/customer/savingsDisplay";
import { getSavingsGoals } from "@/lib/customer/savingsGoals";
import { categoryIndex } from "@/lib/customer/transactionRows";
import { getTransactions, getTransactionsSummary } from "@/lib/customer/transactions";
import { APP_TIME_ZONE, getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/dashboard");

// The chart's months, this one included.
const CHART_MONTHS = 6;
const RECENT_ROWS = 7;
// The next events the Upcoming events card lists.
const EVENT_ROWS = 4;
// The goals the Savings goals card lists.
const GOAL_ROWS = 3;
// The people the Loans card lists on each side, and the assets the Assets
// card lists.
const LOAN_ROWS = 2;
const ASSET_ROWS = 4;
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

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const previousOf = ({ year, month }: YearMonth): YearMonth => (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });

// The period on show: the phone chips' ?period=this-month|last-month|
// this-year|custom (with ?from=&to=), or the desktop picker's ?month=&year=,
// ?period=year&year=, ?from=&to= -- this month without either.
function dashboardPeriod(params: Record<string, string | string[] | undefined>, today: string, current: YearMonth): Period {
  const text = (value: unknown) => (typeof value === "string" ? value : undefined);
  const chip = text(params.period);
  if (chip === "this-month" || chip === "last-month" || chip === "this-year" || chip === "custom") {
    const legacy = readDashboardPeriod({ period: chip, from: text(params.from), to: text(params.to) }, today);
    if (legacy.key === "this-month") return { kind: "month", ...current };
    if (legacy.key === "last-month") return { kind: "month", ...previousOf(current) };
    if (legacy.key === "this-year") return { kind: "year", year: current.year };
    return { kind: "custom", from: legacy.dateFrom, to: legacy.dateTo };
  }
  const picked = readPickedPeriod(params, current, { kind: "month", ...current });
  return picked.kind === "all" ? { kind: "month", ...current } : picked;
}

// Which phone chip a period is.
function chipOf(period: Period, current: YearMonth): DashboardPeriodKey {
  const last = previousOf(current);
  if (period.kind === "month" && period.year === current.year && period.month === current.month) return "this-month";
  if (period.kind === "month" && period.year === last.year && period.month === last.month) return "last-month";
  if (period.kind === "year" && period.year === current.year) return "this-year";
  return "custom";
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
  const fmt = await getFmt();
  const now = new Date();
  const greeting = greetingFor(hourIn(APP_TIME_ZONE, now));
  const firstName = greetingName(user.name);

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  // No personal or business workspace to open (only groups, or theirs was
  // removed). Every page sends such a customer here, so the Dashboard says
  // what they can do rather than sending them round again.
  if (!activeBusinessId) {
    const prayerSettings = await getPrayerSettings();
    const dates = homeDates(now, fmt, APP_TIME_ZONE, prayerSettings.hijriAdjust);
    return <HomeNoWorkspace greeting={greeting} firstName={firstName} day={dates.day} hasGroup={user.businesses.some((b) => b.type === "GROUP")} />;
  }

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const today = getAppToday();
  const { year, month } = appYearMonth();
  const monthStart = `${today.slice(0, 7)}-01`;
  const current: YearMonth = { year, month };
  const picked = dashboardPeriod(params, today, current);
  const range = periodRange(picked) as { dateFrom: string; dateTo: string };
  // The month before a month on show, for the cards' comparison.
  const compareMonth = picked.kind === "month" ? previousOf(picked) : null;
  const compareRange = compareMonth ? { dateFrom: `${compareMonth.year}-${pad(compareMonth.month)}-01`, dateTo: `${compareMonth.year}-${pad(compareMonth.month)}-${pad(lastDay(compareMonth.year, compareMonth.month))}` } : null;
  // The chart's six months end with the period's last month (this month at the latest).
  const endMonth = [picked.kind === "month" ? `${picked.year}-${pad(picked.month)}` : picked.kind === "year" ? `${picked.year}-12` : picked.to.slice(0, 7), today.slice(0, 7)].sort()[0];
  const chartTo = endMonth === today.slice(0, 7) ? today : `${endMonth}-${pad(lastDay(Number(endMonth.slice(0, 4)), Number(endMonth.slice(5, 7))))}`;
  const chartFrom = windowStart(chartTo, CHART_MONTHS);
  // Budget Planning's month: the one on show, or this one.
  const planMonth = picked.kind === "month" ? picked : current;
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
  const spendingRead = getCategoryBreakdown(activeBusinessId, "EXPENSE", range.dateFrom, range.dateTo);

  const [walletsOverview, chartIncome, chartExpense, spending, money, before, recent, start, incomeNames, goals, assets, budget, loanDashboard, monthPlan, flow, events, activeMonths, investments] = await Promise.all([
    walletsRead,
    // The chart, in two calls: one column per month, up to the period's end.
    getMonthlyBreakdown(activeBusinessId, "INCOME", chartFrom, chartTo),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", chartFrom, chartTo),
    spendingRead,
    moneyInOut(activeBusinessId, range.dateFrom, range.dateTo, spendingRead),
    compareRange ? moneyInOut(activeBusinessId, compareRange.dateFrom, compareRange.dateTo) : null,
    // The newest, up to the period's end.
    getTransactions(activeBusinessId, { limit: RECENT_ROWS, standingOnly: true, ...(range.dateTo < today && { dateTo: range.dateTo }) }),
    startRead,
    // Income categories' icons for the rows (the budget below brings the
    // expense ones); without them the rows fall back to plain icons.
    part(() => getBudgetCategoryNames(activeBusinessId, "INCOME")),
    part(() => getSavingsGoals(activeBusinessId)),
    part(() => getAssets(activeBusinessId)),
    part(() => getBudgetOverview(activeBusinessId, planMonth.month, planMonth.year)),
    loansOn ? part(() => getLoanDashboard(activeBusinessId)) : null,
    // Budget Planning's plan for the month (its target and budget), best-effort.
    getMonthlyPlan(activeBusinessId, planMonth.year, planMonth.month).catch(() => null),
    part(() => getMoneyFlow(activeBusinessId, range.dateFrom, range.dateTo)),
    // Events are the owner's and accountant's.
    canManage ? part(() => getEventsOverview(activeBusinessId)) : null,
    getActiveMonths(activeBusinessId).catch(() => null),
    part(() => getInvestments(activeBusinessId)),
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
  // The capital still in each investment (closed ones hold none).
  const investedList = read("investments", investments, []).filter((inv) => Number(inv.capital) > 0);
  const budgetOverview = read("budget", budget, null);
  // Every expense category, with its limit and what went against it.
  const expenseCategories = budgetOverview?.categories ?? [];
  const limited = expenseCategories.filter((c) => c.monthlyLimit !== null && Number(c.monthlyLimit) > 0);
  // This month's plan from Budget Planning: its expense budget is the
  // card's line when no category has a limit of its own.
  const planBudget = monthPlan?.expenseBudget ? Number(monthPlan.expenseBudget) : 0;
  const hasBudget = limited.length > 0 || Number(budgetOverview?.totalBudget ?? 0) > 0 || planBudget > 0;
  const loans = loanDashboard ? read("loans", loanDashboard, null) : null;
  const counts = loanCounts(loans?.rows ?? []);
  const incomeCategories = incomeNames.ok ? incomeNames.value : [];
  const hasWallet = walletsOverview.totalAccounts > 0;
  const hasTransaction = recent.data.length > 0;
  const lastMonthKey = previousMonthEnd(today).slice(0, 7);

  const periodLabel =
    picked.kind === "year"
      ? toLocaleDigits(String(picked.year), fmt)
      : picked.kind === "custom"
        ? rangeLabel(range.dateFrom, range.dateTo, fmt)
        : monthName(range.dateFrom.slice(0, 7), fmt, "long", true);
  const flowRead = flow.ok ? flow.value : null;
  const eventsRead = events?.ok ? events.value : null;
  const loanRows = loans?.rows ?? [];
  const sideOf = (sign: 1 | -1) =>
    loanRows
      .filter((row) => Number(row.currentBalance) * sign > 0)
      .sort((a, b) => Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance)))
      .slice(0, LOAN_ROWS)
      .map((row) => ({ id: row.contactId, name: row.contactName, balance: Number(row.currentBalance) }));
  const topSpend = spending.categories.filter((c) => !c.uncategorised).sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  // A month's targets only, and only where they are set.
  const incomeTarget = picked.kind === "month" && monthPlan?.incomeTarget ? Number(monthPlan.incomeTarget) : 0;
  const monthBudget = picked.kind === "month" ? planBudget || Number(budgetOverview?.totalBudget ?? 0) : 0;

  const hijri = user.preferences?.showHijri ? homeDates(now, fmt, APP_TIME_ZONE, (await getPrayerSettings()).hijriAdjust).hijri : null;
  const data: HomeData = {
    businessId: activeBusinessId,
    currency,
    hijri,
    canManage,
    today,
    greeting,
    firstName,
    profile: {
      name: user.name,
      avatarUrl: user.avatarUrl,
      since: user.createdAt ? monthName(user.createdAt.slice(0, 7), fmt, "short", true) : null,
    },
    period: { key: chipOf(picked, current), picked, dateFrom: range.dateFrom, dateTo: range.dateTo, label: periodLabel, isMonth: picked.kind === "month" },
    activeMonths,
    compare: compareMonth && before ? { label: monthName(`${compareMonth.year}-${pad(compareMonth.month)}`, fmt, "long"), income: before.income, expense: before.expense } : null,
    targets: { income: incomeTarget > 0 ? incomeTarget : null, budget: monthBudget > 0 ? monthBudget : null },
    worth: {
      parts: {
        cash: balance,
        savings: savings.saved,
        assets: assetList.reduce((sum, a) => sum + Number(a.currentValue), 0),
        investments: investedList.reduce((sum, inv) => sum + Number(inv.capital), 0),
        pawna: Math.abs(Number(loans?.totalPawna ?? 0)),
        dena: Math.abs(Number(loans?.totalDena ?? 0)),
      },
      change: flowRead ? flowRead.worthChange : null,
      since: previousMonthEnd(today),
      counts: { accounts: activeWallets.length, goals: savings.count, assets: assetList.length, investments: investedList.length, pawna: counts.oweYou, dena: counts.youOwe },
    },
    flow: flowRead,
    events: eventsRead
      ? eventsRead.events
          .filter((event) => event.date >= today)
          .sort((a, b) => (a.date === b.date ? (a.time ?? "99").localeCompare(b.time ?? "99") : a.date.localeCompare(b.date)))
          .slice(0, EVENT_ROWS)
          .map((event) => ({ id: event.id, title: event.title, date: event.date, time: event.time, place: event.place, type: event.type }))
      : null,
    biggestSpend: topSpend ? { name: topSpend.name, amount: Number(topSpend.amount) } : null,
    goalRows: goalList
      .filter((goal) => goal.status === "ACTIVE" || goal.status === "PAUSED")
      .sort((a, b) => Number(b.currentAmount) - Number(a.currentAmount))
      .slice(0, GOAL_ROWS)
      .map((goal) => ({ id: goal.id, name: goal.name, saved: Number(goal.currentAmount), target: Number(goal.targetAmount), paused: goal.status === "PAUSED", color: goalColor(goal, goalList.indexOf(goal)) })),
    loanPeople: [...sideOf(1), ...sideOf(-1)],
    assetRows: [...assetList]
      .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))
      .slice(0, ASSET_ROWS)
      .map((asset) => ({ id: asset.id, name: asset.name, category: asset.category, value: Number(asset.currentValue), cost: Number(asset.purchasePrice) })),
    lastMonthShort: monthName(lastMonthKey, fmt, "short"),
    balance,
    balanceChangePercent: balanceChangePercent(balance, start.ok ? start.value : null),
    income: money.income,
    expense: money.expense,
    incomeChange: before ? changePercent(money.income, before.income) : null,
    expenseChange: before ? changePercent(money.expense, before.expense) : null,
    chart: monthRates(chartIncome, chartExpense).map((rate) => ({
      month: rate.month,
      label: monthName(rate.month, fmt, "short"),
      name: monthName(rate.month, fmt, "long", true),
      income: rate.income,
      expense: rate.expense,
    })),
    spending: { total: Number(spending.total), slices: spendingSlices(spending) },
    recentTransactions: recent.data,
    categoriesById: categoryIndex([...incomeCategories, ...expenseCategories]),
    wallets: activeWallets.map((wallet) => ({ id: wallet.id, name: locale === "bn" && wallet.nameBn ? wallet.nameBn : wallet.name, subtype: wallet.accountSubtype, balance: Number(wallet.currentBalance), color: accountColor(wallet) })),
    budget: budgetOverview
      ? {
          lines:
            limited.length === 0 && planBudget > 0 && monthPlan
              ? [{ name: "This month's budget", translate: true, spent: Number(monthPlan.spent), limit: planBudget, percent: Math.round((Number(monthPlan.spent) / planBudget) * 100) }]
              : [...limited]
                  .sort((a, b) => b.percent - a.percent)
                  .slice(0, BUDGET_ROWS)
                  .map((c) => ({ name: c.name, spent: Number(c.spent), limit: Number(c.monthlyLimit), percent: c.percent })),
          monthName: monthName(today.slice(0, 7), fmt),
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
