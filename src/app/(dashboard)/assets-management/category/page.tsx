import { redirect } from "next/navigation";
import { CategoryPageClient } from "@/components/assets/CategoryPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";

export default async function AssetCategoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const result = await getAssetsAction(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return <CategoryPageClient assets={result.data ?? []} currency={activeBusiness?.currency ?? "BDT"} />;
}
