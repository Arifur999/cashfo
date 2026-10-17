import { notFound, redirect } from "next/navigation";
import { ContactDetailPageClient } from "@/components/modules/Customer/Books/Contacts/ContactDetailPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getContact, getContactTransactions } from "@/lib/customer/contacts";
import { getContactBalanceDetail } from "@/lib/customer/receivablesPayables";
import { getAppToday } from "@/lib/date";

// Books › one customer or supplier, with their statement and what is owed.
export default async function ContactDetailPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [contact, detail, transactions] = await Promise.all([getContact(activeBusinessId, id), getContactBalanceDetail(activeBusinessId, id), getContactTransactions(activeBusinessId, id)]);
  if (!contact) notFound();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <ContactDetailPageClient businessId={activeBusinessId} contact={contact} detail={detail} transactions={transactions.data} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} today={getAppToday()} />;
}
