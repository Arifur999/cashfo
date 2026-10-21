import { ContactsPageClient } from "@/components/modules/Customer/Books/Contacts/ContactsPageClient";
import { agingFor } from "@/lib/customer/booksDisplay";
import { getBusinessContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReceivablesAging } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/contacts");

// Books › Customers & suppliers: everyone the business trades with, read
// here so the totals and the list arrive together. Only a business
// workspace has Books; any other shows the way to one.
export default async function ContactsPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [contacts, receivableAging] = await Promise.all([getBusinessContacts(activeBusinessId), getReceivablesAging(activeBusinessId)]);
  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";
  // The aging covers every contact of a customer type, Loans' lenders and
  // borrowers too; the overdue figure here is only Books' own.
  const ids = new Set(contacts.map((contact) => contact.id));

  return <ContactsPageClient businessId={activeBusinessId} contacts={contacts} receivableAging={agingFor(receivableAging, ids)} canManage={canManage} currency={activeBusiness.currency} today={getAppToday()} />;
}
