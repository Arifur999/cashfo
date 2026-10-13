import { redirect } from "next/navigation";
import { AssetsManagementPageClient } from "@/components/modules/Customer/Assets/AssetsManagementPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategories, getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";

export default async function AssetsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [assets, categories] = await Promise.all([getAssets(activeBusinessId), getAssetCategories(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <AssetsManagementPageClient assets={assets} categories={categories} currency={activeBusiness?.currency ?? "BDT"} />
  );
}
