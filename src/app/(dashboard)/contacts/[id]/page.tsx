import { notFound, redirect } from "next/navigation";
import { ContactDetailPageClient } from "@/components/contacts/ContactDetailPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getContact, getContactTransactions } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/auth";

export default async function ContactDetailPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const [contact, { data: transactions }] = await Promise.all([
    getContact(activeBusinessId, id),
    getContactTransactions(activeBusinessId, id),
  ]);
  if (!contact) notFound();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <ContactDetailPageClient
      businessId={activeBusinessId}
      contact={contact}
      transactions={transactions}
      canManage={canManage}
      currency={activeBusiness?.currency ?? "BDT"}
    />
  );
}
