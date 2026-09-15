import { redirect } from "next/navigation";
import { SavingsWalletPageClient } from "@/components/savings-goals/SavingsWalletPageClient";
import { getSavingsWallets } from "@/lib/accounts";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";

export default async function SavingsWalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const wallets = await getSavingsWallets(activeBusinessId);

  return (
    <SavingsWalletPageClient businessId={activeBusinessId} wallets={wallets} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} />
  );
}
