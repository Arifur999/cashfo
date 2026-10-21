import { notFound } from "next/navigation";
import { ContactDetailPageClient } from "@/components/modules/Customer/Books/Contacts/ContactDetailPageClient";
import { getContact, getContactTransactions } from "@/lib/customer/contacts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getContactBalanceDetail } from "@/lib/customer/receivablesPayables";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/contacts/${id}`);
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
