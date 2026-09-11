import { redirect } from "next/navigation";
import { GeneralLedgerPageClient } from "@/components/reports/GeneralLedgerPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getGeneralLedger } from "@/lib/reports";

export default async function GeneralLedgerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const generalLedger = await getGeneralLedger(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <GeneralLedgerPageClient groups={generalLedger.groups} preferredLanguage={user.preferredLanguage} currency={activeBusiness?.currency ?? "BDT"} />
  );
}
