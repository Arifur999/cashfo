import { redirect } from "next/navigation";
import { ReceivablesPageClient } from "@/components/modules/Customer/Books/Receivables/ReceivablesPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getDueSoon, getPayablesAging, getPayablesOverdue, getReceivablesAging, getReceivablesOverdue } from "@/lib/customer/receivablesPayables";
import { getAppToday } from "@/lib/date";

// Books › Receivables and payables: both sides by age, plus the week ahead.
export default async function ReceivablesPayablesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [receivableAging, payableAging, receivableOverdue, payableOverdue, receivableDueSoon, payableDueSoon] = await Promise.all([getReceivablesAging(activeBusinessId), getPayablesAging(activeBusinessId), getReceivablesOverdue(activeBusinessId), getPayablesOverdue(activeBusinessId), getDueSoon(activeBusinessId, "RECEIVABLE"), getDueSoon(activeBusinessId, "PAYABLE")]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <ReceivablesPageClient businessId={activeBusinessId} receivableAging={receivableAging} payableAging={payableAging} receivableOverdue={receivableOverdue} payableOverdue={payableOverdue} receivableDueSoon={receivableDueSoon} payableDueSoon={payableDueSoon} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} today={getAppToday()} />;
}
