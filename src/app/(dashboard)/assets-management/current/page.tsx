import { redirect } from "next/navigation";
import { CurrentAssetListPageClient } from "@/components/assets/CurrentAssetListPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetCategoriesAction, getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";

export default async function CurrentAssetListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [result, categoriesResult] = await Promise.all([getAssetsAction(activeBusinessId), getAssetCategoriesAction(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <CurrentAssetListPageClient
      businessId={activeBusinessId}
      assets={(result.data ?? []).filter((a) => a.status === "ACTIVE")}
      categories={categoriesResult.data ?? []}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
