import { redirect } from "next/navigation";
import { AssetsManagementPageClient } from "@/components/assets/AssetsManagementPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";

export default async function AssetsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const result = await getAssetsAction(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return <AssetsManagementPageClient assets={result.data ?? []} currency={activeBusiness?.currency ?? "BDT"} />;
}
