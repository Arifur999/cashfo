import { ContactsPageClient } from "@/components/modules/Customer/Books/Contacts/ContactsPageClient";
import { getBusinessContacts } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReceivablesAging } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/contacts");

// Books › Customers and suppliers: everyone the business trades with, read
// here so the totals and the list arrive together. Only a business
// workspace has Books; any other shows the way to one.
export default async function ContactsPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [contacts, receivableAging] = await Promise.all([getBusinessContacts(activeBusinessId), getReceivablesAging(activeBusinessId)]);
  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <ContactsPageClient businessId={activeBusinessId} contacts={contacts} receivableAging={receivableAging} canManage={canManage} currency={activeBusiness.currency} today={getAppToday()} />;
}
