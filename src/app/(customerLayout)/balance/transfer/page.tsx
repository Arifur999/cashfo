import { redirect } from "next/navigation";
import { BalanceTransferPageClient } from "@/components/modules/Customer/Balance/BalanceTransferPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getAllTransactions } from "@/lib/customer/transactions";

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

  // Every transfer in the range (read 100 at a time), since the summary
  // cards total them all -- they used to total only the first 100.
  const { data: transfers, complete } = await getAllTransactions(activeBusinessId, { transactionType: "TRANSFER", dateFrom, dateTo });

  return (
    <BalanceTransferPageClient
      businessId={activeBusinessId}
      transfers={transfers}
      complete={complete}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      range={range}
    />
  );
}
