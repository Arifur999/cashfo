import { redirect } from "next/navigation";
import { ReportsBoard, type ReportsData } from "@/components/modules/Customer/Reports/ReportsBoard";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getMonthlyPlans } from "@/lib/customer/budgets";
import { getFmt } from "@/lib/customer/fmt";
import { monthName } from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type Period, periodRange, readPickedPeriod } from "@/lib/customer/period";
import { getPeriodReport } from "@/lib/customer/periodReport";
import { getActiveMonths, getCategoryBreakdown, getMonthlyBreakdown } from "@/lib/customer/reports";
import { formatDay, getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";

export const generateMetadata = () => customerPageMetadata("/reports/detailed");

// Reports: all the money in one place for a month or a year (?month=&year=,
// ?period=year&year=; this month without either) -- the four figures, the
// target and budget, the net worth statement, the cash flow, income and
// spending by category against the period before, month by month for a
// year, and the period's savings goals, loans, assets and events. The
// category table with its CSV and tax years is at /reports/categories.
export default async function ReportsPage({ searchParams }: PageProps<"/reports/detailed">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const fmt = await getFmt();
  const today = getAppToday();
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const thisMonth: Period = { kind: "month", ...current };
  const read = readPickedPeriod(params, current, thisMonth);
  // A month or a year; anything else (a range, all time) opens this month.
  const period: Extract<Period, { kind: "month" | "year" }> = read.kind === "month" || read.kind === "year" ? read : thisMonth;
  const range = periodRange(period) as { dateFrom: string; dateTo: string };
  const before: Period = period.kind === "month" ? (period.month === 1 ? { kind: "month", year: period.year - 1, month: 12 } : { kind: "month", year: period.year, month: period.month - 1 }) : { kind: "year", year: period.year - 1 };
  const beforeRange = periodRange(before) as { dateFrom: string; dateTo: string };

  const [report, income, expense, incomeBefore, expenseBefore, plans, activeMonths, monthIncome, monthExpense] = await Promise.all([
    getPeriodReport(activeBusinessId, range.dateFrom, range.dateTo),
    getCategoryBreakdown(activeBusinessId, "INCOME", range.dateFrom, range.dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", range.dateFrom, range.dateTo),
    getCategoryBreakdown(activeBusinessId, "INCOME", beforeRange.dateFrom, beforeRange.dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", beforeRange.dateFrom, beforeRange.dateTo),
    getMonthlyPlans(activeBusinessId).catch(() => []),
    getActiveMonths(activeBusinessId).catch(() => null),
    period.kind === "year" ? getMonthlyBreakdown(activeBusinessId, "INCOME", range.dateFrom, range.dateTo) : null,
    period.kind === "year" ? getMonthlyBreakdown(activeBusinessId, "EXPENSE", range.dateFrom, range.dateTo) : null,
  ]);

  // The plan's target and budget for each month of the period.
  const planOf = (month: number) => plans.find((plan) => plan.year === period.year && plan.month === month) ?? null;
  const months = period.kind === "month" ? [period.month] : Array.from({ length: 12 }, (_, index) => index + 1);
  const target = months.reduce((sum, month) => sum + Number(planOf(month)?.incomeTarget ?? 0), 0);
  const budget = months.reduce((sum, month) => sum + Number(planOf(month)?.expenseBudget ?? 0), 0);
  // A month's column total in a year's breakdown (months are "YYYY-MM").
  const totalOf = (breakdown: typeof monthIncome, key: string) => {
    const index = breakdown?.months.indexOf(key) ?? -1;
    return index >= 0 ? Number(breakdown?.totals[index] ?? 0) : 0;
  };

  const data: ReportsData = {
    businessId: activeBusinessId,
    currency: activeBusiness?.currency ?? "BDT",
    today,
    period,
    label: period.kind === "month" ? monthName(range.dateFrom.slice(0, 7), fmt, "long", true) : toLocaleDigits(String(period.year), fmt),
    beforeLabel: period.kind === "month" ? monthName(beforeRange.dateFrom.slice(0, 7), fmt, "long") : toLocaleDigits(String(before.kind === "year" ? before.year : ""), fmt),
    // The board writes both ends in full: "1 October 2026 – 31 October 2026".
    rangeLabel: `${formatDay(range.dateFrom, "d MMMM yyyy", fmt)} – ${formatDay(range.dateTo, "d MMMM yyyy", fmt)}`,
    activeMonths,
    report,
    categories: {
      income: income.categories.map((row) => ({ name: row.name, amount: Number(row.amount), color: row.color, before: Number(incomeBefore.categories.find((old) => old.name === row.name)?.amount ?? 0) })),
      expense: expense.categories.map((row) => ({ name: row.name, amount: Number(row.amount), color: row.color, before: Number(expenseBefore.categories.find((old) => old.name === row.name)?.amount ?? 0) })),
    },
    totals: { income: Number(income.total), expense: Number(expense.total), incomeBefore: Number(incomeBefore.total), expenseBefore: Number(expenseBefore.total) },
    plan: { target: target > 0 ? target : null, budget: budget > 0 ? budget : null },
    monthRows:
      period.kind === "year"
        ? months.map((month) => {
            const key = `${period.year}-${String(month).padStart(2, "0")}`;
            const plan = planOf(month);
            return {
              key,
              label: monthName(key, fmt, "long"),
              income: totalOf(monthIncome, key),
              expense: totalOf(monthExpense, key),
              target: plan?.incomeTarget ? Number(plan.incomeTarget) : null,
              budget: plan?.expenseBudget ? Number(plan.expenseBudget) : null,
              future: key > today.slice(0, 7),
            };
          })
        : null,
  };

  return <ReportsBoard data={data} />;
}
