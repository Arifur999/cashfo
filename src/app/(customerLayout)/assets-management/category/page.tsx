import { redirect } from "next/navigation";
import { CategoryPageClient } from "@/components/modules/Customer/Assets/CategoryPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategoriesAction } from "@/lib/customer/assetActions";
import { getCurrentUser } from "@/lib/customer/auth";

export default async function AssetCategoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const result = await getAssetCategoriesAction(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <CategoryPageClient businessId={activeBusinessId} categories={result.data ?? []} canManage={canManage} />;
}
