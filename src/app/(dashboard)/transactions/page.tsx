import { redirect } from "next/navigation";
import { TransactionsPageClient } from "@/components/transactions/TransactionsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
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

  const filters = {
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
    transactionType: typeof params.type === "string" ? (params.type as TransactionType) : undefined,
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  };

  const [{ data: transactions }, accounts] = await Promise.all([
    getTransactions(activeBusinessId, filters),
    getMoneyAccountsAction(activeBusinessId),
  ]);

  return <TransactionsPageClient transactions={transactions} accounts={accounts} />;
}
