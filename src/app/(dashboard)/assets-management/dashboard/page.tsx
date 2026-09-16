import { redirect } from "next/navigation";
import { AssetsManagementPageClient } from "@/components/assets/AssetsManagementPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetCategoriesAction, getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";

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
