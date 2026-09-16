import { redirect } from "next/navigation";
import { CurrentAssetListPageClient } from "@/components/assets/CurrentAssetListPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";

export default async function CurrentAssetListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const result = await getAssetsAction(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return <CurrentAssetListPageClient assets={(result.data ?? []).filter((a) => a.status === "ACTIVE")} currency={activeBusiness?.currency ?? "BDT"} />;
}
