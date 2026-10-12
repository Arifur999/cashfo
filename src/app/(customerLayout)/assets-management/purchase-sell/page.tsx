import { redirect } from "next/navigation";
import { PurchaseSellAssetPageClient } from "@/components/modules/Customer/Assets/PurchaseSellAssetPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategoriesAction, getAssetsAction } from "@/lib/customer/assetActions";
import { getCurrentUser } from "@/lib/customer/auth";

export default async function PurchaseSellAssetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [result, categoriesResult] = await Promise.all([getAssetsAction(activeBusinessId), getAssetCategoriesAction(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <PurchaseSellAssetPageClient
      businessId={activeBusinessId}
      assets={(result.data ?? []).filter((a) => a.status === "ACTIVE")}
      categories={categoriesResult.data ?? []}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
