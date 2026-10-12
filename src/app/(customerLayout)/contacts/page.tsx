import { redirect } from "next/navigation";
import { ContactsPageClient } from "@/components/modules/Customer/Contacts/ContactsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getContacts } from "@/lib/customer/contacts";
import { getCurrentUser } from "@/lib/customer/auth";
import type { ContactType } from "@/lib/customer/api";

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const filters = {
    type: typeof params.type === "string" && params.type ? (params.type as ContactType) : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  };

  const { data: contacts } = await getContacts(activeBusinessId, filters);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <ContactsPageClient businessId={activeBusinessId} contacts={contacts} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} />;
}
