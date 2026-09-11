import { redirect } from "next/navigation";
import { DenaPawnaPageClient } from "@/components/dena-pawna/DenaPawnaPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getPayablesAging, getPayablesOverdue, getReceivablesAging, getReceivablesOverdue } from "@/lib/receivablesPayables";

export default async function DenaPawnaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // Sequential, not Promise.all -- each of these loops over every contact
  // doing a couple of queries per contact (see
  // ReceivablesPayablesService.computeDirection()), so firing all four at
  // once multiplies concurrent DB load unnecessarily for what is a single
  // summary page's initial render.
  const receivableAging = await getReceivablesAging(activeBusinessId);
  const payableAging = await getPayablesAging(activeBusinessId);
  const receivableOverdue = await getReceivablesOverdue(activeBusinessId);
  const payableOverdue = await getPayablesOverdue(activeBusinessId);

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <DenaPawnaPageClient
      businessId={activeBusinessId}
      receivableAging={receivableAging}
      payableAging={payableAging}
      receivableOverdueCount={receivableOverdue.length}
      payableOverdueCount={payableOverdue.length}
      canManage={canManage}
      currency={activeBusiness?.currency ?? "BDT"}
    />
  );
}
