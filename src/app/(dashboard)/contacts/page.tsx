import { redirect } from "next/navigation";
import { ContactsPageClient } from "@/components/contacts/ContactsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getContacts } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/auth";
import type { ContactType } from "@/lib/api";

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
