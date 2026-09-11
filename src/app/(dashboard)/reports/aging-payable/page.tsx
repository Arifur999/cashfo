import { redirect } from "next/navigation";
import { AgingReportPageClient } from "@/components/reports/AgingReportPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getPayablesAging } from "@/lib/receivablesPayables";

export default async function AgingPayablePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const report = await getPayablesAging(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <AgingReportPageClient title="Accounts Payable Aging" report={report} currency={activeBusiness?.currency ?? "BDT"} accentColor="text-brand-danger" />
  );
}
