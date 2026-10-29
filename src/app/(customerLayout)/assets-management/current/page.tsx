import { redirect } from "next/navigation";
import { MyAssetsPageClient } from "@/components/modules/Customer/Assets/MyAssetsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategories, getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/assets-management/current");

// All assets: everything owned or sold.
export default async function MyAssetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [assets, categories] = await Promise.all([getAssets(activeBusinessId), getAssetCategories(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  // Keyed by workspace: a switch lands on this same page, and its drawers
  // and filters must not carry the other workspace's choices over.
  return <MyAssetsPageClient key={activeBusinessId} businessId={activeBusinessId} assets={assets} categories={categories} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />;
}
