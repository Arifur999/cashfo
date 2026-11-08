import { redirect } from "next/navigation";
import { UpdateValuePageClient } from "@/components/modules/Customer/Assets/UpdateValuePageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAssetCategories, getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/assets-management/update");

export default async function UpdateAssetValuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [assets, categories] = await Promise.all([getAssets(activeBusinessId), getAssetCategories(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  // Keyed by workspace: a switch lands on this same page, and its drawers
  // and filter must not carry the other workspace's choices over.
  return <UpdateValuePageClient key={activeBusinessId} businessId={activeBusinessId} assets={assets} categories={categories} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} today={getAppToday()} />;
}
