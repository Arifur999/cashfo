import { redirect } from "next/navigation";
import { ContactsPageClient } from "@/components/modules/Customer/Books/Contacts/ContactsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBusinessContacts } from "@/lib/customer/contacts";
import { getReceivablesAging } from "@/lib/customer/receivablesPayables";
import { getAppToday } from "@/lib/date";

// Books › Customers and suppliers: everyone the business trades with, read
// here so the totals and the list arrive together.
export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [contacts, receivableAging] = await Promise.all([getBusinessContacts(activeBusinessId), getReceivablesAging(activeBusinessId)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <ContactsPageClient businessId={activeBusinessId} contacts={contacts} receivableAging={receivableAging} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} today={getAppToday()} />;
}
