import { redirect } from "next/navigation";
import { TransactionsPageClient, type TransactionTotals } from "@/components/modules/Customer/Transactions/TransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getMoneyAccounts } from "@/lib/customer/accounts";
import type { TransactionType } from "@/lib/customer/api";
import { getBudgetCategoryNames } from "@/lib/customer/budgets";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getCategoryBreakdown } from "@/lib/customer/reports";
import { isCancelled } from "@/lib/customer/transactionDisplay";
import { pageEdgeDays, readTransactionFilters } from "@/lib/customer/transactionRows";
import { getTransactions, getTransactionsSummary } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";
import { pageHref, pastEnd, readPageParam, readPageSizeParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/transactions");

const TYPES: TransactionType[] = ["INCOME", "EXPENSE"];

// Rows per page the pager offers, on the URL's "limit".
const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const page = readPageParam(params);
  const limit = readPageSizeParam(params, PAGE_SIZES, DEFAULT_PAGE_SIZE);
  const { type: selectedType, dateFrom, dateTo, accountId, categoryId, search } = readTransactionFilters((key) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  });

  // This page is the Income & Expense list -- transfers and the books'
  // sale/purchase/payment postings have their own pages -- narrowed to one
  // type when the filter picks it.
  const filters = {
    dateFrom,
    dateTo,
    transactionType: selectedType,
    transactionTypes: selectedType ? undefined : TYPES,
    accountId,
    categoryId,
    search,
  };

  const [{ data: transactions, meta }, accounts, expenseCategories, incomeCategories, summary] = await Promise.all([
    getTransactions(activeBusinessId, { ...filters, page, limit }),
    getMoneyAccounts(activeBusinessId),
    getBudgetCategoryNames(activeBusinessId, "EXPENSE"),
    getBudgetCategoryNames(activeBusinessId, "INCOME"),
    getTransactionsSummary(activeBusinessId, filters),
  ]);

  // A page past the end (rows were voided away, an old link) opens the
  // last one, filters kept, instead of an empty list.
  const last = pastEnd(page, meta.totalPages, meta.total);
  if (last !== null) redirect(pageHref("/transactions", params, last));

  // The figures strip covers every matching transaction, from the summary.
  // An older backend has no summary: then only the date and type can be
  // totalled across pages (the category breakdown knows those), and a
  // search, wallet or category filter falls back to this page's rows.
  let totals: TransactionTotals;
  if (summary) {
    totals = { income: Number(summary.totals.INCOME), expense: Number(summary.totals.EXPENSE), count: summary.count, voided: summary.voided, scope: "all" };
  } else {
    const wholeRange = !accountId && !categoryId && !search;
    const [incomeBreakdown, expenseBreakdown] = await Promise.all([
      wholeRange && selectedType !== "EXPENSE" ? getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo) : null,
      wholeRange && selectedType !== "INCOME" ? getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo) : null,
    ]);
    const voidedOnPage = transactions.filter(isCancelled).length;
    const pageTotal = (type: TransactionType) => transactions.filter((t) => t.transactionType === type && !isCancelled(t)).reduce((sum, t) => sum + Number(t.entries[0]?.amount ?? 0), 0);
    totals = wholeRange
      ? { income: Number(incomeBreakdown?.total ?? 0), expense: Number(expenseBreakdown?.total ?? 0), count: meta.total, voided: voidedOnPage, scope: "all" }
      : { income: pageTotal("INCOME"), expense: pageTotal("EXPENSE"), count: meta.total, voided: voidedOnPage, scope: "page" };
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

  return (
    <TransactionsPageClient
      businessId={activeBusinessId}
      transactions={transactions}
      accounts={accounts}
      categories={[...expenseCategories.map((c) => ({ ...c, type: "EXPENSE" as const })), ...incomeCategories.map((c) => ({ ...c, type: "INCOME" as const }))]}
      meta={meta}
      pageSize={limit}
      pageSizes={PAGE_SIZES}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      currency={activeBusiness?.currency ?? "BDT"}
      today={getAppToday()}
      totals={totals}
      dayTotals={dayTotals}
      splitDays={edges}
      canManage={activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT"}
    />
  );
}
