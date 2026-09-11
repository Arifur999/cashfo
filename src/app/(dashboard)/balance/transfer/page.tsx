import { redirect } from "next/navigation";
import { BalanceTransferPageClient } from "@/components/balance/BalanceTransferPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRangePresets";
import { getTransactions } from "@/lib/transactions";

export default async function BalanceTransferPage({ searchParams }: PageProps<"/balance/transfer">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const range = (typeof params.range === "string" ? params.range : "all") as DateRangePreset;
  const { dateFrom, dateTo } = resolveDateRange(range);

  // A high limit rather than real pagination -- transfers are a small
  // subset of all transactions for this app's realistic usage, and the
  // summary cards (Total Transfer/Total Transactions) need the full
  // filtered set, not just one page of it. 100 is ListTransactionsQueryDto's
  // hard @Max() on the backend.
  const { data: transfers } = await getTransactions(activeBusinessId, { transactionType: "TRANSFER", dateFrom, dateTo, limit: 100 });

  return (
    <BalanceTransferPageClient
      businessId={activeBusinessId}
      transfers={transfers}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      range={range}
    />
  );
}
