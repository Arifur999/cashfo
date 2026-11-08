import { redirect } from "next/navigation";
import { DataPageClient } from "@/components/modules/Customer/Settings/Data/DataPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBackups, getDataPrivacy, getImportContext } from "@/lib/customer/dataPrivacy";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/settings/data");

// Settings › Data & privacy: export, import (into the open workspace, for
// its owner or accountant), backups, privacy switches and the account's
// deletion. "View as customer" may look, not change.
export default async function SettingsDataPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businessId = await resolveActiveBusinessId(user.businesses);
  const role = user.businesses.find((business) => business.id === businessId)?.role;
  const mayImport = Boolean(businessId) && (role === "OWNER" || role === "ACCOUNTANT");
  const [data, backups, importContext] = await Promise.all([getDataPrivacy(), getBackups(), mayImport && businessId ? getImportContext(businessId) : null]);
  return <DataPageClient data={data} backups={backups} importContext={importContext} businessId={mayImport ? businessId : null} today={getAppToday()} readOnly={Boolean(user.impersonatedBy)} />;
}
