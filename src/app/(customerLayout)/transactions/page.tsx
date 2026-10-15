import { redirect } from "next/navigation";
import { TransactionsPageClient, type TransactionTotals } from "@/components/modules/Customer/Transactions/TransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getMoneyAccounts } from "@/lib/customer/accounts";
import type { TransactionType } from "@/lib/customer/api";
import { getBudgetCategoryNames } from "@/lib/customer/budgets";
import { getCurrentUser } from "@/lib/customer/auth";
import { isIsoDay } from "@/lib/customer/dateRangePresets";
import { getCategoryBreakdown } from "@/lib/customer/reports";
import { isCancelled } from "@/lib/customer/transactionDisplay";
import { getTransactions } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";

const TYPES: TransactionType[] = ["INCOME", "EXPENSE"];

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const page = typeof params.page === "string" ? Number(params.page) || 1 : 1;
  const selectedType = typeof params.type === "string" && TYPES.includes(params.type as TransactionType) ? (params.type as TransactionType) : undefined;
  const dateFrom = isIsoDay(params.dateFrom) ? params.dateFrom : undefined;
  const dateTo = isIsoDay(params.dateTo) ? params.dateTo : undefined;
  const accountId = typeof params.accountId === "string" ? params.accountId : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

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
    page,
    limit: 10,
  };

  // The totals strip covers every matching transaction when only the
  // date and type are filtered (the category breakdown knows those); a
  // search, wallet or category filter the breakdown can't apply falls
  // back to this page's rows.
  const wholeRange = !accountId && !categoryId && !search;

  const [{ data: transactions, meta }, accounts, expenseCategories, incomeCategories, incomeBreakdown, expenseBreakdown] = await Promise.all([
    getTransactions(activeBusinessId, filters),
    getMoneyAccounts(activeBusinessId),
    getBudgetCategoryNames(activeBusinessId, "EXPENSE"),
    getBudgetCategoryNames(activeBusinessId, "INCOME"),
    wholeRange && selectedType !== "EXPENSE" ? getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo) : null,
    wholeRange && selectedType !== "INCOME" ? getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo) : null,
  ]);

  const voidedOnPage = transactions.filter(isCancelled).length;
  const totals: TransactionTotals = wholeRange
    ? { income: Number(incomeBreakdown?.total ?? 0), expense: Number(expenseBreakdown?.total ?? 0), count: meta.total, voided: voidedOnPage, scope: "all" }
    : {
        income: transactions.filter((t) => t.transactionType === "INCOME" && !isCancelled(t)).reduce((sum, t) => sum + Number(t.entries[0]?.amount ?? 0), 0),
        expense: transactions.filter((t) => t.transactionType === "EXPENSE" && !isCancelled(t)).reduce((sum, t) => sum + Number(t.entries[0]?.amount ?? 0), 0),
        count: meta.total,
        voided: voidedOnPage,
        scope: "page",
      };

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <TransactionsPageClient
      businessId={activeBusinessId}
      transactions={transactions}
      accounts={accounts}
      categories={[...expenseCategories, ...incomeCategories]}
      meta={meta}
      currency={activeBusiness?.currency ?? "BDT"}
      today={getAppToday()}
      totals={totals}
      canManage={activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT"}
    />
  );
}
