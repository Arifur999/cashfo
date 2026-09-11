import { redirect } from "next/navigation";
import { BalanceTransferPageClient } from "@/components/balance/BalanceTransferPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";

export default async function BalanceTransferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const { data: transfers } = await getTransactions(activeBusinessId, { transactionType: "TRANSFER" });

  return <BalanceTransferPageClient businessId={activeBusinessId} transfers={transfers} currency={activeBusiness?.currency ?? "BDT"} />;
}
