import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/modules/Customer/Dashboard/HomePageClient";
import type { HomeData } from "@/components/modules/Customer/Dashboard/homeTypes";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview } from "@/lib/customer/books";
import { getBudgetCategoryNames, getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth, resolveDateRange } from "@/lib/customer/dateRangePresets";
import { greetingFor, homeDateLine, hourIn } from "@/lib/customer/greeting";
import { getHabitTrackers } from "@/lib/customer/habits";
import { balanceChangePercent, categoryDelta, daysLeftInMonth, loanCounts, savingsRate, topShare } from "@/lib/customer/homeInsights";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";
import { getCategoryBreakdown, getIncomeVsSavingsTrend } from "@/lib/customer/reports";
import { getSavingsGoals, getSavingsOverview } from "@/lib/customer/savingsGoals";
import { getSkillsOverview } from "@/lib/customer/skills";
import { categoryIndex } from "@/lib/customer/transactionRows";
import { getTransactions } from "@/lib/customer/transactions";
import { getVaultStatus } from "@/lib/customer/vault";
import { APP_TIME_ZONE, getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

const monthName = (year: number, month: number, locale: "en" | "bn") =>
  new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));

// Home. Everything it shows comes from calls the feature pages already
// make; the figures are derived here, on the server, once.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const locale = await getLocale();
  const now = new Date();
  const today = getAppToday();
  const { year, month } = appYearMonth();
  const thisMonth = resolveDateRange("this-month");
  const lastMonth = resolveDateRange("last-month");
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonthNumber = month === 1 ? 12 : month - 1;

  const [
    walletsOverview,
    income,
    expense,
    lastIncome,
    lastExpense,
    savingsOverview,
    goals,
    loanDashboard,
    recent,
    trend,
    assets,
    budget,
    incomeCategories,
    expenseCategories,
    namazTrackers,
    othersTrackers,
    booksOverview,
    skillsOverview,
    vault,
  ] = await Promise.all([
    getWalletsOverview(activeBusinessId),
    getCategoryBreakdown(activeBusinessId, "INCOME", thisMonth.dateFrom, thisMonth.dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", thisMonth.dateFrom, thisMonth.dateTo),
    getCategoryBreakdown(activeBusinessId, "INCOME", lastMonth.dateFrom, lastMonth.dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", lastMonth.dateFrom, lastMonth.dateTo),
    getSavingsOverview(activeBusinessId),
    getSavingsGoals(activeBusinessId, "ACTIVE"),
    getLoanDashboard(activeBusinessId),
    getTransactions(activeBusinessId, { limit: 5 }),
    getIncomeVsSavingsTrend(activeBusinessId, 6),
    getAssets(activeBusinessId),
    getBudgetOverview(activeBusinessId, month, year),
    getBudgetCategoryNames(activeBusinessId, "INCOME"),
    getBudgetCategoryNames(activeBusinessId, "EXPENSE"),
    getHabitTrackers("Namaz"),
    getHabitTrackers("Others"),
    getBooksOverview(),
    getSkillsOverview(),
    getVaultStatus(),
  ]);

  const incomeTotal = Number(income.total);
  const expenseTotal = Number(expense.total);
  const balance = Number(walletsOverview.totalBalance);
  const activeAssets = assets.filter((a) => a.status === "ACTIVE");
  const assetsValue = activeAssets.reduce((sum, a) => sum + Number(a.currentValue), 0);
  const assetsCost = activeAssets.reduce((sum, a) => sum + Number(a.purchasePrice), 0);
  const categoriesById = categoryIndex([...incomeCategories, ...expenseCategories]);
  const budgetFocus = [...budget.categories].filter((c) => c.monthlyLimit !== null && Number(c.monthlyLimit) > 0).sort((a, b) => b.percent - a.percent)[0] ?? null;
  const topIncome = topShare(income);
  const topExpense = topShare(expense);
  const readingBooks = booksOverview?.books.filter((b) => b.status === "READING") ?? [];
  const practisedToday = Boolean(skillsOverview?.week.find((d) => d.date === today && (d.minutes > 0 || d.lessons > 0)));
  const hasWallet = walletsOverview.totalAccounts > 0;
  const hasTransaction = recent.data.length > 0;

  const data: HomeData = {
    businessId: activeBusinessId,
    firstName: user.name.trim().split(/\s+/)[0] || user.name,
    currency,
    today,
    greeting: greetingFor(hourIn(APP_TIME_ZONE, now)),
    dateLine: homeDateLine(now, locale),
    monthName: monthName(year, month, locale),
    lastMonthName: monthName(lastMonthYear, lastMonthNumber, locale),
    balance,
    walletCount: walletsOverview.totalAccounts,
    balanceChangePercent: balanceChangePercent(balance, incomeTotal - expenseTotal),
    income: incomeTotal,
    expense: expenseTotal,
    savingsRate: savingsRate(incomeTotal, expenseTotal),
    lastSavingsRate: savingsRate(Number(lastIncome.total), Number(lastExpense.total)),
    trend,
    recentTransactions: recent.data,
    categoriesById,
    savingsSaved: Number(savingsOverview.totalSaved),
    savingsTarget: Number(savingsOverview.totalGoals),
    savingsProgress: savingsOverview.progressPercent,
    goalCount: goals.length,
    assetsValue,
    assetsGain: assetsValue - assetsCost,
    assetCount: activeAssets.length,
    budgetFocus,
    daysLeftInMonth: daysLeftInMonth(today),
    loans: loanDashboard,
    loanCounts: loanCounts(loanDashboard.rows),
    namaz: namazTrackers.find((tr) => tr.todayDay !== null) ?? null,
    dailyChallenges: othersTrackers.length,
    reading: readingBooks[0] ? { title: readingBooks[0].title, pagesRead: readingBooks[0].pagesRead, totalPages: readingBooks[0].totalPages } : null,
    readingCount: readingBooks.length,
    skills: skillsOverview ? { streak: skillsOverview.streak, practisedToday } : null,
    vault,
    topIncome: topIncome ? { name: topIncome.name, percent: topIncome.percent } : null,
    topExpense: topExpense ? { ...topExpense, delta: categoryDelta(expense, lastExpense, topExpense.name) } : null,
    setup: hasWallet && hasTransaction ? null : { hasWallet, hasTransaction },
  };

  return <HomePageClient data={data} />;
}
