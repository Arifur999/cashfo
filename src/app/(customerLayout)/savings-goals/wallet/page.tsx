import { redirect } from "next/navigation";
import { SavingsWalletPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsWalletPageClient";
import { getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";

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
