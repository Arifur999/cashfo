import { ReceivablesPageClient } from "@/components/modules/Customer/Books/Receivables/ReceivablesPageClient";
import { agingFor } from "@/lib/customer/booksDisplay";
import { getBusinessContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getDueSoon, getPayablesAging, getPayablesOverdue, getReceivablesAging, getReceivablesOverdue } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/dena-pawna");

// Books › Receivables & payables: both sides by age, plus the days ahead.
// Only a business workspace has Books; any other shows the way to one.
export default async function ReceivablesPayablesPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [contacts, receivableAging, payableAging, receivableOverdue, payableOverdue, receivableDueSoon, payableDueSoon] = await Promise.all([getBusinessContacts(activeBusinessId), getReceivablesAging(activeBusinessId), getPayablesAging(activeBusinessId), getReceivablesOverdue(activeBusinessId), getPayablesOverdue(activeBusinessId), getDueSoon(activeBusinessId, "RECEIVABLE"), getDueSoon(activeBusinessId, "PAYABLE")]);
  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";
  // The API reads these by contact type alone, so a loan given to a friend
  // would show up as a customer who owes you; Books keeps to its own
  // customers and suppliers, and Loans has the rest.
  const ids = new Set(contacts.map((contact) => contact.id));
  const ours = <T extends { contactId: string }>(rows: T[]) => rows.filter((row) => ids.has(row.contactId));

  return (
    <ReceivablesPageClient
      businessId={activeBusinessId}
      receivableAging={agingFor(receivableAging, ids)}
      payableAging={agingFor(payableAging, ids)}
      receivableOverdue={ours(receivableOverdue)}
      payableOverdue={ours(payableOverdue)}
      receivableDueSoon={ours(receivableDueSoon)}
      payableDueSoon={ours(payableDueSoon)}
      canManage={canManage}
      currency={activeBusiness.currency}
      today={getAppToday()}
    />
  );
}
