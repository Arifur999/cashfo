import { notFound, redirect } from "next/navigation";
import { ContactDetailPageClient } from "@/components/modules/Customer/Contacts/ContactDetailPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getContact, getContactTransactions } from "@/lib/customer/contacts";
import { getCurrentUser } from "@/lib/customer/auth";
import { getContactBalanceDetail } from "@/lib/customer/receivablesPayables";

export default async function ContactDetailPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // Sequential, not Promise.all -- see the backend's ReceivablesPayablesService
  // comment on why concurrent queries are avoided against this app's local
  // dev Postgres (prisma dev's built-in server), which has shown it can
  // drop connections under even modest concurrent load.
  const contact = await getContact(activeBusinessId, id);
  if (!contact) notFound();
  const balanceDetail = await getContactBalanceDetail(activeBusinessId, id);
  const { data: transactions, meta } = await getContactTransactions(activeBusinessId, id);

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <ContactDetailPageClient
      businessId={activeBusinessId}
      contact={contact}
      balanceDetail={balanceDetail}
      transactions={transactions}
      transactionTotal={meta.total}
      canManage={canManage}
      currency={activeBusiness?.currency ?? "BDT"}
    />
  );
}
