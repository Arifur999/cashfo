import { redirect } from "next/navigation";
import { TransactionsPageClient } from "@/components/transactions/TransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getBudgetCategoryNamesAction } from "@/lib/budgetActions";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";
import type { TransactionType } from "@/lib/api";

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const page = typeof params.page === "string" ? Number(params.page) || 1 : 1;
  const selectedType = typeof params.type === "string" && params.type ? (params.type as TransactionType) : undefined;
  const filters = {
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
    // This page is Income & Expense's own Transaction list -- Transfers
    // (Balance Transfer/Savings Transfer) and Sale/Purchase/Payment (Dena-
    // Pawna/Loan Management) each already have their own dedicated list
    // page, so this one is scoped to just Income/Expense by default;
    // narrows further to exactly one when the Type filter picks a specific
    // value.
    transactionType: selectedType,
    transactionTypes: selectedType ? undefined : (["INCOME", "EXPENSE"] as TransactionType[]),
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    categoryId: typeof params.categoryId === "string" ? params.categoryId : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    page,
    limit: 10,
  };

  const [{ data: transactions, meta }, accounts, expenseCategories, incomeCategories] = await Promise.all([
    getTransactions(activeBusinessId, filters),
    getMoneyAccountsAction(activeBusinessId),
    getBudgetCategoryNamesAction(activeBusinessId, "EXPENSE"),
    getBudgetCategoryNamesAction(activeBusinessId, "INCOME"),
  ]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <TransactionsPageClient
      businessId={activeBusinessId}
      transactions={transactions}
      accounts={accounts}
      categories={[...expenseCategories, ...incomeCategories]}
      meta={meta}
      currency={activeBusiness?.currency ?? "BDT"}
    />
  );
}
