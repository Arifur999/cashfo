import { redirect } from "next/navigation";
import { AssetUpdatePageClient } from "@/components/assets/AssetUpdatePageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";

export default async function AssetUpdatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const result = await getAssetsAction(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <AssetUpdatePageClient
      businessId={activeBusinessId}
      assets={(result.data ?? []).filter((a) => a.status === "ACTIVE")}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
