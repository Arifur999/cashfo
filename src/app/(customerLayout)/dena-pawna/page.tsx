import { ReceivablesPageClient } from "@/components/modules/Customer/Books/Receivables/ReceivablesPageClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getDueSoon, getPayablesAging, getPayablesOverdue, getReceivablesAging, getReceivablesOverdue } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/dena-pawna");

// Books › Receivables and payables: both sides by age, plus the week ahead.
// Only a business workspace has Books; any other shows the way to one.
export default async function ReceivablesPayablesPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [receivableAging, payableAging, receivableOverdue, payableOverdue, receivableDueSoon, payableDueSoon] = await Promise.all([getReceivablesAging(activeBusinessId), getPayablesAging(activeBusinessId), getReceivablesOverdue(activeBusinessId), getPayablesOverdue(activeBusinessId), getDueSoon(activeBusinessId, "RECEIVABLE"), getDueSoon(activeBusinessId, "PAYABLE")]);
  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <ReceivablesPageClient businessId={activeBusinessId} receivableAging={receivableAging} payableAging={payableAging} receivableOverdue={receivableOverdue} payableOverdue={payableOverdue} receivableDueSoon={receivableDueSoon} payableDueSoon={payableDueSoon} canManage={canManage} currency={activeBusiness.currency} today={getAppToday()} />;
}
