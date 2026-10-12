import { redirect } from "next/navigation";
import { AssetsManagementPageClient } from "@/components/modules/Customer/Assets/AssetsManagementPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategoriesAction, getAssetsAction } from "@/lib/customer/assetActions";
import { getCurrentUser } from "@/lib/customer/auth";

export default async function AssetsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [result, categoriesResult] = await Promise.all([getAssetsAction(activeBusinessId), getAssetCategoriesAction(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <AssetsManagementPageClient assets={result.data ?? []} categories={categoriesResult.data ?? []} currency={activeBusiness?.currency ?? "BDT"} />
  );
}
