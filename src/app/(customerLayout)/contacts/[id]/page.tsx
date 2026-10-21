import { notFound } from "next/navigation";
import { ContactDetailPageClient } from "@/components/modules/Customer/Books/Contacts/ContactDetailPageClient";
import { getContact, getContactTransactions } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getContactBalanceDetail } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";

// The tab names the customer or supplier, from the read the page makes.
export async function generateMetadata({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  // A failed read is the page's to show (its error or PIN screen); the tab
  // keeps the list's name. A PIN-locked workspace keeps its records' names
  // out of the tab, and so out of the browser's history, which outlives the
  // unlock.
  const books = await requireBusinessWorkspace().catch(() => null);
  const contact = books?.ok && !books.business.hasPinLock ? await getContact(books.businessId, id).catch(() => null) : null;
  return customerPageMetadata(`/contacts/${id}`, { record: contact?.name });
}

// Books › one customer or supplier, with their statement and what is owed.
export default async function ContactDetailPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const [contact, detail, transactions] = await Promise.all([getContact(activeBusinessId, id), getContactBalanceDetail(activeBusinessId, id), getContactTransactions(activeBusinessId, id)]);
  if (!contact) notFound();

  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <ContactDetailPageClient businessId={activeBusinessId} contact={contact} detail={detail} transactions={transactions.data} canManage={canManage} currency={activeBusiness.currency} today={getAppToday()} />;
}
