import { redirect } from "next/navigation";
import { WalletPageClient } from "@/components/modules/Customer/Balance/WalletPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getWallets } from "@/lib/customer/accounts";
import { getCurrentUser } from "@/lib/customer/auth";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const wallets = await getWallets(activeBusinessId);

  return <WalletPageClient businessId={activeBusinessId} wallets={wallets} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} />;
}
