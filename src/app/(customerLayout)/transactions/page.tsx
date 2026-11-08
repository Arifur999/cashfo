import { redirect } from "next/navigation";
import { TransactionsPageClient, type TransactionTotals } from "@/components/modules/Customer/Transactions/TransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getMoneyAccounts } from "@/lib/customer/accounts";
import type { CategoryBreakdown, TransactionType } from "@/lib/customer/api";
import { getBudgetCategoryNames } from "@/lib/customer/budgets";
import { getCurrentUser } from "@/lib/customer/auth";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type PickedPeriod, periodRange, readPickedPeriod } from "@/lib/customer/period";
import { getActiveMonths, getCategoryBreakdown } from "@/lib/customer/reports";
import { isCancelled } from "@/lib/customer/transactionDisplay";
import { type CategoryCounts, pageEdgeDays, readTransactionFilters } from "@/lib/customer/transactionRows";
import { getTransactions, getTransactionsSummary } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";
import { pageHref, pastEnd, readPageParam, readPageSizeParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/transactions");

const TYPES: TransactionType[] = ["INCOME", "EXPENSE"];

// Rows per page the pager offers, on the URL's "limit".
const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;

const countsOf = (breakdown: CategoryBreakdown): Record<string, number> =>
  Object.fromEntries(breakdown.categories.filter((row) => row.count !== undefined).map((row) => [row.uncategorised ? "" : row.name, row.count ?? 0]));

// Income & Expense > Transactions for a period: this month unless the
// address asks for another (?month=&year=, ?period=year&year=, ?from=&to=,
// or ?period=all for all time; an older link's ?dateFrom=&dateTo= is the
// reader's own days), narrowed by type, category, wallet and a search.
// ?new=1 opens the New transaction popup (the Overview's button).
export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const today = getAppToday();
  const current = appYearMonth();
  const thisMonth: PickedPeriod = { kind: "month", ...current };
  const page = readPageParam(params);
  // The reader's rows per page (Settings › App preferences) unless the address says.
  const defaultPageSize = PAGE_SIZES.includes(user.preferences?.rowsPerPage ?? 0) ? user.preferences!.rowsPerPage! : DEFAULT_PAGE_SIZE;
  const limit = readPageSizeParam(params, PAGE_SIZES, defaultPageSize);
  const { type: selectedType, dateFrom: oldFrom, dateTo: oldTo, accountId, categoryId, uncategorised, search, deleted } = readTransactionFilters((key) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  });
  const period: PickedPeriod =
    params.period === "all"
      ? { kind: "all" }
      : oldFrom || oldTo
        ? (oldFrom ?? "2000-01-01") <= (oldTo ?? today)
          ? { kind: "custom", from: oldFrom ?? "2000-01-01", to: oldTo ?? today }
          : thisMonth
        : readPickedPeriod(params, current, thisMonth);
  const { dateFrom, dateTo } = periodRange(period);

  // This page is the Income & Expense list -- transfers and the books'
  // sale/purchase/payment postings have their own pages -- narrowed to one
  // type when the filter picks it.
  const filters = {
    dateFrom,
    dateTo,
    transactionType: selectedType,
    transactionTypes: selectedType ? undefined : TYPES,
    accountId,
    categoryId: uncategorised ? undefined : categoryId,
    ...(uncategorised && { uncategorised: true }),
    search,
  };

  // The strip shows both kinds' totals whatever the type filter (the board
  // dims the one left out), so a type filter asks for them apart.
  const bothTypes = selectedType ? { ...filters, transactionType: undefined, transactionTypes: TYPES } : null;

  const [{ data: transactions, meta }, accounts, expenseCategories, incomeCategories, summary, incomeBreakdown, expenseBreakdown, activeMonths, bothSummary] = await Promise.all([
    // Deleted rows stay out unless asked for; the summary still counts
    // them, for the strip's "Show N voided".
    getTransactions(activeBusinessId, { ...filters, ...(!deleted && { standingOnly: true }), page, limit }),
    getMoneyAccounts(activeBusinessId),
    getBudgetCategoryNames(activeBusinessId, "EXPENSE"),
    getBudgetCategoryNames(activeBusinessId, "INCOME"),
    getTransactionsSummary(activeBusinessId, filters),
    getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo),
    getActiveMonths(activeBusinessId),
    bothTypes ? getTransactionsSummary(activeBusinessId, bothTypes) : Promise.resolve(null),
  ]);

  // A page past the end (rows were voided away, an old link) opens the
  // last one, filters kept, instead of an empty list.
  const last = pastEnd(page, meta.totalPages, meta.total);
  if (last !== null) redirect(pageHref("/transactions", params, last));

  // The figures strip covers every matching transaction of both kinds, from
  // the summary. An older backend has no summary: then only the date can be
  // totalled across pages (the category breakdown knows it), and a search,
  // wallet or category filter falls back to this page's rows.
  let totals: TransactionTotals;
  const both = bothSummary ?? summary;
  if (summary && both) {
    totals = { income: Number(both.totals.INCOME), expense: Number(both.totals.EXPENSE), voided: summary.voided, scope: "all" };
  } else {
    const wholeRange = !accountId && !categoryId && !uncategorised && !search;
    const voidedOnPage = transactions.filter(isCancelled).length;
    const pageTotal = (type: TransactionType) => transactions.filter((t) => t.transactionType === type && !isCancelled(t)).reduce((sum, t) => sum + Number(t.entries[0]?.amount ?? 0), 0);
    totals = wholeRange
      ? { income: Number(incomeBreakdown.total), expense: Number(expenseBreakdown.total), voided: voidedOnPage, scope: "all" }
      : { income: pageTotal("INCOME"), expense: pageTotal("EXPENSE"), voided: voidedOnPage, scope: "page" };
  }

  // A day at either edge of the page may go on past it, so its band's net
  // comes from the summary of that day (at most two calls); a day in
  // between is whole here. Without a summary the band says it goes on.
  const edges = pageEdgeDays(transactions, meta.page, meta.totalPages);
  const edgeDays = [...new Set([edges.before, edges.after].filter((day): day is string => day !== null))];
  const dayTotals: Record<string, number> = {};
  if (summary && edgeDays.length > 0) {
    const daySummaries = await Promise.all(edgeDays.map((day) => getTransactionsSummary(activeBusinessId, { ...filters, dateFrom: day, dateTo: day })));
    daySummaries.forEach((daySummary, index) => {
      if (daySummary) dayTotals[edgeDays[index]] = Number(daySummary.totals.INCOME) - Number(daySummary.totals.EXPENSE);
    });
  }

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const counts: CategoryCounts = { INCOME: countsOf(incomeBreakdown), EXPENSE: countsOf(expenseBreakdown) };

  return (
    <TransactionsPageClient
      businessId={activeBusinessId}
      transactions={transactions}
      accounts={accounts}
      categories={[...expenseCategories.map((c) => ({ ...c, type: "EXPENSE" as const })), ...incomeCategories.map((c) => ({ ...c, type: "INCOME" as const }))]}
      categoryCounts={counts}
      period={period}
      current={current}
      activeMonths={activeMonths}
      meta={meta}
      pageSize={limit}
      pageSizes={PAGE_SIZES}
      defaultPageSize={defaultPageSize}
      currency={activeBusiness?.currency ?? "BDT"}
      today={today}
      totals={totals}
      dayTotals={dayTotals}
      splitDays={edges}
      canManage={activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT"}
      openNew={params.new === "1"}
    />
  );
}
