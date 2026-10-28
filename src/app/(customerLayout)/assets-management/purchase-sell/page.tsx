import { redirect } from "next/navigation";
import { BuySellPageClient } from "@/components/modules/Customer/Assets/BuySellPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getSavingsWallets, getWallets } from "@/lib/customer/accounts";
import { getAssetCategories, getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/assets-management/purchase-sell");

export default async function BuySellAssetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // The wallets only name where the last sale went ("into Cash").
  const [assets, categories, wallets, savingsWallets] = await Promise.all([getAssets(activeBusinessId), getAssetCategories(activeBusinessId), getWallets(activeBusinessId), getSavingsWallets(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  // Keyed by workspace: a switch lands on this same page, and its drawers
  // must not carry the other workspace's wallet over.
  return <BuySellPageClient key={activeBusinessId} businessId={activeBusinessId} assets={assets} categories={categories} wallets={[...wallets, ...savingsWallets]} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />;
}
