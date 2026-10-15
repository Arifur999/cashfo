import { redirect } from "next/navigation";
import { AssetCategoriesPageClient } from "@/components/modules/Customer/Assets/AssetCategoriesPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategories, getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";

// Asset categories, with what each one holds today.
export default async function AssetCategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [categories, assets] = await Promise.all([getAssetCategories(activeBusinessId), getAssets(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <AssetCategoriesPageClient businessId={activeBusinessId} categories={categories} assets={assets.filter((a) => a.status === "ACTIVE")} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />;
}
